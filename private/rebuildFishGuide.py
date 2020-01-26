import os
import sys

try:
    _SCRIPT_PATH = os.path.abspath(__path__)
except:
    _SCRIPT_PATH = os.path.abspath(os.path.dirname(__file__))

# _HELPER_LIBS_PATH = os.path.join(_SCRIPT_PATH, '..', '..')
_HELPER_LIBS_PATH = _SCRIPT_PATH


def _init_saintcoinach():
    sys.path += [os.path.join(_HELPER_LIBS_PATH, 'saintcoinach-py')]

    from pysaintcoinach import ARealmReversed
    import pysaintcoinach.text as text
    from pysaintcoinach.ex.language import Language

    import extracted_sheet_plugin

    extracted_sheet_plugin.initialize()

    global LANGUAGES

    LANGUAGES = [Language.english,
                 Language.japanese,
                 Language.german,
                 Language.french,
                 Language.korean]

    _string_decoder = text.XivStringDecoder.default()

    # Load up the game data
    xiv = ARealmReversed(r"C:\Program Files (x86)\SquareEnix\FINAL FANTASY XIV - A Realm Reborn",
                         Language.english)

    # Override the tag decoder for emphasis so it doesn't produce tags in string...
    def omit_tag_decoder(i, t, l):
        text.XivStringDecoder.get_integer(i)
        return text.nodes.StaticString('')

    _string_decoder.set_decoder(text.TagType.Emphasis.value, omit_tag_decoder)
    _string_decoder.set_decoder(
        text.TagType.SoftHyphen.value,
        lambda i,t,l: text.nodes.StaticString("\x26shy;"))

    return xiv


realm = _init_saintcoinach()

# Generated output will be JavaScript data file containing an array
# of fish objects.
#
# FISH[id, icon, name(loc), desc(loc)
#

fish_in_log = [x for x in realm.game_data.get_sheet('FishParameter')
               if x.get_raw('Item') != 0 and x.is_in_log]

FISH_INFOS = []
for fish in fish_in_log:
    fish_info = {'id': fish.item.key,
                 'name': fish.item.name,
                 'icon': '%06u' % fish.item.get_raw('Icon'),
                 'extra_icon': '%06u' % (fish.item.get_raw('Icon')+50000),
                 'level': [x for x in fish['GatheringItemLevel'].column_values],
                 'record': str(fish['FishingRecordType']),
                 'desc': fish.text,
                 'time_restricted': fish.time_restricted,
                 'weather_restricted': fish.weather_restricted,
                 'region': fish['TerritoryType'].region_place_name.name,
                 'zone': fish['TerritoryType'].place_name.name,
                 'collectable': fish.item.is_collectable,
                 'rarity': fish.item.rarity}
    FISH_INFOS += [fish_info]


def pretty_dump(obj):
    return json.dumps(obj, sort_keys=False, indent=2).replace('\n', '\n  ')


with open("fish_info_data.js", 'w') as f:
    import json

    f.write('const FISH_INFO = %s;' % pretty_dump(FISH_INFOS))

