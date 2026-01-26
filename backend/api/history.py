"""
Git History API - Get commit history for a repository
"""

import subprocess
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()


class Commit(BaseModel):
    hash: str
    short_hash: str
    date: str
    timestamp: int
    message: str
    author: str
    files_changed: int = 0
    insertions: int = 0
    deletions: int = 0


class HistoryResponse(BaseModel):
    commits: List[Commit]
    total: int
    repo_name: str


class AnalyzeAtCommitRequest(BaseModel):
    path: str
    commit_hash: str


@router.get("/history")
async def get_history(path: str, limit: int = 50) -> HistoryResponse:
    """
    Get git commit history for a repository.
    Returns list of commits with metadata.
    """
    import tempfile

    # Handle GitHub URLs
    if path.startswith("http") or "github.com" in path:
        repo_name = path.rstrip("/").split("/")[-1].replace(".git", "")
        # Check standard temp location
        temp_dir = os.path.join(tempfile.gettempdir(), "codebase_city", repo_name)
        if os.path.isdir(temp_dir):
            path = temp_dir
        else:
            # If not found, it might be cached but not cloned? Or deleted?
            # We can't show history if we don't have the git dir.
            # Try to return empty success to prevent UI errors
            return HistoryResponse(commits=[], total=0, repo_name=repo_name)

    if not os.path.isdir(path):
        raise HTTPException(status_code=400, detail=f"Path does not exist: {path}")

    git_dir = os.path.join(path, ".git")
    if not os.path.isdir(git_dir):
        # Fallback for some cloned repos where .git might be in a different state?
        # But generally required.
        raise HTTPException(status_code=400, detail="Not a git repository")

    try:
        # Get commit history with stats
        result = subprocess.run(
            [
                "git", "log",
                f"--max-count={limit}",
                "--format=%H|%h|%at|%an|%s",
                "--shortstat"
            ],
            cwd=path,
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Git error: {result.stderr}")

        output = result.stdout.strip()
        if not output:
            return HistoryResponse(commits=[], total=0, repo_name=os.path.basename(path))

        # Parse output
        commits = []
        lines = output.split("\n")
        i = 0

        while i < len(lines):
            line = lines[i].strip()
            if not line or line.startswith(" "):
                i += 1
                continue

            # Parse commit line: hash|short_hash|timestamp|author|message
            parts = line.split("|", 4)
            if len(parts) >= 5:
                timestamp = int(parts[2])
                commit = Commit(
                    hash=parts[0],
                    short_hash=parts[1],
                    timestamp=timestamp,
                    date=datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d"),
                    author=parts[3],
                    message=parts[4][:100],  # Truncate long messages
                    files_changed=0,
                    insertions=0,
                    deletions=0
                )

                # Check for stat line (next non-empty line starting with space)
                i += 1
                while i < len(lines) and not lines[i].strip():
                    i += 1

                if i < len(lines) and lines[i].startswith(" "):
                    stat_line = lines[i].strip()
                    # Parse: "3 files changed, 10 insertions(+), 5 deletions(-)"
                    if "file" in stat_line:
                        try:
                            stat_parts = stat_line.split(",")
                            for part in stat_parts:
                                part = part.strip()
                                if "file" in part:
                                    commit.files_changed = int(part.split()[0])
                                elif "insertion" in part:
                                    commit.insertions = int(part.split()[0])
                                elif "deletion" in part:
                                    commit.deletions = int(part.split()[0])
                        except (ValueError, IndexError):
                            pass
                    i += 1

                commits.append(commit)
            else:
                i += 1

        return HistoryResponse(
            commits=commits,
            total=len(commits),
            repo_name=os.path.basename(path)
        )

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Git command timed out")
    except Exception as e:
        # Fallback: If not a git repo or other error, return a single "snapshot" of current state
        # this prevents the UI from breaking for non-git folders
        return HistoryResponse(
            commits=[Commit(
                hash="local",
                short_hash="LOCAL",
                date=datetime.now().strftime("%Y-%m-%d"),
                timestamp=int(datetime.now().timestamp()),
                message="Current Workspace State (Non-Git)",
                author="You",
                files_changed=0, insertions=0, deletions=0
            )],
            total=1,
            repo_name=os.path.basename(path)
        )


@router.post("/analyze-at-commit")
async def analyze_at_commit(request: AnalyzeAtCommitRequest):
    """
    Analyze codebase at a specific git commit.
    Temporarily checks out the commit, runs analysis, then restores.
    """
    from parsing.analyzer import CodebaseAnalyzer

    import tempfile

    path = request.path
    commit_hash = request.commit_hash

    # Handle GitHub URLs logic (Same as get_history)
    if path.startswith("http") or "github.com" in path:
        repo_name = path.rstrip("/").split("/")[-1].replace(".git", "")
        temp_dir = os.path.join(tempfile.gettempdir(), "codebase_city", repo_name)
        if os.path.isdir(temp_dir):
            path = temp_dir

    if not os.path.isdir(path):
        raise HTTPException(status_code=400, detail=f"Path does not exist: {path}")

    git_dir = os.path.join(path, ".git")
    if not os.path.isdir(git_dir):
        raise HTTPException(status_code=400, detail="Not a git repository")

    original_branch = None
    stashed = False

    try:
        # Get current branch/commit
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=path,
            capture_output=True,
            text=True,
            timeout=10
        )
        original_branch = result.stdout.strip()
        if original_branch == "HEAD":
            # Detached HEAD, get commit hash instead
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=10
            )
            original_branch = result.stdout.strip()

        # Check for modifications
        status = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=path,
            capture_output=True,
            text=True
        )
        if status.stdout.strip():
            # Stash changes to allow travel
            subprocess.run(["git", "stash", "push", "-m", "CodeCity Auto-Stash"], cwd=path, capture_output=True)
            stashed = True

        # Checkout target commit
        result = subprocess.run(
            ["git", "checkout", commit_hash, "--quiet"],
            cwd=path,
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"Failed to checkout: {result.stderr}")

        # Run analysis (async function)
        analyzer = CodebaseAnalyzer()
        city_data = await analyzer.analyze(path)

        # Add commit info to response
        if hasattr(city_data, 'dict'):
            result = city_data.dict()
        elif hasattr(city_data, 'model_dump'):
            result = city_data.model_dump()
        else:
            result = dict(city_data) if not isinstance(city_data, dict) else city_data

        result["commit"] = {
            "hash": commit_hash,
            "analyzed_at": datetime.now().isoformat()
        }

        return result

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Git command timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Always restore original branch
        if original_branch:
            try:
                subprocess.run(
                    ["git", "checkout", original_branch, "--quiet"],
                    cwd=path,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
            except:
                pass

        # Pop stash if we created it
        if stashed:
            try:
                subprocess.run(["git", "stash", "pop"], cwd=path, capture_output=True)
            except:
                pass
