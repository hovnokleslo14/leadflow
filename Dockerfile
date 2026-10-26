# LeadFlow Dashboard - Pelican/Pterodactyl compatible single container
# Build: docker build -t ghcr.io/username/leadflow:latest .
# Push:  docker push ghcr.io/username/leadflow:latest

################################################################################
# 1️⃣ FRONTEND BUILDER
################################################################################
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install deps first (better cache)
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source & build
COPY frontend/ ./
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8080}
RUN npm run build

################################################################################
# 2️⃣ BACKEND DEPS
################################################################################
FROM python:3.12-slim AS backend-deps
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

################################################################################
# 3️⃣ FINAL RUNTIME IMAGE
################################################################################
FROM python:3.12-slim

# System deps: nginx + supervisor + curl (healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (Pelican runs as container user)
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /bin/bash appuser

WORKDIR /app

# ---- Copy built frontend (standalone output) ----
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# ---- Copy backend ----
COPY --from=backend-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-deps /usr/local/bin /usr/local/bin
COPY backend/ ./backend/

# ---- Configs for Pelican (port 8080) ----
COPY nginx/pelican.conf /etc/nginx/sites-enabled/default
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ---- Entrypoint script ----
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create dirs & permissions
RUN mkdir -p /var/log/nginx /var/log/supervisor /run/nginx /app/backend/data /app/backend/uploads \
    && chown -R appuser:appuser /app /var/log/nginx /var/log/supervisor /run/nginx

# Pelican exposes port 8080
EXPOSE 8080

# Healthcheck for Pelican
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Run as non-root (Pelican handles user mapping)
USER appuser

ENTRYPOINT ["/entrypoint.sh"]