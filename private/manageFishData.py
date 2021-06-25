import argparse
import sys
import os
import yaml
try:
    from yaml import CLoader as Loader
except ImportError:
    from yaml import Loader
try:
    from yaml import CDumper as Dumper
except ImportError:
    from yaml import Dumper
import json
from operator import itemgetter, add
from collections import OrderedDict, namedtuple, deque
from functools import reduce
from itertools import islice, repeat
import logging

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
fish_and_tackle_data = {}
XIV = None  # type: 'pysaintcoinach.ARealmReversed'
KeyValuePair = None
FISHING_NODES = None
SPEARFISHING_NODES = None
WEATHER_RATES = None
WEATHER_TYPES = None
ICON_MAP = None
REGIONS = {}
ZONES = {}
LANGUAGES = []
GATHERING_SUB_CATEGORIES = None

try:
    _SCRIPT_PATH = os.path.abspath(__path__)
except:
    _SCRIPT_PATH = os.path.abspath(os.path.dirname(__file__))

# _HELPER_LIBS_PATH = os.path.join(_SCRIPT_PATH, '..', '..')
_HELPER_LIBS_PATH = _SCRIPT_PATH


def nth(iterable, n, default=None):
    """Returns the nth item or a default value"""
    return next(islice(iterable, n, None), default)


def first(iterable, pred, default=None):
    """Returns the first item for which pred(item) is true.

    If no true value is found, returns *default*

    """
    return next(filter(pred, iterable), default)


def consume(iterator, n=None):
    if n is None:
        deque(iterator, maxlen=0)
    else:
        next(islice(iterator, n, n), None)
    return iterator


def load_dats(args):
    # Add the Saint Coinach python API to the path.
    sys.path += [os.path.join(_HELPER_LIBS_PATH, 'saintcoinach-py')]

    from pysaintcoinach import ARealmReversed
    import pysaintcoinach.text as text
    from pysaintcoinach.ex.language import Language

    # Add ExtractedSheet plugin to library.
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
    xiv = ARealmReversed(args.game_path, Language.english)
    # Override the tag decoder for emphasis so it doesn't produce tags in string...
    def omit_tag_decoder(i, t, l):
        text.XivStringDecoder.get_integer(i)
        return text.nodes.StaticString('')

    _string_decoder.set_decoder(text.TagType.Emphasis.value, omit_tag_decoder)
    _string_decoder.set_decoder(
        text.TagType.Indent.value,
        lambda i,t,l: text.nodes.StaticString(" "))
    _string_decoder.set_decoder(
        text.TagType.SoftHyphen.value,
        lambda i,t,l: text.nodes.StaticString("\u00AD"))

    return xiv


def _is_town_or_field_territory(name):
    return len(name) == 4 and name[2] in ('f', 't', 'h') and str(name[3]).isdigit()


def _collect_weather_rates(rate):
    return [(r[1].key, r[0]) for r in rate.weather_rates if r[1].key != 0]


