"""Atlas cells of the Neon city kit: one UV layout shared by the colour, emissive, ORM and normal atlases.

A Cell is a small canvas addressed in metres from its bottom-left corner (y up). Tileable cells are packed
with wrapped gutters, so a mesh cut at cell boundaries repeats them without seams or mip bleed. Colour and
emissive are painted as sRGB-encoded values (what the JPEG stores); ORM, height and normals are linear.
"""
import hashlib
import json
import os

import bpy
import numpy as np

SIZE = 2048    # colour + emissive atlas px; ORM and normal are saved at half that
GUTTER = 16    # px around every cell: survives to the 128 px mip
BUMP = 0.35    # painted height (m) to normal-map slope


def blur(a, r, wrap=(False, False)):
    """Three box passes of radius r px (close to a Gaussian); wrap = (x, y) tileable axes."""
    if r < 1:
        return a
    for _ in range(3):
        for axis, tiles in ((1, wrap[0]), (0, wrap[1])):
            pad = [(0, 0)] * a.ndim
            pad[axis] = (r + 1, r)
            c = np.cumsum(np.pad(a, pad, mode="wrap" if tiles else "edge"), axis=axis, dtype=np.float64)
            n = a.shape[axis]
            a = ((np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, np.arange(n), axis=axis))
                 / (2 * r + 1)).astype(np.float32)
    return a


def seg(x, y, ax, ay, bx, by):
    """Distance field (m) to the segment a-b."""
    dx, dy = bx - ax, by - ay
    t = np.clip(((x - ax) * dx + (y - ay) * dy) / max(dx * dx + dy * dy, 1e-9), 0, 1)
    return np.hypot(x - ax - t * dx, y - ay - t * dy)


class Scans:
    """Poly Haven map sets from the cache, each file checked against the sha256 recorded in sources.json."""

    def __init__(self, cache, record):
        with open(record, encoding="utf-8") as f:
            sets = json.load(f)["sets"]
        self.paths = {}
        for entry in sets:
            for rec in entry["files"]:
                path = os.path.join(cache, *rec["path"].split("/"))
                if not os.path.exists(path):
                    raise SystemExit(f"{rec['path']}: missing, run assets-src/neon-city/fetch_sources.py")
                with open(path, "rb") as f:
                    if hashlib.sha256(f.read()).hexdigest() != rec["sha256"]:
                        raise SystemExit(f"{rec['path']}: sha256 differs from sources.json")
                self.paths[entry["id"], rec["map"]] = path

    def load(self, asset, key, w, h):
        """One map resampled to w x h, rows top first, values as stored (no colour transform)."""
        img = bpy.data.images.load(self.paths[asset, key])
        img.scale(w, h)
        px = np.empty(w * h * 4, np.float32)
        img.pixels.foreach_get(px)
        bpy.data.images.remove(img)
        return px.reshape(h, w, 4)[::-1, :, :3].copy()


