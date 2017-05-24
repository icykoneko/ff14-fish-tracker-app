class FishWatcher {
  constructor() {
    // Total number of windows to keep track of.
    this.maxWindows = 10;

    // Every new Eorzea bell, reconsider the fishes windows.
    eorzeaTime.currentBellChanged.subscribe((bell) => this.updateFishes());
  }

  updateFishes() {
    console.info("FishWatcher is considering updating fishies >< c> |o.o)>");

    // CLEANUP PHASE:
    //   Remove expired windows first.
    var eDate = eorzeaTime.getCurrentEorzeaDate();
    _(Fishes).each((fish) => {
      if (fish.catchableRanges.length > 0 &&
          eDate.isSameOrAfter(fish.catchableRanges[0].end())) {
        // Remove the first entry from the array.
        fish.catchableRanges.shift();
        fish.notifyCatchableRangesUpdated();
      }
    });

    // PHASE 1:
    //   Ensure each fish has at least 'n' windows defined.
    _(Fishes).chain()
      .reject((fish) => fish.alwaysAvailable())
      .filter((fish) => fish.catchableRanges.length < this.maxWindows)
      .each((fish) => this.updateRangesForFish(fish));
  }

  updateRangesForFish(fish) {
    // Resume from when the last window ended (if possible)
    var startOfWindow = null;
    var latestWindow = _(fish.catchableRanges).last();
    if (latestWindow) {
      startOfWindow = moment.utc(latestWindow.end());
      var h = startOfWindow.hour();
      if (h != 0 && h != 8 && h != 16) {
        // OPTIMIZATION (and safeguard):
        // Since we always check the entire weather period, we need to move to
        // the next period if the last window ended before the period ended.
        startOfPeriod(startOfWindow).add(8, 'hours');
      }
    } else {
      // Use the current date as the start time (first run)
      startOfWindow = eorzeaTime.getCurrentEorzeaDate();
    }

    // Create a new iterator with no limit to get periods with favorable weather.
    // TODO: Should optimize this by skipping periods when the fish cannot appear.
    var weatherIter = weatherService.findWeatherPattern(
      startOfWindow,
      fish.location.zoneId,
      fish.previousWeatherSet,
      fish.weatherSet);
    // Need to know if the last range could span periods.
    var lastRangeSpansPeriods = false;

    while (fish.catchableRanges.length < this.maxWindows) {
      var _iterItem = weatherIter.next();
      if (_iterItem.done) {
        console.warn("Stopped iterating early for:", fish);
        break;
      }
      lastRangeSpansPeriods =
        this.__checkToAddCatchableRange(fish, _iterItem.value);
    }

    // Make sure the LAST window is complete!
    while (lastRangeSpansPeriods) {
      // Reset the flag.
      lastRangeSpansPeriods = false;
      // This time, just peek at the NEXT period.
      var iter = weatherService.findWeatherPattern(
        moment.utc(_(fish.catchableRanges).last().end()),
        fish.location.zoneId,
        fish.previousWeatherSet,
        fish.weatherSet,
        1);
      var _iterItem = iter.next();
      if (_iterItem.done) { break; }
      lastRangeSpansPeriods =
        this.__checkToAddCatchableRange(fish, _iterItem.value);
    }
  }

  __checkToAddCatchableRange(fish, window) {
    // Found a time period where the weather is favorable. Now check if the
    // fish is even up. This really should be the other way around -_-
    var nextRange = fish.availableRangeDuring(window);
    if (!window.overlaps(nextRange)) {
      // Oops, this is why you need to optimize this...
      return false;
    }
    // SAFEGUARD! Verify this range hasn't already expired!!!
    // This is more here to prevent any future stupidity...
    if (nextRange.end().isSameOrBefore(eorzeaTime.getCurrentEorzeaDate())) {
      //console.error("Range has already expired:", nextRange.simpleFormat());
      return false;
    }

    // If this fish has predators, we have to consider their windows too...
    // Basically, to ensure we get the same number of windows for every fish,
    // we'll intersect this range with its predators' ranges.
    if (_(fish.predators).size() > 0) {
      _(fish.predators).chain().keys().each((predId) => {
        // Stop if the range has already been eliminated.
        if (nextRange === null) return null;
        var predatorFish = _(Fishes).findWhere({id: Number(predId)});
        if (predatorFish.alwaysAvailable()) return nextRange;
        // Once again, we need to check if the weather right now works for
        // the predator fish.
        var iter = weatherService.findWeatherPattern(
          nextRange.start(),
          predatorFish.location.zoneId,
          predatorFish.previousWeatherSet,
          predatorFish.weatherSet,
          1);
        var _iterItem = iter.next();
        if (_iterItem.done) { return nextRange = null; }
        var predWindow = _iterItem.value;
        var predRange = predatorFish.availableRangeDuring(predWindow);
        if (!predWindow.overlaps(predRange)) { return nextRange = null; }
        if (predRange.end().isSameOrBefore(eorzeaTime.getCurrentEorzeaDate())) {
          return nextRange = null;
        }
        // Reduce the next range by intersecting with predator's range.
        return nextRange = nextRange.intersection(predRange);
      });
    }
    if (nextRange === null) {
      // One of its predators isn't available right now... Too bad
      return false;
    }

    // Now for the complicated part...
    // Update the catchable ranges using the intersection of the next range
    // and the window itself. Merge together bordering windows.
    fish.addCatchableRange(nextRange.intersection(window));
    return nextRange.contains(window.end().add(1));
  }
}

let fishWatcher = new FishWatcher;
