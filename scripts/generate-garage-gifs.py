#!/usr/bin/env python3
"""Rebuild 3x Garage GIFs with source-faithful, individually art-directed part motion.

No whole-image translate / scale / rotation, no generic sparkle overlay. Source
WebP/SVG is always the basis and stays in place; only an appropriate material,
stream, energy field or isolated moving component changes per frame.
"""
from __future__ import annotations

import argparse
import io
import json
import math
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
VFX = ROOT / 'public/feature-assets/garage-vfx-skins'
STORE = ROOT / 'public/feature-assets/garage-store-readiness/raster'
OUTPUT = ROOT / 'public/feature-assets/garage-animated'
FRAMES = 16
DURATION_MS = 80  # 12.5 FPS; smooth and power-conscious on mobile

# One explicit art-direction recipe per checked-in icon. All movement paths follow
# the source's geometry, never a generic screen-space scaling/twinkle.
PROFILES = {
    'thruster-basic': ('exhaust-cold', 0.65),
    'thruster-ion': ('exhaust-ion', 1.04),
    'thruster-plasma': ('exhaust-helix', 0.94),
    'thruster-void': ('exhaust-void', 0.81),
    'airflow-basic': ('stream-parallel', 0.62),
    'airflow-slipstream': ('stream-slip', 0.95),
    'airflow-vortex': ('stream-orbit', 0.82),
    'airflow-prism': ('stream-prism', 0.77),
    'nitro-trail-basic': ('nitro-continuous', 0.73),
    'nitro-trail-cyan': ('nitro-turbine', 0.90),
    'nitro-trail-gold': ('nitro-split', 0.76),
    'nitro-trail-red': ('nitro-dash', 0.82),
    'nitro-trail-purple': ('nitro-nebula', 0.65),
    'launch-flare-basic': ('flare-halo', 0.70),
    'launch-flare-blue': ('flare-front', 0.78),
    'launch-flare-cyan': ('flare-frost', 0.64),
    'launch-flare-gold': ('flare-solar', 0.92),
    'launch-flare-magenta': ('flare-spiral', 0.84),
    'launch-flare-pulse': ('flare-beat', 0.87),
    'launch-flare-red': ('flare-shock', 0.77),
    'launch-flare-ring': ('flare-orbit', 0.69),
    'launch-flare-white': ('flare-nova', 0.58),
    'store-box': ('hinged-crate', 1.0),
    'store-bundle': ('ribbon-bow', 0.72),
    'store-collection': ('collection-fan', 0.64),
}


def sources():
    raster = VFX / 'raster'
    found = []
    for category, pattern in [
        ('thruster', 'thruster-*.webp'), ('nitro-trail', 'trail-*.webp'),
        ('launch-flare', 'flare-*.webp'),
    ]:
        for path in sorted(raster.glob(pattern)):
            name = path.name.split('@')[0]
            if name == 'flare-purple':
                name = 'launch-flare-pulse'
            elif category == 'nitro-trail':
                name = 'nitro-' + name
            elif category == 'launch-flare':
                name = 'launch-' + name
            found.append((category, name, path))
    for path in sorted(raster.glob('airflow-*.svg')):
        found.append(('airflow', path.name.split('@')[0], path))
    for category in ('nitro-trail', 'launch-flare'):
        found.append((category, category + '-basic', VFX / (category + '.svg')))
    # Only Store art with a moving part; cart/star/tag get the CSS sweep in GarageArtworkTile.vue.
    for name in ('store-box', 'store-bundle', 'store-collection'):
        found.append(('store-concept', name, STORE / f'{name}@3x.webp'))
    return sorted(found, key=lambda x: x[1])


def load(path):
    if path.suffix == '.svg':
        return svg_to_image(path.read_text())
    return Image.open(path).convert('RGBA')


def svg_to_image(svg):
    import cairosvg
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(),
                                                  output_width=288, output_height=288))).convert('RGBA')


