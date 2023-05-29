from datetime import datetime
from pathlib import Path
from argparse import ArgumentParser
import logging
import sys
import re
import tempfile

logging.basicConfig(level=logging.INFO, stream=sys.stderr)

PAGES = [Path('./index.html'),
         Path('./fishtrain.html'),
         Path('./trainpass/index.html')]


def _update_cache_busters(assets=[], patch=None, all=False, timestamp=None):
    assets = list(filter(lambda x: x.endswith('.js') or x.endswith('.css') or x == 'sprite.png', assets))
    logging.info("Assets to update: %r", assets)

    if timestamp is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M')

    JS_ASSET_PAT = re.compile(r'<script type="text/javascript" src="/?([^?]+)\?([^"]+)"></script>')
    CSS_ASSET_PAT = re.compile(r'<link ref="stylesheet" href="/?([^?]+)?([^"]+)"\s*/>')

    for page in PAGES:
        output = ''
        with page.open('rt', encoding='utf-8') as fin:
            for line in fin:
                def update_asset_timestamp(m: re.Match) -> str:
                    if m.group(1) in assets:
                        asset = m.group(1)
                        new_line = m.string[m.start():m.start(2)]
                        if patch is not None and (asset.endswith('/data.js') or asset.endswith('/fish_info_data.js')):
                            new_line += f'{patch}_'
                        new_line += timestamp
                        new_line += m.string[m.end(2):m.end()]
                        return new_line
                    else:
                        return m.string[m.start():m.end()]
                line = JS_ASSET_PAT.sub(update_asset_timestamp, line)
                line = CSS_ASSET_PAT.sub(update_asset_timestamp, line)
                output += line

        # with page.with_suffix(page.suffix + '.new').open('wt', encoding='utf-8') as fout:
        with page.open('wt', encoding='utf-8') as fout:
            fout.write(output)


if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('-p', '--patch', type=str, help='Current patch version (used for specific cache busters)')
    parser.add_argument('--all', action='store_true', help='Update all cache busters')
    parser.add_argument('--timestamp', type=str, help='Override the timestamp used for cache buster')
    parser.add_argument('assets', metavar='asset', nargs='*', type=str, help='Assets that were updated')
    args = parser.parse_args()

    try:
        _update_cache_busters(**vars(args))
    except:
        logging.exception('Error occurred!')
        sys.exit(1)