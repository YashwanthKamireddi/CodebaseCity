from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
import httpx
from datetime import datetime, timedelta
import jwt

from core.config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

# In-memory store for states (in production, use Redis or DB with short TTL)
oauth_states = set()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt


@router.get("/github/login", tags=["Auth"])
async def github_login():
    """
    Initiates the GitHub OAuth flow.
    Redirects the user to GitHub's authorization page.
    """
    if not settings.github_client_id:
        raise HTTPException(status_code=500, detail="GitHub Client ID not configured.")

    # We request 'repo' scope to access private repositories if permitted by user
    # 'read:user' for avatar and basic info
    scopes = "read:user,repo"

    import secrets
    state = secrets.token_urlsafe(16)
    oauth_states.add(state)

    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.github_client_id}"
        f"&scope={scopes}"
        f"&state={state}"
    )

    return RedirectResponse(url=github_auth_url)


@router.get("/github/callback", tags=["Auth"])
async def github_callback(code: str, state: str):
    """
    Handles the callback from GitHub after user authorizes the app.
    Exchanges the 'code' for an access token.
    """
    if state not in oauth_states:
         # Log and continue for dev, but in prod this should raise 400
         logger.warning(f"Invalid state parameter: {state}")
    else:
        oauth_states.remove(state)

    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(status_code=500, detail="GitHub OAuth credentials not configured.")

    # 1. Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            }
        )

    if token_response.status_code != 200:
        logger.error(f"GitHub token exchange failed: {token_response.text}")
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")

    token_data = token_response.json()
    access_token = token_data.get("access_token")

    if not access_token:
        logger.error(f"No access token in response: {token_data}")
        raise HTTPException(status_code=400, detail="Invalid GitHub response")

    # 2. Fetch User Profile to get their identity
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )

    if user_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch user profile")

    user_data = user_response.json()

    # 3. Create our own JWT Session token
    # We encrypt the github_access_token inside our JWT so the frontend can store it
    # without exposing it in plaintext, while allowing the backend to extract it later for clones
    jwt_data = {
        "sub": str(user_data.get("id")),
        "username": user_data.get("login"),
        "avatar_url": user_data.get("avatar_url"),
        "github_token": access_token # Store token to use for private clones
    }

    session_token = create_access_token(jwt_data)

    # 4. Redirect back to frontend with the token
    # (In strictly secure prod, use httpOnly Secure cookies. For this architecture, query param works with local frontend)
    frontend_url = "http://localhost:5173" # Update for prod
    return RedirectResponse(url=f"{frontend_url}/auth/callback?token={session_token}")


def get_current_user(request: Request):
    """Dependency to extract and validate the JWT from the Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")

    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/github/repos", tags=["Auth"])
async def get_github_repos(user: dict = Depends(get_current_user)):
    """
    Fetches the list of repositories accessible by the authenticated user.
    """
    github_token = user.get("github_token")
    if not github_token:
        raise HTTPException(status_code=401, detail="No GitHub token associated with this session")

    async with httpx.AsyncClient() as client:
        # Fetch repos the user owns or has access to, sorted by recently updated
        response = await client.get(
            "https://api.github.com/user/repos?sort=updated&per_page=100",
            headers={
                "Authorization": f"Bearer {github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )

    if response.status_code != 200:
        logger.error(f"Failed to fetch user repos: {response.text}")
        raise HTTPException(status_code=400, detail="Failed to fetch repositories from GitHub")

    repos = response.json()

    # Simplify the data payload for the frontend
    simplified_repos = []
    for repo in repos:
        simplified_repos.append({
            "id": repo.get("id"),
            "name": repo.get("name"),
            "full_name": repo.get("full_name"),
            "private": repo.get("private"),
            "html_url": repo.get("html_url"),
            "description": repo.get("description"),
            "language": repo.get("language"),
            "updated_at": repo.get("updated_at")
        })

    return simplified_repos
