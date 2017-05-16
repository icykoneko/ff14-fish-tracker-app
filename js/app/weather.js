const WEATHER_TYPES = {
  "1": {"name": "Clear Skies", "icon": "060201.png"}, "2": {"name": "Fair Skies", "icon": "060202.png"}, "3": {"name": "Clouds", "icon": "060203.png"}, "4": {"name": "Fog", "icon": "060204.png"}, "5": {"name": "Wind", "icon": "060205.png"}, "6": {"name": "Gales", "icon": "060206.png"}, "7": {"name": "Rain", "icon": "060207.png"}, "8": {"name": "Showers", "icon": "060208.png"}, "9": {"name": "Thunder", "icon": "060209.png"}, "10": {"name": "Thunderstorms", "icon": "060210.png"}, "11": {"name": "Dust Storms", "icon": "060211.png"}, "14": {"name": "Heat Waves", "icon": "060214.png"}, "15": {"name": "Snow", "icon": "060215.png"}, "16": {"name": "Blizzards", "icon": "060216.png"}, "17": {"name": "Gloom", "icon": "060218.png"}, "50": {"name": "Umbral Static", "icon": "060220.png"}, "49": {"name": "Umbral Wind", "icon": "060219.png"}
};
const WEATHER_RATES = {
  "128": {"map_id": 11, "weather_rates": [[3, 20], [1, 50], [2, 80], [4, 90], [7, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Limsa Lominsa Upper Decks", "zone_id": 28}, "129": {"map_id": 12, "weather_rates": [[3, 20], [1, 50], [2, 80], [4, 90], [7, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Limsa Lominsa Lower Decks", "zone_id": 29}, "130": {"map_id": 13, "weather_rates": [[1, 40], [2, 60], [3, 85], [4, 95], [7, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Ul'dah - Steps of Nald", "zone_id": 40}, "131": {"map_id": 14, "weather_rates": [[1, 40], [2, 60], [3, 85], [4, 95], [7, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Ul'dah - Steps of Thal", "zone_id": 41}, "132": {"map_id": 2, "weather_rates": [[7, 5], [7, 20], [4, 30], [3, 40], [2, 55], [1, 85], [2, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "New Gridania", "zone_id": 52}, "133": {"map_id": 3, "weather_rates": [[7, 5], [7, 20], [4, 30], [3, 40], [2, 55], [1, 85], [2, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "Old Gridania", "zone_id": 53}, "134": {"map_id": 15, "weather_rates": [[3, 20], [1, 50], [2, 70], [5, 80], [4, 90], [7, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Middle La Noscea", "zone_id": 30}, "135": {"map_id": 16, "weather_rates": [[3, 20], [1, 50], [2, 70], [5, 80], [4, 90], [7, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Lower La Noscea", "zone_id": 31}, "137": {"map_id": 17, "weather_rates": [[4, 5], [1, 50], [2, 80], [3, 90], [7, 95], [8, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Eastern La Noscea", "zone_id": 32}, "138": {"map_id": 18, "weather_rates": [[4, 10], [1, 40], [2, 60], [3, 80], [5, 90], [6, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Western La Noscea", "zone_id": 33}, "139": {"map_id": 19, "weather_rates": [[1, 30], [2, 50], [3, 70], [4, 80], [9, 90], [10, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Upper La Noscea", "zone_id": 34}, "140": {"map_id": 20, "weather_rates": [[1, 40], [2, 60], [3, 85], [4, 95], [7, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Western Thanalan", "zone_id": 42}, "141": {"map_id": 21, "weather_rates": [[11, 15], [1, 55], [2, 75], [3, 85], [4, 95], [7, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Central Thanalan", "zone_id": 43}, "398": {"map_id": 212, "weather_rates": [[3, 10], [4, 20], [9, 30], [11, 40], [1, 70], [2, 100]], "region_name": "Dravania", "region_id": 498, "zone_name": "The Dravanian Forelands", "zone_id": 2000}, "399": {"map_id": 213, "weather_rates": [[3, 10], [4, 20], [7, 30], [8, 40], [1, 70], [2, 100]], "region_name": "Dravania", "region_id": 498, "zone_name": "The Dravanian Hinterlands", "zone_id": 2001}, "400": {"map_id": 214, "weather_rates": [[3, 10], [6, 20], [50, 40], [1, 70], [2, 100]], "region_name": "Dravania", "region_id": 498, "zone_name": "The Churning Mists", "zone_id": 2002}, "145": {"map_id": 22, "weather_rates": [[1, 40], [2, 60], [3, 70], [4, 80], [7, 85], [8, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Eastern Thanalan", "zone_id": 44}, "146": {"map_id": 23, "weather_rates": [[14, 20], [1, 60], [2, 80], [3, 90], [4, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Southern Thanalan", "zone_id": 45}, "147": {"map_id": 24, "weather_rates": [[1, 5], [2, 20], [3, 50], [4, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Northern Thanalan", "zone_id": 46}, "148": {"map_id": 4, "weather_rates": [[9, 5], [7, 20], [4, 30], [3, 40], [2, 55], [1, 85], [2, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "Central Shroud", "zone_id": 54}, "152": {"map_id": 5, "weather_rates": [[9, 5], [7, 20], [4, 30], [3, 40], [2, 55], [1, 85], [2, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "East Shroud", "zone_id": 55}, "153": {"map_id": 6, "weather_rates": [[4, 5], [10, 10], [9, 25], [4, 30], [3, 40], [2, 70], [1, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "South Shroud", "zone_id": 56}, "154": {"map_id": 7, "weather_rates": [[4, 5], [8, 10], [7, 25], [4, 30], [3, 40], [2, 70], [1, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "North Shroud", "zone_id": 57}, "155": {"map_id": 53, "weather_rates": [[16, 20], [15, 60], [2, 70], [1, 75], [3, 90], [4, 100]], "region_name": "Coerthas", "region_id": 25, "zone_name": "Coerthas Central Highlands", "zone_id": 63}, "156": {"map_id": 25, "weather_rates": [[3, 15], [4, 30], [17, 60], [1, 75], [2, 100]], "region_name": "Mor Dhona", "region_id": 26, "zone_name": "Mor Dhona", "zone_id": 67}, "418": {"map_id": 218, "weather_rates": [[15, 60], [2, 70], [1, 75], [3, 90], [4, 100]], "region_name": "Coerthas", "region_id": 25, "zone_name": "Foundation", "zone_id": 2300}, "419": {"map_id": 219, "weather_rates": [[15, 60], [2, 70], [1, 75], [3, 90], [4, 100]], "region_name": "Coerthas", "region_id": 25, "zone_name": "The Pillars", "zone_id": 2301}, "180": {"map_id": 30, "weather_rates": [[1, 30], [2, 50], [3, 70], [4, 85], [7, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Outer La Noscea", "zone_id": 350}, "397": {"map_id": 211, "weather_rates": [[16, 20], [15, 60], [2, 70], [1, 75], [3, 90], [4, 100]], "region_name": "Coerthas", "region_id": 25, "zone_name": "Coerthas Western Highlands", "zone_id": 2200}, "339": {"map_id": 72, "weather_rates": [[3, 20], [1, 50], [2, 70], [2, 80], [4, 90], [7, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Mist", "zone_id": 425}, "340": {"map_id": 82, "weather_rates": [[3, 5], [7, 20], [4, 30], [3, 40], [2, 55], [1, 85], [2, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "The Lavender Beds", "zone_id": 426}, "341": {"map_id": 83, "weather_rates": [[1, 40], [2, 60], [3, 85], [4, 95], [7, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "The Goblet", "zone_id": 427}, "478": {"map_id": 257, "weather_rates": [[3, 10], [4, 20], [7, 30], [8, 40], [1, 70], [2, 100]], "region_name": "Dravania", "region_id": 498, "zone_name": "Idyllshire", "zone_id": 2082}, "401": {"map_id": 215, "weather_rates": [[1, 30], [2, 60], [3, 70], [4, 80], [5, 90], [49, 100]], "region_name": "Abalathia's Spine", "region_id": 497, "zone_name": "The Sea of Clouds", "zone_id": 2100}, "402": {"map_id": 216, "weather_rates": [[2, 35], [3, 70], [9, 100]], "region_name": "Abalathia's Spine", "region_id": 497, "zone_name": "Azys Lla", "zone_id": 2101}
};

function weatherForArea(area, target) {
  var rate = _(WEATHER_RATES[area].weather_rates).find((r) => { return target < r[1]; });
  return rate[0];
}

function startOfPeriod(m) {
  return m.hour(parseInt(m.hour() / 8) * 8).startOf('hour');
}

class WeatherService {
  constructor() {
    // Cache weather information.
    this.__weatherData = [];
    // Every Eorzean day, prune out entries that are over 2 days old.
    eorzeaTime.currentBellChanged.subscribe(
      (bell) => this.onCurrentBellChanged(bell)
    );
  }

  onCurrentBellChanged(bell) {
    if (bell == 0 || bell == 8 || bell == 16) {
      console.info("Weather interval changed...");
      if (this.__weatherData.length > 0) {
        var cutoffDate = startOfPeriod(eorzeaTime.getCurrentEorzeaDate()).subtract(2, 'days');
        if (_(this.__weatherData).first().date < cutoffDate) {
          this.__weatherData = _(this.__weatherData).drop();
        }
        console.log("Weather Cache:", this.__weatherData.length, "entries spanning",
          moment.duration(eorzeaTime.toEarth(moment.utc(_(this.__weatherData).first().date).twix(
            moment.utc(_(this.__weatherData).last().date).add(8, 'hours'))
            .asDuration('milliseconds')).valueOf(), 'milliseconds')
            .asDays().toFixed(2), "days");
      }
    }
  }

  insertForcast(date, target) {
    // Protect the table from me being stupid... Look, it happens to us all
    if (moment.isMoment(date)) {
      date = +date;
    }
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
    var unixTime = m.unix();
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
      date = startOfPeriod(moment(date).subtract(8, 'hours'));
    } else {
      date = startOfPeriod(moment(date));
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
      lastDate = moment.utc(w.date);
      currentWeather = weatherForArea(area, w.target);
      // Has the previous weather condition been met?
      if (previousWeatherSet.length > 0 && !_(previousWeatherSet).contains(previousWeather)) {
        continue;
      }
      // Does the current weather condition work?
      if (currentWeatherSet.length == 0 || _(currentWeatherSet).contains(currentWeather)) {
        // Yield a date range for this weather period.
        yield moment.duration(8, 'hours').afterMoment(moment.utc(w.date));
      }
    }
    // That's it for the cached data, now you'll need to generate more...
    if (lastDate !== null) {
      // Resume, starting with the NEXT period!!!
      date = lastDate.add(8, 'hours');
    }
    // SAFEGUARD
    while (limit-- > 0) {
      // Move the *previous* current weather into previous weather.
      previousWeather = currentWeather;
      lastDate = moment.utc(date);
      // Calculate the next weather target and insert into the table.
      date.add(8, 'hours');
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
