import { Tracker } from 'meteor/tracker';
import { Fishes, FISH_AND_TACKLE } from './fishes.js';
import { weatherService, Weather } from '../weatherservice/weatherservice.js';
import { eorzeaTime } from '../time/time.js';
import { FISHING_SPOTS } from '../area/location.js';

const EARTH_TO_EORZEA = 3600 / 175;
const EORZEA_TO_EARTH = 1 / EARTH_TO_EORZEA;
const MS_IN_AN_HOUR = 60 * 60 * 1000;
const MS_IN_A_DAY = 24 * MS_IN_AN_HOUR;

function getFishDailyRange(fish) {
  var diff = Math.abs(fish.endHour - fish.startHour);
  return moment.duration(fish.endHour < fish.startHour ? 24 - diff : diff, 'hours');
}

function getFishDailyDuration(fish) {
  var diff = Math.abs(fish.endHour - fish.startHour);
  return moment.duration(fish.endHour < fish.startHour ? 24 - diff : diff, 'hours');
}

function getFishAvailableRangeDuring(fish, r) {
  // OPTIMIZATION: If fish is potentially available 24-hours, just return the
  // given range.
  if (fish.startHour == 0 && fish.endHour == 24) {
    return r;
  }
  // NOTE: This function expects to be operating on 8-hour ranges. It will not
  // return multiple ranges if the input range is more than 24 hours long.
  var d = getFishDailyDuration(fish);
  var m = r.start();
  if (logForFish(fish))
    console.log("Computing catchable range during or after", m.format());
  var retval = null;
  if (fish.endHour < fish.startHour) {
    // Available times wraps around date...
    if (m.hour() < fish.endHour) {
      // Return the remaining portion of the catchable range which started
      // yesterday.
      retval = d.afterMoment(m.subtract(1, 'day').hour(fish.startHour));
    } else {
      // Otherwise, return the window for today.
      retval = d.afterMoment(m.hour(fish.startHour));
    }
  } else {
    // Available times limited to this date.
    if (m.hour() < fish.endHour) {
      // The fish's "current" range begins (or began) today.
      // Return whatever's remaining today if it's already begun.
      retval = d.afterMoment(m.hour(fish.startHour));
    } else {
      // Return tomorrow's range since we're past the end hour for today.
      retval = d.afterMoment(m.add(1, 'day').hour(fish.startHour));
    }
  }
  if (logForFish(fish))
    console.log("Catchable range:", retval.simpleFormat());
  return retval;
}

function startOfPeriod(m) {
  return m.hour(parseInt(m.hour() / 8) * 8).startOf('hour');
}

function logForFish(fish) {
  //return fish._id == 7693 || fish._id == 7682;
  //return fish._id == 4905;
  //return fish._id == 7700;
  //return fish._id == 7927;
  return false;
}

//
// FishWatcher: Every Eozean hour, it confirms each fish has data for the next
// 'n' windows. Uses the Weather service to obtain weather data for time periods
// needed to cover such requirements.
class FishWatcher {
  constructor() {
    this.lastBellConsidered = -1;
    this.maxWindows = 10;

    this.fishes = null;

    Tracker.autorun((c) => {
      var currentBell = eorzeaTime.getCurrentBell();
      if (currentBell == this.lastBellConsidered) {
        console.warn("Already considered updating fishes this bell...");
        return;
      }
      this.lastBellConsidered = currentBell;
      this.forceUpdate();
    });
  }

