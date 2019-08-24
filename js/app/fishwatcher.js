class FishWatcher {
  constructor() {
    // Total number of windows to keep track of.
    this.maxWindows = 10;

    // IMPORTANT!!!
    // The new view model does not regenerate templates every time. This means
    // we MUST NOT RACE the view model! We'll still schedule the updateFishes
    // function for every new bell, but let the view model do it please...
  }

  updateFishes() {
    console.info("FishWatcher is considering updating fishies >< c> |o.o)>");
    console.time('updateFishes');

    // OPTIMIZATION POINT
    // - FishWatcher normally just works on EVERY possible fish.
    //   Instead, we'll ask the ViewModel for only the active fish entries. Each
    //   entry contains a reference to the Fish object we need.
    // - Due to this optimization, some fish may go out of scope and miss
    //   getting windows assigned to them.

    let trackedFish = _(ViewModel.fishEntries).reduce((acc, curr) => {
      acc.push(curr.data);
      _(curr.data.intuitionFish).each(e => acc.push(e.data));
      return acc;
    }, []);


    // CLEANUP PHASE:
    //   Remove expired windows first.
    var eDate = eorzeaTime.getCurrentEorzeaDate();
    console.time('cleanupFish');
    for (let fish of trackedFish) {
      // SAFEGUARD: Consume /all/ expired entries.
      while (fish.catchableRanges.length > 0 &&
          dateFns.isSameOrAfter(eDate, +fish.catchableRanges[0].end())) {
        // Remove the first entry from the array.
        fish.catchableRanges.shift();
        fish.notifyCatchableRangesUpdated();
      }
    }
    console.timeEnd('cleanupFish');

    // PHASE 1:
    //   Ensure each fish has at least 'n' windows defined.
    console.time('updateRanges');
    for (let fish of trackedFish) {
      if (fish.alwaysAvailable) { continue; }
      if (fish.catchableRanges.length >= this.maxWindows) { continue; }
      // Okay, update it please.
      this.updateRangesForFish(fish);
    }
    console.timeEnd('updateRanges');

    console.timeEnd('updateFishes');
  }

  reinitRangesForFish(fish) {
    // Support function to create, or reintegrate a fish into tracking.

    // CLEANUP PHASE:
    //   Remove expired windows first.
    var eDate = eorzeaTime.getCurrentEorzeaDate();
    while (fish.catchableRanges.length > 0 &&
        dateFns.isSameOrAfter(eDate, +fish.catchableRanges[0].end())) {
      // Remove the first entry from the array.
      fish.catchableRanges.shift();
      fish.notifyCatchableRangesUpdated();
    }

    // PHASE 1:
    //   Ensure each fish has at least 'n' windows defined.
    do {
      if (fish.alwaysAvailable) { break; }
      if (fish.catchableRanges.length >= this.maxWindows) { break; }
      // Okay, update it please.
      this.updateRangesForFish(fish);
    } while (0);

  }

  updateRangesForFish(fish) {
    // Resume from when the last window ended (if possible)
    var startOfWindow = null;
    var latestWindow = _(fish.catchableRanges).last();
    if (latestWindow) {
      startOfWindow = new Date(+latestWindow.end());
      var h = dateFns.utc.getHours(startOfWindow);
      if (h != 0 && h != 8 && h != 16) {
        // OPTIMIZATION (and safeguard):
        // Since we always check the entire weather period, we need to move to
        // the next period if the last window ended before the period ended.
        startOfWindow = dateFns.utc.addHours(startOfPeriod(startOfWindow), 8);
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
    weatherService.finishedWithIter();

    // Make sure the LAST window is complete!
    while (lastRangeSpansPeriods) {
      // Reset the flag.
      lastRangeSpansPeriods = false;
      // This time, just peek at the NEXT period.
      var iter = weatherService.findWeatherPattern(
        +_(fish.catchableRanges).last().end(),
        fish.location.zoneId,
        fish.previousWeatherSet,
        fish.weatherSet,
        1);
      var _iterItem = iter.next();
      weatherService.finishedWithIter();
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
    if (dateFns.isSameOrBefore(+nextRange.end(), eorzeaTime.getCurrentEorzeaDate())) {
      //console.error("Range has already expired:", nextRange.simpleFormat());
      return false;
    }
    // BUGFIX: the `availableRangeDuring` function always returns the FULL RANGE of the
    // fish, without clipping to the window if the range is "already in progress".
    // As a result, if a fish is up for multiple 8-hour windows, `nextRange` will keep
    // getting set to the same value. To solve this, we'll intersect nextRange with window.
    nextRange = nextRange.intersection(window);

    // If this fish has predators, we have to consider their windows too...
    // Basically, to ensure we get the same number of windows for every fish,
    // we'll intersect this range with the UNION of its predators' ranges.
    if (_(fish.predators).size() > 0) {
      var overallPredRange = null;
      var predatorsAlwaysAvailable = true;
      _(fish.predators).chain().keys().each((predId) => {
        var predatorFish = _(Fishes).findWhere({id: Number(predId)});
        if (predatorFish.alwaysAvailable) return nextRange;
        predatorsAlwaysAvailable = false;
        // Once again, we need to check if the weather right now works for
        // the predator fish.
        var iter = weatherService.findWeatherPattern(
          +nextRange.start(),
          predatorFish.location.zoneId,
          predatorFish.previousWeatherSet,
          predatorFish.weatherSet,
          1);
        var _iterItem = iter.next();
        weatherService.finishedWithIter();
        if (_iterItem.done) {
          // Wait wait wait, try one more thing.
          // Let's say you catch the fish during the intuition buff period!
          iter = weatherService.findWeatherPattern(
            +nextRange.start().subtract(1, 'hour'), // FIXME: Completely arbitrary "intuition window" selected here...
            predatorFish.location.zoneId,
            predatorFish.previousWeatherSet,
            predatorFish.weatherSet,
            1);
          _iterItem = iter.next();
          weatherService.finishedWithIter();
          if (_iterItem.done) { return; }
        }
        var predWindow = _iterItem.value;
        var predRange = predatorFish.availableRangeDuring(predWindow);
        if (!predWindow.overlaps(predRange)) { return /*nextRange = null*/; }
        if (dateFns.isSameOrBefore(+predRange.end(), eorzeaTime.getCurrentEorzeaDate())) {
          return /*nextRange = null*/;
        }
        // Because of the "intuition window" being added, we need to re-constrain the predRange.
        predRange = predRange.intersection(predWindow);
        if (overallPredRange === null) {
          overallPredRange = predRange;
        } else {
          // COMBINE this predators range with the others.
          // This is necessary for fish with multiple predators which have
          // non-overlapping availability...
          overallPredRange = overallPredRange.union(predRange);
        }
        return nextRange;
      });
      // Reduce the next range by intersecting with OVERALL predator's range.
      if (predatorsAlwaysAvailable) {
        // Do nothing; keep nextRange intact
      } else if (overallPredRange === null) {
        nextRange = null;
      } else {
        // Increase the pred range by intuition buff time first.
        overallPredRange = overallPredRange.start().twix(overallPredRange.end().add(1, 'hour'))
        nextRange = nextRange.intersection(overallPredRange);
      }
    }
    if (nextRange === null) {
      // None of its predators are available right now... Too bad...
      return false;
    }

    // Now for the complicated part...
    // Update the catchable ranges using the intersection of the next range
    // and the window itself. Merge together bordering windows.
    fish.addCatchableRange(nextRange.intersection(window));
    return nextRange.contains(+window.end() + 1);
  }
}

let fishWatcher = new FishWatcher;
