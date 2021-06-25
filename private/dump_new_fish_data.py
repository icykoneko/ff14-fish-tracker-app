from typing import Dict, Any, List, Iterable
from dataclasses import make_dataclass, field
import logging
import sys
import os
import re
from itertools import chain, filterfalse, islice, repeat
from functools import reduce
from operator import add, itemgetter
import timeit

from tqdm import tqdm

try:
    _SCRIPT_PATH = os.path.abspath(__path__)
except:
    _SCRIPT_PATH = os.path.abspath(os.path.dirname(__file__))

# _HELPER_LIBS_PATH = os.path.join(_SCRIPT_PATH, '..', '..')
_HELPER_LIBS_PATH = _SCRIPT_PATH


# Add the Saint Coinach python API to the path.
sys.path += [os.path.join(_HELPER_LIBS_PATH, 'saintcoinach-py')]

import pysaintcoinach
from pysaintcoinach.ex.language import Language

from pysaintcoinach.xiv import as_row_type, XivRow
# from pysaintcoinach.xiv.masterpiece_supply_duty import MasterpieceSupplyDuty
from pysaintcoinach.xiv.item import Item
from pysaintcoinach.xiv.fishing_spot import FishingSpot
from pysaintcoinach.xiv.fish_parameter import FishParameter
from pysaintcoinach.xiv.gathering_point import GatheringPoint
from pysaintcoinach.xiv.weather import Weather
from pysaintcoinach.xiv.placename import PlaceName

# logging.basicConfig(level=logging.INFO, stream=sys.stderr)


def nth(iterable, n, default=None):
    """Returns the nth item or a default value"""
    return next(islice(iterable, n, None), default)


def first(iterable, pred, default=None):
    """Returns the first item for which pred(item) is true.

    If no true value is found, returns *default*

    """
    return next(filter(pred, iterable), default)


def flatten(listOfLists):
    """Flatten one level of nesting"""
    return chain.from_iterable(listOfLists)


def unique_everseen(iterable, key=None):
    """
    List unique elements, preserving order. Remember all elements ever seen.
    """
    # unique_everseen('AAAABBBCCDAABBB') --> A B C D
    # unique_everseen('ABBCcAD', str.lower) --> A B C D
    seen = set()
    seen_add = seen.add
    if key is None:
        for element in filterfalse(seen.__contains__, iterable):
            seen_add(element)
            yield element
    else:
        for element in iterable:
            k = key(element)
            if k not in seen:
                seen_add(k)
                yield element


_start_time = timeit.default_timer()

def _init_saintcoinach():
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

Fish = make_dataclass('Fish',
                      [('item', as_row_type('Item')),
                       ('params', Any, field(default=None)),
                       ('spearfishing', bool, field(default=False)),
                       ('spots', list, field(default_factory=list)),
                       ('quest', list, field(default_factory=list)),
                       ('shop', list, field(default_factory=list)),
                    #    ('scrip', MasterpieceSupplyDuty.CollectableItem, field(default=None)),
                       ('scrip', Any, field(default=None)),
                       ('satisfaction', Any, field(default=None)),
                       ('gc', Any, field(default=None)),
                       ('leve', list, field(default_factory=list)),
                       ('craft', list, field(default_factory=list)),
                       ('reduce', Any, field(default=None)),
                       ('aquarium', Any, field(default=None)),
                       ('ecology', bool, field(default=False)),
                       ('expansion', Any, field(default=None))])

GCSupplyDutyTurnin = make_dataclass('GCSupplyDutyTurnin',
                                    [('count', int), ('exp', int), ('seals', int)])

SpearfishingNode = make_dataclass('SpearfishingNode',
                                  [('gathering_point_base', as_row_type('GatheringPointBase')),
                                   ('territory_type', as_row_type('TerritoryType')),
                                   ('place_name', as_row_type('PlaceName')),
                                   ('hidden', bool, field(default=False))])

