# Wave 3 — Source-preserving WebP restoration and polishing

## Reason for correction
The earlier e4a73a2 render replaced the original familiar silhouettes with
unrelated icon illustrations. The corrective 454f394 commit reverted all ten
affected paths (eight originals restored; two wallet replacements removed).
The corrected WebP outputs in 6db0b85 now derive their pixels and contours
from the original artwork. No replacement icon is drawn.

## Originals explicitly retained
- Race: black/white checkered flag and flagpole.
- Time: stopwatch, watch face and hand.
- Drift: the existing silver-blue drifting/turning-arrow symbol.
- Combo: the upward cyan arrow.
- Bronze, silver and gold: their original handled trophy cups.
- Platinum: original blue star in a purple medal.
- Coin: original circular gold token with lightning-bolt mark.
- Diamond: original polygonal cyan-blue gemstone with faceted cut.

The disconnected green bar above the old mission exports has been removed.
The existing coin and gem opaque square backgrounds are isolated to the
original shape, not kept as an opaque card.

## Reproducible image pipeline
- scripts/generate-wave3-premium-webp.py opens the original eight archived
  WebPs under docs/designs/3x-asset-library/webp/garage-rewards-and-missions.
- The two original 144px wallet PNGs are loaded via git show from immutable
  commit 438a22a7876bfbfb9d4ffcb851d06c438c849523; the current runtime
  does not contain PNG files or PNG fallbacks.
- Subtle metallic gloss is clipped to the original subject. Rim illumination
  and drop shadows follow the exact existing alpha contour. There are no
  generic decorative disks, new logos or replacement foreground symbols.
- Outputs: eight transparent 288x288 rewards/mission WebPs; two 144x144
  wallet WebPs, all native 3x for the existing 96px/48px UI slots.
- The generator verifies the alpha contour overlap against the original at
  128/255: 80% is required, all ten generated assets measured 100% before
  WebP encoding.
- GitHub Actions renderer: .github/workflows/wave3-premium-webp-art.yml.

## Runtime and acceptance
The existing Wallet, Garage Missions, Source Gallery, Results and Demo screen
image references remain WebP-only, without PNG fallbacks. Existing coin,
diamond, mission and trophy CSS animation layers remain separate from the
WebP files and honor reduced motion and VFX-disabled modes. No entitlement
or demo economy authority is changed.

Full exact-head CI and visual review of the generated images are required
before merging this feature branch to develop. An alpha contour metric does
not certify visual quality or identical detail.
