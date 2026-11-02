---
paths:
  - ".githooks/**"
  - "scripts/release*.sh"
  - "scripts/check-main-merges.sh"
  - "docs/release-process.md"
  - ".github/workflows/**"
---

# Branches, release and back-merge

- `feature/**`, `fix/**` and `refactor/**` branch from `develop` and merge back into `develop`
  (local `--no-ff`, `/merge-into-main` targets `develop` when it exists); CI runs the full gate there.
- **Release:** merge `develop` into `main`, push, wait for green CI on that merge commit, then
  `/release` on `main` — the gate and tag flow are in `docs/release-process.md`.
- **After every release, `main` is merged back into `develop`** so the `docs: release …` commit
  (version bump, release-notes stamp) reaches it; skipping it makes the next release merge conflict.
  `/release` does this last (`scripts/release-back-merge.sh`, pushed without touching any checkout);
  on a conflict or rejected push it leaves `develop` untouched and prints the manual merge — do it then.
- **Hotfix:** branch `hotfix/<name>` from `main`, merge into `main`, then `/release` (which
  back-merges into `develop`).
- **Only `develop` and `hotfix/*` merge into `main`.** `.githooks/main-merge-guard` (run by
  `pre-merge-commit` and `pre-commit`) blocks any other merge on `main`; fast-forwards run no hook,
  so merge with `--no-ff`. CI's `main-merge-source` job (`scripts/check-main-merges.sh`) enforces
  the same rule on every push to `main`.
- Direct pushes cannot be prevented by Markdown; branch rulesets are required for
  server-enforced status protection.
