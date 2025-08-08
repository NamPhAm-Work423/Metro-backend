from fastapi import Header, HTTPException, Depends
from typing import List, Optional
from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError
from ..config.settings import get_settings
import time


class AuthenticatedUser:
    def __init__(self, user_id: Optional[str], email: Optional[str], roles: List[str]):
        self.id = user_id
        self.email = email
        self.roles = roles


def verify_service_auth(x_service_auth: Optional[str] = Header(None)) -> AuthenticatedUser:
    settings = get_settings()
    if not x_service_auth:
        raise HTTPException(status_code=401, detail="Service authentication required")

    token = x_service_auth.split(' ')[1] if x_service_auth.startswith('Bearer ') else x_service_auth
    try:
        decoded = jwt.decode(
            token,
            settings.service_secret,
            algorithms=['HS256'],
            issuer=settings.SERVICE_AUTH_ISSUER,
            audience=settings.SERVICE_AUTH_AUDIENCE,
        )
        # Additional age check (max 5 minutes) to align with system middlewares
        iat = decoded.get('iat')
        if isinstance(iat, (int, float)):
            token_age = int(time.time()) - int(iat)
            if token_age > 300:
                raise HTTPException(status_code=401, detail="Service token expired (too old)")
        roles = decoded.get('roles') or []
        if not isinstance(roles, list):
            roles = [roles]
        return AuthenticatedUser(decoded.get('userId'), decoded.get('email'), roles)
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Service token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid service token")


def authorize_roles(required_roles: List[str]):
    def dependency(user: AuthenticatedUser = Depends(verify_service_auth)) -> AuthenticatedUser:
        if not any(role in user.roles for role in required_roles):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dependency


"""
Keep only service-to-service authorization, like other services.
"""


