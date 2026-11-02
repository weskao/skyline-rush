# Dune Tempest / 沙暴裂谷 — Home Page Teaser Art Note

**Status: BLOCKED — source references inspected, but no new JPEG was generated.**
**Scope:** Stage 1 point-to-point track only. This is a design/handoff note, NOT real Three.js/WebGL evidence or a gameplay implementation.

## Verified references

- **Ground:** [concept-view-01.jpg](../source-concept-jpeg/dune-tempest/concept-view-01.jpg) — native 568 × 205, **27,615 bytes**, blob `eb4625c463d0084af952764b0d1016a7c594f0dd`.
- **Flight / alternate route:** [concept-view-02.jpg](../source-concept-jpeg/dune-tempest/concept-view-02.jpg) — native 516 × 205, **32,641 bytes**, blob `a35fcb23c5afa18132b7171cf2f46f4c81ea3b6b`.
- **Route sketch:** [dune-tempest.svg](../route-schematics/dune-tempest.svg) — course design guidance, not pixel-accurate topology.
- **Acceptance:** [visual-acceptance-gate.md](../visual-acceptance-gate.md); [visual-fidelity.md](../visual-fidelity.md).
- **Branch baseline commit:** `f5c411d98d48a1164894dbe3b927b2cc6c60257c` (`feature/epic-home-art-dune-tempest`). The final art-note commit SHA is available in this file's Git history; a file cannot embed its own final commit SHA without changing it.

## Scene and image direction

- **Production target:** fresh native high-resolution landscape JPEG, at least **2400 × 900** pixels, **sRGB**, optimized file size. Never upscale the 568 × 205 or 516 × 205 references and call that native detail. No embedded text, logos, watermarks or fake UI.
- **Palette:** golden sunset `#F7B05F`, dune ochre `#D99445`, sunlit terracotta cliff `#A65535`, deep shadow `#593324`, dusty mauve `#A47578`, pale peach sky `#F6D1A7`.
- **Landmarks / ground source:** retain distant monumental circular **stone arches** and ancient canyon ruins, massive layered rock formations, rolling orange sand and low evening sunlight. Build a **wide natural, unpaved sand road** through canyon terrain with **two prominent hairpins** including a visible large U-turn. Avoid straight asphalt, white lane markings, continuous urban guardrails or a closed race circuit. Any circular stone arch is *scenery*, never a loop road.
- **Flight / branch source:** retain canyon depth, spectacular cliffs and separate height levels. Introduce one **clearly separated high-altitude jump/flight shortcut over a broken cliff**, a **wide visible safe landing zone**, and a **visible merge** back to the continuous one-way ground route. Ancient elevated ruins/bridges may establish scale but must not replace the broad natural main road.
- **Sky / weather:** glowing orange-gold sunset, distant advancing sand wall, layered atmospheric haze, fine dust drifting with the wind. Dust must **not hide** upcoming hairpins, jump lip, landing zone or the onward ground route.
- **Homepage composition / crop:** keep approximately the **left third quieter and lower-contrast** for homepage typography. Put sweeping road and iconic formations centre/right. Inspect the resulting artwork for 1440 × 900 desktop and centre-biased 390 × 844 / 320 × 740 phone crops. These crop checks are still pending.
- **Race truth:** open **point-to-point** route with distinct START and FINISH. S-bends and hairpin turns are allowed; no laps. Maintain an uninterrupted ground option, elevated fork and rejoin. No labels are drawn on the artwork.

## Deliverable verification

| Item | Real result |
| --- | --- |
| Intended JPEG | `public/track-teasers/dune-tempest.jpg` — **not created or uploaded** |
| Final JPEG native dimensions | **N/A — no generated JPEG** |
| Final JPEG byte count | **N/A — no generated JPEG** |
| JPEG sRGB, crop, visual QA | **NOT RUN** |
| WebGL race screenshots, gameplay tests | **OUT OF SCOPE** for this image-only assignment |

**Blocker:** Both original GitHub JPEGs were read and visually inspected, but the image generator could not use repository-hosted images as reference attachments and returned no generated image. A user-supplied copy of the two JPGs as chat image attachments is required for that image workflow. No attempt was made to substitute a synthetic upscaled image or to misreport a GitHub image commit.

**Intentional changes to the sources for the future composition:** keep the rock-arch silhouette and elevated-canyon identity; replace their loop-looking/paved-looking route imagery with a legible wide, open one-way sand road and clearly separated jump/landing/merge.

