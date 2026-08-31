# LeadFlow Dashboard

Moderní CRM dashboard pro Minecraft vývojáře a agentury. Automatizuje hledání leadů, generuje AI nabídky, spravuje finance a komunikaci přes Discord bota.

## ✨ Funkce

| Modul | Popis |
|-------|-------|
| 🎯 **Leady** | Pipeline (Nový → Kontaktován → Kvalifikován → Nabídka → Vyjednávání → Vyhráno/Ztraceno), scrapování Reddit + MC servery |
| 🤖 **AI Drafty** | OpenAI GPT-4o / Anthropic Claude, personalizované nabídky, 4 tóny, CZ/EN |
| 🐷 **Prasátko** | Vizuální cíle s animacemi, milestone notifikace (25/50/75/90/100%), deadliny |
| 💰 **Finance** | Transakce, pravidelné platby (měsíční/roční), kategorie, faktury se splatností |
| 🔔 **Notifikace** | Gotify + Discord: splatnosti (3d/1d/den), po splatnosti, pravidelné platby, Discord zprávy |
| 💬 **Discord Bot** | Slash commands (`/faktura`, `/status`), DM, hromadné zprávy, OAuth propojení klientů |
| 📊 **Dashboard** | Statistiky real-time, grafy příjmů/výdajů/leadů, poslední aktivita, rychlé akce |

## 🚀 Rychlý start (Pelican/Pterodactyl)

### 1. Build & Push image
```bash
# Nastav své GHCR namespace
export GITHUB_REPOSITORY_OWNER=your-github-username

# Build multi-arch
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/$GITHUB_REPOSITORY_OWNER/leadflow:latest \
  --push .
```

### 2. V Pelicanu: Create Application → Docker Compose
Zkopíruj obsah `docker-compose.pelican.yml` do Pelicanu.

### 3. Nastav Environment Variables v Pelicanu

| Variable | Povinná | Příklad |
|----------|---------|---------|
| `DATABASE_URL` | ✅ | `postgresql+asyncpg://user:pass@host:5432/leadflow` |
| `SECRET_KEY` | ✅ | `openssl rand -hex 32` |
| `OPENAI_API_KEY` | ❌ | `sk-...` |
| `DISCORD_BOT_TOKEN` | ❌ | `...` |
| `REDIS_URL` | ❌ | `redis://redis:6379/0` |
| `NEXT_PUBLIC_API_URL` | ❌ | `https://dashboard.tvoje-domena.cz` |
| `DISCORD_REDIRECT_URI` | ❌ | `https://dashboard.tvoje-domena.cz/auth/discord/callback` |

### 4. Volumes (Pelican vytvoří automaticky)
- `leadflow_data` - DB + uploady
- `leadflow_uploads` - nahrátky
- `leadflow_logs` - logy supervisord
- `redis_data` - Redis persistence

### 5. Deploy
Klikni **Deploy** v Pelicanu. První start trvá ~60s (DB init + admin user).

---

## 🔧 Lokální vývoj

### Docker Compose (full stack)
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Bez Dockeru
```bash
./start.sh --setup
```