def _prop_SpearfishingNode_getkey(self):
    return self.gathering_point_base.key

setattr(SpearfishingNode, 'key', property(_prop_SpearfishingNode_getkey))


def tracked_iter(_iter, desc, **kwargs):
    return tqdm(_iter,
                desc,
                unit='record',
                bar_format='{l_bar:>50.50}{bar}{r_bar:50}',
                **kwargs)


# Get a list of catchable fish first.
catchable_fish = {}  # type: Dict[int, Fish]

for fishing_spot in tracked_iter(realm.game_data.get_sheet(FishingSpot),
                                 'Scanning fishing spots'):
    if fishing_spot.place_name.key == 0:
        continue
    if fishing_spot.territory_type is None:
        continue

    logging.info("Checking spot: %s" % fishing_spot.place_name.name)

    for item in fishing_spot.items:
        if item.key not in catchable_fish:
            catchable_fish[item.key] = Fish(item,
                                            reduce=item.is_aetherial_reducible)
        catchable_fish[item.key].spots.append(fishing_spot)
        if catchable_fish[item.key].expansion is not None:
            # Warn if a fish is posted to more than one expansion please.
            if catchable_fish[item.key].expansion != fishing_spot.territory_type['ExVersion']:
                # FUSE: Shirogane's territory type is set to 0 (ARR).
                # So if that's the territory, you can ignore this...
                if fishing_spot.territory_type.place_name.name != 'Shirogane':
                    if catchable_fish[item.key].expansion.key > fishing_spot.territory_type['ExVersion'].key:
                        logging.warning("%s is found in areas belonging to both %s and %s" %
                                        (item.name,
                                         catchable_fish[item.key].expansion,
                                         fishing_spot.territory_type['ExVersion']))
                        logging.warning("Entry for fishing spot %u (%s) is from an earlier expac." %
                                        (fishing_spot.key, fishing_spot.place_name.name))
        else:
            catchable_fish[item.key].expansion = fishing_spot.territory_type['ExVersion']

# Now, we'll check for spearfishing nodes.
for gathering_point in tracked_iter(realm.game_data.get_sheet(GatheringPoint),
                                    'Scanning spearfishing nodes'):
    if gathering_point.base.type.key != 4:
        continue

    # Each GatheringPoint represents a single map spawn node. You need to normalize
    # these with the GatheringPointBase...
    item: Item
    for item in gathering_point.base.items:
        if item.key not in catchable_fish:
            catchable_fish[item.key] = Fish(item,
                                            spearfishing=True,
                                            reduce=item.is_aetherial_reducible)
        # Add the gathering point to this fish.
        # The check is necessary because gathering points come in sets. We only want
        # the base point.
        gathering_point_base = gathering_point.base
        if gathering_point_base.key not in map(lambda x: x.gathering_point_base.key,
                                               catchable_fish[item.key].spots):
            catchable_fish[item.key].spots.append(
                SpearfishingNode(gathering_point_base,
                                 gathering_point.territory_type,
                                 gathering_point.place_name,
                                 gathering_point[2] == 6))

#
# Attempt to run the rest in parallel
#

SCAN_TASKS = []


def scan_task(f):
    SCAN_TASKS.append(f)
    return f


@scan_task
def scan_fish_params(orig_stdout, n=None):
    for fish_params in tracked_iter(realm.game_data.get_sheet(FishParameter),
                                    'Scanning fish parameters',
                                    file=orig_stdout, position=n):
        if fish_params.item is None:
            continue
        fish_key = fish_params.item.key
        if fish_key in catchable_fish:
            catchable_fish[fish_key].params = fish_params
    return True


# @scan_task
# def scan_scrip_turnins(orig_stdout, n=None):
#     for duty in tracked_iter(realm.game_data.get_sheet(MasterpieceSupplyDuty),
#                              'Scanning scrip turn-ins',
#                              file=orig_stdout, position=n):
#         # Ignore non-FSH entries.
#         if str(duty.class_job.abbreviation) != 'FSH':
#             continue