**Next step:** generate the native high-resolution composite using the two uploaded refs, verify actual dimensions and bytes, commit **only** `public/track-teasers/dune-tempest.jpg` and update this note on the assigned feature branch; no PR, merge, force-push, deployment or edits to other maps/shared code.

---

## Stage 1 — Native Three.js homepage environment (2026-11-03)

**Scope change:** The historical JPEG-generation BLOCKED status above is preserved as image-work provenance; the priority is now a **live, mesh-based 3D showroom environment**, independent of that JPEG deliverable. This entry does not claim a captured WebGL frame or full playable track.

### Authored environment

- Code: `src/upcoming-scenes/dune-tempest.ts`; focused contract: `tests/upcoming-dune-tempest-scene.test.js`.
- Entry point: `createUpcomingEnvironment(scene: THREE.Scene)` returns `group`, deterministic `update(timeSeconds, quality, reducedMotion)`, and idempotent `dispose()`. No cars, camera, renderer, RAF, UI, storage or game state.
- World coordinates: forward `-Z`, right `+X`, up `+Y`; road under the future shared car at approximately `(0, 0, 0)`, reaching from `Z +54` to `Z -196`. This is a short **non-playable** homepage slice, not the 13–16 km Stage 1 race.
- **Ground:** a real indexed triangle-strip sandy road (14 m nominal width) plus 20 m sand shoulder; a 56×56 sampled 3D canyon/dune height field with an unbroken road-clearance trough, no canyon cut directly beneath the ground road, eroded highlands, deep ravine and color strata; two distinct hairpin approach/return curves and sculpted outer-corner stone markers.
- **Three main reference anchors:** the towering segmented-color *monumental stone ring* at `(42, 27, -109)`, *distant stone ring* at `(6, 19, -222)`, and *ancient cliff ruins* around `(103, 20, -183)`; additional escarpments, stone piers and sunset sphere provide spatial silhouettes.
- **Ground/aerial split:** an actual rising sand/stone takeoff ribbon west of the canyon, a separate raised canyon-crossing flight corridor reaching approximately 23 m above the lower road, and a 15 m wide descending landing ribbon near `(8, 0, -161)`, with a toroidal landmark beacon. This is visual route geometry only; GPS/race checkpoint logic deliberately absent.
- **Weather & light:** sunset-facing directional and hemispheric lights, peach sky, depth fog, four subtle dust wisps and a deterministic 160-point windblown sand field. Dust density is kept away from the central driving line; no fullscreen storm image or texture plane is used.
- **Quality / access:** particle draw count capped at Low 28 / Medium 86 / High 160; Low hides translucent dust ribbons; Reduced Motion freezes particle positions and hides the moving ribbons. No per-frame mesh rebuilding, dynamic light allocation, new canvas, shaders or network downloads.
- **Lifecycle:** all geometries and materials owned by the module are disposed once and the module restores the original scene fog when it still owns the active fog.

### Reference match and known deviations

| Aspect | Native geometry interpretation | Acceptance |
| --- | --- | --- |
| `concept-view-01.jpg` | Center/right giant stone ring, second ring in depth, warm canyon-sand palette and advancing windblown dust | **PENDING real WebGL 1440×900 / 390×844 comparisons** |
| `concept-view-02.jpg` | Broad double-bend sand path, separated high canyon crossing, descending landing and ancient viaduct pillars | **PENDING true ground + aerial camera captures** |
| `route-schematics/dune-tempest.svg` | Open non-looping showcase road with alternative airborne leg; not a pixel-accurate course graph | **Visual only, no race implementation** |
| Distinctive material/detail | Procedural rock/ruins are simplified relative to the painterly JPEG masonry, flying vehicle, motion blur and large storm wall | **Known fidelity deviations; requires interactive review** |

### Verification and handoff

- Tests authored for real mesh/landmark presence, road extremes and car anchor, separate raised and landing geometry, deterministic high/low/reduced animation, single-dispose resources and scene fog restoration.
- **Pending:** confirmed local RED→GREEN test output, `npm test`, TypeScript typecheck, production build, browser/mobile screenshots, two time-separated live WebGL captures, asset/draw-call benchmark and exact-HEAD GitHub Actions quality-gate. Do not mark these PASS merely from code or a queued CI job.
- The owning integration chat must import this module into its existing shared renderer and provide shared car/hover/jet/rival/camera, visually validate against both references, and keep the future track unplayable.
- Existing optional `public/track-teasers/dune-tempest.jpg` is not supplied or substituted: the new 3D environment does not depend on it. Historical image-generation limitation above still applies to the separate thumbnail task.
