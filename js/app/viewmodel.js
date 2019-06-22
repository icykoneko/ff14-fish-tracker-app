class CompletionManager {
  constructor() {
    this.rx_completed = new Rx.BehaviorSubject([]);
    this.rx_pinned = new Rx.BehaviorSubject([]);

    this.completed = [];
    this.pinned = [];
    if (localStorage.completed) {
      var completed = JSON.parse(localStorage.completed);
      this.rx_completed.onNext(
        this.completed = _(completed).reduce((o, v) => o.concat(Number(v)), []));
    }
    if (localStorage.pinned) {
      var pinned = JSON.parse(localStorage.pinned);
      this.rx_pinned.onNext(
        this.pinned = _(pinned).reduce((o, v) => o.concat(Number(v)), []));
    }
  }

  isFishCaught(fish_id) {
    return _(this.completed).contains(fish_id);
  }

  isFishPinned(fish_id) {
    return _(this.pinned).contains(fish_id);
  }

  toggleCaughtState(fish_id) {
    if (this.isFishCaught(fish_id)) {
      this.completed = _(this.completed).without(fish_id);
    } else {
      this.completed.push(fish_id);
    }
    localStorage.completed = JSON.stringify(this.completed);
    this.rx_completed.onNext(this.completed);
  }

  togglePinnedState(fish_id) {
    if (this.isFishPinned(fish_id)) {
      this.pinned = _(this.pinned).without(fish_id);
    } else {
      this.pinned.push(fish_id);
    }
    localStorage.pinned = JSON.stringify(this.pinned);
    this.rx_pinned.onNext(this.pinned);
  }

  validateArray(newCompletion) {
    if (!Array.isArray(newCompletion)) {
      window.alert("Error: Invalid fishing checklist.");
      return false;
    } else {
      return true;
    }
  }

  importCaughtState() {
    var completion = window.prompt("Enter Fishing Checklist Code:");
    if (completion === null || completion === "") { return; }
    var newCompletion;
    try {
      newCompletion = JSON.parse(completion);
    } catch(e) {
      window.alert("Error: Malformed fishing checklist.");
      return;
    }
    if (newCompletion["pinned"].length > 0) {
      this.pinned = _(newCompletion["pinned"]).reduce((o, v) => o.concat(Number(v)), []);
      if (this.validateArray(this.pinned)) {
        localStorage.pinned = JSON.stringify(this.pinned);
        this.rx_pinned.onNext(this.pinned);
      } else {
        return;
      }
    }
    if (newCompletion["completed"].length > 0) {
      this.completed = _(newCompletion["completed"]).reduce((o, v) => o.concat(Number(v)), []);
      if (this.validateArray(this.completed)) {
        localStorage.completed = JSON.stringify(this.completed);
        this.rx_completed.onNext(this.completed);
      } else {
        return;
      }
    }
  }
}