  forceUpdate() {
    console.info("FishWatcher is considering updating fishes!");

    // Fetch all the fishies!
    this.fishes = Fishes.find({}, {reactive: false}).fetch();

    // Track the fish we need to send updates for.
    var idsToUpdate = {};

    // CLEANUP PHASE:
    //   Remove expired windows.
    _(this.fishes).each((fish) => {
      // TODO: Should be able to write a database query that will just
      // auto-select these fish...
      if (fish.catchableRanges.length > 0 &&
          eorzeaTime.getCurrentEorzeaDate().isSameOrAfter(fish.catchableRanges[0][1])) {
        // Fishes.update({ _id: fish._id }, { $pop: { catchableRanges: -1 } });
        if (logForFish(fish))
          console.log("Removing expired window:",
            moment.utc(fish.catchableRanges[0][0])
            .twix(moment.utc(fish.catchableRanges[0][1])).simpleFormat());
        idsToUpdate[fish._id] = true;
        fish.catchableRanges = _(fish.catchableRanges).drop(1);
      }
    });

    // PHASE 1:
    //   Generate data for 'n' windows for all fish.
    _(this.fishes).each((fish) => {
      // Since we are only getting 5 windows, we need to consider fish that
      // required "predators" before anything else. Either that, or we need
      // to make a later pass which will expand both fish's ranges.
      if (this.updateRangesForFish(fish)) {
        // We should always need to update this id.
        idsToUpdate[fish._id] = true;
        if (logForFish(fish))
          console.log("Catchable Ranges:\n  " +
            _(fish.catchableRanges).map((r) => {
              return moment.utc(r[0]).twix(moment.utc(r[1])).simpleFormat();
            }).join("\n  "));
      }
    });

    // // PHASE 2:
    // //   Adjust catchable ranges for fish with predators.
    // _(this.fishes).chain()
    //   .filter((fish) => _(fish.predators).size() > 0)
    //   .each((fish) => {
    //     // There *can* be more than one predator...
    //     _(fish.predators).chain().keys().each((predId) => {
    //       // Find the record for this fish's predator.
    //       var predatorFish = _(this.fishes).findWhere({_id: Number(predId)});
    //       if (predatorFish.catchableRanges.length == 0) {
    //         // The predator fish is ALWAYS up (probably).
    //         return;
    //       }
    //       var fishRanges = _(fish.catchableRanges).map((r) => {
    //         return moment.utc(r[0]).twix(moment.utc(r[1]));
    //       });
    //       var predRanges = _(predatorFish.catchableRanges).map((r) => {
    //         return moment.utc(r[0]).twix(moment.utc(r[1]));
    //       });
    //       var reducedRanges = _(fishRanges).chain()
    //         .map((fr) => {
    //           // Find overlapping predator ranges. (Should only be one or none)
    //           return [fr, _(predRanges).filter((pr)=>pr.overlaps(fr))]
    //         })
    //         // Filter out source ranges with no predator overlap.
    //         .filter((r) => r[1].length>0)
    //         // Finally, intersect the fish with its overlapping predator window.
    //         .map((x) => {
    //           var r = x[0].intersection(x[1][0]);
    //           return [+r.start(), +r.end()];
    //         })
    //         .value();
    //       // Reassign the new ranges to the source fish.
    //       // Fishes.update(
    //       //   {_id: fish._id},
    //       //   {$set: {catchableRanges: reducedRanges}});
    //       idsToUpdate[fish._id] = true;
    //       // NOTE: We may have reduced the number of ranges for this fish.
    //       // It would really be nice to extend it again... For now, just leave it.
    //     });
    // });

    // Update the database.
    _(idsToUpdate).chain().keys().each((id) => {
      console.log("Committing update for:", FISH_AND_TACKLE[Number(id)].name);
      Fishes.update({_id: Number(id)},
        {$set: {catchableRanges:
          _(this.fishes).findWhere({_id: Number(id)}).catchableRanges}});
    });

    // Destroy reference to fish list.
    this.fishes = null;
  }