#         for item in duty.collectable_items:
#             if item.required_item.key in catchable_fish:
#                 catchable_fish[item.required_item.key].scrip = item

#     return True


@scan_task
def scan_gc_supply_duties(orig_stdout, n=None):
    for duty in tracked_iter(realm.game_data.get_sheet('GCSupplyDuty'),
                             'Scanning GC supply duties',
                             file=orig_stdout, position=n):
        # There are 3 possible items for each duty. FSH is index 10.
        for i in range(3):
            item = duty[('Item', i, 10)]
            if item.key in catchable_fish:
                reward = realm.game_data.get_sheet('GCSupplyDutyReward')[duty.key]
                catchable_fish[item.key].gc = GCSupplyDutyTurnin(
                    duty[('ItemCount', i, 10)],
                    reward['Experience{Provisioning}'],
                    reward['Seals{Provisioning}'])

    return True


@scan_task
def scan_leves(orig_stdout, n=None):
    for leve in tracked_iter(realm.game_data.get_sheet('Leve'),
                             'Scanning leve turn-ins',
                             file=orig_stdout, position=n):
        if 'FSH' not in [str(job.abbreviation) for job in leve['ClassJobCategory'].class_jobs]:
            continue

        # These are a little weird.  They are actually using CraftLeve... Just go with it...
        leve_fish = leve['DataId'].get_raw(XivRow.build_column_name('Item', 0))
        if leve_fish in catchable_fish:
            catchable_fish[leve_fish].leve.append(leve)

    return True


@scan_task
def scan_recipes(orig_stdout, n=None):
    for recipe in tracked_iter(realm.game_data.get_sheet('Recipe'),
                               'Scanning recipes',
                               file=orig_stdout, position=n):
        for i in range(10):
            ingredient = recipe.get_raw(XivRow.build_column_name('Item{Ingredient}', i))
            if ingredient in catchable_fish:
                catchable_fish[ingredient].craft.append(recipe)

    return True


@scan_task
def scan_aquariums(orig_stdout, n=None):
    for aquarium_fish in tracked_iter(realm.game_data.get_sheet('AquariumFish'),
                                      'Scanning aquarium fish',
                                      file=orig_stdout, position=n):
        fish_key = aquarium_fish.get_raw('Item')
        if fish_key in catchable_fish:
            catchable_fish[fish_key].aquarium = aquarium_fish

    return True

# There's actually only 2 or 3 fish that show up in Shops, and the scanning
# process itself takes forever compared to the rest of the scanners. These
# fish are also covered by at least one category in the other scans, making
# check virtually useless.
# for shop in tracked_iter(realm.game_data.shops,
#                          'Scanning shops'):
#     # Running this per-item is *VERY* slow.
#     # Instead, we're going to enumerate all the shop listings, and check
#     # if any of our fish are listed as a "cost" item.
#     from pysaintcoinach.xiv.interfaces import IShopListing
#     shop_item_costs = []
#
#     shop_listing: IShopListing
#     for shop_listing in shop.shop_listings:
#         for cost in shop_listing.costs:
#             if cost.item is not None and cost.item.key in catchable_fish:
#                 # Add this shop list item to the fish it's associated with.
#                 catchable_fish[cost.item.key].shop += [cost]


@scan_task
def scan_satisfaction(orig_stdout, n=None):
    for supply in tracked_iter(realm.game_data.get_sheet('SatisfactionSupply'),
                               'Scanning satisfaction supply requests',
                               file=orig_stdout, position=n):
        # We only care about Slot #3.
        if supply['Slot'] != 3:
            continue
        item = supply['Item']
        if item is not None and item.key in catchable_fish:
            # Overwrite the entry if multiple matches are found.
            # We ideally want only the last entry anyways...
            catchable_fish[item.key].satisfaction = supply

    return True


