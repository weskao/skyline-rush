# Shortcuts for the common skyline-rush commands. Run from the repo root.
NPM := npm
.DEFAULT_GOAL := dev

.PHONY: help dev dev-diag dev-unlocked dev-feature test-unlocked phone phone-diag phone-unlocked perf perf-modes perf-phone run verify deploy stop-old-dev

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

# VITE_DIAG=1 compiles in src/crash-log.ts: a live banner with frame counter, lifecycle and input events plus the
# stored crash log. Production builds never include it (scripts/assert-production-locked.mjs refuses the marker).
dev-diag: stop-old-dev node_modules ## `make dev-diag`: like `make`, with the on-screen diagnostic panel compiled in
	VITE_DIAG=1 $(WITH_EMULATORS) '$(NPM) run dev'

phone-diag: ## `make phone-diag [name]`: like `make phone`, with the on-screen diagnostic panel compiled in
	VITE_DIAG=1 $(MAKE) phone $(if $(DEV_FEATURE_NAME),DEV_FEATURE_NAME=$(DEV_FEATURE_NAME))

# Compile with the development-only access implementation. Never produces a distributable build.
dev-unlocked: stop-old-dev node_modules ## `make dev-unlocked`: local-only Vite server with all tracks and paints unlocked
	$(WITH_EMULATORS) '$(NPM) run dev -- --config vite.unlocked.config.js'

test-unlocked: dev-unlocked ## Alias: `make test-unlocked` also opens the all-unlocked local dev server

# Same menu and flags as the personal /phone-dev skill. Serves the normal locked config with no emulators.
# `make phone <name>` serves that branch (or feature/<name>) from its worktree;
# `make phone off` stops every server phone-dev started (like `/phone-dev off`), so a branch named `off` can't be served.
PHONE_DEV := $(HOME)/.claude/skills/phone-dev/scripts/phone_dev.py
phone: node_modules ## `make phone [name|off]`: menu to start, check or stop a phone dev server; `off` stops them all
	@test -f "$(PHONE_DEV)" || { echo "make phone needs the phone-dev skill at $(PHONE_DEV)"; exit 1; }
	@python3 "$(PHONE_DEV)" $(if $(filter off,$(DEV_FEATURE_NAME)),--off,--interactive $(if $(DEV_FEATURE_NAME),--branch $(DEV_FEATURE_NAME)) $(PHONE_VITE_ARGS))

# The unlocked config binds 127.0.0.1 so `make dev-unlocked` stays Mac-only; phone-dev's own `--host 0.0.0.0` CLI
# flag overrides it, so this is the only phone-reachable all-unlocked server. Still a dev server: never a build.
phone-unlocked: ## `make phone-unlocked [name]`: like `make phone`, with all tracks and paints unlocked
	$(MAKE) phone PHONE_VITE_ARGS="-- --config vite.unlocked.config.js" $(if $(DEV_FEATURE_NAME),DEV_FEATURE_NAME=$(DEV_FEATURE_NAME))

# Frame times of production builds, read from the in-game `?perf` strip. BASE=<git ref> (e.g. main) adds an A/B
# baseline built in .claude/worktrees/perf-<sha>. Desktop throttles Chrome's CPU; phone mode asks like `make phone`
# (version, Tailscale/Wi-Fi, Telegram) for anything not passed and logs Android temperatures.
PERF_ARGS = $(if $(BASE),--base $(BASE)) $(if $(RATE),--rate $(RATE)) $(if $(ROUNDS),--rounds $(ROUNDS)) $(if $(RACE_SECONDS),--seconds $(RACE_SECONDS)) $(if $(VIA),--via $(VIA)) $(if $(TG),--tg $(TG)) $(if $(VIEWPORT),--viewport $(VIEWPORT))
perf: node_modules ## `make perf [BASE=main] [RATE=6] [ROUNDS=3] [VIEWPORT=desktop]`: p50/p95/fps of a race in CPU-throttled Chrome
	$(NPM) run build
	node scripts/perf.mjs desktop $(PERF_ARGS)

# Scenario frame times for new content vs Classic (dev server, themed hazards loaded in-page); JSON in artifacts/perf-modes/.
perf-modes: node_modules ## `make perf-modes [RATE=6] [ROUNDS=3] [VIEWPORT=desktop]`: p50/p95, draw calls, triangles: Classic vs themes, Obstacle Run, Endless
	$(NPM) run build
	PERF_MODES=1 RATE=$(or $(RATE),6) ROUNDS=$(or $(ROUNDS),3) $(if $(RACE_SECONDS),RACE_SECONDS=$(RACE_SECONDS)) $(if $(VIEWPORT),VIEWPORT=$(VIEWPORT)) npx playwright test tests/perf-modes-browser.spec.js --reporter=line

perf-phone: node_modules ## `make perf-phone [BASE=main] [VIA=tailscale|wifi|auto] [TG=0]`: like `make phone` for ?perf builds, plus phone temperatures
	$(NPM) run build
	node scripts/perf.mjs phone $(PERF_ARGS)

# Fetches origin/feature/<name> into .claude/worktrees/<name> without checking it out here.
# The branch name is an extra goal; an empty rule stops make from requiring a file by that name.
dev-feature: ## `make dev-feature <name>`: that feature branch, all-unlocked, https://127.0.0.1:5443
	node scripts/dev-feature.mjs $(filter-out $@,$(MAKECMDGOALS))

DEV_FEATURE_ARGS := $(filter-out dev-feature phone phone-diag phone-unlocked,$(MAKECMDGOALS))
DEV_FEATURE_NAME := $(filter-out dev dev-diag dev-unlocked test-unlocked run deploy node_modules,$(DEV_FEATURE_ARGS))
ifneq ($(filter dev-feature phone phone-diag phone-unlocked,$(MAKECMDGOALS)),)
ifneq ($(DEV_FEATURE_NAME),)
$(eval $(DEV_FEATURE_NAME):;@:)
endif
endif

# test:browser builds dist/ first via pretest:browser, so build is not run separately.
run: node_modules ## `make run`: unit tests, production build and Chrome browser tests
	$(NPM) test
	$(NPM) run test:browser

# The complete local merge-readiness gate: default browser tests already build the locked
# production bundle; the authored World Tour fixture uses its own Playwright config.
# Manual real-game/WebGL evidence and exact-commit CI still need separate review.
verify: node_modules ## `make verify`: type checks, units, production build, browser and World Tour suites
	$(NPM) run typecheck
	$(NPM) test
	$(NPM) run test:browser
	npx playwright test --config=playwright.world-tour.config.js

# Lists every target that carries a `## description`.
help: ## `make help`: list these commands
	@awk -F':.*## ' '/^[a-z-]+:.*## /{printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Requires an authenticated GitHub CLI; CI checks the pushed main branch before publishing.
deploy: ## `make deploy`: trigger CI checks and GitHub Pages deployment of remote main
	gh workflow run ci.yml --ref main

# Installs dependencies on first run and whenever package-lock.json changes; also enables the repo's git hooks.
node_modules: package-lock.json
	$(NPM) install
	@git config core.hooksPath .githooks
	@touch $@
