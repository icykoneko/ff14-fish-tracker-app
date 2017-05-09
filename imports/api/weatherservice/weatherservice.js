import { Mongo } from 'meteor/mongo';
import { Tracker } from 'meteor/tracker';
import { eorzeaTime } from '../time/time.js';

export const Weather = new Mongo.Collection(/*'weather'*/null);

// // TODO: Replace this with data generated ourselves. I'd rather be using IDs, not strings...
// export const ZONE_WEATHER = {
//   "Limsa Lominsa Lower Decks":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],
//   "Limsa Lominsa Upper Decks":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],
//   "Middle La Noscea":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":70},{"weather":5,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],
//   "Lower La Noscea":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":70},{"weather":5,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],
//   "Eastern La Noscea":[{"weather":4,"rate":5},{"weather":1,"rate":50},{"weather":2,"rate":80},{"weather":3,"rate":90},{"weather":7,"rate":95},{"weather":8,"rate":100}],
//   "Western La Noscea":[{"weather":4,"rate":10},{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":80},{"weather":5,"rate":90},{"weather":6,"rate":100}],
//   "Upper La Noscea":[{"weather":1,"rate":30},{"weather":2,"rate":50},{"weather":3,"rate":70},{"weather":4,"rate":80},{"weather":9,"rate":90},{"weather":10,"rate":100}],
//   "Outer La Noscea":[{"weather":1,"rate":30},{"weather":2,"rate":50},{"weather":3,"rate":70},{"weather":4,"rate":85},{"weather":7,"rate":100}],
//   "Mist":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":70},{"weather":2,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],
//   "New Gridania":[{"weather":7,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],
//   "Old Gridania":[{"weather":7,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],
//   "Central Shroud":[{"weather":9,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],
//   "East Shroud":[{"weather":9,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],
//   "South Shroud":[{"weather":4,"rate":5},{"weather":10,"rate":10},{"weather":9,"rate":25},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":70},{"weather":1,"rate":100}],
//   "North Shroud":[{"weather":4,"rate":5},{"weather":8,"rate":10},{"weather":7,"rate":25},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":70},{"weather":1,"rate":100}],
//   "Lavender Beds":[{"weather":3,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],
//   "Ul'dah":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],
//   "Western Thanalan":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],
//   "Central Thanalan":[{"weather":11,"rate":15},{"weather":1,"rate":55},{"weather":2,"rate":75},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],
//   "Eastern Thanalan":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":70},{"weather":4,"rate":80},{"weather":7,"rate":85},{"weather":8,"rate":100}],
//   "Southern Thanalan":[{"weather":14,"rate":20},{"weather":1,"rate":60},{"weather":2,"rate":80},{"weather":3,"rate":90},{"weather":4,"rate":100}],
//   "Northern Thanalan":[{"weather":1,"rate":5},{"weather":2,"rate":20},{"weather":3,"rate":50},{"weather":4,"rate":100}],
//   "The Goblet":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],
//   "Ishgard":[{"weather":15,"rate":60},{"weather":2,"rate":70},{"weather":1,"rate":75},{"weather":3,"rate":90},{"weather":4,"rate":100}],
//   "Coerthas Central Highlands":[{"weather":16,"rate":20},{"weather":15,"rate":60},{"weather":2,"rate":70},{"weather":1,"rate":75},{"weather":3,"rate":90},{"weather":4,"rate":100}],
//   "Coerthas Western Highlands":[{"weather":16,"rate":20},{"weather":15,"rate":60},{"weather":2,"rate":70},{"weather":1,"rate":75},{"weather":3,"rate":90},{"weather":4,"rate":100}],
//   "Mor Dhona":[{"weather":3,"rate":15},{"weather":4,"rate":30},{"weather":17,"rate":60},{"weather":1,"rate":75},{"weather":2,"rate":100}],
//   "The Sea of Clouds":[{"weather":1,"rate":30},{"weather":2,"rate":60},{"weather":3,"rate":70},{"weather":4,"rate":80},{"weather":5,"rate":90},{"weather":49,"rate":100}],
//   "Azys Lla":[{"weather":2,"rate":35},{"weather":3,"rate":70},{"weather":9,"rate":100}],
//   "The Dravanian Forelands":[{"weather":3,"rate":10},{"weather":4,"rate":20},{"weather":9,"rate":30},{"weather":11,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}],
//   "The Dravanian Hinterlands":[{"weather":3,"rate":10},{"weather":4,"rate":20},{"weather":7,"rate":30},{"weather":8,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}],
//   "The Churning Mists":[{"weather":3,"rate":10},{"weather":6,"rate":20},{"weather":50,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}],
//   "Idyllshire":[{"weather":3,"rate":10},{"weather":4,"rate":20},{"weather":7,"rate":30},{"weather":8,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}]}
//
// // TODO: Missing a couple entries here.
// export const WEATHER = {
//   0: {'name': '', 'icon': '000000.png'}, 1: {'name': 'Clear Skies', 'icon': '060201.png'}, 2: {'name': 'Fair Skies', 'icon': '060202.png'}, 3: {'name': 'Clouds', 'icon': '060203.png'}, 4: {'name': 'Fog', 'icon': '060204.png'}, 5: {'name': 'Wind', 'icon': '060205.png'}, 6: {'name': 'Gales', 'icon': '060206.png'}, 7: {'name': 'Rain', 'icon': '060207.png'}, 8: {'name': 'Showers', 'icon': '060208.png'}, 9: {'name': 'Thunder', 'icon': '060209.png'}, 10: {'name': 'Thunderstorms', 'icon': '060210.png'}, 11: {'name': 'Dust Storms', 'icon': '060211.png'}, 12: {'name': 'Sandstorms', 'icon': '060212.png'}, 13: {'name': 'Hot Spells', 'icon': '060213.png'}, 14: {'name': 'Heat Waves', 'icon': '060214.png'}, 15: {'name': 'Snow', 'icon': '060215.png'}, 16: {'name': 'Blizzards', 'icon': '060216.png'}, 17: {'name': 'Gloom', 'icon': '060218.png'}, 18: {'name': 'Auroras', 'icon': '060217.png'}, 19: {'name': 'Darkness', 'icon': '060251.png'}, 20: {'name': 'Tension', 'icon': '060255.png'}, 21: {'name': 'Clouds', 'icon': '060203.png'}, 22: {'name': 'Storm Clouds', 'icon': '060259.png'}, 23: {'name': 'Rough Seas', 'icon': '060258.png'}, 24: {'name': 'Rough Seas', 'icon': '060258.png'}, 25: {'name': 'Louring', 'icon': '060257.png'}, 26: {'name': 'Heat Waves', 'icon': '060252.png'}, 27: {'name': 'Gloom', 'icon': '060256.png'}, 28: {'name': 'Gales', 'icon': '060253.png'}, 29: {'name': 'Eruptions', 'icon': '060254.png'}, 30: {'name': 'Fair Skies', 'icon': '060202.png'}, 31: {'name': 'Fair Skies', 'icon': '060202.png'}, 32: {'name': 'Fair Skies', 'icon': '060202.png'}, 33: {'name': 'Fair Skies', 'icon': '060202.png'}, 34: {'name': 'Fair Skies', 'icon': '060202.png'}, 35: {'name': 'Irradiance', 'icon': '060260.png'}, 36: {'name': 'Core Radiation', 'icon': '060261.png'}, 37: {'name': 'Core Radiation', 'icon': '060261.png'}, 38: {'name': 'Core Radiation', 'icon': '060261.png'}, 39: {'name': 'Core Radiation', 'icon': '060261.png'}, 40: {'name': 'Shelf Clouds', 'icon': '060262.png'}, 41: {'name': 'Shelf Clouds', 'icon': '060262.png'}, 42: {'name': 'Shelf Clouds', 'icon': '060262.png'}, 43: {'name': 'Shelf Clouds', 'icon': '060262.png'}, 44: {'name': 'Oppression', 'icon': '060264.png'}, 45: {'name': 'Oppression', 'icon': '060264.png'}, 46: {'name': 'Oppression', 'icon': '060264.png'}, 47: {'name': 'Oppression', 'icon': '060264.png'}, 48: {'name': 'Oppression', 'icon': '060264.png'}, 49: {'name': 'Umbral Wind', 'icon': '060219.png'}, 50: {'name': 'Umbral Static', 'icon': '060220.png'}, 51: {'name': 'Smoke', 'icon': '060263.png'}, 52: {'name': 'Fair Skies', 'icon': '060202.png'}, 53: {'name': 'Royal Levin', 'icon': '060226.png'}, 54: {'name': 'Hyperelectricity', 'icon': '060227.png'}, 55: {'name': 'Royal Levin', 'icon': '060226.png'}, 56: {'name': 'Oppression', 'icon': '060264.png'}, 57: {'name': 'Thunder', 'icon': '060209.png'}, 58: {'name': 'Thunder', 'icon': '060209.png'}, 59: {'name': 'CutScene', 'icon': '000000.png'}, 60: {'name': 'Multiplicity', 'icon': '060265.png'}, 61: {'name': 'Multiplicity', 'icon': '060265.png'}, 62: {'name': 'Rain', 'icon': '060207.png'}, 63: {'name': 'Fair Skies', 'icon': '060202.png'}, 64: {'name': 'Rain', 'icon': '060207.png'}, 65: {'name': 'Fair Skies', 'icon': '060202.png'}, 66: {'name': 'Dragonstorm', 'icon': '060266.png'}, 67: {'name': 'Dragonstorm', 'icon': '060266.png'}, 68: {'name': 'Subterrain', 'icon': '060202.png'}, 69: {'name': 'Concordance', 'icon': '060267.png'}, 70: {'name': 'Concordance', 'icon': '060267.png'}, 71: {'name': 'Beyond Time', 'icon': '060268.png'}, 72: {'name': 'Beyond Time', 'icon': '060268.png'}, 73: {'name': 'Beyond Time', 'icon': '060268.png'}, 74: {'name': 'Demonic Infinity', 'icon': '060269.png'}, 75: {'name': 'Demonic Infinity', 'icon': '060269.png'}, 76: {'name': 'Demonic Infinity', 'icon': '060269.png'}};
//
export const WEATHER_TYPES = {
  "1": {"name": "Clear Skies", "icon": "060201.png"}, "2": {"name": "Fair Skies", "icon": "060202.png"}, "3": {"name": "Clouds", "icon": "060203.png"}, "4": {"name": "Fog", "icon": "060204.png"}, "5": {"name": "Wind", "icon": "060205.png"}, "6": {"name": "Gales", "icon": "060206.png"}, "7": {"name": "Rain", "icon": "060207.png"}, "8": {"name": "Showers", "icon": "060208.png"}, "9": {"name": "Thunder", "icon": "060209.png"}, "10": {"name": "Thunderstorms", "icon": "060210.png"}, "11": {"name": "Dust Storms", "icon": "060211.png"}, "14": {"name": "Heat Waves", "icon": "060214.png"}, "15": {"name": "Snow", "icon": "060215.png"}, "16": {"name": "Blizzards", "icon": "060216.png"}, "17": {"name": "Gloom", "icon": "060218.png"}, "50": {"name": "Umbral Static", "icon": "060220.png"}, "49": {"name": "Umbral Wind", "icon": "060219.png"}
};
export const WEATHER_RATES = {
  "128": {"map_id": 11, "weather_rates": [[3, 20], [1, 50], [2, 80], [4, 90], [7, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Limsa Lominsa Upper Decks", "zone_id": 28}, "129": {"map_id": 12, "weather_rates": [[3, 20], [1, 50], [2, 80], [4, 90], [7, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Limsa Lominsa Lower Decks", "zone_id": 29}, "130": {"map_id": 13, "weather_rates": [[1, 40], [2, 60], [3, 85], [4, 95], [7, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Ul'dah - Steps of Nald", "zone_id": 40}, "131": {"map_id": 14, "weather_rates": [[1, 40], [2, 60], [3, 85], [4, 95], [7, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Ul'dah - Steps of Thal", "zone_id": 41}, "132": {"map_id": 2, "weather_rates": [[7, 5], [7, 20], [4, 30], [3, 40], [2, 55], [1, 85], [2, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "New Gridania", "zone_id": 52}, "133": {"map_id": 3, "weather_rates": [[7, 5], [7, 20], [4, 30], [3, 40], [2, 55], [1, 85], [2, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "Old Gridania", "zone_id": 53}, "134": {"map_id": 15, "weather_rates": [[3, 20], [1, 50], [2, 70], [5, 80], [4, 90], [7, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Middle La Noscea", "zone_id": 30}, "135": {"map_id": 16, "weather_rates": [[3, 20], [1, 50], [2, 70], [5, 80], [4, 90], [7, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Lower La Noscea", "zone_id": 31}, "137": {"map_id": 17, "weather_rates": [[4, 5], [1, 50], [2, 80], [3, 90], [7, 95], [8, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Eastern La Noscea", "zone_id": 32}, "138": {"map_id": 18, "weather_rates": [[4, 10], [1, 40], [2, 60], [3, 80], [5, 90], [6, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Western La Noscea", "zone_id": 33}, "139": {"map_id": 19, "weather_rates": [[1, 30], [2, 50], [3, 70], [4, 80], [9, 90], [10, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Upper La Noscea", "zone_id": 34}, "140": {"map_id": 20, "weather_rates": [[1, 40], [2, 60], [3, 85], [4, 95], [7, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Western Thanalan", "zone_id": 42}, "141": {"map_id": 21, "weather_rates": [[11, 15], [1, 55], [2, 75], [3, 85], [4, 95], [7, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Central Thanalan", "zone_id": 43}, "398": {"map_id": 212, "weather_rates": [[3, 10], [4, 20], [9, 30], [11, 40], [1, 70], [2, 100]], "region_name": "Dravania", "region_id": 498, "zone_name": "The Dravanian Forelands", "zone_id": 2000}, "399": {"map_id": 213, "weather_rates": [[3, 10], [4, 20], [7, 30], [8, 40], [1, 70], [2, 100]], "region_name": "Dravania", "region_id": 498, "zone_name": "The Dravanian Hinterlands", "zone_id": 2001}, "400": {"map_id": 214, "weather_rates": [[3, 10], [6, 20], [50, 40], [1, 70], [2, 100]], "region_name": "Dravania", "region_id": 498, "zone_name": "The Churning Mists", "zone_id": 2002}, "145": {"map_id": 22, "weather_rates": [[1, 40], [2, 60], [3, 70], [4, 80], [7, 85], [8, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Eastern Thanalan", "zone_id": 44}, "146": {"map_id": 23, "weather_rates": [[14, 20], [1, 60], [2, 80], [3, 90], [4, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Southern Thanalan", "zone_id": 45}, "147": {"map_id": 24, "weather_rates": [[1, 5], [2, 20], [3, 50], [4, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "Northern Thanalan", "zone_id": 46}, "148": {"map_id": 4, "weather_rates": [[9, 5], [7, 20], [4, 30], [3, 40], [2, 55], [1, 85], [2, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "Central Shroud", "zone_id": 54}, "152": {"map_id": 5, "weather_rates": [[9, 5], [7, 20], [4, 30], [3, 40], [2, 55], [1, 85], [2, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "East Shroud", "zone_id": 55}, "153": {"map_id": 6, "weather_rates": [[4, 5], [10, 10], [9, 25], [4, 30], [3, 40], [2, 70], [1, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "South Shroud", "zone_id": 56}, "154": {"map_id": 7, "weather_rates": [[4, 5], [8, 10], [7, 25], [4, 30], [3, 40], [2, 70], [1, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "North Shroud", "zone_id": 57}, "155": {"map_id": 53, "weather_rates": [[16, 20], [15, 60], [2, 70], [1, 75], [3, 90], [4, 100]], "region_name": "Coerthas", "region_id": 25, "zone_name": "Coerthas Central Highlands", "zone_id": 63}, "156": {"map_id": 25, "weather_rates": [[3, 15], [4, 30], [17, 60], [1, 75], [2, 100]], "region_name": "Mor Dhona", "region_id": 26, "zone_name": "Mor Dhona", "zone_id": 67}, "418": {"map_id": 218, "weather_rates": [[15, 60], [2, 70], [1, 75], [3, 90], [4, 100]], "region_name": "Coerthas", "region_id": 25, "zone_name": "Foundation", "zone_id": 2300}, "419": {"map_id": 219, "weather_rates": [[15, 60], [2, 70], [1, 75], [3, 90], [4, 100]], "region_name": "Coerthas", "region_id": 25, "zone_name": "The Pillars", "zone_id": 2301}, "180": {"map_id": 30, "weather_rates": [[1, 30], [2, 50], [3, 70], [4, 85], [7, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Outer La Noscea", "zone_id": 350}, "397": {"map_id": 211, "weather_rates": [[16, 20], [15, 60], [2, 70], [1, 75], [3, 90], [4, 100]], "region_name": "Coerthas", "region_id": 25, "zone_name": "Coerthas Western Highlands", "zone_id": 2200}, "339": {"map_id": 72, "weather_rates": [[3, 20], [1, 50], [2, 70], [2, 80], [4, 90], [7, 100]], "region_name": "La Noscea", "region_id": 22, "zone_name": "Mist", "zone_id": 425}, "340": {"map_id": 82, "weather_rates": [[3, 5], [7, 20], [4, 30], [3, 40], [2, 55], [1, 85], [2, 100]], "region_name": "The Black Shroud", "region_id": 23, "zone_name": "The Lavender Beds", "zone_id": 426}, "341": {"map_id": 83, "weather_rates": [[1, 40], [2, 60], [3, 85], [4, 95], [7, 100]], "region_name": "Thanalan", "region_id": 24, "zone_name": "The Goblet", "zone_id": 427}, "478": {"map_id": 257, "weather_rates": [[3, 10], [4, 20], [7, 30], [8, 40], [1, 70], [2, 100]], "region_name": "Dravania", "region_id": 498, "zone_name": "Idyllshire", "zone_id": 2082}, "401": {"map_id": 215, "weather_rates": [[1, 30], [2, 60], [3, 70], [4, 80], [5, 90], [49, 100]], "region_name": "Abalathia's Spine", "region_id": 497, "zone_name": "The Sea of Clouds", "zone_id": 2100}, "402": {"map_id": 216, "weather_rates": [[2, 35], [3, 70], [9, 100]], "region_name": "Abalathia's Spine", "region_id": 497, "zone_name": "Azys Lla", "zone_id": 2101}
};

function weatherForArea(area, target) {
  var rate = _(WEATHER_RATES[area].weather_rates).find((r) => { return target < r[1]; });
  return rate[0];
}

Weather.helpers({
  // Given an area, return the weather type.
  weather(area) {
    return weatherForArea(area, this.target);
  },
});


function startOfPeriod(m) {
  return m.hour(parseInt(m.hour() / 8) * 8).startOf('hour');
}

class WeatherService {
  constructor() {
    // this._lastBell = -1;
    // Meteor.setInterval(() => {
    //   var currentBell = eorzeaTime.getCurrentBell();
    //   if (this._lastBell === currentBell) {
    //     return;
    //   }
    //   this._lastBell = currentBell;
    //   this.checkWeatherInterval(currentBell);
    // }, 2500);

    this.__weatherData = [];
    this.__weatherLock = false;

    this.addtWeatherForcasts = [];
    this._lastBell = -1;
    Tracker.autorun(() => {
      var currentBell = eorzeaTime.getCurrentBell();
      if (this._lastBell == currentBell) {
        console.warn("Already checked weather interval for this bell...");
        return;
      }
      this._lastBell = currentBell;
      this.checkWeatherInterval(currentBell);
    });
  }

  insertForcast(date, target) {
    if (moment.isMoment(date)) {
      date = +date;
    }
    // Make sure it's newer than the previous entry.
    if (this.__weatherData.length > 0 && date <= _(this.__weatherData).last().date) {
      console.error("Attempted to insert record for earlier date.", date);
      return;
    }
    this.__weatherData.push({date: date, target: target});
  }

  checkWeatherInterval(currentBell) {
    if (currentBell == 0 || currentBell == 8 || currentBell == 16) {
      console.info("New weather interval identified.");
      // this.ensureForcasts(moment().utc(), moment.duration(7, 'days'));
      // Check if we can prune old entries.
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

  ensureForcasts(lTime, duration) {
    // Always commit any previously generated forcasts.
    this.commitAdditionalForcasts();
    // Convert the start time into Eorzea time, and move back one period.
    startTime = startOfPeriod(eorzeaTime.toEorzea(lTime)).subtract(8, 'hours');
    endTime = startOfPeriod(eorzeaTime.toEorzea(moment(lTime).add(duration)));
    console.log("Ensure Forcasts:", moment(startTime).twix(endTime).simpleFormat());
    // Check if the database currently contains records for this timespan.
    //latestWeather = Weather.findOne({}, {sort: {date: -1}});
    latestWeather = _(this.__weatherData).last()
    if (!latestWeather) {
      console.info("Initializing weather forcast data...");
      latestWeather = {date: 0};
    } else {
      console.info("Latest Weather:", moment.utc(latestWeather.date).format());
    }
    if (moment.utc(latestWeather.date).isBefore(endTime)) {
      // We need to gather more forcasts.
      if (moment.utc(latestWeather.date).isAfter(startTime)) {
        // But we don't need to regenerate EVERYTHING.
        startTime = moment.utc(latestWeather.date).add(8, 'hours');
      }
      this.calculateWeather(startTime, endTime);
    }
  }

  calculateForcastTarget(lDate) {
    // Based on Rougeadyn's SaintCoinach library.
    var unixTime = lDate.unix();
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

  calculateWeather(startTime, endTime) {
    // Generate forcast targets for each period between the start and end times.
    // NOTE: The times are expected to be Eorzean times.

    console.info("Calculating the weather for:", moment(startTime).twix(endTime).simpleFormat());

    var forcastTargets = [];
    var t = moment(startTime);
    while (t.isSameOrBefore(endTime)) {
      forcastTargets.push({
        date: moment(t),
        target: this.calculateForcastTarget(eorzeaTime.toEarth(t))
      });
      t.add(8, 'hours');
    }
    // Weather.batchInsert(_(forcastTargets).map((x) => {
    //   return {_id: +x.date, date: +x.date, target: x.target};
    // }));
    _(forcastTargets).each((x) => {
      this.insertForcast(x.date, x.target);
    });
  }

  commitAdditionalForcasts() {
    // if (this.addtWeatherForcasts.length > 0) {
    //   console.info("Inserting addition weather forcasts:",
    //                moment.utc(_(this.addtWeatherForcasts).first().date).format(),
    //                "thru",
    //                moment.utc(_(this.addtWeatherForcasts).last().date).format());
    //   // Weather.batchInsert(this.addtWeatherForcasts);
    //   _(this.addtWeatherForcasts).each((forcast) => {
    //     Weather.insert(
    //       forcast,
    //       (err, _id) => {
    //         // if (err !== undefined) {
    //         //   console.warn(
    //         //     "Failed to insert weather forcast target for:",
    //         //     moment.utc(forcast.date).format());
    //         // }
    //       }
    //     );
    //   });
    //   this.addtWeatherForcasts = [];
    // }
  }

  *findWeatherPattern(date, area, previousWeatherSet, currentWeatherSet, limit = 10000) {
    // Always commit any previously generated forcasts.
    this.commitAdditionalForcasts();
    // If a previous weather set is provided, yield the period matching the
    // current weather.
    if (previousWeatherSet.length > 0) {
      date = startOfPeriod(moment(date).subtract(8, 'hours'));
    } else {
      date = startOfPeriod(moment(date));
    }
    // Yield a range covering the period for which this weather occurs.
    var previousWeather = null;
    var currentWeather = null;
    var lastDate = null;
    // It doesn't appear you can use "yield" inside a foreach functor... And
    // Meteor's Mongo interface doesn't appear to treat cursors like iterators.
    // var ww = Weather.find(
    //   {date: {$gte: +date}}, {sort: {date: 1}, reactive: false, limit: limit}).fetch();
    var ww = _(this.__weatherData).filter((w) => w.date >= +date);
    for (let w of ww) {
      // Move the *previous* current weather into previous weather.
      previousWeather = currentWeather;
      if (limit-- <= 0) {
        return;
      }
      lastDate = moment.utc(w.date);
      currentWeather = weatherForArea(area, w.target);

      //console.log("Date:", lastDate.format(), "Weather:", currentWeather);

      if (previousWeatherSet.length > 0 && !_(previousWeatherSet).contains(previousWeather)) {
        //console.log("Skipped because previous weather condition not met...");
        continue;
      }
      // Check the current weather.
      if (currentWeatherSet.length == 0 || _(currentWeatherSet).contains(currentWeather)) {
        // Yield a date range covering this period.
        yield moment.duration(8, 'hours').afterMoment(moment.utc(w.date));
      // } else {
      //   console.log("Skipped because current weather condition not met...");
      }
    }
    // If we are still generating more data, you'll need to compute new weather
    // on the fly.
    if (lastDate !== null) {
      // Resume starting with the NEXT period!
      date = lastDate.add(8, 'hours');
    }
    if (limit > 0)
      console.info(
        "Exhausted cached weather forcasts... Continuing at", date.format());
    while (limit-- > 0) {
      // Move the *previous* current weather into previous weather.
      previousWeather = currentWeather;
      lastDate = moment.utc(date);
      // Calculate the next weather target and insert into table.
      date.add(8, 'hours');
      var target = this.calculateForcastTarget(eorzeaTime.toEarth(lastDate));
      this.insertForcast(lastDate, target);
      // this.addtWeatherForcasts.push(
      //   {_id: String(+lastDate), date: +lastDate, target: target} );
      // Weather.insert(
      //   {_id: String(+lastDate), date: +lastDate, target: target},
      //   (err, _id) => {
      //     // if (err !== undefined) {
      //     //   console.warn(
      //     //     "Failed to insert weather forcast target for:",
      //     //     lastDate.format());
      //     // }
      //   }
      // );
      currentWeather = weatherForArea(area, target);
      // Then, check if the weather conditions have been met.
      if (previousWeatherSet.length > 0 && !_(previousWeatherSet).contains(previousWeather)) {
        continue;
      }
      // Check the current weather.
      if (currentWeatherSet.length == 0 || _(currentWeatherSet).contains(currentWeather)) {
        // Yield a date range covering this period.
        yield moment.duration(8, 'hours').afterMoment(moment.utc(lastDate));
      }
    }
    // If we managed to make it to here, commit the forcasts.
    // Usually, we won't consume the entire iterator though...
    this.commitAdditionalForcasts();
  }
}

export let weatherService = new WeatherService;
