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
