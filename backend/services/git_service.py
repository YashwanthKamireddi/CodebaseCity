import os
import shutil
import tempfile
import subprocess
from typing import Optional, Tuple
from fastapi import HTTPException

class GitService:
    """
    Handles all Git-related operations:
    - Cloning repositories
    - validating GitHub URLs
    - Managing temporary directories
    - Enforcing blocklists for large repos
    """

    BLOCKED_REPOS = {
        "linux": "Linux kernel (5GB+, 30M+ LOC) - try a smaller project like expressjs/express",
        "chromium": "Chromium (30GB+) - try nicegram/nicegram-ios instead",
        "gecko-dev": "Firefox (2GB+) - try nicegram/nicegram-ios instead",
        "kubernetes": "Kubernetes (2GB+) - try expressjs/express instead",
        "tensorflow": "TensorFlow (2GB+) - try pytorch/vision instead",
        "llvm-project": "LLVM (4GB+) - try nicegram/nicegram-ios instead",
        "rust": "Rust compiler (2GB+) - try nicegram/nicegram-ios instead",
        "webkit": "WebKit (5GB+) - try expressjs/express instead",
    }

    @staticmethod
    def parse_url(path: str) -> Tuple[str, bool, str]:
        """
        Parses input path.
        Returns: (clean_path, is_github, repo_name)
        """
        path = path.strip()
        is_github = "github.com" in path or (len(path.split("/")) == 2 and not os.path.exists(path))
        repo_name = ""

        if is_github:
            if "github.com" not in path:
                path = f"github.com/{path}"

            if not path.startswith("https://"):
                path = "https://" + path.replace("http://", "")

            repo_name = path.rstrip("/").split("/")[-1].replace(".git", "")
        else:
            repo_name = os.path.basename(path.rstrip("/"))

        return path, is_github, repo_name

    @classmethod
    def clone_repo(cls, url: str, repo_name: str, github_token: Optional[str] = None) -> str:
        """
        Clones a git repo to a temp directory.
        If github_token is provided, it injects it into the HTTPS URL for private auth.
        Returns the absolute path to the cloned directory.
        """
        if repo_name.lower() in cls.BLOCKED_REPOS:
             raise HTTPException(status_code=413, detail=f"Repository too large: {cls.BLOCKED_REPOS[repo_name.lower()]}")

        # Secure URL creation for OAuth flow
        clone_url = url
        if github_token and "github.com" in url:
            # We strip https:// and insert oauth2:token@
            clean_url = url.replace("https://", "").replace("http://", "")
            clone_url = f"https://oauth2:{github_token}@{clean_url}"

        temp_dir = os.path.join(tempfile.gettempdir(), "codebase_city", repo_name)

        # Clean up existing to ensure fresh clone (or handle updates in future)
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

        os.makedirs(os.path.dirname(temp_dir), exist_ok=True)

        print(f"[GitService] Cloning {url} to {temp_dir}...")

        try:
            # Social City Upgrade: Need history for behavioral analysis
            # Depth 1000 gives us "Who owns this code" without downloading 10 years of history.
            clone_result = subprocess.run(
                ["git", "clone", "--single-branch", "--depth", "1000", clone_url, temp_dir],
                capture_output=True, text=True, timeout=600
            )

            if clone_result.returncode != 0:
                raise HTTPException(status_code=400, detail=f"Failed to clone: {clone_result.stderr}")

            return temp_dir
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=408, detail="Clone timed out - repository too large or network slow")

    @staticmethod
    def extract_authors(repo_path: str) -> dict:
        """
        Analyzes the git log to find the primary author for each file.
        Returns: {
            "file_path": {
                "author": "Name",
                "email": "email@example.com",
                "commits": int
            }
        }
        """
        try:
            # 1. Get raw log: Hash|Author|Email|Date \n Files...
            cmd = [
                "git", "-C", repo_path, "log",
                "--pretty=format:COMMIT|%H|%an|%ae|%at",
                "--name-only",
                "-n", "1000" # Limit analysis to last 1000 commits
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
            if result.returncode != 0:
                print(f"[GitService] Log parse failed: {result.stderr}")
                return {}

            # 2. Parse Stream
            file_authors = {} # path -> { author_email: count }
            author_details = {} # email -> name

            current_author_name = None
            current_author_email = None

            for line in result.stdout.splitlines():
                line = line.strip()
                if not line: continue

                if line.startswith("COMMIT|"):
                    parts = line.split("|")
                    if len(parts) >= 4:
                        current_author_name = parts[2]
                        current_author_email = parts[3]
                        if current_author_email not in author_details:
                            author_details[current_author_email] = current_author_name
                else:
                    # It's a file path
                    # Limit to source code to save memory
                    if any(line.endswith(ext) for ext in ['.py', '.js', '.jsx', '.ts', '.tsx', '.go', '.rs', '.java', '.cpp', '.c', '.h', '.css', '.html']):
                        if line not in file_authors:
                            file_authors[line] = {}

                        email = current_author_email
                        file_authors[line][email] = file_authors[line].get(email, 0) + 1

            # 3. Determine Winner (Primary Owner)
            import hashlib
            final_map = {}
            for fpath, counts in file_authors.items():
                if not counts: continue

                # Find max
                top_author_email = max(counts, key=counts.get)
                top_author_name = author_details.get(top_author_email, "Unknown")

                # Calculate MD5 for Gravatar
                email_hash = hashlib.md5(top_author_email.lower().encode('utf-8')).hexdigest()

                final_map[fpath] = {
                    "author": top_author_name,
                    "email": top_author_email,
                    "email_hash": email_hash,
                    "commits": counts[top_author_email]
                }

            return final_map

        except Exception as e:
            print(f"[GitService] Error extracting authors: {e}")
            return {}
