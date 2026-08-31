import asyncio
import httpx
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Lead, LeadSource, LeadStatus, ScraperLog
from app.core.config import settings


SCRAPERS = {}


def register_scraper(name: str):
    def decorator(func):
        SCRAPERS[name] = func
        return func
    return decorator


async def run_scraper(scraper_name: str, db: AsyncSession):
    """Run a scraper and log results."""
    if scraper_name not in SCRAPERS:
        return
    
    start_time = datetime.utcnow()
    leads_found = 0
    leads_new = 0
    error_message = None
    
    try:
        scraper_func = SCRAPERS[scraper_name]
        leads = await scraper_func(db)
        leads_found = len(leads)
        
        for lead_data in leads:
            # Check if lead already exists
            existing = await db.execute(
                select(Lead).where(
                    Lead.source == lead_data.source,
                    Lead.source_url == lead_data.source_url
                )
            )
            if not existing.scalar_one_or_none():
                db.add(lead_data)
                leads_new += 1
        
        await db.commit()
    except Exception as e:
        error_message = str(e)
    finally:
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        log = ScraperLog(
            scraper_name=scraper_name,
            status="success" if error_message is None else "error",
            leads_found=leads_found,
            leads_new=leads_new,
            error_message=error_message,
            duration_ms=duration_ms
        )
        db.add(log)
        await db.commit()


async def get_scraper_status(scraper_name: str, db: AsyncSession) -> Dict[str, Any]:
    """Get last run status for a scraper."""
    result = await db.execute(
        select(ScraperLog)
        .where(ScraperLog.scraper_name == scraper_name)
        .order_by(ScraperLog.created_at.desc())
        .limit(1)
    )
    last_log = result.scalar_one_or_none()
    
    if not last_log:
        return {"scraper": scraper_name, "last_run": None, "status": "never_run"}
    
    return {
        "scraper": scraper_name,
        "last_run": last_log.created_at.isoformat(),
        "status": last_log.status,
        "leads_found": last_log.leads_found,
        "leads_new": last_log.leads_new,
        "duration_ms": last_log.duration_ms
    }


@register_scraper("reddit_admincraft")
async def scrape_reddit_admincraft(db: AsyncSession) -> List[Lead]:
    """Scrape r/admincraft for people looking for developers."""
    if not settings.reddit_client_id or not settings.reddit_client_secret:
        return []
    
    import praw
    reddit = praw.Reddit(
        client_id=settings.reddit_client_id,
        client_secret=settings.reddit_client_secret,
        user_agent=settings.reddit_user_agent
    )
    
    leads = []
    subreddit = reddit.subreddit("admincraft")
    
    keywords = [
        "developer", "dev", "plugin", "web", "website", "discord bot",
        "backend", "frontend", "fullstack", "programmer", "coder",
        "looking for", "hiring", "need help", "freelance"
    ]
    
    for submission in subreddit.new(limit=50):
        text = (submission.title + " " + submission.selftext).lower()
        if any(kw in text for kw in keywords):
            lead = Lead(
                source=LeadSource.REDDIT,
                source_url=f"https://reddit.com{submission.permalink}",
                title=f"Reddit: {submission.title[:200]}",
                description=submission.selftext[:2000] if submission.selftext else "",
                contact_username=submission.author.name if submission.author else "deleted",
                contact_platform="reddit",
                status=LeadStatus.NEW,
                metadata={
                    "subreddit": "admincraft",
                    "score": submission.score,
                    "comments": submission.num_comments,
                    "created_utc": submission.created_utc
                }
            )
            leads.append(lead)
    
    return leads