  __checkToAddCatchableRange(fish, window) {
    var result = {updated: false, spansPeriods: false};
    if (logForFish(fish))
      console.log("Compatible weather found:", window.simpleFormat());
    // Check if the fish is catchable during this time period.
    var nextRange = getFishAvailableRangeDuring(fish, window);
    if (!window.overlaps(nextRange)) {
      if (logForFish(fish))
        console.log("Range does not overlap:", nextRange.simpleFormat());
      return result;
    }
    // IMPORTANT: Verify this range hasn't already expired!
    if (nextRange.end().isSameOrBefore(eorzeaTime.getCurrentEorzeaDate())) {
      if (logForFish(fish))
        console.log("Range has already expired:", nextRange.simpleFormat());
      return result;
    }

    // If this fish has predators, you need to also consider their windows.
    // In order to maintain the same number of windows for each fish, we perform
    // the predator window check here.
    if (_(fish.predators).size() > 0) {
      _(fish.predators).chain().keys().each((predId) => {
        if (nextRange === null) return;
        // Find the record for this fish's predator.
        var predatorFish = _(this.fishes).findWhere({_id: Number(predId)});
        if (predatorFish.weatherSet.length == 0 &&
            predatorFish.startHour == 0 &&
            predatorFish.endHour == 24) {
          // It's always up, so return the original range.
          return nextRange;
        }
        // Otherwise, we need to essentially do the same as we're doing right
        // now, check if the weather's good for the predator.
        var iter = weatherService.findWeatherPattern(
          nextRange.start(),
          FISHING_SPOTS[predatorFish.location].territory_id,
          predatorFish.previousWeatherSet,
          predatorFish.weatherSet,
          1
        );
        var _iterItem = iter.next();
        if (_iterItem.done) { nextRange = null; return; }
        var predWindow = _iterItem.value;
        var predRange = getFishAvailableRangeDuring(predatorFish, predWindow);
        if (!predWindow.overlaps(predRange)) { nextRange = null; return; }
        if (predRange.end().isSameOrBefore(eorzeaTime.getCurrentEorzeaDate())) {
          nextRange = null; return;
        }
        nextRange = nextRange.intersection(predRange); return;
      });
    }
    if (nextRange === null) {
      // One of its predators isn't available right now I guess...
      return result;
    }

    // Update the catchable ranges (merging if necessary).
    // Limit to just the part of the range in the period.
    this.updateCatchableRanges(fish, nextRange.intersection(window));
    // Check if the next range spans into the next period (so we can do
    // follow-on checks).
    result.spansPeriods = nextRange.contains(window.end().add(1));
    result.updated = true;
    return result;
  }

  updateRangesForFish(fish) {
    // Have enough data already?
    if (fish.catchableRanges.length >= this.maxWindows) {
       return false;
    }
    // Is this fish ALWAYS up (with no weather reqs)
    if (fish.weatherSet.length == 0 && fish.startHour == 0 && fish.endHour == 24) {
      return false;
    }

    var updated = false;

    // Resume where from the end of the last window.
    var startOfWindow = null;
    var latestWindow = _(fish.catchableRanges).last();
    if (latestWindow) {
      startOfWindow = moment.utc(latestWindow[1]);
      var h = startOfWindow.hour();
      if (h != 0 && h != 8 && h != 16) {
        // OPTIMIZATION (and safeguard):
        // Since we always check the entire weather period, we need to move to
        // the next period if the last window ended before the period ended.
        startOfPeriod(startOfWindow).add(8, 'hours');
      }

    } else {
      startOfWindow = eorzeaTime.getCurrentEorzeaDate();
    }
    if (logForFish(fish))
      console.log("Updating catchable ranges, starting from:", startOfWindow.format());
    /*
     * Request matching weather patterns starting with this window. If the fish
     * is available during this period, push the overlapping window onto the
     * list. If the fish's availability window spans periods, i.e. 7-9, then
     * peek at the next period(s) to form the largest period.
     *
     * TODO: Provide hint to the weather matching function so that it can know
     * to yield longest ranges.
     *
     * Who is respensible then? Seems like fish watcher should be handling this
     * part of the logic, and weather service just returns the matching weather
     * patterns.
     */

    // Create a new iterator (no limit imposed)
    var weatherIter = weatherService.findWeatherPattern(
      startOfWindow,
      FISHING_SPOTS[fish.location].territory_id,
      fish.previousWeatherSet,
      fish.weatherSet);
    // console.log("Created iterator", weatherIter);
    var lastRangeSpansPeriods = false;
    // Keep going until you have filled in the necessary number of windows.
    while (fish.catchableRanges.length < this.maxWindows) {
      var _iterItem = weatherIter.next();
      // console.log("Next item:", _iterItem);
      // SANITY CHECK
      if (_iterItem.done) {
        console.warn("Stopped iterating early!", fish);
        break;
      }
      // Get the next period with the correct weather pattern.
      var wr = _iterItem.value;
      var result = this.__checkToAddCatchableRange(fish, wr);
      updated = result.updated;
      lastRangeSpansPeriods = result.spansPeriods;
      // if (logForFish(fish))
      //   console.log("Compatible weather found:", wr.simpleFormat());
      // // Check if the fish is catchable during this time period.
      // var nextRange = getFishAvailableRangeDuring(fish, wr);
      // if (!wr.overlaps(nextRange)) {
      //   if (logForFish(fish))
      //     console.log("Range does not overlap:", nextRange.simpleFormat());
      //   continue;
      // }
      // // IMPORTANT: Verify this range hasn't already expired!
      // if (nextRange.end().isSameOrBefore(eorzeaTime.getCurrentEorzeaDate())) {
      //   if (logForFish(fish))
      //     console.log("Range has already expired:", nextRange.simpleFormat());
      //   continue;
      // }
      //
      // // Update the catchable ranges (merging if necessary).
      // // Limit to just the part of the range in the period.
      // this.updateCatchableRanges(fish, nextRange.intersection(wr));
      // updated = true;
      // // Check if the next range spans into the next period (so we can do
      // // follow-on checks).
      // lastRangeSpansPeriods = nextRange.contains(wr.end().add(1));
    }
    // Make sure the LAST window is complete (account for multi-period spans)
    while (lastRangeSpansPeriods) {
      // Reset flag.
      lastRangeSpansPeriods = false;
      // Find the NEXT valid period, limited to just one iteration.
      var iter = weatherService.findWeatherPattern(
        moment.utc(_(fish.catchableRanges).last()[1]),
        FISHING_SPOTS[fish.location].territory_id,
        fish.previousWeatherSet,
        fish.weatherSet,
        1
      );
      var _iterItem = iter.next();
      if (_iterItem.done) {
        break;
      }
      // Get the next period with the correct weather pattern.
      var wr = _iterItem.value;
      var result = this.__checkToAddCatchableRange(fish, wr);
      updated = result.updated;
      lastRangeSpansPeriods = result.spansPeriods;

      // // Check if the fish is catchable during this time period.
      // var nextRange = getFishAvailableRangeDuring(fish, wr);
      // if (!wr.overlaps(nextRange)) {
      //   if (logForFish(fish))
      //     console.log("Range does not overlap:", nextRange.simpleFormat());
      //   break;
      // }
      // // Update the catchable ranges (merging if necessary).
      // // Limit to just the part of the range in the period.
      // this.updateCatchableRanges(fish, nextRange.intersection(wr));
      // updated = true;
      // // Check if the next range spans into the next period (so we can do
      // // follow-on checks).
      // lastRangeSpansPeriods = nextRange.contains(wr.end().add(1));
    }
    // // Commit the update to the database.
    // Fishes.update(
    //   {_id: fish._id},
    //   {$set: {catchableRanges: fish.catchableRanges}});
    return updated;
  }

