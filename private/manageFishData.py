import argparse
import sys
import os
import yaml
try:
    from yaml import CLoader as Loader
except ImportError:
    from yaml import Loader
import json
from operator import itemgetter, add
from collections import OrderedDict, namedtuple
from functools import reduce
from itertools import islice, repeat
import logging

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
packs = None
fish_and_tackle_data = {}
XIV = None
KeyValuePair = None
FISHING_NODES = {}
SPEARFISHING_NODES = {}
WEATHER_RATES = {}
WEATHER_TYPES = {}
ICON_MAP = {}
REGIONS = {}
ZONES = {}
LANGUAGES = []

try:
    _SCRIPT_PATH = os.path.abspath(__path__)
except:
    _SCRIPT_PATH = os.path.abspath(os.path.dirname(__file__))

# _HELPER_LIBS_PATH = os.path.join(_SCRIPT_PATH, '..', '..')
_HELPER_LIBS_PATH = _SCRIPT_PATH


def nth(iterable, n, default=None):
    """Returns the nth item or a default value"""
    return next(islice(iterable, n, None), default)


def load_dats(args):
    # Add the Saint Coinach python API to the path.
    sys.path += [os.path.join(_HELPER_LIBS_PATH, 'saintcoinach-py')]

    # TODO: Really should have the ability to import the saintcoinach module
    #       which would give you XIV (XivCollection).
    import pack
    from ex.language import Language
    from xiv.xivcollection import XivCollection
    from ex.relational.definition import RelationDefinition
    import text
    global packs
    global LANGUAGES

    LANGUAGES = [Language.english,
                 Language.japanese,
                 Language.german,
                 Language.french]

    #packs = pack.PackCollection(r"C:\Program Files (x86)\SquareEnix\FINAL FANTASY XIV - A Realm Reborn\game\sqpack")
    packs = pack.PackCollection(args.game_path)
    coll = XivCollection(packs)
    coll.active_language = Language.english
    with open(os.path.join(_HELPER_LIBS_PATH, 'Saintcoinach', 'Saintcoinach', 'ex.json'),
              'r',
              encoding='utf-8') as f:
        coll.definition = RelationDefinition.from_json_fp(f)

    _string_decoder = text.XivStringDecoder.default()

    # Override the tag decoder for emphasis so it doesn't produce tags in string...
    def omit_tag_decoder(i, t, l):
        text.XivStringDecoder.get_integer(i)
        return text.nodes.StaticString('')

    _string_decoder.set_decoder(text.TagType.Emphasis.value, omit_tag_decoder)
    _string_decoder.set_decoder(
        text.TagType.SoftHyphen.value,
        lambda i,t,l: text.nodes.StaticString(_string_decoder.dash))

    return coll


def _is_town_or_field_territory(name):
    return len(name) == 4 and name[2] in ('f', 't', 'h') and str(name[3]).isdigit()


def _collect_weather_rates(rate):
    return [(r[1].key, r[0]) for r in rate.weather_rates if r[1].key != 0]

def _make_localized_field(fld_name, row, col_name):
    from ex import IMultiRow
    from xiv import IXivRow

    if isinstance(row, IXivRow):
        row = row.source_row
    if not isinstance(row, IMultiRow):
        raise TypeError('Expected row to be a IMultiRow')

    return map(lambda lang: (fld_name + lang.get_suffix(), row[(col_name, lang)]), LANGUAGES)

def _make_static_localized_field(fld_name, value):
    return zip([fld_name + lang.get_suffix() for lang in LANGUAGES],
                     repeat(value, len(LANGUAGES)))

def _decode_spearfishing_node_name(x):
    if x.get_raw('PlaceName') != 0:
        return _make_localized_field('name', x['PlaceName'], 'Name')
    else:
        return _make_static_localized_field('name', 'Node')

