import os
import sys
import logging
import json

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
XIV = None  # type: 'pysaintcoinach.ARealmReversed'

try:
    _SCRIPT_PATH = os.path.abspath(__path__)
except:
    _SCRIPT_PATH = os.path.abspath(os.path.dirname(__file__))

# _HELPER_LIBS_PATH = os.path.join(_SCRIPT_PATH, '..', '..')
_HELPER_LIBS_PATH = _SCRIPT_PATH


def _init_saintcoinach(args):
    global XIV

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
    XIV = ARealmReversed(args.game_path, Language.english)
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

    return XIV


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
            value = str(row[(col_name, lang)])
            if value != '':
                return value
            # Fall through if value is blank!
        except KeyError:
            pass

        # Use the default language name instead...
        value = str(row[col_name])
        logging.debug("Missing %s data for %s[%u][%s], using \"%s\" instead.",
                        lang.name,
                        row.sheet.name,
                        row.key,
                        col_name,
                        value)
        return value

    return map(lambda lang: (fld_name + lang.get_suffix(), try_get_value(row, col_name, lang)), LANGUAGES)


def _build_fish_infos():
    global XIV

    # Generated output will be JavaScript data file containing an array
    # of fish objects.
    #
    # FISH[id, icon, name(loc), desc(loc)
    #

    fish_in_log = [x for x in XIV.game_data.get_sheet('FishParameter')
                   if x.get_raw('Item') != 0 and x.is_in_log]

    fish_infos = []
    for fish in fish_in_log:
        fish_info = dict([
            ('id', fish.item.key),
            *_make_localized_field('name', fish.item, 'Name'),
            *_make_localized_field('desc', fish, 'Text'),
            ('icon', '%06u' % fish.item.get_raw('Icon')),
            ('extra_icon', '%06u' % (fish.item.get_raw('Icon') + 50000)),
            ('level', [x for x in fish['GatheringItemLevel'].column_values]),
            ('time_restricted', fish.time_restricted),
            ('weather_restricted', fish.weather_restricted),
            ('collectable', fish.item.is_collectable),
            ('rarity', fish.item.rarity),
            # TODO: These should be normalized to reduce data size
            *_make_localized_field('record', fish, 'FishingRecordType'),
            # TODO: Normalize the two fields by reusing existing data in DATA.[REGIONS|ZONES]
            *_make_localized_field('region', fish['FishingSpot'].territory_type.region_place_name, 'Name'),
            *_make_localized_field('zone', fish['FishingSpot'].territory_type.place_name, 'Name'),
            ])
        fish_infos += [fish_info]

    return fish_infos


def _update_icons(fish_infos):
    # Create image/fish_n_tackle dir if not exists
    if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', 'fish_n_tackle')):
        os.makedirs(os.path.join(_SCRIPT_PATH, 'images', 'fish_n_tackle'))
    # Check that the private/images/* folders contain all of the icons used.
    for fish in fish_infos:
        if not os.path.exists(os.path.join(_SCRIPT_PATH, 'images', 'fish_n_tackle',
                                           '%s.png' % fish['icon'])):
            item = XIV.game_data.get_sheet('Item')[fish['id']]
            logging.info('Extracting %s  (%s)' % (item['Icon'], str(item['Name'])))
            icon = item.as_image('Icon')
            icon.get_image().save(
                os.path.join(_SCRIPT_PATH, 'images', 'fish_n_tackle',
                             '%06u.png' % item.get_raw('Icon')))


def _output_javascript(args, fish_infos):
    def pretty_dump(obj):
        return json.dumps(obj, sort_keys=False, indent=2, ensure_ascii=False).replace('\n', '\n  ')

    with open(args.js_file, 'w', encoding='utf-8') as f:
        f.write('const FISH_INFO = %s;' % pretty_dump(fish_infos))


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Fish Guide Management Script')

    parser.add_argument('-o', '--out', type=str,
                        default=os.path.join(_SCRIPT_PATH, 'fish_info_data.js'),
                        dest='js_file',
                        help='Where to store JavaScript data (fish_info_data.js)')
    parser.add_argument('--game_path', '-gpath', type=str,
                        default=r"C:\Program Files (x86)\SquareEnix\FINAL FANTASY XIV - A Realm Reborn",
                        dest='game_path',
                        help='Path to FF14 installation')
    parser.add_argument('--with-icons', action='store_true', default=False,
                        help='Extract missing icons')

    args = parser.parse_args()

    _init_saintcoinach(args)
    fish_infos = _build_fish_infos()
    _output_javascript(args, fish_infos)
    if args.with_icons:
        _update_icons(fish_infos)
