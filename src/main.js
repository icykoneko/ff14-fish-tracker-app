import { add, areIntervalsOverlapping, sub, toDate } from 'date-fns';

export {
    add,
    addMinutes,
    addHours,
    areIntervalsOverlapping,
    compareAsc,
    differenceInMilliseconds,
    differenceInMinutes,
    eachMinuteOfInterval,
    format,
    formatDistanceStrict,
    formatDuration,
    formatISO,
    formatRelative,
    getDayOfYear,
    getHours,
    intervalToDuration,
    isAfter,
    isBefore,
    isEqual,
    isWithinInterval,
    milliseconds,
    setHours,
    startOfHour,
    startOfMinute,
    sub,
    subDays,
    subHours,
    toDate
} from 'date-fns';

export { default as defaultLocale } from 'date-fns/locale/en-US';

export * as utc from './dateFns/utc/index';

export function isSameOrAfter(dirtyDate, dirtyDateToCompare) {
    const date = toDate(dirtyDate);
    const dateToCompare = toDate(dirtyDateToCompare);
    return date.getTime() >= dateToCompare.getTime();
}

export function isSameOrBefore(dirtyDate, dirtyDateToCompare) {
    const date = toDate(dirtyDate);
    const dateToCompare = toDate(dirtyDateToCompare);
    return date.getTime() <= dateToCompare.getTime();
}

export function intervalAfter(dirtyDate, duration) {
    const date = toDate(dirtyDate);
    return {start: date, end: add(date, duration)};
}

export function intervalBefore(dirtyDate, duration) {
    const date = toDate(dirtyDate);
    return {start: sub(date, duration), end: date};
}

// Based on Luxon's implementatin for durations.
// https://github.com/moment/luxon

const LOW_ORDER_MATRIX = {
    hours: { minutes: 60, seconds: 60 * 60, milliseconds: 60 * 60 * 1000 },
    minutes: { seconds: 60, milliseconds: 60 * 1000 },
    seconds: { milliseconds: 1000 },
};

const ORDERED_UNITS = [
    "hours",
    "minutes",
    "seconds",
    "milliseconds",
];

const REVERSED_UNITS = ORDERED_UNITS.slice(0).reverse();

function antiTrunc(n) {
    return n < 0 ? Math.floor(n) : Math.ceil(n);
}

function convert(matrix, fromMap, fromUnit, toMap, toUnit) {
    const conv = matrix[toUnit][fromUnit],
          raw = fromMap[fromUnit] / conv,
          sameSign = Math.sign(raw) === Math.sign(toMap[toUnit]),
          added = !sameSign && toMap[toUnit] !== 0 && Math.abs(raw) <= 1 ? antiTrunc(raw) : Math.trunc(raw);
    toMap[toUnit] += added;
    fromMap[fromUnit] -= added * conv;
}

export function normalizeDuration(dirtyDuration) {
    const built = {},
          accumulated = {},
          vals = Object.fromEntries(Object.entries(dirtyDuration));
    let lastUnit;

    for (const k of ORDERED_UNITS) {
        lastUnit = k;
        let own = 0;

        // Anything we haven't boiled down yet should get boiled into this unit.
        for (const ak in accumulated) {
            own += LOW_ORDER_MATRIX[ak][k] * accumulated[ak];
            accumulated[ak] = 0;
        }

        // Plus anything that's already in this unit.
        if (typeof(vals[k]) === 'number') {
            own += vals[k];
        }

        const i = Math.trunc(own);
        built[k] = i;
        accumulated[k] = own - i; // Absorb these fractions into another unit.

        // Plus anything further down the chain that should be rolled up into this.
        for (const down in vals) {
            if (ORDERED_UNITS.indexOf(down) > ORDERED_UNITS.indexOf(k)) {
                convert(LOW_ORDER_MATRIX, vals, down, built, k);
            }
        }
        // Otherwise, keep it for later.
    }
    // Anything left over becomes the decimal for the last unit.
    for (const key in accumulated) {
        if (accumulated[key] !== 0) {
            built[lastUnit] +=
                key === lastUnit ? accumulated[key] : accumulated[key] / LOW_ORDER_MATRIX[lastUnit][key];
        }
    }

    // Normalize it.
    REVERSED_UNITS.reduce((prev, curr) => {
        // Check if the input has this unit.
        if (!(typeof(built[curr]) === 'undefined')) {
            if (prev) {
                // Update the duration
                convert(LOW_ORDER_MATRIX, built, prev, built, curr);
            }
            return curr;
        } else {
            return prev;
        }
    }, null);
    return built;
}

// Using Luxon's implementation for intervals.
// https://github.com/moment/luxon

export function doesintervalAbutStart(dirtyInterval, dirtyOtherInterval) {
    const intervalEndTime = toDate(dirtyInterval.end).getTime();
    const otherIntervalStartTime = toDate(dirtyOtherInterval.start).getTime();
    return intervalEndTime === otherIntervalStartTime;
}

export function doesIntervalAbutEnd(dirtyInterval, dirtyOtherInterval) {
    const intervalStartTime = toDate(dirtyInterval.start).getTime();
    const otherIntervalEndTime = toDate(dirtyOtherInterval.end).getTime();
    return otherIntervalEndTime === intervalStartTime;
}

export function intervalUnion(interval, otherInterval) {
    const intervalStartTime = toDate(interval.start).getTime();
    const intervalEndTime = toDate(interval.end).getTime();
    const otherIntervalStartTime = toDate(otherInterval.start).getTime();
    const otherIntervalEndTime = toDate(otherInterval.end).getTime();

    const start = intervalStartTime < otherIntervalStartTime ? intervalStartTime : otherIntervalStartTime;
    const end = intervalEndTime > otherIntervalEndTime ? intervalEndTime : otherIntervalEndTime;
    return { start: start, end: end };
}

export function intervalIntersection(interval, otherInterval) {
    const intervalStartTime = toDate(interval.start).getTime();
    const intervalEndTime = toDate(interval.end).getTime();
    const otherIntervalStartTime = toDate(otherInterval.start).getTime();
    const otherIntervalEndTime = toDate(otherInterval.end).getTime();

    const start = intervalStartTime > otherIntervalStartTime ? intervalStartTime : otherIntervalStartTime;
    const end = intervalEndTime < otherIntervalEndTime ? intervalEndTime : otherIntervalEndTime;

    if (start >= end) {
        return null;
    } else {
        return { start: start, end: end };
    }
}

export function intervalMerge(intervals) {
    const [found, final] = intervals
        .sort((a, b) => a.start - b.start)
        .reduce(
            ([sofar, current], item) => {
                if (!current) {
                    return [sofar, item];
                } else if (areIntervalsOverlapping(current, item) || doesintervalAbutStart(current, item)) {
                    return [sofar, intervalUnion(current, item)];
                } else {
                    return [sofar.concat([current]), item];
                }
            },
            [[], null]
        );
    if (final) {
        found.push(final);
    }
    return found;
}

export function intervalXor(...intervals) {
    // Using Luxon's implementation for intervals.
    let start = null,
        currentCount = 0;
    const results = [],
          ends = intervals.map((i) => [
              { time: i.start, type: "s" },
              { time: i.end, type: "e" },
          ]),
          flattened = Array.prototype.concat(...ends),
          arr = flattened.sort((a, b) => a.time - b.time);

    for (const i of arr) {
        currentCount += i.type === "s" ? 1 : -1;

        if (currentCount === 1) {
            start = i.time;
        } else {
            if (start && +start !== +i.time) {
                results.push({start: start, end: i.time});
            }

            start = null;
        }
    }

    return intervalMerge(results);
}