  updateCatchableRanges(fish, nextRange) {
    // nextRange should be a moment.twix data type.
    // FIRST ENTRY IS SPECIAL!!!
    if (_(fish.catchableRanges).isEmpty()) {
      // Fishes.update(
      //   {_id: fish._id},
      //   {$push: {catchableRanges: [+nextRange.start(), +nextRange.end()]}});
      // DON'T FORGET TO CHANGE YOUR LOCAL COPY TOO!!!!
      fish.catchableRanges.push([+nextRange.start(), +nextRange.end()]);
      return;
    }
    var lastRange = _(fish.catchableRanges).last();
    // WARNING:
    //   You should never call this function giving the same range as the last
    //   one. Also, the next range BETTER be AFTER the last one!!!
    if (+nextRange.start() < lastRange[1]) {
      console.error(
        "CRITICAL BUG: The next range starts before the end of the last " +
        "range!");
      return;
    }
    lastRange = moment.utc(lastRange[0]).twix(moment.utc(lastRange[1]));
    if (logForFish(fish))
      console.log("Last catchable range:", lastRange.simpleFormat());
    var merged = lastRange.xor(nextRange);
    // SAFEGUARD:
    //   If everything's being done right, xor should NEVER return a list
    //   of nothing! But, mistakes happen, and to avoid deleting data by
    //   mistake in addition, we'll just abort right here... and complain...
    if (merged === null || merged.length == 0) {
      console.error("CRITICAL BUG: merged is empty?!",
        {lastRange: lastRange.simpleFormat(),
         nextRange: nextRange.simpleFormat()});
      return;
    }
    // Replace the last catchable range with the first merged element.
    // If present, add the second merged element to the end of the list.
    if (logForFish(fish))
      console.log("Merged ranges:", _(merged).map((r) => r.simpleFormat()));
    fish.catchableRanges.splice.apply(
      fish.catchableRanges, [-1, 1].concat(
        _(merged).map((x) => [+x.start(), +x.end()]) ) );
    // TODO: It'd be nice if you could do something more like,
    // combine $slice and $position with the $push operator.
    // Fishes.update(
    //   {_id: fish._id},
    //   {$set: {catchableRanges: fish.catchableRanges}});
  }

}