@scan_task
def scan_quests(orig_stdout, n=None):
    for quest in tracked_iter(realm.game_data.get_sheet('Quest'),
                              'Scanning quests',
                              file=orig_stdout, position=n):
        # Quests are a ROYAL PAIN!
        # We're looking for the Script{Instruction} fields named "RITEM#".
        # These will have corresponding Script{Arg} fields with item ids.
        if 'FSH' not in [str(job.abbreviation) for job in quest[('ClassJobCategory', 0)].class_jobs]:
            continue

        for i in range(50):
            if not str(quest[('Script{Instruction}', i)]).startswith('RITEM'):
                continue
            item = quest.as_T(Item, 'Script{Arg}', i)
            if item is not None and item.key in catchable_fish:
                catchable_fish[item.key].quest += [(quest.key, str(quest))]

    return True


@scan_task
def scan_spearfishing_ecology(orig_stdout, n=None):
    # The SpearfishingEcology sheet tells us which fish is needed to pop
    # the swimming shadows. This fish might not otherwise be important...
    for ecology in tracked_iter(realm.game_data.get_sheet('SpearfishingEcology'),
                                'Scanning spearfishing ecology',
                                file=orig_stdout, position=n):
        if ecology.key == 0:
            continue

        m = re.search(r'With (.*) caught,', ecology[1])
        if m is not None:
            name = m.group(1)
            # Search all catchable fish for this name.
            # NOTE: You must use the singular display name.
            # If Article, then exclude "the " from the search.
            for fish in catchable_fish.values():
                fish_name = str(fish.item.as_string('Singular'))
                if not fish.item.as_boolean('Article'):
                    fish_name = "the " + fish_name
                if fish_name == name:
                    fish.ecology = True


# import concurrent.futures
#
# import contextlib
# import sys
#
# class DummyTqdmFile(object):
#     file = None
#     def __init__(self, file):
#         self.file = file
#
#     def write(self, x):
#         if len(x.rstrip()) > 0:
#             tqdm.write(x, file=self.file)
#
#     def flush(self):
#         return getattr(self.file, "flush", lambda: None)()
#
#
# @contextlib.contextmanager
# def std_out_err_redirect_tqdm():
#     orig_out_err = sys.stdout, sys.stderr
#     try:
#         sys.stdout, sys.stderr = map(DummyTqdmFile, orig_out_err)
#         yield orig_out_err[1]
#     except Exception as exc:
#         raise exc
#     finally:
#         sys.stdout, sys.stderr = orig_out_err
#
#
# with concurrent.futures.ThreadPoolExecutor() as executor:
#     # with std_out_err_redirect_tqdm() as orig_stdout:
#     tasks = {executor.submit(task, None, n) for n, task in enumerate(SCAN_TASKS)}
#     results = concurrent.futures.wait(tasks)
#
#     for task in results.done:
#         result = task.result()
#         print()


for n, task in enumerate(SCAN_TASKS):
    task(None)



def is_important_fish(fish):
    # Always include BIG FISH!
    if fish.item.rarity >= 2:
        return True

    # SUPER IMPORTANT FISH
    if fish.params is not None:
        if fish.params.time_restricted:
            return True
        if fish.params.weather_restricted:
            return True
    if fish.spearfishing:
        if all(map(lambda x: x.hidden, fish.spots)):
            return True
        if fish.ecology:
            return True

    # Lesser important fish
    if fish.reduce:
        return True
    if fish.scrip is not None:
        return True
    if len(fish.quest) > 0:
        return True
    if fish.satisfaction is not None:
        return True
    if fish.gc is not None:
        return True
    if len(fish.leve) > 0:
        return True
    if len(fish.craft) > 0:
        return True
    if len(fish.shop) > 0:
        return True
    if fish.aquarium is not None:
        return True

    # Otherwise... it's unimportant...
    return False


important_fish = sorted(list(filter(is_important_fish, catchable_fish.values())),
                        key=lambda x: x.item.key)