def animate_airflow(path, name, step):
    """Move short highlights *along the authored SVG paths*, never over the car."""
    source = path.read_text()
    if step == 0:
        return svg_to_image(source)
    style, intensity = PROFILES[name]
    match = re.search(r'(<g transform="translate\(0 -4\)">)(.*?)(</g>)', source, re.S)
    if not match:
        raise ValueError(f'Airflow requires editable stream group: {name}')
    paths = re.findall(r'<path\b[^>]*?/>', match.group(2))
    if len(paths) < 3:
        raise ValueError(f'{name} has no original stream paths to animate')
    speed = {'stream-parallel': 18, 'stream-slip': 31,
             'stream-orbit': -42, 'stream-prism': 24}[style]
    flow = []
    for i, original in enumerate(paths):
        if 'stroke=' not in original:
            continue
        # A thin moving segment travels on each distinct authored SVG stroke.
        # Preserve all source lines behind the highlights.
        dash = 22 + (i % 3) * 7
        gap = 90 + (i % 2) * 19
        progress = (speed * step / FRAMES + i * 23) % (dash + gap)
        if 'fill="none"' not in original:
            continue
        overlay = original
        overlay = re.sub(r'stroke="[^"]+"', 'stroke="#dcfaff"', overlay, count=1)
        overlay = re.sub(r'stroke-width="[^"]+"', 'stroke-width="3"', overlay, count=1)
        overlay = re.sub(r'opacity="[^"]+"', '', overlay)
        overlay = overlay.replace('/>', f' stroke-dasharray="{dash} {gap}" '
                              f'stroke-dashoffset="{-progress:.2f}" '
                              f'opacity="{(0.18 + 0.21 * intensity) * (1 - math.cos(2*math.pi*step/FRAMES))/2:.3f}"/>')
        flow.append(overlay)
    # The source car is translucent. Clip animated streaks OUT of its entire
    # silhouette, otherwise stream highlights show through and tint the body.
    mask = ('<defs><clipPath id="garage-stream-vehicle-occlusion">'
            '<path d="M0 0 H288 V150 H0 Z M0 226 H288 V288 H0 Z '
            'M0 150 H48 V226 H0 Z M253 150 H288 V226 H253 Z"/>'
            '</clipPath></defs>')
    animated_streams = (mask + '<g clip-path="url(#garage-stream-vehicle-occlusion)">'
                        + ''.join(flow) + '</g>')
    modified = source[:match.end(2)] + animated_streams + source[match.end(2):]
    return svg_to_image(modified)


def field_arrays(image):
    rgba = np.asarray(image, dtype=np.float32)
    h, w = rgba.shape[:2]
    yy, xx = np.mgrid[:h, :w].astype(np.float32)
    x, y = xx / w, yy / h
    rgb = rgba[:, :, :3]
    light = np.max(rgb, axis=2)
    chroma = light - np.min(rgb, axis=2)
    return rgba, x, y, light, chroma


