function shouldLogForFish(fish) {
  return false;
}

class Fish {
  constructor(fishData) {
    // Copy constructor version.
    if (fishData instanceof Fish) {
      _(this).clone(fishData);
      return;
    }
    _(this).extend(fishData);
    this.id = fishData._id;
    this.name = __p(DATA.ITEMS[this.id], "name");
    this.icon = DATA.ITEMS[this.id].icon;
    this.logging = shouldLogForFish(this);
    if (fishData.location !== null) {
      var fishingSpot = null;
      var spearfishing = false;
      var coords = null;
      if (fishData.gig !== null && fishData.gig !== undefined) {
        fishingSpot = DATA.SPEARFISHING_SPOTS[fishData.location];
        spearfishing = true;
      } else {
        fishingSpot = DATA.FISHING_SPOTS[fishData.location];
        spearfishing = false;
        coords = fishingSpot.map_coords;
      }
      if (fishingSpot.territory_id !== 0){
        this.location = {
          id: fishingSpot._id,
          name: __p(fishingSpot, "name"),
          zoneId: fishingSpot.territory_id, /* This is not a typo! */
          zoneName: __p(DATA.ZONES[DATA.WEATHER_RATES[fishingSpot.territory_id].zone_id], "name"),
          spearfishing: spearfishing,
          coords: coords,
        };
      } else {
        this.location = {name: '', zoneName: '', id: 0, zoneId: 0, coords: null, spearfishing: false};
      }
    } else {
      this.location = {name: '', zoneName: '', id: 0, zoneId: 0, coords: null, spearfishing: false};
    }
    this.catchableRanges = [];
    this.incompleteRanges = [];
    {
      var diff = Math.abs(this.endHour - this.startHour);
      this.dailyDuration =
        moment.duration(this.endHour < this.startHour ? 24 - diff : diff, 'hours');
    }
    this.conditions = {
      previousWeatherSet: _(this.previousWeatherSet).map((w) => DATA.WEATHER_TYPES[w]),
      weatherSet: _(this.weatherSet).map((w) => DATA.WEATHER_TYPES[w])
    };
    this.bait = {
      hasPredators: _(this.predators).size() > 0,
      predators: _(this.predators).map((v, k) => {
        return { id: Number(k),
                 count: v,
                 name: __p(DATA.ITEMS[k], "name"),
                 icon: DATA.ITEMS[k].icon };
      }),
      path: _(this.bestCatchPath).map((x) => DATA.ITEMS[x])
    };
    this.alwaysAvailable =
      this.weatherSet.length == 0 && this.startHour == 0 && this.endHour == 24;
    this.intuitionFish = [];

    // Allow for unknown data.
    if (this.dataMissing === undefined || this.dataMissing === null) {
      this.dataMissing = false;
    }

    // Create a subject for catchableRanges that we can subscribe to.
    this.catchableRangesObserver = new rxjs.Subject([]);

    this.__uptime = null;
    this.__uptimeDirty = true;
  }

  notifyCatchableRangesUpdated() {
    this.catchableRangesObserver.next(this.catchableRanges);
  }

  applyLocalization() {
    // This function allows for runtime language swapping.
    // Really, stuff like this belongs in the viewmodel, but there's a lot of
    // code in here that doesn't make sense lol. One day...
    this.name = __p(DATA.ITEMS[this.id], "name");
    if (this.location.id != 0) {
      if (this.location.spearfishing) {
        this.location.name = __p(DATA.SPEARFISHING_SPOTS[this.location.id], "name");
      } else {
        this.location.name = __p(DATA.FISHING_SPOTS[this.location.id], "name");
      }
      this.location.zoneName = __p(DATA.ZONES[DATA.WEATHER_RATES[this.location.zoneId].zone_id], "name");
    }
    if (this.bait.hasPredators) {
      _(this.bait.predators).each((p) => {
        p.name = __p(DATA.ITEMS[p.id], "name");
      });
    }
  }

  isCatchable(fe = false, dt = null) {
    if (dt === null) dt = Date.now();
    var crs = this.catchableRanges;
    if (crs.length > 0) {
      return dateFns.isSameOrAfter(dt, eorzeaTime.toEarth(+crs[0].start()));
    }
    if (fe === true && this.fishEyes) {
      // This logic is a little odd... Callers expect `isCatchable` to only
      // return true iif the fish is not always available, but is available
      // right now. So for Fish Eyes, the fish still needs to not always be
      // available in addition to having no weather restrictions for this to
      // return true.
      if (!this.alwaysAvailable && this.conditions.weatherSet.length == 0) {
        // But wait... does it require intuition? If so, you gotta check with
        // those fish as well...
        if (this.intuitionFish.length != 0) {
          return _(this.intuitionFish).any((iFish) => {
            return iFish.data.isCatchable(fe, dt);
          });
        } else {
          // Nope? Then yer good!
          return true;
        }
      }
    }
    return false;
  }

