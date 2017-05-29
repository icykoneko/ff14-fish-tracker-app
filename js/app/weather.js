function weatherForArea(area, target) {
  var rate = _(DATA.WEATHER_RATES[area].weather_rates).find((r) => { return target < r[1]; });
  return rate[0];
}

function startOfPeriod(d) {
  return dateFns.utc.startOfHour(
    dateFns.utc.setHours(d, parseInt(dateFns.utc.getHours(d) / 8) * 8));
}

class WeatherService {
  constructor() {
    // Cache weather information.
    this.__weatherData = [];
    // Every Eorzean day, prune out entries that are over 2 days old.
    eorzeaTime.currentBellChanged
      .filter((bell) => bell == 0 || bell == 8 || bell == 16)
      .skip(1) /* skip the first since we really don't have any filtering to do yet */
      .subscribe((bell) => this.onCurrentBellChanged(bell));
  }

  onCurrentBellChanged(bell) {
    if (bell == 0 || bell == 8 || bell == 16) {
      console.info("Weather interval changed...");
      if (this.__weatherData.length > 0) {
        var cutoffDate =
          dateFns.utc.subDays(startOfPeriod(
            eorzeaTime.getCurrentEorzeaDate()), 2);
        if (_(this.__weatherData).first().date < cutoffDate) {
          this.__weatherData = _(this.__weatherData).drop();
        }
        console.log("Weather Cache:", this.__weatherData.length, "entries spanning",
          (dateFns.differenceInMilliseconds(
            eorzeaTime.toEarth(
              dateFns.utc.addHours(_(this.__weatherData).last().date, 8)),
            eorzeaTime.toEarth(_(this.__weatherData).first().date)) / 86400000).toFixed(2),
          "days");
      }
    }
  }

  insertForcast(date, target) {
    // Make sure it's newer than the previous entry.
    // Technically, it should be newer by 8 hours...
    if (this.__weatherData.length > 0 && date <= _(this.__weatherData).last().date) {
      console.error("Attempted to insert record for earlier date.", date);
      return;
    }
    this.__weatherData.push({date: date, target: target});
  }

  calculateForcastTarget(m) {
    // Based on Rougeadyn's SaintCoinach library.
    var unixTime = parseInt(+m / 1000);
    // Get the Eorzea hour for weather start.
    var bell = unixTime / 175;
    // Magic needed for calculations:
    // 16:00 = 0, 00:00 = 8, 08:00 = 16 . . .
    var inc = (bell + 8 - (bell % 8)) % 24;
    // Take the Eorzea days since Unix Epoch.
    var totalDays = ((unixTime / 4200) << 32) >>> 0; // uint

    // Make the calculations.
    var calcBase = (totalDays * 100) + inc;
    var step1 = ((calcBase << 11) ^ calcBase) >>> 0;
    var step2 = ((step1 >>> 8) ^ step1) >>> 0;

    return step2 % 100;
  }

  *findWeatherPattern(date, area, previousWeatherSet, currentWeatherSet, limit = 10000) {
    // If a previous weather set is provided, yield the next period matching
    // the provided current weather set where the previous period matched the
    // provided previous weather set.
    if (previousWeatherSet.length > 0) {
      date = startOfPeriod(dateFns.utc.subHours(date, 8));
    } else {
      date = startOfPeriod(date);
    }
    // Yield a range covering the period for which this weather pattern occurs.
    var previousWeather = null;
    var currentWeather = null;
    var lastDate = null;
    // NOTE: Underscore's closures are NOT interables that can yield.
    var ww = _(this.__weatherData).filter((w) => w.date >= +date);
    for (let w of ww) {
      // Move the *previous* current weather into previous weather.
      previousWeather = currentWeather;
      // SAFEGUARD
      if (limit-- <= 0) return;

      // These must be computed, even if we continue without yielding.
      lastDate = w.date;
      currentWeather = weatherForArea(area, w.target);
      // Has the previous weather condition been met?
      if (previousWeatherSet.length > 0 && !_(previousWeatherSet).contains(previousWeather)) {
        continue;
      }
      // Does the current weather condition work?
      if (currentWeatherSet.length == 0 || _(currentWeatherSet).contains(currentWeather)) {
        // Yield a date range for this weather period.
        yield moment.duration(8, 'hours').afterMoment(moment.utc(lastDate));
      }
    }
    // That's it for the cached data, now you'll need to generate more...
    if (lastDate !== null) {
      // Resume, starting with the NEXT period!!!
      date = dateFns.utc.addHours(lastDate, 8);
    }
    // SAFEGUARD
    while (limit-- > 0) {
      // Move the *previous* current weather into previous weather.
      previousWeather = currentWeather;
      lastDate = new Date(date);
      // Calculate the next weather target and insert into the table.
      date = dateFns.addHours(date, 8);
      var target = this.calculateForcastTarget(eorzeaTime.toEarth(lastDate));
      this.insertForcast(lastDate, target);
      currentWeather = weatherForArea(area, target);
      // Has the previous weather condition been met?
      if (previousWeatherSet.length > 0 && !_(previousWeatherSet).contains(previousWeather)) {
        continue;
      }
      // Does the current weather condition work?
      if (currentWeatherSet.length == 0 || _(currentWeatherSet).contains(currentWeather)) {
        // Yield a date range for this weather period.
        yield moment.duration(8, 'hours').afterMoment(moment.utc(lastDate));
      }
    }
    // The end =D
  }
}

let weatherService = new WeatherService;
