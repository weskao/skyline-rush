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

# Needs `npx netlify-cli login` once per machine; the site link lives in .netlify/state.json (git-ignored).
deploy: run ## `make deploy`: run the checks, then deploy dist/ to Netlify production
	npx --yes netlify-cli deploy --prod --no-build --dir=$(APP)/dist --message "local deploy $$(git describe --tags --always)"
	curl -fsS -o /dev/null https://skyline-rush.netlify.app/

# Installs dependencies on first run and whenever package-lock.json changes.
$(APP)/node_modules: $(APP)/package-lock.json
	$(NPM) install
	@touch $@
