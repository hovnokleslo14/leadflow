#!/usr/bin/env python3
"""
Database initialization script for LeadFlow Dashboard.
Creates all tables and initial data.
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from app.db.base import init_db, engine
from app.models import Base
from app.core.config import settings
from app.api.deps import get_password_hash


async def create_admin_user():
    """Create default admin user if not exists."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from app.models import Client
    from app.db.base import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        # Check if admin exists
        result = await db.execute(select(Client).where(Client.email == settings.admin_username))
        admin = result.scalar_one_or_none()
        
        if not admin:
            admin = Client(
                name="Administrator",
                email=settings.admin_username,
                is_active=True,
                metadata={"password_hash": get_password_hash("admin123")}  # Default password
            )
            db.add(admin)
            await db.commit()
            await db.refresh(admin)
            print(f"✅ Created admin user: {settings.admin_username} (password: admin123)")
        else:
            print(f"ℹ️ Admin user already exists: {settings.admin_username}")


async def create_sample_data():
    """Create sample data for development."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from app.models import (
        Client, Lead, LeadStatus, LeadSource,
        PiggyBankGoal, TransactionType
    )
    from app.db.base import AsyncSessionLocal
    from datetime import datetime, timedelta
    
    async with AsyncSessionLocal() as db:
        # Check if sample data already exists
        result = await db.execute(select(Client).where(Client.email == "sample@leadflow.cz"))
        if result.scalar_one_or_none():
            print("ℹ️ Sample data already exists")
            return
        
        # Create sample client
        client = Client(
            name="MC Server Czech s.r.o.",
            email="sample@leadflow.cz",
            phone="+420 123 456 789",
            company="MC Server Czech s.r.o.",
            website="https://mcserverczech.cz",
            discord_id="123456789012345678",
            notes="Vývojář serverů, hledá partnra pro pluginy",
            tags=["vip", "plugin-dev", "hosting"],
            is_active=True,
        )
        db.add(client)
        await db.flush()
        
        # Create sample leads
        leads = [
            Lead(
                client_id=client.id,
                source=LeadSource.REDDIT,
                source_url="https://reddit.com/r/admincraft/comments/abc123",
                title="Hledám developera na custom pluginy pro Survival server",
                description="Potřebuji vývojáře na ekonomiku, chestshop a custom items. Server má 50+ hráčů denně.",
                server_name="SurvivalCraft",
                server_ip="play.survivalcraft.cz",
                server_players=45,
                server_max_players=100,
                server_version="1.20.4",
                contact_username="server_owner_cz",
                contact_platform="discord",
                status=LeadStatus.QUALIFIED,
                priority=80,
                estimated_value=50000,
            ),
            Lead(
                client_id=client.id,
                source=LeadSource.MINECRAFT_SERVER_LIST,
                source_url="https://minecraft-server-list.com/server/456",
                title="Malý server bez webu - potenciál na vývoj",
                description="Server s 15/50 hráči, žádný web, žádný Discord. Ideální pro nabídku webu + pluginů.",
                server_name="MiniCraft",
                server_ip="mini.craft.cz:25565",
                server_players=15,
                server_max_players=50,
                server_version="1.20.1",
                status=LeadStatus.NEW,
                priority=60,
                estimated_value=25000,
            ),
        ]
        for lead in leads:
            db.add(lead)
        
        # Create sample piggy bank goals
        goals = [
            PiggyBankGoal(
                name="Nový vývojový server",
                target_amount=100000,
                current_amount=35000,
                currency="CZK",
                deadline=datetime.utcnow() + timedelta(days=60),
                description="Koupě dedikovaného serveru pro vývoj a testování pluginů",
                color="#00d4aa",
                icon="🖥️",
                is_active=True,
            ),
            PiggyBankGoal(
                name="Marketingová kampaň",
                target_amount=50000,
                current_amount=12000,
                currency="CZK",
                deadline=datetime.utcnow() + timedelta(days=30),
                description="Reklama na Redditu, Minecraft serverech a Discordu",
                color="#a855f7",
                icon="📢",
                is_active=True,
            ),
            PiggyBankGoal(
                name="Vzdělání a kurzy",
                target_amount=30000,
                current_amount=30000,
                currency="CZK",
                deadline=datetime.utcnow() + timedelta(days=90),
                description="Kurzy React, FastAPI, Docker, Kubernetes",
                color="#22c55e",
                icon="📚",
                is_active=True,
            ),
        ]
        for goal in goals:
            db.add(goal)
        
        await db.commit()
        print("✅ Created sample data")


async def main():
    print("🔧 Initializing LeadFlow Dashboard database...")
    
    # Create tables
    await init_db()
    print("✅ Database tables created")
    
    # Create admin user
    await create_admin_user()
    
    # Create sample data in development
    if settings.debug:
        await create_sample_data()
    
    print("\n🎉 Database initialization complete!")
    print(f"   Admin: {settings.admin_username}")
    print(f"   Default password: admin123 (change after first login)")
    print(f"   Database: {settings.database_url}")


if __name__ == "__main__":
    asyncio.run(main())