#######################################################################

import yaml
from yaml import CLoader as Loader
from yaml import CDumper as Dumper

# Import the OLD data...
fishes = yaml.load(open("private/fishData.yaml", 'r'), Loader=Loader)
known_fishes = dict([(fish['name'], fish) for fish in fishes])


def get_spot(spot):
    if isinstance(spot, SpearfishingNode):
        if spot.hidden:
            return spot.gathering_point_base.key
    return str(spot.place_name.name)


def supports_fish_eyes(fish):
    # Fish Eyes does not affect spearfishing.
    if fish.spearfishing:
        return False
    # The fish must not be legendary: i.e. not include the phase: "オオヌシ".
    if "オオヌシ" in fish.item.source_row['Description', Language.japanese]:
        return False
    # As of 5.4, Fish Eyes only works on fish in areas prior to Stormblood.
    if fish.expansion.key >= 2:
        return False

    # While technically any other fish does support Fish Eyes, only fish with
    # time restrictions truly can use it.
    # NOTE: Disabled because... well, run integrity checks and you'll see -_-
    # return fish.params is not None and fish.params.time_restricted
    return True


new_fishes = {}
for fish in tracked_iter(important_fish,
                         'Generating new fish database'):
    folklore = False
    if fish.params is not None:
        folklore = fish.params['GatheringSubCategory']
        folklore = False if folklore is None else str(folklore)

    new_fishes[fish.item.key] = {
        'name': str(fish.item.name),
        'dataMissing': True,
        'start': 0,
        'end': 24,
        'prevWeather': None,
        'weather': None,
        'bait': None,
        'intuition': None,
        'intuitionLength': None,
        'hookset': None,
        'tug': None,
        'snagging': None,
        'gig': None,
        'patch': None,
        'computed': {
            'locations': [get_spot(spot) for spot in fish.spots],
            'timeRestricted': fish.params.time_restricted if fish.params is not None else False,
            'weatherRestricted': fish.params.weather_restricted if fish.params is not None else False,
            'folklore': folklore,
            'spearfishing': fish.spearfishing,
            'bigfish': fish.item.rarity >= 2,
            'quest': len(fish.quest) > 0,
            # 'shop': len(fish.shop) > 0,
            'satisfaction': fish.satisfaction is not None,
            'craft': len(fish.craft) > 0,
            'gc': fish.gc is not None,
            'leve': len(fish.leve) > 0,
            'scrip': fish.scrip is not None,
            'reduce': fish.reduce,
            'aquarium': fish.aquarium is not None,
            'fishEyes': supports_fish_eyes(fish)
        }
    }

    if str(fish.item.name) in known_fishes:
        known_fish = known_fishes[str(fish.item.name)]
        del new_fishes[fish.item.key]['dataMissing']
        try:
            new_fishes[fish.item.key].update({
                'start': known_fish.get('startHour', 0),
                'end': known_fish.get('endHour', 24),
                'prevWeather': known_fish.get('previousWeatherSet', []),
                'weather': known_fish.get('weatherSet', []),
                'bait': (known_fish.get('bestCatchPath', []) or [])[-1:],
                'intuition': known_fish.get('predators', None),
                'intuitionLength': known_fish.get('intuitionLength', None),
                'hookset': known_fish.get('hookset', None),
                'tug': known_fish.get('tug', None),
                'snagging': known_fish.get('snagging', None),
                'gig': known_fish.get('gig', None),
                'patch': known_fish.get('patch', None)
            })
        except Exception:
            print("ERROR: While processing %s" % fish.item.name)
            import pprint
            pprint.pprint(known_fish)
            raise


