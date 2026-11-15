"""Painters of the Neon city atlas cells: wall sets from CC0 scans, lit windows, storefronts, signs, skyline.

Signs carry abstract bars and the invented marks of glyph() only: no lettering, numerals, brands or logos.
Emissive values are sRGB-encoded; the material multiplies them by EMISSIVE_STRENGTH (build.py).
"""
import numpy as np

from atlas import blur, seg

PINK, VIOLET, CYAN, AMBER = (1.0, 0.16, 0.62), (0.60, 0.28, 1.0), (0.10, 0.92, 1.0), (1.0, 0.60, 0.14)
WARM, COOL, RED, GREEN = (1.0, 0.80, 0.52), (0.78, 0.90, 1.0), (1.0, 0.10, 0.08), (0.12, 1.0, 0.42)
SWATCHES = {"neon_pink": PINK, "neon_violet": VIOLET, "neon_cyan": CYAN, "neon_amber": AMBER, "neon_red": RED,
            "neon_green": GREEN, "lamp_warm": (1.0, 0.84, 0.60)}
GLASS, FRAME = (0.03, 0.04, 0.06), (0.09, 0.10, 0.12)
UNLIT = (0.012, 0.03, 0.075)  # emission of an unlit room behind glass: city glow on the far wall
GLYPHS = 9


def glyph(c, kind, cx, cy, s):
    """Coverage mask of one invented mark of size s metres: rings, chevrons, diamonds, dots and slashes."""
    x, y = c.grid()
    x, y, r, t = x - cx, y - cy, s * 0.40, s * 0.06
    dot = lambda px, py: np.hypot(x - px * s, y - py * s) - s * 0.11  # noqa: E731
    if kind == 0:    # ring around a dot
        d = np.minimum(np.abs(np.hypot(x, y) - r) - t, dot(0, 0))
    elif kind == 1:  # two nested chevrons pointing down
        d = np.minimum.reduce([seg(x, y, sx * r, o + r * 0.4, 0, o - r * 0.4) for sx in (-1, 1) for o in (s * 0.2, -s * 0.2)]) - t
    elif kind == 2:  # diamond with a slit
        d = np.minimum(np.abs(np.abs(x) + np.abs(y) - r) * 0.7071 - t, seg(x, y, -r * 0.4, 0, r * 0.4, 0) - t)
    elif kind == 3:  # triangle hanging under a dot
        p = [(-r, r * 0.2), (r, r * 0.2), (0, -r)]
        d = np.minimum(np.minimum.reduce([seg(x, y, *p[i], *p[(i + 1) % 3]) for i in range(3)]) - t, dot(0, 0.36))
    elif kind == 4:  # four dots
        d = np.minimum.reduce([dot(px, py) for px in (-0.2, 0.2) for py in (-0.2, 0.2)])
    elif kind == 5:  # two slashes
        d = np.minimum(seg(x, y, -0.33 * s, -r, -0.05 * s, r), seg(x, y, 0.05 * s, -r, 0.33 * s, r)) - t
    elif kind == 6:  # hexagon
        d = np.abs(np.maximum(np.abs(x) * 0.866 + np.abs(y) * 0.5, np.abs(y)) - r) - t
    elif kind == 7:  # square crossed by one diagonal
        d = np.minimum(np.abs(np.maximum(np.abs(x), np.abs(y)) - r * 0.85) - t, seg(x, y, -r * 0.85, -r * 0.85, r * 0.85, r * 0.85) - t)
    else:            # three dots over a short bar
        d = np.minimum.reduce([dot(0, 0.24), dot(-0.24, -0.06), dot(0.24, -0.06), seg(x, y, -r * 0.7, -r, r * 0.7, -r) - t])
    return c.cover(d)


def bars(c, rng, x0, y0, x1, y1, colour, level, rows):
    """A block of horizontal bars of uneven length: stands in for a line of sign copy."""
    step = (y1 - y0) / rows
    for i in range(rows):
        w = (x1 - x0) * rng.uniform(0.35, 1.0)
        c.rect(x0, y0 + i * step + step * 0.25, x0 + w, y0 + (i + 1) * step - step * 0.2, emi=np.asarray(colour) * level)


