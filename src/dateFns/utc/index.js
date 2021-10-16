import { toDate } from 'date-fns'
import toInteger from 'date-fns/_lib/toInteger/index'
import requiredArgs from 'date-fns/_lib/requiredArgs/index'
import getTimezoneOffsetInMilliseconds from 'date-fns/_lib/getTimezoneOffsetInMilliseconds/index'

import { addHours as addHoursOrig,
         addMilliseconds as addMillisecondsOrig,
         addMinutes as addMinutesOrig,
         addSeconds as addSecondsOrig,
         subHours as subHoursOrig,
         subMilliseconds as subMillisecondsOrig,
         subMinutes as subMinutesOrig,
         subSeconds as subSecondsOrig } from 'date-fns'

export function addDays(dirtyDate, dirtyAmount) {
    requiredArgs(2, arguments);
    const date = toDate(dirtyDate);
    const amount = toInteger(dirtyAmount);
    if (isNaN(amount)) {
        return new Date(NaN);
    }
    if (!amount) {
        return date;
    }
    date.setUTCDate(date.getUTCDate() + amount);
    return date;
}

export let addHours = addHoursOrig;
export let addMilliseconds = addMillisecondsOrig;
export let addMinutes = addMinutesOrig;
export let addSeconds = addSecondsOrig;

export function endOfDay(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    date.setUTCHours(23, 59, 59, 999);
    return date;
}

export function endOfHour(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    date.setUTCMinutes(59, 59, 999);
    return date;
}

export function endOfMinute(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    date.setUTCSeconds(59, 999);
    return date;
}

export function endOfSecond(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    date.setUTCMilliseconds(999);
    return date;
}

export function getDate(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    const dayOfMonth = date.getUTCDate();
    return dayOfMonth;
}

export function getDay(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    const day = date.getUTCDay();
    return day;
}

export function getHours(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    const hours = date.getUTCHours();
    return hours;
}

export function getMilliseconds(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    const milliseconds = date.getUTCMilliseconds();
    return milliseconds;
}

export function getMinutes(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    const minutes = date.getUTCMinutes();
    return minutes;
}

export function getSeconds(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    const seconds = date.getUTCSeconds();
    return seconds;
}

export function setDate(dirtyDate, dirtyDayOfMonth) {
    requiredArgs(2, arguments);

    const date = toDate(dirtyDate);
    const dayOfMonth = toInteger(dirtyDayOfMonth);
    date.setUTCDate(dayOfMonth);
    return date;
}

export function setHours(dirtyDate, dirtyHours) {
    requiredArgs(2, arguments);

    const date = toDate(dirtyDate);
    const hours = toInteger(dirtyHours);
    date.setUTCHours(hours);
    return date;
}

export function setMilliseconds(dirtyDate, dirtyMilliseconds) {
    requiredArgs(2, arguments);

    const date = toDate(dirtyDate);
    const milliseconds = toInteger(dirtyMilliseconds);
    date.setUTCMilliseconds(milliseconds);
    return date;
}

export function setMinutes(dirtyDate, dirtyMinutes) {
    requiredArgs(2, arguments);

    const date = toDate(dirtyDate);
    const minutes = toInteger(dirtyMinutes);
    date.setUTCMinutes(minutes);
    return date;
}

export function setSeconds(dirtyDate, dirtySeconds) {
    requiredArgs(2, arguments);

    const date = toDate(dirtyDate);
    const seconds = toInteger(dirtySeconds);
    date.setUTCSeconds(seconds);
    return date;
}

export function startOfDay(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    date.setUTCHours(0, 0, 0, 0);
    return date;
}

export function startOfHour(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    date.setUTCMinutes(0, 0, 0);
    return date;
}

export function startOfMinute(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    date.setUTCSeconds(0, 0);
    return date;
}

export function startOfSecond(dirtyDate) {
    requiredArgs(1, arguments);

    const date = toDate(dirtyDate);
    date.setUTCMilliseconds(0);
    return date;
}

export function subDays(dirtyDate, dirtyAmount) {
    requiredArgs(2, arguments);

    const amount = toInteger(dirtyAmount);
    return addDays(dirtyDate, -amount);
}

export let subHours = subHoursOrig;
export let subMilliseconds = subMillisecondsOrig;
export let subMinutes = subMinutesOrig;
export let subSeconds = subSecondsOrig;

function toUTCDate(dirtyDate) {
    const date = toDate(dirtyDate);
    // return Date.UTC(date.getUTCFullYear(),
    //                 date.getUTCMonth(),
    //                 date.getUTCDate(),
    //                 date.getUTCHours(),
    //                 date.getUTCMinutes(),
    //                 date.getUTCSeconds(),
    //                 date.getUTCMilliseconds());
    const utcDate = addMillisecondsOrig(date, getTimezoneOffsetInMilliseconds(date));
    return utcDate;
}

export { toUTCDate as toDate };