def initialize_data(args):
  global XIV
  global KeyValuePair
  global FISHING_NODES
  global SPEARFISHING_NODES
  global WEATHER_RATES
  global WEATHER_TYPES
  global ICON_MAP
  global REGIONS
  global ZONES

  XIV = load_dats(args)

  TERRITORIES = list(filter(lambda data: data.get_raw('Map') != 0 and
                                         _is_town_or_field_territory(data['Name']),
                            XIV.get_sheet('TerritoryType')))

  # Determine "useful" weather types.
  WEATHER_RATES = dict([
      (territory.key,
        dict({'map_id': territory.map.key,
              'zone_id': territory.place_name.key,
              'region_id': territory.region_place_name.key,
              'weather_rates': _collect_weather_rates(territory.weather_rate)}))
      for territory in TERRITORIES])
  
  WEATHER_TYPES = dict([
      (weather.key,
      dict([*_make_localized_field('name', weather, 'Name'),
            ('icon', '%06u' % weather.get_raw('Icon'))]))
      for weather in
      set(reduce(add, [t.weather_rate.possible_weathers for t in TERRITORIES], []))
      if weather.key != 0])
  
  FISHING_NODES = dict([
      (spot.key,
      dict([('_id', spot.key),
            *_make_localized_field('name', spot['PlaceName'], 'Name'),
            ('territory_id', spot.get_raw('TerritoryType'))]))
      for spot in XIV.get_sheet('FishingSpot')])
  
  SPEARFISHING_NODES = dict([
      (x['GatheringPointBase'].key,
      dict([('_id', x['GatheringPointBase'].key),
            *_decode_spearfishing_node_name(x),
            ('territory_id', x.get_raw('TerritoryType'))]))
      for x in XIV.get_sheet('GatheringPoint')
      if x['GatheringPointBase']['GatheringType'].key == 4])
  
  REGIONS = dict([
      (territory.region_place_name.key,
       dict(_make_localized_field('name', territory.region_place_name, 'Name')))
      for territory in TERRITORIES])
  
  ZONES = dict([
      (territory.place_name.key,
       dict(_make_localized_field('name', territory.place_name, 'Name')))
      for territory in TERRITORIES])

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
  
  # Store the dictionaries sorted by key
  # This makes the generated JS a bit more consistent.
  WEATHER_RATES = OrderedDict(sorted(WEATHER_RATES.items(), key=lambda t: t[0]))
  WEATHER_TYPES = OrderedDict(sorted(WEATHER_TYPES.items(), key=lambda t: t[0]))
  FISHING_NODES = OrderedDict(sorted(FISHING_NODES.items(), key=lambda t: t[0]))
  SPEARFISHING_NODES = OrderedDict(sorted(SPEARFISHING_NODES.items(), key=lambda t: t[0]))
  REGIONS = OrderedDict(sorted(REGIONS.items(), key=lambda t: t[0]))
  ZONES = OrderedDict(sorted(ZONES.items(), key=lambda t: t[0]))
  
  KeyValuePair = namedtuple('KeyValuePair', ['key', 'value'])


def lookup_fish_by_name(name):
    result = nth(filter(lambda item: item[1]['name_en'] == name,
                        fish_and_tackle_data.items()), 0)
    if result is None:
        raise ValueError(name)
    return KeyValuePair(*result)


def lookup_weather_by_name(name):
    result = nth(filter(lambda item: item[1]['name_en'] == name,
                        WEATHER_TYPES.items()), 0)
    if result is None:
        raise ValueError(name)
    return KeyValuePair(*result)


def lookup_fishing_spot_by_name(name):
    if name is None:
        return KeyValuePair(None, None)
    result = nth(filter(lambda item: item[1]['name_en'] == name,
                        FISHING_NODES.items()), 0)
    if result is None:
        raise ValueError(name)
    return KeyValuePair(*result)