  getNextWindow(fe = false) {
    // Mostly to aid with sorting. This function returns the next time the fish
    // is catchable, factoring in Fish Eyes. The time is EORZEA TIME!
    var crs = this.catchableRanges;
    if (crs.length > 0) {
      return +crs[0].start();
    }
    if (fe === true && this.fishEyes) {
      if (!this.alwaysAvailable && this.conditions.weatherSet.length == 0) {
        // But wait... does it require intuition? If so, you gotta check with
        // those fish as well...
        if (this.intuitionFish.length != 0) {
          return _.min(_(this.intuitionFish).map(iFish => iFish.data.getNextWindow(fe)));
        } else {
          // Nope? Then yer good!
          return 0;
        }
      }
    }
    return 0x7FFFFFFFFFFF; /* max time */
  }

  isFishAlwaysUpUsingFishEyes() {
    // Well, is it?
    if (this.alwaysAvailable) return true;
    if (this.fishEyes && !this.alwaysAvailable && this.conditions.weatherSet.length == 0) {
      // Check intuition fish too...
      if (this.intuitionFish.length != 0) {
        return _(this.intuitionFish).any(iFish => {
          return iFish.data.isFishAlwaysUpUsingFishEyes();
        });
      }
      return true;
    }
    return false;
  }

  uptime() {
    if (this.__uptimeDirty) {
      let crs = this.catchableRanges;
      if (crs.length > 0) {
        // Compute the overall time this fish is up for.
        let overallTime = +_(crs).last().end() - +_(crs).first().start();
        this.__uptime = _(crs).reduce(
          (uptime, range) => uptime += range.asDuration('milliseconds'), 0) / overallTime;
      } else {
        this.__uptime = 1;
      }
      this.__uptimeDirty = false;
    }
    return this.__uptime;
  }

  availableRangeDuring(r, fe = false) {
    // This function returns an array of ranges the fish is up based on the start
    // time of the specified range, r. The caller must still intersect this range
    // if necessary though... Normally, this will only ever return two items if
    // the fish's duration wraps around a given period (since the input to this
    // function is normally an 8-hour weather period.)

    // If the fish is always available, just return the given range.
    // Also, if Fish Eyes is enabled, assuming this fish supports it, just
    // return the given range as well.
    if ((fe === true && this.fishEyes) || (this.startHour == 0 && this.endHour == 24)) {
      return [r];
    }
    // How long is the fish normally available?
    var d = this.dailyDuration;
    var m = +r.start();
    let o = [];
    var rs = dateFns.utc.addMinutes(dateFns.utc.setHours(m, this.startHour), (this.startHour % 1) * 60);

    if (this.endHour < this.startHour) {
      // Available times wraps around date...
      if (dateFns.utc.getHours(m) < this.endHour) {
        // Use the *remaining* portion of the catchable range which started
        // yesterday, as well as any portion intersecting today's window.
        o.push(d.afterMoment(moment.utc(dateFns.utc.subDays(rs, 1))));
        if (dateFns.utc.getHours(+r.end()) > this.startHour) {
          // Also include the portion of the window when the fish is available once again.
          o.push(d.afterMoment(moment.utc(rs)));
        }
      } else {
        o.push(d.afterMoment(moment.utc(rs)));
      }
    } else if (dateFns.utc.getHours(m) < this.endHour) {
      // Available times limited to this date.
      // The fish's *current* range begins (or began) today.
      o.push(d.afterMoment(moment.utc(rs)));
    }
    return o;
  }

  addCatchableRange(nextRange) {
    // Invalidate previously cached uptime value.
    this.__uptimeDirty = true;

    // Add or merge next range with existing catchable ranges.
    if (_(this.catchableRanges).isEmpty()) {
      // The first entry is special. We can simply push it into the array.
      // Remember, it's observable!
      this.catchableRanges.push(nextRange);
      this.notifyCatchableRangesUpdated();
      return;
    }

    var lastRange = _(this.catchableRanges).last();
    // WARNING:
    //   You should never call this function giving the same range as the last
    //   one. Also, the next range BETTER be AFTER the last one!!!
    if (nextRange.start().isBefore(lastRange.end())) {
      console.error("CRITICAL BUG: The next range starts before the end of the last range!");
      return;
    }
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
    this.catchableRanges.splice.apply(
      this.catchableRanges, [-1, 1].concat(merged) );
    this.notifyCatchableRangesUpdated();
  }

  stashIncompleteWindows(maxWindows) {
    // Helper function to work around messy wrap-around windows that are incomplete.
    if (this.catchableRanges.length > maxWindows) {
      // Oops, we ended up holding on to an extra window...
      this.__uptimeDirty = true;
      this.incompleteRanges = this.catchableRanges.splice(maxWindows);
      this.notifyCatchableRangesUpdated();
    }
  }
}

function muxinIntuitionReqs(fish, idx, fishes) {
  if (fish.bait.hasPredators) {
    // Attach the generated intuition requirement fish to this so it's easier to
    // look up on updates.
    fish.intuitionFish = _(fish.bait.predators).map((predFish) => {
      return {count: predFish.count,
              data: _(fishes).findWhere({id: predFish.id}) };
    });
    if (fish.alwaysAvailable) {
      // Make sure its intuition requirements are ALSO always available...
      fish.alwaysAvailable = _(fish.intuitionFish).all((iFish) => {
        return iFish.data.alwaysAvailable;
      });
    }
  }
}

let Fishes = _(DATA.FISH).chain()
  .values()
  .map((fishData) => new Fish(fishData))
  .each(muxinIntuitionReqs)
  .value();
