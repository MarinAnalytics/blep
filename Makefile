# Root Makefile for blep project
# Usage examples:
#   make frontend-install
#   make frontend-up
#   make frontend-build
#   make frontend-test
#   make frontend-test-watch
#   make frontend-preview
#   make clean-dist
#   make deploy-gh-pages

SHELL := /bin/bash
FRONTEND_DIR := frontend
BACKEND_DIR := backend
NPM := npm --prefix $(FRONTEND_DIR)
NPM_BACK := npm --prefix $(BACKEND_DIR)

.PHONY: help frontend-install frontend-up frontend-build frontend-preview frontend-test frontend-test-watch clean-dist deploy-gh-pages backend-install backend-dev backend-start backend-migrate backend-migrate-up backend-migrate-down backend-migrate-create backend-test-db-up backend-test-db-down backend-test backend-test-watch backend-seed backend-e2e stack-up stack-up-build stack-down stack-logs stack-ps e2e-install e2e-run stack-e2e

help:
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

frontend-install: ## Install frontend dependencies
	$(NPM) install

frontend-up: frontend-install ## Run dev server (Vite) in frontend
	$(NPM) run dev

frontend-build: frontend-install ## Build production frontend
	$(NPM) run build

frontend-preview: frontend-build ## Preview the production build locally
	$(NPM) run preview

frontend-test: frontend-install ## Run test suite once
	$(NPM) test

frontend-test-watch: frontend-install ## Run tests in watch mode
	$(NPM) run test:watch

clean-dist: ## Remove built dist folder inside frontend
	rm -rf $(FRONTEND_DIR)/dist

# Deploy current frontend build to gh-pages (build first). Requires write access and configured remote.
deploy-gh-pages: frontend-build ## Deploy dist to gh-pages branch (force push)
	git subtree push --prefix $(FRONTEND_DIR)/dist origin gh-pages || \
	( echo "subtree push failed; attempting rsync method"; \
	 tmp_dir=$$(mktemp -d); \
	 cp -R $(FRONTEND_DIR)/dist/. $$tmp_dir; \
	 pushd $$tmp_dir >/dev/null; \
	 git init -q; git checkout -b gh-pages; touch .nojekyll; git add .; \
	 git commit -m "deploy: blep build $$(date -u +%Y-%m-%dT%H:%M:%SZ)"; \
	 git remote add origin `git config --get remote.origin.url`; \
	 git push -f origin gh-pages; \
	 popd >/dev/null; rm -rf $$tmp_dir; )

backend-install: ## Install backend dependencies
	$(NPM_BACK) install

backend-dev: backend-install ## Run backend in dev mode (nodemon)
	$(NPM_BACK) run dev

backend-start: backend-install ## Start backend normally
	$(NPM_BACK) start

backend-migrate: backend-install ## Run pending migrations
	cd $(BACKEND_DIR) && npx node-pg-migrate up -m migrations

backend-migrate-up: backend-migrate ## Alias for backend-migrate

backend-migrate-down: backend-install ## Rollback one migration
	cd $(BACKEND_DIR) && npx node-pg-migrate down -m migrations -f 1

backend-migrate-create: backend-install ## Create a new timestamped migration: NAME=<desc>
	cd $(BACKEND_DIR) && npx node-pg-migrate create "$(NAME)" -m migrations

# --- Backend Testing with Dockerized Postgres ---
TEST_DB_CONTAINER=pgtest
TEST_DB_URL=postgres://blep:blep@localhost:54329/blep_test

backend-test-db-up: ## Start ephemeral Postgres for backend tests
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for Postgres health..."; \
cid=$$(docker compose -f docker-compose.test.yml ps -q $(TEST_DB_CONTAINER)); \
if [ -z "$$cid" ]; then echo "Container not found"; exit 1; fi; \
for i in $$(seq 1 30); do \
	status=$$(docker inspect -f '{{.State.Health.Status}}' $$cid 2>/dev/null || echo 'starting'); \
	if [ "$$status" = "healthy" ]; then echo " Postgres ready"; break; fi; \
	if [ $$i -eq 30 ]; then echo " Timeout waiting for Postgres (status=$$status)"; exit 1; fi; \
	sleep 1; printf '.'; \
done

backend-test-db-down: ## Stop test Postgres
	docker compose -f docker-compose.test.yml down -v

backend-test: backend-install backend-test-db-up ## Run backend test suite against Docker Postgres
	cd $(BACKEND_DIR) && DATABASE_URL=$(TEST_DB_URL) npx node-pg-migrate up -m migrations && DATABASE_URL=$(TEST_DB_URL) npm test || (code=$$?; $(MAKE) backend-test-db-down; exit $$code)
	$(MAKE) backend-test-db-down

backend-test-watch: backend-install backend-test-db-up ## Run backend tests in watch (leave DB up) CTRL+C then run backend-test-db-down
	cd $(BACKEND_DIR) && DATABASE_URL=$(TEST_DB_URL) npx node-pg-migrate up -m migrations && DATABASE_URL=$(TEST_DB_URL) npm run test:watch

backend-seed: backend-install backend-test-db-up ## Seed the test database with sample data (uses seed script) then leaves DB up
	cd $(BACKEND_DIR) && DATABASE_URL=$(TEST_DB_URL) npm run seed

backend-e2e: backend-install backend-test-db-up ## Run end-to-end tests (migrate, seed, then run e2e spec) with cleanup
	( cd $(BACKEND_DIR) \
		&& DATABASE_URL=$(TEST_DB_URL) npx node-pg-migrate up -m migrations \
		&& DATABASE_URL=$(TEST_DB_URL) npm run seed \
		&& DATABASE_URL=$(TEST_DB_URL) npm run test:e2e ); code=$$?; \
	$(MAKE) backend-test-db-down; exit $$code

# --- Full Docker Stack (frontend + backend + db) ---
STACK_FILE=docker-compose.yml

stack-up: ## Start full stack (no rebuild) in background
	docker compose -f $(STACK_FILE) up -d

stack-up-build: ## Build images then start full stack
	docker compose -f $(STACK_FILE) up -d --build

stack-down: ## Stop and remove stack containers, networks, volumes (persistent DB volume retained by default)
	docker compose -f $(STACK_FILE) down

stack-logs: ## Follow logs for all services
	docker compose -f $(STACK_FILE) logs -f

stack-ps: ## List running stack services
	docker compose -f $(STACK_FILE) ps

# --- Full-stack E2E (browser) using Selenium ---
e2e-install: ## Install e2e test dependencies
	npm --prefix e2e install

e2e-run: e2e-install ## Run e2e tests (expects stack already up on localhost:8080/4000)
	FRONTEND_URL=http://localhost:8080 BACKEND_HEALTH=http://localhost:4000/healthz npm --prefix e2e run test

stack-e2e: ## Build & start stack, run e2e tests, then tear down
	$(MAKE) stack-up-build
	$(MAKE) e2e-run || (code=$$?; $(MAKE) stack-down; exit $$code)
	$(MAKE) stack-down
