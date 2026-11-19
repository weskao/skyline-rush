"""The one atlas of the Sky Spiral landmark kit: base colour, normal, occlusion-roughness-metal and emissive.

No render bake: the day look lights the kit at run time, so the maps are composed here with numpy from the scanned
CC0 sets (Poly Haven, sources.json beside build.py, fetched by fetch_sources.py into a cache outside the repo; every
file is checked against its recorded sha256) plus drawn joints, windows, stripes and lamps.

Layout, bottom to top. A band spans the full width, so it repeats along u (glTF's default wrap) and a long member
never stretches it; across a band, faces are laid out mirrored (build/mesh.py), so its two edges carry a joint.
  shell   tower cladding, 20 px/m: the panel scan at megastructure size, ring and upright joints, window slots
  panel   white painted plate, 40 px/m: struts, platform hulls, station walls
  metal   the same plate, dark: decks, gantries, masts
  peak    rock below, snow above: u once round the peak, v its height
  swatch  cells (no repeat): cloud gradient, blue lamp, hazard stripes, chevron board, lit windows, white, dark

Albedos are linear and deliberately under 0.62: the day sun and sky put about three times a flat upward face's
albedo on screen (assets-src/coast-boats/asset-brief.md), so brighter whites clip and bloom.
"""
import hashlib
import json
import os
from pathlib import Path

import bpy
import numpy as np

HERE = Path(__file__).resolve().parent.parent
CACHE = Path(os.environ.get("POLYHAVEN_CACHE") or Path.home() / ".cache" / "skyline-rush" / "polyhaven")
SIZE = 2048
PAD = 3   # texels kept clear inside every band and cell edge (mip bleed)
# name: (first row, rows, texels per metre)
BANDS = dict(shell=(0, 640, 20.0), panel=(640, 384, 40.0), metal=(1024, 192, 40.0), peak=(1216, 448, None))
SWATCH = (1664, 384)
# name: (first column, columns, rows used)
CELLS = dict(cloud=(0, 128, 384), blue=(128, 128, 384), hazard=(256, 256, 384), chevron=(512, 512, 256),
             windows=(1024, 256, 384), white=(1280, 64, 384), dark=(1344, 64, 384), grey=(1408, 64, 384))
WHITE, GREY, DARK = (0.60, 0.61, 0.62), (0.34, 0.35, 0.37), (0.085, 0.09, 0.10)
METAL = (0.20, 0.21, 0.225)        # decks and gantries: flat upward faces stay well under 0.5
CLOUD_TOP, CLOUD_BASE, SNOW = (0.48, 0.485, 0.49), (0.25, 0.29, 0.37), (0.52, 0.54, 0.57)
BLUE = (0.0395, 0.402, 1.0)        # linear; sRGB 56, 170, 255: the kit's only lamp colour
LAMPS = dict(strip=1.0, chevron=1.0, beacon=1.0, window=0.45)   # share of BLUE the emissive atlas stores
LUMA = np.array((0.2126, 0.7152, 0.0722), np.float32)


def to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4).astype(np.float32)


def to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def scan(set_id, key):
    """One 1k map of a recorded set as rows-from-the-bottom floats (file values, undecoded)."""
    record = json.loads((HERE / "sources.json").read_text(encoding="utf-8"))
    entry = next(f for s in record["sets"] if s["id"] == set_id for f in s["files"] if f["map"] == key)
    path = CACHE / entry["path"]
    assert path.exists(), f"{path} is missing: run python3 -I assets-src/spiral-landmarks/fetch_sources.py"
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry["sha256"], f"{entry['path']}: sha256 differs from sources.json"
    image = bpy.data.images.load(str(path))
    image.colorspace_settings.name = "Non-Color"
    w, h = image.size
    pixels = np.empty(w * h * 4, np.float32)
    image.pixels.foreach_get(pixels)
    bpy.data.images.remove(image)
    return pixels.reshape(h, w, 4)[..., :3]