def lookup_spearfishing_spot_by_name(name):
    if name is None:
        return KeyValuePair()
    if isinstance(name, int):
        return KeyValuePair(name, None)
    result = nth(filter(lambda item: item[1]['name_en'] == name,
                        SPEARFISHING_NODES.items()), 0)
    if result is None:
        raise ValueError(name)
    return KeyValuePair(*result)


def convert_fish_to_json(item):
    key = lookup_fish_by_name(item['name']).key
    weather_set = [lookup_weather_by_name(x).key for x in item['weatherSet'] or []]
    previous_weather_set = [lookup_weather_by_name(x).key for x in item['previousWeatherSet'] or []]
    if item.get('gig') is not None:
        location = lookup_spearfishing_spot_by_name(item['location']).key
    else:
        location = lookup_fishing_spot_by_name(item['location']).key
    catch_path = [lookup_fish_by_name(x).key for x in item['bestCatchPath'] or []]
    predators = {}
    if item.get('predators') is not None:
        predators = dict([(lookup_fish_by_name(x[0]).key, x[1]) for x in item['predators'].items()])

    return (key,
            OrderedDict({'_id': key,
                         'previousWeatherSet': previous_weather_set,
                         'weatherSet': weather_set,
                         'startHour': item['startHour'],
                         'endHour': item['endHour'],
                         'location': location,
                         'bestCatchPath': catch_path,
                         'predators': predators,
                         'patch': item.get('patch'),
                         'folklore': item.get('folklore', False),
                         'fishEyes': item.get('fishEyes', False),
                         'snagging': item.get('snagging', False),
                         'hookset': item.get('hookset', None),
                         'gig': item.get('gig', None)}))


