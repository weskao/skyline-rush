"""Cherry tree: the shared, parametric street tree (.claude/rules/prop-reuse.md).

Knobs (defaults rebuild the shipped `cherry_tree` node unchanged):
  height    vertical scale of the whole tree (1.0 = about 6.4 m)
  crown     horizontal scale of boughs, twigs and blossom (1.0 = about 6.4 m across)
  groups    blossom groups drawn, the first n of BLOSSOM (1..9): fewer reads sparser
  clusters  clusters each group breaks into on LOD 0 (>= 1)
  sprays    loose sprays at the bough tips on LOD 0, the first n of SPRAYS (0..6)
Variant nodes: none yet; vary per instance at placement first (yaw, scale, tint), rule item 3.
Used by: Neon Downtown (assets-src/neon-city, `cherry_tree`).

Takes the builder's kit `k` (assets-src/neon-city/build/kit.py: tube, prism, puff) with the cells "bark" and
"blossom". Blender axes: z up, the trunk on the pivot.
"""
import math

# Blossom groups (centre, radii) over the boughs: LOD 1 draws each as one mass, LOD 0 breaks it into clusters
# with gaps between them, so the crown reads as sprays on branches rather than one opaque cloud (the kit has no alpha).
BLOSSOM = (((2.15, -0.95, 4.65), (1.0, 0.85, 0.62)), ((-2.1, 1.0, 4.55), (1.0, 0.85, 0.62)),
           ((0.5, -1.5, 5.1), (0.95, 0.8, 0.6)), ((-0.3, 1.45, 5.2), (0.95, 0.8, 0.6)),
           ((0.2, 0.0, 5.65), (1.15, 1.05, 0.65)), ((1.5, -1.45, 4.2), (0.75, 0.65, 0.5)),
           ((-1.45, 1.5, 4.2), (0.75, 0.65, 0.5)), ((1.35, 0.65, 5.0), (0.9, 0.8, 0.58)),
           ((-1.3, -0.7, 5.05), (0.9, 0.8, 0.58)))
FORK = (0.16, 0.05, 2.3)
BOUGHS = (((1.0, -0.35, 3.2), (1.9, -0.8, 4.0), (2.35, -1.05, 4.5)), ((-0.8, 0.45, 3.15), (-1.8, 0.85, 3.95), (-2.25, 1.05, 4.4)),
          ((0.35, -0.6, 3.4), (0.5, -1.2, 4.4), (0.5, -1.5, 4.9)), ((-0.05, 0.6, 3.5), (-0.2, 1.15, 4.5), (-0.3, 1.45, 5.0)),
          ((0.2, 0.0, 3.6), (0.25, 0.05, 4.7), (0.2, 0.0, 5.4)))
TWIGS = (((1.0, -0.35, 3.2), (1.5, -1.4, 4.0)), ((-0.8, 0.45, 3.15), (-1.4, 1.45, 4.0)), ((0.2, 0.0, 3.6), (1.25, 0.6, 4.8)),
         ((0.2, 0.0, 3.6), (-1.2, -0.65, 4.85)), ((1.9, -0.8, 4.0), (2.55, -0.35, 4.3)), ((-1.8, 0.85, 3.95), (-2.5, 0.45, 4.2)))
SPRAYS = (((2.65, -0.35, 4.3), (0.45, 0.4, 0.32)), ((-2.6, 0.45, 4.2), (0.45, 0.4, 0.32)), ((0.9, 1.65, 4.55), (0.5, 0.42, 0.34)),
          ((-0.85, -1.7, 4.6), (0.5, 0.42, 0.34)), ((2.0, 0.35, 5.35), (0.5, 0.45, 0.34)), ((-2.0, -0.25, 5.2), (0.5, 0.45, 0.34)))
CAP = (((0.15, 0.0, 5.0), (2.7, 2.2, 1.15)), ((0.3, 0.2, 5.6), (1.5, 1.4, 0.75)))


def cherry_tree(k, lod, height=1.0, crown=1.0, groups=len(BLOSSOM), clusters=3, sprays=len(SPRAYS)):
    """Blossoming street tree: a dark wet trunk forking at 2.3 m into five boughs, blossom in sprays.
    LOD 0: groups x clusters + sprays puffs (33 by default) with gaps the boughs show through; LOD 1: one mass per
    group; LOD 2: a two-lump cap. Scaling multiplies by 1.0 at the defaults, which leaves every float unchanged."""
    assert height > 0 and crown > 0, (height, crown)
    assert 1 <= groups <= len(BLOSSOM) and clusters >= 1 and 0 <= sprays <= len(SPRAYS), (groups, clusters, sprays)
    up = lambda p: (p[0], p[1], p[2] * height)  # noqa: E731  trunk: taller, not wider
    out = lambda p: (p[0] * crown, p[1] * crown, p[2] * height)  # noqa: E731  crown points and puff radii
    sides = (7, 5, 4)[lod]
    trunk = [(0, 0, 0), (0.04, 0.02, 0.9), (0.1, 0.03, 1.7), FORK] if lod < 2 else [(0, 0, 0), (0.1, 0.03, 2.2), (0.2, 0.05, 4.5)]
    k.tube([up(p) for p in trunk], [0.24, 0.19, 0.16, 0.14][:len(trunk)], sides, "bark", caps=(False, False))
    if lod == 2:
        for i, (centre, radii) in enumerate(CAP):
            k.puff(out(centre), out(radii), 1, "blossom", seed=3.0 + i * 1.7)
        return
    fork = up(FORK)
    for path in BOUGHS:
        k.tube([fork, *map(out, path)][:4 if lod == 0 else 3], [0.11, 0.075, 0.05, 0.03], 5 if lod == 0 else 3, "bark", caps=(False, False))
    if lod == 1:
        for i, (centre, radii) in enumerate(BLOSSOM[:groups]):
            k.puff(out(centre), out(radii), 2, "blossom", seed=3.0 + i * 1.7)
        return
    k.prism(7, 0.4, 0.25, 0, 0.3, "bark")  # root flare
    for path in TWIGS:
        k.tube([out(p) for p in path], [0.05, 0.025], 3, "bark", caps=(False, False))
    turn, mid = 3 / clusters, (clusters - 1) / 2  # 1.0 and 1.0 at the default three clusters: the shipped angles
    for g, (centre, radii) in enumerate(BLOSSOM[:groups]):
        centre, radii = out(centre), out(radii)
        for j in range(clusters):  # clusters 0.6 r out from the group centre, 0.55 r across: gaps between them
            a = g * 1.9 + j * 2.094 * turn
            c = (centre[0] + math.cos(a) * 0.6 * radii[0], centre[1] + math.sin(a) * 0.6 * radii[1], centre[2] + (j - mid) * 0.25 * radii[2])
            k.puff(c, (radii[0] * 0.58, radii[1] * 0.58, radii[2] * 0.7), 2, "blossom", seed=3.0 + g * 1.7 + j * 0.9)
    for i, (centre, radii) in enumerate(SPRAYS[:sprays]):
        k.puff(out(centre), out(radii), 2, "blossom", seed=11.0 + i * 1.3)
