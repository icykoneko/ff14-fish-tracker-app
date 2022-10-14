var __isFishPinned = (x) => false;
var __includeVerySoonBin = true;

function configureSorters(opts={}) {
  if (opts.isFishPinned) {
    __isFishPinned = opts.isFishPinned;
  }
  if (opts.includeVerySoonBin !== undefined) {
    __includeVerySoonBin = opts.includeVerySoonBin;
  }
}

let Sorters = function() {
  function shouldLog(a, b) {
    //fishes = _([a,b]).map((x) => x.name);
    //return _(fishes).contains("Vip Viper");
    return false;
  }
  function compare(a, b) {
    return a < b ? -1 : b < a ? 1 : 0;
  }
  function winner(a, b, result) {
    return result == -1 ? a.name : result == 1 ? b.name : "*tie*";
  }

  var maxTime = 0x7FFFFFFFFFFF;
  function getWindowStart(windows, offset) {
    if (windows === undefined) { return maxTime; }
    if (windows.length <= offset) { return maxTime; }
    return +windows[offset].start;
  }
  function getWindowEnd(windows, offset) {
    if (windows === undefined) { return maxTime; }
    if (windows.length <= offset) { return maxTime; }
    return +windows[offset].end;
  }

  function compareWindows(aStart, bStart, baseTime) {
    if (dateFns.isBefore(aStart, baseTime)) {
      aStart = baseTime;
    }
    if (dateFns.isBefore(bStart, baseTime)) {
      bStart = baseTime;
    }
    return dateFns.compareAsc(aStart, bStart);
  }

  function sortByNextAvailable(a, b, baseTime) {
    return compareWindows(a.getNextWindow(fishWatcher.fishEyesEnabled),
                          b.getNextWindow(fishWatcher.fishEyesEnabled),
                          baseTime);
  }

  function isFishUpNow(f, baseTime) {
    return dateFns.isBefore(f.getNextWindow(fishWatcher.fishEyesEnabled), baseTime);
  }

  function isUpVerySoon(f, baseTime) {
    return eorzeaTime.toEarth(f.getNextWindow(fishWatcher.fishEyesEnabled)) <
      +dateFns.addMinutes(eorzeaTime.toEarth(baseTime), 15);
  }

  function adjustedUptime(f) {
    // When Fish Eyes is applied to a fish without weather restrictions, the
    // computed uptime remains (this is technically a bug).
    // Or... is it a feature. Let's check if Fish Eyes is enabled, and if the
    // fish is not weather restricted, increase it's uptime by 100%.
    // By doing this, the fish remains sorted by its original uptime amonst
    // other non-weather restricted fishes.
    if (fishWatcher.fishEyesEnabled && f.isFishAlwaysUpUsingFishEyes()) {
      // Currently disabled due to how disruptive it is to the table.
      // 2020-12-08: Plushy says to revisit later, maybe after more tweaks to
      // rarity algorithm.
      return f.uptime() + 0;
    } else {
      return f.uptime();
    }
  }

  function sortByOverallRarity(a, b, baseTime) {
    var result = 0;
    // PINNED FISH ALWAYS COME FIRST!!!
    var pinnedA = __isFishPinned(a.id) ? -1 : 1;
    var pinnedB = __isFishPinned(b.id) ? -1 : 1;
    result = compare(pinnedA, pinnedB);
    if (result != 0) {
      return result;
    }
    // Fish which are ALWAYS up should come AFTER fish with limited uptime.
    var limitedA = a.alwaysAvailable ? 1 : -1;
    var limitedB = b.alwaysAvailable ? 1 : -1;
    result = compare(limitedA, limitedB);
    if (shouldLog(a, b))
      console.log("Comparing all-day availability:", winner(a,b,result),
        "\n", a.name, a.alwaysAvailable,
        "\n", b.name, b.alwaysAvailable);
    if (result != 0) {
      return result;
    }

    var aRanges = a.catchableRanges;
    var bRanges = b.catchableRanges;

    // How long is it up over the next n windows, relative to the other fish!
    aUptime = adjustedUptime(a);
    bUptime = adjustedUptime(b);

    result = compare(isFishUpNow(a, baseTime) ? -1 : 1,
                      isFishUpNow(b, baseTime) ? -1 : 1);
    if (shouldLog(a, b))
      console.log("Comparing 'is up now':", winner(a,b,result),
        "\n", a.name, isFishUpNow(a, baseTime),
        "\n", b.name, isFishUpNow(b, baseTime));
    if (result != 0) return result;

    if (__includeVerySoonBin) {
      // If both fish are now up yet, is one of them going to be up soon?
      if (!isFishUpNow(a, baseTime)) {
        var aUpSoon = isUpVerySoon(a, baseTime);
        var bUpSoon = isUpVerySoon(b, baseTime);
        result = compare(aUpSoon ? -1 : 1,
                          bUpSoon ? -1 : 1);
        if (shouldLog(a, b))
          console.log("Comparing 'is up very soon':", winner(a,b,result), +dateFns.addMinutes(baseTime, 15),
            "\n", a.name, aUpSoon, a.getNextWindow(fishWatcher.fishEyesEnabled),
            "\n", b.name, bUpSoon, b.getNextWindow(fishWatcher.fishEyesEnabled));
        if (result != 0) return result;
      }
    }

    // If both are in the same state, compare by rarity (shorter comes first)
    result = compare(aUptime, bUptime);
    if (shouldLog(a, b))
      console.log("Comparing uptime:", winner(a,b,result),
        "\n", a.name, aUptime,
        "\n", b.name, bUptime);
    if (result != 0) return result;

    // If both are the same, the fish whose window comes sooner comes first.
    result = compare(getWindowStart(aRanges, 1) || 0,
                      getWindowStart(bRanges, 1) || 0);
    if (shouldLog(a, b))
      console.log("Comparing time till next window:", winner(a,b,result),
        "\n", a.name, getWindowStart(aRanges, 1),
        "\n", b.name, getWindowStart(bRanges, 1));
    if (result == 0) {
      // Or, which ever fish's window closes first.
      result = compare(getWindowEnd(aRanges, 0),
                        getWindowEnd(bRanges, 0));
      if (shouldLog(a, b))
        console.log("Comparing remaining window time:", winner(a,b,result),
          "\n", a.name, getWindowEnd(aRanges, 0),
          "\n", b.name, getWindowEnd(bRanges, 0));

      if (result == 0) {
        // Ok fine... SORT BY ID!
        result = compare(a.id, b.id);
      }
    }
    return result;
  }

  function sortByWindowPeriods(a, b, baseTime) {
    var result = 0;
    // PINNED FISH ALWAYS COME FIRST!!!
    var pinnedA = __isFishPinned(a.id) ? -1 : 1;
    var pinnedB = __isFishPinned(b.id) ? -1 : 1;
    result = compare(pinnedA, pinnedB);
    if (result != 0) {
      return result;
    }
    // Fish which are ALWAYS up should come AFTER fish with limited uptime.
    var limitedA = a.alwaysAvailable ? 1 : -1;
    var limitedB = b.alwaysAvailable ? 1 : -1;
    result = compare(limitedA, limitedB);
    if (shouldLog(a, b))
      console.log("Comparing all-day availability:", result,
        "\n", a.name, a.alwaysAvailable,
        "\n", b.name, b.alwaysAvailable);
    if (result != 0) {
      return result;
    }

    var aRanges = a.catchableRanges;
    var bRanges = b.catchableRanges;

    // Next, we must consider fish which are CURRENTLY available.
    result = sortByNextAvailable(a, b, baseTime);
    if (shouldLog(a, b))
      console.log("Comparing next available:", result,
        "\n", a.name, a.getNextWindow(fishWatcher.fishEyesEnabled).toUTCString(),
        "\n", b.name, b.getNextWindow(fishWatcher.fishEyesEnabled).toUTCString());
    if (result != 0) {
      return result;
    }

    // How long is it up over the next n windows, relative to the other fish!
    aUptime = adjustedUptime(a);
    bUptime = adjustedUptime(b);
    // Compare uptime (shorter comes first)
    result = compare(aUptime, bUptime);
    if (shouldLog(a, b))
      console.log("Comparing uptime:", result,
        "\n", a.name, aUptime,
        "\n", b.name, bUptime);
    if (result != 0) return result;

    // If both are the same, the fish with the longer time till next window
    // comes first.
    result = compare(getWindowStart(bRanges, 1) || 0,
                      getWindowStart(aRanges, 1) || 0);
    if (shouldLog(a, b))
      console.log("Comparing time till next window:", result,
        "\n", a.name, getWindowStart(aRanges, 1).toUTCString(),
        "\n", b.name, getWindowStart(bRanges, 1).toUTCString());
    if (result == 0) {
      // Or, which ever fish's window closes first.
      result = compare(getWindowEnd(aRanges, 0),
                       getWindowEnd(bRanges, 0));
      if (shouldLog(a, b))
        console.log("Comparing remaining window time:", result,
          "\n", a.name, getWindowEnd(aRanges, 0).toUTCString(),
          "\n", b.name, getWindowEnd(bRanges, 0).toUTCString());
      if (result == 0) {
        // Ok fine... SORT BY ID!
        result = compare(a.id, b.id);
      }
    }

    return result;
  }

  return {
    sortByWindowPeriods: sortByWindowPeriods,
    sortByOverallRarity: sortByOverallRarity
  };
}();
