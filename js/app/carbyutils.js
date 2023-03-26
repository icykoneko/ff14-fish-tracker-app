//////////////////////////////////////////////////////////////////////////////
// INTENDED FOR FISH WINDOW RESEARCH ONLY! DON'T CALL THESE UNLESS YOU REALLY
// KNOW WHAT YOU ARE DOING!!!
//////////////////////////////////////////////////////////////////////////////

let CarbyUtils = function(){

  var theRealDateNow = Date.now;

  var WEATHER_NAME_TO_INDEX = _(DATA.WEATHER_TYPES).chain()
    .pairs().map(x => [x[1]['name_en'], Number(x[0])]).object().value();

  function parseTimeString(s) {
    let hoursDec = Date.parse("1970 " + s + "Z") / 1000 / 60 / 60;
    if (isNaN(hoursDec)) {
      throw new Error("Invalid time string. Must be HH:mm format.");
    }
    return hoursDec;
  }

  class _CarbyUtils {
    constructor() {
    }

    _resetSiteData(datetime) {
      console.debug("Resetting site data...");
      weatherService.__weatherData = [];
      _(Fishes).each(fish => { fish.catchableRanges = []; fish.incompleteRanges = []; });
      let prevPeriod = startOfPeriod(dateFns.utc.subHours(eorzeaTime.toEorzea(datetime), 8));
      weatherService.insertForecast(prevPeriod, weatherService.calculateForecastTarget(eorzeaTime.toEarth(prevPeriod)));
      if (typeof(ViewModel) !== 'undefined') {
        ViewModel.lastDate = null;
      }
    }
  
    // CarbyUtils.timeTravel(eorzeaTime.toEarth(Date.UTC(3017,1,26,23,45,0)))
    timeTravel(datetime) {
      // Don't worry if it's the real Date.now...
      let origDateNow = Date.now;
      let currDateTime = origDateNow();
      if (dateFns.isAfter(datetime, currDateTime)) {
        console.log("Traveling into the future...");
        let dateOffset = datetime - currDateTime;
        this._resetSiteData(datetime);
        Date.now = () => { return origDateNow() + dateOffset; };
        fishWatcher.updateFishes({earthTime: datetime});
      } else {
        // Traveling to the past will corrupt the weather service.
        console.log("Traveling into the past...");
        let dateOffset = currDateTime - datetime;
        this._resetSiteData(datetime);
        Date.now = () => { return origDateNow() - dateOffset; };
        fishWatcher.updateFishes({earthTime: datetime});
      }
      console.debug("Traveled to %s", dateFns.formatISO(eorzeaTime.toEorzea(datetime)));
    }

    restoreTime() {
      // Restoring time may corrupt the weather service...
      this._resetSiteData(theRealDateNow());
      Date.now = theRealDateNow;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Modify a fish's conditions programmatically.
    // ========================================================================
    // fishName = ENGLISH NAME for the fish.
    // options = object with any of the following keys:
    //   previousWeatherSet: [<WEATHER_NAME_EN>,<WEATHER_NAME_EN>*]
    //   weatherSet: [<WEATHER_NAME_EN>,<WEATHER_NAME_EN>*]
    //   startHour: [0-23]
    //   endHour: [1-24]
    //   startTime: "hh:mm" format (24-hr time)
    //   endTime: "hh:mm" format (24-hr time)
    // NOTE: If you want to enter a string for start and end times, please use
    // the `startTime` and `endTime` options instead of `startHour` and
    // `endHour`.
    ///////////////////////////////////////////////////////////////////////////
    // WEATHER_NAME_EN: ["Clear Skies", "Fair Skies", "Clouds", "Fog", "Wind",
    //                   "Gales", "Rain", "Showers", "Thunder", "Thunderstorms",
    //                   "Dust Storms", "Heat Waves", "Show", "Blizzards",
    //                   "Gloom", "Umbral Wind", "Umbral Static", "Moon Dust",
    //                   "Astromagnetic Storm"]
    ///////////////////////////////////////////////////////////////////////////
    // /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\
    // PLEASE USE CAUTION CALLING THIS! DO NOT INPUT AN INVALID VALUE OR THE
    // SITE WILL CRASH AND YOU'LL HAVE TO REFRESH! AGAIN, ONLY FISH RESEARCHERS
    // SHOULD EVER CONSIDER CALLING THIS API! YOU HAVE BEEN WARNED.
    // /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\
    setFishConditions(fishName, options={})
    {
      // ViewModel must exist for this feature to work.
      if (typeof(ViewModel) === 'undefined') {
        console.error("The setFishConditions function can only be used on the main page.");
        return;
      }

      // Verify the fish exists in the database first.
      let item_entry = _(DATA.ITEMS).findWhere({name_en: fishName});
      if (item_entry === undefined) {
        console.error("FISH NOT FOUND: %s", fishName);
        return;
      }

      // IMPORTANT:
      // Check if the fish is currently active in the view model.
      // None of these changes will take effect unless it's removed first.
      let view_entry = ViewModel.fishEntries[item_entry._id];
      if (view_entry !== undefined) {
        ViewModel.removeEntry(view_entry, item_entry._id);
        view_entry = true;
      }

      let fish_entry = _(Fishes).findWhere({id: item_entry._id});
      if (options.weatherSet !== undefined) {
        fish_entry.weatherSet =
          _(options.weatherSet).map(w => WEATHER_NAME_TO_INDEX[w]);
        fish_entry.conditions.weatherSet =
          _(fish_entry.weatherSet).map(w => DATA.WEATHER_TYPES[w]);
      }
      if (options.previousWeatherSet !== undefined) {
        fish_entry.previousWeatherSet =
          _(options.previousWeatherSet).map(w => WEATHER_NAME_TO_INDEX[w]);
        fish_entry.conditions.previousWeatherSet =
          _(fish_entry.previousWeatherSet).map(w => DATA.WEATHER_TYPES[w]);
      }
      let timeSpecified = false;
      if (options.startHour !== undefined) {
        fish_entry.startHour = options.startHour;
        timeSpecified = true;
      } else if (options.startTime !== undefined) {
        fish_entry.startHour = parseTimeString(options.startTime);
        timeSpecified = true;
      }
      if (options.endHour !== undefined) {
        fish_entry.endHour = options.endHour;
        timeSpecified = true;
      } else if (options.endTime !== undefined) {
        fish_entry.endHour = parseTimeString(options.endTime);
        timeSpecified = true;
      }
      if (timeSpecified) {
        let totalHoursUp = Math.abs(fish_entry.endHour - fish_entry.startHour);
        fish_entry.dailyDuration = dateFns.normalizeDuration({
          hours: fish_entry.endHour < fish_entry.startHour ? 24 - totalHoursUp : totalHoursUp });
      }
      fish_entry.alwaysAvailable =
        fish_entry.weatherSet.length == 0 && fish_entry.startHour == 0 && fish_entry.endHour == 24;

      // Update the windows for this fish now (unless it wasn't being displayed)
      // Of course, confuzzled carbuncles would really like to know why you'd call this
      // function if you didn't have the fish displayed in the first place... but maybe
      // that could happen... filters and such.
      fish_entry.catchableRanges = [];
      fish_entry.incompleteRanges = [];
      if (view_entry === true) {
        // Recreate the viewmodel entry for this fish.
        ViewModel.activateEntry(fish_entry, Date.now());
        ViewModel.updateDisplay();
      }
    }
  }

  return new _CarbyUtils();
}();