sorters = function() {
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
    return +windows[offset].start();
  }
  function getWindowEnd(windows, offset) {
    if (windows === undefined) { return maxTime; }
    if (windows.length <= offset) { return maxTime; }
    return +windows[offset].end();
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
    return compareWindows(getWindowStart(a.catchableRanges, 0),
                          getWindowStart(b.catchableRanges, 0),
                          baseTime);
  }

  function isFishUpNow(f, baseTime) {
    return dateFns.isBefore(getWindowStart(f.catchableRanges, 0), baseTime);
  }

  function isUpVerySoon(f, baseTime) {
    return eorzeaTime.toEarth(getWindowStart(f.catchableRanges, 0)) <
      +dateFns.addMinutes(eorzeaTime.toEarth(baseTime), 15);
  }

  function sortByOverallRarity(a, b, baseTime, completionManager) {
    var result = 0;
    // PINNED FISH ALWAYS COME FIRST!!!
    var pinnedA = completionManager.isFishPinned(a.id) ? -1 : 1;
    var pinnedB = completionManager.isFishPinned(b.id) ? -1 : 1;
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
    aUptime = a.uptime();
    bUptime = b.uptime();

    result = compare(isFishUpNow(a, baseTime) ? -1 : 1,
                     isFishUpNow(b, baseTime) ? -1 : 1);
    if (shouldLog(a, b))
      console.log("Comparing 'is up now':", winner(a,b,result),
        "\n", a.name, isFishUpNow(a, baseTime),
        "\n", b.name, isFishUpNow(b, baseTime));
    if (result != 0) return result;

    // If both fish are now up yet, is one of them going to be up soon?
    if (!isFishUpNow(a, baseTime)) {
      var aUpSoon = isUpVerySoon(a, baseTime);
      var bUpSoon = isUpVerySoon(b, baseTime);
      result = compare(aUpSoon ? -1 : 1,
                       bUpSoon ? -1 : 1);
      if (shouldLog(a, b))
        console.log("Comparing 'is up very soon':", winner(a,b,result), +dateFns.addMinutes(baseTime, 15),
          "\n", a.name, aUpSoon, getWindowStart(aRanges, 0),
          "\n", b.name, bUpSoon, getWindowStart(bRanges, 0));
      if (result != 0) return result;
    }

    // If both are in the same state, compare by rarity (shorter comes first)
    result = compare(aUptime, bUptime);
    if (shouldLog(a, b))
      console.log("Comparing uptime:", winner(a,b,result),
        "\n", a.name, aUptime,
        "\n", b.name, bUptime);
    if (result != 0) return result;

    // If both are the same, the fish with the longer time till next window
    // comes first.
    result = compare(getWindowStart(bRanges, 1) || 0,
                     getWindowStart(aRanges, 1) || 0);
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

  function sortByWindowPeriods(a, b, baseTime, completionManager) {
    var result = 0;
    // PINNED FISH ALWAYS COME FIRST!!!
    var pinnedA = completionManager.isFishPinned(a.id) ? -1 : 1;
    var pinnedB = completionManager.isFishPinned(b.id) ? -1 : 1;
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
        "\n", a.name, getWindowStart(aRanges, 0).toUTCString(),
        "\n", b.name, getWindowStart(bRanges, 0).toUTCString());
    if (result != 0) {
      return result;
    }

    // How long is it up over the next n windows, relative to the other fish!
    aUptime = a.uptime();
    bUptime = b.uptime();
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

class ViewModel {
  constructor() {
    this.filter = {
      completion: 'all',
      patch: [2, 2.1, 2.2, 2.3, 2.4, 2.5,
              3, 3.1, 3.2, 3.3, 3.4, 3.5,
              4, 4.1, 4.2, 4.3, 4.4, 4.5],
    };
    this.completionManager = new CompletionManager;
    this.theFish = Fishes;
    this.showUpcomingWindowFromNow = false;
    this.subscriptions = [];
    this.sortingType = "windowPeriods";

    this.fishEntryTemplate = () => "";
    this.fishIntuitionEntryTemplate = () => "";
  }

  applyFiltersAndResort() {
    // Called when the view needs to be updated.
    var baseTime = eorzeaTime.getCurrentEorzeaDate();

    // Keep track of the original set of fish in the list.
    var origFishIds = _(this.theFish).reduce(
      (ids, fish) => ids.concat(fish.id), []);

    // Start by collecting the pinned fish, and removing them from the main list.
    // We don't want to filter these out for any reason.
    var pinnedFish = _(Fishes).filter(
      (v) => this.completionManager.isFishPinned(v._id));
    // Apply filters.
    var fishes = _(Fishes).chain()
      .reject((v) => this.completionManager.isFishPinned(v._id))
      .filter((v) => _(this.filter.patch).contains(v.patch))
      .filter((v) => {
        if (this.filter.completion == 'uncaught') {
          return !this.completionManager.isFishCaught(v._id);
        } else if (this.filter.completion == 'caught') {
          return this.completionManager.isFishCaught(v._id);
        } else {
          return true;
        }
      })
      .value();

    // Pick sorter.
    var sorter = null;
    console.log("Sorting fish by:", this.sortingType);
    if (this.sortingType == 'windowPeriods') {
      sorter = sorters.sortByWindowPeriods;
    } else if (this.sortingType == 'overallRarity') {
      sorter = sorters.sortByOverallRarity;
    } else {
      console.warn("Invalid sorting type:", this.sortingType);
      sorter = sorters.sortByWindowPeriods;
    }

    // Now, we can add the pinned fish back into the list before sorting
    // the fish by rarity.
    fishes = pinnedFish.concat(fishes).sort(
      //(a, b) => sorters.sortByWindowPeriods(a, b, baseTime, this.completionManager));
      (a, b) => sorter(a, b, baseTime, this.completionManager));

    return {
      fishes: fishes,
    }
  }

  updateAll() {
    // IMPORTANT
    //   Must dispose of any existing subscriptions first.
    //_(this.subscriptions).each((s) => s.dispose());

    function getUpdatedWindowTimer(date) {
      return moment(date).fromNow();
    }

    var result = this.applyFiltersAndResort();
    var fishes = result.fishes;

    this.theFish = _(fishes).map((x) => {
      // Make sure localization is up-to-date.
      x.applyLocalization();
      // Add in view-specific fields.
      return _(x).extend({
        caught: this.completionManager.isFishCaught(x.id),
        pinned: this.completionManager.isFishPinned(x.id),
        timerState: () => { return x.isCatchable() ? 'fish-active' : '' },
        nextAvailBin: () => {
          var crs = x.catchableRanges;
          if (crs.length > 0) {
            if (dateFns.isFuture(eorzeaTime.toEarth(+crs[0].start()))) {
              var minutesUntilUp = dateFns.differenceInMinutes(eorzeaTime.toEarth(+crs[0].start()), Date.now());
              if (minutesUntilUp < 15) {
                return 'fish-bin-15';
              }
            }
          }
          return '';
        },
        availability: {
          current: {
            duration: () => {
              var crs = x.catchableRanges;
              if (crs.length > 0) {
                if (dateFns.isFuture(eorzeaTime.toEarth(+crs[0].start()))) {
                  return "in " + dateFns.distanceInWordsStrict(Date.now(), eorzeaTime.toEarth(+crs[0].start()));
                } else {
                  return "closes in " + dateFns.distanceInWordsStrict(Date.now(), eorzeaTime.toEarth(+crs[0].end()));
                }
              }
              return "unknown";
            },
            date: () => {
              var crs = x.catchableRanges;
              if (crs.length > 0) {
                if (dateFns.isFuture(eorzeaTime.toEarth(+crs[0].start()))) {
                  return eorzeaTime.toEarth(+crs[0].start());
                } else {
                  return eorzeaTime.toEarth(+crs[0].end());
                }
              }
            }
          },
          upcoming: (i=1) => {
            if (i < 1) {
              console.error("Upcoming interval must be greater than 1");
            }
            return {
              duration: () => {
                var crs = x.catchableRanges;
                if (crs.length > i) {
                  return this.formatDurationUntilNextWindowFromNow(
                    eorzeaTime.toEarth(+crs[i].start()));
                }
                return "unknown";
              },
              date: () => {
                var crs = x.catchableRanges;
                if (crs.length > i) {
                  return eorzeaTime.toEarth(+crs[i].start());
                }
              },
              downtime: () => {
                // Calculates the downtime between the upcoming window and the
                // previous window.
                var crs = x.catchableRanges;
                if (crs.length > i) {
                  return this.formatDurationUntilNextWindow(
                    eorzeaTime.toEarth(+crs[i-1].end()),
                    eorzeaTime.toEarth(+crs[i].start()));
                }
                return "unknown";
              },
              prevdate: () => {
                var crs = x.catchableRanges;
                if (crs.length > i) {
                  return eorzeaTime.toEarth(+crs[i-1].end());
                }
              }
            };
          },
          upcomingWindows: () => {
            var crs = x.catchableRanges;
            if (crs.length > 0) {
              return _(crs).map((cr, idx) => {
                var start = eorzeaTime.toEarth(+cr.start());
                var end = eorzeaTime.toEarth(+cr.end());
                var downtime = "";
                if (idx + 1 < crs.length) {
                  downtime = dateFns.distanceInWordsStrict(end, eorzeaTime.toEarth(+crs[idx+1].start()));
                }
                return {
                  start: start,
                  end: end,
                  duration: dateFns.distanceInWordsStrict(start, end),
                  downtime: downtime
                };
              });
            } else {
              return [];
            }
          }
        },
        fishEyesDuration: () => {
          if (x.fishEyes === false) {
            console.error("This fish does not require Fish Eyes");
            return "";
          }
          else if (x.fishEyes === true) {
            console.warn("This fish does not have a known Fish Eyes buff duration");
            return "";
          }
          // If the buff is more than 60s, display in fractional minutes.
          if (x.fishEyes > 60) {
            var mins = Math.floor(x.fishEyes / 60);
            var secs = x.fishEyes % 60;
            var result = "" + mins + "m";
            if (secs != 0) {
              result += " " + secs + "s";
            }
            return result;
          } else {
            return "" + x.fishEyes + "s";
          }
        }
      });
    });

    return this.theFish;
  }

  formatDurationUntilNextWindowFromNow(upcomingStart) {
    return "in " + dateFns.distanceInWordsStrict(Date.now(), upcomingStart);
  }

  formatDurationUntilNextWindow(prevEnd, upcomingStart) {
    return dateFns.distanceInWordsStrict(prevEnd, upcomingStart) + " later";
  }
}

let viewModel = new ViewModel;
