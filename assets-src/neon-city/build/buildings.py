"""Close buildings of the Neon city kit: two glass towers, two podium blocks, two tile-roofed market shops.

Every builder takes (kit, lod): LOD 0 is the full module, LOD 1 drops relief and roof clutter, LOD 2 keeps the
lit faces and the silhouette. Footprints are centred on the origin, the street side is -y.
"""
import math

ROUND_R = 1.5 / math.sin(math.pi / 24)  # 24 sides of exactly 3 m: two sides per 6 m curtain_a cell
PITCH = math.tan(math.radians(28))      # market roof slope


def band(k, w, d, z0, z1, cell, lod, proud=0.2, y=0.0):
    """Neon band around a w x d block: a proud ring at LOD 0, a bare shell beyond."""
    if lod:
        k.walls(w + 2 * proud, d + 2 * proud, z0, z1, cell, y=y)
        return
    x, yy = w / 2, d / 2
    for lo, hi, skip in (((-x - proud, y - yy - proud), (x + proud, y - yy), "b"), ((-x - proud, y + yy), (x + proud, y + yy + proud), "f"),
                         ((-x - proud, y - yy), (-x, y + yy), "rfb"), ((x, y - yy), (x + proud, y + yy), "lfb")):
        k.box((*lo, z0), (*hi, z1), cell, skip=skip)


def roof_units(k, spots):
    for x, y, w, d, h, z in spots:
        k.box((x - w / 2, y - d / 2, z), (x + w / 2, y + d / 2, z + h), "steel_dark", fit=True)


def tower_glass_a(k, lod):
    """Round glass tower with a cyan crown ring (frame 03, left of centre) on a glazed podium."""
    k.walls(24, 24, 0, 4.5, ("store_glass", "store_glass", "granite", "store_glass"))
    k.floor(-12, -12, 12, 12, 4.5, "roof_flat", fit=lod > 0)
    n, z0, z1 = (24, 12, 8)[lod], 4.5, 4.5 + 6 * 14.4
    phase = -math.pi / 2 - math.pi / n
    pt = lambda i: (ROUND_R * math.cos(phase + 2 * math.pi * i / n), ROUND_R * math.sin(phase + 2 * math.pi * i / n))  # noqa: E731
    for i in range(n):
        k.wall(pt(i), pt(i + 1), z0, z1, "curtain_a", uoff=(i % 2) * 3.0 if lod == 0 else 0.0)
    k.prism(n, ROUND_R + 0.3, ROUND_R + 0.3, z1 - 0.2, z1 + 1.2, "neon_cyan", phase, cap="roof_flat")
    if lod < 2:
        band(k, 24, 24, 4.5, 4.85, "neon_cyan", lod)
        k.prism(12, ROUND_R * 0.55, ROUND_R * 0.55, z1 + 1.2, z1 + 5.0, "glass_dark", cap="roof_flat")
    if lod == 0:
        k.prism(12, ROUND_R * 0.55 + 0.2, ROUND_R * 0.55 + 0.2, z1 + 4.5, z1 + 5.1, "neon_cyan")
        k.tube([(0, 0, z1 + 5.0), (0, 0, z1 + 14.0)], [0.25, 0.08], 5, "steel_dark")
        k.box((-3, -13.4, 3.45), (3, -12, 3.62), "steel_dark", skip="b", fit=True)  # entrance canopy


def tower_glass_b(k, lod):
    """Rectangular glass tower with vertical pink strips and a pink crown (frame 03, far left)."""
    k.walls(28, 20, 0, 4.5, ("store_violet", "store_violet", "granite", "store_violet"))
    k.floor(-14, -10, 14, 10, 4.5, "roof_flat", fit=lod > 0)
    z1 = 4.5 + 5 * 14.4
    k.walls(24, 16, 4.5, z1, "curtain_b")
    for x in (-12.0, 12.0) if lod else (-12.0, -4.0, 4.0, 12.0):  # pink strips up the street face
        k.box((x - 0.3, -8.35, 4.5), (x + 0.3, -8.0, z1), "neon_pink", skip="btu" if lod == 0 else "blrtu")
    if lod == 0:
        for y in (-8.0, 8.0):
            for x, skip in ((-12.35, "rtu"), (12.0, "ltu")):
                k.box((x, y - 0.3, 4.5), (x + 0.35, y + 0.3, z1), "neon_pink", skip=skip)
    band(k, 24, 16, z1 - 0.6, z1 + 0.3, "neon_pink", lod)
    k.floor(-12, -8, 12, 8, z1, "roof_flat", fit=lod > 0)
    if lod < 2:
        band(k, 28, 20, 4.5, 4.85, "neon_pink", lod)
        k.walls(18, 11, z1, z1 + 4.0, "glass_dark")
        k.floor(-9, -5.5, 9, 5.5, z1 + 4.0, "roof_flat")
        band(k, 18, 11, z1 + 3.6, z1 + 4.1, "neon_pink", 1)
    if lod == 0:
        roof_units(k, [(-5, 0, 3, 3, 1.6, z1 + 4.0), (4, 1, 4, 2.5, 1.2, z1 + 4.0)])
        k.tube([(6, -2, z1 + 4.0), (6, -2, z1 + 15.0)], [0.22, 0.07], 5, "steel_dark")


