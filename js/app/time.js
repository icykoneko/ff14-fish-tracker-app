const EARTH_TO_EORZEA = 3600 / 175;
const EORZEA_TO_EARTH = 1 / EARTH_TO_EORZEA;
const MS_IN_AN_HOUR = 60 * 60 * 1000;
const MS_IN_A_DAY = 24 * MS_IN_AN_HOUR;

class EorzeaTime {
  constructor() {
    this.currentBellChanged = Rx.Observable
      .interval(1 * EARTH_TO_EORZEA /* ms */)
      .timestamp()
      .map((v) => this.toEorzea(v.timestamp).hour())
      .distinctUntilChanged()
      .doOnNext((v) => console.log("Current bell is now:", v));
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
}

let eorzeaTime = new EorzeaTime;
