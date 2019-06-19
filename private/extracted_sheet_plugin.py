from typing import TypeVar, Type, Union, Tuple, Callable, List, Iterable as IterableT
from functools import update_wrapper
import io
import csv
import logging

from pysaintcoinach.ex import ExCollection, Language, IRow, IDataRow, IDataSheet, MultiSheet
from pysaintcoinach.ex.relational import RelationalExCollection, RelationalMultiSheet
from pysaintcoinach.ex.relational.definition import SheetDefinition


class ExportedColumn(object):
    """
    A specialized version of ex.Column to deal with non-runtime data extracted in CSV format.
    """
    CSV_DATA_READERS = {
        'str': str,
        'bool': lambda v: v == 'True',
        'sbyte': int,
        'byte': int,
        'int16': int,
        'uint16': int,
        'int32': int,
        'uint32': int,
        'single': float,
        'int64': int,
    }

    @property
    def header(self) -> 'ExportedHeader': return self.__header

    @property
    def name(self) -> str: return self.__name

    @property
    def value_type(self) -> str: return self.__type

    @property
    def reader(self) -> Callable[[str], object]: return self.__reader

    @property
    def index(self) -> int: return self.__index

    def __init__(self, header, index, col_name, col_type):
        self.__header = header
        self.__index = index
        self.__name = col_name
        self.__type = col_type
        self.__reader = self.__get_data_reader(col_type)

    @staticmethod
    def __get_data_reader(t: str):
        if t in ExportedColumn.CSV_DATA_READERS:
            return ExportedColumn.CSV_DATA_READERS[t]
        elif t.startswith('bit&'):
            return ExportedColumn.CSV_DATA_READERS['bool']
        else:
            return None

    def read(self, value: str):
        base_val = self.read_raw(value)
        if self.reader is not None:
            return base_val

        # Otherwise, it's a related sheet.
        target_sheet = self.value_type
        coll = self.header.collection
        if not coll.sheet_exists(target_sheet):
            logging.warning('Linked sheet "%s" does not exist?!', target_sheet)
            return base_val

        sheet = coll.get_sheet(target_sheet)
        return sheet[base_val] if base_val in sheet else base_val

    def read_raw(self, value: str):
        reader = self.reader or int
        return reader(value)


class ExportedHeader(object):
    """
    A specialized version of ex.Header to deal with non-runtime data extracted in CSV format.
    """
    @property
    def collection(self) -> RelationalExCollection: return self.__collection

    @property
    def file(self): raise NotImplementedError

    @property
    def name(self) -> str: return self.__name

    @property
    def variant(self) -> int: return -1

    @property
    def columns(self) -> IterableT[ExportedColumn]: return self.__columns

    @property
    def column_count(self) -> int: return len(self.__columns)

    @property
    def default_column(self) -> ExportedColumn:
        _def = self.sheet_definition
        if _def is None:
            return None

        i = _def.get_default_column_index()
        return self.get_column(i) if i is not None else None

    @property
    def sheet_definition(self) -> SheetDefinition:
        return self.collection.definition.get_sheet(self.name)

    @property
    def data_file_ranges(self): raise NotImplementedError

    @property
    def available_languages(self) -> IterableT[Language]: return [self.__language]

    @property
    def available_languages_count(self) -> int: return 1

    @property
    def fixed_size_data_length(self): raise NotImplementedError

    def __init__(self, collection: RelationalExCollection, name: str,
                 language: Language, indices, col_names, col_types):
        self.__language = language
        self.__columns = []
        self.__collection = collection
        self.__name = name

        assert(indices[0] == 'key')
        assert(col_names[0] == '#')
        assert(col_types[0] == 'int32')

        self.__build(zip(indices, col_names, col_types))

    def __build(self, col_info):
        # Skip the first record...
        _ = next(col_info)
        for col_index, col_name, col_type in col_info:
            col_index = int(col_index)
            while col_index > len(self.__columns):
                self.__columns.append(None)
            self.__columns.append(ExportedColumn(self, col_index, str(col_name), str(col_type)))

    def get_column(self, index: int) -> ExportedColumn:
        return self.__columns[index]

    def find_column(self, name: str) -> ExportedColumn:
        return next(filter(lambda col: col.name == name, self.__columns), None)


