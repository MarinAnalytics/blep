
## blep (frontend + backend + postgres)

"Boop the snoot" clicker rebuilt as a React + Vite SPA with an Express + Postgres backend and full Docker & Makefile tooling.

---
### High-Level Architecture
| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | React 18 + Vite | Audio, pointer events, country flag lookup, (leaderboard placeholder) |
| Backend | Express | REST: `/api/blep`, `/api/leaderboard`, `/healthz` |
| Database | PostgreSQL | Table `country_bleps` with trigger updating `updated_at` |
| Migrations | node-pg-migrate | Auto-run in Docker via a dedicated `migrate` service |
| Testing | Vitest + React Testing Library / Supertest | Separate frontend + backend suites; backend uses ephemeral Docker PG for tests |
| Containerization | Multi-stage (frontend build → nginx, backend node runtime) | `docker-compose.yml` orchestrates full stack |

---
### Features (Current)
- Cat image press animation (optimized for tablets via pointer events & direct DOM swap).
- Blep counter with configurable initial value & sound volume.
- Geo flag lookup via configurable API.
- Backend persistence endpoints (ready for wiring into frontend leaderboard).
- Postgres schema with upsert-based increment logic.

Planned (not yet implemented): live leaderboard integration, rate limiting, CI pipeline, PWA.

---
### Frontend (Vite)
Dev (inside `frontend/`):
```
npm install
npm run dev
```
Build & preview:
```
npm run build
npm run preview
```
Tests:
```
npm test           # one-off
npm run test:watch # watch mode
```

Vite base path auto-adjusts:
- GitHub Pages build: `/blep/`
- Docker runtime: `/` (via `VITE_DOCKER=1` during build stage)

---
### Backend (Express)
Scripts (inside `backend/`):
```
npm install
npm run dev      # nodemon
npm start        # prod mode
npm run migrate  # run pending migrations
```
Endpoints:
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/healthz` | Liveness probe |
| GET | `/api/leaderboard` | Top 50 countries ordered by bleps |
| POST | `/api/blep` | Increment country blep count (body: `{ country_code, country_name }`) |

---
### Database & Migrations
`backend/migrations/*` managed by `node-pg-migrate`.
Schema: `country_bleps(country_code PK, country_name, bleps INT, updated_at TIMESTAMPTZ)` plus trigger to bump `updated_at` on update.

---
### Environment Variables
Frontend (`frontend/.env` from `.env.example`):
| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_FLAG_API` | Country lookup endpoint | `https://ipapi.co/json/?fields=country_code,country_name` |
| `VITE_INITIAL_BLEP_COUNT` | Starting counter value | `0` |
| `VITE_AUDIO_VOLUME` | Audio volume 0-1 | `1.0` |

Backend (`backend/.env` from `.env.example`):
| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | Postgres connection string | `postgres://user:pass@localhost:5432/blep` |
| `PORT` | Server port | `4000` |
| `CORS_ORIGINS` | Comma list of allowed origins | `http://localhost:5173` |

Docker Compose sets its own `DATABASE_URL`, `PORT`, `CORS_ORIGINS` for internal networking.

---
### Makefile Quick Reference
From repo root:
| Target | Action |
|--------|--------|
| `frontend-install` | Install frontend deps |
| `frontend-up` | Run Vite dev server |
| `frontend-build` | Production build |
| `frontend-preview` | Preview build |
| `frontend-test` / `frontend-test-watch` | Frontend tests |
| `backend-install` | Install backend deps |
| `backend-dev` | Run backend with nodemon |
| `backend-start` | Start backend |
| `backend-migrate(-up)` | Apply migrations |
| `backend-migrate-down` | Roll back one migration |
| `backend-migrate-create NAME=desc` | Create new migration |
| `backend-test-db-up/down` | Start/stop ephemeral test PG |
| `backend-test` | Run backend tests (provisions ephemeral PG) |
| `backend-test-watch` | Watch mode tests (leaves PG up) |
| `deploy-gh-pages` | Build & push frontend to GitHub Pages |

---
### Testing Strategy
Frontend: Vitest + RTL + jsdom (unit / interaction).
Backend: Vitest + Supertest (integration) against ephemeral Docker Postgres (`docker-compose.test.yml`).

Run backend tests manually:
```
make backend-test
```

---
### Full Stack via Docker
Files:
- `docker-compose.yml` (full stack: db, migrate, backend, frontend)
- `frontend/Dockerfile` (multi-stage → nginx)
- `backend/Dockerfile`

Start everything:
```
docker compose up --build
```
Services:
| Service | Port (Host) | Notes |
|---------|-------------|-------|
| frontend | 8080 | Served by nginx (static Vite build) |
| backend | 4000 | Express API |
| db | 5432 (internal) | Postgres 16 Alpine |

The `migrate` one-off service runs migrations before the backend starts (using Compose `depends_on` with health + completion conditions).

Tear down:
```
docker compose down -v
```

---
### Deployment (Static Frontend)
GitHub Pages deploy (frontend only):
```
make deploy-gh-pages
```
Adjust backend origin / CORS accordingly for production hosting strategy.

---
### Current Limitations / TODO
- Frontend leaderboard still static (wire to `/api/leaderboard`).
- No auth / rate limiting on increment endpoint.
- No CI workflow (GitHub Actions) yet.
- No global error boundary / logging solution.
- No container healthchecks for backend/frontend (only DB currently).

---
### Contributing / License
Add a license file if open sourcing. PRs welcome once contribution guidelines exist.