def _make_localized_field(fld_name, row, col_name):
    from pysaintcoinach.ex import IMultiRow
    from pysaintcoinach.xiv import IXivRow

    global LANGUAGES

    if isinstance(row, IXivRow):
        row = row.source_row
    if not isinstance(row, IMultiRow):
        raise TypeError('Expected row to be a IMultiRow')

    def try_get_value(row, col_name, lang):
        try:
            value = row[(col_name, lang)]
            if value != '':
                return value
            # Fall through if value is blank!
        except KeyError:
            pass

        # Use the default language name instead...
        value = row[col_name]
        logging.debug("Missing %s data for %s[%u][%s], using \"%s\" instead.",
                        lang.name,
                        row.sheet.name,
                        row.key,
                        col_name,
                        value)
        return value

    return map(lambda lang: (fld_name + lang.get_suffix(), try_get_value(row, col_name, lang)), LANGUAGES)


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
    global GATHERING_SUB_CATEGORIES

    XIV = load_dats(args)

    TERRITORIES = list(filter(lambda data: data.get_raw('Map') != 0 and
                                           _is_town_or_field_territory(data['Name']),
                              XIV.game_data.get_sheet('TerritoryType')))

    # Determine "useful" weather types.
    WEATHER_RATES = dict([
        (territory.key,
         dict({'map_id': territory.map.key,
               'map_scale': territory.map.size_factor,
               'zone_id': territory.place_name.key,
               'region_id': territory.region_place_name.key,
               'weather_rates': _collect_weather_rates(territory.weather_rate)}))
        for territory in TERRITORIES])

    GATHERING_SUB_CATEGORIES = dict([
        (x.key,
         dict([*_make_localized_field('book', x, 'FolkloreBook'),
               *_make_localized_field('name', x['Item'], 'Name')]))
        for x in XIV.game_data.get_sheet('GatheringSubCategory')])

    WEATHER_TYPES = dict([
        (weather.key,
         dict([*_make_localized_field('name', weather, 'Name'),
               ('icon', '%06u' % weather.get_raw('Icon'))]))
        for weather in
        set(reduce(add, [t.weather_rate.possible_weathers for t in TERRITORIES], []))
        if weather.key != 0])

    # TODO: Support Ocean Fishing nodes as well.
    FISHING_NODES = dict([
        (spot.key,
         dict([('_id', spot.key),
               *_make_localized_field('name', spot['PlaceName'], 'Name'),
               ('territory_id', spot.get_raw('TerritoryType')),
               ('placename_id', spot.key),
               ('map_coords', [spot.map_x, spot.map_y, spot.radius])]))
        for spot in XIV.game_data.get_sheet('FishingSpot')
        if spot.get_raw('PlaceName{Main}') == 0 and spot.get_raw('TerritoryType') != 0])

    SPEARFISHING_NODES = dict([
        (x['GatheringPointBase'].key,
         dict([('_id', x['GatheringPointBase'].key),
               *_decode_spearfishing_node_name(x),
               ('territory_id', x.get_raw('TerritoryType')),
               ('placename_id', x.key)]))
        for x in XIV.game_data.get_sheet('GatheringPoint')
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
            (60166, 'aquarium.png'),
        ],
        'mapmarker': [
            (60556, 'folklore.png')
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
    GATHERING_SUB_CATEGORIES = OrderedDict(sorted(GATHERING_SUB_CATEGORIES.items(), key=lambda t: t[0]))

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
    #if more than 1 instance is available in raw data, take the first one
    if isinstance(name, list):
        name = name[0]
    if name is None:
        return KeyValuePair(None, None)
    result = nth(filter(lambda item: item[1]['name_en'] == name,
                        FISHING_NODES.items()), 0)
    if result is None:
        # HOLD ON, Clorifex says SE f's this up a lot... and can sometimes turn
        # the first letter of place names to lowercase... Seriously SE?
        result = nth(filter(lambda item: item[1]['name_en'].lower() == name.lower(),
                            FISHING_NODES.items()), 0)
        if result is None:
            raise ValueError(name)
    return KeyValuePair(*result)


def lookup_spearfishing_spot_by_name(name):
    #if more than 1 instance is available in raw data, take the first one
    if isinstance(name, list):
        name = name[0]
    if name is None:
        return KeyValuePair()
    if isinstance(name, int):
        return KeyValuePair(name, None)
    result = nth(filter(lambda item: item[1]['name_en'] == name,
                        SPEARFISHING_NODES.items()), 0)
    if result is None:
        raise ValueError(name)
    return KeyValuePair(*result)


def supports_fish_eyes(fish_id, location_id, fish_params, patch):
    from pysaintcoinach.ex.language import Language

    # The fish must not be legendary: i.e. not include the phase: "オオヌシ".
    fish = XIV.game_data.get_sheet('Item')[fish_id]
    if "オオヌシ" in fish.source_row['Description', Language.japanese]:
        return False
    # As of 5.4, Fish Eyes only works on fish in areas prior to Stormblood.
    if location_id is not None:
        spot = XIV.game_data.get_sheet('FishingSpot')[location_id]
        if spot.territory_type['ExVersion'].key >= 2:
            return False
    else:
        # Sigh... let's just use the patch instead... One more reason to switch
        # to the new-and-improved back-end data processor...
        if int(patch) >= 4:
            return False

    # While technically any other fish does support Fish Eyes, only fish with
    # time restrictions truly can use it.
    # NOTE: Disabled because... well, run integrity checks and you'll see -_-
    # return fish_params is not None and fish_params.time_restricted
    return True


def convert_fish_to_json(item):
    try:
        return _convert_fish_to_json(item)
    except Exception as exc:
        logging.exception("Failed to process: %r" % item)
        raise


def _convert_fish_to_json(item):
    item.setdefault('startHour', 0)
    item.setdefault('endHour', 24)
    item.setdefault('weatherSet', [])
    item.setdefault('previousWeatherSet', [])
    item.setdefault('bestCatchPath', [])

    key = lookup_fish_by_name(item['name']).key
    weather_set = [lookup_weather_by_name(x).key for x in item['weatherSet'] or []]
    previous_weather_set = [lookup_weather_by_name(x).key for x in item['previousWeatherSet'] or []]
    if 'location' in item:
        if item.get('gig') is not None:
            location = lookup_spearfishing_spot_by_name(item['location']).key
        else:
            location = lookup_fishing_spot_by_name(item['location']).key
    else:
        location = None  # Some fish, we simply don't care about their location.
    catch_path = [lookup_fish_by_name(x).key for x in item['bestCatchPath'] or []]
    predators = {}
    if item.get('predators') is not None:
        predators = dict([(lookup_fish_by_name(x[0]).key, x[1]) for x in item['predators'].items()])

    # Aquarium information:
    # - Just pull this from the DATs. Sometimes they add support for old fish.
    aquarium_entry = first(XIV.game_data.get_sheet('AquariumFish'),
                           lambda r: r.get_raw('Item') == key)
    if aquarium_entry is not None:
        aquarium_entry = dict({'water': str(aquarium_entry['AquariumWater']),
                               'size': int(aquarium_entry['Size'])})

    # Check if the fish requires Folklore (use the DATs, ignore old data from YAML file)
    # Technically, every fish /should/ have an entry in this table... but we'll be safe.
    folklore = None
    data_missing = None
    fish_parameter = first(XIV.game_data.get_sheet('FishParameter'),
                           lambda r: r.get_raw('Item') == key)
    if fish_parameter is not None:
        folklore = fish_parameter['GatheringSubCategory']
        if folklore is not None:
            # Convert to raw key to allow for localization (and less duplication)
            folklore = folklore.key
        # If the entry is marked as "dataMissing", then populate the time and weather
        # restriction values. Also, display a warning in the logs so we know we need
        # to resolve the missing information in the future.
        if item.get('dataMissing', False):
            data_missing = {'weatherRestricted': fish_parameter.weather_restricted,
                            'timeRestricted': fish_parameter.time_restricted}
            logging.warning('%s still needs conditions verified', item['name'])
    elif item.get('gig') is None:
        logging.warning('%s does not have an entry in FishParameter?!', item['name'])

    is_collectable = XIV.game_data.get_sheet('Item')[key].as_boolean('IsCollectable')

    tug_type = item.get('tug', None)
    if tug_type is not None:
        tug_type = tug_type.lower()
        if tug_type == 'legendary':
            tug_type = 'heavy'
        if tug_type not in ['light', 'medium', 'heavy']:
            logging.warning('%s has an invalid tug type: %s', item['name'], item['tug'])
            tug_type = None

    # Patch 5.4 removes Fish Eyes as a requirement for catching certain fish.
    # Instead, the action is now a buff that enables non-legendary fish with
    # only a time restriction to be caught whenever.
    if item.get('gig') is None:
        fish_eyes = supports_fish_eyes(key, location, fish_parameter, item.get('patch'))
    else:
        # Fish Eyes doesn't affect spearfishing.
        fish_eyes = False

    return (key,
            OrderedDict({'_id': key,
                         'previousWeatherSet': previous_weather_set,
                         'weatherSet': weather_set,
                         'startHour': item['startHour'],
                         'endHour': item['endHour'],
                         'location': location,
                         'bestCatchPath': catch_path,
                         'predators': predators,
                         'intuitionLength': item.get('intuitionLength', None),
                         'patch': item.get('patch'),
                         'folklore': folklore,
                         'collectable': is_collectable,
                         'fishEyes': fish_eyes,
                         'snagging': item.get('snagging', False),
                         'hookset': item.get('hookset', None),
                         'tug': tug_type,
                         'gig': item.get('gig', None),
                         'aquarium': aquarium_entry,
                         'dataMissing': data_missing}))


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
    for item in XIV.game_data.get_sheet('Item'):
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
        f.write("  ZONES: %s,\n" % dump_foldable(ZONES))
        f.write("  FOLKLORE: %s\n" % dump_foldable(GATHERING_SUB_CATEGORIES))
        f.write("}\n")

    if args.with_icons:
        # Create image/fish_n_tackle dir if not exists
        if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', 'fish_n_tackle')):
            os.makedirs(os.path.join(_SCRIPT_PATH, 'images', 'fish_n_tackle'))
        # Check that the private/images/* folders contain all of the icons used.
        for item in filter(lambda x: x.key in fish_and_tackle_data.keys(),
                           XIV.game_data.get_sheet('Item')):
            if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', 'fish_n_tackle',
                                               '%06u.png' % item.get_raw('Icon'))):
                logging.info('Extracting %s  (%s)' % (item['Icon'], str(item['Name'])))
                icon = item.as_image('Icon')
                icon.get_image().save(
                    os.path.join(_SCRIPT_PATH, 'images', 'fish_n_tackle',
                                 '%06u.png' % item.get_raw('Icon')))
        # Create image/fish_n_tackle dir if not exists
        if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', 'weather')):
            os.makedirs(os.path.join(_SCRIPT_PATH, 'images', 'weather'))
        for weather in filter(lambda x: x.key in WEATHER_TYPES.keys(),
                              XIV.game_data.get_sheet('Weather')):
            if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', 'weather',
                                               '%06u.png' % weather.get_raw('Icon'))):
                logging.info('Extracting %s' % weather['Icon'])
                icon = weather.as_image('Icon')
                icon.get_image().save(
                    os.path.join(_SCRIPT_PATH, 'images', 'weather',
                                 '%06u.png' % weather.get_raw('Icon')))
        # Create image/{action|status} dir if not exists
        from pysaintcoinach.imaging import IconHelper
        for subdir in ICON_MAP:
            if not os.path.isdir(os.path.join(_SCRIPT_PATH, 'images', subdir)):
                os.makedirs(os.path.join(_SCRIPT_PATH, 'images', subdir))
            for n, filename in ICON_MAP[subdir]:
                if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', subdir, filename)):
                    icon = IconHelper.get_icon(XIV.packs, n)
                    logging.info('Extracting %s -> %s' % (icon, filename))
                    icon.get_image().save(os.path.join(_SCRIPT_PATH, 'images', subdir, filename))

        # Import the icons for collectable and folklore
        fishing_note_book = None
        if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', 'collectable.png')):
            if fishing_note_book is None:
                fishing_note_book = XIV.packs.get_file('ui/uld/FishingNoteBook.tex').get_image()
            logging.info('Extracting collectable.png')
            fishing_note_book.crop((104, 28, 124, 48)).save(os.path.join(_SCRIPT_PATH, 'images', 'collectable.png'))
        if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', 'folklore.png')):
            if fishing_note_book is None:
                fishing_note_book = XIV.packs.get_file('ui/uld/FishingNoteBook.tex').get_image()
            logging.info('Extracting folklore.png')
            fishing_note_book.crop((124, 28, 144, 48)).save(os.path.join(_SCRIPT_PATH, 'images', 'folklore.png'))


