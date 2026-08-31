import httpx
import json
from typing import Optional, Dict, Any
from app.core.config import settings
from app.models import DiscordMessage, Client
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError


async def send_dm(user_id: str, content: str) -> bool:
    """Send a DM to a Discord user via bot."""
    if not settings.discord_bot_token:
        return False
    
    async with httpx.AsyncClient() as client:
        # Create DM channel
        resp = await client.post(
            "https://discord.com/api/v10/users/@me/channels",
            headers={
                "Authorization": f"Bot {settings.discord_bot_token}",
                "Content-Type": "application/json"
            },
            json={"recipient_id": user_id}
        )
        
        if resp.status_code != 200:
            return False
        
        channel_id = resp.json()["id"]
        
        # Send message
        resp = await client.post(
            f"https://discord.com/api/v10/channels/{channel_id}/messages",
            headers={
                "Authorization": f"Bot {settings.discord_bot_token}",
                "Content-Type": "application/json"
            },
            json={"content": content}
        )
        
        return resp.status_code == 200


async def send_dm_embed(user_id: str, embed: Dict[str, Any]) -> bool:
    """Send an embed DM to a Discord user."""
    if not settings.discord_bot_token:
        return False
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://discord.com/api/v10/users/@me/channels",
            headers={
                "Authorization": f"Bot {settings.discord_bot_token}",
                "Content-Type": "application/json"
            },
            json={"recipient_id": user_id}
        )
        
        if resp.status_code != 200:
            return False
        
        channel_id = resp.json()["id"]
        
        resp = await client.post(
            f"https://discord.com/api/v10/channels/{channel_id}/messages",
            headers={
                "Authorization": f"Bot {settings.discord_bot_token}",
                "Content-Type": "application/json"
            },
            json={"embeds": [embed]}
        )
        
        return resp.status_code == 200


