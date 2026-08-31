from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
from app.db.base import get_db
from app.api.deps import get_current_user
from app.models import DiscordMessage, Client
from app.schemas import (
    DiscordMessageCreate, DiscordMessageResponse,
    PaginatedResponse
)

router = APIRouter(prefix="/discord", tags=["discord"])


@router.get("/messages", response_model=PaginatedResponse)
async def list_discord_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    client_id: Optional[int] = None,
    is_read: Optional[bool] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(DiscordMessage).options(selectinload(DiscordMessage.client))
    
    if client_id:
        query = query.where(DiscordMessage.client_id == client_id)
    if is_read is not None:
        query = query.where(DiscordMessage.is_read == is_read)
    if search:
        query = query.where(
            or_(
                DiscordMessage.content.ilike(f"%{search}%"),
                DiscordMessage.discord_username.ilike(f"%{search}%")
            )
        )
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.order_by(DiscordMessage.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    messages = result.scalars().all()
    
    return PaginatedResponse(
        items=[DiscordMessageResponse.model_validate(m) for m in messages],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/messages/{message_id}", response_model=DiscordMessageResponse)
async def get_discord_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(DiscordMessage).options(selectinload(DiscordMessage.client)).where(DiscordMessage.id == message_id)
    )
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.patch("/messages/{message_id}/read", response_model=DiscordMessageResponse)
async def mark_discord_message_read(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(DiscordMessage).where(DiscordMessage.id == message_id))
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message.is_read = True
    await db.commit()
    await db.refresh(message)
    return message


@router.post("/messages/send-dm")
async def send_discord_dm(
    discord_user_id: str,
    content: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.services.discord_service import send_dm
    success = await send_dm(discord_user_id, content)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send DM")
    return {"ok": True}


@router.post("/messages/broadcast")
async def broadcast_discord_message(
    user_ids: List[str],
    content: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.services.discord_service import send_dm
    results = []
    for user_id in user_ids:
        success = await send_dm(user_id, content)
        results.append({"user_id": user_id, "success": success})
    return {"results": results}


@router.get("/oauth/url")
async def get_discord_oauth_url():
    from app.core.config import settings
    url = (
        f"https://discord.com/api/oauth2/authorize"
        f"?client_id={settings.discord_client_id}"
        f"&redirect_uri={settings.discord_redirect_uri}"
        f"&response_type=code"
        f"&scope=identify%20guilds%20messages.read"
    )
    return {"url": url}


@router.get("/oauth/callback")
async def discord_oauth_callback(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    from app.services.discord_service import exchange_code
    user_data = await exchange_code(code)
    if not user_data:
        raise HTTPException(status_code=400, detail="Failed to exchange code")
    
    # Link to client or create new
    result = await db.execute(select(Client).where(Client.discord_id == user_data["id"]))
    client = result.scalar_one_or_none()
    if not client:
        client = Client(
            name=user_data["username"],
            discord_id=user_data["id"],
            avatar_url=user_data.get("avatar_url"),
            metadata={"discord_data": user_data}
        )
        db.add(client)
        await db.commit()
        await db.refresh(client)
    else:
        client.avatar_url = user_data.get("avatar_url")
        client.metadata = {"discord_data": user_data}
        await db.commit()
    
    return {"client_id": client.id, "discord_id": user_data["id"]}


@router.post("/webhook")
async def discord_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from app.services.discord_service import verify_signature, process_webhook
    
    body = await request.body()
    signature = request.headers.get("X-Signature-Ed25519")
    timestamp = request.headers.get("X-Signature-Timestamp")
    
    if not verify_signature(body, signature, timestamp):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    await process_webhook(body, db)
    return {"ok": True}