### Pouze frontend/backend
```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

---

## 📁 Struktura

```
├── backend/                 # FastAPI
│   ├── app/
│   │   ├── api/v1/         # REST endpoints
│   │   ├── models/         # SQLAlchemy (Client, Lead, Draft, Transaction, RecurringPayment, PiggyBankGoal, Notification, DiscordMessage)
│   │   ├── services/       # AI, Discord, Scrapers, Notifications
│   │   └── main.py
│   ├── Dockerfile          # Multi-stage
│   └── requirements.txt
├── frontend/                # Next.js 14
│   ├── src/app/dashboard/  # Všechny stránky
│   └── tailwind.config.js  # Glassmorphism design
├── nginx/
│   ├── pelican.conf        # Nginx pro Pelican (port 8080)
│   └── nginx.conf          # Produkční (SSL)
├── supervisord.conf        # Process manager
├── entrypoint.sh           # DB init + start
├── Dockerfile              # Single-container pro Pelican
├── docker-compose.yml      # Produkční stack
├── docker-compose.dev.yml  # Dev s live reload
├── docker-compose.pelican.yml  # Pro Pelican UI
└── .github/workflows/      # Auto build & push
```

---

## 🐳 Docker Image pro Pelican

Image obsahuje **vše v jednom kontejneru** (supervisord):
- **nginx** (port 8080) → reverse proxy
- **frontend** (Next.js standalone, port 3000)
- **backend** (FastAPI + gunicorn, port 8000)
- **celery-worker** (background tasks)
- **celery-beat** (scheduler)

### Healthcheck
```
GET /api/health  →  {"status": "ok", "version": "1.0.0"}
```

Pelican monitoruje `/health` (proxied na backend).

---

## 🔐 Výchozí přihlášení

Po prvním spuštění:
- **Email:** `admin`
- **Heslo:** `admin123`

**⚠️ Změňte hned po prvním přihlášení!**

---

## 🔗 Discord Bot Setup

1. Vytvoř aplikaci na [Discord Developer Portal](https://discord.com/developers/applications)
2. **OAuth2 → Redirects:** `https://your-domain.com/auth/discord/callback`
3. **Bot → Privileged Gateway Intents:** Message Content ON
4. Zkopíruj `DISCORD_BOT_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET` do Pelicanu
5. Pozvi bota na server: `https://discord.com/oauth2/authorize?client_id=YOUR_ID&permissions=274877977600&scope=bot%20applications.commands`

### Slash commands
- `/faktura <číslo>` - stav faktury
- `/status` - tvoje leady
- `/pomoc` - nápověda

---

## 🌐 Vlastní doména + SSL

### Pelican (automaticky)
Pelican terminuje SSL → nginx v kontejneru dostane HTTP na portu 8080.

### Vlastní nginx (pokud nepoužíváš Pelican proxy)
```nginx
server {
    listen 443 ssl http2;
    server_name dashboard.tvoje-domena.cz;
    
    ssl_certificate /etc/letsencrypt/live/dashboard.tvoje-domena.cz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.tvoje-domena.cz/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📦 GitHub Actions (Auto Build)

Workflow v `.github/workflows/docker.yml`:
- **Push na main/master** → build multi-arch (amd64/arm64) → push na GHCR
- **Tag v\*** → push s verzí + latest
- **PR** → build test (bez push)

### Nastavení v GitHubu
1. Settings → Actions → General → **Allow GitHub Actions**
2. Settings → Actions → General → **Read and write permissions** + **Allow attestations**
3. Packages → Settings → **Inherit access from repo** (nebo explicitně přidej repo)

---

## 🧪 Testování

```bash
# Backend testy
docker compose exec backend pytest -v

# Frontend lint + typecheck
docker compose exec frontend npm run lint
docker compose exec frontend npx tsc --noEmit
```

---

## 📊 Monitoring

- **Health:** `GET /api/health`
- **Logs:** `docker logs -f leadflow` (nebo v Pelicanu UI)
- **Metrics:** Přidej `prometheus-fastapi-instrumentator` do backendu

---

## 🆘 Troubleshooting

| Problém | Řešení |
|---------|--------|
| `502 Bad Gateway` | Zkontroluj `docker logs leadflow` - čeká na DB/Redis? |
| `Database connection failed` | Ověř `DATABASE_URL`, že PostgreSQL běží a acceptuje připojení |
| `Redis connection failed` | Nastav `REDIS_URL=redis://redis:6379/0` nebo vypni Celery v supervisord.conf |
| `Frontend build failed` | Zkontroluj `NEXT_PUBLIC_API_URL` - musí končit bez `/api` |
| `Discord OAuth failed` | Ověř `DISCORD_REDIRECT_URI` - musí přesně odpovídat Discord Developer Portal |

---

## 📄 Licence

MIT License

---

## 🤝 Podpora

- **Issues:** GitHub Issues
- **Discord:** [LeadFlow Community](https://discord.gg/leadflow)
- **Email:** support@leadflow.cz