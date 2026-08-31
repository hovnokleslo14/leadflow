from celery import Celery
from app.celery_app import celery_app
from app.db.base import AsyncSessionLocal
from app.services.notification_service import check_and_create_notifications
from app.services.scrapers import run_all_scrapers
import asyncio


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def check_notifications_task(self):
    """Celery task to check and create notifications."""
    try:
        async def run():
            async with AsyncSessionLocal() as db:
                await check_and_create_notifications(db)
        
        asyncio.run(run())
        return {"status": "success", "message": "Notifications checked"}
    except Exception as exc:
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def run_scrapers_task(self):
    """Celery task to run all scrapers."""
    try:
        async def run():
            async with AsyncSessionLocal() as db:
                await run_all_scrapers(db)
        
        asyncio.run(run())
        return {"status": "success", "message": "Scrapers completed"}
    except Exception as exc:
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def generate_recurring_payments_task(self):
    """Celery task to generate recurring payments."""
    try:
        async def run():
            async with AsyncSessionLocal() as db:
                from app.services.notification_service import check_and_create_notifications
                await check_and_create_notifications(db)
        
        asyncio.run(run())
        return {"status": "success", "message": "Recurring payments generated"}
    except Exception as exc:
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_discord_notification_task(self, user_id: str, title: str, message: str):
    """Celery task to send Discord notification."""
    try:
        async def run():
            from app.services.discord_service import send_dm_embed
            embed = {
                "title": title,
                "description": message,
                "color": 0x5865F2,
                "footer": {"text": "LeadFlow Dashboard"}
            }
            await send_dm_embed(user_id, embed)
        
        asyncio.run(run())
        return {"status": "success", "message": "Discord notification sent"}
    except Exception as exc:
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_gotify_notification_task(self, title: str, message: str, priority: int = 5):
    """Celery task to send Gotify notification."""
    try:
        async def run():
            from app.services.notification_service import send_gotify_notification
            await send_gotify_notification(title, message, priority)
        
        asyncio.run(run())
        return {"status": "success", "message": "Gotify notification sent"}
    except Exception as exc:
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def generate_ai_draft_task(self, lead_id: int, custom_prompt: str = None, tone: str = "professional", language: str = "cs"):
    """Celery task to generate AI draft."""
    try:
        async def run():
            from app.services.ai_service import generate_draft
            from app.db.base import AsyncSessionLocal
            from app.models import Lead
            from sqlalchemy import select
            from app.schemas import AIDraftRequest
            
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Lead).where(Lead.id == lead_id)
                )
                lead = result.scalar_one_or_none()
                if not lead:
                    raise ValueError(f"Lead {lead_id} not found")
                
                request = AIDraftRequest(
                    lead_id=lead_id,
                    custom_prompt=custom_prompt,
                    tone=tone,
                    language=language
                )
                
                draft_content, usage = await generate_draft(lead, request)
                
                from app.models import Draft, DraftStatus
                draft = Draft(
                    lead_id=lead_id,
                    subject=f"Nabídka spolupráce: {lead.title}",
                    content=draft_content,
                    ai_model="openai",  # or anthropic
                    prompt_used=custom_prompt or "auto",
                    status=DraftStatus.GENERATED
                )
                db.add(draft)
                await db.commit()
                await db.refresh(draft)
                
                return {"draft_id": draft.id, "usage": usage}
        
        result = asyncio.run(run())
        return {"status": "success", "data": result}
    except Exception as exc:
        self.retry(exc=exc)