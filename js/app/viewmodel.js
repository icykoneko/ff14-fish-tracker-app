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

///////////////////////////////////////////////////////////////////////////////
// View Model (v2)
// ============================================================================
// View model will encapsulate all of the display logic and timer subscriptions.
// Individual displayed fish entries will be HTML elements using data to link
// back to the back-end data model. On initialization, the view model will still
// need to wrap the data model to support all of its fields.

class SiteSettings {
  constructor() {
    // Filter Settings
    this.filters = {
      // Completion filtering:
      // * all: Display all fish, regardless of caught status.
      // * caught: Display only caught fish.
      // * uncaught: Display only uncaught fish.
      completion: 'all',
      // Patch filtering:
      // * Display fish from the specified patches.
      patch: [2, 2.1, 2.2, 2.3, 2.4, 2.5,
              3, 3.1, 3.2, 3.3, 3.4, 3.5,
              4, 4.1, 4.2, 4.3, 4.4, 4.5,
              5],
    };

    // Upcoming Window Format:
    // * fromPrevClose: Display the time until next window starting from the
    //                  current window's end.
    // * fromNow: Display the time until next window starting from now.
    //            NOTE: This requires more updating...
    this.upcomingWindowFormat = 'fromPrevClose';

    // Sorting Type:
    // * overallRarity: Sorts fish based on rarity when next window is at least 15
    //                  minutes from now. Fish are displayed in bins of active,
    //                  up within 15 minutes, and up later.
    // * windowPeriods: Sorts all fish by rarity (fish with the shortest windows
    //                  first). All fish which are not currently active are sorted
    //                  based on the next time they are up, THEN by rarity.
    this.sortingType = 'overallRarity';

    // Site Theme:
    // * dark: Dark mode...
    // * light: Light mode...
    this.theme = 'dark';

    // Recorded information:
    // * completed: An array of fish ids which have been caught.
    // * pinned: An array of fish ids which should be pinned.
    this.completed = [];
    this.pinned = [];
  }
}

class FishEntry {
  constructor(fishId) {
    // TODO:
    this.active = false;
    this.id = fishId;
    
    // This is the DOM element associated with this Fish.
    this.element = null;
  }
}

