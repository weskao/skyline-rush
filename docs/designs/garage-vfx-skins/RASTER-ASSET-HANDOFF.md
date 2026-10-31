# 3× Raster Asset Integration Handoff — garage-vfx-skins

**Feature branch:** `feature/garage-vfx-skins`  
**Status:** `CANDIDATE_ART_EXPORTED / BINARIES_NOT_IN_GIT / RUNTIME_NOT_INTEGRATED / REVIEW_PENDING`  
**Primary existing reference:** [VISUAL-FIDELITY.md](VISUAL-FIDELITY.md) · [Implementation plan](../../superpowers/plans/2026-10-31-garage-vfx-skins-plan.md)  
**Image count:** 27 candidates, each with PNG + transparent WebP. Approx. 517.8 KiB for all WebP candidates **if all were shipped** (do not ship unused art).  
**Source archive filename:** `skyline-rush-3x-garage-vfx-skins.zip`, generated in the original GPT conversation (NOT a GitHub release or committed file).  
**Expected SHA-256 of that ZIP:** `4112ef97f6ec8d0860220a93f95a5b19f77b2a05cc36c1eebf5385d457d73414`  
**Asset provenance:** Cutouts extracted from AI-generated composite boards with reconstructed alpha and Lanczos upscaling. **No native 3× photorealistic detail is implied**. All art remains visually provisional. The 3× files have transparent alpha channels, but fringe/matte/clipping quality still needs visual review.

## Exact asset names and display sizes

### 3D cosmetic candidate images

| Asset key | Intended raster | CSS display | WebP candidate (not yet in repo) |
| --- | ---: | ---: | --- |
| `thruster-basic` | 288×288 px | 96×96 CSS px | `thruster-basic@3x.webp` |
| `thruster-ion` | 288×288 px | 96×96 CSS px | `thruster-ion@3x.webp` |
| `thruster-plasma` | 288×288 px | 96×96 CSS px | `thruster-plasma@3x.webp` |
| `thruster-void` | 288×288 px | 96×96 CSS px | `thruster-void@3x.webp` |
| `trail-cyan` | 288×288 px | 96×96 CSS px | `trail-cyan@3x.webp` |
| `trail-purple` | 288×288 px | 96×96 CSS px | `trail-purple@3x.webp` |
| `trail-gold` | 288×288 px | 96×96 CSS px | `trail-gold@3x.webp` |
| `trail-red` | 288×288 px | 96×96 CSS px | `trail-red@3x.webp` |
| `flare-blue` | 288×288 px | 96×96 CSS px | `flare-blue@3x.webp` |
| `flare-purple` | 288×288 px | 96×96 CSS px | `flare-purple@3x.webp` |
| `flare-gold` | 288×288 px | 96×96 CSS px | `flare-gold@3x.webp` |
| `flare-red` | 288×288 px | 96×96 CSS px | `flare-red@3x.webp` |
| `flare-cyan` | 288×288 px | 96×96 CSS px | `flare-cyan@3x.webp` |
| `flare-magenta` | 288×288 px | 96×96 CSS px | `flare-magenta@3x.webp` |
| `flare-white` | 288×288 px | 96×96 CSS px | `flare-white@3x.webp` |
| `flare-ring` | 288×288 px | 96×96 CSS px | `flare-ring@3x.webp` |

### Badge/Rarity overlays (decorative only)

| Asset key | Intended raster | CSS display | WebP candidate (not yet in repo) |
| --- | ---: | ---: | --- |
| `badge-equipped` | 216×216 px | 72×72 CSS px | `badge-equipped@3x.webp` |
| `badge-locked` | 216×216 px | 72×72 CSS px | `badge-locked@3x.webp` |
| `badge-trial` | 216×216 px | 72×72 CSS px | `badge-trial@3x.webp` |
| `badge-new` | 216×216 px | 72×72 CSS px | `badge-new@3x.webp` |
| `badge-favorite` | 216×216 px | 72×72 CSS px | `badge-favorite@3x.webp` |
| `badge-limited` | 216×216 px | 72×72 CSS px | `badge-limited@3x.webp` |
| `rarity-common` | 216×216 px | 72×72 CSS px | `rarity-common@3x.webp` |
| `rarity-rare` | 216×216 px | 72×72 CSS px | `rarity-rare@3x.webp` |
| `rarity-epic` | 216×216 px | 72×72 CSS px | `rarity-epic@3x.webp` |
| `rarity-legendary` | 216×216 px | 72×72 CSS px | `rarity-legendary@3x.webp` |
| `rarity-mythic` | 216×216 px | 72×72 CSS px | `rarity-mythic@3x.webp` |

