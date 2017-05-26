dateFns.utc = (() => {
  var parse = dateFns.parse;
  const parseUTC = date => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()));
  return {
    addDays: (dirtyDate, dirtyAmount) => {
      var date = parse(dirtyDate);
      var amount = Number(dirtyAmount);
      date.setUTCDate(date.getUTCDate() + amount);
      return date;
    },
    addHours: dateFns.addHours,
    addMilliseconds: dateFns.addMilliseconds,
    addMinutes: dateFns.addMinutes,
    addSeconds: dateFns.addSeconds,

    endOfDay: (dirtyDate) => {
      var date = parse(dirtyDate);
      date.setUTCHours(23, 59, 59, 999);
      return date;
    },
    endOfHour: (dirtyDate) => {
      var date = parse(dirtyDate);
      date.setUTCMinutes(59, 59, 999);
      return date;
    },
    endOfMinute: (dirtyDate) => {
      var date = parse(dirtyDate);
      date.setUTCSeconds(59, 999);
      return date;
    },
    endOfSecond: (dirtyDate) => {
      var date = parse(dirtyDate);
      date.setUTCMilliseconds(999);
      return date;
    },

    getDate: (dirtyDate) => {
      var date = parse(dirtyDate);
      var dayOfMonth = date.getUTCDate();
      return dayOfMonth;
    },
    getDay: (dirtyDate) => {
      var date = parse(dirtyDate);
      var day = date.getUTCDay();
      return day;
    },
    getHours: (dirtyDate) => {
      var date = parse(dirtyDate);
      var hours = date.getUTCHours();
      return hours;
    },
    getMilliseconds: (dirtyDate) => {
      var date = parse(dirtyDate);
      var milliseconds = date.getUTCMilliseconds();
      return milliseconds;
    },
    getMinutes: (dirtyDate) => {
      var date = parse(dirtyDate);
      var minutes = date.getUTCMinutes();
      return minutes;
    },
    getSeconds: (dirtyDate) => {
      var date = parse(dirtyDate);
      var seconds = date.getUTCSeconds();
      return seconds;
    },

    setDate: (dirtyDate, dirtyDayOfMonth) => {
      var date = parse(dirtyDate);
      var dayOfMonth = Number(dirtyDayOfMonth);
      date.setUTCDate(dayOfMonth);
      return date;
    },
    setHours: (dirtyDate, dirtyHours) => {
      var date = parse(dirtyDate);
      var hours = Number(dirtyHours);
      date.setUTCHours(hours);
      return date;
    },
    setMilliseconds: (dirtyDate, dirtyMilliseconds) => {
      var date = parse(dirtyDate);
      var milliseconds = Number(milliseconds);
      date.setUTCMilliseconds(milliseconds);
      return date;
    },
    setMinutes: (dirtyDate, dirtyMinutes) => {
      var date = parse(dirtyDate);
      var minutes = Number(dirtyMinutes);
      date.setUTCMinutes(minutes);
      return date;
    },
    setSeconds: (dirtyDate, dirtySeconds) => {
      var date = parse(dirtyDate);
      var seconds = Number(dirtySeconds);
      date.setUTCSeconds(seconds);
      return date;
    },

    startOfDay: (dirtyDate) => {
      var date = parse(dirtyDate);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    },
    startOfHour: (dirtyDate) => {
      var date = parse(dirtyDate);
      date.setUTCMinutes(0, 0, 0);
      return date;
    },
    startOfMinute: (dirtyDate) => {
      var date = parse(dirtyDate);
      date.setUTCSeconds(0, 0);
      return date;
    },
    startOfSecond: (dirtyDate) => {
      var date = parse(dirtyDate);
      date.setUTCMilliseconds(0);
      return date;
    },

    subDays: (dirtyDate, dirtyAmount) => {
      var amount = Number(dirtyAmount);
      return dateFns.utc.addDays(dirtyDate, -amount);
    },
    subHours: dateFns.subHours,
    subMilliseconds: dateFns.subMilliseconds,
    subMinutes: dateFns.subMinutes,
    subSeconds: dateFns.subSeconds,
  };
})();

(()=>{
  var parse = dateFns.parse;

  dateFns.isSameOrAfter = (dirtyDate, dirtyDateToCompare) => {
    var date = parse(dirtyDate);
    var dateToCompare = parse(dirtyDateToCompare);
    return date.getTime() >= dateToCompare.getTime();
  };
  dateFns.isSameOrBefore = (dirtyDate, dirtyDateToCompare) => {
    var date = parse(dirtyDate);
    var dateToCompare = parse(dirtyDateToCompare);
    return date.getTime() <= dateToCompare.getTime();
  };

})();
