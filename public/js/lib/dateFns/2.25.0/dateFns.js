var dateFns = (function (exports) {
  'use strict';

  function toInteger$2(dirtyNumber) {
    if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {
      return NaN;
    }

    var number = Number(dirtyNumber);

    if (isNaN(number)) {
      return number;
    }

    return number < 0 ? Math.ceil(number) : Math.floor(number);
  }

  function requiredArgs$2(required, args) {
    if (args.length < required) {
      throw new TypeError(required + ' argument' + (required > 1 ? 's' : '') + ' required, but only ' + args.length + ' present');
    }
  }

  /**
   * @name toDate
   * @category Common Helpers
   * @summary Convert the given argument to an instance of Date.
   *
   * @description
   * Convert the given argument to an instance of Date.
   *
   * If the argument is an instance of Date, the function returns its clone.
   *
   * If the argument is a number, it is treated as a timestamp.
   *
   * If the argument is none of the above, the function returns Invalid Date.
   *
   * **Note**: *all* Date arguments passed to any *date-fns* function is processed by `toDate`.
   *
   * @param {Date|Number} argument - the value to convert
   * @returns {Date} the parsed date in the local time zone
   * @throws {TypeError} 1 argument required
   *
   * @example
   * // Clone the date:
   * const result = toDate(new Date(2014, 1, 11, 11, 30, 30))
   * //=> Tue Feb 11 2014 11:30:30
   *
   * @example
   * // Convert the timestamp to date:
   * const result = toDate(1392098430000)
   * //=> Tue Feb 11 2014 11:30:30
   */

  function toDate(argument) {
    requiredArgs$2(1, arguments);
    var argStr = Object.prototype.toString.call(argument); // Clone the date

    if (argument instanceof Date || typeof argument === 'object' && argStr === '[object Date]') {
      // Prevent the date to lose the milliseconds when passed to new Date() in IE10
      return new Date(argument.getTime());
    } else if (typeof argument === 'number' || argStr === '[object Number]') {
      return new Date(argument);
    } else {
      if ((typeof argument === 'string' || argStr === '[object String]') && typeof console !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn("Starting with v2.0.0-beta.1 date-fns doesn't accept strings as date arguments. Please use `parseISO` to parse strings. See: https://git.io/fjule"); // eslint-disable-next-line no-console

        console.warn(new Error().stack);
      }

      return new Date(NaN);
    }
  }

  /**
   * @name addDays
   * @category Day Helpers
   * @summary Add the specified number of days to the given date.
   *
   * @description
   * Add the specified number of days to the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} amount - the amount of days to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {Date} - the new date with the days added
   * @throws {TypeError} - 2 arguments required
   *
   * @example
   * // Add 10 days to 1 September 2014:
   * const result = addDays(new Date(2014, 8, 1), 10)
   * //=> Thu Sep 11 2014 00:00:00
   */

  function addDays$1(dirtyDate, dirtyAmount) {
    requiredArgs$2(2, arguments);
    var date = toDate(dirtyDate);
    var amount = toInteger$2(dirtyAmount);

    if (isNaN(amount)) {
      return new Date(NaN);
    }

    if (!amount) {
      // If 0 days, no-op to avoid changing times in the hour before end of DST
      return date;
    }

    date.setDate(date.getDate() + amount);
    return date;
  }

  /**
   * @name addMonths
   * @category Month Helpers
   * @summary Add the specified number of months to the given date.
   *
   * @description
   * Add the specified number of months to the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} amount - the amount of months to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {Date} the new date with the months added
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Add 5 months to 1 September 2014:
   * const result = addMonths(new Date(2014, 8, 1), 5)
   * //=> Sun Feb 01 2015 00:00:00
   */

  function addMonths(dirtyDate, dirtyAmount) {
    requiredArgs$2(2, arguments);
    var date = toDate(dirtyDate);
    var amount = toInteger$2(dirtyAmount);

    if (isNaN(amount)) {
      return new Date(NaN);
    }

    if (!amount) {
      // If 0 months, no-op to avoid changing times in the hour before end of DST
      return date;
    }

    var dayOfMonth = date.getDate(); // The JS Date object supports date math by accepting out-of-bounds values for
    // month, day, etc. For example, new Date(2020, 0, 0) returns 31 Dec 2019 and
    // new Date(2020, 13, 1) returns 1 Feb 2021.  This is *almost* the behavior we
    // want except that dates will wrap around the end of a month, meaning that
    // new Date(2020, 13, 31) will return 3 Mar 2021 not 28 Feb 2021 as desired. So
    // we'll default to the end of the desired month by adding 1 to the desired
    // month and using a date of 0 to back up one day to the end of the desired
    // month.

    var endOfDesiredMonth = new Date(date.getTime());
    endOfDesiredMonth.setMonth(date.getMonth() + amount + 1, 0);
    var daysInMonth = endOfDesiredMonth.getDate();

    if (dayOfMonth >= daysInMonth) {
      // If we're already at the end of the month, then this is the correct date
      // and we're done.
      return endOfDesiredMonth;
    } else {
      // Otherwise, we now know that setting the original day-of-month value won't
      // cause an overflow, so set the desired day-of-month. Note that we can't
      // just set the date of `endOfDesiredMonth` because that object may have had
      // its time changed in the unusual case where where a DST transition was on
      // the last day of the month and its local time was in the hour skipped or
      // repeated next to a DST transition.  So we use `date` instead which is
      // guaranteed to still have the original time.
      date.setFullYear(endOfDesiredMonth.getFullYear(), endOfDesiredMonth.getMonth(), dayOfMonth);
      return date;
    }
  }

  /**
   * @name add
   * @category Common Helpers
   * @summary Add the specified years, months, weeks, days, hours, minutes and seconds to the given date.
   *
   * @description
   * Add the specified years, months, weeks, days, hours, minutes and seconds to the given date.
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Duration} duration - the object with years, months, weeks, days, hours, minutes and seconds to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   *
   * | Key            | Description                        |
   * |----------------|------------------------------------|
   * | years          | Amount of years to be added        |
   * | months         | Amount of months to be added       |
   * | weeks          | Amount of weeks to be added        |
   * | days           | Amount of days to be added         |
   * | hours          | Amount of hours to be added        |
   * | minutes        | Amount of minutes to be added      |
   * | seconds        | Amount of seconds to be added      |
   *
   * All values default to 0
   *
   * @returns {Date} the new date with the seconds added
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Add the following duration to 1 September 2014, 10:19:50
   * const result = add(new Date(2014, 8, 1, 10, 19, 50), {
   *   years: 2,
   *   months: 9,
   *   weeks: 1,
   *   days: 7,
   *   hours: 5,
   *   minutes: 9,
   *   seconds: 30,
   * })
   * //=> Thu Jun 15 2017 15:29:20
   */
  function add(dirtyDate, duration) {
    requiredArgs$2(2, arguments);
    if (!duration || typeof duration !== 'object') return new Date(NaN);
    var years = duration.years ? toInteger$2(duration.years) : 0;
    var months = duration.months ? toInteger$2(duration.months) : 0;
    var weeks = duration.weeks ? toInteger$2(duration.weeks) : 0;
    var days = duration.days ? toInteger$2(duration.days) : 0;
    var hours = duration.hours ? toInteger$2(duration.hours) : 0;
    var minutes = duration.minutes ? toInteger$2(duration.minutes) : 0;
    var seconds = duration.seconds ? toInteger$2(duration.seconds) : 0; // Add years and months

    var date = toDate(dirtyDate);
    var dateWithMonths = months || years ? addMonths(date, months + years * 12) : date; // Add weeks and days

    var dateWithDays = days || weeks ? addDays$1(dateWithMonths, days + weeks * 7) : dateWithMonths; // Add days, hours, minutes and seconds

    var minutesToAdd = minutes + hours * 60;
    var secondsToAdd = seconds + minutesToAdd * 60;
    var msToAdd = secondsToAdd * 1000;
    var finalDate = new Date(dateWithDays.getTime() + msToAdd);
    return finalDate;
  }

  /**
   * @name addMilliseconds
   * @category Millisecond Helpers
   * @summary Add the specified number of milliseconds to the given date.
   *
   * @description
   * Add the specified number of milliseconds to the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} amount - the amount of milliseconds to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {Date} the new date with the milliseconds added
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Add 750 milliseconds to 10 July 2014 12:45:30.000:
   * const result = addMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
   * //=> Thu Jul 10 2014 12:45:30.750
   */

  function addMilliseconds$1(dirtyDate, dirtyAmount) {
    requiredArgs$2(2, arguments);
    var timestamp = toDate(dirtyDate).getTime();
    var amount = toInteger$2(dirtyAmount);
    return new Date(timestamp + amount);
  }

  var MILLISECONDS_IN_HOUR = 3600000;
  /**
   * @name addHours
   * @category Hour Helpers
   * @summary Add the specified number of hours to the given date.
   *
   * @description
   * Add the specified number of hours to the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} amount - the amount of hours to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {Date} the new date with the hours added
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Add 2 hours to 10 July 2014 23:00:00:
   * const result = addHours(new Date(2014, 6, 10, 23, 0), 2)
   * //=> Fri Jul 11 2014 01:00:00
   */

  function addHours$1(dirtyDate, dirtyAmount) {
    requiredArgs$2(2, arguments);
    var amount = toInteger$2(dirtyAmount);
    return addMilliseconds$1(dirtyDate, amount * MILLISECONDS_IN_HOUR);
  }

  /**
   * Google Chrome as of 67.0.3396.87 introduced timezones with offset that includes seconds.
   * They usually appear for dates that denote time before the timezones were introduced
   * (e.g. for 'Europe/Prague' timezone the offset is GMT+00:57:44 before 1 October 1891
   * and GMT+01:00:00 after that date)
   *
   * Date#getTimezoneOffset returns the offset in minutes and would return 57 for the example above,
   * which would lead to incorrect calculations.
   *
   * This function returns the timezone offset in milliseconds that takes seconds in account.
   */
  function getTimezoneOffsetInMilliseconds$2(date) {
    var utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()));
    utcDate.setUTCFullYear(date.getFullYear());
    return date.getTime() - utcDate.getTime();
  }

  /**
   * @name startOfDay
   * @category Day Helpers
   * @summary Return the start of a day for the given date.
   *
   * @description
   * Return the start of a day for the given date.
   * The result will be in the local timezone.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the original date
   * @returns {Date} the start of a day
   * @throws {TypeError} 1 argument required
   *
   * @example
   * // The start of a day for 2 September 2014 11:55:00:
   * const result = startOfDay(new Date(2014, 8, 2, 11, 55, 0))
   * //=> Tue Sep 02 2014 00:00:00
   */

  function startOfDay$1(dirtyDate) {
    requiredArgs$2(1, arguments);
    var date = toDate(dirtyDate);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  var MILLISECONDS_IN_DAY$1 = 86400000;
  /**
   * @name differenceInCalendarDays
   * @category Day Helpers
   * @summary Get the number of calendar days between the given dates.
   *
   * @description
   * Get the number of calendar days between the given dates. This means that the times are removed
   * from the dates and then the difference in days is calculated.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} dateLeft - the later date
   * @param {Date|Number} dateRight - the earlier date
   * @returns {Number} the number of calendar days
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // How many calendar days are between
   * // 2 July 2011 23:00:00 and 2 July 2012 00:00:00?
   * const result = differenceInCalendarDays(
   *   new Date(2012, 6, 2, 0, 0),
   *   new Date(2011, 6, 2, 23, 0)
   * )
   * //=> 366
   * // How many calendar days are between
   * // 2 July 2011 23:59:00 and 3 July 2011 00:01:00?
   * const result = differenceInCalendarDays(
   *   new Date(2011, 6, 3, 0, 1),
   *   new Date(2011, 6, 2, 23, 59)
   * )
   * //=> 1
   */

  function differenceInCalendarDays(dirtyDateLeft, dirtyDateRight) {
    requiredArgs$2(2, arguments);
    var startOfDayLeft = startOfDay$1(dirtyDateLeft);
    var startOfDayRight = startOfDay$1(dirtyDateRight);
    var timestampLeft = startOfDayLeft.getTime() - getTimezoneOffsetInMilliseconds$2(startOfDayLeft);
    var timestampRight = startOfDayRight.getTime() - getTimezoneOffsetInMilliseconds$2(startOfDayRight); // Round the number of days to the nearest integer
    // because the number of milliseconds in a day is not constant
    // (e.g. it's different in the day of the daylight saving time clock shift)

    return Math.round((timestampLeft - timestampRight) / MILLISECONDS_IN_DAY$1);
  }

  var MILLISECONDS_IN_MINUTE$1 = 60000;
  /**
   * @name addMinutes
   * @category Minute Helpers
   * @summary Add the specified number of minutes to the given date.
   *
   * @description
   * Add the specified number of minutes to the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} amount - the amount of minutes to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {Date} the new date with the minutes added
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Add 30 minutes to 10 July 2014 12:00:00:
   * const result = addMinutes(new Date(2014, 6, 10, 12, 0), 30)
   * //=> Thu Jul 10 2014 12:30:00
   */

  function addMinutes$1(dirtyDate, dirtyAmount) {
    requiredArgs$2(2, arguments);
    var amount = toInteger$2(dirtyAmount);
    return addMilliseconds$1(dirtyDate, amount * MILLISECONDS_IN_MINUTE$1);
  }

  /**
   * @name addSeconds
   * @category Second Helpers
   * @summary Add the specified number of seconds to the given date.
   *
   * @description
   * Add the specified number of seconds to the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} amount - the amount of seconds to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {Date} the new date with the seconds added
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Add 30 seconds to 10 July 2014 12:45:00:
   * const result = addSeconds(new Date(2014, 6, 10, 12, 45, 0), 30)
   * //=> Thu Jul 10 2014 12:45:30
   */

  function addSeconds$1(dirtyDate, dirtyAmount) {
    requiredArgs$2(2, arguments);
    var amount = toInteger$2(dirtyAmount);
    return addMilliseconds$1(dirtyDate, amount * 1000);
  }

  /**
   * @name areIntervalsOverlapping
   * @category Interval Helpers
   * @summary Is the given time interval overlapping with another time interval?
   *
   * @description
   * Is the given time interval overlapping with another time interval? Adjacent intervals do not count as overlapping.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * - The function was renamed from `areRangesOverlapping` to `areIntervalsOverlapping`.
   *   This change was made to mirror the use of the word "interval" in standard ISO 8601:2004 terminology:
   *
   *   ```
   *   2.1.3
   *   time interval
   *   part of the time axis limited by two instants
   *   ```
   *
   *   Also, this function now accepts an object with `start` and `end` properties
   *   instead of two arguments as an interval.
   *   This function now throws `RangeError` if the start of the interval is after its end
   *   or if any date in the interval is `Invalid Date`.
   *
   *   ```javascript
   *   // Before v2.0.0
   *
   *   areRangesOverlapping(
   *     new Date(2014, 0, 10), new Date(2014, 0, 20),
   *     new Date(2014, 0, 17), new Date(2014, 0, 21)
   *   )
   *
   *   // v2.0.0 onward
   *
   *   areIntervalsOverlapping(
   *     { start: new Date(2014, 0, 10), end: new Date(2014, 0, 20) },
   *     { start: new Date(2014, 0, 17), end: new Date(2014, 0, 21) }
   *   )
   *   ```
   *
   * @param {Interval} intervalLeft - the first interval to compare. See [Interval]{@link https://date-fns.org/docs/Interval}
   * @param {Interval} intervalRight - the second interval to compare. See [Interval]{@link https://date-fns.org/docs/Interval}
   * @param {Object} [options] - the object with options
   * @param {Boolean} [options.inclusive=false] - whether the comparison is inclusive or not
   * @returns {Boolean} whether the time intervals are overlapping
   * @throws {TypeError} 2 arguments required
   * @throws {RangeError} The start of an interval cannot be after its end
   * @throws {RangeError} Date in interval cannot be `Invalid Date`
   *
   * @example
   * // For overlapping time intervals:
   * areIntervalsOverlapping(
   *   { start: new Date(2014, 0, 10), end: new Date(2014, 0, 20) },
   *   { start: new Date(2014, 0, 17), end: new Date(2014, 0, 21) }
   * )
   * //=> true
   *
   * @example
   * // For non-overlapping time intervals:
   * areIntervalsOverlapping(
   *   { start: new Date(2014, 0, 10), end: new Date(2014, 0, 20) },
   *   { start: new Date(2014, 0, 21), end: new Date(2014, 0, 22) }
   * )
   * //=> false
   *
   * @example
   * // For adjacent time intervals:
   * areIntervalsOverlapping(
   *   { start: new Date(2014, 0, 10), end: new Date(2014, 0, 20) },
   *   { start: new Date(2014, 0, 20), end: new Date(2014, 0, 30) }
   * )
   * //=> false
   *
   * @example
   * // Using the inclusive option:
   * areIntervalsOverlapping(
   *   { start: new Date(2014, 0, 10), end: new Date(2014, 0, 20) },
   *   { start: new Date(2014, 0, 20), end: new Date(2014, 0, 24) }
   * )
   * //=> false
   * areIntervalsOverlapping(
   *   { start: new Date(2014, 0, 10), end: new Date(2014, 0, 20) },
   *   { start: new Date(2014, 0, 20), end: new Date(2014, 0, 24) },
   *   { inclusive: true }
   * )
   * //=> true
   */

  function areIntervalsOverlapping(dirtyIntervalLeft, dirtyIntervalRight) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
      inclusive: false
    };
    requiredArgs$2(2, arguments);
    var intervalLeft = dirtyIntervalLeft || {};
    var intervalRight = dirtyIntervalRight || {};
    var leftStartTime = toDate(intervalLeft.start).getTime();
    var leftEndTime = toDate(intervalLeft.end).getTime();
    var rightStartTime = toDate(intervalRight.start).getTime();
    var rightEndTime = toDate(intervalRight.end).getTime(); // Throw an exception if start date is after end date or if any date is `Invalid Date`

    if (!(leftStartTime <= leftEndTime && rightStartTime <= rightEndTime)) {
      throw new RangeError('Invalid interval');
    }

    if (options.inclusive) {
      return leftStartTime <= rightEndTime && rightStartTime <= leftEndTime;
    }

    return leftStartTime < rightEndTime && rightStartTime < leftEndTime;
  }

  /**
   * @name compareAsc
   * @category Common Helpers
   * @summary Compare the two dates and return -1, 0 or 1.
   *
   * @description
   * Compare the two dates and return 1 if the first date is after the second,
   * -1 if the first date is before the second or 0 if dates are equal.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} dateLeft - the first date to compare
   * @param {Date|Number} dateRight - the second date to compare
   * @returns {Number} the result of the comparison
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Compare 11 February 1987 and 10 July 1989:
   * const result = compareAsc(new Date(1987, 1, 11), new Date(1989, 6, 10))
   * //=> -1
   *
   * @example
   * // Sort the array of dates:
   * const result = [
   *   new Date(1995, 6, 2),
   *   new Date(1987, 1, 11),
   *   new Date(1989, 6, 10)
   * ].sort(compareAsc)
   * //=> [
   * //   Wed Feb 11 1987 00:00:00,
   * //   Mon Jul 10 1989 00:00:00,
   * //   Sun Jul 02 1995 00:00:00
   * // ]
   */

  function compareAsc(dirtyDateLeft, dirtyDateRight) {
    requiredArgs$2(2, arguments);
    var dateLeft = toDate(dirtyDateLeft);
    var dateRight = toDate(dirtyDateRight);
    var diff = dateLeft.getTime() - dateRight.getTime();

    if (diff < 0) {
      return -1;
    } else if (diff > 0) {
      return 1; // Return 0 if diff is 0; return NaN if diff is NaN
    } else {
      return diff;
    }
  }

  /**
   * Days in 1 week.
   *
   * @name daysInWeek
   * @constant
   * @type {number}
   * @default
   */
  /**
   * Milliseconds in 1 minute
   *
   * @name millisecondsInMinute
   * @constant
   * @type {number}
   * @default
   */

  var millisecondsInMinute = 60000;
  /**
   * Milliseconds in 1 hour
   *
   * @name millisecondsInHour
   * @constant
   * @type {number}
   * @default
   */

  var millisecondsInHour = 3600000;

  /**
   * @name isDate
   * @category Common Helpers
   * @summary Is the given value a date?
   *
   * @description
   * Returns true if the given value is an instance of Date. The function works for dates transferred across iframes.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {*} value - the value to check
   * @returns {boolean} true if the given value is a date
   * @throws {TypeError} 1 arguments required
   *
   * @example
   * // For a valid date:
   * const result = isDate(new Date())
   * //=> true
   *
   * @example
   * // For an invalid date:
   * const result = isDate(new Date(NaN))
   * //=> true
   *
   * @example
   * // For some value:
   * const result = isDate('2014-02-31')
   * //=> false
   *
   * @example
   * // For an object:
   * const result = isDate({})
   * //=> false
   */

  function isDate(value) {
    requiredArgs$2(1, arguments);
    return value instanceof Date || typeof value === 'object' && Object.prototype.toString.call(value) === '[object Date]';
  }

  /**
   * @name isValid
   * @category Common Helpers
   * @summary Is the given date valid?
   *
   * @description
   * Returns false if argument is Invalid Date and true otherwise.
   * Argument is converted to Date using `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
   * Invalid Date is a Date, whose time value is NaN.
   *
   * Time value of Date: http://es5.github.io/#x15.9.1.1
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * - Now `isValid` doesn't throw an exception
   *   if the first argument is not an instance of Date.
   *   Instead, argument is converted beforehand using `toDate`.
   *
   *   Examples:
   *
   *   | `isValid` argument        | Before v2.0.0 | v2.0.0 onward |
   *   |---------------------------|---------------|---------------|
   *   | `new Date()`              | `true`        | `true`        |
   *   | `new Date('2016-01-01')`  | `true`        | `true`        |
   *   | `new Date('')`            | `false`       | `false`       |
   *   | `new Date(1488370835081)` | `true`        | `true`        |
   *   | `new Date(NaN)`           | `false`       | `false`       |
   *   | `'2016-01-01'`            | `TypeError`   | `false`       |
   *   | `''`                      | `TypeError`   | `false`       |
   *   | `1488370835081`           | `TypeError`   | `true`        |
   *   | `NaN`                     | `TypeError`   | `false`       |
   *
   *   We introduce this change to make *date-fns* consistent with ECMAScript behavior
   *   that try to coerce arguments to the expected type
   *   (which is also the case with other *date-fns* functions).
   *
   * @param {*} date - the date to check
   * @returns {Boolean} the date is valid
   * @throws {TypeError} 1 argument required
   *
   * @example
   * // For the valid date:
   * const result = isValid(new Date(2014, 1, 31))
   * //=> true
   *
   * @example
   * // For the value, convertable into a date:
   * const result = isValid(1393804800000)
   * //=> true
   *
   * @example
   * // For the invalid date:
   * const result = isValid(new Date(''))
   * //=> false
   */

  function isValid(dirtyDate) {
    requiredArgs$2(1, arguments);

    if (!isDate(dirtyDate) && typeof dirtyDate !== 'number') {
      return false;
    }

    var date = toDate(dirtyDate);
    return !isNaN(Number(date));
  }

  /**
   * @name differenceInCalendarMonths
   * @category Month Helpers
   * @summary Get the number of calendar months between the given dates.
   *
   * @description
   * Get the number of calendar months between the given dates.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} dateLeft - the later date
   * @param {Date|Number} dateRight - the earlier date
   * @returns {Number} the number of calendar months
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // How many calendar months are between 31 January 2014 and 1 September 2014?
   * var result = differenceInCalendarMonths(
   *   new Date(2014, 8, 1),
   *   new Date(2014, 0, 31)
   * )
   * //=> 8
   */

  function differenceInCalendarMonths(dirtyDateLeft, dirtyDateRight) {
    requiredArgs$2(2, arguments);
    var dateLeft = toDate(dirtyDateLeft);
    var dateRight = toDate(dirtyDateRight);
    var yearDiff = dateLeft.getFullYear() - dateRight.getFullYear();
    var monthDiff = dateLeft.getMonth() - dateRight.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  /**
   * @name differenceInCalendarYears
   * @category Year Helpers
   * @summary Get the number of calendar years between the given dates.
   *
   * @description
   * Get the number of calendar years between the given dates.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} dateLeft - the later date
   * @param {Date|Number} dateRight - the earlier date
   * @returns {Number} the number of calendar years
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // How many calendar years are between 31 December 2013 and 11 February 2015?
   * const result = differenceInCalendarYears(
   *   new Date(2015, 1, 11),
   *   new Date(2013, 11, 31)
   * )
   * //=> 2
   */

  function differenceInCalendarYears(dirtyDateLeft, dirtyDateRight) {
    requiredArgs$2(2, arguments);
    var dateLeft = toDate(dirtyDateLeft);
    var dateRight = toDate(dirtyDateRight);
    return dateLeft.getFullYear() - dateRight.getFullYear();
  }

  // for accurate equality comparisons of UTC timestamps that end up
  // having the same representation in local time, e.g. one hour before
  // DST ends vs. the instant that DST ends.

  function compareLocalAsc(dateLeft, dateRight) {
    var diff = dateLeft.getFullYear() - dateRight.getFullYear() || dateLeft.getMonth() - dateRight.getMonth() || dateLeft.getDate() - dateRight.getDate() || dateLeft.getHours() - dateRight.getHours() || dateLeft.getMinutes() - dateRight.getMinutes() || dateLeft.getSeconds() - dateRight.getSeconds() || dateLeft.getMilliseconds() - dateRight.getMilliseconds();

    if (diff < 0) {
      return -1;
    } else if (diff > 0) {
      return 1; // Return 0 if diff is 0; return NaN if diff is NaN
    } else {
      return diff;
    }
  }
  /**
   * @name differenceInDays
   * @category Day Helpers
   * @summary Get the number of full days between the given dates.
   *
   * @description
   * Get the number of full day periods between two dates. Fractional days are
   * truncated towards zero.
   *
   * One "full day" is the distance between a local time in one day to the same
   * local time on the next or previous day. A full day can sometimes be less than
   * or more than 24 hours if a daylight savings change happens between two dates.
   *
   * To ignore DST and only measure exact 24-hour periods, use this instead:
   * `Math.floor(differenceInHours(dateLeft, dateRight)/24)|0`.
   *
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} dateLeft - the later date
   * @param {Date|Number} dateRight - the earlier date
   * @returns {Number} the number of full days according to the local timezone
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // How many full days are between
   * // 2 July 2011 23:00:00 and 2 July 2012 00:00:00?
   * const result = differenceInDays(
   *   new Date(2012, 6, 2, 0, 0),
   *   new Date(2011, 6, 2, 23, 0)
   * )
   * //=> 365
   * // How many full days are between
   * // 2 July 2011 23:59:00 and 3 July 2011 00:01:00?
   * const result = differenceInDays(
   *   new Date(2011, 6, 3, 0, 1),
   *   new Date(2011, 6, 2, 23, 59)
   * )
   * //=> 0
   * // How many full days are between
   * // 1 March 2020 0:00 and 1 June 2020 0:00 ?
   * // Note: because local time is used, the
   * // result will always be 92 days, even in
   * // time zones where DST starts and the
   * // period has only 92*24-1 hours.
   * const result = differenceInDays(
   *   new Date(2020, 5, 1),
   *   new Date(2020, 2, 1)
   * )
  //=> 92
   */


  function differenceInDays(dirtyDateLeft, dirtyDateRight) {
    requiredArgs$2(2, arguments);
    var dateLeft = toDate(dirtyDateLeft);
    var dateRight = toDate(dirtyDateRight);
    var sign = compareLocalAsc(dateLeft, dateRight);
    var difference = Math.abs(differenceInCalendarDays(dateLeft, dateRight));
    dateLeft.setDate(dateLeft.getDate() - sign * difference); // Math.abs(diff in full days - diff in calendar days) === 1 if last calendar day is not full
    // If so, result must be decreased by 1 in absolute value

    var isLastDayNotFull = Number(compareLocalAsc(dateLeft, dateRight) === -sign);
    var result = sign * (difference - isLastDayNotFull); // Prevent negative zero

    return result === 0 ? 0 : result;
  }

  /**
   * @name differenceInMilliseconds
   * @category Millisecond Helpers
   * @summary Get the number of milliseconds between the given dates.
   *
   * @description
   * Get the number of milliseconds between the given dates.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} dateLeft - the later date
   * @param {Date|Number} dateRight - the earlier date
   * @returns {Number} the number of milliseconds
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // How many milliseconds are between
   * // 2 July 2014 12:30:20.600 and 2 July 2014 12:30:21.700?
   * const result = differenceInMilliseconds(
   *   new Date(2014, 6, 2, 12, 30, 21, 700),
   *   new Date(2014, 6, 2, 12, 30, 20, 600)
   * )
   * //=> 1100
   */

  function differenceInMilliseconds(dateLeft, dateRight) {
    requiredArgs$2(2, arguments);
    return toDate(dateLeft).getTime() - toDate(dateRight).getTime();
  }

  var roundingMap = {
    ceil: Math.ceil,
    round: Math.round,
    floor: Math.floor,
    trunc: function (value) {
      return value < 0 ? Math.ceil(value) : Math.floor(value);
    } // Math.trunc is not supported by IE

  };
  var defaultRoundingMethod = 'trunc';
  function getRoundingMethod(method) {
    return method ? roundingMap[method] : roundingMap[defaultRoundingMethod];
  }

  /**
   * @name differenceInHours
   * @category Hour Helpers
   * @summary Get the number of hours between the given dates.
   *
   * @description
   * Get the number of hours between the given dates.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} dateLeft - the later date
   * @param {Date|Number} dateRight - the earlier date
   * @param {Object} [options] - an object with options.
   * @param {String} [options.roundingMethod='trunc'] - a rounding method (`ceil`, `floor`, `round` or `trunc`)
   * @returns {Number} the number of hours
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // How many hours are between 2 July 2014 06:50:00 and 2 July 2014 19:00:00?
   * const result = differenceInHours(
   *   new Date(2014, 6, 2, 19, 0),
   *   new Date(2014, 6, 2, 6, 50)
   * )
   * //=> 12
   */

  function differenceInHours(dateLeft, dateRight, options) {
    requiredArgs$2(2, arguments);
    var diff = differenceInMilliseconds(dateLeft, dateRight) / millisecondsInHour;
    return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
  }

  /**
   * @name differenceInMinutes
   * @category Minute Helpers
   * @summary Get the number of minutes between the given dates.
   *
   * @description
   * Get the signed number of full (rounded towards 0) minutes between the given dates.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} dateLeft - the later date
   * @param {Date|Number} dateRight - the earlier date
   * @param {Object} [options] - an object with options.
   * @param {String} [options.roundingMethod='trunc'] - a rounding method (`ceil`, `floor`, `round` or `trunc`)
   * @returns {Number} the number of minutes
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // How many minutes are between 2 July 2014 12:07:59 and 2 July 2014 12:20:00?
   * const result = differenceInMinutes(
   *   new Date(2014, 6, 2, 12, 20, 0),
   *   new Date(2014, 6, 2, 12, 7, 59)
   * )
   * //=> 12
   *
   * @example
   * // How many minutes are between 10:01:59 and 10:00:00
   * const result = differenceInMinutes(
   *   new Date(2000, 0, 1, 10, 0, 0),
   *   new Date(2000, 0, 1, 10, 1, 59)
   * )
   * //=> -1
   */

  function differenceInMinutes(dateLeft, dateRight, options) {
    requiredArgs$2(2, arguments);
    var diff = differenceInMilliseconds(dateLeft, dateRight) / millisecondsInMinute;
    return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
  }

  /**
   * @name endOfDay
   * @category Day Helpers
   * @summary Return the end of a day for the given date.
   *
   * @description
   * Return the end of a day for the given date.
   * The result will be in the local timezone.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the original date
   * @returns {Date} the end of a day
   * @throws {TypeError} 1 argument required
   *
   * @example
   * // The end of a day for 2 September 2014 11:55:00:
   * const result = endOfDay(new Date(2014, 8, 2, 11, 55, 0))
   * //=> Tue Sep 02 2014 23:59:59.999
   */

  function endOfDay$1(dirtyDate) {
    requiredArgs$2(1, arguments);
    var date = toDate(dirtyDate);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  /**
   * @name endOfMonth
   * @category Month Helpers
   * @summary Return the end of a month for the given date.
   *
   * @description
   * Return the end of a month for the given date.
   * The result will be in the local timezone.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the original date
   * @returns {Date} the end of a month
   * @throws {TypeError} 1 argument required
   *
   * @example
   * // The end of a month for 2 September 2014 11:55:00:
   * const result = endOfMonth(new Date(2014, 8, 2, 11, 55, 0))
   * //=> Tue Sep 30 2014 23:59:59.999
   */

  function endOfMonth(dirtyDate) {
    requiredArgs$2(1, arguments);
    var date = toDate(dirtyDate);
    var month = date.getMonth();
    date.setFullYear(date.getFullYear(), month + 1, 0);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  /**
   * @name isLastDayOfMonth
   * @category Month Helpers
   * @summary Is the given date the last day of a month?
   *
   * @description
   * Is the given date the last day of a month?
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to check
   * @returns {Boolean} the date is the last day of a month
   * @throws {TypeError} 1 argument required
   *
   * @example
   * // Is 28 February 2014 the last day of a month?
   * var result = isLastDayOfMonth(new Date(2014, 1, 28))
   * //=> true
   */

  function isLastDayOfMonth(dirtyDate) {
    requiredArgs$2(1, arguments);
    var date = toDate(dirtyDate);
    return endOfDay$1(date).getTime() === endOfMonth(date).getTime();
  }

  /**
   * @name differenceInMonths
   * @category Month Helpers
   * @summary Get the number of full months between the given dates.
   *
   * @description
   * Get the number of full months between the given dates using trunc as a default rounding method.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} dateLeft - the later date
   * @param {Date|Number} dateRight - the earlier date
   * @returns {Number} the number of full months
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // How many full months are between 31 January 2014 and 1 September 2014?
   * const result = differenceInMonths(new Date(2014, 8, 1), new Date(2014, 0, 31))
   * //=> 7
   */

  function differenceInMonths(dirtyDateLeft, dirtyDateRight) {
    requiredArgs$2(2, arguments);
    var dateLeft = toDate(dirtyDateLeft);
    var dateRight = toDate(dirtyDateRight);
    var sign = compareAsc(dateLeft, dateRight);
    var difference = Math.abs(differenceInCalendarMonths(dateLeft, dateRight));
    var result; // Check for the difference of less than month

    if (difference < 1) {
      result = 0;
    } else {
      if (dateLeft.getMonth() === 1 && dateLeft.getDate() > 27) {
        // This will check if the date is end of Feb and assign a higher end of month date
        // to compare it with Jan
        dateLeft.setDate(30);
      }

      dateLeft.setMonth(dateLeft.getMonth() - sign * difference); // Math.abs(diff in full months - diff in calendar months) === 1 if last calendar month is not full
      // If so, result must be decreased by 1 in absolute value

      var isLastMonthNotFull = compareAsc(dateLeft, dateRight) === -sign; // Check for cases of one full calendar month

      if (isLastDayOfMonth(toDate(dirtyDateLeft)) && difference === 1 && compareAsc(dirtyDateLeft, dateRight) === 1) {
        isLastMonthNotFull = false;
      }

      result = sign * (difference - Number(isLastMonthNotFull));
    } // Prevent negative zero


    return result === 0 ? 0 : result;
  }

  /**
   * @name differenceInSeconds
   * @category Second Helpers
   * @summary Get the number of seconds between the given dates.
   *
   * @description
   * Get the number of seconds between the given dates.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} dateLeft - the later date
   * @param {Date|Number} dateRight - the earlier date
   * @param {Object} [options] - an object with options.
   * @param {String} [options.roundingMethod='trunc'] - a rounding method (`ceil`, `floor`, `round` or `trunc`)
   * @returns {Number} the number of seconds
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // How many seconds are between
   * // 2 July 2014 12:30:07.999 and 2 July 2014 12:30:20.000?
   * const result = differenceInSeconds(
   *   new Date(2014, 6, 2, 12, 30, 20, 0),
   *   new Date(2014, 6, 2, 12, 30, 7, 999)
   * )
   * //=> 12
   */

  function differenceInSeconds(dateLeft, dateRight, options) {
    requiredArgs$2(2, arguments);
    var diff = differenceInMilliseconds(dateLeft, dateRight) / 1000;
    return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
  }

  /**
   * @name differenceInYears
   * @category Year Helpers
   * @summary Get the number of full years between the given dates.
   *
   * @description
   * Get the number of full years between the given dates.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} dateLeft - the later date
   * @param {Date|Number} dateRight - the earlier date
   * @returns {Number} the number of full years
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // How many full years are between 31 December 2013 and 11 February 2015?
   * const result = differenceInYears(new Date(2015, 1, 11), new Date(2013, 11, 31))
   * //=> 1
   */

  function differenceInYears(dirtyDateLeft, dirtyDateRight) {
    requiredArgs$2(2, arguments);
    var dateLeft = toDate(dirtyDateLeft);
    var dateRight = toDate(dirtyDateRight);
    var sign = compareAsc(dateLeft, dateRight);
    var difference = Math.abs(differenceInCalendarYears(dateLeft, dateRight)); // Set both dates to a valid leap year for accurate comparison when dealing
    // with leap days

    dateLeft.setFullYear(1584);
    dateRight.setFullYear(1584); // Math.abs(diff in full years - diff in calendar years) === 1 if last calendar year is not full
    // If so, result must be decreased by 1 in absolute value

    var isLastYearNotFull = compareAsc(dateLeft, dateRight) === -sign;
    var result = sign * (difference - Number(isLastYearNotFull)); // Prevent negative zero

    return result === 0 ? 0 : result;
  }

  /**
   * @name startOfYear
   * @category Year Helpers
   * @summary Return the start of a year for the given date.
   *
   * @description
   * Return the start of a year for the given date.
   * The result will be in the local timezone.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the original date
   * @returns {Date} the start of a year
   * @throws {TypeError} 1 argument required
   *
   * @example
   * // The start of a year for 2 September 2014 11:55:00:
   * const result = startOfYear(new Date(2014, 8, 2, 11, 55, 00))
   * //=> Wed Jan 01 2014 00:00:00
   */

  function startOfYear(dirtyDate) {
    requiredArgs$2(1, arguments);
    var cleanDate = toDate(dirtyDate);
    var date = new Date(0);
    date.setFullYear(cleanDate.getFullYear(), 0, 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  var formatDistanceLocale = {
    lessThanXSeconds: {
      one: 'less than a second',
      other: 'less than {{count}} seconds'
    },
    xSeconds: {
      one: '1 second',
      other: '{{count}} seconds'
    },
    halfAMinute: 'half a minute',
    lessThanXMinutes: {
      one: 'less than a minute',
      other: 'less than {{count}} minutes'
    },
    xMinutes: {
      one: '1 minute',
      other: '{{count}} minutes'
    },
    aboutXHours: {
      one: 'about 1 hour',
      other: 'about {{count}} hours'
    },
    xHours: {
      one: '1 hour',
      other: '{{count}} hours'
    },
    xDays: {
      one: '1 day',
      other: '{{count}} days'
    },
    aboutXWeeks: {
      one: 'about 1 week',
      other: 'about {{count}} weeks'
    },
    xWeeks: {
      one: '1 week',
      other: '{{count}} weeks'
    },
    aboutXMonths: {
      one: 'about 1 month',
      other: 'about {{count}} months'
    },
    xMonths: {
      one: '1 month',
      other: '{{count}} months'
    },
    aboutXYears: {
      one: 'about 1 year',
      other: 'about {{count}} years'
    },
    xYears: {
      one: '1 year',
      other: '{{count}} years'
    },
    overXYears: {
      one: 'over 1 year',
      other: 'over {{count}} years'
    },
    almostXYears: {
      one: 'almost 1 year',
      other: 'almost {{count}} years'
    }
  };

  var formatDistance = function (token, count, options) {
    var result;
    var tokenValue = formatDistanceLocale[token];

    if (typeof tokenValue === 'string') {
      result = tokenValue;
    } else if (count === 1) {
      result = tokenValue.one;
    } else {
      result = tokenValue.other.replace('{{count}}', count.toString());
    }

    if (options !== null && options !== void 0 && options.addSuffix) {
      if (options.comparison && options.comparison > 0) {
        return 'in ' + result;
      } else {
        return result + ' ago';
      }
    }

    return result;
  };

  var formatDistance$1 = formatDistance;

  function buildFormatLongFn(args) {
    return function () {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      // TODO: Remove String()
      var width = options.width ? String(options.width) : args.defaultWidth;
      var format = args.formats[width] || args.formats[args.defaultWidth];
      return format;
    };
  }

  var dateFormats = {
    full: 'EEEE, MMMM do, y',
    long: 'MMMM do, y',
    medium: 'MMM d, y',
    short: 'MM/dd/yyyy'
  };
  var timeFormats = {
    full: 'h:mm:ss a zzzz',
    long: 'h:mm:ss a z',
    medium: 'h:mm:ss a',
    short: 'h:mm a'
  };
  var dateTimeFormats = {
    full: "{{date}} 'at' {{time}}",
    long: "{{date}} 'at' {{time}}",
    medium: '{{date}}, {{time}}',
    short: '{{date}}, {{time}}'
  };
  var formatLong = {
    date: buildFormatLongFn({
      formats: dateFormats,
      defaultWidth: 'full'
    }),
    time: buildFormatLongFn({
      formats: timeFormats,
      defaultWidth: 'full'
    }),
    dateTime: buildFormatLongFn({
      formats: dateTimeFormats,
      defaultWidth: 'full'
    })
  };
  var formatLong$1 = formatLong;

  var formatRelativeLocale = {
    lastWeek: "'last' eeee 'at' p",
    yesterday: "'yesterday at' p",
    today: "'today at' p",
    tomorrow: "'tomorrow at' p",
    nextWeek: "eeee 'at' p",
    other: 'P'
  };

  var formatRelative$1 = function (token, _date, _baseDate, _options) {
    return formatRelativeLocale[token];
  };

  var formatRelative$2 = formatRelative$1;

  function buildLocalizeFn(args) {
    return function (dirtyIndex, dirtyOptions) {
      var options = dirtyOptions || {};
      var context = options.context ? String(options.context) : 'standalone';
      var valuesArray;

      if (context === 'formatting' && args.formattingValues) {
        var defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
        var width = options.width ? String(options.width) : defaultWidth;
        valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
      } else {
        var _defaultWidth = args.defaultWidth;

        var _width = options.width ? String(options.width) : args.defaultWidth;

        valuesArray = args.values[_width] || args.values[_defaultWidth];
      }

      var index = args.argumentCallback ? args.argumentCallback(dirtyIndex) : dirtyIndex; // @ts-ignore: For some reason TypeScript just don't want to match it, no matter how hard we try. I challange you to try to remove it!

      return valuesArray[index];
    };
  }

  var eraValues = {
    narrow: ['B', 'A'],
    abbreviated: ['BC', 'AD'],
    wide: ['Before Christ', 'Anno Domini']
  };
  var quarterValues = {
    narrow: ['1', '2', '3', '4'],
    abbreviated: ['Q1', 'Q2', 'Q3', 'Q4'],
    wide: ['1st quarter', '2nd quarter', '3rd quarter', '4th quarter']
  }; // Note: in English, the names of days of the week and months are capitalized.
  // If you are making a new locale based on this one, check if the same is true for the language you're working on.
  // Generally, formatted dates should look like they are in the middle of a sentence,
  // e.g. in Spanish language the weekdays and months should be in the lowercase.

  var monthValues = {
    narrow: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
    abbreviated: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    wide: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  };
  var dayValues = {
    narrow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    short: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    abbreviated: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    wide: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  };
  var dayPeriodValues = {
    narrow: {
      am: 'a',
      pm: 'p',
      midnight: 'mi',
      noon: 'n',
      morning: 'morning',
      afternoon: 'afternoon',
      evening: 'evening',
      night: 'night'
    },
    abbreviated: {
      am: 'AM',
      pm: 'PM',
      midnight: 'midnight',
      noon: 'noon',
      morning: 'morning',
      afternoon: 'afternoon',
      evening: 'evening',
      night: 'night'
    },
    wide: {
      am: 'a.m.',
      pm: 'p.m.',
      midnight: 'midnight',
      noon: 'noon',
      morning: 'morning',
      afternoon: 'afternoon',
      evening: 'evening',
      night: 'night'
    }
  };
  var formattingDayPeriodValues = {
    narrow: {
      am: 'a',
      pm: 'p',
      midnight: 'mi',
      noon: 'n',
      morning: 'in the morning',
      afternoon: 'in the afternoon',
      evening: 'in the evening',
      night: 'at night'
    },
    abbreviated: {
      am: 'AM',
      pm: 'PM',
      midnight: 'midnight',
      noon: 'noon',
      morning: 'in the morning',
      afternoon: 'in the afternoon',
      evening: 'in the evening',
      night: 'at night'
    },
    wide: {
      am: 'a.m.',
      pm: 'p.m.',
      midnight: 'midnight',
      noon: 'noon',
      morning: 'in the morning',
      afternoon: 'in the afternoon',
      evening: 'in the evening',
      night: 'at night'
    }
  };

  var ordinalNumber = function (dirtyNumber, _options) {
    var number = Number(dirtyNumber); // If ordinal numbers depend on context, for example,
    // if they are different for different grammatical genders,
    // use `options.unit`.
    //
    // `unit` can be 'year', 'quarter', 'month', 'week', 'date', 'dayOfYear',
    // 'day', 'hour', 'minute', 'second'.

    var rem100 = number % 100;

    if (rem100 > 20 || rem100 < 10) {
      switch (rem100 % 10) {
        case 1:
          return number + 'st';

        case 2:
          return number + 'nd';

        case 3:
          return number + 'rd';
      }
    }

    return number + 'th';
  };

  var localize = {
    ordinalNumber: ordinalNumber,
    era: buildLocalizeFn({
      values: eraValues,
      defaultWidth: 'wide'
    }),
    quarter: buildLocalizeFn({
      values: quarterValues,
      defaultWidth: 'wide',
      argumentCallback: function (quarter) {
        return quarter - 1;
      }
    }),
    month: buildLocalizeFn({
      values: monthValues,
      defaultWidth: 'wide'
    }),
    day: buildLocalizeFn({
      values: dayValues,
      defaultWidth: 'wide'
    }),
    dayPeriod: buildLocalizeFn({
      values: dayPeriodValues,
      defaultWidth: 'wide',
      formattingValues: formattingDayPeriodValues,
      defaultFormattingWidth: 'wide'
    })
  };
  var localize$1 = localize;

  function buildMatchFn(args) {
    return function (string) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var width = options.width;
      var matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
      var matchResult = string.match(matchPattern);

      if (!matchResult) {
        return null;
      }

      var matchedString = matchResult[0];
      var parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
      var key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, function (pattern) {
        return pattern.test(matchedString);
      }) : findKey(parsePatterns, function (pattern) {
        return pattern.test(matchedString);
      });
      var value;
      value = args.valueCallback ? args.valueCallback(key) : key;
      value = options.valueCallback ? options.valueCallback(value) : value;
      var rest = string.slice(matchedString.length);
      return {
        value: value,
        rest: rest
      };
    };
  }

  function findKey(object, predicate) {
    for (var key in object) {
      if (object.hasOwnProperty(key) && predicate(object[key])) {
        return key;
      }
    }

    return undefined;
  }

  function findIndex(array, predicate) {
    for (var key = 0; key < array.length; key++) {
      if (predicate(array[key])) {
        return key;
      }
    }

    return undefined;
  }

  function buildMatchPatternFn(args) {
    return function (string) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var matchResult = string.match(args.matchPattern);
      if (!matchResult) return null;
      var matchedString = matchResult[0];
      var parseResult = string.match(args.parsePattern);
      if (!parseResult) return null;
      var value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
      value = options.valueCallback ? options.valueCallback(value) : value;
      var rest = string.slice(matchedString.length);
      return {
        value: value,
        rest: rest
      };
    };
  }

  var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
  var parseOrdinalNumberPattern = /\d+/i;
  var matchEraPatterns = {
    narrow: /^(b|a)/i,
    abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
    wide: /^(before christ|before common era|anno domini|common era)/i
  };
  var parseEraPatterns = {
    any: [/^b/i, /^(a|c)/i]
  };
  var matchQuarterPatterns = {
    narrow: /^[1234]/i,
    abbreviated: /^q[1234]/i,
    wide: /^[1234](th|st|nd|rd)? quarter/i
  };
  var parseQuarterPatterns = {
    any: [/1/i, /2/i, /3/i, /4/i]
  };
  var matchMonthPatterns = {
    narrow: /^[jfmasond]/i,
    abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
  };
  var parseMonthPatterns = {
    narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
    any: [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
  };
  var matchDayPatterns = {
    narrow: /^[smtwf]/i,
    short: /^(su|mo|tu|we|th|fr|sa)/i,
    abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
    wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
  };
  var parseDayPatterns = {
    narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
    any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
  };
  var matchDayPeriodPatterns = {
    narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
    any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
  };
  var parseDayPeriodPatterns = {
    any: {
      am: /^a/i,
      pm: /^p/i,
      midnight: /^mi/i,
      noon: /^no/i,
      morning: /morning/i,
      afternoon: /afternoon/i,
      evening: /evening/i,
      night: /night/i
    }
  };
  var match = {
    ordinalNumber: buildMatchPatternFn({
      matchPattern: matchOrdinalNumberPattern,
      parsePattern: parseOrdinalNumberPattern,
      valueCallback: function (value) {
        return parseInt(value, 10);
      }
    }),
    era: buildMatchFn({
      matchPatterns: matchEraPatterns,
      defaultMatchWidth: 'wide',
      parsePatterns: parseEraPatterns,
      defaultParseWidth: 'any'
    }),
    quarter: buildMatchFn({
      matchPatterns: matchQuarterPatterns,
      defaultMatchWidth: 'wide',
      parsePatterns: parseQuarterPatterns,
      defaultParseWidth: 'any',
      valueCallback: function (index) {
        return index + 1;
      }
    }),
    month: buildMatchFn({
      matchPatterns: matchMonthPatterns,
      defaultMatchWidth: 'wide',
      parsePatterns: parseMonthPatterns,
      defaultParseWidth: 'any'
    }),
    day: buildMatchFn({
      matchPatterns: matchDayPatterns,
      defaultMatchWidth: 'wide',
      parsePatterns: parseDayPatterns,
      defaultParseWidth: 'any'
    }),
    dayPeriod: buildMatchFn({
      matchPatterns: matchDayPeriodPatterns,
      defaultMatchWidth: 'any',
      parsePatterns: parseDayPeriodPatterns,
      defaultParseWidth: 'any'
    })
  };
  var match$1 = match;

  /**
   * @type {Locale}
   * @category Locales
   * @summary English locale (United States).
   * @language English
   * @iso-639-2 eng
   * @author Sasha Koss [@kossnocorp]{@link https://github.com/kossnocorp}
   * @author Lesha Koss [@leshakoss]{@link https://github.com/leshakoss}
   */
  var locale = {
    code: 'en-US',
    formatDistance: formatDistance$1,
    formatLong: formatLong$1,
    formatRelative: formatRelative$2,
    localize: localize$1,
    match: match$1,
    options: {
      weekStartsOn: 0
      /* Sunday */
      ,
      firstWeekContainsDate: 1
    }
  };
  var defaultLocale = locale;

  /**
   * @name subMilliseconds
   * @category Millisecond Helpers
   * @summary Subtract the specified number of milliseconds from the given date.
   *
   * @description
   * Subtract the specified number of milliseconds from the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} amount - the amount of milliseconds to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {Date} the new date with the milliseconds subtracted
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Subtract 750 milliseconds from 10 July 2014 12:45:30.000:
   * const result = subMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
   * //=> Thu Jul 10 2014 12:45:29.250
   */

  function subMilliseconds$1(dirtyDate, dirtyAmount) {
    requiredArgs$2(2, arguments);
    var amount = toInteger$2(dirtyAmount);
    return addMilliseconds$1(dirtyDate, -amount);
  }

  function addLeadingZeros(number, targetLength) {
    var sign = number < 0 ? '-' : '';
    var output = Math.abs(number).toString();

    while (output.length < targetLength) {
      output = '0' + output;
    }

    return sign + output;
  }

  /*
   * |     | Unit                           |     | Unit                           |
   * |-----|--------------------------------|-----|--------------------------------|
   * |  a  | AM, PM                         |  A* |                                |
   * |  d  | Day of month                   |  D  |                                |
   * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
   * |  m  | Minute                         |  M  | Month                          |
   * |  s  | Second                         |  S  | Fraction of second             |
   * |  y  | Year (abs)                     |  Y  |                                |
   *
   * Letters marked by * are not implemented but reserved by Unicode standard.
   */

  var formatters$2 = {
    // Year
    y: function (date, token) {
      // From http://www.unicode.org/reports/tr35/tr35-31/tr35-dates.html#Date_Format_tokens
      // | Year     |     y | yy |   yyy |  yyyy | yyyyy |
      // |----------|-------|----|-------|-------|-------|
      // | AD 1     |     1 | 01 |   001 |  0001 | 00001 |
      // | AD 12    |    12 | 12 |   012 |  0012 | 00012 |
      // | AD 123   |   123 | 23 |   123 |  0123 | 00123 |
      // | AD 1234  |  1234 | 34 |  1234 |  1234 | 01234 |
      // | AD 12345 | 12345 | 45 | 12345 | 12345 | 12345 |
      var signedYear = date.getUTCFullYear(); // Returns 1 for 1 BC (which is year 0 in JavaScript)

      var year = signedYear > 0 ? signedYear : 1 - signedYear;
      return addLeadingZeros(token === 'yy' ? year % 100 : year, token.length);
    },
    // Month
    M: function (date, token) {
      var month = date.getUTCMonth();
      return token === 'M' ? String(month + 1) : addLeadingZeros(month + 1, 2);
    },
    // Day of the month
    d: function (date, token) {
      return addLeadingZeros(date.getUTCDate(), token.length);
    },
    // AM or PM
    a: function (date, token) {
      var dayPeriodEnumValue = date.getUTCHours() / 12 >= 1 ? 'pm' : 'am';

      switch (token) {
        case 'a':
        case 'aa':
          return dayPeriodEnumValue.toUpperCase();

        case 'aaa':
          return dayPeriodEnumValue;

        case 'aaaaa':
          return dayPeriodEnumValue[0];

        case 'aaaa':
        default:
          return dayPeriodEnumValue === 'am' ? 'a.m.' : 'p.m.';
      }
    },
    // Hour [1-12]
    h: function (date, token) {
      return addLeadingZeros(date.getUTCHours() % 12 || 12, token.length);
    },
    // Hour [0-23]
    H: function (date, token) {
      return addLeadingZeros(date.getUTCHours(), token.length);
    },
    // Minute
    m: function (date, token) {
      return addLeadingZeros(date.getUTCMinutes(), token.length);
    },
    // Second
    s: function (date, token) {
      return addLeadingZeros(date.getUTCSeconds(), token.length);
    },
    // Fraction of second
    S: function (date, token) {
      var numberOfDigits = token.length;
      var milliseconds = date.getUTCMilliseconds();
      var fractionalSeconds = Math.floor(milliseconds * Math.pow(10, numberOfDigits - 3));
      return addLeadingZeros(fractionalSeconds, token.length);
    }
  };
  var formatters$3 = formatters$2;

  var MILLISECONDS_IN_DAY = 86400000; // This function will be a part of public API when UTC function will be implemented.
  // See issue: https://github.com/date-fns/date-fns/issues/376

  function getUTCDayOfYear(dirtyDate) {
    requiredArgs$2(1, arguments);
    var date = toDate(dirtyDate);
    var timestamp = date.getTime();
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
    var startOfYearTimestamp = date.getTime();
    var difference = timestamp - startOfYearTimestamp;
    return Math.floor(difference / MILLISECONDS_IN_DAY) + 1;
  }

  // See issue: https://github.com/date-fns/date-fns/issues/376

  function startOfUTCISOWeek(dirtyDate) {
    requiredArgs$2(1, arguments);
    var weekStartsOn = 1;
    var date = toDate(dirtyDate);
    var day = date.getUTCDay();
    var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    date.setUTCDate(date.getUTCDate() - diff);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  // See issue: https://github.com/date-fns/date-fns/issues/376

  function getUTCISOWeekYear(dirtyDate) {
    requiredArgs$2(1, arguments);
    var date = toDate(dirtyDate);
    var year = date.getUTCFullYear();
    var fourthOfJanuaryOfNextYear = new Date(0);
    fourthOfJanuaryOfNextYear.setUTCFullYear(year + 1, 0, 4);
    fourthOfJanuaryOfNextYear.setUTCHours(0, 0, 0, 0);
    var startOfNextYear = startOfUTCISOWeek(fourthOfJanuaryOfNextYear);
    var fourthOfJanuaryOfThisYear = new Date(0);
    fourthOfJanuaryOfThisYear.setUTCFullYear(year, 0, 4);
    fourthOfJanuaryOfThisYear.setUTCHours(0, 0, 0, 0);
    var startOfThisYear = startOfUTCISOWeek(fourthOfJanuaryOfThisYear);

    if (date.getTime() >= startOfNextYear.getTime()) {
      return year + 1;
    } else if (date.getTime() >= startOfThisYear.getTime()) {
      return year;
    } else {
      return year - 1;
    }
  }

  // See issue: https://github.com/date-fns/date-fns/issues/376

  function startOfUTCISOWeekYear(dirtyDate) {
    requiredArgs$2(1, arguments);
    var year = getUTCISOWeekYear(dirtyDate);
    var fourthOfJanuary = new Date(0);
    fourthOfJanuary.setUTCFullYear(year, 0, 4);
    fourthOfJanuary.setUTCHours(0, 0, 0, 0);
    var date = startOfUTCISOWeek(fourthOfJanuary);
    return date;
  }

  var MILLISECONDS_IN_WEEK$1 = 604800000; // This function will be a part of public API when UTC function will be implemented.
  // See issue: https://github.com/date-fns/date-fns/issues/376

  function getUTCISOWeek(dirtyDate) {
    requiredArgs$2(1, arguments);
    var date = toDate(dirtyDate);
    var diff = startOfUTCISOWeek(date).getTime() - startOfUTCISOWeekYear(date).getTime(); // Round the number of days to the nearest integer
    // because the number of milliseconds in a week is not constant
    // (e.g. it's different in the week of the daylight saving time clock shift)

    return Math.round(diff / MILLISECONDS_IN_WEEK$1) + 1;
  }

  // See issue: https://github.com/date-fns/date-fns/issues/376

  function startOfUTCWeek(dirtyDate, dirtyOptions) {
    requiredArgs$2(1, arguments);
    var options = dirtyOptions || {};
    var locale = options.locale;
    var localeWeekStartsOn = locale && locale.options && locale.options.weekStartsOn;
    var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger$2(localeWeekStartsOn);
    var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger$2(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

    if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
      throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
    }

    var date = toDate(dirtyDate);
    var day = date.getUTCDay();
    var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    date.setUTCDate(date.getUTCDate() - diff);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  // See issue: https://github.com/date-fns/date-fns/issues/376

  function getUTCWeekYear(dirtyDate, dirtyOptions) {
    requiredArgs$2(1, arguments);
    var date = toDate(dirtyDate, dirtyOptions);
    var year = date.getUTCFullYear();
    var options = dirtyOptions || {};
    var locale = options.locale;
    var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
    var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger$2(localeFirstWeekContainsDate);
    var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger$2(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

    if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
      throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
    }

    var firstWeekOfNextYear = new Date(0);
    firstWeekOfNextYear.setUTCFullYear(year + 1, 0, firstWeekContainsDate);
    firstWeekOfNextYear.setUTCHours(0, 0, 0, 0);
    var startOfNextYear = startOfUTCWeek(firstWeekOfNextYear, dirtyOptions);
    var firstWeekOfThisYear = new Date(0);
    firstWeekOfThisYear.setUTCFullYear(year, 0, firstWeekContainsDate);
    firstWeekOfThisYear.setUTCHours(0, 0, 0, 0);
    var startOfThisYear = startOfUTCWeek(firstWeekOfThisYear, dirtyOptions);

    if (date.getTime() >= startOfNextYear.getTime()) {
      return year + 1;
    } else if (date.getTime() >= startOfThisYear.getTime()) {
      return year;
    } else {
      return year - 1;
    }
  }

  // See issue: https://github.com/date-fns/date-fns/issues/376

  function startOfUTCWeekYear(dirtyDate, dirtyOptions) {
    requiredArgs$2(1, arguments);
    var options = dirtyOptions || {};
    var locale = options.locale;
    var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
    var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger$2(localeFirstWeekContainsDate);
    var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger$2(options.firstWeekContainsDate);
    var year = getUTCWeekYear(dirtyDate, dirtyOptions);
    var firstWeek = new Date(0);
    firstWeek.setUTCFullYear(year, 0, firstWeekContainsDate);
    firstWeek.setUTCHours(0, 0, 0, 0);
    var date = startOfUTCWeek(firstWeek, dirtyOptions);
    return date;
  }

  var MILLISECONDS_IN_WEEK = 604800000; // This function will be a part of public API when UTC function will be implemented.
  // See issue: https://github.com/date-fns/date-fns/issues/376

  function getUTCWeek(dirtyDate, options) {
    requiredArgs$2(1, arguments);
    var date = toDate(dirtyDate);
    var diff = startOfUTCWeek(date, options).getTime() - startOfUTCWeekYear(date, options).getTime(); // Round the number of days to the nearest integer
    // because the number of milliseconds in a week is not constant
    // (e.g. it's different in the week of the daylight saving time clock shift)

    return Math.round(diff / MILLISECONDS_IN_WEEK) + 1;
  }

  var dayPeriodEnum = {
    am: 'am',
    pm: 'pm',
    midnight: 'midnight',
    noon: 'noon',
    morning: 'morning',
    afternoon: 'afternoon',
    evening: 'evening',
    night: 'night'
  };
  /*
   * |     | Unit                           |     | Unit                           |
   * |-----|--------------------------------|-----|--------------------------------|
   * |  a  | AM, PM                         |  A* | Milliseconds in day            |
   * |  b  | AM, PM, noon, midnight         |  B  | Flexible day period            |
   * |  c  | Stand-alone local day of week  |  C* | Localized hour w/ day period   |
   * |  d  | Day of month                   |  D  | Day of year                    |
   * |  e  | Local day of week              |  E  | Day of week                    |
   * |  f  |                                |  F* | Day of week in month           |
   * |  g* | Modified Julian day            |  G  | Era                            |
   * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
   * |  i! | ISO day of week                |  I! | ISO week of year               |
   * |  j* | Localized hour w/ day period   |  J* | Localized hour w/o day period  |
   * |  k  | Hour [1-24]                    |  K  | Hour [0-11]                    |
   * |  l* | (deprecated)                   |  L  | Stand-alone month              |
   * |  m  | Minute                         |  M  | Month                          |
   * |  n  |                                |  N  |                                |
   * |  o! | Ordinal number modifier        |  O  | Timezone (GMT)                 |
   * |  p! | Long localized time            |  P! | Long localized date            |
   * |  q  | Stand-alone quarter            |  Q  | Quarter                        |
   * |  r* | Related Gregorian year         |  R! | ISO week-numbering year        |
   * |  s  | Second                         |  S  | Fraction of second             |
   * |  t! | Seconds timestamp              |  T! | Milliseconds timestamp         |
   * |  u  | Extended year                  |  U* | Cyclic year                    |
   * |  v* | Timezone (generic non-locat.)  |  V* | Timezone (location)            |
   * |  w  | Local week of year             |  W* | Week of month                  |
   * |  x  | Timezone (ISO-8601 w/o Z)      |  X  | Timezone (ISO-8601)            |
   * |  y  | Year (abs)                     |  Y  | Local week-numbering year      |
   * |  z  | Timezone (specific non-locat.) |  Z* | Timezone (aliases)             |
   *
   * Letters marked by * are not implemented but reserved by Unicode standard.
   *
   * Letters marked by ! are non-standard, but implemented by date-fns:
   * - `o` modifies the previous token to turn it into an ordinal (see `format` docs)
   * - `i` is ISO day of week. For `i` and `ii` is returns numeric ISO week days,
   *   i.e. 7 for Sunday, 1 for Monday, etc.
   * - `I` is ISO week of year, as opposed to `w` which is local week of year.
   * - `R` is ISO week-numbering year, as opposed to `Y` which is local week-numbering year.
   *   `R` is supposed to be used in conjunction with `I` and `i`
   *   for universal ISO week-numbering date, whereas
   *   `Y` is supposed to be used in conjunction with `w` and `e`
   *   for week-numbering date specific to the locale.
   * - `P` is long localized date format
   * - `p` is long localized time format
   */

  var formatters = {
    // Era
    G: function (date, token, localize) {
      var era = date.getUTCFullYear() > 0 ? 1 : 0;

      switch (token) {
        // AD, BC
        case 'G':
        case 'GG':
        case 'GGG':
          return localize.era(era, {
            width: 'abbreviated'
          });
        // A, B

        case 'GGGGG':
          return localize.era(era, {
            width: 'narrow'
          });
        // Anno Domini, Before Christ

        case 'GGGG':
        default:
          return localize.era(era, {
            width: 'wide'
          });
      }
    },
    // Year
    y: function (date, token, localize) {
      // Ordinal number
      if (token === 'yo') {
        var signedYear = date.getUTCFullYear(); // Returns 1 for 1 BC (which is year 0 in JavaScript)

        var year = signedYear > 0 ? signedYear : 1 - signedYear;
        return localize.ordinalNumber(year, {
          unit: 'year'
        });
      }

      return formatters$3.y(date, token);
    },
    // Local week-numbering year
    Y: function (date, token, localize, options) {
      var signedWeekYear = getUTCWeekYear(date, options); // Returns 1 for 1 BC (which is year 0 in JavaScript)

      var weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear; // Two digit year

      if (token === 'YY') {
        var twoDigitYear = weekYear % 100;
        return addLeadingZeros(twoDigitYear, 2);
      } // Ordinal number


      if (token === 'Yo') {
        return localize.ordinalNumber(weekYear, {
          unit: 'year'
        });
      } // Padding


      return addLeadingZeros(weekYear, token.length);
    },
    // ISO week-numbering year
    R: function (date, token) {
      var isoWeekYear = getUTCISOWeekYear(date); // Padding

      return addLeadingZeros(isoWeekYear, token.length);
    },
    // Extended year. This is a single number designating the year of this calendar system.
    // The main difference between `y` and `u` localizers are B.C. years:
    // | Year | `y` | `u` |
    // |------|-----|-----|
    // | AC 1 |   1 |   1 |
    // | BC 1 |   1 |   0 |
    // | BC 2 |   2 |  -1 |
    // Also `yy` always returns the last two digits of a year,
    // while `uu` pads single digit years to 2 characters and returns other years unchanged.
    u: function (date, token) {
      var year = date.getUTCFullYear();
      return addLeadingZeros(year, token.length);
    },
    // Quarter
    Q: function (date, token, localize) {
      var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);

      switch (token) {
        // 1, 2, 3, 4
        case 'Q':
          return String(quarter);
        // 01, 02, 03, 04

        case 'QQ':
          return addLeadingZeros(quarter, 2);
        // 1st, 2nd, 3rd, 4th

        case 'Qo':
          return localize.ordinalNumber(quarter, {
            unit: 'quarter'
          });
        // Q1, Q2, Q3, Q4

        case 'QQQ':
          return localize.quarter(quarter, {
            width: 'abbreviated',
            context: 'formatting'
          });
        // 1, 2, 3, 4 (narrow quarter; could be not numerical)

        case 'QQQQQ':
          return localize.quarter(quarter, {
            width: 'narrow',
            context: 'formatting'
          });
        // 1st quarter, 2nd quarter, ...

        case 'QQQQ':
        default:
          return localize.quarter(quarter, {
            width: 'wide',
            context: 'formatting'
          });
      }
    },
    // Stand-alone quarter
    q: function (date, token, localize) {
      var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);

      switch (token) {
        // 1, 2, 3, 4
        case 'q':
          return String(quarter);
        // 01, 02, 03, 04

        case 'qq':
          return addLeadingZeros(quarter, 2);
        // 1st, 2nd, 3rd, 4th

        case 'qo':
          return localize.ordinalNumber(quarter, {
            unit: 'quarter'
          });
        // Q1, Q2, Q3, Q4

        case 'qqq':
          return localize.quarter(quarter, {
            width: 'abbreviated',
            context: 'standalone'
          });
        // 1, 2, 3, 4 (narrow quarter; could be not numerical)

        case 'qqqqq':
          return localize.quarter(quarter, {
            width: 'narrow',
            context: 'standalone'
          });
        // 1st quarter, 2nd quarter, ...

        case 'qqqq':
        default:
          return localize.quarter(quarter, {
            width: 'wide',
            context: 'standalone'
          });
      }
    },
    // Month
    M: function (date, token, localize) {
      var month = date.getUTCMonth();

      switch (token) {
        case 'M':
        case 'MM':
          return formatters$3.M(date, token);
        // 1st, 2nd, ..., 12th

        case 'Mo':
          return localize.ordinalNumber(month + 1, {
            unit: 'month'
          });
        // Jan, Feb, ..., Dec

        case 'MMM':
          return localize.month(month, {
            width: 'abbreviated',
            context: 'formatting'
          });
        // J, F, ..., D

        case 'MMMMM':
          return localize.month(month, {
            width: 'narrow',
            context: 'formatting'
          });
        // January, February, ..., December

        case 'MMMM':
        default:
          return localize.month(month, {
            width: 'wide',
            context: 'formatting'
          });
      }
    },
    // Stand-alone month
    L: function (date, token, localize) {
      var month = date.getUTCMonth();

      switch (token) {
        // 1, 2, ..., 12
        case 'L':
          return String(month + 1);
        // 01, 02, ..., 12

        case 'LL':
          return addLeadingZeros(month + 1, 2);
        // 1st, 2nd, ..., 12th

        case 'Lo':
          return localize.ordinalNumber(month + 1, {
            unit: 'month'
          });
        // Jan, Feb, ..., Dec

        case 'LLL':
          return localize.month(month, {
            width: 'abbreviated',
            context: 'standalone'
          });
        // J, F, ..., D

        case 'LLLLL':
          return localize.month(month, {
            width: 'narrow',
            context: 'standalone'
          });
        // January, February, ..., December

        case 'LLLL':
        default:
          return localize.month(month, {
            width: 'wide',
            context: 'standalone'
          });
      }
    },
    // Local week of year
    w: function (date, token, localize, options) {
      var week = getUTCWeek(date, options);

      if (token === 'wo') {
        return localize.ordinalNumber(week, {
          unit: 'week'
        });
      }

      return addLeadingZeros(week, token.length);
    },
    // ISO week of year
    I: function (date, token, localize) {
      var isoWeek = getUTCISOWeek(date);

      if (token === 'Io') {
        return localize.ordinalNumber(isoWeek, {
          unit: 'week'
        });
      }

      return addLeadingZeros(isoWeek, token.length);
    },
    // Day of the month
    d: function (date, token, localize) {
      if (token === 'do') {
        return localize.ordinalNumber(date.getUTCDate(), {
          unit: 'date'
        });
      }

      return formatters$3.d(date, token);
    },
    // Day of year
    D: function (date, token, localize) {
      var dayOfYear = getUTCDayOfYear(date);

      if (token === 'Do') {
        return localize.ordinalNumber(dayOfYear, {
          unit: 'dayOfYear'
        });
      }

      return addLeadingZeros(dayOfYear, token.length);
    },
    // Day of week
    E: function (date, token, localize) {
      var dayOfWeek = date.getUTCDay();

      switch (token) {
        // Tue
        case 'E':
        case 'EE':
        case 'EEE':
          return localize.day(dayOfWeek, {
            width: 'abbreviated',
            context: 'formatting'
          });
        // T

        case 'EEEEE':
          return localize.day(dayOfWeek, {
            width: 'narrow',
            context: 'formatting'
          });
        // Tu

        case 'EEEEEE':
          return localize.day(dayOfWeek, {
            width: 'short',
            context: 'formatting'
          });
        // Tuesday

        case 'EEEE':
        default:
          return localize.day(dayOfWeek, {
            width: 'wide',
            context: 'formatting'
          });
      }
    },
    // Local day of week
    e: function (date, token, localize, options) {
      var dayOfWeek = date.getUTCDay();
      var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;

      switch (token) {
        // Numerical value (Nth day of week with current locale or weekStartsOn)
        case 'e':
          return String(localDayOfWeek);
        // Padded numerical value

        case 'ee':
          return addLeadingZeros(localDayOfWeek, 2);
        // 1st, 2nd, ..., 7th

        case 'eo':
          return localize.ordinalNumber(localDayOfWeek, {
            unit: 'day'
          });

        case 'eee':
          return localize.day(dayOfWeek, {
            width: 'abbreviated',
            context: 'formatting'
          });
        // T

        case 'eeeee':
          return localize.day(dayOfWeek, {
            width: 'narrow',
            context: 'formatting'
          });
        // Tu

        case 'eeeeee':
          return localize.day(dayOfWeek, {
            width: 'short',
            context: 'formatting'
          });
        // Tuesday

        case 'eeee':
        default:
          return localize.day(dayOfWeek, {
            width: 'wide',
            context: 'formatting'
          });
      }
    },
    // Stand-alone local day of week
    c: function (date, token, localize, options) {
      var dayOfWeek = date.getUTCDay();
      var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;

      switch (token) {
        // Numerical value (same as in `e`)
        case 'c':
          return String(localDayOfWeek);
        // Padded numerical value

        case 'cc':
          return addLeadingZeros(localDayOfWeek, token.length);
        // 1st, 2nd, ..., 7th

        case 'co':
          return localize.ordinalNumber(localDayOfWeek, {
            unit: 'day'
          });

        case 'ccc':
          return localize.day(dayOfWeek, {
            width: 'abbreviated',
            context: 'standalone'
          });
        // T

        case 'ccccc':
          return localize.day(dayOfWeek, {
            width: 'narrow',
            context: 'standalone'
          });
        // Tu

        case 'cccccc':
          return localize.day(dayOfWeek, {
            width: 'short',
            context: 'standalone'
          });
        // Tuesday

        case 'cccc':
        default:
          return localize.day(dayOfWeek, {
            width: 'wide',
            context: 'standalone'
          });
      }
    },
    // ISO day of week
    i: function (date, token, localize) {
      var dayOfWeek = date.getUTCDay();
      var isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

      switch (token) {
        // 2
        case 'i':
          return String(isoDayOfWeek);
        // 02

        case 'ii':
          return addLeadingZeros(isoDayOfWeek, token.length);
        // 2nd

        case 'io':
          return localize.ordinalNumber(isoDayOfWeek, {
            unit: 'day'
          });
        // Tue

        case 'iii':
          return localize.day(dayOfWeek, {
            width: 'abbreviated',
            context: 'formatting'
          });
        // T

        case 'iiiii':
          return localize.day(dayOfWeek, {
            width: 'narrow',
            context: 'formatting'
          });
        // Tu

        case 'iiiiii':
          return localize.day(dayOfWeek, {
            width: 'short',
            context: 'formatting'
          });
        // Tuesday

        case 'iiii':
        default:
          return localize.day(dayOfWeek, {
            width: 'wide',
            context: 'formatting'
          });
      }
    },
    // AM or PM
    a: function (date, token, localize) {
      var hours = date.getUTCHours();
      var dayPeriodEnumValue = hours / 12 >= 1 ? 'pm' : 'am';

      switch (token) {
        case 'a':
        case 'aa':
          return localize.dayPeriod(dayPeriodEnumValue, {
            width: 'abbreviated',
            context: 'formatting'
          });

        case 'aaa':
          return localize.dayPeriod(dayPeriodEnumValue, {
            width: 'abbreviated',
            context: 'formatting'
          }).toLowerCase();

        case 'aaaaa':
          return localize.dayPeriod(dayPeriodEnumValue, {
            width: 'narrow',
            context: 'formatting'
          });

        case 'aaaa':
        default:
          return localize.dayPeriod(dayPeriodEnumValue, {
            width: 'wide',
            context: 'formatting'
          });
      }
    },
    // AM, PM, midnight, noon
    b: function (date, token, localize) {
      var hours = date.getUTCHours();
      var dayPeriodEnumValue;

      if (hours === 12) {
        dayPeriodEnumValue = dayPeriodEnum.noon;
      } else if (hours === 0) {
        dayPeriodEnumValue = dayPeriodEnum.midnight;
      } else {
        dayPeriodEnumValue = hours / 12 >= 1 ? 'pm' : 'am';
      }

      switch (token) {
        case 'b':
        case 'bb':
          return localize.dayPeriod(dayPeriodEnumValue, {
            width: 'abbreviated',
            context: 'formatting'
          });

        case 'bbb':
          return localize.dayPeriod(dayPeriodEnumValue, {
            width: 'abbreviated',
            context: 'formatting'
          }).toLowerCase();

        case 'bbbbb':
          return localize.dayPeriod(dayPeriodEnumValue, {
            width: 'narrow',
            context: 'formatting'
          });

        case 'bbbb':
        default:
          return localize.dayPeriod(dayPeriodEnumValue, {
            width: 'wide',
            context: 'formatting'
          });
      }
    },
    // in the morning, in the afternoon, in the evening, at night
    B: function (date, token, localize) {
      var hours = date.getUTCHours();
      var dayPeriodEnumValue;

      if (hours >= 17) {
        dayPeriodEnumValue = dayPeriodEnum.evening;
      } else if (hours >= 12) {
        dayPeriodEnumValue = dayPeriodEnum.afternoon;
      } else if (hours >= 4) {
        dayPeriodEnumValue = dayPeriodEnum.morning;
      } else {
        dayPeriodEnumValue = dayPeriodEnum.night;
      }

      switch (token) {
        case 'B':
        case 'BB':
        case 'BBB':
          return localize.dayPeriod(dayPeriodEnumValue, {
            width: 'abbreviated',
            context: 'formatting'
          });

        case 'BBBBB':
          return localize.dayPeriod(dayPeriodEnumValue, {
            width: 'narrow',
            context: 'formatting'
          });

        case 'BBBB':
        default:
          return localize.dayPeriod(dayPeriodEnumValue, {
            width: 'wide',
            context: 'formatting'
          });
      }
    },
    // Hour [1-12]
    h: function (date, token, localize) {
      if (token === 'ho') {
        var hours = date.getUTCHours() % 12;
        if (hours === 0) hours = 12;
        return localize.ordinalNumber(hours, {
          unit: 'hour'
        });
      }

      return formatters$3.h(date, token);
    },
    // Hour [0-23]
    H: function (date, token, localize) {
      if (token === 'Ho') {
        return localize.ordinalNumber(date.getUTCHours(), {
          unit: 'hour'
        });
      }

      return formatters$3.H(date, token);
    },
    // Hour [0-11]
    K: function (date, token, localize) {
      var hours = date.getUTCHours() % 12;

      if (token === 'Ko') {
        return localize.ordinalNumber(hours, {
          unit: 'hour'
        });
      }

      return addLeadingZeros(hours, token.length);
    },
    // Hour [1-24]
    k: function (date, token, localize) {
      var hours = date.getUTCHours();
      if (hours === 0) hours = 24;

      if (token === 'ko') {
        return localize.ordinalNumber(hours, {
          unit: 'hour'
        });
      }

      return addLeadingZeros(hours, token.length);
    },
    // Minute
    m: function (date, token, localize) {
      if (token === 'mo') {
        return localize.ordinalNumber(date.getUTCMinutes(), {
          unit: 'minute'
        });
      }

      return formatters$3.m(date, token);
    },
    // Second
    s: function (date, token, localize) {
      if (token === 'so') {
        return localize.ordinalNumber(date.getUTCSeconds(), {
          unit: 'second'
        });
      }

      return formatters$3.s(date, token);
    },
    // Fraction of second
    S: function (date, token) {
      return formatters$3.S(date, token);
    },
    // Timezone (ISO-8601. If offset is 0, output is always `'Z'`)
    X: function (date, token, _localize, options) {
      var originalDate = options._originalDate || date;
      var timezoneOffset = originalDate.getTimezoneOffset();

      if (timezoneOffset === 0) {
        return 'Z';
      }

      switch (token) {
        // Hours and optional minutes
        case 'X':
          return formatTimezoneWithOptionalMinutes(timezoneOffset);
        // Hours, minutes and optional seconds without `:` delimiter
        // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
        // so this token always has the same output as `XX`

        case 'XXXX':
        case 'XX':
          // Hours and minutes without `:` delimiter
          return formatTimezone(timezoneOffset);
        // Hours, minutes and optional seconds with `:` delimiter
        // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
        // so this token always has the same output as `XXX`

        case 'XXXXX':
        case 'XXX': // Hours and minutes with `:` delimiter

        default:
          return formatTimezone(timezoneOffset, ':');
      }
    },
    // Timezone (ISO-8601. If offset is 0, output is `'+00:00'` or equivalent)
    x: function (date, token, _localize, options) {
      var originalDate = options._originalDate || date;
      var timezoneOffset = originalDate.getTimezoneOffset();

      switch (token) {
        // Hours and optional minutes
        case 'x':
          return formatTimezoneWithOptionalMinutes(timezoneOffset);
        // Hours, minutes and optional seconds without `:` delimiter
        // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
        // so this token always has the same output as `xx`

        case 'xxxx':
        case 'xx':
          // Hours and minutes without `:` delimiter
          return formatTimezone(timezoneOffset);
        // Hours, minutes and optional seconds with `:` delimiter
        // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
        // so this token always has the same output as `xxx`

        case 'xxxxx':
        case 'xxx': // Hours and minutes with `:` delimiter

        default:
          return formatTimezone(timezoneOffset, ':');
      }
    },
    // Timezone (GMT)
    O: function (date, token, _localize, options) {
      var originalDate = options._originalDate || date;
      var timezoneOffset = originalDate.getTimezoneOffset();

      switch (token) {
        // Short
        case 'O':
        case 'OO':
        case 'OOO':
          return 'GMT' + formatTimezoneShort(timezoneOffset, ':');
        // Long

        case 'OOOO':
        default:
          return 'GMT' + formatTimezone(timezoneOffset, ':');
      }
    },
    // Timezone (specific non-location)
    z: function (date, token, _localize, options) {
      var originalDate = options._originalDate || date;
      var timezoneOffset = originalDate.getTimezoneOffset();

      switch (token) {
        // Short
        case 'z':
        case 'zz':
        case 'zzz':
          return 'GMT' + formatTimezoneShort(timezoneOffset, ':');
        // Long

        case 'zzzz':
        default:
          return 'GMT' + formatTimezone(timezoneOffset, ':');
      }
    },
    // Seconds timestamp
    t: function (date, token, _localize, options) {
      var originalDate = options._originalDate || date;
      var timestamp = Math.floor(originalDate.getTime() / 1000);
      return addLeadingZeros(timestamp, token.length);
    },
    // Milliseconds timestamp
    T: function (date, token, _localize, options) {
      var originalDate = options._originalDate || date;
      var timestamp = originalDate.getTime();
      return addLeadingZeros(timestamp, token.length);
    }
  };

  function formatTimezoneShort(offset, dirtyDelimiter) {
    var sign = offset > 0 ? '-' : '+';
    var absOffset = Math.abs(offset);
    var hours = Math.floor(absOffset / 60);
    var minutes = absOffset % 60;

    if (minutes === 0) {
      return sign + String(hours);
    }

    var delimiter = dirtyDelimiter || '';
    return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
  }

  function formatTimezoneWithOptionalMinutes(offset, dirtyDelimiter) {
    if (offset % 60 === 0) {
      var sign = offset > 0 ? '-' : '+';
      return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
    }

    return formatTimezone(offset, dirtyDelimiter);
  }

  function formatTimezone(offset, dirtyDelimiter) {
    var delimiter = dirtyDelimiter || '';
    var sign = offset > 0 ? '-' : '+';
    var absOffset = Math.abs(offset);
    var hours = addLeadingZeros(Math.floor(absOffset / 60), 2);
    var minutes = addLeadingZeros(absOffset % 60, 2);
    return sign + hours + delimiter + minutes;
  }

  var formatters$1 = formatters;

  function dateLongFormatter(pattern, formatLong) {
    switch (pattern) {
      case 'P':
        return formatLong.date({
          width: 'short'
        });

      case 'PP':
        return formatLong.date({
          width: 'medium'
        });

      case 'PPP':
        return formatLong.date({
          width: 'long'
        });

      case 'PPPP':
      default:
        return formatLong.date({
          width: 'full'
        });
    }
  }

  function timeLongFormatter(pattern, formatLong) {
    switch (pattern) {
      case 'p':
        return formatLong.time({
          width: 'short'
        });

      case 'pp':
        return formatLong.time({
          width: 'medium'
        });

      case 'ppp':
        return formatLong.time({
          width: 'long'
        });

      case 'pppp':
      default:
        return formatLong.time({
          width: 'full'
        });
    }
  }

  function dateTimeLongFormatter(pattern, formatLong) {
    var matchResult = pattern.match(/(P+)(p+)?/);
    var datePattern = matchResult[1];
    var timePattern = matchResult[2];

    if (!timePattern) {
      return dateLongFormatter(pattern, formatLong);
    }

    var dateTimeFormat;

    switch (datePattern) {
      case 'P':
        dateTimeFormat = formatLong.dateTime({
          width: 'short'
        });
        break;

      case 'PP':
        dateTimeFormat = formatLong.dateTime({
          width: 'medium'
        });
        break;

      case 'PPP':
        dateTimeFormat = formatLong.dateTime({
          width: 'long'
        });
        break;

      case 'PPPP':
      default:
        dateTimeFormat = formatLong.dateTime({
          width: 'full'
        });
        break;
    }

    return dateTimeFormat.replace('{{date}}', dateLongFormatter(datePattern, formatLong)).replace('{{time}}', timeLongFormatter(timePattern, formatLong));
  }

  var longFormatters = {
    p: timeLongFormatter,
    P: dateTimeLongFormatter
  };
  var longFormatters$1 = longFormatters;

  var protectedDayOfYearTokens = ['D', 'DD'];
  var protectedWeekYearTokens = ['YY', 'YYYY'];
  function isProtectedDayOfYearToken(token) {
    return protectedDayOfYearTokens.indexOf(token) !== -1;
  }
  function isProtectedWeekYearToken(token) {
    return protectedWeekYearTokens.indexOf(token) !== -1;
  }
  function throwProtectedError(token, format, input) {
    if (token === 'YYYY') {
      throw new RangeError("Use `yyyy` instead of `YYYY` (in `".concat(format, "`) for formatting years to the input `").concat(input, "`; see: https://git.io/fxCyr"));
    } else if (token === 'YY') {
      throw new RangeError("Use `yy` instead of `YY` (in `".concat(format, "`) for formatting years to the input `").concat(input, "`; see: https://git.io/fxCyr"));
    } else if (token === 'D') {
      throw new RangeError("Use `d` instead of `D` (in `".concat(format, "`) for formatting days of the month to the input `").concat(input, "`; see: https://git.io/fxCyr"));
    } else if (token === 'DD') {
      throw new RangeError("Use `dd` instead of `DD` (in `".concat(format, "`) for formatting days of the month to the input `").concat(input, "`; see: https://git.io/fxCyr"));
    }
  }

  // - [yYQqMLwIdDecihHKkms]o matches any available ordinal number token
  //   (one of the certain letters followed by `o`)
  // - (\w)\1* matches any sequences of the same letter
  // - '' matches two quote characters in a row
  // - '(''|[^'])+('|$) matches anything surrounded by two quote characters ('),
  //   except a single quote symbol, which ends the sequence.
  //   Two quote characters do not end the sequence.
  //   If there is no matching single quote
  //   then the sequence will continue until the end of the string.
  // - . matches any single character unmatched by previous parts of the RegExps

  var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g; // This RegExp catches symbols escaped by quotes, and also
  // sequences of symbols P, p, and the combinations like `PPPPPPPppppp`

  var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
  var escapedStringRegExp = /^'([^]*?)'?$/;
  var doubleQuoteRegExp = /''/g;
  var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
  /**
   * @name format
   * @category Common Helpers
   * @summary Format the date.
   *
   * @description
   * Return the formatted date string in the given format. The result may vary by locale.
   *
   * > ⚠️ Please note that the `format` tokens differ from Moment.js and other libraries.
   * > See: https://git.io/fxCyr
   *
   * The characters wrapped between two single quotes characters (') are escaped.
   * Two single quotes in a row, whether inside or outside a quoted sequence, represent a 'real' single quote.
   * (see the last example)
   *
   * Format of the string is based on Unicode Technical Standard #35:
   * https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
   * with a few additions (see note 7 below the table).
   *
   * Accepted patterns:
   * | Unit                            | Pattern | Result examples                   | Notes |
   * |---------------------------------|---------|-----------------------------------|-------|
   * | Era                             | G..GGG  | AD, BC                            |       |
   * |                                 | GGGG    | Anno Domini, Before Christ        | 2     |
   * |                                 | GGGGG   | A, B                              |       |
   * | Calendar year                   | y       | 44, 1, 1900, 2017                 | 5     |
   * |                                 | yo      | 44th, 1st, 0th, 17th              | 5,7   |
   * |                                 | yy      | 44, 01, 00, 17                    | 5     |
   * |                                 | yyy     | 044, 001, 1900, 2017              | 5     |
   * |                                 | yyyy    | 0044, 0001, 1900, 2017            | 5     |
   * |                                 | yyyyy   | ...                               | 3,5   |
   * | Local week-numbering year       | Y       | 44, 1, 1900, 2017                 | 5     |
   * |                                 | Yo      | 44th, 1st, 1900th, 2017th         | 5,7   |
   * |                                 | YY      | 44, 01, 00, 17                    | 5,8   |
   * |                                 | YYY     | 044, 001, 1900, 2017              | 5     |
   * |                                 | YYYY    | 0044, 0001, 1900, 2017            | 5,8   |
   * |                                 | YYYYY   | ...                               | 3,5   |
   * | ISO week-numbering year         | R       | -43, 0, 1, 1900, 2017             | 5,7   |
   * |                                 | RR      | -43, 00, 01, 1900, 2017           | 5,7   |
   * |                                 | RRR     | -043, 000, 001, 1900, 2017        | 5,7   |
   * |                                 | RRRR    | -0043, 0000, 0001, 1900, 2017     | 5,7   |
   * |                                 | RRRRR   | ...                               | 3,5,7 |
   * | Extended year                   | u       | -43, 0, 1, 1900, 2017             | 5     |
   * |                                 | uu      | -43, 01, 1900, 2017               | 5     |
   * |                                 | uuu     | -043, 001, 1900, 2017             | 5     |
   * |                                 | uuuu    | -0043, 0001, 1900, 2017           | 5     |
   * |                                 | uuuuu   | ...                               | 3,5   |
   * | Quarter (formatting)            | Q       | 1, 2, 3, 4                        |       |
   * |                                 | Qo      | 1st, 2nd, 3rd, 4th                | 7     |
   * |                                 | QQ      | 01, 02, 03, 04                    |       |
   * |                                 | QQQ     | Q1, Q2, Q3, Q4                    |       |
   * |                                 | QQQQ    | 1st quarter, 2nd quarter, ...     | 2     |
   * |                                 | QQQQQ   | 1, 2, 3, 4                        | 4     |
   * | Quarter (stand-alone)           | q       | 1, 2, 3, 4                        |       |
   * |                                 | qo      | 1st, 2nd, 3rd, 4th                | 7     |
   * |                                 | qq      | 01, 02, 03, 04                    |       |
   * |                                 | qqq     | Q1, Q2, Q3, Q4                    |       |
   * |                                 | qqqq    | 1st quarter, 2nd quarter, ...     | 2     |
   * |                                 | qqqqq   | 1, 2, 3, 4                        | 4     |
   * | Month (formatting)              | M       | 1, 2, ..., 12                     |       |
   * |                                 | Mo      | 1st, 2nd, ..., 12th               | 7     |
   * |                                 | MM      | 01, 02, ..., 12                   |       |
   * |                                 | MMM     | Jan, Feb, ..., Dec                |       |
   * |                                 | MMMM    | January, February, ..., December  | 2     |
   * |                                 | MMMMM   | J, F, ..., D                      |       |
   * | Month (stand-alone)             | L       | 1, 2, ..., 12                     |       |
   * |                                 | Lo      | 1st, 2nd, ..., 12th               | 7     |
   * |                                 | LL      | 01, 02, ..., 12                   |       |
   * |                                 | LLL     | Jan, Feb, ..., Dec                |       |
   * |                                 | LLLL    | January, February, ..., December  | 2     |
   * |                                 | LLLLL   | J, F, ..., D                      |       |
   * | Local week of year              | w       | 1, 2, ..., 53                     |       |
   * |                                 | wo      | 1st, 2nd, ..., 53th               | 7     |
   * |                                 | ww      | 01, 02, ..., 53                   |       |
   * | ISO week of year                | I       | 1, 2, ..., 53                     | 7     |
   * |                                 | Io      | 1st, 2nd, ..., 53th               | 7     |
   * |                                 | II      | 01, 02, ..., 53                   | 7     |
   * | Day of month                    | d       | 1, 2, ..., 31                     |       |
   * |                                 | do      | 1st, 2nd, ..., 31st               | 7     |
   * |                                 | dd      | 01, 02, ..., 31                   |       |
   * | Day of year                     | D       | 1, 2, ..., 365, 366               | 9     |
   * |                                 | Do      | 1st, 2nd, ..., 365th, 366th       | 7     |
   * |                                 | DD      | 01, 02, ..., 365, 366             | 9     |
   * |                                 | DDD     | 001, 002, ..., 365, 366           |       |
   * |                                 | DDDD    | ...                               | 3     |
   * | Day of week (formatting)        | E..EEE  | Mon, Tue, Wed, ..., Sun           |       |
   * |                                 | EEEE    | Monday, Tuesday, ..., Sunday      | 2     |
   * |                                 | EEEEE   | M, T, W, T, F, S, S               |       |
   * |                                 | EEEEEE  | Mo, Tu, We, Th, Fr, Sa, Su        |       |
   * | ISO day of week (formatting)    | i       | 1, 2, 3, ..., 7                   | 7     |
   * |                                 | io      | 1st, 2nd, ..., 7th                | 7     |
   * |                                 | ii      | 01, 02, ..., 07                   | 7     |
   * |                                 | iii     | Mon, Tue, Wed, ..., Sun           | 7     |
   * |                                 | iiii    | Monday, Tuesday, ..., Sunday      | 2,7   |
   * |                                 | iiiii   | M, T, W, T, F, S, S               | 7     |
   * |                                 | iiiiii  | Mo, Tu, We, Th, Fr, Sa, Su        | 7     |
   * | Local day of week (formatting)  | e       | 2, 3, 4, ..., 1                   |       |
   * |                                 | eo      | 2nd, 3rd, ..., 1st                | 7     |
   * |                                 | ee      | 02, 03, ..., 01                   |       |
   * |                                 | eee     | Mon, Tue, Wed, ..., Sun           |       |
   * |                                 | eeee    | Monday, Tuesday, ..., Sunday      | 2     |
   * |                                 | eeeee   | M, T, W, T, F, S, S               |       |
   * |                                 | eeeeee  | Mo, Tu, We, Th, Fr, Sa, Su        |       |
   * | Local day of week (stand-alone) | c       | 2, 3, 4, ..., 1                   |       |
   * |                                 | co      | 2nd, 3rd, ..., 1st                | 7     |
   * |                                 | cc      | 02, 03, ..., 01                   |       |
   * |                                 | ccc     | Mon, Tue, Wed, ..., Sun           |       |
   * |                                 | cccc    | Monday, Tuesday, ..., Sunday      | 2     |
   * |                                 | ccccc   | M, T, W, T, F, S, S               |       |
   * |                                 | cccccc  | Mo, Tu, We, Th, Fr, Sa, Su        |       |
   * | AM, PM                          | a..aa   | AM, PM                            |       |
   * |                                 | aaa     | am, pm                            |       |
   * |                                 | aaaa    | a.m., p.m.                        | 2     |
   * |                                 | aaaaa   | a, p                              |       |
   * | AM, PM, noon, midnight          | b..bb   | AM, PM, noon, midnight            |       |
   * |                                 | bbb     | am, pm, noon, midnight            |       |
   * |                                 | bbbb    | a.m., p.m., noon, midnight        | 2     |
   * |                                 | bbbbb   | a, p, n, mi                       |       |
   * | Flexible day period             | B..BBB  | at night, in the morning, ...     |       |
   * |                                 | BBBB    | at night, in the morning, ...     | 2     |
   * |                                 | BBBBB   | at night, in the morning, ...     |       |
   * | Hour [1-12]                     | h       | 1, 2, ..., 11, 12                 |       |
   * |                                 | ho      | 1st, 2nd, ..., 11th, 12th         | 7     |
   * |                                 | hh      | 01, 02, ..., 11, 12               |       |
   * | Hour [0-23]                     | H       | 0, 1, 2, ..., 23                  |       |
   * |                                 | Ho      | 0th, 1st, 2nd, ..., 23rd          | 7     |
   * |                                 | HH      | 00, 01, 02, ..., 23               |       |
   * | Hour [0-11]                     | K       | 1, 2, ..., 11, 0                  |       |
   * |                                 | Ko      | 1st, 2nd, ..., 11th, 0th          | 7     |
   * |                                 | KK      | 01, 02, ..., 11, 00               |       |
   * | Hour [1-24]                     | k       | 24, 1, 2, ..., 23                 |       |
   * |                                 | ko      | 24th, 1st, 2nd, ..., 23rd         | 7     |
   * |                                 | kk      | 24, 01, 02, ..., 23               |       |
   * | Minute                          | m       | 0, 1, ..., 59                     |       |
   * |                                 | mo      | 0th, 1st, ..., 59th               | 7     |
   * |                                 | mm      | 00, 01, ..., 59                   |       |
   * | Second                          | s       | 0, 1, ..., 59                     |       |
   * |                                 | so      | 0th, 1st, ..., 59th               | 7     |
   * |                                 | ss      | 00, 01, ..., 59                   |       |
   * | Fraction of second              | S       | 0, 1, ..., 9                      |       |
   * |                                 | SS      | 00, 01, ..., 99                   |       |
   * |                                 | SSS     | 000, 001, ..., 999                |       |
   * |                                 | SSSS    | ...                               | 3     |
   * | Timezone (ISO-8601 w/ Z)        | X       | -08, +0530, Z                     |       |
   * |                                 | XX      | -0800, +0530, Z                   |       |
   * |                                 | XXX     | -08:00, +05:30, Z                 |       |
   * |                                 | XXXX    | -0800, +0530, Z, +123456          | 2     |
   * |                                 | XXXXX   | -08:00, +05:30, Z, +12:34:56      |       |
   * | Timezone (ISO-8601 w/o Z)       | x       | -08, +0530, +00                   |       |
   * |                                 | xx      | -0800, +0530, +0000               |       |
   * |                                 | xxx     | -08:00, +05:30, +00:00            | 2     |
   * |                                 | xxxx    | -0800, +0530, +0000, +123456      |       |
   * |                                 | xxxxx   | -08:00, +05:30, +00:00, +12:34:56 |       |
   * | Timezone (GMT)                  | O...OOO | GMT-8, GMT+5:30, GMT+0            |       |
   * |                                 | OOOO    | GMT-08:00, GMT+05:30, GMT+00:00   | 2     |
   * | Timezone (specific non-locat.)  | z...zzz | GMT-8, GMT+5:30, GMT+0            | 6     |
   * |                                 | zzzz    | GMT-08:00, GMT+05:30, GMT+00:00   | 2,6   |
   * | Seconds timestamp               | t       | 512969520                         | 7     |
   * |                                 | tt      | ...                               | 3,7   |
   * | Milliseconds timestamp          | T       | 512969520900                      | 7     |
   * |                                 | TT      | ...                               | 3,7   |
   * | Long localized date             | P       | 04/29/1453                        | 7     |
   * |                                 | PP      | Apr 29, 1453                      | 7     |
   * |                                 | PPP     | April 29th, 1453                  | 7     |
   * |                                 | PPPP    | Friday, April 29th, 1453          | 2,7   |
   * | Long localized time             | p       | 12:00 AM                          | 7     |
   * |                                 | pp      | 12:00:00 AM                       | 7     |
   * |                                 | ppp     | 12:00:00 AM GMT+2                 | 7     |
   * |                                 | pppp    | 12:00:00 AM GMT+02:00             | 2,7   |
   * | Combination of date and time    | Pp      | 04/29/1453, 12:00 AM              | 7     |
   * |                                 | PPpp    | Apr 29, 1453, 12:00:00 AM         | 7     |
   * |                                 | PPPppp  | April 29th, 1453 at ...           | 7     |
   * |                                 | PPPPpppp| Friday, April 29th, 1453 at ...   | 2,7   |
   * Notes:
   * 1. "Formatting" units (e.g. formatting quarter) in the default en-US locale
   *    are the same as "stand-alone" units, but are different in some languages.
   *    "Formatting" units are declined according to the rules of the language
   *    in the context of a date. "Stand-alone" units are always nominative singular:
   *
   *    `format(new Date(2017, 10, 6), 'do LLLL', {locale: cs}) //=> '6. listopad'`
   *
   *    `format(new Date(2017, 10, 6), 'do MMMM', {locale: cs}) //=> '6. listopadu'`
   *
   * 2. Any sequence of the identical letters is a pattern, unless it is escaped by
   *    the single quote characters (see below).
   *    If the sequence is longer than listed in table (e.g. `EEEEEEEEEEE`)
   *    the output will be the same as default pattern for this unit, usually
   *    the longest one (in case of ISO weekdays, `EEEE`). Default patterns for units
   *    are marked with "2" in the last column of the table.
   *
   *    `format(new Date(2017, 10, 6), 'MMM') //=> 'Nov'`
   *
   *    `format(new Date(2017, 10, 6), 'MMMM') //=> 'November'`
   *
   *    `format(new Date(2017, 10, 6), 'MMMMM') //=> 'N'`
   *
   *    `format(new Date(2017, 10, 6), 'MMMMMM') //=> 'November'`
   *
   *    `format(new Date(2017, 10, 6), 'MMMMMMM') //=> 'November'`
   *
   * 3. Some patterns could be unlimited length (such as `yyyyyyyy`).
   *    The output will be padded with zeros to match the length of the pattern.
   *
   *    `format(new Date(2017, 10, 6), 'yyyyyyyy') //=> '00002017'`
   *
   * 4. `QQQQQ` and `qqqqq` could be not strictly numerical in some locales.
   *    These tokens represent the shortest form of the quarter.
   *
   * 5. The main difference between `y` and `u` patterns are B.C. years:
   *
   *    | Year | `y` | `u` |
   *    |------|-----|-----|
   *    | AC 1 |   1 |   1 |
   *    | BC 1 |   1 |   0 |
   *    | BC 2 |   2 |  -1 |
   *
   *    Also `yy` always returns the last two digits of a year,
   *    while `uu` pads single digit years to 2 characters and returns other years unchanged:
   *
   *    | Year | `yy` | `uu` |
   *    |------|------|------|
   *    | 1    |   01 |   01 |
   *    | 14   |   14 |   14 |
   *    | 376  |   76 |  376 |
   *    | 1453 |   53 | 1453 |
   *
   *    The same difference is true for local and ISO week-numbering years (`Y` and `R`),
   *    except local week-numbering years are dependent on `options.weekStartsOn`
   *    and `options.firstWeekContainsDate` (compare [getISOWeekYear]{@link https://date-fns.org/docs/getISOWeekYear}
   *    and [getWeekYear]{@link https://date-fns.org/docs/getWeekYear}).
   *
   * 6. Specific non-location timezones are currently unavailable in `date-fns`,
   *    so right now these tokens fall back to GMT timezones.
   *
   * 7. These patterns are not in the Unicode Technical Standard #35:
   *    - `i`: ISO day of week
   *    - `I`: ISO week of year
   *    - `R`: ISO week-numbering year
   *    - `t`: seconds timestamp
   *    - `T`: milliseconds timestamp
   *    - `o`: ordinal number modifier
   *    - `P`: long localized date
   *    - `p`: long localized time
   *
   * 8. `YY` and `YYYY` tokens represent week-numbering years but they are often confused with years.
   *    You should enable `options.useAdditionalWeekYearTokens` to use them. See: https://git.io/fxCyr
   *
   * 9. `D` and `DD` tokens represent days of the year but they are ofthen confused with days of the month.
   *    You should enable `options.useAdditionalDayOfYearTokens` to use them. See: https://git.io/fxCyr
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * - The second argument is now required for the sake of explicitness.
   *
   *   ```javascript
   *   // Before v2.0.0
   *   format(new Date(2016, 0, 1))
   *
   *   // v2.0.0 onward
   *   format(new Date(2016, 0, 1), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
   *   ```
   *
   * - New format string API for `format` function
   *   which is based on [Unicode Technical Standard #35](https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table).
   *   See [this post](https://blog.date-fns.org/post/unicode-tokens-in-date-fns-v2-sreatyki91jg) for more details.
   *
   * - Characters are now escaped using single quote symbols (`'`) instead of square brackets.
   *
   * @param {Date|Number} date - the original date
   * @param {String} format - the string of tokens
   * @param {Object} [options] - an object with options.
   * @param {Locale} [options.locale=defaultLocale] - the locale object. See [Locale]{@link https://date-fns.org/docs/Locale}
   * @param {0|1|2|3|4|5|6} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
   * @param {Number} [options.firstWeekContainsDate=1] - the day of January, which is
   * @param {Boolean} [options.useAdditionalWeekYearTokens=false] - if true, allows usage of the week-numbering year tokens `YY` and `YYYY`;
   *   see: https://git.io/fxCyr
   * @param {Boolean} [options.useAdditionalDayOfYearTokens=false] - if true, allows usage of the day of year tokens `D` and `DD`;
   *   see: https://git.io/fxCyr
   * @returns {String} the formatted date string
   * @throws {TypeError} 2 arguments required
   * @throws {RangeError} `date` must not be Invalid Date
   * @throws {RangeError} `options.locale` must contain `localize` property
   * @throws {RangeError} `options.locale` must contain `formatLong` property
   * @throws {RangeError} `options.weekStartsOn` must be between 0 and 6
   * @throws {RangeError} `options.firstWeekContainsDate` must be between 1 and 7
   * @throws {RangeError} use `yyyy` instead of `YYYY` for formatting years using [format provided] to the input [input provided]; see: https://git.io/fxCyr
   * @throws {RangeError} use `yy` instead of `YY` for formatting years using [format provided] to the input [input provided]; see: https://git.io/fxCyr
   * @throws {RangeError} use `d` instead of `D` for formatting days of the month using [format provided] to the input [input provided]; see: https://git.io/fxCyr
   * @throws {RangeError} use `dd` instead of `DD` for formatting days of the month using [format provided] to the input [input provided]; see: https://git.io/fxCyr
   * @throws {RangeError} format string contains an unescaped latin alphabet character
   *
   * @example
   * // Represent 11 February 2014 in middle-endian format:
   * var result = format(new Date(2014, 1, 11), 'MM/dd/yyyy')
   * //=> '02/11/2014'
   *
   * @example
   * // Represent 2 July 2014 in Esperanto:
   * import { eoLocale } from 'date-fns/locale/eo'
   * var result = format(new Date(2014, 6, 2), "do 'de' MMMM yyyy", {
   *   locale: eoLocale
   * })
   * //=> '2-a de julio 2014'
   *
   * @example
   * // Escape string by single quote characters:
   * var result = format(new Date(2014, 6, 2, 15), "h 'o''clock'")
   * //=> "3 o'clock"
   */

  function format(dirtyDate, dirtyFormatStr, dirtyOptions) {
    requiredArgs$2(2, arguments);
    var formatStr = String(dirtyFormatStr);
    var options = dirtyOptions || {};
    var locale = options.locale || defaultLocale;
    var localeFirstWeekContainsDate = locale.options && locale.options.firstWeekContainsDate;
    var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger$2(localeFirstWeekContainsDate);
    var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger$2(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

    if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
      throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
    }

    var localeWeekStartsOn = locale.options && locale.options.weekStartsOn;
    var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger$2(localeWeekStartsOn);
    var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger$2(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

    if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
      throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
    }

    if (!locale.localize) {
      throw new RangeError('locale must contain localize property');
    }

    if (!locale.formatLong) {
      throw new RangeError('locale must contain formatLong property');
    }

    var originalDate = toDate(dirtyDate);

    if (!isValid(originalDate)) {
      throw new RangeError('Invalid time value');
    } // Convert the date in system timezone to the same date in UTC+00:00 timezone.
    // This ensures that when UTC functions will be implemented, locales will be compatible with them.
    // See an issue about UTC functions: https://github.com/date-fns/date-fns/issues/376


    var timezoneOffset = getTimezoneOffsetInMilliseconds$2(originalDate);
    var utcDate = subMilliseconds$1(originalDate, timezoneOffset);
    var formatterOptions = {
      firstWeekContainsDate: firstWeekContainsDate,
      weekStartsOn: weekStartsOn,
      locale: locale,
      _originalDate: originalDate
    };
    var result = formatStr.match(longFormattingTokensRegExp).map(function (substring) {
      var firstCharacter = substring[0];

      if (firstCharacter === 'p' || firstCharacter === 'P') {
        var longFormatter = longFormatters$1[firstCharacter];
        return longFormatter(substring, locale.formatLong, formatterOptions);
      }

      return substring;
    }).join('').match(formattingTokensRegExp).map(function (substring) {
      // Replace two single quote characters with one single quote character
      if (substring === "''") {
        return "'";
      }

      var firstCharacter = substring[0];

      if (firstCharacter === "'") {
        return cleanEscapedString(substring);
      }

      var formatter = formatters$1[firstCharacter];

      if (formatter) {
        if (!options.useAdditionalWeekYearTokens && isProtectedWeekYearToken(substring)) {
          throwProtectedError(substring, dirtyFormatStr, dirtyDate);
        }

        if (!options.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(substring)) {
          throwProtectedError(substring, dirtyFormatStr, dirtyDate);
        }

        return formatter(utcDate, substring, locale.localize, formatterOptions);
      }

      if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
        throw new RangeError('Format string contains an unescaped latin alphabet character `' + firstCharacter + '`');
      }

      return substring;
    }).join('');
    return result;
  }

  function cleanEscapedString(input) {
    return input.match(escapedStringRegExp)[1].replace(doubleQuoteRegExp, "'");
  }

  function assign(target, dirtyObject) {
    if (target == null) {
      throw new TypeError('assign requires that input parameter not be null or undefined');
    }

    dirtyObject = dirtyObject || {};

    for (var property in dirtyObject) {
      if (Object.prototype.hasOwnProperty.call(dirtyObject, property)) {
        target[property] = dirtyObject[property];
      }
    }

    return target;
  }

  function cloneObject(dirtyObject) {
    return assign({}, dirtyObject);
  }

  var MILLISECONDS_IN_MINUTE = 1000 * 60;
  var MINUTES_IN_DAY = 60 * 24;
  var MINUTES_IN_MONTH = MINUTES_IN_DAY * 30;
  var MINUTES_IN_YEAR = MINUTES_IN_DAY * 365;
  /**
   * @name formatDistanceStrict
   * @category Common Helpers
   * @summary Return the distance between the given dates in words.
   *
   * @description
   * Return the distance between the given dates in words, using strict units.
   * This is like `formatDistance`, but does not use helpers like 'almost', 'over',
   * 'less than' and the like.
   *
   * | Distance between dates | Result              |
   * |------------------------|---------------------|
   * | 0 ... 59 secs          | [0..59] seconds     |
   * | 1 ... 59 mins          | [1..59] minutes     |
   * | 1 ... 23 hrs           | [1..23] hours       |
   * | 1 ... 29 days          | [1..29] days        |
   * | 1 ... 11 months        | [1..11] months      |
   * | 1 ... N years          | [1..N]  years       |
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * - The function was renamed from `distanceInWordsStrict` to `formatDistanceStrict`
   *   to make its name consistent with `format` and `formatRelative`.
   *
   * - The order of arguments is swapped to make the function
   *   consistent with `differenceIn...` functions.
   *
   *   ```javascript
   *   // Before v2.0.0
   *
   *   distanceInWordsStrict(
   *     new Date(2015, 0, 2),
   *     new Date(2014, 6, 2)
   *   ) //=> '6 months'
   *
   *   // v2.0.0 onward
   *
   *   formatDistanceStrict(
   *     new Date(2014, 6, 2),
   *     new Date(2015, 0, 2)
   *   ) //=> '6 months'
   *   ```
   *
   * - `partialMethod` option is renamed to `roundingMethod`.
   *
   *   ```javascript
   *   // Before v2.0.0
   *
   *   distanceInWordsStrict(
   *     new Date(1986, 3, 4, 10, 32, 0),
   *     new Date(1986, 3, 4, 10, 33, 1),
   *     { partialMethod: 'ceil' }
   *   ) //=> '2 minutes'
   *
   *   // v2.0.0 onward
   *
   *   formatDistanceStrict(
   *     new Date(1986, 3, 4, 10, 33, 1),
   *     new Date(1986, 3, 4, 10, 32, 0),
   *     { roundingMethod: 'ceil' }
   *   ) //=> '2 minutes'
   *   ```
   *
   * - If `roundingMethod` is not specified, it now defaults to `round` instead of `floor`.
   *
   * - `unit` option now accepts one of the strings:
   *   'second', 'minute', 'hour', 'day', 'month' or 'year' instead of 's', 'm', 'h', 'd', 'M' or 'Y'
   *
   *   ```javascript
   *   // Before v2.0.0
   *
   *   distanceInWordsStrict(
   *     new Date(1986, 3, 4, 10, 32, 0),
   *     new Date(1986, 3, 4, 10, 33, 1),
   *     { unit: 'm' }
   *   )
   *
   *   // v2.0.0 onward
   *
   *   formatDistanceStrict(
   *     new Date(1986, 3, 4, 10, 33, 1),
   *     new Date(1986, 3, 4, 10, 32, 0),
   *     { unit: 'minute' }
   *   )
   *   ```
   *
   * @param {Date|Number} date - the date
   * @param {Date|Number} baseDate - the date to compare with
   * @param {Object} [options] - an object with options.
   * @param {Boolean} [options.addSuffix=false] - result indicates if the second date is earlier or later than the first
   * @param {'second'|'minute'|'hour'|'day'|'month'|'year'} [options.unit] - if specified, will force a unit
   * @param {'floor'|'ceil'|'round'} [options.roundingMethod='round'] - which way to round partial units
   * @param {Locale} [options.locale=defaultLocale] - the locale object. See [Locale]{@link https://date-fns.org/docs/Locale}
   * @returns {String} the distance in words
   * @throws {TypeError} 2 arguments required
   * @throws {RangeError} `date` must not be Invalid Date
   * @throws {RangeError} `baseDate` must not be Invalid Date
   * @throws {RangeError} `options.roundingMethod` must be 'floor', 'ceil' or 'round'
   * @throws {RangeError} `options.unit` must be 'second', 'minute', 'hour', 'day', 'month' or 'year'
   * @throws {RangeError} `options.locale` must contain `formatDistance` property
   *
   * @example
   * // What is the distance between 2 July 2014 and 1 January 2015?
   * const result = formatDistanceStrict(new Date(2014, 6, 2), new Date(2015, 0, 2))
   * //=> '6 months'
   *
   * @example
   * // What is the distance between 1 January 2015 00:00:15
   * // and 1 January 2015 00:00:00?
   * const result = formatDistanceStrict(
   *   new Date(2015, 0, 1, 0, 0, 15),
   *   new Date(2015, 0, 1, 0, 0, 0)
   * )
   * //=> '15 seconds'
   *
   * @example
   * // What is the distance from 1 January 2016
   * // to 1 January 2015, with a suffix?
   * const result = formatDistanceStrict(new Date(2015, 0, 1), new Date(2016, 0, 1), {
   *   addSuffix: true
   * })
   * //=> '1 year ago'
   *
   * @example
   * // What is the distance from 1 January 2016
   * // to 1 January 2015, in minutes?
   * const result = formatDistanceStrict(new Date(2016, 0, 1), new Date(2015, 0, 1), {
   *   unit: 'minute'
   * })
   * //=> '525600 minutes'
   *
   * @example
   * // What is the distance from 1 January 2015
   * // to 28 January 2015, in months, rounded up?
   * const result = formatDistanceStrict(new Date(2015, 0, 28), new Date(2015, 0, 1), {
   *   unit: 'month',
   *   roundingMethod: 'ceil'
   * })
   * //=> '1 month'
   *
   * @example
   * // What is the distance between 1 August 2016 and 1 January 2015 in Esperanto?
   * import { eoLocale } from 'date-fns/locale/eo'
   * const result = formatDistanceStrict(new Date(2016, 7, 1), new Date(2015, 0, 1), {
   *   locale: eoLocale
   * })
   * //=> '1 jaro'
   */

  function formatDistanceStrict(dirtyDate, dirtyBaseDate) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    requiredArgs$2(2, arguments);
    var locale = options.locale || defaultLocale;

    if (!locale.formatDistance) {
      throw new RangeError('locale must contain localize.formatDistance property');
    }

    var comparison = compareAsc(dirtyDate, dirtyBaseDate);

    if (isNaN(comparison)) {
      throw new RangeError('Invalid time value');
    }

    var localizeOptions = cloneObject(options);
    localizeOptions.addSuffix = Boolean(options.addSuffix);
    localizeOptions.comparison = comparison;
    var dateLeft;
    var dateRight;

    if (comparison > 0) {
      dateLeft = toDate(dirtyBaseDate);
      dateRight = toDate(dirtyDate);
    } else {
      dateLeft = toDate(dirtyDate);
      dateRight = toDate(dirtyBaseDate);
    }

    var roundingMethod = options.roundingMethod == null ? 'round' : String(options.roundingMethod);
    var roundingMethodFn;

    if (roundingMethod === 'floor') {
      roundingMethodFn = Math.floor;
    } else if (roundingMethod === 'ceil') {
      roundingMethodFn = Math.ceil;
    } else if (roundingMethod === 'round') {
      roundingMethodFn = Math.round;
    } else {
      throw new RangeError("roundingMethod must be 'floor', 'ceil' or 'round'");
    }

    var milliseconds = dateRight.getTime() - dateLeft.getTime();
    var minutes = milliseconds / MILLISECONDS_IN_MINUTE;
    var timezoneOffset = getTimezoneOffsetInMilliseconds$2(dateRight) - getTimezoneOffsetInMilliseconds$2(dateLeft); // Use DST-normalized difference in minutes for years, months and days;
    // use regular difference in minutes for hours, minutes and seconds.

    var dstNormalizedMinutes = (milliseconds - timezoneOffset) / MILLISECONDS_IN_MINUTE;
    var unit;

    if (options.unit == null) {
      if (minutes < 1) {
        unit = 'second';
      } else if (minutes < 60) {
        unit = 'minute';
      } else if (minutes < MINUTES_IN_DAY) {
        unit = 'hour';
      } else if (dstNormalizedMinutes < MINUTES_IN_MONTH) {
        unit = 'day';
      } else if (dstNormalizedMinutes < MINUTES_IN_YEAR) {
        unit = 'month';
      } else {
        unit = 'year';
      }
    } else {
      unit = String(options.unit);
    } // 0 up to 60 seconds


    if (unit === 'second') {
      var seconds = roundingMethodFn(milliseconds / 1000);
      return locale.formatDistance('xSeconds', seconds, localizeOptions); // 1 up to 60 mins
    } else if (unit === 'minute') {
      var roundedMinutes = roundingMethodFn(minutes);
      return locale.formatDistance('xMinutes', roundedMinutes, localizeOptions); // 1 up to 24 hours
    } else if (unit === 'hour') {
      var hours = roundingMethodFn(minutes / 60);
      return locale.formatDistance('xHours', hours, localizeOptions); // 1 up to 30 days
    } else if (unit === 'day') {
      var days = roundingMethodFn(dstNormalizedMinutes / MINUTES_IN_DAY);
      return locale.formatDistance('xDays', days, localizeOptions); // 1 up to 12 months
    } else if (unit === 'month') {
      var months = roundingMethodFn(dstNormalizedMinutes / MINUTES_IN_MONTH);
      return months === 12 && options.unit !== 'month' ? locale.formatDistance('xYears', 1, localizeOptions) : locale.formatDistance('xMonths', months, localizeOptions); // 1 year up to max Date
    } else if (unit === 'year') {
      var years = roundingMethodFn(dstNormalizedMinutes / MINUTES_IN_YEAR);
      return locale.formatDistance('xYears', years, localizeOptions);
    }

    throw new RangeError("unit must be 'second', 'minute', 'hour', 'day', 'month' or 'year'");
  }

  var defaultFormat = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'];
  /**
   * @name formatDuration
   * @category Common Helpers
   * @summary Formats a duration in human-readable format
   *
   * @description
   * Return human-readable duration string i.e. "9 months 2 days"
   *
   * @param {Duration} duration - the duration to format
   * @param {Object} [options] - an object with options.

   * @param {string[]} [options.format=['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds']] - the array of units to format
   * @param {boolean} [options.zero=false] - should be zeros be included in the output?
   * @param {string} [options.delimiter=' '] - delimiter string
   * @param {Locale} [options.locale=defaultLocale] - the locale object. See [Locale]{@link https://date-fns.org/docs/Locale}
   * @returns {string} the formatted date string
   * @throws {TypeError} 1 argument required
   *
   * @example
   * // Format full duration
   * formatDuration({
   *   years: 2,
   *   months: 9,
   *   weeks: 1,
   *   days: 7,
   *   hours: 5,
   *   minutes: 9,
   *   seconds: 30
   * })
   * //=> '2 years 9 months 1 week 7 days 5 hours 9 minutes 30 seconds
   *
   * @example
   * // Format partial duration
   * formatDuration({ months: 9, days: 2 })
   * //=> '9 months 2 days'
   *
   * @example
   * // Customize the format
   * formatDuration(
   *   {
   *     years: 2,
   *     months: 9,
   *     weeks: 1,
   *     days: 7,
   *     hours: 5,
   *     minutes: 9,
   *     seconds: 30
   *   },
   *   { format: ['months', 'weeks'] }
   * ) === '9 months 1 week'
   *
   * @example
   * // Customize the zeros presence
   * formatDuration({ years: 0, months: 9 })
   * //=> '9 months'
   * formatDuration({ years: 0, months: 9 }, { zero: true })
   * //=> '0 years 9 months'
   *
   * @example
   * // Customize the delimiter
   * formatDuration({ years: 2, months: 9, weeks: 3 }, { delimiter: ', ' })
   * //=> '2 years, 9 months, 3 weeks'
   */

  function formatDuration(duration, options) {
    if (arguments.length < 1) {
      throw new TypeError("1 argument required, but only ".concat(arguments.length, " present"));
    }

    var format = (options === null || options === void 0 ? void 0 : options.format) || defaultFormat;
    var locale = (options === null || options === void 0 ? void 0 : options.locale) || defaultLocale;
    var zero = (options === null || options === void 0 ? void 0 : options.zero) || false;
    var delimiter = (options === null || options === void 0 ? void 0 : options.delimiter) || ' ';
    var result = format.reduce(function (acc, unit) {
      var token = "x".concat(unit.replace(/(^.)/, function (m) {
        return m.toUpperCase();
      }));
      var addChunk = typeof duration[unit] === 'number' && (zero || duration[unit]);
      return addChunk ? acc.concat(locale.formatDistance(token, duration[unit])) : acc;
    }, []).join(delimiter);
    return result;
  }

  /**
   * @name formatISO
   * @category Common Helpers
   * @summary Format the date according to the ISO 8601 standard (http://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm#a003169814.htm).
   *
   * @description
   * Return the formatted date string in ISO 8601 format. Options may be passed to control the parts and notations of the date.
   *
   * @param {Date|Number} date - the original date
   * @param {Object} [options] - an object with options.
   * @param {'extended'|'basic'} [options.format='extended'] - if 'basic', hide delimiters between date and time values.
   * @param {'complete'|'date'|'time'} [options.representation='complete'] - format date, time with time zone, or both.
   * @returns {String} the formatted date string
   * @throws {TypeError} 1 argument required
   * @throws {RangeError} `date` must not be Invalid Date
   * @throws {RangeError} `options.format` must be 'extended' or 'basic'
   * @throws {RangeError} `options.represenation` must be 'date', 'time' or 'complete'
   *
   * @example
   * // Represent 18 September 2019 in ISO 8601 format (UTC):
   * const result = formatISO(new Date(2019, 8, 18, 19, 0, 52))
   * //=> '2019-09-18T19:00:52Z'
   *
   * @example
   * // Represent 18 September 2019 in ISO 8601, short format (UTC):
   * const result = formatISO(new Date(2019, 8, 18, 19, 0, 52), { format: 'basic' })
   * //=> '20190918T190052'
   *
   * @example
   * // Represent 18 September 2019 in ISO 8601 format, date only:
   * const result = formatISO(new Date(2019, 8, 18, 19, 0, 52), { representation: 'date' })
   * //=> '2019-09-18'
   *
   * @example
   * // Represent 18 September 2019 in ISO 8601 format, time only (UTC):
   * const result = formatISO(new Date(2019, 8, 18, 19, 0, 52), { representation: 'time' })
   * //=> '19:00:52Z'
   */

  function formatISO(dirtyDate, dirtyOptions) {
    if (arguments.length < 1) {
      throw new TypeError("1 argument required, but only ".concat(arguments.length, " present"));
    }

    var originalDate = toDate(dirtyDate);

    if (!isValid(originalDate)) {
      throw new RangeError('Invalid time value');
    }

    var options = dirtyOptions || {};
    var format = options.format == null ? 'extended' : String(options.format);
    var representation = options.representation == null ? 'complete' : String(options.representation);

    if (format !== 'extended' && format !== 'basic') {
      throw new RangeError("format must be 'extended' or 'basic'");
    }

    if (representation !== 'date' && representation !== 'time' && representation !== 'complete') {
      throw new RangeError("representation must be 'date', 'time', or 'complete'");
    }

    var result = '';
    var tzOffset = '';
    var dateDelimiter = format === 'extended' ? '-' : '';
    var timeDelimiter = format === 'extended' ? ':' : ''; // Representation is either 'date' or 'complete'

    if (representation !== 'time') {
      var day = addLeadingZeros(originalDate.getDate(), 2);
      var month = addLeadingZeros(originalDate.getMonth() + 1, 2);
      var year = addLeadingZeros(originalDate.getFullYear(), 4); // yyyyMMdd or yyyy-MM-dd.

      result = "".concat(year).concat(dateDelimiter).concat(month).concat(dateDelimiter).concat(day);
    } // Representation is either 'time' or 'complete'


    if (representation !== 'date') {
      // Add the timezone.
      var offset = originalDate.getTimezoneOffset();

      if (offset !== 0) {
        var absoluteOffset = Math.abs(offset);
        var hourOffset = addLeadingZeros(Math.floor(absoluteOffset / 60), 2);
        var minuteOffset = addLeadingZeros(absoluteOffset % 60, 2); // If less than 0, the sign is +, because it is ahead of time.

        var sign = offset < 0 ? '+' : '-';
        tzOffset = "".concat(sign).concat(hourOffset, ":").concat(minuteOffset);
      } else {
        tzOffset = 'Z';
      }

      var hour = addLeadingZeros(originalDate.getHours(), 2);
      var minute = addLeadingZeros(originalDate.getMinutes(), 2);
      var second = addLeadingZeros(originalDate.getSeconds(), 2); // If there's also date, separate it with time with 'T'

      var separator = result === '' ? '' : 'T'; // Creates a time string consisting of hour, minute, and second, separated by delimiters, if defined.

      var time = [hour, minute, second].join(timeDelimiter); // HHmmss or HH:mm:ss.

      result = "".concat(result).concat(separator).concat(time).concat(tzOffset);
    }

    return result;
  }

  /**
   * @name formatRelative
   * @category Common Helpers
   * @summary Represent the date in words relative to the given base date.
   *
   * @description
   * Represent the date in words relative to the given base date.
   *
   * | Distance to the base date | Result                    |
   * |---------------------------|---------------------------|
   * | Previous 6 days           | last Sunday at 04:30 AM   |
   * | Last day                  | yesterday at 04:30 AM     |
   * | Same day                  | today at 04:30 AM         |
   * | Next day                  | tomorrow at 04:30 AM      |
   * | Next 6 days               | Sunday at 04:30 AM        |
   * | Other                     | 12/31/2017                |
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to format
   * @param {Date|Number} baseDate - the date to compare with
   * @param {Object} [options] - an object with options.
   * @param {Locale} [options.locale=defaultLocale] - the locale object. See [Locale]{@link https://date-fns.org/docs/Locale}
   * @param {0|1|2|3|4|5|6} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
   * @returns {String} the date in words
   * @throws {TypeError} 2 arguments required
   * @throws {RangeError} `date` must not be Invalid Date
   * @throws {RangeError} `baseDate` must not be Invalid Date
   * @throws {RangeError} `options.weekStartsOn` must be between 0 and 6
   * @throws {RangeError} `options.locale` must contain `localize` property
   * @throws {RangeError} `options.locale` must contain `formatLong` property
   * @throws {RangeError} `options.locale` must contain `formatRelative` property
   *
   * @example
   * // Represent the date of 6 days ago in words relative to the given base date. In this example, today is Wednesday
   * const result = formatRelative(addDays(new Date(), -6), new Date())
   * //=> "last Thursday at 12:45 AM"
   */
  function formatRelative(dirtyDate, dirtyBaseDate, dirtyOptions) {
    requiredArgs$2(2, arguments);
    var date = toDate(dirtyDate);
    var baseDate = toDate(dirtyBaseDate);

    var _ref = dirtyOptions || {},
        _ref$locale = _ref.locale,
        locale = _ref$locale === void 0 ? defaultLocale : _ref$locale,
        _ref$weekStartsOn = _ref.weekStartsOn,
        weekStartsOn = _ref$weekStartsOn === void 0 ? 0 : _ref$weekStartsOn;

    if (!locale.localize) {
      throw new RangeError('locale must contain localize property');
    }

    if (!locale.formatLong) {
      throw new RangeError('locale must contain formatLong property');
    }

    if (!locale.formatRelative) {
      throw new RangeError('locale must contain formatRelative property');
    }

    var diff = differenceInCalendarDays(date, baseDate);

    if (isNaN(diff)) {
      throw new RangeError('Invalid time value');
    }

    var token;

    if (diff < -6) {
      token = 'other';
    } else if (diff < -1) {
      token = 'lastWeek';
    } else if (diff < 0) {
      token = 'yesterday';
    } else if (diff < 1) {
      token = 'today';
    } else if (diff < 2) {
      token = 'tomorrow';
    } else if (diff < 7) {
      token = 'nextWeek';
    } else {
      token = 'other';
    }

    var utcDate = subMilliseconds$1(date, getTimezoneOffsetInMilliseconds$2(date));
    var utcBaseDate = subMilliseconds$1(baseDate, getTimezoneOffsetInMilliseconds$2(baseDate));
    var formatStr = locale.formatRelative(token, utcDate, utcBaseDate, {
      locale: locale,
      weekStartsOn: weekStartsOn
    });
    return format(date, formatStr, {
      locale: locale,
      weekStartsOn: weekStartsOn
    });
  }

  /**
   * @name getDayOfYear
   * @category Day Helpers
   * @summary Get the day of the year of the given date.
   *
   * @description
   * Get the day of the year of the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the given date
   * @returns {Number} the day of year
   * @throws {TypeError} 1 argument required
   *
   * @example
   * // Which day of the year is 2 July 2014?
   * const result = getDayOfYear(new Date(2014, 6, 2))
   * //=> 183
   */

  function getDayOfYear(dirtyDate) {
    requiredArgs$2(1, arguments);
    var date = toDate(dirtyDate);
    var diff = differenceInCalendarDays(date, startOfYear(date));
    var dayOfYear = diff + 1;
    return dayOfYear;
  }

  /**
   * @name getHours
   * @category Hour Helpers
   * @summary Get the hours of the given date.
   *
   * @description
   * Get the hours of the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the given date
   * @returns {Number} the hours
   * @throws {TypeError} 1 argument required
   *
   * @example
   * // Get the hours of 29 February 2012 11:45:00:
   * const result = getHours(new Date(2012, 1, 29, 11, 45))
   * //=> 11
   */

  function getHours$1(dirtyDate) {
    requiredArgs$2(1, arguments);
    var date = toDate(dirtyDate);
    var hours = date.getHours();
    return hours;
  }

  /**
   * @name subDays
   * @category Day Helpers
   * @summary Subtract the specified number of days from the given date.
   *
   * @description
   * Subtract the specified number of days from the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} amount - the amount of days to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {Date} the new date with the days subtracted
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Subtract 10 days from 1 September 2014:
   * const result = subDays(new Date(2014, 8, 1), 10)
   * //=> Fri Aug 22 2014 00:00:00
   */

  function subDays$1(dirtyDate, dirtyAmount) {
    requiredArgs$2(2, arguments);
    var amount = toInteger$2(dirtyAmount);
    return addDays$1(dirtyDate, -amount);
  }

  /**
   * @name subMonths
   * @category Month Helpers
   * @summary Subtract the specified number of months from the given date.
   *
   * @description
   * Subtract the specified number of months from the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} amount - the amount of months to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {Date} the new date with the months subtracted
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Subtract 5 months from 1 February 2015:
   * const result = subMonths(new Date(2015, 1, 1), 5)
   * //=> Mon Sep 01 2014 00:00:00
   */

  function subMonths(dirtyDate, dirtyAmount) {
    requiredArgs$2(2, arguments);
    var amount = toInteger$2(dirtyAmount);
    return addMonths(dirtyDate, -amount);
  }

  /**
   * @name sub
   * @category Common Helpers
   * @summary Subtract the specified years, months, weeks, days, hours, minutes and seconds from the given date.
   *
   * @description
   * Subtract the specified years, months, weeks, days, hours, minutes and seconds from the given date.
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Duration} duration - the object with years, months, weeks, days, hours, minutes and seconds to be subtracted
   *
   * | Key     | Description                        |
   * |---------|------------------------------------|
   * | years   | Amount of years to be subtracted   |
   * | months  | Amount of months to be subtracted  |
   * | weeks   | Amount of weeks to be subtracted   |
   * | days    | Amount of days to be subtracted    |
   * | hours   | Amount of hours to be subtracted   |
   * | minutes | Amount of minutes to be subtracted |
   * | seconds | Amount of seconds to be subtracted |
   *
   * All values default to 0
   *
   * @returns {Date} the new date with the seconds subtracted
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Subtract the following duration from 15 June 2017 15:29:20
   * const result = sub(new Date(2017, 5, 15, 15, 29, 20), {
   *   years: 2,
   *   months: 9,
   *   weeks: 1,
   *   days: 7,
   *   hours: 5,
   *   minutes: 9,
   *   seconds: 30
   * })
   * //=> Mon Sep 1 2014 10:19:50
   */

  function sub(date, duration) {
    requiredArgs$2(2, arguments);
    if (!duration || typeof duration !== 'object') return new Date(NaN);
    var years = duration.years ? toInteger$2(duration.years) : 0;
    var months = duration.months ? toInteger$2(duration.months) : 0;
    var weeks = duration.weeks ? toInteger$2(duration.weeks) : 0;
    var days = duration.days ? toInteger$2(duration.days) : 0;
    var hours = duration.hours ? toInteger$2(duration.hours) : 0;
    var minutes = duration.minutes ? toInteger$2(duration.minutes) : 0;
    var seconds = duration.seconds ? toInteger$2(duration.seconds) : 0; // Subtract years and months

    var dateWithoutMonths = subMonths(date, months + years * 12); // Subtract weeks and days

    var dateWithoutDays = subDays$1(dateWithoutMonths, days + weeks * 7); // Subtract hours, minutes and seconds

    var minutestoSub = minutes + hours * 60;
    var secondstoSub = seconds + minutestoSub * 60;
    var mstoSub = secondstoSub * 1000;
    var finalDate = new Date(dateWithoutDays.getTime() - mstoSub);
    return finalDate;
  }

  /**
   * @name intervalToDuration
   * @category Common Helpers
   * @summary Convert interval to duration
   *
   * @description
   * Convert a interval object to a duration object.
   *
   * @param {Interval} interval - the interval to convert to duration
   *
   * @returns {Duration} The duration Object
   * @throws {TypeError} Requires 2 arguments
   * @throws {RangeError} `start` must not be Invalid Date
   * @throws {RangeError} `end` must not be Invalid Date
   *
   * @example
   * // Get the duration between January 15, 1929 and April 4, 1968.
   * intervalToDuration({
   *   start: new Date(1929, 0, 15, 12, 0, 0),
   *   end: new Date(1968, 3, 4, 19, 5, 0)
   * })
   * // => { years: 39, months: 2, days: 20, hours: 7, minutes: 5, seconds: 0 }
   */

  function intervalToDuration(_ref) {
    var start = _ref.start,
        end = _ref.end;
    requiredArgs$2(1, arguments);
    var dateLeft = toDate(start);
    var dateRight = toDate(end);

    if (!isValid(dateLeft)) {
      throw new RangeError('Start Date is invalid');
    }

    if (!isValid(dateRight)) {
      throw new RangeError('End Date is invalid');
    }

    var duration = {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    };
    var sign = compareAsc(dateLeft, dateRight);
    duration.years = Math.abs(differenceInYears(dateLeft, dateRight));
    var remainingMonths = sub(dateLeft, {
      years: sign * duration.years
    });
    duration.months = Math.abs(differenceInMonths(remainingMonths, dateRight));
    var remainingDays = sub(remainingMonths, {
      months: sign * duration.months
    });
    duration.days = Math.abs(differenceInDays(remainingDays, dateRight));
    var remainingHours = sub(remainingDays, {
      days: sign * duration.days
    });
    duration.hours = Math.abs(differenceInHours(remainingHours, dateRight));
    var remainingMinutes = sub(remainingHours, {
      hours: sign * duration.hours
    });
    duration.minutes = Math.abs(differenceInMinutes(remainingMinutes, dateRight));
    var remainingSeconds = sub(remainingMinutes, {
      minutes: sign * duration.minutes
    });
    duration.seconds = Math.abs(differenceInSeconds(remainingSeconds, dateRight));
    return duration;
  }

  /**
   * @name isAfter
   * @category Common Helpers
   * @summary Is the first date after the second one?
   *
   * @description
   * Is the first date after the second one?
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date that should be after the other one to return true
   * @param {Date|Number} dateToCompare - the date to compare with
   * @returns {Boolean} the first date is after the second date
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Is 10 July 1989 after 11 February 1987?
   * var result = isAfter(new Date(1989, 6, 10), new Date(1987, 1, 11))
   * //=> true
   */

  function isAfter(dirtyDate, dirtyDateToCompare) {
    requiredArgs$2(2, arguments);
    var date = toDate(dirtyDate);
    var dateToCompare = toDate(dirtyDateToCompare);
    return date.getTime() > dateToCompare.getTime();
  }

  /**
   * @name isBefore
   * @category Common Helpers
   * @summary Is the first date before the second one?
   *
   * @description
   * Is the first date before the second one?
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date that should be before the other one to return true
   * @param {Date|Number} dateToCompare - the date to compare with
   * @returns {Boolean} the first date is before the second date
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Is 10 July 1989 before 11 February 1987?
   * var result = isBefore(new Date(1989, 6, 10), new Date(1987, 1, 11))
   * //=> false
   */

  function isBefore(dirtyDate, dirtyDateToCompare) {
    requiredArgs$2(2, arguments);
    var date = toDate(dirtyDate);
    var dateToCompare = toDate(dirtyDateToCompare);
    return date.getTime() < dateToCompare.getTime();
  }

  /**
   * @name isEqual
   * @category Common Helpers
   * @summary Are the given dates equal?
   *
   * @description
   * Are the given dates equal?
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} dateLeft - the first date to compare
   * @param {Date|Number} dateRight - the second date to compare
   * @returns {Boolean} the dates are equal
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Are 2 July 2014 06:30:45.000 and 2 July 2014 06:30:45.500 equal?
   * var result = isEqual(
   *   new Date(2014, 6, 2, 6, 30, 45, 0),
   *   new Date(2014, 6, 2, 6, 30, 45, 500)
   * )
   * //=> false
   */

  function isEqual(dirtyLeftDate, dirtyRightDate) {
    requiredArgs$2(2, arguments);
    var dateLeft = toDate(dirtyLeftDate);
    var dateRight = toDate(dirtyRightDate);
    return dateLeft.getTime() === dateRight.getTime();
  }

  /**
   * @name startOfHour
   * @category Hour Helpers
   * @summary Return the start of an hour for the given date.
   *
   * @description
   * Return the start of an hour for the given date.
   * The result will be in the local timezone.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the original date
   * @returns {Date} the start of an hour
   * @throws {TypeError} 1 argument required
   *
   * @example
   * // The start of an hour for 2 September 2014 11:55:00:
   * const result = startOfHour(new Date(2014, 8, 2, 11, 55))
   * //=> Tue Sep 02 2014 11:00:00
   */

  function startOfHour$1(dirtyDate) {
    requiredArgs$2(1, arguments);
    var date = toDate(dirtyDate);
    date.setMinutes(0, 0, 0);
    return date;
  }

  /**
   * @name isWithinInterval
   * @category Interval Helpers
   * @summary Is the given date within the interval?
   *
   * @description
   * Is the given date within the interval? (Including start and end.)
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * - The function was renamed from `isWithinRange` to `isWithinInterval`.
   *   This change was made to mirror the use of the word "interval" in standard ISO 8601:2004 terminology:
   *
   *   ```
   *   2.1.3
   *   time interval
   *   part of the time axis limited by two instants
   *   ```
   *
   *   Also, this function now accepts an object with `start` and `end` properties
   *   instead of two arguments as an interval.
   *   This function now throws `RangeError` if the start of the interval is after its end
   *   or if any date in the interval is `Invalid Date`.
   *
   *   ```javascript
   *   // Before v2.0.0
   *
   *   isWithinRange(
   *     new Date(2014, 0, 3),
   *     new Date(2014, 0, 1), new Date(2014, 0, 7)
   *   )
   *
   *   // v2.0.0 onward
   *
   *   isWithinInterval(
   *     new Date(2014, 0, 3),
   *     { start: new Date(2014, 0, 1), end: new Date(2014, 0, 7) }
   *   )
   *   ```
   *
   * @param {Date|Number} date - the date to check
   * @param {Interval} interval - the interval to check
   * @returns {Boolean} the date is within the interval
   * @throws {TypeError} 2 arguments required
   * @throws {RangeError} The start of an interval cannot be after its end
   * @throws {RangeError} Date in interval cannot be `Invalid Date`
   *
   * @example
   * // For the date within the interval:
   * isWithinInterval(new Date(2014, 0, 3), {
   *   start: new Date(2014, 0, 1),
   *   end: new Date(2014, 0, 7)
   * })
   * //=> true
   *
   * @example
   * // For the date outside of the interval:
   * isWithinInterval(new Date(2014, 0, 10), {
   *   start: new Date(2014, 0, 1),
   *   end: new Date(2014, 0, 7)
   * })
   * //=> false
   *
   * @example
   * // For date equal to interval start:
   * isWithinInterval(date, { start, end: date }) // => true
   *
   * @example
   * // For date equal to interval end:
   * isWithinInterval(date, { start: date, end }) // => true
   */
  function isWithinInterval(dirtyDate, interval) {
    requiredArgs$2(2, arguments);
    var time = toDate(dirtyDate).getTime();
    var startTime = toDate(interval.start).getTime();
    var endTime = toDate(interval.end).getTime(); // Throw an exception if start date is after end date or if any date is `Invalid Date`

    if (!(startTime <= endTime)) {
      throw new RangeError('Invalid interval');
    }

    return time >= startTime && time <= endTime;
  }

  // Leap year occures every 4 years, except for years that are divisable by 100 and not divisable by 400.
  // 1 mean year = (365+1/4-1/100+1/400) days = 365.2425 days
  var daysInYear = 365.2425;
  /**
   * @name milliseconds
   * @category Millisecond Helpers
   * @summary
   * Returns the number of milliseconds in the specified, years, months, weeks, days, hours, minutes and seconds.
   *
   * @description
   * Returns the number of milliseconds in the specified, years, months, weeks, days, hours, minutes and seconds.
   *
   * One years equals 365.2425 days according to the formula:
   *
   * > Leap year occures every 4 years, except for years that are divisable by 100 and not divisable by 400.
   * > 1 mean year = (365+1/4-1/100+1/400) days = 365.2425 days
   *
   * One month is a year divided by 12.
   *
   * @param {Duration} duration - the object with years, months, weeks, days, hours, minutes and seconds to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {number} the milliseconds
   * @throws {TypeError} 1 argument required
   *
   * @example
   * // 1 year in milliseconds
   * milliseconds({ years: 1 })
   * //=> 31556952000
   *
   * // 3 months in milliseconds
   * milliseconds({ months: 3 })
   * //=> 7889238000
   */

  function milliseconds(_ref) {
    var years = _ref.years,
        months = _ref.months,
        weeks = _ref.weeks,
        days = _ref.days,
        hours = _ref.hours,
        minutes = _ref.minutes,
        seconds = _ref.seconds;
    requiredArgs$2(1, arguments);
    var totalDays = 0;
    if (years) totalDays += years * daysInYear;
    if (months) totalDays += months * (daysInYear / 12);
    if (weeks) totalDays += weeks * 7;
    if (days) totalDays += days;
    var totalSeconds = totalDays * 24 * 60 * 60;
    if (hours) totalSeconds += hours * 60 * 60;
    if (minutes) totalSeconds += minutes * 60;
    if (seconds) totalSeconds += seconds;
    return Math.round(totalSeconds * 1000);
  }

  /**
   * @name setHours
   * @category Hour Helpers
   * @summary Set the hours to the given date.
   *
   * @description
   * Set the hours to the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} hours - the hours of the new date
   * @returns {Date} the new date with the hours set
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Set 4 hours to 1 September 2014 11:30:00:
   * var result = setHours(new Date(2014, 8, 1, 11, 30), 4)
   * //=> Mon Sep 01 2014 04:30:00
   */

  function setHours$1(dirtyDate, dirtyHours) {
    requiredArgs$2(2, arguments);
    var date = toDate(dirtyDate);
    var hours = toInteger$2(dirtyHours);
    date.setHours(hours);
    return date;
  }

  /**
   * @name subHours
   * @category Hour Helpers
   * @summary Subtract the specified number of hours from the given date.
   *
   * @description
   * Subtract the specified number of hours from the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} amount - the amount of hours to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {Date} the new date with the hours subtracted
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Subtract 2 hours from 11 July 2014 01:00:00:
   * const result = subHours(new Date(2014, 6, 11, 1, 0), 2)
   * //=> Thu Jul 10 2014 23:00:00
   */

  function subHours$1(dirtyDate, dirtyAmount) {
    requiredArgs$2(2, arguments);
    var amount = toInteger$2(dirtyAmount);
    return addHours$1(dirtyDate, -amount);
  }

  /**
   * @name subMinutes
   * @category Minute Helpers
   * @summary Subtract the specified number of minutes from the given date.
   *
   * @description
   * Subtract the specified number of minutes from the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} amount - the amount of minutes to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {Date} the new date with the minutes subtracted
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Subtract 30 minutes from 10 July 2014 12:00:00:
   * const result = subMinutes(new Date(2014, 6, 10, 12, 0), 30)
   * //=> Thu Jul 10 2014 11:30:00
   */

  function subMinutes$1(dirtyDate, dirtyAmount) {
    requiredArgs$2(2, arguments);
    var amount = toInteger$2(dirtyAmount);
    return addMinutes$1(dirtyDate, -amount);
  }

  /**
   * @name subSeconds
   * @category Second Helpers
   * @summary Subtract the specified number of seconds from the given date.
   *
   * @description
   * Subtract the specified number of seconds from the given date.
   *
   * ### v2.0.0 breaking changes:
   *
   * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
   *
   * @param {Date|Number} date - the date to be changed
   * @param {Number} amount - the amount of seconds to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
   * @returns {Date} the new date with the seconds subtracted
   * @throws {TypeError} 2 arguments required
   *
   * @example
   * // Subtract 30 seconds from 10 July 2014 12:45:00:
   * const result = subSeconds(new Date(2014, 6, 10, 12, 45, 0), 30)
   * //=> Thu Jul 10 2014 12:44:30
   */

  function subSeconds$1(dirtyDate, dirtyAmount) {
    requiredArgs$2(2, arguments);
    var amount = toInteger$2(dirtyAmount);
    return addSeconds$1(dirtyDate, -amount);
  }

  function getDefaultExportFromCjs (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  var toInteger$1 = {exports: {}};

  (function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = toInteger;

  function toInteger(dirtyNumber) {
    if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {
      return NaN;
    }

    var number = Number(dirtyNumber);

    if (isNaN(number)) {
      return number;
    }

    return number < 0 ? Math.ceil(number) : Math.floor(number);
  }

  module.exports = exports.default;
  }(toInteger$1, toInteger$1.exports));

  var toInteger = /*@__PURE__*/getDefaultExportFromCjs(toInteger$1.exports);

  var requiredArgs$1 = {exports: {}};

  (function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = requiredArgs;

  function requiredArgs(required, args) {
    if (args.length < required) {
      throw new TypeError(required + ' argument' + (required > 1 ? 's' : '') + ' required, but only ' + args.length + ' present');
    }
  }

  module.exports = exports.default;
  }(requiredArgs$1, requiredArgs$1.exports));

  var requiredArgs = /*@__PURE__*/getDefaultExportFromCjs(requiredArgs$1.exports);

  var getTimezoneOffsetInMilliseconds$1 = {exports: {}};

  (function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = getTimezoneOffsetInMilliseconds;

  /**
   * Google Chrome as of 67.0.3396.87 introduced timezones with offset that includes seconds.
   * They usually appear for dates that denote time before the timezones were introduced
   * (e.g. for 'Europe/Prague' timezone the offset is GMT+00:57:44 before 1 October 1891
   * and GMT+01:00:00 after that date)
   *
   * Date#getTimezoneOffset returns the offset in minutes and would return 57 for the example above,
   * which would lead to incorrect calculations.
   *
   * This function returns the timezone offset in milliseconds that takes seconds in account.
   */
  function getTimezoneOffsetInMilliseconds(date) {
    var utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()));
    utcDate.setUTCFullYear(date.getFullYear());
    return date.getTime() - utcDate.getTime();
  }

  module.exports = exports.default;
  }(getTimezoneOffsetInMilliseconds$1, getTimezoneOffsetInMilliseconds$1.exports));

  var getTimezoneOffsetInMilliseconds = /*@__PURE__*/getDefaultExportFromCjs(getTimezoneOffsetInMilliseconds$1.exports);

  function addDays(dirtyDate, dirtyAmount) {
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

  let addHours = addHours$1;
  let addMilliseconds = addMilliseconds$1;
  let addMinutes = addMinutes$1;
  let addSeconds = addSeconds$1;

  function endOfDay(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      date.setUTCHours(23, 59, 59, 999);
      return date;
  }

  function endOfHour(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      date.setUTCMinutes(59, 59, 999);
      return date;
  }

  function endOfMinute(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      date.setUTCSeconds(59, 999);
      return date;
  }

  function endOfSecond(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      date.setUTCMilliseconds(999);
      return date;
  }

  function getDate(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      const dayOfMonth = date.getUTCDate();
      return dayOfMonth;
  }

  function getDay(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      const day = date.getUTCDay();
      return day;
  }

  function getHours(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      const hours = date.getUTCHours();
      return hours;
  }

  function getMilliseconds(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      const milliseconds = date.getUTCMilliseconds();
      return milliseconds;
  }

  function getMinutes(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      const minutes = date.getUTCMinutes();
      return minutes;
  }

  function getSeconds(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      const seconds = date.getUTCSeconds();
      return seconds;
  }

  function setDate(dirtyDate, dirtyDayOfMonth) {
      requiredArgs(2, arguments);

      const date = toDate(dirtyDate);
      const dayOfMonth = toInteger(dirtyDayOfMonth);
      date.setUTCDate(dayOfMonth);
      return date;
  }

  function setHours(dirtyDate, dirtyHours) {
      requiredArgs(2, arguments);

      const date = toDate(dirtyDate);
      const hours = toInteger(dirtyHours);
      date.setUTCHours(hours);
      return date;
  }

  function setMilliseconds(dirtyDate, dirtyMilliseconds) {
      requiredArgs(2, arguments);

      const date = toDate(dirtyDate);
      const milliseconds = toInteger(dirtyMilliseconds);
      date.setUTCMilliseconds(milliseconds);
      return date;
  }

  function setMinutes(dirtyDate, dirtyMinutes) {
      requiredArgs(2, arguments);

      const date = toDate(dirtyDate);
      const minutes = toInteger(dirtyMinutes);
      date.setUTCMinutes(minutes);
      return date;
  }

  function setSeconds(dirtyDate, dirtySeconds) {
      requiredArgs(2, arguments);

      const date = toDate(dirtyDate);
      const seconds = toInteger(dirtySeconds);
      date.setUTCSeconds(seconds);
      return date;
  }

  function startOfDay(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      date.setUTCHours(0, 0, 0, 0);
      return date;
  }

  function startOfHour(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      date.setUTCMinutes(0, 0, 0);
      return date;
  }

  function startOfMinute(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      date.setUTCSeconds(0, 0);
      return date;
  }

  function startOfSecond(dirtyDate) {
      requiredArgs(1, arguments);

      const date = toDate(dirtyDate);
      date.setUTCMilliseconds(0);
      return date;
  }

  function subDays(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);

      const amount = toInteger(dirtyAmount);
      return addDays(dirtyDate, -amount);
  }

  let subHours = subHours$1;
  let subMilliseconds = subMilliseconds$1;
  let subMinutes = subMinutes$1;
  let subSeconds = subSeconds$1;

  function toUTCDate(dirtyDate) {
      const date = toDate(dirtyDate);
      // return Date.UTC(date.getUTCFullYear(),
      //                 date.getUTCMonth(),
      //                 date.getUTCDate(),
      //                 date.getUTCHours(),
      //                 date.getUTCMinutes(),
      //                 date.getUTCSeconds(),
      //                 date.getUTCMilliseconds());
      const utcDate = addMilliseconds$1(date, getTimezoneOffsetInMilliseconds(date));
      return utcDate;
  }

  var index = /*#__PURE__*/Object.freeze({
    __proto__: null,
    addDays: addDays,
    addHours: addHours,
    addMilliseconds: addMilliseconds,
    addMinutes: addMinutes,
    addSeconds: addSeconds,
    endOfDay: endOfDay,
    endOfHour: endOfHour,
    endOfMinute: endOfMinute,
    endOfSecond: endOfSecond,
    getDate: getDate,
    getDay: getDay,
    getHours: getHours,
    getMilliseconds: getMilliseconds,
    getMinutes: getMinutes,
    getSeconds: getSeconds,
    setDate: setDate,
    setHours: setHours,
    setMilliseconds: setMilliseconds,
    setMinutes: setMinutes,
    setSeconds: setSeconds,
    startOfDay: startOfDay,
    startOfHour: startOfHour,
    startOfMinute: startOfMinute,
    startOfSecond: startOfSecond,
    subDays: subDays,
    subHours: subHours,
    subMilliseconds: subMilliseconds,
    subMinutes: subMinutes,
    subSeconds: subSeconds,
    toDate: toUTCDate
  });

  function isSameOrAfter(dirtyDate, dirtyDateToCompare) {
      const date = toDate(dirtyDate);
      const dateToCompare = toDate(dirtyDateToCompare);
      return date.getTime() >= dateToCompare.getTime();
  }

  function isSameOrBefore(dirtyDate, dirtyDateToCompare) {
      const date = toDate(dirtyDate);
      const dateToCompare = toDate(dirtyDateToCompare);
      return date.getTime() <= dateToCompare.getTime();
  }

  function intervalAfter(dirtyDate, duration) {
      const date = toDate(dirtyDate);
      return {start: date, end: add(date, duration)};
  }

  function intervalBefore(dirtyDate, duration) {
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

  function normalizeDuration(dirtyDuration) {
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

  function doesintervalAbutStart(dirtyInterval, dirtyOtherInterval) {
      const intervalEndTime = toDate(dirtyInterval.end).getTime();
      const otherIntervalStartTime = toDate(dirtyOtherInterval.start).getTime();
      return intervalEndTime === otherIntervalStartTime;
  }

  function doesIntervalAbutEnd(dirtyInterval, dirtyOtherInterval) {
      const intervalStartTime = toDate(dirtyInterval.start).getTime();
      const otherIntervalEndTime = toDate(dirtyOtherInterval.end).getTime();
      return otherIntervalEndTime === intervalStartTime;
  }

  function intervalUnion(interval, otherInterval) {
      const intervalStartTime = toDate(interval.start).getTime();
      const intervalEndTime = toDate(interval.end).getTime();
      const otherIntervalStartTime = toDate(otherInterval.start).getTime();
      const otherIntervalEndTime = toDate(otherInterval.end).getTime();

      const start = intervalStartTime < otherIntervalStartTime ? intervalStartTime : otherIntervalStartTime;
      const end = intervalEndTime > otherIntervalEndTime ? intervalEndTime : otherIntervalEndTime;
      return { start: start, end: end };
  }

  function intervalIntersection(interval, otherInterval) {
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

  function intervalMerge(intervals) {
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

  function intervalXor(...intervals) {
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

  exports.add = add;
  exports.addHours = addHours$1;
  exports.addMinutes = addMinutes$1;
  exports.areIntervalsOverlapping = areIntervalsOverlapping;
  exports.compareAsc = compareAsc;
  exports.defaultLocale = defaultLocale;
  exports.differenceInMilliseconds = differenceInMilliseconds;
  exports.differenceInMinutes = differenceInMinutes;
  exports.doesIntervalAbutEnd = doesIntervalAbutEnd;
  exports.doesintervalAbutStart = doesintervalAbutStart;
  exports.format = format;
  exports.formatDistanceStrict = formatDistanceStrict;
  exports.formatDuration = formatDuration;
  exports.formatISO = formatISO;
  exports.formatRelative = formatRelative;
  exports.getDayOfYear = getDayOfYear;
  exports.getHours = getHours$1;
  exports.intervalAfter = intervalAfter;
  exports.intervalBefore = intervalBefore;
  exports.intervalIntersection = intervalIntersection;
  exports.intervalMerge = intervalMerge;
  exports.intervalToDuration = intervalToDuration;
  exports.intervalUnion = intervalUnion;
  exports.intervalXor = intervalXor;
  exports.isAfter = isAfter;
  exports.isBefore = isBefore;
  exports.isEqual = isEqual;
  exports.isSameOrAfter = isSameOrAfter;
  exports.isSameOrBefore = isSameOrBefore;
  exports.isWithinInterval = isWithinInterval;
  exports.milliseconds = milliseconds;
  exports.normalizeDuration = normalizeDuration;
  exports.setHours = setHours$1;
  exports.startOfHour = startOfHour$1;
  exports.sub = sub;
  exports.subDays = subDays$1;
  exports.subHours = subHours$1;
  exports.toDate = toDate;
  exports.utc = index;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

})({});
//# sourceMappingURL=dateFns.js.map
