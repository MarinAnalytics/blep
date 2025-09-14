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
NPM := npm --prefix $(FRONTEND_DIR)

.PHONY: help frontend-install frontend-up frontend-build frontend-preview frontend-test frontend-test-watch clean-dist deploy-gh-pages

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
