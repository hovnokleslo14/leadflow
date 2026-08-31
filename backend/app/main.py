from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.db.base import init_db, close_db
from app.api.v1 import clients_leads, drafts, finance, discord, scrapers
from app.services.notification_service import check_and_create_notifications
from app.db.base import AsyncSessionLocal
from app.celery_app import celery_app
import asyncio


# Background task for notifications
notification_task = None


async def run_notification_checker():
    """Periodically check for notifications."""
    while True:
        try:
            async with AsyncSessionLocal() as db:
                await check_and_create_notifications(db)
        except Exception as e:
            print(f"Notification checker error: {e}")
        await asyncio.sleep(300)  # Every 5 minutes


async def run_scraper_scheduler():
    """Run scrapers periodically."""
    from app.services.scrapers import run_all_scrapers
    while True:
        try:
            async with AsyncSessionLocal() as db:
                await run_all_scrapers(db)
        except Exception as e:
            print(f"Scraper scheduler error: {e}")
        await asyncio.sleep(3600)  # Every hour


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    
    # Start background tasks
    global notification_task
    notification_task = asyncio.create_task(run_notification_checker())
    asyncio.create_task(run_scraper_scheduler())
    
    # Create admin user if not exists
    async with AsyncSessionLocal() as db:
        from app.models import Client
        from sqlalchemy import select
        from app.api.deps import get_password_hash
        result = await db.execute(select(Client).where(Client.email == settings.admin_username))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = Client(
                name="Admin",
                email=settings.admin_username,
                is_active=True,
                metadata={"password_hash": get_password_hash(settings.admin_password_hash) if settings.admin_password_hash else ""}
            )
            db.add(admin)
            await db.commit()
    
    yield
    
    # Shutdown
    if notification_task:
        notification_task.cancel()
    await close_db()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(clients_leads.router, prefix="/api")
app.include_router(clients_leads.router_clients, prefix="/api")
app.include_router(clients_leads.router_leads, prefix="/api")
app.include_router(drafts.router, prefix="/api")
app.include_router(drafts.router_ai, prefix="/api")
app.include_router(finance.router_transactions, prefix="/api")
app.include_router(finance.router_recurring, prefix="/api")
app.include_router(finance.router_piggy, prefix="/api")
app.include_router(finance.router_notifications, prefix="/api")
app.include_router(finance.router_dashboard, prefix="/api")
app.include_router(discord.router, prefix="/api")
app.include_router(scrapers.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": settings.app_version}


@app.get("/api/admin/init-password")
async def init_admin_password(password: str):
    """Initialize admin password (only works if not set)."""
    from app.core.config import settings
    from app.api.deps import get_password_hash
    if settings.admin_password_hash:
        return {"error": "Password already set"}
    settings.admin_password_hash = get_password_hash(password)
    return {"ok": True, "message": "Admin password set"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.backend_port)