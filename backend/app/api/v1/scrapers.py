from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime
from app.db.base import get_db
from app.api.deps import get_current_user
from app.models import Lead, LeadSource, LeadStatus, ScraperLog
from app.schemas import LeadResponse, ScraperLogResponse, PaginatedResponse
from app.services.scrapers import run_scraper, get_scraper_status

router = APIRouter(prefix="/scrapers", tags=["scrapers"])


@router.get("", response_model=List[dict])
async def list_scrapers():
    from app.services.scrapers import SCRAPERS
    return [
        {
            "name": name,
            "description": scraper.__doc__ or "No description",
            "enabled": True
        }
        for name, scraper in SCRAPERS.items()
    ]


@router.get("/logs", response_model=PaginatedResponse)
async def get_scraper_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    scraper_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(ScraperLog)
    if scraper_name:
        query = query.where(ScraperLog.scraper_name == scraper_name)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.order_by(ScraperLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return PaginatedResponse(
        items=[ScraperLogResponse.model_validate(l) for l in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("/run/{scraper_name}")
async def run_scraper_endpoint(
    scraper_name: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.services.scrapers import SCRAPERS
    if scraper_name not in SCRAPERS:
        raise HTTPException(status_code=404, detail="Scraper not found")
    
    background_tasks.add_task(run_scraper, scraper_name, db)
    return {"status": "started", "scraper": scraper_name}


@router.get("/status/{scraper_name}")
async def get_scraper_status_endpoint(
    scraper_name: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    status = await get_scraper_status(scraper_name, db)
    return status


@router.post("/reddit/search")
async def search_reddit(
    query: str,
    subreddit: str = "admincraft",
    limit: int = 25,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.services.scrapers import search_reddit_leads
    leads = await search_reddit_leads(query, subreddit, limit, db)
    return {"found": len(leads), "leads": [LeadResponse.model_validate(l) for l in leads]}


@router.post("/minecraft/servers")
async def search_minecraft_servers(
    query: str = "",
    min_players: int = 0,
    max_players: int = 100,
    version: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.services.scrapers import search_minecraft_servers
    leads = await search_minecraft_servers(query, min_players, max_players, version, limit, db)
    return {"found": len(leads), "leads": [LeadResponse.model_validate(l) for l in leads]}