for fish in tracked_iter(new_fishes.values(),
                         'Integrity Checking'):
    errors = []

    # Check if time restricted.
    if fish['computed']['timeRestricted'] and \
            fish['start'] == 0 and fish['end'] == 24:
        errors += ['should be time restricted']
    elif not fish['computed']['timeRestricted'] and \
            not (fish['start'] == 0 and fish['end'] == 24):
        errors += ['should not be time restricted']

    # Check if weather restricted.
    if fish['computed']['weatherRestricted'] and \
            len(fish['prevWeather'] or []) == 0 and \
            len(fish['weather'] or []) == 0:
        errors += ['should be weather restricted']
    elif not fish['computed']['weatherRestricted'] and \
            (len(fish['weather'] or []) != 0 or \
             len(fish['prevWeather'] or []) != 0):
        errors += ['should not be weather restricted']

    if len(errors) > 0:
        if 'dataMissing' in fish and fish['dataMissing']:
            errors += ['data missing for limited-time fish']
        fish['integrityErrors'] = errors


def _get_item_lookup_dict_entries():
    # Collect all of the fish and tackle names.
    fish_and_tackle_names = list(set(filter(None, reduce(
        add, [[fish['name']] +
              list((fish.get('intuition', {}) or {}).keys()) +
              (fish['bait'] or [])
              for fish in new_fishes.values()], []))))
    # Match these with records in the Item sheet.
    for item in tracked_iter(realm.game_data.get_sheet(Item),
                             'Getting fish and tackle entries'):
        if item.name not in fish_and_tackle_names:
            continue
        yield (item.name, item.key)


WEATHER = dict([(x.name, x.key) for x in realm.game_data.get_sheet(Weather)])
ITEM = dict(_get_item_lookup_dict_entries())


with open("private/fishDataNew.yaml", 'w') as f:
    # Make things prettier...
    def represent_none(self, _):
        return self.represent_scalar('tag:yaml.org,2002:null', '')

    def transformed_fish_pair(fish):
        fish_entry = dict(fish)
        del fish_entry['name']
        del fish_entry['computed']
        return fish['name'], fish_entry

    Dumper.add_representer(type(None), represent_none)
    yaml.dump(dict([transformed_fish_pair(fish) for fish in new_fishes.values()]),
              f, Dumper=Dumper, default_flow_style=False, sort_keys=False)
    # f.write('---\n')
    # f.writelines(['%s\n' % str(fish['name']) for fish in list(new_fishes.values())])


def convert_fish_to_json(fish: Fish):
    """
    Converts a Fish entry into JSON. This form is intended to be useful to the
    web-site front-end. All language-specific values use lookup IDs.
    """

    try:
        # Get the new database entry for this fish. (it better exist!)
        db_entry = new_fishes[fish.item.key]

        weather_keys = list(sorted([WEATHER[x] for x in (db_entry['weather'] or [])]))
        prev_weather_keys = list(sorted([WEATHER[x] for x in (db_entry['prevWeather'] or [])]))
        bait_keys = [ITEM[x] for x in (db_entry['bait'] or [])]
        intuition_entries = {}
        if db_entry.get('intuition') is not None:
            intuition_entries = dict([(ITEM[x[0]], x[1]) for x in db_entry['intuition'].items()])

        def get_location_key(spot):
            if isinstance(spot, SpearfishingNode):
                if spot.hidden:
                    return spot.gathering_point_base.key
            return spot.key

        aquarium_entry = None
        if fish.aquarium is not None:
            aquarium_entry = {'water': str(fish.aquarium['AquariumWater']),
                              'size': int(fish.aquarium['Size'])}

        folklore_key = False
        if fish.params is not None:
            folklore = fish.params['GatheringSubCategory']
            if folklore is not None:
                folklore_key = folklore.key

        json_entry = {
            '_id': fish.item.key,
            # Information sourced via players
            'dataMissing': db_entry.get('dataMissing', False),
            'prevWeather': prev_weather_keys,
            'weather': weather_keys,
            'start': db_entry['start'],
            'end': db_entry['end'],
            'bait': bait_keys,
            'intuition': intuition_entries,
            'intuitionLength': db_entry['intuitionLength'],
            'hookset': db_entry['hookset'],
            'tug': db_entry['tug'],
            'snagging': db_entry['snagging'],
            'patch': db_entry['patch'],
            # Information sourced via DATs
            'location': [get_location_key(x) for x in fish.spots],
            'timeRestricted': fish.params.time_restricted if fish.params is not None else False,
            'weatherRestricted': fish.params.weather_restricted if fish.params is not None else False,
            'folklore': folklore_key,
            'spearfishing': fish.spearfishing,
            'bigfish': fish.item.rarity >= 2,
            'quest': len(fish.quest) > 0,
            # 'shop': len(fish.shop) > 0,
            'satisfaction': fish.satisfaction is not None,
            'craft': len(fish.craft) > 0,
            'gc': fish.gc is not None,
            'leve': len(fish.leve) > 0,
            'scrip': fish.scrip is not None,
            'reduce': fish.reduce,
            'aquarium': aquarium_entry,
            'fishEyes': supports_fish_eyes(fish)
        }

        return fish.item.key, json_entry

    except Exception:
        print("ERROR: While processing %s" % fish.item.name)
        import pprint
        pprint.pprint(db_entry)
        raise