let ViewModel = new class {
  constructor() {
    // The site settings.
    this.settings = new SiteSettings();

    // Initialize everything!
    // NOTE: The fish data itself is already initialized as `Fishes`.
    // Fish entries contains those entries we want to display.
    this.fishEntries = {}

    // The actual sorter function.
    // This will get initialized later from the settings.
    this.sorterFunc = null;

    // Initialize the layout components.
    this.layout = new FishTableLayout();
  }

  initialize() {
    // When displaying a date that's more than a week away, include the time as well.
    moment.updateLocale('en', {calendar: {sameElse: 'ddd, M/D [at] LT'}});

    // Finally, initialize the display.
    this.initializeDisplay();
  }

  initializeDisplay() {
    // The main HTML is actually inlined, for the most part.

    // Load the site settings.
    var settings = this.loadSettings();

    // The fish!
    // This is the view model's pointer to the master list of fish.
    this.fishMap = _.reduce(Fishes, (memo, fish) => {
      memo[fish.id] = fish;
      return memo;
    }, {});

    // Create the table to hold all the displayed fish data.
    var $fishTable = $(this.layout.templates.fishTable());
    // And initialize it...
    this.layout.initializeLayout($fishTable);

    // Subjects.
    // These are used for RxJS to allow subscription events to changes.
    this.filterCompletionSubject = new Rx.BehaviorSubject(settings.filters.completion);
    this.filterPatchSubject = new Rx.BehaviorSubject(settings.filters.patch);
    this.sortingTypeSubject = new Rx.BehaviorSubject(settings.sortingType);

    // Update the table!
    this.updateDisplay(null);

    // Set event handlers.
    $('#filterCompletion .button').on('click', this.filterCompletionClicked);
    $('#filterPatch .button:not(.patch-set)').on({
      click: this.filterPatchClicked,
      dblclick: this.filterPatchDblClicked
    });
    $('#filterPatch .button.patch-set').on('click', this.filterPatchSetClicked);

    // Special event handlers.
    // These are mainly supporting the SemanticUI widgets.
    $('#sortingType .radio.checkbox').checkbox({
      onChecked: this.sortingTypeChecked
    });
  }

  updateDisplay(reason) {
    // This functionality used to be applyFiltersAndResort. Instead of causing
    // and outside event, we're going to ask the layout class to do the hard
    // work.

    // This function is intended to be called whenever major parts of the fish
    // data have changed. That includes filtering, sorting, and availability
    // changes.

    // TODO: Include a `reason` argument to determine just how much needs to be
    // updated (if we can be efficient).

    // We need a base time!
    var baseTime = eorzeaTime.getCurrentEorzeaDate();

    // Mark all existing entries as stale (or not active).
    // Anything that's not active, won't be displayed, and at the end of this
    // function, will be removed from the list, making future updates faster.
    _(this.fishEntries).each((entry) => entry.active = false);

    // Next, we'll apply the current filters to the entire list, and only
    // (re-)activate the fish that remain.
    // NOTE: We don't actually need to keep a copy of this list, thus the
    // chaining.
    // TODO: If the filter settings haven't changed, there's no reason to do
    // this!
    _(Fishes).chain()
      .reject(fish => this.isFishFiltered(fish))
      .each(fish => this.activateEntry(fish, baseTime));

    // Remove any entries which are still inactive.
    for (var k in this.fishEntries) {
      var entry = this.fishEntries[k];
      if (!entry.active) {
        // No one likes stale, rotten fish.  They stink, so remove them.
        this.layout.remove(entry.element);
        delete this.fishEntries[k];
      }
    }

    // Finally, we can apply sorting to the list of active fish.
    // NOTE: Sorting used to be handled here... but there's a lot of layout
    // information that goes into sorting.
    this.layout.sort(this.sorterFunc, baseTime);
  }

  isFishPinned(fish) {
    return _(this.settings.pinned).contains(fish.id);
  }

  isFishCaught(fish) {
    return _(this.settings.completed).contains(fish.id);
  }

  isFishFiltered(fish) {
    // Pinned fish are NEVER filtered out!
    if (this.isFishPinned(fish))
      return false;

    // Filter by patch.
    if (!_(this.settings.filters.patch).contains(fish.patch))
      return true;

    // Filter by completion state.
    if (this.settings.filters.completion == 'uncaught') {
      if (this.isFishCaught(fish))
        return true;
    } else if (this.settings.filters.completion == 'caught') {
      if (!this.isFishCaught(fish))
        return true;
    }

    // No other reason to filter.
    return false;
  }

  activateEntry(fish, baseTime) {
    // Check if there's already an entry for this fish.
    if (this.fishEntries[fish.id]) {
      // There is, so just mark it as active and return.
      this.fishEntries[fish.id].active = true;
      return;
    }

    // Otherwise, we have to create a new entry for this fish.
    var entry = this.createEntry(fish, baseTime);
    // Have the layout build a new row for this entry.
    var $entry = this.layout.templates.fishEntry(entry);
    // Associate the DOM element with the back-end data.
    $entry.data('view', entry);
    entry.element = $entry;

    // Add the new entry to the set of tracked fish entries.
    this.fishEntries[fish.id] = entry;

    // Append the entry to the layout itself.
    this.layout.append($entry);
  }

  createEntry(fish, baseTime) {
    var entry = new FishEntry(fish.id);
    // TODO: Does the entry need to be wired up to anything?

    return entry;
  }

  filterCompletionClicked(e) {
    e.stopPropagation();
    var $this = $(this);

    // Set the active filter.
    $this.addClass('active').siblings().removeClass('active');
    ViewModel.settings.filters.completion = $this.data('filter');

    // Notify anyone interested in this change.
    ViewModel.filterCompletionSubject.onNext(ViewModel.settings.filters.completion);
    return false;
  }

  filterPatchClicked(e) {
    e.stopPropagation();
    var $this = $(this);

    // Update the UI and get the patch number together.
    var patch = Number($this.toggleClass('active').data('filter'));
    if ($this.hasClass('active')) {
      ViewModel.settings.filters.patch.push(patch);
    } else {
      ViewModel.settings.filters.patch =
        _(ViewModel.settings.filters.patch).without(patch);
    }

    // Notify others about the change.
    ViewModel.filterPatchSubject.onNext(ViewModel.settings.filters.patch);
    return false;
  }

  filterPatchDblClicked(e) {
    e.stopPropagation();
    var $this = $(this);

    // Update the UI making only the selected patch visible.
    $this.addClass('active').siblings().removeClass('active');
    $this.parent().siblings().children().removeClass('active');
    var patch = Number($this.data('filter'));

    // Just this patch is included now.
    ViewModel.settings.filters.patch = [patch];
    // Notify others about this change.
    ViewModel.filterPatchSubject.onNext(ViewModel.settings.filters.patch);
    return false;
  }

  filterPatchSetClicked(e) {
    e.stopPropagation();
    var $this = $(this);

    // Toggle full patch activation in the UI.
    $this.toggleClass('active');
    if ($this.hasClass('active')) {
      // Activate the rest of the buttons as well, and add to the filter settings.
      _($this.siblings(":not(.disabled)").addClass('active')).each(function() {
        ViewModel.settings.filters.patch.push(Number($(this).data('filter')));
      });
    } else {
      // Deactivate the rest of the button as well, and remove from the filter settings.
      $this.siblings(":not(.disabled)").removeClass('active').each(function() {
        ViewModel.settings.filters.patch =
          _(ViewModel.settings.filters.patch).without(Number($(this).data('filter')));
      });
    }

    // Notify others about this change.
    ViewModel.filterPatchSubject.onNext(ViewModel.settings.filters.patch);
    return false;
  }

  sortingTypeChecked(e) {
    if (e) e.stopPropagation();
    var $this = $(this);
    ViewModel.settings.sortingType = $this.val();
    ViewModel.sortingTypeSubject.onNext(ViewModel.settings.sortingType);
  }

  loadSettings() {
    var settings = this.settings;

    // Try loading the user's settings from localStorage.
    try {
      if (localStorage.getItem('fishTrackerSettings')) {
        settings = JSON.parse(localStorage.fishTrackerSettings);
      } else {
        // COMPATIBILITY SUPPORT:
        // * The old view model stores settings in individual keys. Check for them
        //   first, and upgrade to the new model.
        if (localStorage.completed) {
          settings.completed = JSON.parse(localStorage.completed);
        }
        if (localStorage.pinned) {
          settings.pinned = JSON.parse(localStorage.pinned);
        }
      }
    } catch (ex) {
      // Ignore this. This may happen if localStorage is disabled or private browsing.
      console.warn("Unable to access localStorage. Settings not restored.");
    }

    if (settings.filters) {
      if (settings.filters.completion) {
        $('#filterCompletion .button[data-filter="' + settings.filters.completion + '"]')
        .addClass('active').siblings().removeClass('active');
      }
      if (settings.filters.patch) {
        // TODO: Consider restoring this filter. The catch is... what about when a new
        // patch is released. No one would have it in their settings, and thus, would
        // never see it by default :(
      }
    }

    // Set the sorter function.
    if (settings.sortingType == 'overallRarity') {
      this.sorterFunc = sorters.sortByOverallRarity;
    } else if (settings.sortingType == 'windowPeriods') {
      this.sorterFunc = sorters.sortByWindowPeriods;
    } else {
      console.error("Invalid sortingType: ", settings.sortingType);
    }

    // Save the settings to the model.
    this.settings = settings;
    return settings;
  }

  saveSettings() {
    // Save the site settings to localStorage.
    try {
      localStorage.fishTrackerSettings = JSON.stringify(this.settings);
    } catch (ex) {
      console.warn("Unable to save settings to local storage.");
    }
  }
};

class OldViewModel {
  constructor() {
    this.filter = {
      completion: 'all',
      patch: [2, 2.1, 2.2, 2.3, 2.4, 2.5,
              3, 3.1, 3.2, 3.3, 3.4, 3.5,
              4, 4.1, 4.2, 4.3, 4.4, 4.5,
              5],
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

    this.theFish = _(fishes).map((x, idx) => {
      // Make sure localization is up-to-date.
      x.applyLocalization();
      // Add in view-specific fields.
      return _(x).extend({
        sortIdx: idx,
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

//let viewModel = new OldViewModel;
