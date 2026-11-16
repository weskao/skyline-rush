"""Fetch the Neon night-sky source (CC0, Poly Haven) and write its licence record, sources.json, next to this script.

  python3 -I assets-src/neon-sky/fetch.py

Downloads land in the shared Poly Haven cache ($HOME/.cache/skyline-rush/polyhaven/<id>/, never inside the repo) through
scripts/assets/fetch_polyhaven.py's host-pinned get/save. The shared cache's own sources.json is left alone: this asset's
record (title, authors, page URL, licence, per-file URL, bytes and sha256) is the committed sources.json here, which
build.py checks every input against.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(HERE)), 'scripts', 'assets'))
from fetch_polyhaven import CACHE, get, save  # noqa: E402

# One HDRI for both environments: `night` ships it as is, `rain` is build.py's scripted grade of it.
# 1k = environment map (PMREM 256 at runtime); 4k/8k = sources of the visible sky dome.
ASSET, SIZES = 'shanghai_bund', ('1k', '4k', '8k')


def main():
    files = get(f'https://api.polyhaven.com/files/{ASSET}')['hdri']
    records = []
    for size in SIZES:
        url = files[size]['hdr']['url']
        rec = save(url, os.path.join(CACHE, ASSET, os.path.basename(url)))
        assert rec['bytes'] == files[size]['hdr']['size'], f'{url}: size differs from the API listing'
        records.append(rec)
        print(rec['path'], rec['bytes'], rec['sha256'])
    info = get(f'https://api.polyhaven.com/info/{ASSET}')
    record = {'sources': [{
        'id': ASSET, 'title': info['name'], 'authors': info['authors'], 'url': f'https://polyhaven.com/a/{ASSET}',
        'license': 'CC0-1.0', 'licenseUrl': 'https://polyhaven.com/license', 'datePublished': info['date_published'],
        'files': records,
    }]}
    with open(os.path.join(HERE, 'sources.json'), 'w') as out:
        json.dump(record, out, indent=1)
        out.write('\n')


if __name__ == '__main__':
    main()
