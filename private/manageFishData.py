import argparse
import sys
import os
import yaml
import json
from operator import itemgetter, add
from collections import OrderedDict, namedtuple
from functools import reduce
from itertools import islice
import logging

logging.basicConfig(level=logging.INFO,
                    stream=sys.stderr)

from pprint import pprint

try:
    _SCRIPT_PATH = os.path.abspath(__path__)
except:
    _SCRIPT_PATH = os.path.abspath(os.path.dirname(__file__))

def nth(iterable, n, default=None):
    """Returns the nth item or a default value"""
    return next(islice(iterable, n, None), default)

def load_dats():
    # Add the Saint Coinach python API to the path.
    sys.path += [os.path.join(_SCRIPT_PATH, '..', '..', 'saintcoinach-py')]

    import pack
    from ex.language import Language
    from xiv.xivcollection import XivCollection
    from ex.relational.definition import RelationDefinition
    import text

    packs = pack.PackCollection(r"C:\Program Files (x86)\SquareEnix\FINAL FANTASY XIV - A Realm Reborn\game\sqpack")
    coll = XivCollection(packs)
    coll.active_language = Language.english
    with open(os.path.join(_SCRIPT_PATH, '..', '..', 'Saintcoinach', 'Saintcoinach', 'ex.json'),
              'r',
              encoding='utf-8') as f:
        coll.definition = RelationDefinition.from_json_fp(f)

    # Override the tag decoder for emphasis so it doesn't produce tags in string...
    def omit_tag_decoder(i, t, l):
        text.XivStringDecoder.get_integer(i)
        return text.nodes.StaticString('')

    text.XivStringDecoder.default().set_decoder(
        text.TagType.Emphasis.value, omit_tag_decoder)

    return coll

XIV = load_dats()
fish_and_tackle_data = {}





def _is_town_or_field_territory(name):
    return len(name) == 4 and name[2] in ('f', 't', 'h') and str(name[3]).isdigit()

TERRITORIES = list(filter(lambda data: data.get_raw('Map') != 0 and
                                       _is_town_or_field_territory(data['Name']),
                          XIV.get_sheet('TerritoryType')))

def _collect_weather_rates(rate):
    return [(r[1].key, r[0]) for r in rate.weather_rates if r[1].key != 0]

# Determine "useful" weather types.
WEATHER_RATES = dict([
    (territory.key, {'map_id': territory.map.key,
                     'zone_id': territory.place_name.key,
                     'zone_name': str(territory.place_name.name),
                     'region_id': territory.region_place_name.key,
                     'region_name': str(territory.region_place_name.name),
                     'weather_rates': _collect_weather_rates(territory.weather_rate)})
    for territory in TERRITORIES])

WEATHER_TYPES = dict([
    (weather.key, {'name': str(weather.name),
                   'icon': '%06u' % weather.get_raw('Icon')})
    for weather in
    set(reduce(add, [t.weather_rate.possible_weathers for t in TERRITORIES], []))
    if weather.key != 0])

FISHING_NODES = dict([
    (spot.key, {'_id': spot.key,
                'name': str(spot.as_string('PlaceName')),
                'territory_id': spot.get_raw('TerritoryType')})
    for spot in XIV.get_sheet('FishingSpot')])

SPEARFISHING_NODES = dict([
    (x['GatheringPointBase'].key,
     {'_id': x['GatheringPointBase'].key,
      'name': str(x.as_string('PlaceName')) if x.get_raw('PlaceName') != 0 else 'Node',
      'territory_id': x.get_raw('TerritoryType')})
    for x in XIV.get_sheet('GatheringPoint')
    if x['GatheringPointBase']['GatheringType'].key == 4])


KeyValuePair = namedtuple('KeyValuePair', ['key', 'value'])

def lookup_fish_by_name(name):
    result = nth(filter(lambda item: item[1]['name'] == name,
                        fish_and_tackle_data.items()), 0)
    if result is None:
        raise ValueError(name)
    return KeyValuePair(*result)


def lookup_weather_by_name(name):
    result = nth(filter(lambda item: item[1]['name'] == name,
                        WEATHER_TYPES.items()), 0)
    if result is None:
        raise ValueError(name)
    return KeyValuePair(*result)


