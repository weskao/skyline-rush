# Shortcuts for the common web-app commands. Run from the repo root.
# APP: directory holding package.json (`.` when it sits at the repo root).
# RUN_SCRIPTS: package.json scripts `make run` runs in order; it stops at the first failure.
APP := .
# test:browser builds dist/ first via pretest:browser, so build is not listed separately.
RUN_SCRIPTS := test test:browser
NPM := npm --prefix $(APP)
.DEFAULT_GOAL := dev

.PHONY: dev run deploy

dev: $(APP)/node_modules ## `make`: Vite dev server with hot reload on http://localhost:5173
	$(NPM) run dev

run: $(APP)/node_modules ## `make run`: type-check, build and run the project's checks
	@set -e; for script in $(RUN_SCRIPTS); do $(NPM) run "$$script"; done

# Requires an authenticated GitHub CLI; CI checks the pushed main branch before publishing.
deploy: ## `make deploy`: trigger CI checks and GitHub Pages deployment of remote main
	gh workflow run ci.yml --ref main

# Installs dependencies on first run and whenever package-lock.json changes.
$(APP)/node_modules: $(APP)/package-lock.json
	$(NPM) install
	@touch $@
