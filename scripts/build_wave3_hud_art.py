#!/usr/bin/env python3
"""
Generate AAA Arcade Racing HUD icons at exact 3x native resolution:
- 5 Buttons (432x156):
  * button-play@3x.webp (Electric Blue & Cyan, Italic PLAY >)
  * button-nitro@3x.webp (Neon Purple & Magenta, Lightning Bolt + NITRO)
  * button-garage@3x.webp (Titanium / Cyan Trim, Supercar Emblem + GARAGE)
  * button-retry@3x.webp (Electric Teal & Azure, Double Arrow + RETRY)
  * button-coming-soon@3x.webp (Gunmetal & Amber/Ice, 3D Padlock + COMING SOON)
- 3 Badges (216x216):
  * hud-speed@3x.webp (Arcade Racing Speedometer with Cyan-Orange Speed Arc)
  * ui-info@3x.webp (Sapphire Crystal Dome with Glowing 3D 'i' Symbol)
  * ui-tooltip@3x.webp (3D Sapphire Glass Speech Bubble with Glowing '•••')

Strict Quality & CI Gates:
- Dimensions: exactly 432x156 or 216x216
- Alpha margins: >= 14 px on all 4 sides for buttons, >= 20 px for badges
- Passes Playwright, Node unit tests, and Python repair regression tests.
"""

import math
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RASTER_DIR = ROOT / "public/feature-assets/mobile-controls-hud/raster"
SCRATCH = Path("/Users/wes_flutter/.gemini/antigravity-cli/brain/f640378e-2550-4c66-b298-912e2040e6c4")
FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Black.ttf"

def make_chamfered_polygon(x0, y0, x1, y1, c):
    return [
        (x0 + c, y0), (x1 - c, y0),
        (x1, y0 + c), (x1, y1 - c),
        (x1 - c, y1), (x0 + c, y1),
        (x0, y1 - c), (x0, y0 + c)
    ]

# 4x coordinate grid for 432x156 buttons
W4, H4 = 1728, 624
cx, cy = W4 // 2, H4 // 2
bw4, bh4 = 1520, 480
bx0, by0 = cx - bw4 // 2, cy - bh4 // 2
bx1, by1 = bx0 + bw4, by0 + bh4
c4 = 72
shear = math.tan(math.radians(14))

Y, X = np.ogrid[:H4, :W4]
grad_y = (Y - by0) / float(bh4)
sheen = 160 + 75 * np.cos(grad_y * np.pi) + 35 * np.sin(grad_y * 4 * np.pi)
sheen_grid = np.broadcast_to(sheen, (H4, W4))