class Cell:
    def __init__(self, name, px, metres, tile=(False, False), solid=False):
        self.name, (self.w, self.h), (self.mw, self.mh), self.tile, self.solid = name, px, metres, tile, solid
        self.x = self.y = 0
        shape = (self.h, self.w)
        self.col = np.full(shape + (3,), 0.05, np.float32)
        self.emi = np.zeros(shape + (3,), np.float32)
        self.rough = np.full(shape, 0.8, np.float32)
        self.metal = np.zeros(shape, np.float32)
        self.ao = np.ones(shape, np.float32)
        self.height = np.zeros(shape, np.float32)
        self.nxy = np.zeros(shape + (2,), np.float32)

    def span(self, x0, y0, x1, y1):
        """Pixel slices of a rectangle given in metres."""
        sx, sy = self.w / self.mw, self.h / self.mh
        rows = slice(max(self.h - int(round(y1 * sy)), 0), max(self.h - int(round(y0 * sy)), 0))
        return rows, slice(max(int(round(x0 * sx)), 0), max(int(round(x1 * sx)), 0))

    def rect(self, x0, y0, x1, y1, col=None, emi=None, rough=None, metal=None, height=None, ao=None, flat=False):
        s = self.span(x0, y0, x1, y1)
        for layer, value in ((self.col, col), (self.emi, emi), (self.rough, rough), (self.metal, metal),
                             (self.height, height), (self.ao, ao)):
            if value is not None:
                layer[s] = value
        if flat:
            self.nxy[s] = 0
        return s

    def grid(self):
        """Metre coordinates (x, y) of every pixel centre."""
        return np.meshgrid((np.arange(self.w) + 0.5) * self.mw / self.w,
                           (self.h - np.arange(self.h) - 0.5) * self.mh / self.h)

    def cover(self, dist):
        """Antialiased coverage of a signed distance field in metres."""
        return np.clip(0.5 - dist * self.w / self.mw, 0, 1)

    def glow(self, mask, colour, level=1.0):
        self.emi = np.maximum(self.emi, mask[..., None] * (np.asarray(colour, np.float32) * level))

    def tint(self, mask, colour):
        self.col = self.col * (1 - mask[..., None]) + mask[..., None] * np.asarray(colour, np.float32)

    def halo(self, metres, gain):
        """Light spilling from the emitters onto the surface around them."""
        self.emi = self.emi + gain * blur(self.emi, int(metres * self.w / self.mw), self.tile)

    def scan(self, scans, asset, kx, ky, tint=(1, 1, 1), rough=(0.0, 1.0), box=None):
        """Fill the cell (or box, metres) with kx x ky repeats of a scan: colour, normal, AO, roughness, metal."""
        tw, th = max(round(self.w / kx), 1), max(round(self.h / ky), 1)
        ix = (np.arange(self.w) * kx * tw // self.w) % tw
        iy = (np.arange(self.h) * ky * th // self.h) % th
        pick = lambda key: scans.load(asset, key, tw, th)[iy][:, ix]  # noqa: E731
        s = self.span(*box) if box else (slice(None), slice(None))
        arm = pick("arm")[s]
        self.col[s] = pick("Diffuse")[s] * np.asarray(tint, np.float32)
        self.nxy[s] = pick("nor_gl")[s][..., :2] * 2 - 1
        self.ao[s], self.metal[s] = arm[..., 0], arm[..., 2]
        self.rough[s] = rough[0] + (rough[1] - rough[0]) * arm[..., 1]

    def normal(self):
        """Tangent-space normal (OpenGL, +Y up the image) from the scan normal plus the painted height."""
        hgt, px = blur(self.height, 1, self.tile), self.mw / self.w
        dx = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) / (2 * px) if self.tile[0] else np.gradient(hgt, axis=1) / px
        dy = (np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)) / (2 * px) if self.tile[1] else np.gradient(hgt, axis=0) / px
        n = np.dstack([self.nxy[..., 0] - BUMP * dx, self.nxy[..., 1] + BUMP * dy, np.ones_like(hgt)])
        return n / np.linalg.norm(n, axis=2, keepdims=True) * 0.5 + 0.5

    def emissive_range(self, strength):
        """(lit-area mean, peak) linear luminance after the material's emissive strength."""
        lin = np.where(self.emi <= 0.04045, self.emi / 12.92, ((self.emi + 0.055) / 1.055) ** 2.4).clip(0, 1)
        lum = (lin * (0.2126, 0.7152, 0.0722)).sum(axis=2) * strength
        lit = lum[lum > 0.02 * strength]
        return (round(float(lit.mean()), 2), round(float(lum.max()), 2)) if lit.size else (0.0, 0.0)


