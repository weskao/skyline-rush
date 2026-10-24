# Shortcuts for the common skyline-rush commands. Run from the repo root.
NPM := npm
.DEFAULT_GOAL := dev

.PHONY: dev dev-unlocked dev-feature test-unlocked run deploy stop-old-dev

# Dev servers run inside local Auth/Firestore emulators: Google sign-in uses fake accounts and never
# touches production saves. VITE_FIREBASE_EMULATOR points the page at them; Ctrl+C stops both.
# firebase-tools needs Java 21+, which need not be the JDK first on PATH (Android tooling often pins 17).
JAVA21_HOME := $(shell /usr/libexec/java_home -v 21+ 2>/dev/null)
WITH_EMULATORS := $(if $(JAVA21_HOME),PATH="$(JAVA21_HOME)/bin:$$PATH" )VITE_FIREBASE_EMULATOR=1 npx -y firebase-tools@15.34.1 emulators:exec --project skyline-rush-weskao --only auth,firestore

# A second emulator run dies on port 9099 ("port taken"), so stop the earlier run first. Its
# emulators:exec process and every child (Vite would be orphaned otherwise) are stopped, then ports re-checked.
stop-old-dev:
	@pid=$$(lsof -nP -tiTCP:9099 -sTCP:LISTEN 2>/dev/null | head -1); \
	if [ -n "$$pid" ]; then \
	  echo "Stopping earlier dev run (pid $$pid, started $$(ps -o etime= -p $$pid | xargs) ago)"; \
	  all=$$pid; q=$$pid; \
	  while [ -n "$$q" ]; do q=$$(for p in $$q; do pgrep -P $$p; done); all="$$all $$q"; done; \
	  kill $$all; \
	  for i in $$(seq 30); do \
	    [ -z "$$(lsof -nP -iTCP:9099 -iTCP:8080 -sTCP:LISTEN 2>/dev/null)" ] && exit 0; sleep 0.5; \
	  done; \
	  echo "Ports 9099/8080 still busy after 15 s; stop the old run by hand"; exit 1; fi

dev: stop-old-dev node_modules ## `make`: Vite + Vue dev server with hot reload and Firebase emulators on http://127.0.0.1:5173
	$(WITH_EMULATORS) '$(NPM) run dev'

# Compile with the development-only access implementation. Never produces a distributable build.
dev-unlocked: stop-old-dev node_modules ## `make dev-unlocked`: local-only Vite server with all tracks and paints unlocked
	$(WITH_EMULATORS) '$(NPM) run dev -- --config vite.unlocked.config.js'

test-unlocked: dev-unlocked ## Alias: `make test-unlocked` also opens the all-unlocked local dev server

# Fetches origin/feature/<name> into .claude/worktrees/<name> without checking it out here.
# The branch name is an extra goal; an empty rule stops make from requiring a file by that name.
dev-feature: ## `make dev-feature <name>`: that feature branch, all-unlocked, https://127.0.0.1:5443
	node scripts/dev-feature.mjs $(filter-out $@,$(MAKECMDGOALS))

DEV_FEATURE_ARGS := $(filter-out dev-feature,$(MAKECMDGOALS))
DEV_FEATURE_NAME := $(filter-out dev dev-unlocked test-unlocked run deploy node_modules,$(DEV_FEATURE_ARGS))
ifneq ($(filter dev-feature,$(MAKECMDGOALS)),)
ifneq ($(DEV_FEATURE_NAME),)
$(eval $(DEV_FEATURE_NAME):;@:)
endif
endif

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
