class FishWatcher {
  constructor() {
    // Total number of windows to keep track of.
    this.maxWindows = 10;
    // Using fish eyes to ignore time?
    this.fishEyesEnabled = false;
    this.fishEyesChanged = new rxjs.BehaviorSubject(this.fishEyesEnabled);

    // Placeholder for fishEntries.
    this.fishEntries = null;

    // IMPORTANT!!!
    // The new view model does not regenerate templates every time. This means
    // we MUST NOT RACE the view model! We'll still schedule the updateFishes
    // function for every new bell, but let the view model do it please...
  }

  setFishEyes(enabled, opts = {}) {
    // Make sure it'll actually cause a change first...
    if (this.fishEyesEnabled === enabled) {
      return;
    }

    // The next steps must be done before anyone else mucks with the catch
    // windows. It probably needs locks to ensure that won't happen...
    // For now, let's just wing it...
    // "What could possibly go wrong" - Carby 2020

    console.info("Look! Look at them with your special Fish Eyes.");
    console.time('toggleFishEyes');

    // STEP 1: Clear catch windows for fish affected by Fish Eyes buff.
    // And yes, we must do this for fish not currently active otherwise when
    // they become active, they'll display the wrong information...
    console.info("Clearing windows for fish affected by Fish Eyes buff!");
    _(Fishes).chain().filter(fish => fish.fishEyes).each(fish => {
      fish.catchableRanges = [];
      fish.incompleteRanges = [];
      fish.notifyCatchableRangesUpdated();
    });
    // STEP 2: Toggle "Fish Eyes" mode.
    this.fishEyesEnabled = enabled;
    // STEP 3: Rebuild catch windows.
    this.updateFishes(opts);

    // Notify others of the change.
    this.fishEyesChanged.next(enabled);

    console.timeEnd('toggleFishEyes');
    console.info("My Fish!")
  }

  _isFishAlwaysUp(fish) {
    // If the fish watcher's got on their "special eyes", only weather can stop
    // them from catching a fish!
    if (this.fishEyesEnabled) {
      return fish.isFishAlwaysUpUsingFishEyes();
    } else {
      return fish.alwaysAvailable;
    }
  }