class Atlas:
    def __init__(self, scans):
        self.scans, self.cells = scans, {}

    def cell(self, name, px, metres, tile=(False, False), solid=False):
        self.cells[name] = Cell(name, px, metres, tile, solid)
        return self.cells[name]

    def pack(self):
        """Shelf packing, tallest first: deterministic for a given cell list."""
        x = y = shelf = 0
        for c in sorted(self.cells.values(), key=lambda c: (-c.h, -c.w, c.name)):
            if x + c.w + 2 * GUTTER > SIZE:
                x, y, shelf = 0, y + shelf, 0
            c.x, c.y = x + GUTTER, y + GUTTER
            x, shelf = x + c.w + 2 * GUTTER, max(shelf, c.h + 2 * GUTTER)
        if y + shelf > SIZE:
            raise SystemExit(f"atlas overflow: {y + shelf} px of {SIZE}")
        return (y + shelf) / SIZE

    def uv(self, name, u, v):
        c = self.cells[name]
        if c.solid:  # flat swatch: sample its middle, whatever the face size
            u, v = 0.25 + 0.5 * min(u, 1.0), 0.25 + 0.5 * min(v, 1.0)
        return (c.x + u * c.w) / SIZE, 1 - (c.y + (1 - v) * c.h) / SIZE

    def compose(self):
        maps = {"color": np.full((SIZE, SIZE, 3), 0.04, np.float32), "emissive": np.zeros((SIZE, SIZE, 3), np.float32),
                "orm": np.full((SIZE, SIZE, 3), (1.0, 0.8, 0.0), np.float32),
                "normal": np.full((SIZE, SIZE, 3), (0.5, 0.5, 1.0), np.float32)}
        for c in self.cells.values():
            layers = {"color": c.col, "emissive": c.emi, "orm": np.dstack([c.ao, c.rough, c.metal]), "normal": c.normal()}
            for key, layer in layers.items():
                for axis, tiles in ((1, c.tile[0]), (0, c.tile[1])):
                    pad = [(0, 0)] * 3
                    pad[axis] = (GUTTER, GUTTER)
                    layer = np.pad(layer, pad, mode="wrap" if tiles else "edge")
                maps[key][c.y - GUTTER:c.y + c.h + GUTTER, c.x - GUTTER:c.x + c.w + GUTTER] = layer
        for key in ("orm", "normal"):  # half size: 2 x 2 box filter
            maps[key] = maps[key].reshape(SIZE // 2, 2, SIZE // 2, 2, 3).mean(axis=(1, 3))
        return {key: np.clip(m, 0, 1) for key, m in maps.items()}


def save_image(pixels, name, folder, colorspace, fmt):
    """Rows-top-first RGB array to an image file; the datablock keeps that path (made relative by the master write)."""
    h, w = pixels.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.colorspace_settings.name = colorspace
    img.pixels.foreach_set(np.dstack([pixels[::-1], np.ones((h, w, 1), np.float32)]).astype(np.float32).ravel())
    path = os.path.join(folder, f"{name}.{'jpg' if fmt == 'JPEG' else 'png'}")
    img.filepath_raw, img.file_format = path, fmt
    img.save(filepath=path, quality=92) if fmt == "JPEG" else img.save(filepath=path)
    img.filepath, img.source = path, "FILE"
    img.reload()
    return img


def make_material(name, images, strength):
    """The kit's single material. Wiring the glTF exporter maps 1:1: colour, emissive (strength > 1 becomes
    KHR_materials_emissive_strength), one ORM image (R occlusion, G roughness, B metal) and a normal map."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")

    def tex(key):
        node = nt.nodes.new("ShaderNodeTexImage")
        node.image = images[key]
        return node.outputs["Color"]

    nt.links.new(tex("color"), bsdf.inputs["Base Color"])
    nt.links.new(tex("emissive"), bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = strength
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tex("orm"), sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    group = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")  # exporter's occlusion socket
    group.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    out = nt.nodes.new("ShaderNodeGroup")
    out.node_tree = group
    nt.links.new(sep.outputs["Red"], out.inputs["Occlusion"])
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(tex("normal"), nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    return mat
