"""NITRO trail flame noise (docs/designs/nitro-flame/DESIGN.md, "Flame noise texture"): one tileable 512 x 512
8-bit RGB data texture, simulated rather than drawn. Run from the repo root:

  "$BLENDER_BIN" --background --factory-startup --python assets-src/nitro-flame/bake.py [-- <sheet-dir>]

Writes public/feature-assets/garage-vfx-skins/nitro-flame/flame-noise.png and, outside the repo, a contact sheet
(<sheet-dir>/contact-sheet.png, default: the OS temp dir): R, G, B and RGB, each tiled 2 x 2.

How the shapes are made: hot gas rising through cold gas, solved as a 2D Boussinesq flow (vorticity and temperature,
pseudo-spectral, 2/3 de-aliased, midpoint steps) on a torus. Buoyancy acts along +V, so hot fingers run up the flow
axis and their flanks roll up. The domain is periodic on both axes, so every field tiles exactly: no seam is ever
blended or mirrored. Fixed seeds, no wall-clock input.

  R  temperature of the large-eddy run: flame tongues, stretched along V.
  G  temperature of a second, small-eddy run: fine turbulence, mean 0.5.
  B  the large-eddy run's shear sheets (|vorticity|), thresholded: sparse hot filaments along V.
U = image x, V = image y; the PNG's bottom row is v = 0 (three.js flipY = true, the TextureLoader default).
"""
import hashlib
import json
import os
import struct
import sys
import tempfile
import zlib

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, "public", "feature-assets", "garage-vfx-skins", "nitro-flame", "flame-noise.png")
ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SHEET_DIR = ARGV[0] if ARGV else os.path.join(tempfile.gettempdir(), "skyline-rush-nitro-flame")

SIZE = 512              # texture side, px
MAX_BYTES = 300_000     # contract: at most 300 KB
BUOYANCY = 1.0          # acceleration per unit of temperature, along +V (the domain is 2 pi wide)
CFL = 0.5
DT_MAX = 0.02
HYPER = 120.0           # decay rate of the smallest kept eddies (k^4 hyperviscosity): removes grid ringing, keeps fronts
# seed, blobs across U at the start, domain width over its length along V (the texture stretches the short domain
# back to a square, so every shape comes out that much longer along V), run time, grid
TONGUES = dict(seed=20261120, k0=5.0, stretch=2.5, t_end=2.4, n=256)
TURBULENCE = dict(seed=20261121, k0=28.0, stretch=1.5, t_end=0.6, n=256)


def simulate(seed, k0, stretch, t_end, n):
    """Run the flow from random warm and cold blobs at rest on a torus 2 pi wide (U) and 2 pi / stretch long (V).
    Returns the (temperature, vorticity) spectra."""
    row = np.fft.fftfreq(n, 1.0 / n)[:, None]
    kx = np.fft.rfftfreq(n, 1.0 / n)[None, :]
    ky = row * stretch
    k2 = kx ** 2 + ky ** 2
    lap = np.where(k2 == 0, 1.0, k2)
    keep = (np.abs(kx) < n / 3) & (np.abs(row) < n / 3)
    damp = HYPER * ((kx ** 2 + row ** 2) / (n / 3) ** 2) ** 2
    rng = np.random.default_rng(seed)
    temp = np.fft.rfft2(rng.standard_normal((n, n))) * np.exp(-((np.sqrt(k2) - k0) / (0.4 * k0)) ** 2) * keep
    temp[0, 0] = 0.0
    temp /= np.fft.irfft2(temp).std()
    vort = np.zeros_like(temp)

    def rates(vort, temp):
        psi = vort / lap
        u, v = np.fft.irfft2(1j * ky * psi), np.fft.irfft2(-1j * kx * psi)

        def carried(f):
            return np.fft.rfft2(u * np.fft.irfft2(1j * kx * f) + v * np.fft.irfft2(1j * ky * f)) * keep
        return BUOYANCY * 1j * kx * temp - carried(vort), -carried(temp), max(np.abs(u).max(), np.abs(v).max() * stretch)

    t = 0.0
    while t < t_end:
        d_vort, d_temp, speed = rates(vort, temp)   # speed: cells crossed per unit time x cell width
        dt = min(DT_MAX, CFL * (2 * np.pi / n) / max(speed, 1e-9), t_end - t)
        m_vort, m_temp, _ = rates(vort + 0.5 * dt * d_vort, temp + 0.5 * dt * d_temp)
        fade = np.exp(-damp * dt)
        vort, temp = (vort + dt * m_vort) * fade, (temp + dt * m_temp) * fade
        t += dt
    return temp, vort