def _make_localized_field(fld_name, row, col_name):
    from pysaintcoinach.ex import IMultiRow
    from pysaintcoinach.xiv import IXivRow

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
        # logging.warning("Missing %s data for %s[%u][%s], using \"%s\" instead.",
        #                 lang.name,
        #                 row.sheet.name,
        #                 row.key,
        #                 col_name,
        #                 value)
        return value

    return map(lambda lang: (fld_name + lang.get_suffix(), try_get_value(row, col_name, lang)), LANGUAGES)


def _make_static_localized_field(fld_name, value):
    return zip([fld_name + lang.get_suffix() for lang in LANGUAGES],
               repeat(value, len(LANGUAGES)))


def __build_supporting_json_tables(_iter: Iterable[Fish]):
    items = {}
    fishing_nodes = {}
    spearfishing_nodes = {}
    territories = {}
    zones = {}
    regions = {}
    weather_types = {}
    folklore_books = {}

    # The ITEMS table is generated from the fish and tackle data (ITEMS).
    for item_id in tracked_iter(ITEM.values(), 'Generating ITEMS data table'):
        item_entry = realm.game_data.get_sheet(Item)[item_id]
        items[item_id] = dict([
            ('_id', item_id),
            *_make_localized_field('name', item_entry, 'Name'),
            ('icon', '%06u' % item_entry.get_raw('Icon'))])

    # The rest is based on which fish we actually have.
    # Technically, we should still generate the territory list for everything,
    # but screw that, only what we actually need is fine...
    for fish in tracked_iter(_iter, 'Generating necessary lookup tables'):
        territories_to_add = set()
        if fish.spearfishing:
            def _decode_spearfishing_node_name(x):
                if x.hidden:
                    return _make_static_localized_field('name', 'Swimming Shadows')
                else:
                    return _make_localized_field('name', x.place_name, 'Name')
            for spot in fish.spots:
                if spot.gathering_point_base.key not in spearfishing_nodes:
                    spearfishing_nodes[spot.gathering_point_base.key] = dict([
                        ('_id', spot.gathering_point_base.key),
                        *_decode_spearfishing_node_name(spot),
                        ('territory_id', spot.territory_type.key),
                        ('placename_id', spot.place_name.key),
                        ('hidden', spot.hidden)])
                    territories_to_add.add(spot.territory_type)
        else:
            for spot in fish.spots:
                if spot.key not in fishing_nodes:
                    fishing_nodes[spot.key] = dict([
                        ('_id', spot.key),
                        *_make_localized_field('name', spot.place_name, 'Name'),
                        ('territory_id', spot.get_raw('TerritoryType')),
                        ('placename_id', spot.place_name.key),
                        ('map_coords', [spot.map_x, spot.map_y, spot.radius])])
                    territories_to_add.add(spot.territory_type)

        for territory in territories_to_add:
            if territory is not None and territory.key not in territories:
                def _collect_weather_rates(rate):
                    return [(r[1].key, r[0]) for r in rate.weather_rates if r[1].key != 0]

                territories[territory.key] = dict({
                    '_id': territory.key,
                    'map_id': territory.map.key,
                    'map_scale': territory.map.size_factor,
                    'zone_id': territory.place_name.key,
                    'region_id': territory.region_place_name.key,
                    'weather_rates': _collect_weather_rates(territory.weather_rate)})

                # Add entries for this territory's region and zone as well.
                if territory.place_name.key not in zones:
                    zones[territory.place_name.key] = dict(
                        _make_localized_field('name', territory.place_name, 'Name'))
                if territory.region_place_name.key not in regions:
                    regions[territory.region_place_name.key] = dict(
                        _make_localized_field('name', territory.region_place_name, 'Name'))

                # Add any new unique weather types to the table.
                for weather in territory.weather_rate.possible_weathers:
                    if weather.key != 0 and weather.key not in weather_types:
                        weather_types[weather.key] = dict([
                            *_make_localized_field('name', weather, 'Name'),
                            ('icon', '%06u' % weather.get_raw('Icon'))])

        if fish.params is not None:
            folklore = fish.params['GatheringSubCategory']
            if folklore is not None and folklore.key not in folklore_books:
                folklore_books[folklore.key] = dict([
                    *_make_localized_field('book', folklore, 'FolkloreBook'),
                    *_make_localized_field('name', folklore['Item'], 'Name')])

    return {'items': dict(sorted(items.items(), key=itemgetter(0))),
            'fishing_nodes': dict(sorted(fishing_nodes.items(), key=itemgetter(0))),
            'spearfishing_nodes': dict(sorted(spearfishing_nodes.items(), key=itemgetter(0))),
            'folklore_books': dict(sorted(folklore_books.items(), key=itemgetter(0))),
            'territories': dict(sorted(territories.items(), key=itemgetter(0))),
            'zones': dict(sorted(zones.items(), key=itemgetter(0))),
            'regions': dict(sorted(regions.items(), key=itemgetter(0))),
            'weather_types': dict(sorted(weather_types.items(), key=itemgetter(0)))}


