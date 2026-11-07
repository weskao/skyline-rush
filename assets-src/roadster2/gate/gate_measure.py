"""Forms-gate measurement: matte each reference photo (refs.json), register it to the render by
the contract anchors (similarity transform from two photo points onto the same two contract points
projected by gate_render.py), then score IoU and per-band widths on the registered pair.

  python3 assets-src/roadster2/gate/gate_measure.py --refs assets-src/roadster2/gate/refs.json \
    --renders <dir>/gate_render.json --out <dir>

Needs Pillow + numpy. Writes <out>/gate_results.json and one sheet per view (<view>_sheet.png).
Widths are in metres at the anchors' scale; for perspective views that scale holds at the anchors'
depth only, so read those widths as approximate.
"""
import argparse
import json
import os

import numpy as np
from PIL import Image, ImageDraw

BANDS = 10


def poly_mask(size, polys):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for pts in polys:
        d.polygon([tuple(p) for p in pts], fill=255)
    return np.asarray(m) > 127


def matte(photo, spec):
    """Boolean car mask. auto: per-row background interpolated between edge column bands, colour
    distance > tol inside box, filled per column; then include/exclude polygons fix the rest."""
    rgb = np.asarray(photo.convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape
    if spec["mode"] == "polygon":
        m = poly_mask((w, h), [spec["points"]])
    else:
        (l0, l1), (r0, r1) = spec["bg_cols"]
        left = rgb[:, l0:l1].mean(axis=1)
        right = rgb[:, r0:r1].mean(axis=1)
        t = (np.arange(w, dtype=np.float32) - (l0 + l1) / 2) / ((r0 + r1) / 2 - (l0 + l1) / 2)
        bg = left[:, None, :] * (1 - t[None, :, None]) + right[:, None, :] * t[None, :, None]
        m = np.linalg.norm(rgb - bg, axis=2) > spec["tol"]
        x0, y0, x1, y1 = spec["box"]
        boxed = np.zeros_like(m)
        boxed[y0:y1, x0:x1] = m[y0:y1, x0:x1]
        m = boxed
        for x in range(w):  # column fill: the car is column-convex once the underbody gap is excluded
            ys = np.flatnonzero(m[:, x])
            if len(ys):
                m[ys[0]:ys[-1] + 1, x] = True
    if spec.get("include"):
        m |= poly_mask((w, h), spec["include"])
    if spec.get("exclude"):
        m &= ~poly_mask((w, h), spec["exclude"])
    return m


def register(mask, p_anchors, q_anchors, size):
    """Warp the photo mask into the render frame with the similarity that maps P1,P2 onto Q1,Q2."""
    P = [complex(*p) for p in p_anchors]
    Q = [complex(*q) for q in q_anchors]
    s = (Q[1] - Q[0]) / (P[1] - P[0])
    t = Q[0] - s * P[0]
    si, ti = 1 / s, -t / s  # render px -> photo px, which is what PIL's AFFINE wants
    img = Image.fromarray((mask * 255).astype(np.uint8))
    out = img.transform(size, Image.AFFINE, (si.real, -si.imag, ti.real, si.imag, si.real, ti.imag),
                        resample=Image.BILINEAR)
    return np.asarray(out) > 127, abs(s)


def span(row):
    xs = np.flatnonzero(row)
    return (xs[-1] - xs[0] + 1) if len(xs) else 0


def measure(ren, ref, m_per_px):
    inter, union = (ren & ref).sum(), (ren | ref).sum()
    ys = np.flatnonzero((ren | ref).any(axis=1))
    xs = np.flatnonzero((ren | ref).any(axis=0))
    top, bot = ys[0], ys[-1]
    bands = []
    for i in range(BANDS):
        y = int(top + (i + 0.5) * (bot - top + 1) / BANDS)
        wr, wf = span(ren[y]) * m_per_px, span(ref[y]) * m_per_px
        bands.append({"y_px": y, "render_m": round(wr, 3), "ref_m": round(wf, 3),
                      "diff_m": round(wr - wf, 3), "diff_pct": round(100 * (wr - wf) / wf, 1) if wf else None})

    def extent(m):
        yy, xx = np.flatnonzero(m.any(axis=1)), np.flatnonzero(m.any(axis=0))
        return {"w_m": round((xx[-1] - xx[0] + 1) * m_per_px, 3), "h_m": round((yy[-1] - yy[0] + 1) * m_per_px, 3),
                "top_px": int(yy[0]), "bottom_px": int(yy[-1]), "left_px": int(xx[0]), "right_px": int(xx[-1])}
    return {"iou": round(float(inter / union), 4), "bands": bands,
            "render": extent(ren), "ref": extent(ref), "frame_px": [int(xs[0]), int(top), int(xs[-1]), int(bot)]}


def sheet(path, photo, pmask, p_anchors, ren, ref, q_anchors, title):
    H = 420
    ph = photo.convert("RGB")
    s = H / ph.height
    a = ph.resize((int(ph.width * s), H))
    edge = Image.fromarray((pmask * 255).astype(np.uint8)).resize(a.size)
    tint = Image.new("RGB", a.size, (255, 40, 40))
    a = Image.composite(Image.blend(a, tint, 0.35), a, edge)
    d = ImageDraw.Draw(a)
    for x, y in p_anchors:
        d.ellipse([x * s - 5, y * s - 5, x * s + 5, y * s + 5], outline=(0, 255, 0), width=2)
    hh, ww = ren.shape
    ov = np.full((hh, ww, 3), 120, np.uint8)
    ov[ren] = (20, 20, 20)
    ov[ref & ~ren] = (230, 60, 60)      # ref only: render is missing this
    ov[ren & ~ref] = (60, 140, 230)     # render only: render has extra here
    b = Image.fromarray(ov)
    d2 = ImageDraw.Draw(b)
    for x, y in q_anchors:
        d2.ellipse([x - 7, y - 7, x + 7, y + 7], outline=(0, 255, 0), width=3)
    b = b.resize((int(ww * H / hh), H))
    out = Image.new("RGB", (a.width + b.width + 30, H + 40), (40, 40, 40))
    out.paste(a, (10, 30))
    out.paste(b, (a.width + 20, 30))
    ImageDraw.Draw(out).text((10, 8), title + "   overlay: black both, red ref-only, blue render-only, green anchors",
                             fill=(230, 230, 230))
    out.save(path)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--refs", required=True)
    p.add_argument("--renders", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--views", default="")
    a = p.parse_args()
    refs, rj = json.load(open(a.refs)), json.load(open(a.renders))
    size = tuple(rj["size"])
    os.makedirs(a.out, exist_ok=True)
    results = {"targets": refs.get("targets", {}), "views": {}}
    for view, spec in refs["views"].items():
        if a.views and view not in a.views.split(","):
            continue
        photo = Image.open(spec["photo"])
        pmask = matte(photo, spec["matte"])
        tries = []
        for run in rj["views"][view]:
            ren = np.asarray(Image.open(run["file"]).getchannel("A")) > 16
            ref, _ = register(pmask, spec["anchors_px"], run["anchors_px"], size)
            if spec.get("ignore"):  # photo regions not comparable (deployed wing, hidden underbody): out of both
                ign, _ = register(poly_mask(photo.size, spec["ignore"]), spec["anchors_px"], run["anchors_px"], size)
                ren, ref = ren & ~ign, ref & ~ign
            q = run["anchors_px"]
            m_dist = float(np.linalg.norm(np.subtract(spec["anchors_m"][1], spec["anchors_m"][0])))
            m_per_px = m_dist / float(np.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]))
            res = measure(ren, ref, m_per_px)
            tries.append((res["iou"], run, res, ren, ref))
        iou, run, res, ren, ref = max(tries, key=lambda t: t[0])
        cam = {k: run[k] for k in ("az", "el", "lens")}
        sheet(os.path.join(a.out, view + "_sheet.png"), photo, pmask, spec["anchors_px"], ren, ref, run["anchors_px"],
              "%s  %s  best cam az %g el %g lens %g  IoU %.3f" % (view, os.path.basename(spec["photo"]), cam["az"],
                                                                   cam["el"], cam["lens"], iou))
        res.update({"photo": spec["photo"], "camera": cam, "all_cams": [[t[1]["az"], t[1]["el"], t[1]["lens"], t[0]] for t in tries]})
        results["views"][view] = res
        worst = max(abs(b["diff_pct"] or 0) for b in res["bands"])
        print("%-13s IoU %.3f  worst band %5.1f%%  cam az %g el %g lens %g" % (view, iou, worst, cam["az"], cam["el"], cam["lens"]))
    with open(os.path.join(a.out, "gate_results.json"), "w") as f:
        json.dump(results, f, indent=1)


if __name__ == "__main__":
    main()