async def exchange_code(code: str) -> Optional[Dict[str, Any]]:
    """Exchange OAuth2 code for user info."""
    async with httpx.AsyncClient() as client:
        # Get access token
        resp = await client.post(
            "https://discord.com/api/v10/oauth2/token",
            data={
                "client_id": settings.discord_client_id,
                "client_secret": settings.discord_client_secret,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.discord_redirect_uri
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if resp.status_code != 200:
            return None
        
        token_data = resp.json()
        access_token = token_data["access_token"]
        
        # Get user info
        resp = await client.get(
            "https://discord.com/api/v10/users/@me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if resp.status_code != 200:
            return None
        
        user = resp.json()
        avatar_url = None
        if user.get("avatar"):
            avatar_url = f"https://cdn.discordapp.com/avatars/{user['id']}/{user['avatar']}.png"
        
        return {
            "id": user["id"],
            "username": user["username"],
            "discriminator": user.get("discriminator", "0"),
            "avatar_url": avatar_url,
            "access_token": access_token
        }


def verify_signature(body: bytes, signature: str, timestamp: str) -> bool:
    """Verify Discord webhook signature."""
    if not settings.discord_client_secret:
        return False
    
    try:
        verify_key = VerifyKey(bytes.fromhex(settings.discord_client_secret))
        verify_key.verify(f"{timestamp}".encode() + body, bytes.fromhex(signature))
        return True
    except (BadSignatureError, ValueError):
        return False


async def process_webhook(body: bytes, db: AsyncSession):
    """Process incoming Discord webhook."""
    data = json.loads(body)
    
    # Handle different event types
    if data.get("type") == 1:
        # PING
        return {"type": 1}
    
    if data.get("type") == 2:
        # APPLICATION_COMMAND
        return await handle_command(data, db)
    
    if data.get("type") == 3:
        # COMPONENT_INTERACTION
        return await handle_component(data, db)
    
    return {"type": 4, "data": {"content": "Neznámý typ interakce"}}


async def handle_command(data: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
    """Handle slash commands."""
    command_name = data["data"]["name"]
    user_id = data["member"]["user"]["id"]
    username = data["member"]["user"]["username"]
    
    if command_name == "faktura":
        # Send invoice reminder
        return await handle_invoice_command(data, db, user_id, username)
    elif command_name == "status":
        # Check lead status
        return await handle_status_command(data, db, user_id)
    elif command_name == "pomoc":
        return {
            "type": 4,
            "data": {
                "content": "**Dostupné příkazy:**\n"
                          "`/faktura <číslo>` - Zkontrolovat stav faktury\n"
                          "`/status` - Zobrazit moje aktivní leady\n"
                          "`/pomoc` - Tato nápověda"
            }
        }
    
    return {"type": 4, "data": {"content": "Neznámý příkaz"}}


async def handle_invoice_command(data: Dict[str, Any], db: AsyncSession, user_id: str, username: str) -> Dict[str, Any]:
    """Handle invoice status check."""
    options = data["data"].get("options", [])
    invoice_number = None
    for opt in options:
        if opt["name"] == "cislo":
            invoice_number = opt["value"]
            break
    
    from app.models import Transaction
    from sqlalchemy import select
    
    if invoice_number:
        result = await db.execute(
            select(Transaction).where(Transaction.invoice_number == invoice_number)
        )
        transaction = result.scalar_one_or_none()
        
        if transaction:
            client_result = await db.execute(select(Client).where(Client.discord_id == user_id))
            client = client_result.scalar_one_or_none()
            
            if client and transaction.client_id == client.id:
                status_text = "✅ Zaplaceno" if transaction.paid_at else "⏳ Čeká na platbu"
                if transaction.due_date and not transaction.paid_at:
                    from datetime import datetime
                    if transaction.due_date < datetime.utcnow():
                        status_text = "❌ Po splatnosti"
                
                return {
                    "type": 4,
                    "data": {
                        "embeds": [{
                            "title": f"Faktura #{transaction.invoice_number}",
                            "description": f"{transaction.description}\n**Částka:** {transaction.amount:,.0f} {transaction.currency}\n**Stav:** {status_text}",
                            "color": 0x00d4aa if transaction.paid_at else (0xff4444 if "Po splatnosti" in status_text else 0xffaa00)
                        }]
                    }
                }
    
    return {
        "type": 4,
        "data": {"content": "Faktura nenalezena nebo nemáš k ní přístup."}
    }


async def handle_status_command(data: Dict[str, Any], db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """Show user's lead status."""
    from app.models import Lead, LeadStatus, Client
    from sqlalchemy import select
    
    client_result = await db.execute(select(Client).where(Client.discord_id == user_id))
    client = client_result.scalar_one_or_none()
    
    if not client:
        return {"type": 4, "data": {"content": "Nejsi propojený s žádným klientem. Použij OAuth na webu."}}
    
    result = await db.execute(
        select(Lead).where(Lead.client_id == client.id).order_by(Lead.created_at.desc()).limit(10)
    )
    leads = result.scalars().all()
    
    if not leads:
        return {"type": 4, "data": {"content": "Nemáš žádné aktivní leady."}}
    
    embed = {
        "title": "Tvoje leady",
        "description": "\n".join([
            f"**{l.title}** - {l.status.value.replace('_', ' ').title()}"
            for l in leads
        ]),
        "color": 0x5865F2
    }
    
    return {"type": 4, "data": {"embeds": [embed]}}


async def handle_component(data: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
    """Handle button/select interactions."""
    custom_id = data["data"]["custom_id"]
    
    if custom_id.startswith("mark_read_"):
        msg_id = int(custom_id.split("_")[-1])
        from app.models import DiscordMessage
        from sqlalchemy import select
        result = await db.execute(select(DiscordMessage).where(DiscordMessage.id == msg_id))
        msg = result.scalar_one_or_none()
        if msg:
            msg.is_read = True
            await db.commit()
        return {"type": 4, "data": {"content": "Označeno jako přečtené"}}
    
    return {"type": 4, "data": {"content": "Neznámá akce"}}


async def notify_invoice_due(client: Client, transaction, days_until_due: int):
    """Send invoice due notification via Discord."""
    if not client.discord_id:
        return
    
    embed = {
        "title": "⏰ Připomínka splatnosti faktury",
        "description": f"Faktura **#{transaction.invoice_number}** má splatnost za {days_until_due} dní.",
        "fields": [
            {"name": "Částka", "value": f"{transaction.amount:,.0f} {transaction.currency}", "inline": True},
            {"name": "Splatnost", "value": transaction.due_date.strftime("%d.%m.%Y") if transaction.due_date else "Neznámá", "inline": True},
            {"name": "Popis", "value": transaction.description, "inline": False}
        ],
        "color": 0xffaa00,
        "footer": {"text": "LeadFlow Dashboard"}
    }
    
    await send_dm_embed(client.discord_id, embed)


async def notify_payment_received(client: Client, transaction):
    """Send payment received notification."""
    if not client.discord_id:
        return
    
    embed = {
        "title": "✅ Platba přijata",
        "description": f"Děkujeme za platbu faktury **#{transaction.invoice_number}**!",
        "fields": [
            {"name": "Částka", "value": f"{transaction.amount:,.0f} {transaction.currency}", "inline": True},
            {"name": "Datum", "value": transaction.paid_at.strftime("%d.%m.%Y") if transaction.paid_at else "Dnes", "inline": True}
        ],
        "color": 0x00d4aa,
        "footer": {"text": "LeadFlow Dashboard"}
    }
    
    await send_dm_embed(client.discord_id, embed)


async def store_incoming_message(db: AsyncSession, message_data: Dict[str, Any]) -> DiscordMessage:
    """Store incoming Discord message."""
    user_id = message_data["author"]["id"]
    username = message_data["author"]["username"]
    avatar = message_data["author"].get("avatar")
    avatar_url = f"https://cdn.discordapp.com/avatars/{user_id}/{avatar}.png" if avatar else None
    content = message_data["content"]
    channel_id = message_data["channel_id"]
    message_id = message_data["id"]
    is_bot = message_data["author"].get("bot", False)
    
    # Find client by discord_id
    from app.models import Client
    from sqlalchemy import select
    result = await db.execute(select(Client).where(Client.discord_id == user_id))
    client = result.scalar_one_or_none()
    
    msg = DiscordMessage(
        client_id=client.id if client else None,
        discord_user_id=user_id,
        discord_username=username,
        discord_avatar=avatar_url,
        channel_id=channel_id,
        message_id=message_id,
        content=content,
        is_from_bot=is_bot
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    return msg