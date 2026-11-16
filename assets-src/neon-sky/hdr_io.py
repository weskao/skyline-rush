"""Radiance .hdr reader and writer of assets-src/neon-sky/build.py, which runs this file in its own namespace (`bpy` and
`np` are its imports) and pins it in the manifest as `ioSha256`. Not a script: run build.py."""


def load_full(path):
    """Whole equirect .hdr as float32 RGB, rows top (zenith) first."""
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[::-1, :, :3].copy()


def rle(channel):
    """Radiance new-style run-length encoding of one scanline channel: runs of 3+ as (128 + n, byte), else literals."""
    out, i, n = bytearray(), 0, len(channel)
    while i < n:
        r = 1
        while r < 127 and i + r < n and channel[i + r] == channel[i]:
            r += 1
        if r >= 3:
            out += bytes((128 + r, channel[i]))
            i += r
            continue
        j = i
        while j < n and j - i < 128 and not (j + 2 < n and channel[j] == channel[j + 1] == channel[j + 2]):
            j += 1
        out.append(j - i)
        out += channel[i:j]
        i = j
    return out


def save_hdr(rgb, path):
    """Radiance RGBE .hdr, RLE scanlines, rows top first. Blender's own writer is not used: image.save() altered the
    float data (a 26112 peak came back as 72.5). Read back through Blender's reader to prove the round trip."""
    h, w, _ = rgb.shape
    peak = rgb.max(2)
    mant, exp = np.frexp(peak)
    scale = np.where(peak > 1e-32, mant * 256 / np.maximum(peak, 1e-38), 0)
    rgbe = np.concatenate([np.clip(rgb * scale[..., None], 0, 255).astype(np.uint8),
                           np.where(peak > 1e-32, exp + 128, 0).astype(np.uint8)[..., None]], axis=2)
    body = bytearray(f"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y {h} +X {w}\n".encode())
    for row in rgbe:
        body += bytes((2, 2, w >> 8, w & 255))
        for c in range(4):
            body += rle(row[:, c].tobytes())
    with open(path, "wb") as f:
        f.write(body)
    back = load_full(path)
    # RGBE: one shared exponent and 8-bit mantissas, so the error is bounded by the pixel's brightest channel.
    worst = float((np.abs(back - rgb).max(2) / (rgb.max(2) + 1e-6)).max())
    assert worst < 0.01, f"{path}: RGBE round trip drifted by {worst:.4f} of the pixel maximum"