def block_retail_a(k, lod):
    """Five-storey stone block: glazed warm storefront, pink bands, violet-lit floors (frames 03 right, 08)."""
    k.walls(24, 12, 0, 4.5, ("store_glass", "store_glass", "granite", "store_glass"))
    k.walls(24, 12, 4.5, 18.5, ("retail_upper", "retail_upper", "concrete", "retail_upper"))
    k.walls(24, 12, 18.5, 19.5, "granite")
    k.floor(-12, -6, 12, 6, 19.5 if lod == 2 else 19.1, "roof_flat", fit=lod > 0)
    if lod < 2:
        band(k, 24, 12, 4.45, 4.8, "neon_pink", lod, proud=0.3)
        band(k, 24, 12, 19.1, 19.3, "neon_cyan", lod, proud=0.12)
    if lod == 0:
        band(k, 24, 12, 5.15, 5.3, "neon_pink", 0, proud=0.18)
        for i in range(7):  # stone piers between the 4 m bays
            x = -12 + i * 4
            k.box((x - 0.3, -6.22, 5.3), (x + 0.3, -6.0, 18.5), "granite", skip="btu")
        k.box((-12.25, -6.25, 18.5), (12.25, -6.0, 18.95), "granite", skip="b")
        k.box((-2.4, -7.5, 3.42), (2.4, -6.0, 3.6), "steel_dark", skip="b", fit=True)
        roof_units(k, [(-7, 1, 3.2, 2.2, 1.5, 19.1), (-2.5, 1.5, 2.2, 2.2, 1.2, 19.1), (6, 0.5, 4.5, 3.5, 2.6, 19.1)])


def block_office_b(k, lod):
    """Nine-storey concrete office block with punched windows and a cyan roof line (frame 03, right)."""
    k.walls(24, 12, 0, 4.5, ("store_violet", "store_violet", "concrete", "store_violet"))
    k.walls(24, 12, 4.5, 32.5, ("office_grid", "office_grid", "concrete", "office_grid"))
    k.walls(24, 12, 32.5, 33.5, "concrete")
    k.floor(-12, -6, 12, 6, 33.5 if lod == 2 else 33.1, "roof_flat", fit=lod > 0)
    if lod < 2:
        band(k, 24, 12, 33.1, 33.32, "neon_cyan", lod, proud=0.12)
        band(k, 24, 12, 4.5, 4.78, "neon_violet", lod, proud=0.25)
    if lod == 0:
        for i in range(5):  # concrete fins every second bay
            x = -12 + i * 6
            k.box((x - 0.35, -6.3, 4.78), (x + 0.35, -6.0, 32.5), "concrete", skip="btu")
        k.box((-12.3, -6.3, 32.5), (12.3, -6.0, 33.0), "concrete", skip="b")
        k.box((-3, -7.6, 3.42), (3, -6.0, 3.6), "steel_dark", skip="b", fit=True)
        roof_units(k, [(-6, 1, 5, 3, 2.4, 33.1), (3, 2, 2.4, 2.4, 1.4, 33.1), (7.5, 0, 2.4, 2.4, 1.4, 33.1)])
        k.prism(8, 1.5, 1.5, 33.5, 36.2, "steel_light", cap="steel_light", centre=(8.5, -2.5))  # water tank


def sign_stack(k, x, lod, cells):
    """Stacked box signs projecting from a shop front: faces along the street, three high."""
    for i, cell in enumerate(cells if lod < 2 else cells[:0]):
        z = 3.42 + i * 0.75
        k.box((x - 0.11, -4.35, z), (x + 0.11, -3.6, z + 0.7), {"l": cell, "r": cell, "*": "steel_dark"}, skip="b" if lod else "", fit=True)


def lanterns(k, spots, z):
    for x, y in spots:
        k.box((x - 0.17, y - 0.17, z), (x + 0.17, y + 0.17, z + 0.45), {"*": "lantern", "t": "steel_dark", "u": "steel_dark"}, skip="", fit=True)