def tile(image, px, rows, cols, shift=(0, 0)):
    """The scan box-filtered to px a side, repeated over rows x cols."""
    f = image.shape[0] // px
    small = image.reshape(px, f, px, f, 3).mean(axis=(1, 3))
    small = np.roll(small, shift, axis=(0, 1))
    return np.tile(small, (-(-rows // px), -(-cols // px), 1))[:rows, :cols]


def blur(a, n=2):
    for _ in range(n):
        a = (a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 5
    return a


def joints(rows, cols, every_u, every_v, width=3):
    """1 on the joint lines: every `every_u` columns, every `every_v` rows and both band edges."""
    y, x = np.mgrid[0:rows, 0:cols]
    du = np.minimum(x % every_u, every_u - x % every_u)
    dv = np.minimum(y % every_v, every_v - y % every_v)
    return ((du < width / 2) | (dv < width / 2) | (y < width / 2) | (y >= rows - width / 2)).astype(np.float32)


def surface(set_id, px, rows, cols, tint, paint, strength, shift=(0, 0)):
    """A scan as a painted surface: the tint lit and darkened by the scan's own light and dark (`paint` of it),
    times its occlusion. Returns (albedo, normal xy, occlusion, roughness)."""
    diffuse = to_linear(tile(scan(set_id, "Diffuse"), px, rows, cols, shift))
    arm = tile(scan(set_id, "arm"), px, rows, cols, shift)
    normal = (tile(scan(set_id, "nor_gl"), px, rows, cols, shift)[..., :2] - 0.5) * 2 * strength
    luma = diffuse @ LUMA
    detail = 1 - paint + paint * luma / luma.mean()
    albedo = np.asarray(tint, np.float32) * (detail * (0.55 + 0.45 * arm[..., 0]))[..., None]
    return albedo, normal, arm[..., 0], arm[..., 1]


def groove(normal, mask, depth=1.6):
    """Adds the relief of a recessed `mask` to a normal map's xy."""
    soft = blur(mask)
    normal[..., 0] += (np.roll(soft, -1, 1) - np.roll(soft, 1, 1)) * depth
    normal[..., 1] += (np.roll(soft, -1, 0) - np.roll(soft, 1, 0)) * depth


def chevrons(rows, cols):
    """(board frame, chevrons) masks: three chevrons pointing +u."""
    y, x = np.mgrid[0:rows, 0:cols].astype(np.float32)
    frame = (x < 12) | (x >= cols - 12) | (y < 12) | (y >= rows - 12)
    off = np.abs(y - rows / 2)
    along, pitch = x + 0.9 * off - 70, cols * 0.29   # an arm trails 0.9 texel back per texel off the centre line
    mark = (along % pitch > 40) & (along % pitch < 98) & (along // pitch >= 0) & (along // pitch < 3) & (off < rows * 0.34)
    return frame.astype(np.float32), mark.astype(np.float32)


def compose():
    """The four maps at SIZE, rows from the bottom: (albedo, normal xy, occlusion-roughness-metal, emissive), linear."""
    albedo = np.zeros((SIZE, SIZE, 3), np.float32)
    normal = np.zeros((SIZE, SIZE, 2), np.float32)
    orm = np.zeros((SIZE, SIZE, 3), np.float32)
    orm[..., 0], orm[..., 1] = 1.0, 0.6
    emissive = np.zeros((SIZE, SIZE, 3), np.float32)

    def band(name, set_id, px, tint, paint, strength, rough, seams=None, shift=(0, 0)):
        r0, rows, _ = BANDS[name]
        a, n, occ, scan_rough = surface(set_id, px, rows, SIZE, tint, paint, strength, shift)
        if seams:
            mask = joints(rows, SIZE, *seams)
            a *= (1 - 0.6 * mask - 0.25 * blur(mask, 6))[..., None]
            groove(n, mask)
            occ = occ * (1 - 0.5 * blur(mask, 4))
        albedo[r0:r0 + rows], normal[r0:r0 + rows] = a, n
        orm[r0:r0 + rows, :, 0], orm[r0:r0 + rows, :, 1] = occ, np.clip(rough * 0.6 + scan_rough * 0.4, 0, 1)
        return slice(r0, r0 + rows)

    # shell: the panel scan at 25.6 m a tile; a ring joint every 12.8 m of height (u), an upright one every 16 m (v)
    shell = band("shell", "concrete_panels", 512, WHITE, 0.5, 0.9, 0.55, seams=(256, 320, 4))
    y, x = np.mgrid[0:640, 0:SIZE]
    slot = ((x // 256) % 2 == 0) & (np.abs(x % 256 - 128) < 36) & (np.abs(y % 80 - 40) < 14) & (y > 20) & (y < 620)
    albedo[shell][slot] = (0.025, 0.035, 0.05)    # window slots, 3.6 m tall: what tells the eye the tower's size
    orm[shell, :, 1][slot] = 0.12
    groove(normal[shell], slot.astype(np.float32), 1.0)
    band("panel", "blue_metal_plate", 512, WHITE, 0.45, 0.8, 0.45, seams=(256, 192, 3))
    band("metal", "blue_metal_plate", 512, METAL, 0.5, 0.8, 0.4, seams=(512, 96, 3), shift=(190, 300))

    # peak: rock, then snow above a ragged line that follows the rock's own light and dark
    r0, rows, _ = BANDS["peak"]
    rock, rock_n, rock_occ, rock_rough = surface("aerial_rocks_02", 512, rows, SIZE, (0.30, 0.31, 0.34), 0.9, 1.0)
    snow, snow_n, snow_occ, _ = surface("snow_field_aerial", 512, rows, SIZE, SNOW, 0.35, 0.6, shift=(90, 40))
    height = np.linspace(0, 1, rows, dtype=np.float32)[:, None]
    u = np.linspace(0, 2 * np.pi, SIZE, endpoint=False, dtype=np.float32)[None, :]
    line = 0.36 + 0.07 * np.sin(3 * u + 1.0) + 0.05 * np.sin(7 * u + 2.3) + 0.03 * np.sin(13 * u)
    crag = blur(rock @ LUMA / (rock @ LUMA).mean() - 1, 3)
    cover = np.clip((height - line + 0.22 * crag) * 9, 0, 1)
    albedo[r0:r0 + rows] = rock + (snow - rock) * cover[..., None]
    normal[r0:r0 + rows] = rock_n + (snow_n - rock_n) * cover[..., None]
    orm[r0:r0 + rows, :, 0] = rock_occ + (snow_occ - rock_occ) * cover
    orm[r0:r0 + rows, :, 1] = np.clip(rock_rough * 0.5 + 0.45, 0, 1) * (1 - cover) + 0.85 * cover

    def cell(name):
        c0, cols, rows_used = CELLS[name]
        return slice(SWATCH[0], SWATCH[0] + rows_used), slice(c0, c0 + cols)

    albedo[SWATCH[0]:] = GREY
    rise = np.linspace(0, 1, 384, dtype=np.float32)[:, None, None] ** 0.7   # cloud: grey-blue underside to white top
    albedo[cell("cloud")] = np.array(CLOUD_BASE, np.float32) * (1 - rise) + np.array(CLOUD_TOP, np.float32) * rise
    orm[cell("cloud") + (1,)] = 1.0
    albedo[cell("blue")], emissive[cell("blue")] = (0.03, 0.12, 0.30), BLUE
    orm[cell("blue") + (1,)] = 0.3
    y, x = np.mgrid[0:384, 0:256]
    albedo[cell("hazard")] = np.where((((x + y) // 32) % 2 == 0)[..., None], (0.52, 0.34, 0.015), (0.015, 0.015, 0.018))
    frame, mark = chevrons(256, 512)
    board = np.array((0.012, 0.03, 0.085), np.float32) * (1 - frame[..., None]) + np.array(WHITE, np.float32) * frame[..., None]
    albedo[cell("chevron")] = board * (1 - mark[..., None]) + np.array((0.10, 0.30, 0.60), np.float32) * mark[..., None]
    emissive[cell("chevron")] = np.array(BLUE, np.float32) * LAMPS["chevron"] * mark[..., None]
    y, x = np.mgrid[0:384, 0:256]
    mullion = (x % 32 < 4) | (y < 10) | (y >= 374)
    lit = ((x // 32) % 3 == 1) & ~mullion
    albedo[cell("windows")] = np.where(mullion[..., None], GREY, (0.02, 0.03, 0.045))
    emissive[cell("windows")] = np.array(BLUE, np.float32) * LAMPS["window"] * lit[..., None]
    orm[cell("windows") + (1,)] = np.where(mullion, 0.5, 0.1)
    albedo[cell("white")], albedo[cell("dark")], albedo[cell("grey")] = WHITE, DARK, GREY
    orm[cell("white") + (1,)], orm[cell("dark") + (1,)], orm[cell("grey") + (1,)] = 0.5, 0.45, 0.55
    return albedo, normal, orm, emissive


def save(name, rgb, colorspace, file_format):
    """8-bit file under textures/ (values written as given), returned as the image the shipped material samples."""
    size = rgb.shape[0]
    image = bpy.data.images.new(name, size, size, alpha=False)
    image.colorspace_settings.name = colorspace
    pixels = np.ones((size, size, 4), np.float32)
    pixels[..., :3] = np.clip(rgb, 0, 1)
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw = str(HERE / "textures" / f"{name}.{'jpg' if file_format == 'JPEG' else 'png'}")
    image.file_format = file_format
    image.save(quality=92)
    return image


def half(a):
    return a.reshape(a.shape[0] // 2, 2, a.shape[1] // 2, 2, -1).mean(axis=(1, 3))


def build(name="spiral_landmarks"):
    """Writes the four textures; returns (images, measurements for contract.json)."""
    albedo, normal_xy, orm, emissive = compose()
    xy = half(normal_xy)
    z = np.sqrt(np.clip(1 - (xy ** 2).sum(-1), 0.05, 1))
    unit = np.dstack((xy, z)) / np.linalg.norm(np.dstack((xy, z)), axis=-1, keepdims=True)
    (HERE / "textures").mkdir(exist_ok=True)
    images = dict(base=save(f"{name}_basecolor", to_srgb(albedo), "sRGB", "JPEG"),
                  normal=save(f"{name}_normal", unit * 0.5 + 0.5, "Non-Color", "PNG"),
                  orm=save(f"{name}_orm", half(orm), "Non-Color", "PNG"),
                  emissive=save(f"{name}_emissive", to_srgb(half(emissive)), "sRGB", "PNG"))   # JPEG speckles the black
    (c0, cols, rows), (p0, prows, _) = CELLS["cloud"], BANDS["peak"]
    assert not emissive[SWATCH[0]:SWATCH[0] + rows, c0:c0 + cols].any() and not emissive[p0:p0 + prows].any(), "a lamp on the clouds or the peak"
    luma = float(np.asarray(BLUE) @ LUMA)
    stats = dict(textures={k: dict(file=f"textures/{Path(i.filepath_raw).name}", px=i.size[0]) for k, i in images.items()},
                 lamps={k: dict(linear=[round(c * level, 4) for c in BLUE], luminance=round(luma * level, 4)) for k, level in LAMPS.items()},
                 albedo=dict(white=list(WHITE), deck=list(METAL), cloud_top=list(CLOUD_TOP), cloud_underside=list(CLOUD_BASE), peak_snow=list(SNOW)),
                 lit_texel_share=round(float((emissive.max(-1) > 0).mean()), 5),
                 # atlas rects (u0, v0, u1, v1, v up) with no emissive texel: all the clouds and the peak sample
                 unlit=dict(cloud=[round(c, 5) for c in cell_uv("cloud")], peak=[0, round(band_uv("peak")[0], 5), 1, round(band_uv("peak")[1], 5)]))
    return images, stats


def band_uv(name):
    """(v0, v1, metres along one u repeat, metres across the band) for a repeating band."""
    r0, rows, density = BANDS[name]
    return (r0 + PAD) / SIZE, (r0 + rows - PAD) / SIZE, SIZE / density if density else None, rows / density if density else None


def cell_uv(name):
    """(u0, v0, u1, v1) of a swatch cell, inset."""
    c0, cols, rows = CELLS[name]
    return (c0 + PAD) / SIZE, (SWATCH[0] + PAD) / SIZE, (c0 + cols - PAD) / SIZE, (SWATCH[0] + rows - PAD) / SIZE
