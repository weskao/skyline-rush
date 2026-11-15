"""Fetch the Poly Haven (CC0) texture sets of the harbour and oldtown landmark pieces and record them in sources.json.

  python3 -I assets-src/neon-landmarks/fetch_sources.py

Same fetcher, hosts and cache as assets-src/neon-city/fetch_sources.py (scripts/assets/fetch_polyhaven.py; cache in
$POLYHAVEN_CACHE or $HOME/.cache/skyline-rush/polyhaven, one folder per set, never inside the repo), with a generic
client name. sources.json, written beside this file, is the licence record: per set its title, authors, page URL,
real-world tile size and licence; per file its download URL, bytes and sha256. build.py refuses a cache file whose
sha256 differs from that record. The files are image data only: nothing from them is ever run.
"""
import json
import os
import sys
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'scripts', 'assets'))
import fetch_polyhaven as ph  # noqa: E402

ph.CACHE = os.environ.get('POLYHAVEN_CACHE') or ph.CACHE
ph.UA = {'User-Agent': 'asset-fetch/1.0'}   # requests carry no project or personal name
# surface -> set; every set is resampled into the 2048 px sectors atlas at its real size (sources.json "metres")
SETS = {
    'rust colour of worn patches (crane, hull, containers)': 'rusty_painted_metal',
    'container walls (corrugated)': 'container_side',
    'hull plating, worn steel': 'metal_plate_02',
    'machinery house, deckhouse cladding, tower roof (roof metal)': 'box_profile_metal_sheet',
    'brick (gate piers, clock tower)': 'red_bricks_04',
    'stone (quoins, plinths, string courses)': 'large_sandstone_blocks',
    'concrete (rail beams, pole bases)': 'concrete_wall_008',
}
MAPS = ['Diffuse', 'nor_gl', 'arm']   # 1k JPEG each


def main():
    sets = []
    for use, asset in SETS.items():
        files, info = ph.get(f'https://api.polyhaven.com/files/{asset}'), ph.get(f'https://api.polyhaven.com/info/{asset}')
        records = []
        for key in MAPS:
            url = files[key]['1k']['jpg']['url']
            record = ph.save(url, os.path.join(ph.CACHE, asset, os.path.basename(urlparse(url).path)))
            records.append({'map': key, **record, 'path': record['path'].replace(os.sep, '/')})
        sets.append({'id': asset, 'use': use, 'title': info['name'], 'authors': sorted(info['authors']),
                     'metres': round(info['dimensions'][0] / 1000, 3), 'url': f'https://polyhaven.com/a/{asset}',
                     'licence': 'CC0-1.0', 'files': records})
        print(f'{asset}: ok')
    with open(os.path.join(HERE, 'sources.json'), 'w', encoding='utf-8') as out:
        json.dump({'licence': 'CC0-1.0', 'site': 'https://polyhaven.com', 'sets': sets}, out, indent=1)
        out.write('\n')


if __name__ == '__main__':
    main()