def check_data_integrity(args):
    has_errors = False
    # Parse the fish data in the YAML file.
    fishes = yaml.load(open(args.yaml_file, 'r'), Loader=Loader)

    for fish in fishes:
        fish = fish  # type: dict

        fish.setdefault('startHour', 0)
        fish.setdefault('endHour', 24)
        fish.setdefault('weatherSet', [])
        fish.setdefault('previousWeatherSet', [])
        fish.setdefault('bestCatchPath', [])

        # Check for hookset definition.
        # For fish that require mooching, Patience is almost always used. Knowing
        # which hookset to use is vital, so make sure mooch fish have it defined!
        if len(fish.get('bestCatchPath') or []) > 1:
            if fish.get('hookset') is None:
                logging.error('%s requires mooching and should have a hookset defined', fish['name'])
            for mooched_name, mooched_fish in map(lambda name: (name, first(fishes, lambda x: x['name'] == name)),
                                                  reversed(list(consume(iter(fish['bestCatchPath']), 1)))):
                if mooched_fish is None:
                    logging.error('%s is missing from database?!', mooched_name)
                    continue
                if mooched_fish.get('hookset') is None:
                    logging.error('%s is mooched to catch %s and should have a hookset defined',
                                  mooched_fish['name'], fish['name'])

        # For each fish, verify time and weather restrictions have been recorded.
        fish_params = first(XIV.game_data.get_sheet('FishParameter'),
                            lambda x: x['Item'] is not None and x['Item']['Name'] == fish['name'])
        if fish_params is None:
            continue

        # VERY IMPORTANT NOTE:
        #   The game data very often does not restrict the weather or time for
        #   mooched fish. That is, if a particular fish can only be caught by
        #   mooching a fish with time/weather restrictions, it itself won't
        #   appear to be restricted (according to the DATs).
        #   For the sake of use experience, restrictions have often been copied
        #   over to the target fish. This should be revisted once the UI allows
        #   better display of mooch fish (similar to intuition fish).

        # Check if time restricted.
        if fish_params.time_restricted and \
                fish['startHour'] == 0 and fish['endHour'] == 24:
            has_errors = True
            logging.error('%s should be time restricted', fish['name'])
        elif not fish_params.time_restricted and \
                not (fish['startHour'] == 0 and fish['endHour'] == 24):
            has_errors = True
            logging.error('%s should not be time restricted', fish['name'])

        # Check if weather restricted.
        if fish_params.weather_restricted and \
                len(fish['previousWeatherSet'] or []) == 0 and \
                len(fish['weatherSet'] or []) == 0:
            has_errors = True
            logging.error('%s should be weather restricted', fish['name'])
        elif not fish_params.weather_restricted and \
                (len(fish['weatherSet'] or []) != 0 or
                 len(fish['previousWeatherSet'] or []) != 0):
            has_errors = True
            logging.error('%s should not be weather restricted', fish['name'])

        # Check if fish eyes or snagging should be set.
        # This is not 100% accurate yet. According to crowd-sourced data, even when
        # this check says Snagging isn't required, the majority of comments say it
        # is needed. It doesn't help that it also seems to apply to Fish Eyes.
        # NOTE: I've left the "Fish Eyes" check in there for now. I expect this
        # table to undergo significant changes in 5.2... Please look forward to it.
        fish_eyes_needed = fish.get('fishEyes') or False
        snagging_needed = fish.get('snagging') or False
        if not fish_params['IsHidden'] and fish_params[5]:  # Rare = index: 5
            if fish_eyes_needed is False and snagging_needed is False:
                has_errors = True
                logging.error('%s should require Fish Eyes or Snagging', fish['name'])
        elif snagging_needed is not False:
            has_errors = True
            logging.error('%s should not require Snagging', fish['name'])

    if has_errors:
        logging.error('Data integrity check failed...')

    return not has_errors