def pretty_dump(obj):
    return json.dumps(obj, sort_keys=False, indent=2).replace('\n', '\n  ')


with open("private/new_data.js", 'w') as f:
    # Output everything in JavaScript format, using IDs to support localization.
    import json
    import datetime

    support_tables = __build_supporting_json_tables(important_fish)

    f.write('const DATA = {\n')
    f.write('  FISH: %s,\n' % pretty_dump(dict(map(convert_fish_to_json,
                                                   tracked_iter(important_fish,
                                                                'Converting fish')))))
    f.write('  FISHING_SPOTS: %s,\n' % pretty_dump(support_tables['fishing_nodes']))
    f.write('  SPEARFISHING_SPOTS: %s,\n' % pretty_dump(support_tables['spearfishing_nodes']))
    f.write('  ITEMS: %s,\n' % pretty_dump(support_tables['items']))
    f.write('  TERRITORIES: %s,\n' % pretty_dump(support_tables['territories']))
    f.write('  WEATHER_TYPES: %s,\n' % pretty_dump(support_tables['weather_types']))
    f.write('  REGIONS: %s,\n' % pretty_dump(support_tables['regions']))
    f.write('  ZONES: %s,\n' % pretty_dump(support_tables['zones']))
    f.write('  FOLKLORE: %s,\n' % pretty_dump(support_tables['folklore_books']))

    f.write('  VERSION: "%s"\n};' % datetime.datetime.now().strftime('%Y.%m.%d.%H.%M'))


_finish_time = timeit.default_timer()

from datetime import timedelta
print("Total Time: %s" % timedelta(seconds=_finish_time - _start_time))