def noise(rng, c, n):
    """Tileable value noise in 0..1 with n cells across."""
    g = rng.random((n, n)).astype(np.float32)
    big = np.kron(g, np.ones((-(-c.h // n), -(-c.w // n)), np.float32))[:c.h, :c.w]
    return blur(big, max(c.w // n // 2, 1), (True, True))


def interior(c, rng, x0, y0, x1, y1, tone, level):
    """A lit room behind glass: brighter toward the ceiling, sometimes a blind, sometimes dark furniture."""
    s = c.span(x0, y0, x1, y1)
    rows = s[0].stop - s[0].start
    if rows <= 0 or s[1].stop <= s[1].start:
        return
    c.emi[s] = np.asarray(tone, np.float32) * level * np.linspace(1.0, 0.68, rows, dtype=np.float32)[:, None, None]
    if rng.random() < 0.35:
        c.emi[c.span(x0, y1 - (y1 - y0) * rng.uniform(0.25, 0.7), x1, y1)] *= 0.6
    if rng.random() < 0.6:
        a = rng.uniform(x0, x0 + (x1 - x0) * 0.6)
        c.emi[c.span(a, y0, a + (x1 - x0) * rng.uniform(0.2, 0.4), y0 + (y1 - y0) * rng.uniform(0.2, 0.45))] *= 0.3


def curtain(c, rng, cols, rows, palette, lit, glass, spandrel=0.9):
    """Glass curtain wall: coated vision glass, dark spandrel bands, runs of bays lit as one room."""
    bw, fh = c.mw / cols, c.mh / rows
    c.col[:], c.rough[:], c.metal[:] = glass, 0.12, 0.85
    for r in range(rows):
        y, q = r * fh, 0
        c.rect(0, y, c.mw, y + spandrel, col=np.asarray(glass) * 0.45, rough=0.3, metal=0.6, height=0.03)
        while q < cols:
            n = int(rng.integers(1, 4))
            if rng.random() < lit:
                tone, level = palette[rng.integers(len(palette))], rng.uniform(0.24, 0.44)
                for i in range(q, min(q + n, cols)):
                    interior(c, rng, i * bw, y + spandrel, (i + 1) * bw, y + fh, tone, level)
            q += n
        c.rect(0, y + spandrel - 0.04, c.mw, y + spandrel + 0.04, col=FRAME, emi=0, rough=0.4, metal=1.0, height=0.06)
    for q in range(cols + 1):
        c.rect(q * bw - 0.05, 0, q * bw + 0.05, c.mh, col=FRAME, emi=0, rough=0.4, metal=1.0, height=0.06)
    c.halo(0.25, 0.2)


def wet_glass(c, rng, cols, rows, line, spandrel=0.9):
    """Rain at night on a wall painted by curtain(): each pane tilted and tinted a little so reflections break up as on
    real glazing, rain streaks down the glass in the roughness, droplet bumps, and a cool ceiling line at every floor
    head (lit or not), the floor lines of frame 03. Takes its own random stream: the shared one stays as reviewed."""
    bw, fh = c.mw / cols, c.mh / rows
    glass = (c.metal > 0.8) & (c.rough < 0.2)  # vision glass; frames are rougher, spandrels less metallic
    for r in range(rows):
        for q in range(cols):
            s = c.span(q * bw, r * fh + spandrel, (q + 1) * bw, (r + 1) * fh)
            c.col[s] *= rng.uniform(0.82, 1.15)
            c.nxy[s] += rng.normal(0, 0.035, 2).astype(np.float32)
            dark = glass[s] & (c.emi[s].max(-1) < 0.02)  # unlit rooms: a dim blue depth so the glass reads blue, not black
            c.emi[s][dark] = np.asarray(UNLIT, np.float32) * rng.uniform(0.4, 1.3)
        s = c.span(0, (r + 1) * fh - 0.16, c.mw, (r + 1) * fh - 0.07)
        c.emi[s] = np.maximum(c.emi[s], np.asarray(COOL, np.float32) * line)
    streak = blur(np.kron(rng.random((-(-c.h // 16), c.w)).astype(np.float32), np.ones((16, 1), np.float32))[:c.h], 2, (True, True))
    c.rough[:] = np.where(glass, 0.04 + 0.2 * streak ** 2, c.rough)
    c.height += 0.006 * (rng.random((c.h, c.w)) > 0.96)


def punched(c, rng, cols, rows, win, palette, lit, panes=2):
    """Windows punched into the wall already in the cell: recessed glass, sill, mullions, shadowed head."""
    bw, fh, (ww, wh) = c.mw / cols, c.mh / rows, win
    for r in range(rows):
        for q in range(cols):
            x0, y0 = q * bw + (bw - ww) / 2, r * fh + (fh - wh) * 0.45
            c.rect(x0 - 0.08, y0 - 0.14, x0 + ww + 0.08, y0, height=0.06)                       # sill
            c.rect(x0, y0, x0 + ww, y0 + wh, col=GLASS, rough=0.1, metal=0.0, height=-0.15, flat=True)
            c.rect(x0, y0 + wh - 0.15, x0 + ww, y0 + wh, ao=0.55)
            if rng.random() < lit:
                interior(c, rng, x0, y0, x0 + ww, y0 + wh, palette[rng.integers(len(palette))], rng.uniform(0.24, 0.44))
            for i in range(1, panes):
                x = x0 + ww * i / panes
                c.rect(x - 0.035, y0, x + 0.035, y0 + wh, col=FRAME, emi=0, height=-0.08)
    c.halo(0.3, 0.25)


def storefront(c, rng, scans, tone, accent, sign):
    """12 m of glazed shopfront under a metal fascia with two neon lines and three lit sign panels."""
    c.scan(scans, "granite_tile_04", 6, 2, tint=(0.8, 0.8, 0.82), rough=(0.25, 0.7))
    c.rect(0, 0, c.mw, 0.35, ao=0.7)
    c.rect(0, 3.6, c.mw, c.mh, col=(0.055, 0.06, 0.07), rough=0.42, metal=0.9, height=0.08, flat=True)
    for bay in range(3):
        x0, x1 = bay * 4 + 0.3, bay * 4 + 3.7
        s = c.rect(x0, 0.35, x1, 3.5, col=GLASS, rough=0.08, metal=0.0, height=-0.2, flat=True)
        rows = s[0].stop - s[0].start
        c.emi[s] = np.asarray(tone, np.float32) * 0.5 * np.linspace(1.0, 0.6, rows, dtype=np.float32)[:, None, None]
        c.rect(x0 + 0.3, 1.0, x1 - 0.3, 3.0, emi=np.asarray(tone) * 0.6)                       # lit back wall
        for shelf in (1.25, 1.85, 2.45):                                                       # goods on shelves
            x = x0 + 0.45
            while x < x1 - 0.6:
                w, h = rng.uniform(0.12, 0.3), rng.uniform(0.18, 0.42)
                hue = (accent, WARM, COOL, AMBER, PINK, (0.9, 0.9, 0.95))[rng.integers(6)]
                c.rect(x, shelf, x + w, shelf + h, emi=np.asarray(hue) * rng.uniform(0.35, 0.7))
                x += w + rng.uniform(0.06, 0.3)
            c.rect(x0 + 0.3, shelf - 0.04, x1 - 0.3, shelf, emi=np.asarray(tone) * 0.3)
        for _ in range(2):                                                                     # display stands in silhouette
            x = rng.uniform(x0 + 0.3, x1 - 0.8)
            c.emi[c.span(x, 0.35, x + rng.uniform(0.3, 0.5), rng.uniform(1.3, 1.9))] *= 0.22
        for i in range(4):                                                                     # mullions, transom
            x = x0 + (x1 - x0) * i / 3
            c.rect(x - 0.04, 0.35, x + 0.04, 3.5, col=FRAME, emi=0, rough=0.4, metal=1.0, height=0.03)
        c.rect(x0, 2.86, x1, 2.94, col=FRAME, emi=0, rough=0.4, metal=1.0, height=0.03)
        if bay == 1:                                                                           # double door
            for x in (x0 + 1.13, x0 + 1.7, x0 + 2.27):
                c.rect(x - 0.05, 0.35, x + 0.05, 2.86, col=FRAME, emi=0, rough=0.4, metal=1.0, height=0.05)
            for x in (x0 + 1.58, x0 + 1.82):
                c.rect(x - 0.02, 1.2, x + 0.02, 1.8, col=(0.5, 0.5, 0.52), emi=0, rough=0.2, metal=1.0, height=0.08)
        sx = bay * 4 + 0.9
        c.rect(sx, 3.82, sx + 2.2, 4.28, col=np.asarray(sign) * 0.4, emi=np.asarray(sign) * 0.5, rough=0.5, metal=0.0)
        c.glow(glyph(c, int(rng.integers(GLYPHS)), sx + 0.3, 4.05, 0.38), (1.0, 0.95, 0.9), 0.95)
        bars(c, rng, sx + 0.65, 3.9, sx + 2.05, 4.2, (1.0, 0.95, 0.9), 0.9, 2)
    for y in (3.68, 4.38):
        c.rect(0, y - 0.03, c.mw, y + 0.03, col=np.asarray(accent) * 0.9, emi=accent)
    c.halo(0.35, 0.3)


def market_front(c, rng, scans, variant):
    """8 m night-market shop: open warm shopfront, sign board, timber frame, lattice windows upstairs."""
    c.scan(scans, "plastered_wall_05", 4, 3, tint=(0.62, 0.6, 0.58))
    c.scan(scans, "black_painted_planks", 5, 2, tint=(1.5, 1.15, 0.95), rough=(0.35, 0.8), box=(0, 0, 8, 3.3))
    timber = dict(col=(0.075, 0.05, 0.04), rough=0.6, height=0.1, flat=True)
    openings = ((0.3, 7.7),) if variant == 0 else ((0.3, 2.9), (3.3, 4.7), (5.1, 7.7))
    for i, (x0, x1) in enumerate(openings):
        door = variant == 1 and i == 1
        s = c.rect(x0, 0.0 if door or variant == 0 else 0.9, x1, 2.55, col=(0.1, 0.07, 0.05), rough=0.5, height=-0.3, flat=True)
        rows = s[0].stop - s[0].start
        c.emi[s] = np.asarray(WARM, np.float32) * 0.6 * np.linspace(1.0, 0.55, rows, dtype=np.float32)[:, None, None]
        if door:                                                                               # cloth strips over the doorway
            for k in range(3):
                a = x0 + 0.08 + k * (x1 - x0 - 0.1) / 3
                c.rect(a, 1.75, a + (x1 - x0) / 3 - 0.1, 2.55, col=(0.42, 0.05, 0.07), emi=np.asarray(RED) * 0.2, rough=0.9)
                c.glow(glyph(c, 0, a + (x1 - x0) / 6 - 0.05, 2.15, 0.32), (1.0, 0.9, 0.8), 0.55)
            continue
        for shelf in (1.15, 1.6, 2.05):                                                        # jars and boxes
            x = x0 + 0.25
            while x < x1 - 0.4:
                w, h = rng.uniform(0.1, 0.26), rng.uniform(0.14, 0.34)
                hue = ((0.85, 0.9, 1.0), (0.3, 0.5, 1.0), RED, AMBER, (0.95, 0.9, 0.8))[rng.integers(5)]
                c.rect(x, shelf, x + w, shelf + h, emi=np.asarray(hue) * rng.uniform(0.35, 0.75))
                x += w + rng.uniform(0.05, 0.22)
            c.rect(x0, shelf - 0.05, x1, shelf, emi=np.asarray(AMBER) * 0.25)
        if variant == 0:                                                                       # counter with a doorway gap
            for a, b in ((x0, 2.9), (4.7, x1)):
                c.scan(scans, "black_painted_planks", 5, 6, tint=(1.6, 1.2, 1.0), box=(a, 0, b, 0.95))
                c.emi[c.span(a, 0, b, 0.95)] = 0
                c.rect(a, 0.95, b, 1.02, col=(0.3, 0.2, 0.12), emi=np.asarray(AMBER) * 0.35, height=0.05)
            for x in (2.9, 4.7):
                c.rect(x - 0.1, 0, x + 0.1, 2.55, emi=0, **timber)
    for x in (0.15, 7.85):
        c.rect(x - 0.15, 0, x + 0.15, 6.0, emi=0, **timber)
    board = (0.33, 0.035, 0.05) if variant == 0 else (0.03, 0.09, 0.25)
    ink = (1.0, 0.75, 0.3) if variant == 0 else (0.75, 0.9, 1.0)
    c.rect(0.3, 2.62, 7.7, 3.12, col=board, emi=np.asarray(board) * 0.9, rough=0.55, height=0.06, flat=True)
    for k in range(4):
        c.glow(glyph(c, int(rng.integers(GLYPHS)), 1.0 + k * 0.62, 2.87, 0.4), ink, 0.85)
    bars(c, rng, 3.9, 2.72, 7.3, 3.02, ink, 0.7, 2)
    c.rect(0, 3.12, 8, 3.34, emi=0, **timber)                                                  # floor beam
    n = 3 if variant == 0 else 2
    for k in range(n):                                                                         # paper lattice windows
        w = 1.7 if variant == 0 else 2.6
        x0 = 8 * (k + 0.5) / n - w / 2
        c.rect(x0 - 0.1, 3.8, x0 + w + 0.1, 5.45, emi=0, **timber)
        s = c.rect(x0, 3.9, x0 + w, 5.35, col=(0.5, 0.42, 0.3), rough=0.9, height=-0.05, flat=True)
        c.emi[s] = np.asarray(WARM, np.float32) * (0.5 if rng.random() < 0.75 else 0.12)
        for i in range(1, int(w / 0.28)):
            c.rect(x0 + i * 0.28 - 0.016, 3.9, x0 + i * 0.28 + 0.016, 5.35, col=timber["col"], emi=0)
        for y in (4.3, 4.7, 5.1):
            c.rect(x0, y - 0.016, x0 + w, y + 0.016, col=timber["col"], emi=0)
    ramp = np.linspace(0.45, 1.0, c.span(0, 5.3, 8, 6.0)[0].stop)[:, None]                     # shadow under the eave
    c.ao[c.span(0, 5.3, 8, 6.0)] *= ramp
    c.col[c.span(0, 5.3, 8, 6.0)] *= ramp[..., None]
    c.halo(0.4, 0.3)


def sign_face(c, rng, ground, ink, count):
    """Internally lit box sign: glowing ground, a border tube and a column of marks with bar pairs."""
    c.col[:], c.rough[:] = np.asarray(ground) * 0.45, 0.5
    c.emi[:] = np.asarray(ground, np.float32) * 0.42
    x, y = c.grid()
    edge = np.maximum(np.abs(x - c.mw / 2) - (c.mw / 2 - 0.09), np.abs(y - c.mh / 2) - (c.mh / 2 - 0.09))
    c.glow(c.cover(np.abs(edge) - 0.025), ink, 0.95)
    step = (c.mh - 0.4) / count
    for i in range(count):
        cy = 0.2 + (i + 0.5) * step
        if c.mh > 2 * c.mw and i % 3 == 2:
            bars(c, rng, 0.28, cy - step * 0.3, c.mw - 0.28, cy + step * 0.3, ink, 0.9, 3)
        else:
            c.glow(glyph(c, int(rng.integers(GLYPHS)), c.mw / 2, cy, min(c.mw - 0.4, step * 0.85)), ink, 1.0)
    c.halo(0.12, 0.35)


def billboard(c, rng, a, b, ink):
    """LED screen: a two-colour diagonal wash, large marks, bar blocks, a ticker strip, visible LED pitch."""
    x, y = c.grid()
    t = np.clip((x / c.mw * 0.7 + y / c.mh * 0.5), 0, 1)[..., None]
    wash = np.asarray(a, np.float32) * (1 - t) + np.asarray(b, np.float32) * t
    band = (np.sin((x + y) * 2.2) > 0.72)[..., None]
    c.emi[:] = wash * (0.42 + 0.2 * band)
    s = min(c.mw, c.mh)
    c.glow(glyph(c, int(rng.integers(GLYPHS)), c.mw * 0.3, c.mh * 0.56, s * 0.62), ink, 0.95)
    c.glow(glyph(c, int(rng.integers(GLYPHS)), c.mw * 0.78, c.mh * 0.78, s * 0.2), (1, 1, 1), 0.9)
    bars(c, rng, c.mw * 0.58, c.mh * 0.3, c.mw * 0.94, c.mh * 0.62, (1.0, 0.97, 0.95), 0.9, 4)
    c.rect(0, 0, c.mw, c.mh * 0.11, emi=np.asarray(b) * 0.25)
    for k in range(7):
        c.rect(c.mw * (0.03 + k * 0.14), c.mh * 0.035, c.mw * (0.03 + k * 0.14 + rng.uniform(0.04, 0.11)), c.mh * 0.075, emi=np.asarray(ink) * 0.85)
    pitch = ((np.arange(c.w) % 4 > 0)[None, :] & (np.arange(c.h) % 4 > 0)[:, None])[..., None]
    c.emi *= 0.78 + 0.22 * pitch
    c.col[:], c.rough[:] = (0.02, 0.02, 0.025), 0.25


def skyline(c, rng, palette, lit, strips=None):
    """Far tower face at 4 px per metre: a grid of 2 px windows lit in clusters."""
    floors, bays = c.h // 6, c.w // 4
    on = rng.random((floors, bays)) < lit * (0.35 + 1.3 * noise(rng, c, 8)[::6, ::4][:floors, :bays])
    tones = np.asarray(palette, np.float32)[rng.integers(len(palette), size=(floors, bays))] * rng.uniform(0.3, 0.6, (floors, bays, 1))
    cellmask = np.zeros((6, 4), np.float32)
    cellmask[1:4, 1:3] = 1
    c.emi[:] = np.kron(on[..., None] * tones, cellmask[..., None])[:c.h, :c.w]
    c.col[:], c.rough[:], c.metal[:] = (0.035, 0.04, 0.055), 0.3, 0.5
    for x, colour in strips or ():
        c.rect(x - 0.5, 0, x + 0.5, c.mh, emi=np.asarray(colour) * 0.9)


def paint_all(atlas):
    """Every cell of the kit. Sizes: (px), (metres); px per metre falls from storefronts to the far skyline."""
    scans, rng = atlas.scans, np.random.default_rng(20261114)
    both = (True, True)
    walls = {"concrete": ("concrete_wall_008", 256, 5.4, (0.85, 0.85, 0.88)), "granite": ("granite_tile_04", 256, 4.0, (0.8, 0.8, 0.82)),
             "plaster": ("plastered_wall_05", 256, 4.0, (0.62, 0.6, 0.58)), "planks": ("black_painted_planks", 256, 3.2, (1.5, 1.15, 0.95)),
             "rooftile": ("roof_tiles_14", 256, 3.0, (0.6, 0.62, 0.7)), "roof_flat": ("concrete_wall_008", 128, 5.4, (0.4, 0.4, 0.43))}
    for name, (asset, px, metres, tint) in walls.items():
        atlas.cell(name, (px, px), (metres, metres), both).scan(scans, asset, 2, 2, tint=tint)
    atlas.cells["rooftile"].rough[:] = np.clip(atlas.cells["rooftile"].rough * 0.6, 0.2, 1)   # wet glazed tiles
    atlas.cell("bark", (128, 128), (1.6, 1.6), both).scan(scans, "sakura_bark", 1, 1, tint=(0.42, 0.37, 0.38), rough=(0.2, 0.75))  # rain-dark
    for name, colour, rough in (("steel_dark", (0.07, 0.075, 0.085), (0.3, 0.55)), ("steel_light", (0.42, 0.44, 0.47), (0.25, 0.5))):
        c = atlas.cell(name, (128, 128), (2.0, 2.0), both)
        c.scan(scans, "metal_plate_02", 1, 1, rough=rough)
        c.col[:], c.metal[:], c.nxy = colour, 1.0, c.nxy * 0.4
    c = atlas.cell("glass_dark", (32, 32), (1e6, 1e6), solid=True)
    c.col[:], c.rough[:], c.metal[:] = (0.05, 0.06, 0.09), 0.1, 0.85
    c = atlas.cell("lens_off", (32, 32), (1e6, 1e6), solid=True)
    c.col[:], c.rough[:] = (0.03, 0.03, 0.03), 0.3
    for name, colour in SWATCHES.items():
        c = atlas.cell(name, (32, 32), (1e6, 1e6), solid=True)
        c.col[:], c.emi[:], c.rough[:] = np.asarray(colour) * 0.9, colour, 0.4

    fx = np.random.default_rng(20261115)  # stream of the 2026-11-15 rework (blossom, glass): the shared one stays as reviewed
    c = atlas.cell("blossom", (256, 256), (3.0, 3.0), both)
    n1, n2 = noise(rng, c, 64)[..., None], noise(rng, c, 12)[..., None]
    florets = np.clip((noise(fx, c, 128)[..., None] - 0.42) * 4, 0, 1) * (n1 > 0.42)          # petal tips catching the light, ~2 cm
    tone = np.clip((n1 - 0.38) * 3.2 + (n2 - 0.5) * 0.6, 0, 1)
    lift = c.grid()[1][..., None] / c.mh  # puff v: underside 0, top 1
    c.col[:] = np.clip(((0.64, 0.3, 0.5) + tone * (0.34, 0.36, 0.32) + florets * (0.02, 0.22, 0.14)) * (0.78 + 0.3 * lift), 0, 0.95)
    c.ao[:] = (0.75 + 0.25 * tone[..., 0]) * (0.75 + 0.25 * lift[..., 0])                         # gaps, shaded underside
    c.emi[:] = c.col * (0.32, 0.2, 0.27) * (0.6 + 0.6 * tone)                                 # neon spill on wet petals
    c.rough[:], c.height[:] = 0.5 + 0.3 * (1 - tone[..., 0]), n1[..., 0] * 0.12 + florets[..., 0] * 0.025

    c = atlas.cell("kerb", (256, 64), (4.0, 1.0), (True, False))
    c.scan(scans, "concrete_wall_008", 2, 1, rough=(0.25, 0.5))
    wear = 0.8 + 0.2 * noise(rng, c, 16)[..., None]
    c.col[:, :128] = c.col[:, :128] * 1.6 * (0.80, 0.05, 0.05) * wear[:, :128]
    c.col[:, 128:] = np.clip(c.col[:, 128:] * 1.7 * (0.95, 0.95, 0.92) * wear[:, 128:], 0, 0.92)

    c = atlas.cell("awning", (128, 64), (2.0, 1.0), (True, False))
    x, y = c.grid()
    c.col[:] = np.asarray((0.42, 0.05, 0.07)) * (0.8 + 0.2 * np.sin(x * np.pi * 6))[..., None]
    c.height[:], c.rough[:] = 0.04 * np.sin(x * np.pi * 6), 0.85
    c.tint(c.cover(np.abs(np.hypot((x % 0.5) - 0.25, y - 0.08) - 0.16) - 0.02) * (y > 0.08), (0.9, 0.86, 0.8))
    c.emi[:] = c.col * 0.12

    c = atlas.cell("lantern", (64, 64), (0.5, 0.5))
    x, y = c.grid()
    c.col[:], c.rough[:] = (0.9, 0.55, 0.3), 0.8
    c.emi[:] = np.asarray((1.0, 0.62, 0.24), np.float32) * (0.95 - 0.5 * np.abs(y - 0.25) / 0.25)[..., None]
    lattice = ((x % 0.125 < 0.016) | (y % 0.125 < 0.016) | (y < 0.04) | (y > 0.46))[..., None]
    c.emi[:] = np.where(lattice, 0.02, c.emi)
    c.col[:] = np.where(lattice, (0.06, 0.04, 0.03), c.col)

    cool, warm, vio = [WARM, WARM, (1.0, 0.72, 0.4), COOL], [WARM, (1.0, 0.7, 0.38), COOL, (0.9, 0.95, 1.0)], [WARM, WARM, (1.0, 0.72, 0.4), VIOLET]
    c = atlas.cell("curtain_a", (240, 504), (6.0, 14.4), both)
    curtain(c, rng, 4, 4, cool, 0.42, (0.2, 0.31, 0.47))
    # Frame 03: the round tower is mostly dark glass. Rooms are switched off after painting, by bay, so the shared
    # random stream (and every cell painted after this one) stays as reviewed.
    for row, bays in enumerate(((0, 1), (2, 3), (0, 1, 2), (3,))):
        for bay in bays:
            c.emi[c.span(bay * 1.5, row * 3.6, (bay + 1) * 1.5, (row + 1) * 3.6)] = 0
    c.emi *= 0.8
    wet_glass(c, fx, 4, 4, 0.34)
    c = atlas.cell("curtain_b", (320, 504), (8.0, 14.4), both)
    curtain(c, rng, 4, 4, [WARM, WARM, (1.0, 0.72, 0.4), (1.0, 0.7, 0.85)], 0.36, (0.13, 0.15, 0.24))
    wet_glass(c, fx, 4, 4, 0.24)
    c = atlas.cell("office_grid", (432, 504), (12.0, 14.0), both)
    c.scan(scans, "concrete_wall_008", 4, 5, tint=(0.8, 0.8, 0.84))
    punched(c, rng, 4, 4, (2.0, 1.7), warm, 0.45)
    c = atlas.cell("retail_upper", (432, 504), (12.0, 14.0), both)
    c.scan(scans, "granite_tile_04", 6, 7, tint=(0.8, 0.8, 0.82), rough=(0.25, 0.7))
    punched(c, rng, 3, 4, (3.2, 2.4), vio, 0.45, panes=3)
    storefront(atlas.cell("store_glass", (768, 288), (12.0, 4.5), (True, False)), rng, scans, WARM, PINK, PINK)
    storefront(atlas.cell("store_violet", (768, 288), (12.0, 4.5), (True, False)), rng, scans, (0.78, 0.55, 1.0), CYAN, VIOLET)
    market_front(atlas.cell("market_front_a", (512, 384), (8.0, 6.0)), rng, scans, 0)
    market_front(atlas.cell("market_front_b", (512, 384), (8.0, 6.0)), rng, scans, 1)

    sign_face(atlas.cell("blade_a", (96, 384), (1.2, 5.6)), rng, RED, (1.0, 0.92, 0.85), 5)
    sign_face(atlas.cell("blade_b", (96, 384), (1.2, 5.6)), rng, (0.05, 0.45, 0.6), AMBER, 5)
    for name, ground, ink in (("sign_small_a", RED, (1.0, 0.92, 0.85)), ("sign_small_b", (0.95, 0.5, 0.14), (1.0, 0.97, 0.85)), ("sign_small_c", (0.05, 0.32, 0.42), CYAN)):
        sign_face(atlas.cell(name, (128, 128), (1.2, 1.2)), rng, ground, ink, 1)
    billboard(atlas.cell("billboard_a", (576, 324), (10.0, 5.6)), rng, PINK, VIOLET, (1.0, 0.95, 1.0))
    billboard(atlas.cell("billboard_b", (320, 500), (5.0, 7.8)), rng, (0.05, 0.5, 0.8), VIOLET, AMBER)

    skyline(atlas.cell("sky_a", (128, 384), (32.0, 96.0), both), rng, [WARM, WARM, COOL], 0.3)
    skyline(atlas.cell("sky_b", (128, 384), (32.0, 96.0), both), rng, [WARM, PINK, VIOLET], 0.24, strips=((0.5, PINK), (16.0, PINK)))
    skyline(atlas.cell("sky_c", (128, 384), (32.0, 96.0), both), rng, [COOL, WARM, CYAN], 0.3)