@register_scraper("minecraft_servers_list")
async def scrape_minecraft_servers_list(db: AsyncSession) -> List[Lead]:
    """Scrape minecraft-server-list.com for small servers without websites."""
    leads = []
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Get servers with low player counts
            resp = await client.get(
                "https://minecraft-server-list.com/api/servers",
                params={"sort": "players", "order": "asc", "limit": 100}
            )
            if resp.status_code != 200:
                return []
            
            data = resp.json()
            for server in data.get("servers", []):
                players = server.get("players", 0)
                max_players = server.get("max_players", 0)
                
                # Only servers with low population (potential for growth)
                if players > 10 or max_players < 20:
                    continue
                
                # Check if they have a website
                website = server.get("website", "")
                has_discord = bool(server.get("discord", ""))
                
                # Priority: no website, has discord (easier to contact)
                if website and not has_discord:
                    continue
                
                lead = Lead(
                    source=LeadSource.MINECRAFT_SERVER_LIST,
                    source_url=f"https://minecraft-server-list.com/server/{server.get('id')}",
                    title=f"MC Server: {server.get('name', 'Unknown')}",
                    description=f"Server s {players}/{max_players} hráči. {'Má web: ' + website if website else 'Žádný web'} {'Discord: ' + server.get('discord', '') if has_discord else ''}",
                    server_name=server.get("name"),
                    server_ip=server.get("ip"),
                    server_players=players,
                    server_max_players=max_players,
                    server_version=server.get("version"),
                    status=LeadStatus.NEW,
                    estimated_value=5000 if not website else 3000,
                    priority=10 if not website else 5,
                    metadata={
                        "website": website,
                        "discord": server.get("discord", ""),
                        "motd": server.get("motd", ""),
                        "country": server.get("country", "")
                    }
                )
                leads.append(lead)
        except Exception as e:
            pass
    
    return leads


@register_scraper("planet_minecraft")
async def scrape_planet_minecraft(db: AsyncSession) -> List[Lead]:
    """Scrape Planet Minecraft for server owners looking for help."""
    leads = []
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(
                "https://www.planetminecraft.com/servers/",
                headers={"User-Agent": settings.reddit_user_agent}
            )
            # This would need HTML parsing - placeholder for now
        except Exception:
            pass
    
    return leads


async def search_reddit_leads(
    query: str,
    subreddit: str,
    limit: int,
    db: AsyncSession
) -> List[Lead]:
    """Search Reddit for specific terms."""
    if not settings.reddit_client_id or not settings.reddit_client_secret:
        return []
    
    import praw
    reddit = praw.Reddit(
        client_id=settings.reddit_client_id,
        client_secret=settings.reddit_client_secret,
        user_agent=settings.reddit_user_agent
    )
    
    leads = []
    sub = reddit.subreddit(subreddit)
    
    for submission in sub.search(query, limit=limit, sort="new"):
        lead = Lead(
            source=LeadSource.REDDIT,
            source_url=f"https://reddit.com{submission.permalink}",
            title=f"Reddit r/{subreddit}: {submission.title[:200]}",
            description=submission.selftext[:2000] if submission.selftext else "",
            contact_username=submission.author.name if submission.author else "deleted",
            contact_platform="reddit",
            status=LeadStatus.NEW,
            metadata={
                "subreddit": subreddit,
                "score": submission.score,
                "search_query": query
            }
        )
        leads.append(lead)
        db.add(lead)
    
    await db.commit()
    return leads


async def search_minecraft_servers(
    query: str,
    min_players: int,
    max_players: int,
    version: Optional[str],
    limit: int,
    db: AsyncSession
) -> List[Lead]:
    """Search Minecraft servers with filters."""
    leads = []
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            params = {"limit": limit}
            if query:
                params["search"] = query
            
            resp = await client.get(
                "https://api.mcstatus.io/v2/status/java",
                params=params
            )
            # This is a placeholder - would need actual server list API
        except Exception:
            pass
    
    return leads


async def run_all_scrapers(db: AsyncSession):
    """Run all registered scrapers."""
    for name in SCRAPERS:
        await run_scraper(name, db)
        await asyncio.sleep(2)  # Rate limiting between scrapers


# Scheduled job function
async def scheduled_scraper_job():
    """Entry point for cron/scheduler."""
    from app.db.base import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await run_all_scrapers(db)