def color_flow(source, style, strength, step, category):
    """Change luminance *inside* the original energy material, preserving silhouette."""
    if step == 0:
        return source.copy()
    rgba, x, y, light, chroma = field_arrays(source)
    t = 2 * math.pi * step / FRAMES
    rx, ry = x - 0.5, y - 0.5
    radius = np.sqrt(rx * rx + ry * ry)
    angle = np.arctan2(ry, rx)
    alpha = rgba[:, :, 3]
    original_alpha = alpha.copy()
    # Per-artwork coordinate flow; no optical displacement or full-image transform.
    if category == 'thruster':
        # Nozzle sits toward the upper right, exhaust expands toward bottom left.
        distance = (0.49 - x + y - 0.57) / 1.414
        cone = (x < .54) & (y > .42) & (x + y > .66)
        flame = cone & (alpha > 15) & ((chroma > 24) | (light > 185))
        flow = 0.5 + 0.5 * np.sin(17 * distance - 1.2 * t + 2.6 * (y - x))
        if style == 'exhaust-helix':
            flow = 0.5 + 0.5 * np.sin(30 * distance - 2.4 * t + 5 * (y - x))
        elif style == 'exhaust-void':
            flow = 0.5 + 0.5 * np.cos(21 * distance - t + 4 * np.sin(8 * x))
        elif style == 'exhaust-ion':
            flow = 0.5 + 0.5 * np.sin(24 * distance - 2.3 * t)
        # Animated energy travels down the visible flame, not over the metallic tube.
        # Subtract phase-zero flow: first and last frame join without a jump.
        if style == 'exhaust-helix':
            flow0 = 0.5 + 0.5 * np.sin(30 * distance + 5 * (y - x))
        elif style == 'exhaust-void':
            flow0 = 0.5 + 0.5 * np.cos(21 * distance + 4 * np.sin(8 * x))
        elif style == 'exhaust-ion':
            flow0 = 0.5 + 0.5 * np.sin(24 * distance)
        else:
            flow0 = 0.5 + 0.5 * np.sin(17 * distance + 2.6 * (y - x))
        gain = 1 + strength * 0.26 * (flow - flow0)
        rgba[:, :, :3] = np.where(flame[:, :, None], np.clip(rgba[:, :, :3] * gain[:, :, None], 0, 255), rgba[:, :, :3])
        # Combustion fluctuates at the exhaust edges. Keep the nozzle and
        # its metal ring fixed; move the source flame's existing translucent edge.
        tip = flame & (x < .35) & (y > .56)
        flicker = (np.sin(14 * distance - t + 4 * (y - x)) -
                   np.sin(14 * distance + 4 * (y - x)))
        rgba[:, :, 3] = np.where(tip, alpha * (1 + .19 * strength * flicker), alpha)
    elif category == 'nitro-trail':
        # Existing tail follows a lower-left to upper-right diagonal.
        longitudinal = (x + (1 - y)) * .5
        transverse = x + y - 1
        omega = {'nitro-continuous': 13, 'nitro-turbine': 18, 'nitro-split': 25,
                 'nitro-dash': 33, 'nitro-nebula': 9}[style]
        pulse = np.sin(omega * longitudinal - t + 2.7 * transverse)
        if style == 'nitro-split':
            pulse = np.sin(omega * longitudinal - 2 * t) * np.cos(19 * transverse + t)
        elif style == 'nitro-dash':
            pulse = np.tanh(3 * pulse)
        elif style == 'nitro-nebula':
            pulse = (np.sin(omega * longitudinal - t) + np.sin(13 * transverse + t)) / 2
        baseline = np.sin(omega * longitudinal + 2.7 * transverse)
        if style == 'nitro-split':
            baseline = np.sin(omega * longitudinal) * np.cos(19 * transverse)
        elif style == 'nitro-dash':
            baseline = np.tanh(3 * baseline)
        elif style == 'nitro-nebula':
            baseline = (np.sin(omega * longitudinal) + np.sin(13 * transverse)) / 2
        gain = 1 + .24 * strength * (pulse - baseline)
        active = (alpha > 15) & (light > 80)
        rgba[:, :, :3] = np.where(active[:, :, None], np.clip(rgba[:, :, :3] * gain[:, :, None], 0, 255), rgba[:, :, :3])
    else:
        # Launch shock wave: travel over rays and rings, not the whole picture.
        speed = {'flare-halo': 1, 'flare-front': 2, 'flare-frost': 1, 'flare-solar': 4,
                 'flare-spiral': -3, 'flare-beat': 2, 'flare-shock': 3,
                 'flare-orbit': -4, 'flare-nova': 3}[style]
        wave = np.sin(11 * radius - t + speed * angle)
        if style in ('flare-beat', 'flare-nova'):
            wave = np.cos(16 * radius - 1.9 * t)
        baseline = np.sin(11 * radius + speed * angle)
        if style in ('flare-beat', 'flare-nova'):
            baseline = np.cos(16 * radius)
        gain = 1 + .24 * strength * (wave - baseline)
        core = radius > .13
        active = (alpha > 15) & core & (light > 80)
        rgba[:, :, :3] = np.where(active[:, :, None], np.clip(rgba[:, :, :3] * gain[:, :, None], 0, 255), rgba[:, :, :3])
        # Shockwave rays flicker through the original flare silhouette;
        # core/center remains stable and no new pixels appear outside it.
        rim = active & (radius > .25)
        ripple = wave - baseline
        rgba[:, :, 3] = np.where(rim, alpha * (1 + .20 * strength * ripple), alpha)
    if not np.array_equal(rgba[:, :, 3].astype(np.uint8)[original_alpha < 1], original_alpha.astype(np.uint8)[original_alpha < 1]):
        raise AssertionError('energy motion added pixels outside original alpha')
    return Image.fromarray(np.clip(rgba, 0, 255).astype('uint8'), 'RGBA')


