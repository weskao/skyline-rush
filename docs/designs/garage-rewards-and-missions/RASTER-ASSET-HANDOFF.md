# 3× Raster Asset Integration Handoff — garage-rewards-and-missions

**Feature branch:** `feature/garage-rewards-and-missions`  
**Status:** `CANDIDATE_ART_EXPORTED / BINARIES_NOT_IN_GIT / RUNTIME_NOT_INTEGRATED / REVIEW_PENDING`  
**Primary existing reference:** [VISUAL-FIDELITY.md](VISUAL-FIDELITY.md) · [Implementation plan](../../superpowers/plans/2026-10-31-garage-rewards-and-missions-plan.md)  
**Image count:** 8 candidates, each with PNG + transparent WebP. Approx. 171.9 KiB for all WebP candidates **if all were shipped** (do not ship unused art).  
**Source archive filename:** `skyline-rush-3x-garage-rewards-and-missions.zip`, generated in the original GPT conversation (NOT a GitHub release or committed file).  
**Expected SHA-256 of that ZIP:** `d526e1570865887924c09909f85d057186477cf189862ae351457847f4754b60`  
**Asset provenance:** Cutouts extracted from AI-generated composite boards with reconstructed alpha and Lanczos upscaling. **No native 3× photorealistic detail is implied**. All art remains visually provisional. The 3× files have transparent alpha channels, but fringe/matte/clipping quality still needs visual review.

## Exact asset names and display sizes

### Generic mission and trophy artwork

| Asset key | Intended raster | CSS display | WebP candidate (not yet in repo) |
| --- | ---: | ---: | --- |
| `mission-race` | 288×288 px | 96×96 CSS px | `mission-race@3x.webp` |
| `mission-time` | 288×288 px | 96×96 CSS px | `mission-time@3x.webp` |
| `mission-drift` | 288×288 px | 96×96 CSS px | `mission-drift@3x.webp` |
| `mission-combo` | 288×288 px | 96×96 CSS px | `mission-combo@3x.webp` |
| `trophy-bronze` | 288×288 px | 96×96 CSS px | `trophy-bronze@3x.webp` |
| `trophy-silver` | 288×288 px | 96×96 CSS px | `trophy-silver@3x.webp` |
| `trophy-gold` | 288×288 px | 96×96 CSS px | `trophy-gold@3x.webp` |
| `trophy-platinum` | 288×288 px | 96×96 CSS px | `trophy-platinum@3x.webp` |

**Production target directory (currently absent):** `public/feature-assets/garage-rewards-and-missions/raster/`. Use optimized WebP by default; retain PNG original with the archived source or add to the repo **only if necessary for a verified rendering fallback**. Existing `public/feature-assets/garage-rewards-and-missions/*.svg` (where present) are verified lightweight fallback icons and must not be deleted.

## When you have this ZIP in your local working environment

1. Read and follow `CLAUDE.md`, the feature plan, and Visual Fidelity Gate. Confirm prerequisites for **runtime integration**; independent art preparation does not waive those gates.
2. Verify archive identity: `shasum -a 256 skyline-rush-3x-garage-rewards-and-missions.zip` must equal the expected SHA-256 above. The source archive contains `garage-rewards-and-missions/<name>@3x.webp` and PNG counterparts.
3. In a clean worktree checked out to **this feature branch**, unzip to a temporary directory and copy only reviewed `*.webp` assets to `public/feature-assets/garage-rewards-and-missions/raster/`:
   ```bash
   set -euo pipefail
   ARCHIVE="skyline-rush-3x-garage-rewards-and-missions.zip"
   EXPECTED="d526e1570865887924c09909f85d057186477cf189862ae351457847f4754b60"
   ACTUAL="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"
   test "$ACTUAL" = "$EXPECTED" || { echo "Unexpected source ZIP content"; exit 1; }
   git fetch origin
   test "$(git branch --show-current)" = "feature/garage-rewards-and-missions" || { echo "Wrong branch"; exit 1; }
   test -z "$(git status --porcelain)" || { echo "Dirty worktree"; exit 1; }
   TMP_DIR="$(mktemp -d)"
   trap 'rm -rf "$TMP_DIR"' EXIT
   unzip -q "$ARCHIVE" -d "$TMP_DIR"
   mkdir -p "public/feature-assets/garage-rewards-and-missions/raster/"
   cp "$TMP_DIR/garage-rewards-and-missions/"*.webp "public/feature-assets/garage-rewards-and-missions/raster/"
   git add "public/feature-assets/garage-rewards-and-missions/raster/"
   git diff --cached --stat
   # Review every image and run relevant test/CI gates BEFORE commit.
   ```
4. On macOS you can inspect actual image pixel dimensions with `sips -g pixelWidth -g pixelHeight "<file>.webp"`; alpha and glow fringes must be evaluated by rendering over both dark and light backgrounds, not merely trusting a filename. Prefer existing SVGs on Low if large raster textures cause unnecessary memory use.
5. Use **1× CSS dimensions** when the 3× image is loaded. The site is deployed under a subpath on GitHub Pages, so **do not** hardcode `/feature-assets/...` as an absolute root URL. Respect Vite's `import.meta.env.BASE_URL`:
   ```ts
   // Example, inside a Vue <script setup lang="ts"> (or in a typed utility)
   const assetUrl = (name: string): string =>
     `${import.meta.env.BASE_URL}feature-assets/garage-rewards-and-missions/raster/${name}@3x.webp`;
   ```
   ```vue
   <!-- Example using a real candidate key; decorative artwork only until reviewed -->
   <img :src="assetUrl('mission-race')" width="96" height="96"
        style="object-fit:contain" alt="" decoding="async" loading="lazy" />
   ```
   For 72px keys use `width="72" height="72"`; only the button *visual study* keys use `width="144" height="52"`. Keep the real `<button>` and translated text as DOM. Never use a screenshot for a whole clickable panel.
6. Write BDD/TDD tests for expected URLs, physical CSS boxes, image-load failure fallback, both languages, safe areas, 390×844 + 844×390 + 1440×900, Low/Medium/High, Reduced Motion, actual hit targets ≥44 CSS px, and VFX Off. Compare approved high-fidelity reference vs real Playwright/WebGL screenshots/video. Review decode, transfer size, GPU memory and frame-time before shipping. **Do not mark the feature TODO complete from files alone.**

## Domain restrictions and current blockers

Do not render payout/claim as successful until actual entitlement + secure settlement are implemented; never bake count/date/amount/localized text into a raster.

**Important:** No PNG/WebP file or live import from this ZIP is claimed to exist in GitHub as of this handoff. This document intentionally makes the exact future import deterministic; it does not pretend GitHub can pull sandbox attachments from a different conversation.
