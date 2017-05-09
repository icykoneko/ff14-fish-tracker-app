import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';

export const EorzeaBellChanged = new Tracker.Dependency;
const EARTH_TO_EORZEA = 3600 / 175;
const EORZEA_TO_EARTH = 1 / EARTH_TO_EORZEA;
const MS_IN_AN_HOUR = 60 * 60 * 1000;
const MS_IN_A_DAY = 24 * MS_IN_AN_HOUR;

class EorzeaTime {

  constructor() {
    this.lastSeenBell = 0;
    Meteor.setInterval(_.bind(this.checkHour, this), 2500);
    this.checkHour();
  }

  getCurrentEorzeaDate() {
    return this.toEorzea(moment.utc());
  }

  toEorzea(earthDate) {
    var eorzeaMs = earthDate.valueOf() * EARTH_TO_EORZEA;
    return moment.utc(eorzeaMs);
  }

  toEarth(eorzeaDate) {
    var earthMs = Math.ceil(eorzeaDate.valueOf() * EORZEA_TO_EARTH);
    return moment.utc(earthMs);
  }

  checkHour() {
    var eorzeaDate = this.getCurrentEorzeaDate();
    var currentBell = eorzeaDate.hour();
    if (currentBell == this.lastSeenBell) {
      return;
    }

    this.lastSeenBell = currentBell;
    console.info("The current Eorzea bell is now:", currentBell);
    EorzeaBellChanged.changed();
  }

  getCurrentBell() {
    EorzeaBellChanged.depend();
    return this.lastSeenBell;
  }
}

export let eorzeaTime = new EorzeaTime;