class ExportedDataRow(IDataRow):
    @property
    def sheet(self) -> 'ExportedDataSheet': return self.__sheet

    @property
    def key(self): return self.__key

    @property
    def offset(self): raise NotImplementedError

    def __init__(self, sheet: 'ExportedDataSheet', key: int, values: list):
        self.__sheet = sheet
        self.__key = key
        self.__values = values

    def __str__(self):
        def_col = self.sheet.header.default_column
        if def_col is not None:
            return "%s" % self[def_col.index]
        else:
            return "%s#%u" % (self.sheet.header.name, self.key)

    @property
    def default_value(self):
        def_col = self.sheet.header.default_column
        return self[def_col.index] if def_col is not None else None

    def __getitem__(self, item):
        if not isinstance(item, int):
            col = self.sheet.header.find_column(item)
            if col is None:
                raise KeyError
            return self[col.index]

        col = self.sheet.header.get_column(item)
        return col.read(self.__values[col.index])

    def get_raw(self, column_name: Union[str, int] = None, **kwargs) -> object:
        def get_col(index):
            col = self.sheet.header.get_column(index)
            if col is None:
                raise KeyError
            return col

        if 'column_index' in kwargs:
            return get_col(kwargs['column_index']).read_raw(self.__values[kwargs['column_index']])
        elif isinstance(column_name, int):
            return get_col(column_name).read_raw(self.__values[column_name])
        else:
            col = self.sheet.header.find_column(column_name)
            if col is None:
                raise KeyError
            return col.read_raw(self.__values[col.index])


T = TypeVar('T', bound=IDataRow)


class ExportedDataSheet(IDataSheet[T]):
    @property
    def collection(self) -> RelationalExCollection: return self.__collection

    @property
    def header(self) -> ExportedHeader: return self.__header

    @property
    def language(self) -> Language: return self.__language

    @property
    def name(self) -> str: return self.header.name + self.language.get_suffix()

    @property
    def keys(self): return self.__rows.keys()

    def __init__(self,
                 t_cls: Type[T],
                 collection: RelationalExCollection,
                 name: str,
                 language: Language,
                 file: io.IOBase):
        self.__rows = {}
        self.__collection = collection
        self.__name = name
        self.__language = language
        self.__file = file
        self.__t_cls = t_cls

        # TODO: Implement a partial Header object.
        self.__header = None

        self.__build()

    def get_buffer(self):
        raise NotImplementedError

    def __build(self):
        # An exported data sheet starts with column indices, names, then types.
        reader = csv.reader(self.__file)
        indices = next(reader)
        names = next(reader)
        types = next(reader)
        # Generate the sheet header.
        self.__header = ExportedHeader(
            self.__collection, self.__name, self.__language, indices, names, types)

        # Now for the remaining data...
        self.__rows = {}
        for row_data in reader:
            # Generate a sheet row.
            self.__rows[int(row_data[0])] = ExportedDataRow(self, int(row_data[0]), row_data[1:])

        logging.debug("Built %s using exported data", self.name)

    def __getitem__(self, item: Union[int, Tuple[int, int]]) -> Union[T, IRow, object]:
        def get_row(key):
            return self.__rows[key]
        if isinstance(item, tuple):
            return get_row(item[0])[item[1]]
        else:
            return get_row(item)

    def __contains__(self, item):
        return item in self.__rows

    def __len__(self):
        return len(self.__rows)

    def __iter__(self):
        return iter(self.__rows.values())


def _create_localised_sheet_wrapper(self, language):
    logging.debug('Creating localised, %s sheet for: %s', language.name, self.header.name)
    if language == Language.korean:
        import urllib.request
        import io
        with urllib.request.urlopen(
                'https://raw.githubusercontent.com/Ra-Workspace/ffxiv-datamining-ko/master/csv/%s.csv' %
                (self.header.name,)) as dat:
            dat_buffer = io.TextIOWrapper(io.BufferedReader(dat), encoding='utf-8-sig')
            sheet = ExportedDataSheet(type(ExportedDataRow),
                                      self.collection,
                                      self.header.name,
                                      language,
                                      dat_buffer)
            return sheet

    return _create_localised_sheet_wrapper.__wrapped__(self, language)


def initialize():
    MultiSheet._create_localised_sheet = \
        update_wrapper(_create_localised_sheet_wrapper, MultiSheet._create_localised_sheet)
    RelationalMultiSheet._create_localised_sheet = \
        update_wrapper(_create_localised_sheet_wrapper, RelationalMultiSheet._create_localised_sheet)