  updateFishes(opts = {}) {
    console.info("FishWatcher is considering updating fishies >< c> |o.o)>");
    console.time('updateFishes');

    // OPTIMIZATION POINT
    // - FishWatcher normally just works on EVERY possible fish.
    //   Instead, we'll ask the ViewModel for only the active fish entries. Each
    //   entry contains a reference to the Fish object we need.
    // - Due to this optimization, some fish may go out of scope and miss
    //   getting windows assigned to them.

    let trackedFish = _(this.fishEntries).reduce((acc, curr) => {
      acc.push(curr.data);
      _(curr.data.intuitionFish).each(e => acc.push(e.data));
      return acc;
    }, []);

    var eDate = null;
    // Allow for time override...
    if (opts.earthTime !== undefined) {
      eDate = eorzeaTime.toEorzea(opts.earthTime);
    } else if (opts.eorzeaTime !== undefined) {
      eDate = opts.eorzeaTime;
    } else {
      eDate = eorzeaTime.getCurrentEorzeaDate();
    }

    // CLEANUP PHASE:
    //   Remove expired windows first.
    console.time('cleanupFish');
    for (let fish of trackedFish) {
      // SAFEGUARD: Consume /all/ expired entries.
      while (fish.catchableRanges.length > 0 &&
          dateFns.isSameOrAfter(eDate, fish.catchableRanges[0].end)) {
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
      if (this._isFishAlwaysUp(fish)) { continue; }
      if (fish.catchableRanges.length >= this.maxWindows) { continue; }
      // Okay, update it please.
      this.updateRangesForFish(fish, eDate);
    }
    console.timeEnd('updateRanges');

    console.timeEnd('updateFishes');
  }

  reinitRangesForFish(fish, opts = {}) {
    // Support function to create, or reintegrate a fish into tracking.

    var eDate = null;
    // Allow for time override...
    if (opts.earthTime !== undefined) {
      eDate = eorzeaTime.toEorzea(opts.earthTime);
    } else if (opts.eorzeaTime !== undefined) {
      eDate = opts.eorzeaTime;
    } else {
      eDate = eorzeaTime.getCurrentEorzeaDate();
    }

    // CLEANUP PHASE:
    //   Remove expired windows first.
    while (fish.catchableRanges.length > 0 &&
        dateFns.isSameOrAfter(eDate, fish.catchableRanges[0].end)) {
      // Remove the first entry from the array.
      fish.catchableRanges.shift();
      fish.notifyCatchableRangesUpdated();
    }

    // PHASE 1:
    //   Ensure each fish has at least 'n' windows defined.
    do {
      if (this._isFishAlwaysUp(fish)) { break; }
      if (fish.catchableRanges.length >= this.maxWindows) { break; }
      // Okay, update it please.
      this.updateRangesForFish(fish, eDate);
    } while (0);

  }

  updateRangesForFish(fish, baseTime) {
    // Need to know if the last range could span periods.
    var lastRangeSpansPeriods = false;

    // Restore any incomplete ranges first.
    if (fish.incompleteRanges.length > 0) {
      while (fish.catchableRanges.length < this.maxWindows) {
        var incompleteRange = fish.incompleteRanges.shift();
        if (incompleteRange !== undefined) {
          fish.catchableRanges.push(incompleteRange);
          // Set flag so that we don't immediately stop processing...
          lastRangeSpansPeriods = true;
        }
      }
    }

    // Resume from when the last window ended (if possible)
    var startOfWindow = null;
    var latestWindow = _(fish.catchableRanges).last();
    if (latestWindow) {
      startOfWindow = new Date(+latestWindow.end);
      var h = dateFns.utc.getHours(startOfWindow);
      if (h != 0 && h != 8 && h != 16) {
        // OPTIMIZATION (and safeguard):
        // Since we always check the entire weather period, we need to move to
        // the next period if the last window ended before the period ended.
        startOfWindow = dateFns.utc.addHours(startOfPeriod(startOfWindow), 8);
      }
    } else {
      // Use the current date as the start time (first run)
      startOfWindow = baseTime;
    }

    // Create a new iterator with no limit to get periods with favorable weather.
    // TODO: Should optimize this by skipping periods when the fish cannot appear.
    var weatherIter = weatherService.findWeatherPattern(
      startOfWindow,
      fish.location.zoneId,
      fish.previousWeatherSet,
      fish.weatherSet);

    while (fish.catchableRanges.length < this.maxWindows) {
      var _iterItem = weatherIter.next();
      if (_iterItem.done) {
        console.warn("Stopped iterating early for:", fish);
        break;
      }
      lastRangeSpansPeriods =
        this.__checkToAddCatchableRange(fish, _iterItem.value, baseTime);
    }
    weatherService.finishedWithIter();

    // Make sure the LAST window is complete!
    while (lastRangeSpansPeriods) {
      // Reset the flag.
      lastRangeSpansPeriods = false;
      // This time, just peek at the NEXT period.
      var iter = weatherService.findWeatherPattern(
        +_(fish.catchableRanges).last().end,
        fish.location.zoneId,
        fish.previousWeatherSet,
        fish.weatherSet,
        1);
      var _iterItem = iter.next();
      weatherService.finishedWithIter();
      if (_iterItem.done) { break; }
      lastRangeSpansPeriods =
        this.__checkToAddCatchableRange(fish, _iterItem.value, baseTime);
    }
  }

  __checkToAddCatchableRange(fish, window, baseTime) {
    // Found a time period where the weather is favorable. Now check if the
    // fish is even up. This really should be the other way around -_-
    // ^^ Who's laughing now? *puts on Fish Eyes shades*
    let spansPeriods = undefined;
    var nextRanges = fish.availableRangeDuring(window, this.fishEyesEnabled);
    for (var nextRange of nextRanges) {
      spansPeriods = this.__checkToAddCatchableRangeInner(fish, window, nextRange, baseTime);
      // If will span periods, we need to double-check if we've already found enough
      // windows. If not, this will cause an infinite loop because of the late
      // side of the fish's window spanning periods.
      if (spansPeriods === true && fish.catchableRanges.length > this.maxWindows) {
        fish.stashIncompleteWindows(this.maxWindows);
        spansPeriods = false;
        break;
      }
    }
    return spansPeriods;
  }

  __checkToAddCatchableRangeInner(fish, window, nextRange, baseTime) {
    if (!dateFns.areIntervalsOverlapping(window, nextRange)) {
      // Oops, this is why you need to optimize this...
      return false;
    }
    // SAFEGUARD! Verify this range hasn't already expired!!!
    // This is more here to prevent any future stupidity...
    if (dateFns.isSameOrBefore(nextRange.end, baseTime)) {
      //console.error("Range has already expired:", nextRange.simpleFormat());
      return false;
    }
    // BUGFIX: the `availableRangeDuring` function always returns the FULL RANGE of the
    // fish, without clipping to the window if the range is "already in progress".
    // As a result, if a fish is up for multiple 8-hour windows, `nextRange` will keep
    // getting set to the same value. To solve this, we'll intersect nextRange with window.
    var origNextRange = nextRange;
    nextRange = dateFns.intervalIntersection(nextRange, window);

    // If this fish has predators, we have to consider their windows too...
    // Basically, to ensure we get the same number of windows for every fish,
    // we'll intersect this range with the UNION of its predators' ranges.
    if (_(fish.intuitionFish).size() > 0) {
      var overallPredRange = null;
      var acceptedPredRange = null;
      var predatorsAlwaysAvailable = true;
      var atLeastOnePredatorAlwaysAvailable = false;
      var missingPreReq = false;
      // This key value is in seconds, we will need to convert it to Eorzean time first
      var intuitionLength = fish.intuitionLength;
      // If no key was defined, default to 1 Eorzean hour duration
      // Keeping precision down to seconds here because of non-aligning intuition durations
      // (e.g. 100 Earth seconds)
      if (intuitionLength !== null && intuitionLength !== undefined) {
        intuitionLength = eorzeaTime.toEorzea(intuitionLength);
      } else {
        intuitionLength = 3600;
      }
      var prereqMet = _(fish.intuitionFish).chain()
        .map(x => x.data)
        .all(function(predatorFish) {
          if (this._isFishAlwaysUp(predatorFish)) {
            atLeastOnePredatorAlwaysAvailable = true;
            return true;
          }
          predatorsAlwaysAvailable = false;
          var predWindow = null;
          var predRanges = [];
          // Once again, we need to check if the weather right now works for
          // the predator fish.
          var iter = weatherService.findWeatherPattern(
            +nextRange.start,
            predatorFish.location.zoneId,
            predatorFish.previousWeatherSet,
            predatorFish.weatherSet,
            1);
          var _iterItem = iter.next();
          weatherService.finishedWithIter();
          if (!_iterItem.done) {
            predWindow = _iterItem.value;
            predRanges = predatorFish.availableRangeDuring(predWindow, this.fishEyesEnabled);
          }
          if (predRanges.length == 0) {
            // Wait wait wait, try one more thing.
            // Let's say you catch the fish during the intuition buff period!
            iter = weatherService.findWeatherPattern(
              +dateFns.utc.subSeconds(nextRange.start, intuitionLength),
              predatorFish.location.zoneId,
              predatorFish.previousWeatherSet,
              predatorFish.weatherSet,
              1);
            _iterItem = iter.next();
            weatherService.finishedWithIter();
            if (!_iterItem.done) {
              predWindow = _iterItem.value;
              predRanges = predatorFish.availableRangeDuring(predWindow, this.fishEyesEnabled);
            }
            if (predRanges.length == 0) {
              // Finally, was this predator fish up during the PREVIOUS weather interval?
              // NOTE: You still MUST USE WEATHERSERVICE because of the limit on recorded
              // catchable ranges.
              iter = weatherService.findWeatherPattern(
                +dateFns.utc.addHours(startOfPeriod(nextRange.start), -8),
                predatorFish.location.zoneId,
                predatorFish.previousWeatherSet,
                predatorFish.weatherSet,
                1);
              _iterItem = iter.next();
              weatherService.finishedWithIter();
              if (!_iterItem.done) {
                predWindow = _iterItem.value;
                predRanges = predatorFish.availableRangeDuring(predWindow, this.fishEyesEnabled);
              }
              if (predRanges.length == 0) {
                // Well, can't say we didn't try.
                return false;
              }
            }
          }
          var hasValidPredRange = false;
          for (var predRange of predRanges) {
            if (!dateFns.areIntervalsOverlapping(predWindow, predRange)) { continue /*nextRange = null*/; }
            if (dateFns.isSameOrBefore(predRange.end, baseTime)) {
              console.warn("Window for pre-req fish %s has already expired.", predatorFish.name);
              continue /*nextRange = null*/;
            }
            // Because of the "intuition window" being added, we need to re-constrain the predRange.
            predRange = dateFns.intervalIntersection(predRange, predWindow);
            hasValidPredRange = true;
            if (overallPredRange === null) {
              overallPredRange = predRange;
              acceptedPredRange = predRange;
            } else {
              // Does this predator's range INTERSECT the currently accepted range?
              var reducedRange = dateFns.intervalIntersection(predRange, acceptedPredRange);

              // ASSUMPTIONS:
              // The order of the predator fish is sorted (manually in the YAML file), and preserved
              // in the JSON/JS file. This order must ensure there will never be a gap between each
              // pre-req fish otherwise the check for OVERALL range being overlapping or adjacent will
              // fail too early.

              if (reducedRange === null) {
                // This is still okay (for now) because fish such as Warden of the Seven Hues
                // have three pre-reqs which are up at different times. Since the currently
                // accepted range does not intersect, verify that the intervals at least
                // adjacent to one another. Take the interval which occurs LATER to become
                // the new accepted range.

                // FIRST, make sure this predator's window OVERLAPS or IS ADJACENT TO the
                // current OVERALL predator window.
                var mergedRange = dateFns.intervalMerge([overallPredRange, predRange]);
                if (mergedRange.length != 1) {
                  // Do not accept this range since it's not adjacent to any of the ranges already identified.
                  hasValidPredRange = false;
                }
                else {
                  // NEXT, since this predator was outside the ACCEPTED range, but ADJACENT to the OVERALL
                  // range, we must determine if it came BEFORE or AFTER. If it comes AFTER, it replaces
                  // the ACCEPTED range. If it comes BEFORE, nothing changes.
                  if (dateFns.doesIntervalAbutEnd(predRange, overallPredRange)) {
                    // NOTE: Intersection not necessary because the entire new range occurred after the
                    // previously accepted range.
                    acceptedPredRange = predRange;
                  }
                  // FINALLY, replace the OVERALL range with the new merged result.
                  overallPredRange = mergedRange[0];
                }
              } else {
                // REDUCE the ACCEPTED range.
                acceptedPredRange = reducedRange;
                // MERGE the range with the OVERALL range.
                var mergedRange = dateFns.intervalMerge([overallPredRange, predRange]);
                if (mergedRange.length != 1) {
                  console.error("Expected ranges to be overlapping or adjacent!");
                }
                overallPredRange = mergedRange[0];
              }
            }
          }
          return hasValidPredRange;
        }, this)
        .value();
      // The above loop MUST FIND EVERY PRE-REQ FISH otherwise do not consider this window!
      if (!prereqMet) {
        nextRange = null;
      }
      // Reduce the next range by intersecting with OVERALL predator's range.
      else if (predatorsAlwaysAvailable) {
        // Do nothing; keep nextRange intact
      } else if (overallPredRange === null) {
        nextRange = null;
      } else {
        // If at least one of the predators is up all day, extend the accepted range to the
        // end of this window. Leave the start time alone though.
        if (atLeastOnePredatorAlwaysAvailable) {
          acceptedPredRange.end = nextRange.end;
        }
        // Increase the pred range by intuition buff time first.
        acceptedPredRange = { start: acceptedPredRange.start, end: dateFns.utc.addSeconds(acceptedPredRange.end, intuitionLength) };
        nextRange = dateFns.intervalIntersection(nextRange, acceptedPredRange);
      }
    }
    if (nextRange === null) {
      // None of its predators are available right now... Too bad...
      return false;
    }

    // Now for the complicated part...
    // Update the catchable ranges using the intersection of the next range
    // and the window itself. Merge together bordering windows.
    fish.addCatchableRange(dateFns.intervalIntersection(nextRange, window));
    return dateFns.isWithinInterval(+window.end + 1, origNextRange);
  }
}

let fishWatcher = new FishWatcher;
