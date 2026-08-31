from typing import Optional, AsyncGenerator
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError
from app.db.base import get_db
from app.core.config import settings
from app.models import Client


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Client:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not authorization or not authorization.startswith("Bearer "):
        raise credentials_exception
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    # For now, return a default admin client - in production you'd look up the user
    from sqlalchemy import select
    result = await db.execute(select(Client).where(Client.email == username))
    user = result.scalar_one_or_none()
    if user is None:
        # Create a default admin user if not exists
        user = Client(name="Admin", email=username, is_active=True)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def get_admin_user(
    current_user: Client = Depends(get_current_user)
) -> Client:
    if current_user.email != settings.admin_username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    import time
    expire = time.time() + settings.access_token_expire_minutes * 60
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)