def lookup_fishing_spot_by_name(name):
    if name is None:
        return KeyValuePair(None, None)
    result = nth(filter(lambda item: item[1]['name'] == name,
                        FISHING_NODES.items()), 0)
    if result is None:
        raise ValueError(name)
    return KeyValuePair(*result)


def lookup_spearfishing_spot_by_name(name):
    if name is None:
        return KeyValuePair()
    if isinstance(name, int):
        return KeyValuePair(name, None)
    result = nth(filter(lambda item: item[1]['name'] == name,
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
        predators = dict([(lookup_fish_by_name(x[0]).key, x[1])
                          for x in item['predators'].items()])

    return (key, {'_id': key,
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
                  'gig': item.get('gig', None)})


def rebuild_fish_data(args):
    global fish_and_tackle_data
    # Parse the fish data in the YAML file.
    fishes = yaml.load(open(args.yaml_file, 'r'))
    # Collect all of the fish/tackle names.
    fish_and_tackle_names = list(set(filter(None, reduce(
        add, [[fish['name']] +
              list((fish.get('predators', {}) or {}).keys()) +
              (fish['bestCatchPath'] or [])
              for fish in fishes], []))))
    # Match these with Item records.
    fish_and_tackle_data = {}
    for item in XIV.get_sheet('Item'):
        if item['Name'] not in fish_and_tackle_names:
            continue
        fish_and_tackle_data[item.key] = {'_id': item.key,
                                          'name': item['Name'],
                                          'icon': '%06u' % item.get_raw('Icon')}

    # Verify nothing's missing.
    diffs = set(fish_and_tackle_names) - \
            set(map(itemgetter('name'), fish_and_tackle_data.values()))
    if len(diffs) != 0:
        raise KeyError("Missing item names: %s" % ', '.join(diffs))

    # Make sure any predators have data defined for them too!
    diffs = set(filter(None,
                       reduce(add,
                              [list((fish.get('predators', {}) or {}).keys())
                               for fish in fishes]))) - \
        set([fish['name'] for fish in fishes]) - \
        set(map(itemgetter('name'), fish_and_tackle_data.values()))
    if len(diffs) != 0:
        raise KeyError("Missing predators: %s" % ', '.join(diffs))

    #pprint(fish_and_tackle_data)

    fish_data = dict(map(convert_fish_to_json, fishes))

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
        f.write("  WEATHER_TYPES: %s\n" % dump_foldable(WEATHER_TYPES))
        f.write("}\n")

    if args.with_icons:
        # Check that the private/images/* folders contain all of the icons used.
        for item in filter(lambda x: x.key in fish_and_tackle_data.keys(),
                           XIV.get_sheet('Item')):
            if not os.path.exists(os.path.join('.', 'images', 'fish_n_tackle',
                                               '%06u.png' % item.get_raw('Icon'))):
                logging.info('Extracting %s' % item['Icon'])
                icon = item.as_image('Icon')
                icon.get_image().save(
                    os.path.join('.', 'images', 'fish_n_tackle',
                                 '%06u.png' % item.get_raw('Icon')))
        for weather in filter(lambda x: x.key in WEATHER_TYPES.keys(),
                              XIV.get_sheet('Weather')):
            if not os.path.exists(os.path.join('.', 'images', 'weather',
                                               '%06u.png' % weather.get_raw('Icon'))):
                logging.info('Extracting %s' % weather['Icon'])
                icon = weather.as_image('Icon')
                icon.get_image().save(
                    os.path.join('.', 'images', 'weather',
                                 '%06u.png' % weather.get_raw('Icon')))




if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Fish Data Management Script')
    subparsers = parser.add_subparsers()

    parser_rebuild = subparsers.add_parser('rebuild',
                                           help='Rebuilds JS data from YAML')
    parser_rebuild.add_argument('-i', '--in', type=str, default='fishData.yaml',
                                dest='yaml_file',
                                help='Path to current fish data YAML file')
    parser_rebuild.add_argument('-o', '--out', type=str, default='data.js',
                                dest='js_file',
                                help='Where to store Java Script data (data.js)')
    parser_rebuild.add_argument('--with-icons', action='store_true', default=False,
                                help='Extract missing icons')
    parser_rebuild.set_defaults(func=rebuild_fish_data)

    args = parser.parse_args()
    args.func(args)