def polygon_mask(size, points, blur=0):
    mask = Image.new('L', size, 0)
    d = ImageDraw.Draw(mask)
    d.polygon([(round(x * size[0]), round(y * size[1])) for x, y in points], fill=255)
    return mask.filter(ImageFilter.GaussianBlur(blur)) if blur else mask


def subtle_part_motion(source, mask, step, dx=0, dy=0, angle=0, pivot=(.5, .5)):
    """Pivot only a separated component, keeping the whole icon anchored."""
    if step == 0:
        return source.copy()
    part = source.copy()
    part.putalpha(Image.fromarray(np.minimum(np.asarray(source.getchannel('A')), np.asarray(mask)).astype('uint8')))
    body = source.copy()
    body.putalpha(Image.fromarray((np.asarray(source.getchannel('A'), dtype=np.uint16) *
                                   (255 - np.asarray(mask, dtype=np.uint16)) // 255).astype('uint8')))
    if angle:
        part = part.rotate(angle, resample=Image.Resampling.BICUBIC,
                           center=(source.width * pivot[0], source.height * pivot[1]))
    moved = Image.new('RGBA', source.size)
    moved.paste(part, (int(dx), int(dy)))
    return Image.alpha_composite(body, moved)


def animate_store(source, style, strength, step):
    if step == 0:
        return source.copy()
    t = 2 * math.pi * step / FRAMES
    openness = (1 - math.cos(t)) / 2
    w, h = source.size
    if style == 'hinged-crate':
        # Original gold/silver chest has a distinct beveled top. Lift ONLY that lid.
        lid = polygon_mask(source.size, [(0.29,.35),(.52,.25),(.83,.33),(.91,.48),(.61,.58),(.30,.50)], 0.75)
        gap = round(8 * openness * strength)
        # The rear-right pivot is the box's actual hinge, not the card center.
        return subtle_part_motion(source, lid, step, dy=-gap,
                                  angle=-13 * openness * strength, pivot=(.76, .53))
    if style == 'ribbon-bow':
        # Actual satin loops above the purple gift move independently of its box.
        bow = polygon_mask(source.size, [(.33,.18),(.65,.16),(.80,.35),(.68,.49),(.45,.45),(.28,.34)], .6)
        return subtle_part_motion(source, bow, step, dx=round(2 * math.sin(t)),
                                  dy=round(-2.4 * openness), angle=2.8 * math.sin(t),
                                  pivot=(.50, .43))
    if style == 'collection-fan':
        # Lift just the upper collectible card, not the UI tile.
        card = polygon_mask(source.size, [(.35,.17),(.74,.19),(.80,.48),(.49,.60),(.31,.44)], .5)
        return subtle_part_motion(source, card, step, dy=round(-2.3 * openness))
    raise ValueError(f'Unknown Store motion: {style}')


def animate(source, category, name, step, path=None):
    if name not in PROFILES:
        raise ValueError(f'Missing explicit motion profile: {name}')
    style, strength = PROFILES[name]
    if category == 'airflow':
        return animate_airflow(path, name, step)
    if category in ('thruster', 'nitro-trail', 'launch-flare'):
        return color_flow(source, style, strength, step, category)
    return animate_store(source, style, strength, step)


def palette_for(frames):
    # Quantize all motion phases TOGETHER: one fixed palette, no per-frame flicker.
    width, height = frames[0].size
    swatches = Image.new("RGB", (width, height * len(frames)))
    for i, frame in enumerate(frames):
        swatches.paste(frame.convert("RGB"), (0, i * height))
    return swatches.quantize(colors=190, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)


def palettize(frame, palette):
    rgba = np.asarray(frame)
    # GIF has only binary transparency. A Bayer alpha pattern produces an
    # obvious checkerboard halo over dark Garage cards; avoid that artifact.
    # Keep the substantial original flame/glow, omit only faint matte fringes.
    visible = rgba[:, :, 3] >= 96
    quantized = Image.fromarray(rgba[:, :, :3], 'RGB').quantize(
        palette=palette, dither=Image.Dither.NONE)
    indices = np.asarray(quantized, dtype=np.uint8) + 1
    indices[~visible] = 0
    indexed = Image.fromarray(indices, 'P')
    indexed.putpalette(([0, 0, 0] + palette.getpalette()[:3 * 190] + [0] * 768)[:768])
    indexed.info['transparency'] = 0
    return indexed


def render(category, name, source_path):
    source = load(source_path)
    expected = 216 if category == 'store-concept' else 288
    if source.size != (expected, expected):
        raise ValueError(f'{source_path}: expected {expected}x{expected}; got {source.size}')
    if not np.any(np.asarray(source)[:, :, 3] == 0):
        raise ValueError(f'Original artwork has no transparent background: {source_path}')
    originals = [animate(source, category, name, i, source_path) for i in range(FRAMES)]
    palette = palette_for(originals)
    frames = [palettize(frame, palette) for frame in originals]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    dest = OUTPUT / f'{name}@3x.gif'
    frames[0].save(dest, save_all=True, append_images=frames[1:], loop=0,
                   duration=DURATION_MS, transparency=0, disposal=2, optimize=False)
    with Image.open(dest) as gif:
        if gif.n_frames < 4 or gif.info.get('loop') != 0 or gif.size != source.size:
            raise AssertionError(f'{name}: invalid animated GIF frame/size/loop')
        if gif.info.get('transparency') is None:
            raise AssertionError(f'{name}: missing true transparency')
        initial = np.asarray(gif.convert('RGBA'))
        differences = sum(np.any(np.asarray(f.convert('RGBA')) != initial)
                          for f in ImageSequence.Iterator(gif))
        if differences < 3:
            raise AssertionError(f'{name}: animated material is not visibly distinct')
    size = dest.stat().st_size
    if size > 1_000_000:
        raise AssertionError(f'{name}: excessive decode/download footprint: {size}')
    return dict(name=name, category=category, profile=PROFILES[name][0],
                source=source_path.relative_to(ROOT).as_posix(),
                file=dest.relative_to(ROOT).as_posix(), size=size,
                width=expected, height=expected, frames=FRAMES, fps=1000 / DURATION_MS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only', help='Render one named icon for focused checks')
    args = parser.parse_args()
    assets = sources()
    names = {name for _, name, _ in assets}
    if len(assets) != 25 or names != set(PROFILES):
        raise AssertionError(f'25 individually designed, present sources required; missing={set(PROFILES)-names}; extra={names-set(PROFILES)}')
    result = [render(cat, name, path) for cat, name, path in assets
              if args.only is None or name == args.only]
    if not result:
        raise ValueError(f'No source for requested artwork {args.only}')
    if args.only is None:
        (OUTPUT / 'manifest.json').write_text(json.dumps(result, indent=2) + '\n')
    print(f'Animated {len(result)} source-faithful GIFs, {sum(x["size"] for x in result)} bytes')


if __name__ == '__main__':
    main()