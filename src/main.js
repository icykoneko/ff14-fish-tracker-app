import { toDate } from 'date-fns';

export {
    addMinutes,
    addHours,
    compareAsc,
    differenceInMilliseconds,
    differenceInMinutes,
    formatDistanceStrict,
    getDayOfYear,
    getHours,
    isAfter,
    isBefore,
    isEqual,
    setHours,
    startOfHour,
    subDays,
    subHours,
    toDate
} from 'date-fns';

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
