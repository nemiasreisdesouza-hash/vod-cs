# 🎯 VOD Analyst Pro

Plataforma web para análise de VODs e demos de **CS2** e **CrossFire**: scoreboard completo,
análise tática automática, heatmaps, VOD player com anotações e plano de melhoria personalizado.

## ✨ Funcionalidades

| Área | O que faz |
|---|---|
| 🔐 Auth | Registro, login JWT (access + refresh), recuperação de senha, planos FREE/PRO/TEAM |
| 👥 Times | CRUD, membros com roles (Entry, AWPer, Support, IGL, Lurker…), convites por link/código |
| 📤 Upload | `.dem` (CS2) e `.mp4`/`.mkv` (CrossFire), processamento assíncrono (Celery) com fallback inline |
| 🔫 Parser CS2 | Stats por jogador/round, kills, utility, posições, economia, clutch, opening duels (via `demoparser2`, com fallback sintético determinístico) |
| 🎖️ CrossFire | Pipeline OpenCV (probe de vídeo + hooks de OCR/minimapa) + entrada manual de rounds |
| 📊 Dashboard | Rating médio, win rate, ADR, erros/partida, evolução, win rate por mapa, top issues |
| ⚠️ Análise tática | 8 detectores: trade perdido, rotação lenta, crossfire, utility, economia, pós-plant, peek seco, isolamento |
| 🗺️ Heatmaps | Kills, deaths, posições e utilitárias (canvas interativo + filtros por lado) |
| 🎬 VOD player | Velocidade 0.25–2x, timeline com marcadores, desenho sobre o vídeo, anotações compartilhadas |
| 🧠 Jogador | Rating 2.0, pontos fortes/fracos, role sugerida, plano de treino, evolução, radar vs média pro |
| 💳 Planos | FREE (3/mês), PRO ($9.99), TEAM ($29.99) — checkout mock, pronto p/ Stripe |

## 🚀 Quickstart (Docker — recomendado)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000 (ou http://localhost:8080 via Nginx)
- API + Swagger: http://localhost:8000/docs
- MinIO: http://localhost:9001 (minioadmin / minioadmin123)

Contas demo (seed automático): `pro@vod.gg / pro123` • `coach@vod.gg / team123` • `free@vod.gg / free123`

## 🛠️ Desenvolvimento local (sem Docker)

```bash
# Backend (sqlite local + seed)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL="sqlite:///./dev.db" SEED_DEMO_DATA=true \
  uvicorn app.main:app --reload --port 8000

# Frontend (proxy /api -> backend)
cd frontend
npm install
npm run dev  # http://localhost:3000
```

Swagger: http://localhost:8000/docs • Health: http://localhost:8000/health

## 🧪 Testes

```bash
cd backend && python -m pytest tests/ -q
cd frontend && npx tsc --noEmit && npm run build
```

## 📁 Estrutura

```
├── docker-compose.yml  (postgres, redis, minio, backend, worker, frontend, nginx)
├── nginx/              reverse proxy (limite de upload 600M)
├── backend/app/
│   ├── api/            auth, teams, matches, players, annotations, heatmaps, dashboard, subscriptions
│   ├── models/         19 tabelas (users → notifications)
│   ├── core/           cs2_parser, crossfire_analyzer, tactical_engine, heatmap_generator,
│   │                   player_rating (HLTV 2.0), improvement_engine
│   ├── tasks/          Celery: process_demo, process_vod, generate_heatmap, generate_report
│   └── utils/          security (JWT+bcrypt), storage (S3/MinIO), map_coordinates
└── frontend/src/
    ├── app/            landing, login, register, pricing, dashboard (20 rotas)
    ├── components/     ui, layout, charts, match, heatmap, vod-player
    └── lib|services|stores|hooks|types|i18n
```

## 🗺️ Mapas

CS2: Mirage, Inferno, Dust2, Nuke, Overpass, Ancient, Anubis, Vertigo.
CrossFire: Black Widow, Port, Sub Base, Eagle Eye, Mexico.
`frontend/public/maps/*.svg` traz placeholders — substitua pelas overviews oficiais para visual fiel.

## 📝 Notas de produção

- `demoparser2` faz parse real de `.dem`; sem arquivo válido, o pipeline usa fallback sintético
  (mesmo formato, ideal para demo/testes). Conecte `parse_events` em `cs2_parser._try_real_parse`.
- CrossFire: complete OCR do killfeed (`pytesseract`) e segmentação do minimapa em `crossfire_analyzer.py`.
- Checkout usa mock — ligue ao Stripe em `api/subscriptions.py`.
- `alembic.ini` + `migrations/env.py` prontos para migrações em produção.
