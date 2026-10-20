# Shortcuts for the common skyline-rush commands. Run from the repo root.
NPM := npm
.DEFAULT_GOAL := dev

.PHONY: dev run deploy

dev: node_modules ## `make`: Vite + Vue dev server with hot reload on http://127.0.0.1:5173
	$(NPM) run dev

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