def rebuild_fish_data(args):
    global fish_and_tackle_data
    # Parse the fish data in the YAML file.
    fishes = yaml.load(open(args.yaml_file, 'r'), Loader=Loader)
    # Collect all of the fish/tackle names.
    fish_and_tackle_names = list(set(filter(None, reduce(
        add, [[fish['name']] +
              list((fish.get('predators', {}) or {}).keys()) +
              (fish['bestCatchPath'] or [])
              for fish in fishes], []))))
    # Match these with Item records.
    fish_and_tackle_data = OrderedDict()
    for item in XIV.get_sheet('Item'):
        if item['Name'] not in fish_and_tackle_names:
            continue
        fish_and_tackle_data[item.key] = dict([
            ('_id', item.key),
            *_make_localized_field('name', item, 'Name'),
            ('icon', '%06u' % item.get_raw('Icon'))])

    # Verify nothing's missing.
    diffs = set(fish_and_tackle_names) - \
            set(map(itemgetter('name_en'), fish_and_tackle_data.values()))
    if len(diffs) != 0:
        raise KeyError("Missing item names: %s" % ', '.join(diffs))

    # Make sure any predators have data defined for them too!
    predators = set(filter(None,
                       reduce(add,
                              [list((fish.get('predators', {}) or {}).keys())
                               for fish in fishes])))
    diffs = predators - \
            set([fish['name'] for fish in fishes]) - \
            set(map(itemgetter('name_en'), fish_and_tackle_data.values()))
    if len(diffs) != 0:
        raise KeyError("Missing predators: %s" % ', '.join(diffs))

    diffs = predators - \
            set([fish['name'] for fish in fishes])
    if len(diffs) != 0:
        raise KeyError("Missing predator definitions: %s" % ', '.join(diffs))

    fish_data = OrderedDict(map(convert_fish_to_json, fishes))

    # Re-sort the ITEMS dictionary.
    fish_and_tackle_data = OrderedDict(sorted(fish_and_tackle_data.items(), key=lambda t: t[0]))

    with open(args.js_file, 'w') as f:
        def dump_foldable(o):
            s = json.dumps(o)
            return s[0] + '\n    ' + s[1:][:-1] + '\n  ' + s[-1]

        f.write("const DATA = {\n")
        f.write("  FISH: %s,\n" % dump_foldable(fish_data))
        f.write("  FISHING_SPOTS: %s,\n" % dump_foldable(FISHING_NODES))
        f.write("  SPEARFISHING_SPOTS: %s,\n" % dump_foldable(SPEARFISHING_NODES))
        f.write("  ITEMS: %s,\n" % dump_foldable(fish_and_tackle_data))
        f.write("  WEATHER_RATES: %s,\n" % dump_foldable(WEATHER_RATES))
        f.write("  WEATHER_TYPES: %s,\n" % dump_foldable(WEATHER_TYPES))
        f.write("  REGIONS: %s,\n" % dump_foldable(REGIONS))
        f.write("  ZONES: %s\n" % dump_foldable(ZONES))
        f.write("}\n")

    if args.with_icons:
        # Create image/fish_n_tackle dir if not exists
        if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', 'fish_n_tackle')):
          os.makedirs(os.path.join(_SCRIPT_PATH, 'images', 'fish_n_tackle'))
        # Check that the private/images/* folders contain all of the icons used.
        for item in filter(lambda x: x.key in fish_and_tackle_data.keys(),
                           XIV.get_sheet('Item')):
            if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', 'fish_n_tackle',
                                               '%06u.png' % item.get_raw('Icon'))):
                logging.info('Extracting %s' % item['Icon'])
                icon = item.as_image('Icon')
                icon.get_image().save(
                    os.path.join(_SCRIPT_PATH, 'images', 'fish_n_tackle',
                                 '%06u.png' % item.get_raw('Icon')))
        # Create image/fish_n_tackle dir if not exists
        if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', 'weather')):
          os.makedirs(os.path.join(_SCRIPT_PATH, 'images', 'weather'))
        for weather in filter(lambda x: x.key in WEATHER_TYPES.keys(),
                              XIV.get_sheet('Weather')):
            if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', 'weather',
                                               '%06u.png' % weather.get_raw('Icon'))):
                logging.info('Extracting %s' % weather['Icon'])
                icon = weather.as_image('Icon')
                icon.get_image().save(
                    os.path.join(_SCRIPT_PATH, 'images', 'weather',
                                 '%06u.png' % weather.get_raw('Icon')))
        # Create image/{action|status} dir if not exists
        from imaging import IconHelper
        global packs
        for subdir in ICON_MAP:
          if not os.path.isdir(os.path.join(_SCRIPT_PATH, 'images', subdir)):
              os.makedirs(os.path.join(_SCRIPT_PATH, 'images', subdir))
          for n, filename in ICON_MAP[subdir]:
              if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', subdir, filename)):
                  icon = IconHelper.get_icon(packs, n)
                  logging.info('Extracting %s -> %s' % (icon, filename))
                  icon.get_image().save(os.path.join(_SCRIPT_PATH, 'images', subdir, filename))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Fish Data Management Script')
    subparsers = parser.add_subparsers()

    parser_rebuild = subparsers.add_parser('rebuild',
                                           help='Rebuilds JS data from YAML')
    parser_rebuild.add_argument('-i', '--in', type=str,
                                default=os.path.join(_SCRIPT_PATH, 'fishData.yaml'),
                                dest='yaml_file',
                                help='Path to current fish data YAML file')
    parser_rebuild.add_argument('-o', '--out', type=str,
                                default=os.path.join(_SCRIPT_PATH, 'data.js'),
                                dest='js_file',
                                help='Where to store Java Script data (data.js)')
    parser_rebuild.add_argument('--game_path', '-gpath', type=str,
                                default=r"C:\Program Files (x86)\SquareEnix\FINAL FANTASY XIV - A Realm Reborn\game\sqpack",
                                dest='game_path',
                                help='Path to FF14 sqpack directory')
    parser_rebuild.add_argument('--with-icons', action='store_true', default=False,
                                help='Extract missing icons')
    parser_rebuild.set_defaults(func=rebuild_fish_data)

    args = parser.parse_args()
    initialize_data(args)
    args.func(args)
