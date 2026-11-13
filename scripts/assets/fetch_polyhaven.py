"""Fetch Poly Haven (CC0) sources for Task 5 into a cache outside the repo, recording size + sha256.

Usage:
  python3 -I scripts/assets/fetch_polyhaven.py survey      # candidate ids + thumbnails for review
  python3 -I scripts/assets/fetch_polyhaven.py fetch       # download the pinned SOURCES below

Only api.polyhaven.com, dl.polyhaven.org and cdn.polyhaven.com are contacted. Files land in
$HOME/.cache/skyline-rush/polyhaven/<id>/ (never inside the repo); sources.json there lists every file with its
URL, bytes and sha256 so the Blender build can cite exact inputs in the model/material manifest.
"""
import hashlib, json, os, sys, urllib.request
from urllib.parse import urlparse

CACHE = os.path.join(os.path.expanduser('~'), '.cache', 'skyline-rush', 'polyhaven')
HOSTS = {'api.polyhaven.com', 'dl.polyhaven.org', 'cdn.polyhaven.com'}
UA = {'User-Agent': 'skyline-rush-asset-pipeline'}

# id -> (kind, resolution, map keys). Models come as glTF with their textures; textures as JPG/PNG map sets.
SOURCES = {
    'coastal_cliff_01': ('model', '2k', None),
    'coastal_cliff_02': ('model', '2k', None),
    'coastal_cliff_04': ('model', '2k', None),
    'coast_rocks_01': ('model', '2k', None),
    'coast_rocks_05': ('model', '2k', None),
    'rock_face_01': ('model', '2k', None),
    'asphalt_02': ('texture', '4k', ['Diffuse', 'nor_gl', 'Rough', 'AO']),
    'asphalt_track': ('texture', '4k', ['Diffuse', 'nor_gl', 'Rough', 'AO']),
    'palm_bark': ('texture', '2k', ['Diffuse', 'nor_gl', 'Rough']),
    'metal_plate_02': ('texture', '2k', ['nor_gl', 'Rough']),
    # Sky-only HDRIs: 1k = per-time-of-day environment maps (Medium+; Low keeps RoomEnvironment);
    # 4k/8k = sources of the visible sky dome (assets-src/coast-sky/build.py).
    'kloofendal_48d_partly_cloudy_puresky': ('hdri', '1k 4k 8k', None),
    'qwantani_sunset_puresky': ('hdri', '1k 4k 8k', None),
    'belfast_sunset_puresky': ('hdri', '1k 4k 8k', None),
    'kloofendal_overcast_puresky': ('hdri', '1k 4k 8k', None),
}
SURVEY = {
    'hdris': ['sunset', 'overcast', 'clear', 'midday', 'coast', 'sea', 'beach'],
    'textures': ['metal', 'galvanized', 'steel', 'bark', 'palm', 'leaf'],
}


def get(url, binary=False):
    if urlparse(url).hostname not in HOSTS:
        raise SystemExit(f'refusing non-Poly-Haven URL: {url}')
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as response:
        data = response.read()
    return data if binary else json.loads(data)


def save(url, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):  # already cached: record it, do not download again
        with open(path, 'rb') as cached:
            data = cached.read()
    else:
        data = get(url, binary=True)
        with open(path, 'wb') as out:
            out.write(data)
    return {'url': url, 'path': os.path.relpath(path, CACHE), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def fetch():
    records = []
    for asset, (kind, res, keys) in SOURCES.items():
        files, folder = get(f'https://api.polyhaven.com/files/{asset}'), os.path.join(CACHE, asset)
        if kind == 'model':
            entry = files['gltf'][res]['gltf']
            records.append(save(entry['url'], os.path.join(folder, os.path.basename(urlparse(entry['url']).path))))
            for rel, inc in entry.get('include', {}).items():
                records.append(save(inc['url'], os.path.join(folder, rel)))
        elif kind == 'hdri':
            for size in res.split():
                url = files['hdri'][size]['hdr']['url']
                records.append(save(url, os.path.join(folder, os.path.basename(urlparse(url).path))))
        else:
            for key in keys:
                variant = files[key][res]
                fmt = 'png' if key == 'nor_gl' and 'png' in variant else 'jpg'
                records.append(save(variant[fmt]['url'], os.path.join(folder, os.path.basename(urlparse(variant[fmt]['url']).path))))
        print(f'{asset}: ok')
    info = {a: {k: v for k, v in get(f'https://api.polyhaven.com/info/{a}').items() if k in ('name', 'authors', 'date_published')} for a in SOURCES}
    with open(os.path.join(CACHE, 'sources.json'), 'w') as out:
        json.dump({'license': 'CC0-1.0', 'site': 'https://polyhaven.com', 'assets': info, 'files': records}, out, indent=1)
    print(f'{len(records)} files -> {CACHE}/sources.json')


def survey():
    folder = os.path.join(CACHE, '_survey')
    for kind, words in SURVEY.items():
        for asset, meta in get(f'https://api.polyhaven.com/assets?type={kind}').items():
            text = ' '.join([asset] + meta.get('tags', []) + meta.get('categories', [])).lower()
            if any(w in text for w in words):
                print(kind, asset, meta.get('categories'))
                save(f'https://cdn.polyhaven.com/asset_img/thumbs/{asset}.png?width=256&height=256', os.path.join(folder, kind, asset + '.png'))
    print('thumbnails ->', folder)


if __name__ == '__main__':
    {'fetch': fetch, 'survey': survey}.get(sys.argv[1] if len(sys.argv) > 1 else '', lambda: sys.exit(__doc__))()