**Production target directory (currently absent):** `public/feature-assets/garage-vfx-skins/raster/`. Use optimized WebP by default; retain PNG original with the archived source or add to the repo **only if necessary for a verified rendering fallback**. Existing `public/feature-assets/garage-vfx-skins/*.svg` (where present) are verified lightweight fallback icons and must not be deleted.

## When you have this ZIP in your local working environment

1. Read and follow `CLAUDE.md`, the feature plan, and Visual Fidelity Gate. Confirm prerequisites for **runtime integration**; independent art preparation does not waive those gates.
2. Verify archive identity: `shasum -a 256 skyline-rush-3x-garage-vfx-skins.zip` must equal the expected SHA-256 above. The source archive contains `garage-vfx-skins/<name>@3x.webp` and PNG counterparts.
3. In a clean worktree checked out to **this feature branch**, unzip to a temporary directory and copy only reviewed `*.webp` assets to `public/feature-assets/garage-vfx-skins/raster/`:
   ```bash
   set -euo pipefail
   ARCHIVE="skyline-rush-3x-garage-vfx-skins.zip"
   EXPECTED="4112ef97f6ec8d0860220a93f95a5b19f77b2a05cc36c1eebf5385d457d73414"
   ACTUAL="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"
   test "$ACTUAL" = "$EXPECTED" || { echo "Unexpected source ZIP content"; exit 1; }
   git fetch origin
   test "$(git branch --show-current)" = "feature/garage-vfx-skins" || { echo "Wrong branch"; exit 1; }
   test -z "$(git status --porcelain)" || { echo "Dirty worktree"; exit 1; }
   TMP_DIR="$(mktemp -d)"
   trap 'rm -rf "$TMP_DIR"' EXIT
   unzip -q "$ARCHIVE" -d "$TMP_DIR"
   mkdir -p "public/feature-assets/garage-vfx-skins/raster/"
   cp "$TMP_DIR/garage-vfx-skins/"*.webp "public/feature-assets/garage-vfx-skins/raster/"
   git add "public/feature-assets/garage-vfx-skins/raster/"
   git diff --cached --stat
   # Review every image and run relevant test/CI gates BEFORE commit.
   ```
4. On macOS you can inspect actual image pixel dimensions with `sips -g pixelWidth -g pixelHeight "<file>.webp"`; alpha and glow fringes must be evaluated by rendering over both dark and light backgrounds, not merely trusting a filename. Prefer existing SVGs on Low if large raster textures cause unnecessary memory use.
5. Use **1× CSS dimensions** when the 3× image is loaded. The site is deployed under a subpath on GitHub Pages, so **do not** hardcode `/feature-assets/...` as an absolute root URL. Respect Vite's `import.meta.env.BASE_URL`:
   ```ts
   // Example, inside a Vue <script setup lang="ts"> (or in a typed utility)
   const assetUrl = (name: string): string =>
     `${import.meta.env.BASE_URL}feature-assets/garage-vfx-skins/raster/${name}@3x.webp`;
   ```
   ```vue
   <!-- Example using a real candidate key; decorative artwork only until reviewed -->
   <img :src="assetUrl('thruster-ion')" width="96" height="96"
        style="object-fit:contain" alt="" decoding="async" loading="lazy" />
   ```
   For 72px keys use `width="72" height="72"`; only the button *visual study* keys use `width="144" height="52"`. Keep the real `<button>` and translated text as DOM. Never use a screenshot for a whole clickable panel.
6. Write BDD/TDD tests for expected URLs, physical CSS boxes, image-load failure fallback, both languages, safe areas, 390×844 + 844×390 + 1440×900, Low/Medium/High, Reduced Motion, actual hit targets ≥44 CSS px, and VFX Off. Compare approved high-fidelity reference vs real Playwright/WebGL screenshots/video. Review decode, transfer size, GPU memory and frame-time before shipping. **Do not mark the feature TODO complete from files alone.**

## Domain restrictions and current blockers

Do not grant ownership from badge artwork. Trial/Owned/Locked and rarity values must come from typed game state; sprites are concept candidates, not animated Three.js VFX. Wait for Garage Studio and high-speed renderer gates for actual preview/equip/VFX.

**Important:** No PNG/WebP file or live import from this ZIP is claimed to exist in GitHub as of this handoff. This document intentionally makes the exact future import deterministic; it does not pretend GitHub can pull sandbox attachments from a different conversation.
