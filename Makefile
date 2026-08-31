# LeadFlow Dashboard - Makefile
.PHONY: help dev build up down logs restart clean test lint

# Default target
help:
	@echo "LeadFlow Dashboard - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev          Start development environment with live reload"
	@echo "  make dev-backend  Start only backend in development mode"
	@echo "  make dev-frontend Start only frontend in development mode"
	@echo ""
	@echo "Production:"
	@echo "  make build        Build all Docker images"
	@echo "  make up           Start production environment"
	@echo "  make down         Stop production environment"
	@echo "  make restart      Restart all services"
	@echo ""
	@echo "Utilities:"
	@echo "  make logs         Show logs for all services"
	@echo "  make logs-backend Show backend logs"
	@echo "  make logs-frontend Show frontend logs"
	@echo "  make shell-backend Open backend shell"
	@echo "  make shell-frontend Open frontend shell"
	@echo "  make shell-db     Open database shell"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        Remove all containers, volumes, and images"
	@echo "  make clean-volumes Remove only volumes (WARNING: deletes data)"
	@echo "  make init-db      Initialize database"
	@echo ""
	@echo "Testing:"
	@echo "  make test         Run all tests"
	@echo "  make test-backend Run backend tests"
	@echo "  make test-frontend Run frontend tests"
	@echo "  make lint         Run linting"

# Development
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

dev-backend:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up backend celery-worker postgres redis

dev-frontend:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up frontend

# Production
build:
	docker compose build --parallel

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

# Logs
logs:
	docker compose logs -f --tail=100

logs-backend:
	docker compose logs -f --tail=100 backend

logs-frontend:
	docker compose logs -f --tail=100 frontend

logs-celery:
	docker compose logs -f --tail=100 celery-worker

logs-nginx:
	docker compose logs -f --tail=100 nginx

# Shells
shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

shell-db:
	docker compose exec postgres psql -U leadflow -d leadflow

shell-redis:
	docker compose exec redis redis-cli

# Database
init-db:
	docker compose exec backend python init_db.py

migrate:
	docker compose exec backend alembic upgrade head

makemigrations:
	docker compose exec backend alembic revision --autogenerate -m "$(MSG)"

# Testing
test:
	make test-backend && make test-frontend

test-backend:
	docker compose exec backend pytest -v

test-frontend:
	docker compose exec frontend npm run test

# Linting
lint:
	make lint-backend && make lint-frontend

lint-backend:
	docker compose exec backend ruff check .

lint-frontend:
	docker compose exec frontend npm run lint

# Cleanup
clean:
	docker compose down -v --rmi all --remove-orphans

clean-volumes:
	docker compose down -v

# Prune Docker
prune:
	docker system prune -af --volumes

# SSL Certificates (Let's Encrypt)
ssl-renew:
	docker compose run --rm certbot renew
	docker compose restart nginx

# Backup
backup-db:
	docker compose exec postgres pg_dump -U leadflow leadflow > backup_$(date +%Y%m%d_%H%M%S).sql

restore-db:
	@read -p "Backup file: " file; \
	docker compose exec -T postgres psql -U leadflow -d leadflow < $$file

# Default
.DEFAULT_GOAL := help