class FishWatcher2 {
  constructor() {
    this.lastBellConsidered = -1;

    // We'll incrementally build up the catchable ranges 1/4 day at a time
    // until reaching 7 days worth of cached information.
    this.fetchDuration = moment.duration(0);
    this.fetchIncrement = moment.duration(0.25, 'day');
    this.maxFetchDuration = moment.duration(7, 'days');

    this.fetchDep = new Tracker.Dependency;
  }

  startPolling() {
    // Update the fishes catchability every bell?
    Tracker.autorun((c) => {
      var currentBell = eorzeaTime.getCurrentBell();
      if (currentBell == this.lastBellConsidered) {
        console.warn("Already considered updating fishes this bell...");
        return;
      }
      this.lastBellConsidered = currentBell;
      console.log("Considering updating fishes...");
      // Only compute the availability once per day!
      if (currentBell == 0 || c.firstRun || this.fetchDuration < this.maxFetchDuration) {
        this.checkFish(currentBell);
      }

      // ALWAYS remove expired entries every hour.
      Fishes.find({}).forEach((fish) => {
        if (fish.catchableRanges.length > 0) {
          if (eorzeaTime.getCurrentEorzeaDate().isSameOrAfter(fish.catchableRanges[0][1])) {
            if (logForFish(fish))
              console.log("Removing stale entry for", fish.name(), ":", fish.catchableRanges[0][1]);
            // if (fish.catchableRanges.length == 1) {
            //   Fishes.update({ key: fish.key },
            //     { $set: { isCatchable: false,
            //               nextWindowStart: null,
            //               nextWindowLength: null } });
            // }
            Fishes.update({ _id: fish._id }, { $pop: { catchableRanges: -1 } });
          }
          // else {
          //   Fishes.update({ key: fish.key },
          //     { $set: { isCatchable: true,
          //               nextWindowStart: fish.catchableRanges[0][0],
          //               nextWindowLength: fish.catchableRanges[0][1] - fish.catchableRanges[0][0] } });
          // }
        }
      });
    });
  }

  increaseFetchDuration() {
    if (this.fetchDuration < this.maxFetchDuration) {
      this.fetchDuration.add(this.fetchIncrement);
      this.fetchDep.changed();
      console.info("Fetch duration increased to", this.fetchDuration.humanize());
    }
  }

  getFetchDuration() {
    this.fetchDep.depend();
    return moment.duration(this.fetchDuration);
  }

  getFetchDurationAsEorzeaDuration() {
    return moment.duration(
      this.fetchDuration.asMilliseconds() * EARTH_TO_EORZEA);
  }

