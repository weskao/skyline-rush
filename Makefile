# Shortcuts for the common skyline-rush commands. Run from the repo root.
NPM := npm
.DEFAULT_GOAL := dev

.PHONY: dev dev-unlocked dev-feature test-unlocked run deploy

dev: node_modules ## `make`: Vite + Vue dev server with hot reload on http://127.0.0.1:5173
	$(NPM) run dev

# Compile with the development-only access implementation. Never produces a distributable build.
dev-unlocked: node_modules ## `make dev-unlocked`: local-only Vite server with all tracks and paints unlocked
	$(NPM) run dev -- --config vite.unlocked.config.js

test-unlocked: dev-unlocked ## Alias: `make test-unlocked` also opens the all-unlocked local dev server

# Fetches origin/feature/<FEATURE> into .claude/worktrees/<FEATURE> without checking it out here.
dev-feature: ## `make dev-feature FEATURE=<name>`: that feature branch, all-unlocked, https://127.0.0.1:5443
	node scripts/dev-feature.mjs

# test:browser builds dist/ first via pretest:browser, so build is not run separately.
run: node_modules ## `make run`: unit tests, production build and Chrome browser tests
	$(NPM) test
	$(NPM) run test:browser

# Requires an authenticated GitHub CLI; CI checks the pushed main branch before publishing.
deploy: ## `make deploy`: trigger CI checks and GitHub Pages deployment of remote main
	gh workflow run ci.yml --ref main

# Installs dependencies on first run and whenever package-lock.json changes; also enables the repo's git hooks.
node_modules: package-lock.json
	$(NPM) install
	@git config core.hooksPath .githooks
	@touch $@
