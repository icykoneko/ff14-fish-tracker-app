import { Meteor } from 'meteor/meteor';
import { Area } from '/imports/api/area/area.js';
import { Weather } from '/imports/api/weatherservice/weatherservice.js';
import { eorzeaTime } from '/imports/api/time/time.js';

import './regionweather.html';

function startOfPeriod(m) {
  return m.hour(parseInt(m.hour() / 8) * 8).startOf('hour');
}

var NEW_PERIOD = new Tracker.Dependency;

function getPeriod() {
  NEW_PERIOD.depend();
  return startOfPeriod(eorzeaTime.toEorzea(moment.utc()));
}

Template.regionweather.onCreated(function() {
  this.autorun(() => {
    this.subscribe('weatherreports');
    var currentBell = eorzeaTime.getCurrentBell();
    if (currentBell == 0 || currentBell == 8 || currentBell == 16) {
      NEW_PERIOD.changed();
    }
  });
});

Template.regionweather.helpers({
  area() {
    return _(Area).where({region: this.region});
  },
  weather() {
    // Request the previous period, plus the next 5 periods.
    // console.log("Requesting weather for area:", this.name);
    var startTime = getPeriod().subtract(8, 'hours');
    forcasts = Weather.find(
      {date: {$gte: +startTime}},
      {sort: {date: 1}, limit: 6}).map((x) => {
        var areaForcast = _(x.forcasts).find((y) => {
          return y.area.name == this.name;
        });
        return _({date: x.date}).extend(areaForcast.weather);
      });
    // console.log(_(forcasts).map((x) => {
    //   return [x.date, eorzeaTime.toEarth(moment.utc(x.date)), x.name]; }));
    return forcasts;
  }
});