  checkFish(bell) {
    // Each time we check, we increase the fetch duration some more.
    this.increaseFetchDuration();

    // Even though it's possible for this function to get kicked off at times
    // other than the start of the day, we'll always use a window starting at
    // the beginning of the eorzean day (at least for now...)
    // The reasoning behind this is, a fish is only up during one range per day
    // and the algorithm for determining ranges utilizes this fact...
    // Basically, we slide window by 1 Eorzean day until reaching the limit.
    var eorzeaDate = eorzeaTime.getCurrentEorzeaDate();
    var edt = moment.utc(eorzeaDate).startOf('day');
    var window = this.getFetchDurationAsEorzeaDuration().afterMoment(edt);
    console.info("Updating fish availability ranges for", window.simpleFormat());
    //var currentBell = bell;

    var abort = false;
    // PASS 1: Figure out catchable ranges based on time and weather.
    Fishes.find({}).forEach((fish) => {
      if (abort) return;

      // SKIP ALL-DAY EVERY DAY FISH!
      if (fish.weatherSet.length == 0 && fish.startHour == 0 && fish.endHour == 24) {
        if (logForFish(fish))
          console.log("Skipping", fish.name(), "because it's ALWAYS up!");
        return;
      }

      // Update the fish's availability.
      if (!this.computeCatchableRanges(fish, window)) {
        // Something's gone wrong, abort!!!
        abort = true;
      } else {
      }
    });
    // PASS 2: For the fish who have predators, adjust catchable ranges.
    Fishes.find({predator: {$not: null}}).forEach((fish) => {
      // Find the record for this fish's predator.
      var predatorFish = Fishes.findOne({_id: fish.predator});
      if (predatorFish.catchableRanges.length == 0) {
        // The predator fish is ALWAYS up (probably).
        return;
      }


      var fishRanges = _(fish.catchableRanges).map((r) => {
        return moment.utc(r[0]).twix(moment.utc(r[1]));
      });
      var predRanges = _(predatorFish.catchableRanges).map((r) => {
        return moment.utc(r[0]).twix(moment.utc(r[1]));
      });
      var reducedRanges = _(fishRanges).chain()
        .map((fr) => {
          // Find overlapping predator ranges. (Should only be one or none)
          return [fr, _(predRanges).filter((pr)=>pr.overlaps(fr))]
        })
        // Filter out source ranges with no predator overlap.
        .filter((r) => r[1].length>0)
        // Finally, intersect the fish with its overlapping predator window.
        .map((x) => {
          var r = x[0].intersection(x[1][0]);
          return [+r.start(), +r.end()];
        })
        .value();
      // Reassign the new ranges to the source fish.
      Fishes.update(
        {_id: fish._id},
        {$set: {catchableRanges: reducedRanges}});
    });

    // 3rd PASS: (TODO)
    // Always make sure there's at least TWO definite ranges identified!
    // It might be better to instead of using a timespan, collect up to some
    // number of future windows per fish. The sorting algorithm can be tweaked
    // to support data in this form as well (I think).
  }

  updateCatchableRanges(fish, nextRange) {
    //console.log("catchableRanges:", fish.catchableRanges);
    // nextRange should be a moment.twix data type.
    // FIRST ENTRY IS SPECIAL!!!
    if (_(fish.catchableRanges).isEmpty()) {
      Fishes.update(
        {_id: fish._id},
        {$push: {catchableRanges: [+nextRange.start(), +nextRange.end()]}});
      // DON'T FORGET TO CHANGE YOUR LOCAL COPY TOO!!!!
      fish.catchableRanges.push([+nextRange.start(), +nextRange.end()]);
      return;
    }
    var lastRange = _(fish.catchableRanges).last();
    lastRange = moment.utc(lastRange[0]).twix(moment.utc(lastRange[1]));
    if (logForFish(fish))
      console.log("Last catchable range:", lastRange.format());
    var merged = lastRange.xor(nextRange);
    // Replace the last catchable range with the first merged element.
    // If present, add the second merged element to the end of the list.
    if (logForFish(fish))
      console.log("Merged ranges:", _(merged).map((r) => r.format()));
    fish.catchableRanges.splice.apply(
      fish.catchableRanges, [-1, 1].concat(
        _(merged).map((x) => [+x.start(), +x.end()]) ) );
    // TODO: It'd be nice if you could do something more like,
    // combine $slice and $position with the $push operator.
    Fishes.update(
      {_id: fish._id},
      {$set: {catchableRanges: fish.catchableRanges}});
  }

