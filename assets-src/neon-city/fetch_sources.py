"""Fetch the Poly Haven (CC0) texture sets of the Neon city kit and record them in sources.json.

  python3 -I assets-src/neon-city/fetch_sources.py

Reuses the fetcher in scripts/assets/fetch_polyhaven.py (same three Poly Haven hosts, same client name,
same cache: $POLYHAVEN_CACHE or $HOME/.cache/skyline-rush/polyhaven, never inside the repo). sources.json,
written beside this file, is the licence record: per set its title, authors, page URL and licence; per file
its download URL, bytes and sha256. build.py refuses a cache file whose sha256 differs from that record.
"""
import json
import os
import sys
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'scripts', 'assets'))
import fetch_polyhaven as ph  # noqa: E402

ph.CACHE = os.environ.get('POLYHAVEN_CACHE') or ph.CACHE
SETS = ['concrete_wall_008', 'granite_tile_04', 'plastered_wall_05', 'black_painted_planks', 'roof_tiles_14',
        'sakura_bark', 'metal_plate_02']
MAPS = ['Diffuse', 'nor_gl', 'arm']  # 1k JPEG each: every set is resampled into a 128-256 px atlas cell


def main():
    sets = []
    for asset in SETS:
        files, info = ph.get(f'https://api.polyhaven.com/files/{asset}'), ph.get(f'https://api.polyhaven.com/info/{asset}')
        records = []
        for key in MAPS:
            url = files[key]['1k']['jpg']['url']
            record = ph.save(url, os.path.join(ph.CACHE, asset, os.path.basename(urlparse(url).path)))
            records.append({'map': key, **record, 'path': record['path'].replace(os.sep, '/')})
        sets.append({'id': asset, 'title': info['name'], 'authors': sorted(info['authors']),
                     'url': f'https://polyhaven.com/a/{asset}', 'licence': 'CC0-1.0', 'files': records})
        print(f'{asset}: ok')
    with open(os.path.join(HERE, 'sources.json'), 'w', encoding='utf-8') as out:
        json.dump({'licence': 'CC0-1.0', 'site': 'https://polyhaven.com', 'sets': sets}, out, indent=1)
        out.write('\n')


if __name__ == '__main__':
    main()
