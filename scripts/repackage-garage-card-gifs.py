#!/usr/bin/env python3
"""Re-export the glow-edged Garage GIFs onto their real card background.

The thruster, coloured nitro-trail and coloured launch-flare GIFs have soft glow
edges. Cutting them over the flat #0f1c33 matte left a dark navy rim on the
lighter card tint. This re-runs the generator's motion on the committed WebP
source, composites every frame onto `assets-src/garage-card-bg/<category>.png`
(3x capture of the real card) and cuts alpha at ~10% via the shared packager.
It does not touch the other Garage GIFs.
Requires: numpy, Pillow. Usage: python scripts/repackage-garage-card-gifs.py --apply
"""
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "public/feature-assets/garage-animated/manifest.json"
NAMES = (
    "thruster-basic", "thruster-ion", "thruster-plasma", "thruster-void",
    "nitro-trail-cyan", "nitro-trail-gold", "nitro-trail-red", "nitro-trail-purple",
    "launch-flare-blue", "launch-flare-ring", "launch-flare-pulse", "launch-flare-gold",
    "launch-flare-red", "launch-flare-cyan", "launch-flare-magenta", "launch-flare-white",
)


def load_module(name: str, rel: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def no_alpha_dip(frame: Image.Image, source: Image.Image) -> Image.Image:
    """Keeps the dcec8b99 thruster repair: motion may raise alpha, never drop below the source."""
    alpha = np.maximum(np.asarray(frame.getchannel("A")), np.asarray(source.getchannel("A")))
    out = frame.copy()
    out.putalpha(Image.fromarray(alpha.astype(np.uint8)))
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="replace the 16 runtime GIFs")
    if not parser.parse_args().apply:
        parser.error("pass --apply after reviewing the card-background captures")
    gen = load_module("garage_gif_generator", "scripts/generate-garage-gifs.py")
    pkg = load_module("garage_gif_packager", "scripts/package-garage-authored-gifs.py")
    sources = {name: (category, path) for category, name, path in gen.sources()}
    entries = json.loads(MANIFEST.read_text())
    by_name = {item["name"]: item for item in entries}
    for name in NAMES:
        category, path = sources[name]
        item = by_name[name]
        background = pkg.card_background(category, item["width"])
        if background is None:
            raise FileNotFoundError(f"missing card background for {category}")
        source = gen.load(path)
        frames = [gen.animate(source, category, name, i, path) for i in range(gen.FRAMES)]
        if category == "thruster":
            frames = [no_alpha_dip(frame, source) for frame in frames]
        output = ROOT / item["file"]
        pkg.save_gif(frames, output, background)
        item["size"] = output.stat().st_size
        print(f"{name}: {item['size']} bytes / {gen.FRAMES} frames")
    MANIFEST.write_text(json.dumps(entries, indent=2) + "\n")


if __name__ == "__main__":
    main()