  computeCatchableRanges(fish, window) {
    // Pick up where we left off computation-wise for this fish.
    var latestWindow = _(fish.catchableRanges).last();
    if (latestWindow) {
      // Set our "start" time to where we left off.
      window = moment.utc(latestWindow[1]).twix(moment.utc(window.end()));
    }
    if (logForFish(fish))
      console.info("Determining " + fish.name() + "'s availability for:", window.format());
    // Of the time in the window, when is this fish normally available?
    var FAIL_SAFE = 200;
    while (nextRange = this.getNextCatchableRange(fish, window)) {
      if (--FAIL_SAFE == 0) {
        console.error("CRITICAL: Something is wrong here!!!");
        return false;
      }
      if (logForFish(fish))
        console.log("Considering next range:", nextRange.simpleFormat());
      // Shortcut: If this fish has no weather requirements...
      if (_(fish.weatherSet).isEmpty()) {
        if (logForFish(fish))
          console.info("Added", nextRange.simpleFormat(), "to " + fish.name() + "'s availability.");
        this.updateCatchableRanges(fish, nextRange);
        // var result = Fishes.update(
        //   {_id: fish._id},
        //   {$push: {catchableRanges: [+nextRange.start(), +nextRange.end()]}});
        // console.info("Document(s) updated: ", result);
      }
      else {
        // Ok, this fish "can" be up during this range. Make sure the weather's
        // good for it though. You need the period that overlaps the start of the
        // range (plus the previous period), up to the period overlapping the end
        // of the range.

        // For example:
        // 00              08              16             24
        // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
        // |               | <----->       |               |  nextRange: 9am-12pm
        // |~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~|               |  neededRanges: 00-08, 08-16

        // 00              08              16             24
        // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
        // |               |       <-------|->             |  nextRange: 12pm-5pm
        // |~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~|  neededRanges: 00-08, 08-16, 16-24
        // |     SUNNY     |     FOGGY     |     CLOUDY    |  needs Sunny->Foggy
        // |               |       <------->               |  actual window = 12pm-4pm



        var wps = startOfPeriod(moment(nextRange.start())).subtract(8, 'hours');
        var wpe = startOfPeriod(moment(nextRange.end()).subtract(1, 'second'));

        _(Weather.find({ date: { $gte: +wps, $lte: +wpe } },
                       { sort: {date: 1}}).fetch()).each((w, i, ww) => {
          // No need to look at the first weather range since it's in the past.
          if (i == 0) {
            return;
          }

          var area = FISHING_SPOTS[fish.location].territory_id;

          if (logForFish(fish))
            console.log("Checking weather period:", moment.duration(8, 'hours').afterMoment(moment.utc(w.date)).simpleFormat());
          // Check if the fish has a previous weather requirement.
          if (!_(fish.previousWeatherSet).isEmpty() &&
              !_(fish.previousWeatherSet).contains(ww[i - 1].weather(area))) {
            // if (logForFish(fish))
            //   console.info("Previous weather requirement not met:", ww[i - 1].weather(area));
            return;
          }

          // Now check if the fish satisfies the current weather requirement.
          if (!_(fish.weatherSet).contains(w.weather(area))) {
            // if (logForFish(fish))
            //   console.info("Current weather requirement not met:", w.weather(area));
            return;
          }

          // Ok, all time/weather requirements look ok. Add the intersection of
          // this weather range to the catchable ranges.
          var slice = nextRange.intersection(
            moment.duration(8, 'hours').afterMoment(moment.utc(w.date)));
          if (slice.isValid()) {
            if (logForFish(fish))
              console.info("Added", slice.simpleFormat(), "to " + fish.name() + "'s availability.");
            this.updateCatchableRanges(fish, slice);
            // var result = Fishes.update(
            //   {_id: fish._id},
            //   {$push: {catchableRanges: [+slice.start(), +slice.end()]}});
            // console.info("Document(s) updated: ", result);
          }
        });
      }

      // Reduce the window before attempting to continue.
      // console.log("window: ", window);
      // console.log("nextRange: ", nextRange);
      var rangeToRemove = moment(window.start()).twix(nextRange.end());
      // console.log("Removing range from window:", rangeToRemove.format());
      var remainingWindow = window.difference(rangeToRemove);
      // console.log("remaingingWindow = ", remainingWindow)
      if (remainingWindow.length == 0) {
        // Exit now.
        // console.log("Window exhausted...");
        break;
      }
      window = _(remainingWindow).last();
      //console.log("Continuing with remaining window:", window.simpleFormat());
    }
    return true;
  }

  getNextCatchableRange(fish, window) {
    // Make a range representing the fish's daily window.
    var dailyLength = getFishDailyRange(fish);
    if (window.start().hour() <= fish.startHour) {
      // The next "catchable" range is during this day.
      return dailyLength.afterMoment(
        moment.utc(window.start()).hour(fish.startHour).startOf('hour'));
    } else {
      // Assume we already checked today's range. Use tomorrow if it's
      // still within the overall window.
      var tomorrowRange = dailyLength.afterMoment(
        moment.utc(window.start()).hour(fish.startHour).startOf('hour').add(1, 'day'));
      if (tomorrowRange.start().isSameOrBefore(window.end())) {
        return tomorrowRange;
      }
    }
    return null;
  }

}

export let fishWatcher = new FishWatcher;
