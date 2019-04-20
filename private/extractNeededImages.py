#
# This script is useful if starting from a completely clean clone.
# While the manageFishData.py script keeps the images for fish_n_tackle and
# weather up-to-date, the images for DEFAULT, action, and status were originally
# extracted manually. It's super rare you'd need to revisit extracting them.
#

import sys
import os
import logging

logging.basicConfig(level=logging.INFO, stream=sys.stderr)

try:
    _SCRIPT_PATH = os.path.abspath(__path__)
except:
    _SCRIPT_PATH = os.path.abspath(os.path.dirname(__file__))

# _HELPER_LIBS_PATH = os.path.join(_SCRIPT_PATH, '..', '..')
_HELPER_LIBS_PATH = _SCRIPT_PATH

# Add the Saint Coinach python API to the path.
sys.path += [os.path.join(_HELPER_LIBS_PATH, 'saintcoinach-py')]
# For this set of icons, we only need the PackCollection.
from pack import PackCollection
import xiv # Not really necessary, but there's an import bug...
from imaging import IconHelper

packs = PackCollection(r"C:\Program Files (x86)\SquareEnix\FINAL FANTASY XIV - A Realm Reborn\game\sqpack")

ICON_MAP = {
    '': [
        (9, 'DEFAULT.png'),
    ],
    'action': [
        (1115, 'powerful_hookset.png'),  # Action[Name="Powerful Hookset"]
        (1116, 'precision_hookset.png'),  # Action[Name="Precision Hookset"]
        (60671, 'small_gig.png'),
        (60672, 'normal_gig.png'),
        (60673, 'large_gig.png'),
    ],
    'status': [
        (11101, 'intuition.png'),  # Status[Name="Fisher's Intuition"]
        (11102, 'snagging.png'),  # Status[Name="Snagging"]
        (11103, 'fish_eyes.png'),  # Status[Name="Fish Eyes"]
    ]
}

for subdir in ICON_MAP:
    if not os.path.isdir(os.path.join(_SCRIPT_PATH, 'images', subdir)):
        os.makedirs(os.path.join(_SCRIPT_PATH, 'images', subdir))
    for n, filename in ICON_MAP[subdir]:
        if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', subdir, filename)):
            icon = IconHelper.get_icon(packs, n)
            logging.info('Extracting %s -> %s' % (icon, filename))
            icon.get_image().save(os.path.join(_SCRIPT_PATH, 'images', subdir, filename))