def shop_shell(k, cell, lod):
    """Two-storey 8 x 7 m shop body: painted front, plank and plaster flanks, timber frame in relief."""
    k.quad((-4, -3.5, 0), (4, -3.5, 0), (4, -3.5, 6), (-4, -3.5, 6), cell)
    for a, b in (((4, -3.5), (4, 3.5)), ((4, 3.5), (-4, 3.5)), ((-4, 3.5), (-4, -3.5))):
        k.wall(a, b, 0, 3.3, "planks")
        k.wall(a, b, 3.3, 6.0, "plaster")
    if lod == 0:
        for x in (-3.85, 3.85):
            k.box((x - 0.15, -3.66, 0), (x + 0.15, -3.5, 6.0), "planks", skip="bu")
        k.box((-4, -3.7, 3.12), (4, -3.5, 3.34), "planks", skip="b")


def shop_market_a(k, lod):
    """Night-market shop, ridge along the street: grey tile roof, red awning, lanterns, stacked signs (frame 05)."""
    shop_shell(k, "market_front_a", lod)
    ridge, eave = 6.0 + 3.5 * PITCH, 6.0 - 0.7 * PITCH
    k.patch((-4.4, -4.2, eave), (8.8, 0, 0), (0, 4.2, ridge - eave), "rooftile")
    k.patch((4.4, 4.2, eave), (-8.8, 0, 0), (0, -4.2, ridge - eave), "rooftile")
    for x, flip in ((4.0, 1), (-4.0, -1)):  # gable ends
        pts = [(x, -3.5 * flip, 6.0), (x, 3.5 * flip, 6.0), (x, 0, ridge - 0.05)]
        k.face(pts, "plaster", ((0.05, 0.05), (0.95, 0.05), (0.5, 0.5)))
    if lod < 2:
        k.patch((-3.3, -4.8, 2.7), (6.6, 0, 0), (0, 1.3, 0.6), "awning")
        sign_stack(k, -3.55, lod, ("sign_small_a", "sign_small_b", "sign_small_c"))
    if lod == 0:
        k.patch((-3.3, -3.5, 3.27), (6.6, 0, 0), (0, -1.3, -0.6), "awning")                 # awning underside
        k.patch((-4.4, -3.5, 5.97), (8.8, 0, 0), (0, -0.7, eave - 6.0), "planks")           # eave soffit
        k.box((-4.4, -4.26, eave - 0.14), (4.4, -4.2, eave + 0.02), "planks", skip="b")
        k.tube([(-4.45, 0, ridge + 0.04), (4.45, 0, ridge + 0.04)], [0.16, 0.16], 6, "rooftile", caps=(True, True))
        for x in (-1.1, 0.7):
            k.box((x - 0.1, -3.62, 0), (x + 0.1, -3.5, 2.6), "planks", skip="bu")
        lanterns(k, [(-3.7, -4.3), (3.7, -4.3), (0.0, -4.95)], 2.2)


def shop_market_b(k, lod):
    """Night-market shop, gable to the street: tiled lean-to over the shopfront, lantern row, stacked signs."""
    shop_shell(k, "market_front_b", lod)
    ridge, eave = 6.0 + 4.0 * PITCH, 6.0 - 0.4 * PITCH
    k.patch((4.4, -4.2, eave), (0, 8.1, 0), (-4.4, 0, ridge - eave), "rooftile")
    k.patch((-4.4, 3.9, eave), (0, -8.1, 0), (4.4, 0, ridge - eave), "rooftile")
    for y, flip in ((-3.5, 1), (3.5, -1)):  # gables front and back
        pts = [(-4.0 * flip, y, 6.0), (4.0 * flip, y, 6.0), (0, y, ridge - 0.05)]
        k.face(pts, "plaster", ((0.05, 0.05), (0.95, 0.05), (0.5, 0.55)))
    k.patch((-4.2, -4.9, 2.75), (8.4, 0, 0), (0, 1.4, 0.62), "rooftile")                     # lean-to roof
    if lod < 2:
        sign_stack(k, 3.55, lod, ("sign_small_c", "sign_small_a", "sign_small_b"))
    if lod == 0:
        k.patch((-4.2, -3.5, 3.34), (8.4, 0, 0), (0, -1.4, -0.62), "planks")
        k.box((-4.2, -4.96, 2.62), (4.2, -4.9, 2.77), "planks", skip="b")
        for x, sx in ((4.4, -1), (-4.4, 1)):  # soffits of the gable overhang
            k.patch((x, -3.5 if sx < 0 else -4.2, eave - 0.03), (0, -0.7 * -sx, 0), (4.4 * sx, 0, ridge - eave), "planks")
        k.tube([(0, -4.25, ridge + 0.04), (0, 3.95, ridge + 0.04)], [0.16, 0.16], 6, "rooftile", caps=(True, True))
        for x in (-1.0, 0.9):
            k.box((x - 0.1, -3.62, 0), (x + 0.1, -3.5, 2.6), "planks", skip="bu")
        for x in (-3.0, -1.5, 0.0, 1.5, 3.0):
            k.prism(6, 0.17, 0.17, 2.12, 2.5, "lantern", cap="steel_dark", centre=(x, -4.75))
