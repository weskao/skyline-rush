# Original AI-generated PNG artwork — import manifest

**JPEG conversion update (2026-11-02):** Ten original view PNGs have been converted to JPEG and are genuinely committed under [source-concept-jpeg](source-concept-jpeg/), with the same captured scene dimensions. The lossless PNG source bytes and two original overview PNGs are **not** in GitHub; preserving them is optional now that the user specified JPEG-only source references. This historical PNG checksum table remains for provenance. The other five new tracks have [their own 10 committed JPEGs](stage-2/README.md).

**Integrity manifest only.** The 12 original PNGs listed here are **not committed to this GitHub branch yet**. They are packaged in the ChatGPT-provided `skyline-rush-concept-images-github-ready.zip` archive. This manifest lets the future implementer import exactly the original reference bytes, verify hashes, and add real links without substituting unrelated art.

**Current committed alternatives:** ten individually accessible vector images (`concept-art/<track-id>-ground-view.svg` and `concept-art/<track-id>-aerial-view.svg`), five vector double-view boards, and five distinct point-to-point route schematics. The PNGs inventoried here are visually different source images; these have not been uploaded to GitHub. See [README.md](README.md#ten-standalone-concept-images-five-maps--two-camera-views).

**Confirmed rules:** five new maps are ALL point-to-point (START != FINISH), NO laps. The collage source images are moodboards, not executable layouts; any loop-like infographic line is overridden by the authored one-way route schematics.

| Future repository path (only after import) | Pixel dimensions | SHA-256 |
| --- | ---: | --- |
| `docs/designs/new-tracks/source-concept-png/dune-tempest/concept-view-01.png` | 568x205 | `086e2435188ee0f4001ff2400c0accdf43dbf301e163f245b2611907eb6b5e4a` |
| `docs/designs/new-tracks/source-concept-png/dune-tempest/concept-view-02.png` | 516x205 | `11fbd09aad90e7994ef920eb04a3411ddf4829edb9417c2368c5842a9fa26f14` |
| `docs/designs/new-tracks/source-concept-png/monsoon-ruins/concept-view-01.png` | 568x205 | `fff42c95271960d13828650af7aff7248d67122db721e7cac38711441e807979` |
| `docs/designs/new-tracks/source-concept-png/monsoon-ruins/concept-view-02.png` | 516x205 | `334c791df9c8151bdcb5f69e0b561329e7b43e7b927064e72e6885350675566d` |
| `docs/designs/new-tracks/source-concept-png/overview-01.png` | 1536x1024 | `a01130390100ca3a5888ac718c84950247ae7345844d3613e930b98ad913c471` |
| `docs/designs/new-tracks/source-concept-png/overview-02.png` | 1536x1024 | `34655d6948dd3deea12b8917bd6c21e21e95c9ece0e73bfa107b309b23fe83e7` |
| `docs/designs/new-tracks/source-concept-png/skyfall-archipelago/concept-view-01.png` | 568x204 | `d4d2c059a9b62effefec14d289660f969d384a5116c8f4ecb9313d12d6b31512` |
| `docs/designs/new-tracks/source-concept-png/skyfall-archipelago/concept-view-02.png` | 516x204 | `acab6ca3fb60a4a722bc2395e471cc0af2ede85126d48871979bc89908b8e2de` |
| `docs/designs/new-tracks/source-concept-png/stormline-megacity/concept-view-01.png` | 568x205 | `19d341356785b8667b08ef2ec59eb09e952047443b5eb02738cc2f4fddd4cf7e` |
| `docs/designs/new-tracks/source-concept-png/stormline-megacity/concept-view-02.png` | 516x205 | `99fc8e1a6d5b92e58d6a4befd9c9edde8e5a5616259d54262327a7bdf6c5e2bf` |
| `docs/designs/new-tracks/source-concept-png/volcanic-crown/concept-view-01.png` | 568x205 | `271dad9ab796a3a5c64c9d04db9d5ce1106cf8dcbe30a8225739147a56555a21` |
| `docs/designs/new-tracks/source-concept-png/volcanic-crown/concept-view-02.png` | 516x205 | `f1d079b8ea4b1ed73c44eafdf0e4d85c9aaf6c18f218f19a005be2804319bbc9` |

## Import / verification

After importing the original files from the user-supplied ZIP, confirm their GitHub paths exist and compare the SHA-256 checksum of every PNG to this manifest. Then link the live images from `docs/designs/new-tracks/README.md` and `visual-fidelity.md`. Only mark the PNG upload TODO complete after doing so.

The file `docs/designs/new-tracks/concept-art/<track-id>-point-to-point-storyboard.svg` is **already committed**, visually illustrating two views with open-route START and FINISH; it is **not** the original source PNG.