def field(spec):
    """Spectrum -> SIZE x SIZE field (zero-padded, so upsampling stays periodic and band-limited)."""
    n, h = spec.shape[0], spec.shape[0] // 2
    out = np.zeros((SIZE, SIZE // 2 + 1), complex)
    out[:h, :h], out[-h:, :h] = spec[:h, :h], spec[-h:, :h]
    return np.fft.irfft2(out, s=(SIZE, SIZE)) * (SIZE / n) ** 2


def unit(a, lo, hi):
    """Stretch the lo..hi percentiles of a to 0..1."""
    p0, p1 = np.percentile(a, (lo, hi))
    return np.clip((a - p0) / (p1 - p0), 0.0, 1.0)


def save(path, rgb):
    """rgb: uint8 (h, w, 3), bottom row first. Writes an 8-bit RGB PNG holding IHDR, IDAT and IEND only: Blender's own
    writer adds sRGB, gAMA and cHRM chunks (a colour profile on data) and compresses far less. Each row takes the PNG
    filter with the smallest residual, then zlib level 9."""
    h, w, _ = rgb.shape
    raw = rgb[::-1].reshape(h, w * 3).astype(np.int16)
    left, up, corner = np.zeros_like(raw), np.zeros_like(raw), np.zeros_like(raw)
    left[:, 3:], up[1:], corner[1:, 3:] = raw[:, :-3], raw[:-1], raw[:-1, :-3]
    guess = left + up - corner
    da, db, dc = np.abs(guess - left), np.abs(guess - up), np.abs(guess - corner)
    paeth = np.where((da <= db) & (da <= dc), left, np.where(db <= dc, up, corner))
    rows = np.stack([raw, raw - left, raw - up, raw - (left + up) // 2, raw - paeth]).astype(np.uint8)
    pick = np.abs(rows.astype(np.int8).astype(np.int16)).sum(axis=2).argmin(axis=0)
    data = b"".join(bytes([f]) + rows[f, y].tobytes() for y, f in enumerate(pick))

    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(data, 9)) + chunk(b"IEND", b""))


def load(path):
    img = bpy.data.images.load(path, check_existing=False)
    img.colorspace_settings.name = "Non-Color"
    px = np.empty(img.size[0] * img.size[1] * 4, np.float32)
    img.pixels.foreach_get(px)
    shape = (img.size[1], img.size[0], 4)
    bpy.data.images.remove(img)
    return np.rint(px.reshape(shape)[:, :, :3] * 255).astype(np.uint8)


def main():
    temp, vort = simulate(**TONGUES)
    fine, _ = simulate(**TURBULENCE)
    r = unit(field(temp), 1.0, 99.0)
    g = field(fine)
    g = np.clip(0.5 + (g - g.mean()) / (7.0 * g.std()), 0.0, 1.0)
    b = unit(np.abs(field(vort)), 85.0, 99.6) ** 1.6
    rgb = np.rint(np.dstack([r, g, b]) * 255).astype(np.uint8)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    save(OUT, rgb)
    assert np.array_equal(load(OUT), rgb), "Blender does not decode the PNG to the baked values"

    # Contact sheet, each panel tiled 2 x 2: R and G on top, B and RGB below (rows are stored bottom first).
    os.makedirs(SHEET_DIR, exist_ok=True)
    sheet = os.path.join(SHEET_DIR, "contact-sheet.png")
    grey = [np.repeat(rgb[:, :, c:c + 1], 3, axis=2) for c in range(3)]
    panels = [np.tile(p, (2, 2, 1)) for p in (*grey, rgb)]
    save(sheet, np.vstack([np.hstack(panels[2:]), np.hstack(panels[:2])]))

    size = os.path.getsize(OUT)
    assert size <= MAX_BYTES, f"{size} bytes is over the {MAX_BYTES} byte contract"
    with open(OUT, "rb") as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    print("SUMMARY " + json.dumps({
        "file": os.path.relpath(OUT, REPO), "bytes": size, "sha256": digest, "sheet": sheet,
        "mean": [round(float(c.mean()), 4) for c in (r, g, b)],
    }))


main()