def add_new_fish_data(args):
    global XIV  # type: 'pysaintcoinach.ARealmReversed'

    # Parse the fish data in the YAML file.
    fishes = yaml.load(open(args.existing_data, 'r'), Loader=Loader)
    known_fishes = [fish['name'] for fish in fishes]

    # Add ignored fish as well please.
    if args.ignored_fish is not None:
        with open(args.ignored_fish, 'r') as f:
            known_fishes += [fish.strip() for fish in f]

    known_fishes = set(known_fishes)

    # Iterate all of the FishingSpot entries next, skipping any fish we already know about.
    new_fishes = {}

    from pysaintcoinach.xiv.fishing_spot import FishingSpot
    for fishing_spot in XIV.game_data.get_sheet(FishingSpot):
        if fishing_spot.place_name.key == 0:
            continue
        if fishing_spot.get_raw("PlaceName{Main}") != 0:
            # TODO: For now, exclude Ocean Fishing nodes.
            continue
        for fish in fishing_spot.items:
            if str(fish.name) in known_fishes:
                continue

            if fish.key not in new_fishes:

                new_fishes[fish.key] = {
                    'name': str(fish.name),
                    'location': str(fishing_spot.place_name),
                    'startHour': 0,
                    'endHour': 24,
                    'previousWeatherSet': None,
                    'weatherSet': None,
                    'bestCatchPath': None,
                    'predators': None,
                    'tug': None,
                    'hookset': None,
                    'snagging': None,
                    'patch': float(args.patch),
                    'dataMissing': True
                }

    # Include spearfishing as well.
    from pysaintcoinach.xiv.gathering_point import GatheringPoint
    for gathering_point in XIV.game_data.get_sheet(GatheringPoint):
        # We only care about spearfishing gathering points.
        if gathering_point.base.type.key != 4:
            continue
        for item in gathering_point.base.items:
            if str(item.name) in known_fishes:
                continue

            if item.key not in new_fishes:
                # Get the BASE gathering point only!
                is_hidden = gathering_point['Count'] == 6  # super-sketch, but this is the field, Index: 2

                new_fishes[item.key] = {
                    'name': str(item.name),
                    'location': gathering_point.base.key if is_hidden else str(gathering_point.place_name.name),
                    'startHour': 0,
                    'endHour': 24,
                    'previousWeatherSet': None,
                    'weatherSet': None,
                    'bestCatchPath': None,
                    'predators': None,
                    'gig': 'UNKNOWN',
                    'patch': float(args.patch),
                    'dataMissing': True
                }

        # Dump the new fish data to a YAML file.

    with open(args.new_data, 'w') as f:
        # Exclude fish without a name.
        def exclude_nameless_fish(fish):
            return fish['name'] != ''
        # Make things prettier...
        def represent_none(self, _):
            return self.represent_scalar('tag:yaml.org,2002:null', '')

        Dumper.add_representer(type(None), represent_none)
        yaml.dump(list(filter(exclude_nameless_fish, new_fishes.values())), f,
                  Dumper=Dumper, default_flow_style=False, sort_keys=False)
        f.write('---\n')
        def new_fish_name(_id, fish):
            if fish['name'] != '':
                return fish['name']
            else:
                return '# %d *Unnamed fish* at %s' % (_id, fish['location'])
        f.writelines(['%s\n' % new_fish_name(_id, fish) for (_id, fish) in list(new_fishes.items())])

    return True


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
                                default=r"C:\Program Files (x86)\SquareEnix\FINAL FANTASY XIV - A Realm Reborn",
                                dest='game_path',
                                help='Path to FF14 installation')
    parser_rebuild.add_argument('--with-icons', action='store_true', default=False,
                                help='Extract missing icons')
    parser_rebuild.set_defaults(func=rebuild_fish_data)

    parser_integrity = subparsers.add_parser('integrity',
                                             help='Checks data integrity')
    parser_integrity.add_argument('-i', '--in', type=str,
                                  default=os.path.join(_SCRIPT_PATH, 'fishData.yaml'),
                                  dest='yaml_file',
                                  help='Path to current fish data YAML file')
    parser_integrity.add_argument('--game_path', '-gpath', type=str,
                                  default=r"C:\Program Files (x86)\SquareEnix\FINAL FANTASY XIV - A Realm Reborn",
                                  dest='game_path',
                                  help='Path to FF14 installation')
    parser_integrity.set_defaults(func=check_data_integrity)

    parser_addnew = subparsers.add_parser('addnew',
                                          help='Adds newly discovered fish to the YAML file')
    parser_addnew.add_argument('-i', '--in', type=str,
                               default=os.path.join(_SCRIPT_PATH, 'fishData.yaml'),
                               dest='existing_data',
                               help='Path to current fish data YAML file')
    parser_addnew.add_argument('-o', '--out', type=str,
                               default=os.path.join(_SCRIPT_PATH, 'fishDataAdditions.yaml'),
                               dest='new_data',
                               help='Where to store newly added fish (YAML)')
    parser_addnew.add_argument('--game_path', '-gpath', type=str,
                               default=r"C:\Program Files (x86)\SquareEnix\FINAL FANTASY XIV - A Realm Reborn",
                               dest='game_path',
                               help='Path to FF14 installation')
    parser_addnew.add_argument('-p', '--patch', type=str,
                               help='Patch number to associate with these new fish')
    parser_addnew.add_argument('-x', '--ignore',
                               dest='ignored_fish',
                               help='List of fish to always ignore (one per line)')
    parser_addnew.set_defaults(func=add_new_fish_data)

    args = parser.parse_args()
    initialize_data(args)
    args.func(args)