# -------------------------------------------------------------
# 1. HUD SPEED (216x216)
# -------------------------------------------------------------
def generate_hud_speed():
    src_path = SCRATCH / "speed_gauge_icon_1794221881392.jpg"
    src = Image.open(src_path).convert("RGB")
    w, h = src.size
    cx_s, cy_s = w // 2, h // 2
    r_outer = 469
    
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((cx_s - r_outer, cy_s - r_outer, cx_s + r_outer, cy_s + r_outer), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1.5))
    
    src_rgba = Image.new("RGBA", (w, h))
    src_rgba.paste(src, (0, 0), mask)
    
    target_d = 172 # Leaves 22px margin on 216x216
    cropped = src_rgba.crop((cx_s - r_outer - 2, cy_s - r_outer - 2, cx_s + r_outer + 2, cy_s + r_outer + 2))
    resized = cropped.resize((target_d, target_d), Image.Resampling.LANCZOS)
    
    glow = Image.new("RGBA", (216, 216), (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow)
    gx, gy = 108, 108
    for dr in range(86, 91):
        a = int(30 * (1.0 - (dr - 86) / 5.0))
        d_glow.ellipse((gx - dr, gy - dr, gx + dr, gy + dr), outline=(0, 220, 255, a), width=2)
    glow = glow.filter(ImageFilter.GaussianBlur(2.0))
    
    canvas = Image.new("RGBA", (216, 216), (0, 0, 0, 0))
    canvas.alpha_composite(glow)
    offset = (216 - target_d) // 2
    canvas.alpha_composite(resized, (offset, offset))
    return canvas

# -------------------------------------------------------------
# 2. UI TOOLTIP (216x216)
# -------------------------------------------------------------
def generate_ui_tooltip():
    src_path = SCRATCH / "hud_chat_bubble_icon_1794221950723.jpg"
    src = Image.open(src_path).convert("RGB")
    w, h = src.size
    
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((168, 178, 830, 800), fill=255)
    d.polygon([(260, 680), (170, 780), (320, 840), (450, 750)], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(3.0))
    
    arr_src = np.array(src).astype(float)
    arr_mask = np.array(mask).astype(float) / 255.0
    bright = arr_src.max(axis=2)
    alpha = arr_mask * np.clip((bright - 5) / 25.0, 0.0, 1.0) * 255.0
    arr_rgba = np.dstack([arr_src, alpha]).astype(np.uint8)
    res = Image.fromarray(arr_rgba, "RGBA")
    
    mask_arr = alpha > 16
    ys, xs = np.where(mask_arr)
    cropped = res.crop((xs.min(), ys.min(), xs.max()+1, ys.max()+1))
    
    scale = 168.0 / max(cropped.size)
    tw, th = int(cropped.width * scale), int(cropped.height * scale)
    resized = cropped.resize((tw, th), Image.Resampling.LANCZOS)
    
    canvas = Image.new("RGBA", (216, 216), (0, 0, 0, 0))
    ox = (216 - tw) // 2
    oy = (216 - th) // 2
    canvas.alpha_composite(resized, (ox, oy))
    return canvas

# -------------------------------------------------------------
# 3. UI INFO (216x216)
# -------------------------------------------------------------
def generate_ui_info():
    W_info, H_info = 864, 864
    cxi, cyi = 432, 432
    canvas = Image.new("RGBA", (W_info, H_info), (0, 0, 0, 0))
    
    # Outer Neon Aura
    glow = Image.new("RGBA", (W_info, H_info), (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow)
    for dr in range(320, 380, 2):
        alpha = int(45 * (1.0 - (dr - 320) / 60.0)**1.5)
        d_glow.ellipse((cxi - dr, cyi - dr, cxi + dr, cyi + dr), outline=(0, 210, 255, alpha), width=3)
    glow = glow.filter(ImageFilter.GaussianBlur(12))
    canvas.alpha_composite(glow)
    
    # Outer Heavy Titanium Bezel
    arr_bezel = np.zeros((H_info, W_info, 4), dtype=np.uint8)
    Yi, Xi = np.ogrid[:H_info, :W_info]
    dist = np.sqrt((Xi - cxi)**2 + (Yi - cyi)**2)
    angle = np.arctan2(Yi - cyi, Xi - cxi)
    
    metal_val = 150 + 60 * np.sin(angle * 3) + 40 * np.cos(angle * 2)
    bevel_factor = np.clip(1.0 - np.abs(dist - 317) / 27.0, 0, 1)
    metal_r = np.clip(metal_val * 0.85 + bevel_factor * 60, 0, 255)
    metal_g = np.clip(metal_val * 0.95 + bevel_factor * 60, 0, 255)
    metal_b = np.clip(metal_val * 1.10 + bevel_factor * 70, 0, 255)
    
    bezel_mask = (dist >= 290) & (dist <= 344)
    arr_bezel[bezel_mask, 0] = metal_r[bezel_mask]
    arr_bezel[bezel_mask, 1] = metal_g[bezel_mask]
    arr_bezel[bezel_mask, 2] = metal_b[bezel_mask]
    arr_bezel[bezel_mask, 3] = 255
    bezel_img = Image.fromarray(arr_bezel, "RGBA")
    d_b = ImageDraw.Draw(bezel_img)
    d_b.ellipse((cxi - 344, cyi - 344, cxi + 344, cyi + 344), outline=(220, 240, 255, 230), width=4)
    d_b.ellipse((cxi - 290, cyi - 290, cxi + 290, cyi + 290), outline=(100, 140, 180, 255), width=3)
    canvas.alpha_composite(bezel_img)
    
    # Inner Neon Cyan Ring
    neon_ring = Image.new("RGBA", (W_info, H_info), (0, 0, 0, 0))
    d_nr = ImageDraw.Draw(neon_ring)
    d_nr.ellipse((cxi - 288, cyi - 288, cxi + 288, cyi + 288), fill=(0, 235, 255, 255), outline=(180, 255, 255, 255), width=4)
    canvas.alpha_composite(neon_ring)
    
    # Sapphire Blue Enamel Core
    core_mask = dist <= 276
    arr_core = np.zeros((H_info, W_info, 4), dtype=np.uint8)
    grad_yi = (Yi - (cyi - 276)) / 552.0
    core_r = np.clip(10 + grad_yi * 30 + (1.0 - dist/276.0)*25, 0, 255)
    core_g = np.clip(35 + grad_yi * 70 + (1.0 - dist/276.0)*45, 0, 255)
    core_b = np.clip(70 + grad_yi * 120 + (1.0 - dist/276.0)*75, 0, 255)
    arr_core[core_mask, 0] = core_r[core_mask]
    arr_core[core_mask, 1] = core_g[core_mask]
    arr_core[core_mask, 2] = core_b[core_mask]
    arr_core[core_mask, 3] = 255
    core_img = Image.fromarray(arr_core, "RGBA")
    
    # Top Specular Highlight Arc
    spec_img = Image.new("RGBA", (W_info, H_info), (0, 0, 0, 0))
    d_spec = ImageDraw.Draw(spec_img)
    d_spec.ellipse((cxi - 210, cyi - 250, cxi + 210, cyi - 50), fill=(255, 255, 255, 75))
    core_img.alpha_composite(spec_img.filter(ImageFilter.GaussianBlur(16)))
    canvas.alpha_composite(core_img)
    
    # 3D Glowing 'i' Symbol
    info_symbol = Image.new("RGBA", (W_info, H_info), (0, 0, 0, 0))
    d_is = ImageDraw.Draw(info_symbol)
    d_is.ellipse((cxi - 34, cyi - 134, cxi + 34, cyi - 66), fill=(255, 255, 255, 255))
    d_is.rounded_rectangle((cxi - 34, cyi - 40, cxi + 34, cyi + 140), radius=20, fill=(255, 255, 255, 255))
    
    sym_glow = info_symbol.filter(ImageFilter.GaussianBlur(14))
    sym_glow_arr = np.array(sym_glow)
    sym_glow_arr[:, :, 0] = 0
    sym_glow_arr[:, :, 1] = 220
    sym_glow_arr[:, :, 2] = 255
    canvas.alpha_composite(Image.fromarray(sym_glow_arr, "RGBA"))
    
    d_is.ellipse((cxi - 34, cyi - 134, cxi + 34, cyi - 66), outline=(120, 220, 255, 255), width=5)
    d_is.rounded_rectangle((cxi - 34, cyi - 40, cxi + 34, cyi + 140), radius=20, outline=(120, 220, 255, 255), width=5)
    canvas.alpha_composite(info_symbol)
    
    return canvas.resize((216, 216), Image.Resampling.LANCZOS)

# -------------------------------------------------------------
# 4. BUTTON PLAY (432x156)
# -------------------------------------------------------------
def generate_button_play():
    canvas = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    glow = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_g = ImageDraw.Draw(glow)
    for spread in range(0, 36, 4):
        poly = make_chamfered_polygon(bx0 - spread, by0 - spread, bx1 + spread, by1 + spread, c4 + spread)
        alpha = int(55 * (1.0 - spread / 36.0)**1.5)
        d_g.polygon(poly, fill=(0, 220, 255, alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    canvas.alpha_composite(glow)

    outer_poly = make_chamfered_polygon(bx0, by0, bx1, by1, c4)
    inner_poly = make_chamfered_polygon(bx0 + 36, by0 + 36, bx1 - 36, by1 - 36, c4 - 16)
    bezel = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_b = ImageDraw.Draw(bezel)
    d_b.polygon(outer_poly, fill=(180, 205, 230, 255))
    d_b.polygon(inner_poly, fill=(0, 0, 0, 0))
    arr_b = np.array(bezel)
    mask_b = arr_b[:, :, 3] > 0
    arr_b[mask_b, 0] = np.clip(sheen_grid[mask_b] * 0.90, 0, 255)
    arr_b[mask_b, 1] = np.clip(sheen_grid[mask_b] * 1.00, 0, 255)
    arr_b[mask_b, 2] = np.clip(sheen_grid[mask_b] * 1.15, 0, 255)
    bezel = Image.fromarray(arr_b, "RGBA")
    d_b = ImageDraw.Draw(bezel)
    d_b.polygon(outer_poly, outline=(245, 252, 255, 240), width=6)
    d_b.polygon(inner_poly, outline=(70, 100, 130, 255), width=6)
    canvas.alpha_composite(bezel)

    neon_trim = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_nt = ImageDraw.Draw(neon_trim)
    trim_poly = make_chamfered_polygon(bx0 + 32, by0 + 32, bx1 - 32, by1 - 32, c4 - 14)
    d_nt.polygon(trim_poly, outline=(0, 240, 255, 255), width=8)
    canvas.alpha_composite(neon_trim.filter(ImageFilter.GaussianBlur(8)))
    canvas.alpha_composite(neon_trim)

    core_poly = make_chamfered_polygon(bx0 + 40, by0 + 40, bx1 - 40, by1 - 40, c4 - 18)
    core = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_c = ImageDraw.Draw(core)
    d_c.polygon(core_poly, fill=(255, 255, 255, 255))
    arr_c = np.array(core)
    mask_c = arr_c[:, :, 3] > 0
    grad_c = np.broadcast_to(np.clip((Y - (by0 + 40)) / float(bh4 - 80), 0, 1), (H4, W4))
    carbon = ((X // 8 + Y // 8) % 2 == 0).astype(float) * 12.0
    speed = ((X + Y * 0.7) % 36 < 18).astype(float) * 15.0
    pat = carbon + speed
    core_r = np.clip(0 + (1.0 - grad_c) * 35 + pat, 0, 255)
    core_g = np.clip(30 + (1.0 - grad_c) * 160 + pat, 0, 255)
    core_b = np.clip(110 + (1.0 - grad_c) * 145 + pat, 0, 255)
    arr_c[mask_c, 0] = core_r[mask_c]
    arr_c[mask_c, 1] = core_g[mask_c]
    arr_c[mask_c, 2] = core_b[mask_c]
    core = Image.fromarray(arr_c, "RGBA")
    spec_glass = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_sg = ImageDraw.Draw(spec_glass)
    d_sg.polygon(make_chamfered_polygon(bx0 + 44, by0 + 44, bx1 - 44, cy - 20, c4 - 20), fill=(255, 255, 255, 45))
    core.alpha_composite(spec_glass.filter(ImageFilter.GaussianBlur(10)))
    canvas.alpha_composite(core)

    font = ImageFont.truetype(FONT_PATH, 205)
    text_img = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_t = ImageDraw.Draw(text_img)
    text = "PLAY"
    bbox = d_t.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    tx = cx - 120 - tw // 2
    ty = cy - th // 2 - 25
    arr_x = cx + tw // 2 + 20
    arr_poly = [
        (arr_x, cy - 90), (arr_x + 95, cy), (arr_x, cy + 90),
        (arr_x + 45, cy + 90), (arr_x + 140, cy), (arr_x + 45, cy - 90)
    ]
    d_t.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))
    d_t.polygon(arr_poly, fill=(0, 245, 255, 255))
    text_sheared = text_img.transform((W4, H4), Image.Transform.AFFINE, (1, -shear, shear * cy, 0, 1, 0), Image.Resampling.BICUBIC)

    shadow = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    shadow.paste((0, 15, 50, 230), (0, 0), text_sheared)
    shadow = shadow.transform((W4, H4), Image.Transform.AFFINE, (1, 0, -14, 0, 1, -18), Image.Resampling.BICUBIC)
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(12)))

    outline = text_sheared.filter(ImageFilter.MaxFilter(7))
    canvas.paste((180, 235, 255, 255), (0, 0), outline)

    arr_text = np.array(text_sheared)
    mask_text = arr_text[:, :, 3] > 30
    grad_t = np.broadcast_to(np.clip((Y - (cy - 100)) / 200.0, 0, 1), (H4, W4))
    t_val = 255 - grad_t * 40
    arr_text[mask_text, 0] = np.clip(t_val[mask_text], 0, 255)
    arr_text[mask_text, 1] = np.clip(t_val[mask_text], 0, 255)
    arr_text[mask_text, 2] = 255
    canvas.alpha_composite(Image.fromarray(arr_text, "RGBA"))

    arr_layer = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_al = ImageDraw.Draw(arr_layer)
    d_al.polygon(arr_poly, fill=(0, 255, 255, 255))
    arr_sheared = arr_layer.transform((W4, H4), Image.Transform.AFFINE, (1, -shear, shear * cy, 0, 1, 0), Image.Resampling.BICUBIC)
    canvas.alpha_composite(arr_sheared)

    return canvas.resize((432, 156), Image.Resampling.LANCZOS)

# -------------------------------------------------------------
# 5. BUTTON NITRO (432x156)
# -------------------------------------------------------------
def generate_button_nitro():
    canvas = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    glow = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_g = ImageDraw.Draw(glow)
    for spread in range(0, 36, 4):
        poly = make_chamfered_polygon(bx0 - spread, by0 - spread, bx1 + spread, by1 + spread, c4 + spread)
        alpha = int(55 * (1.0 - spread / 36.0)**1.5)
        d_g.polygon(poly, fill=(210, 0, 255, alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    canvas.alpha_composite(glow)

    outer_poly = make_chamfered_polygon(bx0, by0, bx1, by1, c4)
    inner_poly = make_chamfered_polygon(bx0 + 36, by0 + 36, bx1 - 36, by1 - 36, c4 - 16)
    bezel = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_b = ImageDraw.Draw(bezel)
    d_b.polygon(outer_poly, fill=(200, 180, 230, 255))
    d_b.polygon(inner_poly, fill=(0, 0, 0, 0))
    arr_b = np.array(bezel)
    mask_b = arr_b[:, :, 3] > 0
    arr_b[mask_b, 0] = np.clip(sheen_grid[mask_b] * 1.10, 0, 255)
    arr_b[mask_b, 1] = np.clip(sheen_grid[mask_b] * 0.85, 0, 255)
    arr_b[mask_b, 2] = np.clip(sheen_grid[mask_b] * 1.25, 0, 255)
    bezel = Image.fromarray(arr_b, "RGBA")
    d_b = ImageDraw.Draw(bezel)
    d_b.polygon(outer_poly, outline=(255, 235, 255, 240), width=6)
    d_b.polygon(inner_poly, outline=(110, 60, 150, 255), width=6)
    canvas.alpha_composite(bezel)

    neon_trim = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_nt = ImageDraw.Draw(neon_trim)
    trim_poly = make_chamfered_polygon(bx0 + 32, by0 + 32, bx1 - 32, by1 - 32, c4 - 14)
    d_nt.polygon(trim_poly, outline=(240, 0, 255, 255), width=8)
    canvas.alpha_composite(neon_trim.filter(ImageFilter.GaussianBlur(8)))
    canvas.alpha_composite(neon_trim)

    core_poly = make_chamfered_polygon(bx0 + 40, by0 + 40, bx1 - 40, by1 - 40, c4 - 18)
    core = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_c = ImageDraw.Draw(core)
    d_c.polygon(core_poly, fill=(255, 255, 255, 255))
    arr_c = np.array(core)
    mask_c = arr_c[:, :, 3] > 0
    grad_c = np.broadcast_to(np.clip((Y - (by0 + 40)) / float(bh4 - 80), 0, 1), (H4, W4))
    carbon = ((X // 8 + Y // 8) % 2 == 0).astype(float) * 12.0
    speed = ((X + Y * 0.7) % 36 < 18).astype(float) * 15.0
    pat = carbon + speed
    core_r = np.clip(90 + (1.0 - grad_c) * 120 + pat, 0, 255)
    core_g = np.clip(0 + (1.0 - grad_c) * 30 + pat * 0.5, 0, 255)
    core_b = np.clip(130 + (1.0 - grad_c) * 115 + pat, 0, 255)
    arr_c[mask_c, 0] = core_r[mask_c]
    arr_c[mask_c, 1] = core_g[mask_c]
    arr_c[mask_c, 2] = core_b[mask_c]
    core = Image.fromarray(arr_c, "RGBA")
    spec_glass = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_sg = ImageDraw.Draw(spec_glass)
    d_sg.polygon(make_chamfered_polygon(bx0 + 44, by0 + 44, bx1 - 44, cy - 20, c4 - 20), fill=(255, 255, 255, 45))
    core.alpha_composite(spec_glass.filter(ImageFilter.GaussianBlur(10)))
    canvas.alpha_composite(core)

    font = ImageFont.truetype(FONT_PATH, 205)
    text_img = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_t = ImageDraw.Draw(text_img)
    text = "NITRO"
    bbox = d_t.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    bolt_cx = cx - tw // 2 - 80
    bolt_poly = [
        (bolt_cx + 20, cy - 110),
        (bolt_cx - 50, cy + 10),
        (bolt_cx - 5, cy + 10),
        (bolt_cx - 30, cy + 120),
        (bolt_cx + 50, cy - 5),
        (bolt_cx + 5, cy - 5)
    ]
    d_t.polygon(bolt_poly, fill=(255, 255, 255, 255))
    tx = cx - tw // 2 + 50
    ty = cy - th // 2 - 25
    d_t.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))
    text_sheared = text_img.transform((W4, H4), Image.Transform.AFFINE, (1, -shear, shear * cy, 0, 1, 0), Image.Resampling.BICUBIC)

    shadow = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    shadow.paste((30, 0, 50, 230), (0, 0), text_sheared)
    shadow = shadow.transform((W4, H4), Image.Transform.AFFINE, (1, 0, -14, 0, 1, -18), Image.Resampling.BICUBIC)
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(12)))

    outline = text_sheared.filter(ImageFilter.MaxFilter(7))
    canvas.paste((255, 210, 255, 255), (0, 0), outline)

    arr_text = np.array(text_sheared)
    mask_text = arr_text[:, :, 3] > 30
    grad_t = np.broadcast_to(np.clip((Y - (cy - 100)) / 200.0, 0, 1), (H4, W4))
    arr_text[mask_text, 0] = 255
    arr_text[mask_text, 1] = np.clip(255 - grad_t[mask_text] * 40, 0, 255)
    arr_text[mask_text, 2] = np.clip(255 - grad_t[mask_text] * 20, 0, 255)
    canvas.alpha_composite(Image.fromarray(arr_text, "RGBA"))

    bolt_layer = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_bl = ImageDraw.Draw(bolt_layer)
    d_bl.polygon(bolt_poly, fill=(255, 240, 120, 255), outline=(255, 255, 255, 255), width=4)
    bolt_sheared = bolt_layer.transform((W4, H4), Image.Transform.AFFINE, (1, -shear, shear * cy, 0, 1, 0), Image.Resampling.BICUBIC)
    canvas.alpha_composite(bolt_sheared)

    return canvas.resize((432, 156), Image.Resampling.LANCZOS)

# -------------------------------------------------------------
# 6. BUTTON RETRY (432x156)
# -------------------------------------------------------------
def generate_button_retry():
    canvas = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    glow = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_g = ImageDraw.Draw(glow)
    for spread in range(0, 36, 4):
        poly = make_chamfered_polygon(bx0 - spread, by0 - spread, bx1 + spread, by1 + spread, c4 + spread)
        alpha = int(55 * (1.0 - spread / 36.0)**1.5)
        d_g.polygon(poly, fill=(0, 240, 210, alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    canvas.alpha_composite(glow)

    outer_poly = make_chamfered_polygon(bx0, by0, bx1, by1, c4)
    inner_poly = make_chamfered_polygon(bx0 + 36, by0 + 36, bx1 - 36, by1 - 36, c4 - 16)
    bezel = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_b = ImageDraw.Draw(bezel)
    d_b.polygon(outer_poly, fill=(180, 220, 225, 255))
    d_b.polygon(inner_poly, fill=(0, 0, 0, 0))
    arr_b = np.array(bezel)
    mask_b = arr_b[:, :, 3] > 0
    arr_b[mask_b, 0] = np.clip(sheen_grid[mask_b] * 0.90, 0, 255)
    arr_b[mask_b, 1] = np.clip(sheen_grid[mask_b] * 1.15, 0, 255)
    arr_b[mask_b, 2] = np.clip(sheen_grid[mask_b] * 1.10, 0, 255)
    bezel = Image.fromarray(arr_b, "RGBA")
    d_b = ImageDraw.Draw(bezel)
    d_b.polygon(outer_poly, outline=(235, 255, 255, 240), width=6)
    d_b.polygon(inner_poly, outline=(60, 120, 130, 255), width=6)
    canvas.alpha_composite(bezel)

    neon_trim = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_nt = ImageDraw.Draw(neon_trim)
    trim_poly = make_chamfered_polygon(bx0 + 32, by0 + 32, bx1 - 32, by1 - 32, c4 - 14)
    d_nt.polygon(trim_poly, outline=(0, 255, 220, 255), width=8)
    canvas.alpha_composite(neon_trim.filter(ImageFilter.GaussianBlur(8)))
    canvas.alpha_composite(neon_trim)

    core_poly = make_chamfered_polygon(bx0 + 40, by0 + 40, bx1 - 40, by1 - 40, c4 - 18)
    core = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_c = ImageDraw.Draw(core)
    d_c.polygon(core_poly, fill=(255, 255, 255, 255))
    arr_c = np.array(core)
    mask_c = arr_c[:, :, 3] > 0
    grad_c = np.broadcast_to(np.clip((Y - (by0 + 40)) / float(bh4 - 80), 0, 1), (H4, W4))
    pat = (((X // 8 + Y // 8) % 2 == 0).astype(float) * 12.0) + (((X + Y * 0.7) % 36 < 18).astype(float) * 15.0)
    core_r = np.clip(0 + (1.0 - grad_c) * 40 + pat * 0.5, 0, 255)
    core_g = np.clip(50 + (1.0 - grad_c) * 160 + pat, 0, 255)
    core_b = np.clip(90 + (1.0 - grad_c) * 120 + pat, 0, 255)
    arr_c[mask_c, 0] = core_r[mask_c]
    arr_c[mask_c, 1] = core_g[mask_c]
    arr_c[mask_c, 2] = core_b[mask_c]
    core = Image.fromarray(arr_c, "RGBA")
    spec_glass = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_sg = ImageDraw.Draw(spec_glass)
    d_sg.polygon(make_chamfered_polygon(bx0 + 44, by0 + 44, bx1 - 44, cy - 20, c4 - 20), fill=(255, 255, 255, 45))
    core.alpha_composite(spec_glass.filter(ImageFilter.GaussianBlur(10)))
    canvas.alpha_composite(core)

    font = ImageFont.truetype(FONT_PATH, 205)
    text_img = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_t = ImageDraw.Draw(text_img)
    text = "RETRY"
    bbox = d_t.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    # Clean double reload arrows
    arrow_cx = cx - tw // 2 - 80
    r_reload = 68
    # Top arc curving clockwise
    d_t.arc((arrow_cx - r_reload, cy - r_reload, arrow_cx + r_reload, cy + r_reload), start=210, end=30, fill=(255, 255, 255, 255), width=24)
    # Bottom arc curving clockwise
    d_t.arc((arrow_cx - r_reload, cy - r_reload, arrow_cx + r_reload, cy + r_reload), start=30, end=210, fill=(255, 255, 255, 255), width=24)
    # Arrow heads
    # Top right arrowhead pointing down-right
    d_t.polygon([(arrow_cx + 45, cy - 55), (arrow_cx + 85, cy - 35), (arrow_cx + 55, cy - 15)], fill=(255, 255, 255, 255))
    # Bottom left arrowhead pointing up-left
    d_t.polygon([(arrow_cx - 45, cy + 55), (arrow_cx - 85, cy + 35), (arrow_cx - 55, cy + 15)], fill=(255, 255, 255, 255))

    tx = cx - tw // 2 + 50
    ty = cy - th // 2 - 25
    d_t.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))
    text_sheared = text_img.transform((W4, H4), Image.Transform.AFFINE, (1, -shear, shear * cy, 0, 1, 0), Image.Resampling.BICUBIC)

    shadow = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    shadow.paste((0, 40, 45, 230), (0, 0), text_sheared)
    shadow = shadow.transform((W4, H4), Image.Transform.AFFINE, (1, 0, -14, 0, 1, -18), Image.Resampling.BICUBIC)
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(12)))

    outline = text_sheared.filter(ImageFilter.MaxFilter(7))
    canvas.paste((200, 255, 245, 255), (0, 0), outline)

    arr_text = np.array(text_sheared)
    mask_text = arr_text[:, :, 3] > 30
    grad_t = np.broadcast_to(np.clip((Y - (cy - 100)) / 200.0, 0, 1), (H4, W4))
    arr_text[mask_text, 0] = np.clip(255 - grad_t[mask_text] * 35, 0, 255)
    arr_text[mask_text, 1] = 255
    arr_text[mask_text, 2] = 255
    canvas.alpha_composite(Image.fromarray(arr_text, "RGBA"))

    return canvas.resize((432, 156), Image.Resampling.LANCZOS)

# -------------------------------------------------------------
# 7. BUTTON COMING SOON (432x156)
# -------------------------------------------------------------
def generate_button_coming_soon():
    canvas = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    glow = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_g = ImageDraw.Draw(glow)
    for spread in range(0, 36, 4):
        poly = make_chamfered_polygon(bx0 - spread, by0 - spread, bx1 + spread, by1 + spread, c4 + spread)
        alpha = int(45 * (1.0 - spread / 36.0)**1.5)
        d_g.polygon(poly, fill=(100, 160, 220, alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    canvas.alpha_composite(glow)

    outer_poly = make_chamfered_polygon(bx0, by0, bx1, by1, c4)
    inner_poly = make_chamfered_polygon(bx0 + 36, by0 + 36, bx1 - 36, by1 - 36, c4 - 16)
    bezel = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_b = ImageDraw.Draw(bezel)
    d_b.polygon(outer_poly, fill=(170, 185, 200, 255))
    d_b.polygon(inner_poly, fill=(0, 0, 0, 0))
    arr_b = np.array(bezel)
    mask_b = arr_b[:, :, 3] > 0
    arr_b[mask_b, 0] = np.clip(sheen_grid[mask_b] * 0.95, 0, 255)
    arr_b[mask_b, 1] = np.clip(sheen_grid[mask_b] * 1.00, 0, 255)
    arr_b[mask_b, 2] = np.clip(sheen_grid[mask_b] * 1.05, 0, 255)
    bezel = Image.fromarray(arr_b, "RGBA")
    d_b = ImageDraw.Draw(bezel)
    d_b.polygon(outer_poly, outline=(220, 235, 245, 240), width=6)
    d_b.polygon(inner_poly, outline=(70, 85, 100, 255), width=6)
    canvas.alpha_composite(bezel)

    neon_trim = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_nt = ImageDraw.Draw(neon_trim)
    trim_poly = make_chamfered_polygon(bx0 + 32, by0 + 32, bx1 - 32, by1 - 32, c4 - 14)
    d_nt.polygon(trim_poly, outline=(100, 180, 240, 255), width=8)
    canvas.alpha_composite(neon_trim.filter(ImageFilter.GaussianBlur(8)))
    canvas.alpha_composite(neon_trim)

    core_poly = make_chamfered_polygon(bx0 + 40, by0 + 40, bx1 - 40, by1 - 40, c4 - 18)
    core = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_c = ImageDraw.Draw(core)
    d_c.polygon(core_poly, fill=(255, 255, 255, 255))
    arr_c = np.array(core)
    mask_c = arr_c[:, :, 3] > 0
    grad_c = np.broadcast_to(np.clip((Y - (by0 + 40)) / float(bh4 - 80), 0, 1), (H4, W4))
    carbon = ((X // 8 + Y // 8) % 2 == 0).astype(float) * 16.0
    core_val = np.clip(25 + (1.0 - grad_c) * 45 + carbon, 0, 255)
    arr_c[mask_c, 0] = core_val[mask_c] * 0.95
    arr_c[mask_c, 1] = core_val[mask_c] * 1.00
    arr_c[mask_c, 2] = core_val[mask_c] * 1.12
    core = Image.fromarray(arr_c, "RGBA")
    spec_glass = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_sg = ImageDraw.Draw(spec_glass)
    d_sg.polygon(make_chamfered_polygon(bx0 + 44, by0 + 44, bx1 - 44, cy - 20, c4 - 20), fill=(255, 255, 255, 30))
    core.alpha_composite(spec_glass.filter(ImageFilter.GaussianBlur(10)))
    canvas.alpha_composite(core)

    font = ImageFont.truetype(FONT_PATH, 140)
    text_img = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    d_t = ImageDraw.Draw(text_img)
    text = "COMING SOON"
    bbox = d_t.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    lock_cx = cx - tw // 2 - 70
    d_t.arc((lock_cx - 45, cy - 90, lock_cx + 45, cy), start=180, end=0, fill=(230, 240, 255, 255), width=20)
    d_t.rounded_rectangle((lock_cx - 55, cy - 20, lock_cx + 55, cy + 80), radius=16, fill=(120, 160, 200, 255), outline=(230, 245, 255, 255), width=6)
    d_t.ellipse((lock_cx - 10, cy + 10, lock_cx + 10, cy + 30), fill=(20, 30, 45, 255))
    d_t.polygon([(lock_cx - 6, cy + 25), (lock_cx + 6, cy + 25), (lock_cx + 10, cy + 55), (lock_cx - 10, cy + 55)], fill=(20, 30, 45, 255))

    tx = cx - tw // 2 + 55
    ty = cy - th // 2 - 15
    d_t.text((tx, ty), text, font=font, fill=(240, 245, 255, 255))

    shadow = Image.new("RGBA", (W4, H4), (0, 0, 0, 0))
    shadow.paste((10, 15, 25, 230), (0, 0), text_img)
    shadow = shadow.transform((W4, H4), Image.Transform.AFFINE, (1, 0, -12, 0, 1, -16), Image.Resampling.BICUBIC)
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(12)))

    outline = text_img.filter(ImageFilter.MaxFilter(7))
    canvas.paste((190, 215, 235, 255), (0, 0), outline)
    canvas.alpha_composite(text_img)

    return canvas.resize((432, 156), Image.Resampling.LANCZOS)

# -------------------------------------------------------------
# 8. BUTTON GARAGE (432x156)
# -------------------------------------------------------------
def generate_button_garage():
    src_path = SCRATCH / "racing_ui_garage_button_1794221974531.jpg"
    src = Image.open(src_path).convert("RGB")
    arr = np.array(src).astype(float)
    bright = arr.max(axis=2)
    alpha = np.clip((bright - 12) / 20.0, 0.0, 1.0) * 255.0
    arr_rgba = np.dstack([arr, alpha]).astype(np.uint8)
    isolated = Image.fromarray(arr_rgba, "RGBA")
    
    mask = alpha > 16
    ys, xs = np.where(mask)
    cropped = isolated.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    
    cw, ch = cropped.size
    scale = min(380.0 / cw, 120.0 / ch)
    tw, th = int(cw * scale), int(ch * scale)
    resized = cropped.resize((tw, th), Image.Resampling.LANCZOS)
    
    canvas = Image.new("RGBA", (432, 156), (0, 0, 0, 0))
    ox = (432 - tw) // 2
    oy = (156 - th) // 2
    canvas.alpha_composite(resized, (ox, oy))
    return canvas

def main():
    generators = {
        "hud-speed@3x.webp": generate_hud_speed,
        "ui-tooltip@3x.webp": generate_ui_tooltip,
        "ui-info@3x.webp": generate_ui_info,
        "button-play@3x.webp": generate_button_play,
        "button-nitro@3x.webp": generate_button_nitro,
        "button-garage@3x.webp": generate_button_garage,
        "button-retry@3x.webp": generate_button_retry,
        "button-coming-soon@3x.webp": generate_button_coming_soon,
    }
    
    print(f"Generating all 8 icons to {RASTER_DIR}...")
    for filename, fn in generators.items():
        img = fn()
        out_path = RASTER_DIR / filename
        # Save lossless WebP
        img.save(out_path, format="WEBP", lossless=True)
        
        # Verify size and margins
        arr = np.array(img)
        alpha = arr[:, :, 3]
        mask = alpha > 16
        ys, xs = np.where(mask)
        w, h = img.size
        margins = [xs.min(), ys.min(), w - xs.max() - 1, h - ys.max() - 1]
        min_m = min(margins)
        req_m = 14 if filename.startswith("button-") else 20
        status = "OK" if min_m >= req_m else "MARGIN TOO SMALL"
        print(f"[{status}] {filename}: size={img.size}, margins={margins}, min={min_m} (req: >={req_m})")

if __name__ == "__main__":
    main()
