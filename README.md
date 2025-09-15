
## blep (frontend + backend + postgres)

"Boop the snoot" clicker rebuilt as a React + Vite SPA with an Express + Postgres backend and full Docker & Makefile tooling.

### High-Level Architecture
| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | React 18 + Vite | Audio, pointer events, country flag lookup, live leaderboard via backend |
| Backend | Express | REST: `/api/blep`, `/api/leaderboard`, `/healthz` |
| Database | PostgreSQL | Table `country_bleps` with trigger updating `updated_at` |
| Migrations | node-pg-migrate | Auto-run in Docker via a dedicated `migrate` service |
| Testing | Vitest + React Testing Library / Supertest | Separate frontend + backend suites; backend uses ephemeral Docker PG for tests |
| Containerization | Multi-stage (frontend build → nginx, backend node runtime) | `docker-compose.yml` orchestrates full stack |

### Features (Current)
 - In-memory per-IP rate limiting on `/api/blep` (configurable window & max requests) returning 429 with retry metadata.

Planned: CI pipeline, PWA, aggregate global metrics endpoint, security hardening.

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
| `VITE_API_BASE` | Backend API base URL (no trailing slash) | `http://localhost:4000` |

Backend (`backend/.env` from `.env.example`):
| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | Postgres connection string | `postgres://user:pass@localhost:5432/blep` |
| `PORT` | Server port | `4000` |
| `CORS_ORIGINS` | Comma list of allowed origins | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Window size for blep rate limit | `60000` |
| `RATE_LIMIT_MAX_BLEPS` | Max blep POSTs per IP per window | `120` |

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
| `backend-seed` | Seed ephemeral test DB (leaves DB up) |
| `backend-e2e` | Run backend e2e tests (migrate, seed, test, teardown) |
| `stack-up` | Start full docker stack (cached images) |
| `stack-up-build` | Build then start full docker stack |
| `stack-down` | Stop & remove stack containers/network |
| `stack-logs` | Tail logs for all stack services |
| `stack-ps` | List running stack services |
| `stack-db-truncate` | Truncate `country_bleps` table in running stack |
| `e2e-install` | Install browser E2E dependencies |
| `e2e-run` | Run Selenium tests against existing stack |
| `stack-e2e` | Build stack, run Selenium tests, teardown |

---
### Testing Strategy
Frontend: Vitest + RTL + jsdom (unit / interaction).
Backend: 
- Integration: Vitest + Supertest (ephemeral Docker Postgres via `make backend-test`).
- E2E: Vitest (spins actual Express server on random port after migrate + seed) via `make backend-e2e`.

Browser E2E (full stack): Selenium WebDriver driving headless Chrome against real Docker stack.

Run full browser E2E (requires Chrome installed):
```
make stack-e2e
```
To watch logs in another terminal while running:
```
make stack-logs
```
Set `HEADFUL=1` for visible browser:
```
HEADFUL=1 FRONTEND_URL=http://localhost:8080 make e2e-run
```

Browser E2E details:
- Harness code: `e2e/test.e2e.mjs`
- Headless by default; set `HEADFUL=1` for an interactive session.
- Uses CSS selectors: `#targetArea` (click target), `#blepCounter`, `.leaderboard-item` rows.
- Asserts both local counter and leaderboard increment for detected country.
- Retries flag acquisition briefly; fails if country cannot be determined.

Run backend integration tests:
```
make backend-test
```

Run backend e2e tests (migrate + seed + server lifecycle):
```
make backend-e2e
```

Seed only (DB left up for inspection):
```
make backend-seed
```

Seeding script: `backend/scripts/seed.js` inserts baseline countries (US, CA, GB, DE) with starter blep counts.

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
### Rate Limiting
`/api/blep` is protected by a simple in-memory fixed-window limiter (per IP):

Response when exceeded (HTTP 429):
```json
{ "error": "rate_limited", "retry_after_ms": <milliseconds until window resets> }
```
Configure via environment:
* `RATE_LIMIT_WINDOW_MS` (default 60000)
* `RATE_LIMIT_MAX_BLEPS` (default 120)

Notes:
* In-memory only; does not share state across multiple container instances.
* Suitable for local use & small single-instance deployments; for production scaling, replace with Redis or database-backed algorithm.

### In-Memory DB Fallback (Local Tests)
If `DATABASE_URL` is not set, the backend swaps to an in-memory mock implementing only the queries used by the app/tests. This allows running unit & middleware tests without Postgres. Full integration / E2E coverage still requires a real database (e.g. via `docker compose` or the test compose file). The fallback is non-persistent and should never be used in production.

### Deployment
### Current Limitations / TODO
- No auth on increment endpoint (only basic per-IP rate limit; still susceptible to distributed abuse).
- No CI workflow (GitHub Actions) yet.
- No global error boundary / structured logging solution.
- No container healthchecks for backend/frontend (only DB currently in docker-compose).
- No aggregate global total endpoint (could be derived or cached).
- No Playwright/Puppeteer full browser E2E covering frontend + backend together.

---
### Contributing / License
Add a license file if open sourcing. PRs welcome once contribution guidelines exist.


