#!/bin/bash
# Entrypoint for Pelican container - initializes DB and starts supervisor

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ──────────────────────────────────────────────────────────────────
# Wait for PostgreSQL if using external DB
# ──────────────────────────────────────────────────────────────────
if [[ "$DATABASE_URL" == postgresql* ]]; then
    log_info "Waiting for PostgreSQL..."
    
    # Extract host and port from DATABASE_URL
    # postgresql+asyncpg://user:pass@host:5432/db
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_PORT=${DB_PORT:-5432}
    
    for i in {1..30}; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q 2>/dev/null; then
            log_info "PostgreSQL is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL not ready after 30 attempts"
            exit 1
        fi
        sleep 2
    done
fi

# ──────────────────────────────────────────────────────────────────
# Wait for Redis if configured
# ──────────────────────────────────────────────────────────────────
if [[ -n "$REDIS_URL" ]]; then
    log_info "Waiting for Redis..."
    REDIS_HOST=$(echo "$REDIS_URL" | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    REDIS_PORT=$(echo "$REDIS_URL" | sed -n 's/.*:\([0-9]*\).*/\1/p')
    REDIS_PORT=${REDIS_PORT:-6379}
    
    for i in {1..15}; do
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q PONG; then
            log_info "Redis is ready"
            break
        fi
        if [ $i -eq 15 ]; then
            log_warn "Redis not ready, continuing anyway"
        fi
        sleep 1
    done
fi

# ──────────────────────────────────────────────────────────────────
# Initialize database (run migrations)
# ──────────────────────────────────────────────────────────────────
log_info "Initializing database..."
cd /app/backend
python -c "
import asyncio
import sys
sys.path.insert(0, '.')
from app.db.base import init_db
asyncio.run(init_db())
print('Database initialized')
" || {
    log_error "Database initialization failed"
    exit 1
}

# Create admin user if not exists
log_info "Checking admin user..."
python -c "
import asyncio
import sys
sys.path.insert(0, '.')
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import AsyncSessionLocal
from app.models import Client
from app.core.config import settings
from app.api.deps import get_password_hash

async def check_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Client).where(Client.email == settings.admin_username))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = Client(
                name='Administrator',
                email=settings.admin_username,
                is_active=True,
                metadata={'password_hash': get_password_hash('admin123')}
            )
            db.add(admin)
            await db.commit()
            print('Created admin user: admin / admin123')
        else:
            print('Admin user exists')

asyncio.run(check_admin())
" || log_warn "Admin user check failed (non-fatal)"

# ──────────────────────────────────────────────────────────────────
# Create required directories
# ──────────────────────────────────────────────────────────────────
mkdir -p /app/backend/data /app/backend/uploads /var/log/nginx /var/log/supervisor /run/nginx
chown -R appuser:appuser /app/backend/data /app/backend/uploads 2>/dev/null || true

# ──────────────────────────────────────────────────────────────────
# Start supervisor (manages nginx + frontend + backend + celery)
# ──────────────────────────────────────────────────────────────────
log_info "Starting services via supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf