# Stormline Megacity — Stage 1 homepage teaser art handoff

> **Status (2026-11-03): preview rendered, NOT yet imported to GitHub.** The exact JPEG binary was generated and visually inspected in the ChatGPT conversation, but the available GitHub write connector cannot consume the generated container file as a binary upload. Do not treat the target path below as existing or deployed.

## Scope, provenance and references

- Repository: `weskao/skyline-rush`.
- Art branch: `feature/epic-home-art-stormline-megacity` (existing branch; no merges).
- Starting source HEAD: `f5c411d98d48a1164894dbe3b927b2cc6c60257c`.
- **Ground source JPEG (read and visually inspected):** `docs/designs/new-tracks/source-concept-jpeg/stormline-megacity/concept-view-01.jpg`, blob SHA `f3204ba86594ffe11a8cca36cb226fa6d4ba14d3`. Main references: rain-slick street, hero racing vehicle, cyan-magenta road edges, tall nighttime city.
- **Flight / alternate source JPEG (read and visually inspected):** `docs/designs/new-tracks/source-concept-jpeg/stormline-megacity/concept-view-02.jpg`, blob SHA `ebe356caa257f68a57c814e58bc2517b92906752`. Main references: sharply elevated cyan/magenta expressway above lower ground route, stacked overpasses and urban canyon.
- **Course schematic:** `docs/designs/new-tracks/route-schematics/stormline-megacity.svg`. Simplified design guidance, **not** pixel-accurate topology.
- Consulted `AGENTS.md`, `CLAUDE.md`, `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, and `docs/designs/new-tracks/README.md`.
- Course contract: Stage 1 **point-to-point**, distinct START and FINISH; a safe continuous lower route plus a higher optional branch that rejoins rather than circular laps. Image depiction cannot validate a working CourseGraph.

## Art direction

- **Palette:** midnight blue `#080F24`, blue-black asphalt `#11182A`, violet indigo `#402969`, cyan electrics `#2CC9EA`, and hot-magenta guardrail `#D13AE1`.
- **Environment landmarks:** high-density supertall skyline with vertical light seams; elevated expressway ribbon above the primary street; identifiable upward connector ramp; dark aerospace racing vehicle toward the compositional centre; wet road with thin reflected neon highlights.
- **Ground view alignment:** visible road-level tarmac, car silhouette, kerb and perspective lane markings.
- **Aerial / flight alignment:** alternate elevated ribbon is distinctly higher than the street, with ramp rising and joining the overpass and visible support columns; the exact route is illustrative only.
- **Weather / particles:** discreet diagonal fine rain, distant atmospheric haze, narrow reflective water streaks and faint lightning; sharply defined road edges and low bloom, no motion blur over turns.
- **Negative space:** approximately the left third remains low-contrast for existing homepage labels. Primary interchange/car/road live near centre/right.
- **Mobile crop:** a centre crop at a 390:844 aspect ratio was rendered/inspected (source image x=1270–1802). It retains the vehicle, layered road and towers. This is an art crop inspection only; no real homepage browser, text-overlay or device acceptance.
- **Text policy:** no words, branding, watermark, route labels or mocked-up UI baked into the image.

## Actual created asset (local handoff, not GitHub)

| Item | Verified value |
| --- | --- |
| Intended repository path | `public/track-teasers/stormline-megacity.jpg` |
| File status on GitHub | **NOT UPLOADED; do not link the target as an existing blob** |
| Native rendering dimensions | **3072 × 1152 px** |
| JPEG dimensions | **3072 × 1152 px (no resize / upscaling)** |
| Colour | RGB, embedded sRGB ICC profile (588 bytes) |
| Final exact file size | **748934 bytes** |
| Final SHA-256 | `a9930f33a55b5e33531c898d891cc35a124d1f4795df924606fccd8c432963b0` |
| Source of pixels | Original procedural native-resolution digital illustration, seeded raster geometry; NOT a photo-real AI image |
| GitHub JPEG commit SHA | **N/A — no JPEG commit occurred** |
| Download | Generated ChatGPT attachment `stormline-megacity.jpg` in this handoff conversation |

## Deviations, blockers and remaining gates

1. The image generation service did not accept GitHub-sourced JPEGs as editable source images. Fallback: a **native-resolution procedural illustration**, not a faithful photorealistic AI reconstruction. This visibly simplifies buildings, car body, signage and skyway materials. High-fidelity visual parity is **NOT APPROVED**.
2. The GitHub connector accepts base64 blob content but has no direct way in this session to transfer the generated local JPEG bytes into that input. **Binary GitHub import is blocked.** Upload the exact provided JPEG manually to the specified path on this branch; verify the GitHub blob and SHA-256 afterward.
3. No edits were made to shared UI, TypeScript, CSS, localization, tests, Stage 2, other maps, `develop` or `main`. No PR, deployment, force-push or merge.
4. No real browser/WebGL screenshot, 3× runtime texture check, automated tests, `make verify`, full CI or physical-device visual acceptance was run. This is only concept teaser artwork, not a playable track or approved in-game preview.
5. After an actual JPEG commit, update this note with its commit SHA / GitHub blob path and compare real home-page landscape/portrait screenshots with the original two source JPEGs. Keep the visual gate PENDING until inspected.

