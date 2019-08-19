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
  constructor(fish) {
    // TODO:
    this.active = false;
    this.id = fish.id;
    
    // This is the DOM element associated with this Fish.
    this.element = null;

    // Subscription while active.
    this.subscription = null;

    // HOLD A REFERENCE TO THE FISH DATA!!!
    // What's the alternative? Copying every field into this object?
    // Just make sure you don't leak references...
    this.data = fish;

    // Set up the remaining data structure...
    this.isUpSoon = '';
    this.availability = {
      current: {
        duration: null,
        date: null
      },
      upcoming: {
        duration: null,
        date: null,
        downtime: null,
        prevdate: null
      },
      upcomingWindows: [],
    };
    this.isCatchable = false;
    
    // Fish Eyes...
    if (fish.fishEyes === false) {
      this.fishEyesDuration = '';
    }
    else if (fish.fishEyes === true) {
      // Unknown duration, return empty string.
      this.fishEyesDuration = '';
    }
    else if (fish.fishEyes > 60) {
      // If the buff is more than 60s, display in fractional minutes.
      let mins = Math.floor(fish.fishEyes / 60);
      let secs = fish.fishEyes % 60;
      let result = "" + mins + "m";
      if (secs != 0) {
        result += " " + secs + "s";
      }
      this.fishEyesDuration = result;
    }
    else {
      this.fishEyesDuration = '' + fish.fishEyes + 's';
    }
  }

  get uptime() { return this.data.uptime(); }

  update(earthTime, full = false) {
    // This function should be called whenever the underlying fish data has changed.
    // Make sure you do this BEFORE updating the display...
    let fish = this.data;
    let crs = fish.catchableRanges;

    // TODO: Even this is pretty heavy-handed. We should really only update
    // the fields which have changed... [NEEDS-OPTIMIZATION]

    this.isCatchable = fish.isCatchable();
    this.isCaught = ViewModel.isFishCaught(this.id);
    this.isPinned = ViewModel.isFishPinned(this.id);
    
    // The rest requires catchable ranges.
    if (crs.length > 0) {
      // Cache the dates, they are used A LOT.
      let currStart = eorzeaTime.toEarth(+crs[0].start());
      let currEnd = eorzeaTime.toEarth(+crs[0].end());
      // NOTE: If it has once entry, it'll have 2...
      if (crs.length < 2) {
        console.error("Expected at least 2 catchable ranges for " + fish.name);
        return;
      }
      let nextStart = eorzeaTime.toEarth(+crs[1].start());

      if (dateFns.isAfter(currStart, earthTime)) {
        // The fish is not currently available.
        this.isUpSoon = dateFns.differenceInMinutes(currStart, earthTime) < 15;
        this.availability.current.duration =
          "in " + dateFns.distanceInWordsStrict(earthTime, currStart);
        this.availability.current.date = currStart;
      } else {
        // The fish is currently available!
        this.isUpSoon = false; // It's already up! XD
        this.availability.current.duration =
          "closes in " + dateFns.distanceInWordsStrict(earthTime, currEnd);
        this.availability.current.date = currEnd;
      }
      this.availability.upcoming.duration = "in " + dateFns.distanceInWordsStrict(earthTime, nextStart);

      this.availability.upcoming.date = nextStart;
      this.availability.upcoming.prevdate = currEnd;

      // Don't rebuild static information if we don't need to.
      if (full) {
        this.availability.upcoming.downtime = dateFns.distanceInWordsStrict(currEnd, nextStart) + " later";

        this.availability.upcomingWindows = _(crs).map((cr, idx) => {
          let start = eorzeaTime.toEarth(+cr.start());
          let end = eorzeaTime.toEarth(+cr.end());
          let downtime = "";
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
      }
    }
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
    console.time("Initialization");

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
    $('#fish-table-container').append($fishTable);
    // And initialize it...
    this.layout.initializeLayout($fishTable);

    // Initialize checkbox controls.
    $('.ui.radio.checkbox').checkbox();

    // Subjects.
    // These are used for RxJS to allow subscription events to changes.
    this.fishChangedSubject = new Rx.Subject();
    this.filterCompletionSubject = new Rx.BehaviorSubject(settings.filters.completion);
    this.filterPatchSubject = new Rx.BehaviorSubject(settings.filters.patch);
    this.sortingTypeSubject = new Rx.BehaviorSubject(settings.sortingType);

    // IMPORTANT NOTE:
    // The system still relies on FishWatcher keeping every fish up-to-date.
    // Unfortunately, that includes filtered fish too...
    // But that's not the point.  FishWatcher is the source of availability
    // data, and when the app is just starting up, we need to NOT RACE it.
    //fishWatcher.updateFishes();

    // Update the table!
    this.updateDisplay(null);

    // At this point, we need to remove the dimmer...
    $('#fish-table-container .ui.dimmer').removeClass('active');

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

    // Register for changes.
    // Things we care about...
    //   - Changes in filter settings.
    //     - Should be less destructive, expect for the whole re-sorting bit...
    //   - Changes in pinned settings.
    //     - Should only require a minor re-sorting...
    //   - Changes to catchable status.
    //     - Potentially requires visibility change.
    //   - Changes to the sorting algorithm.
    //     - Requires whole resorting of list.
    // Merge all of these subjects together, annotating the reason, then buffer
    // the event so that the `updateDisplay` is not being called more than it
    // needs to be.
    // NOTE: There's still the 1s interval event timer running. It needs to be
    // deduped somehow so it's not interfering every bell (or half-bell)...
    // Technically, we can just add it to this massive subscription, and use
    // the `reason` to tell it apart... It's just, the buffering doesn't make
    // sense for it.
    var updateDisplaySources$ = Rx.Observable.merge(
      this.fishChangedSubject
        .buffer(() => this.fishChangedSubject.debounce(100))
        .map(e => { return {fishAvailability: e} }),
      this.filterCompletionSubject
        .skip(1)
        .debounce(250)
        .map(e => { return {filterCompletion: e} }),
      this.filterPatchSubject
        .skip(1)
        .debounce(250)
        .map(e => { return {filterPatch: e} }),
      this.sortingTypeSubject
        .skip(1)
        .debounce(250)
        .map(e => { return {sortingType: e} })
    );

    // Merge with 1s interval timer.
    Rx.Observable.merge(
      Rx.Observable.interval(1000).timestamp()
        .map(e => { return {countdown: e.timestamp} }),
      updateDisplaySources$
        .buffer(() => updateDisplaySources$.debounce(100))
        .filter(x => x.length > 0)
        .map(e => {
          // Combine these into a single object.
          return e.reduce((acc, curr) => {
            return Object.assign(acc, curr);
          }, {});
        })
    ).subscribe(e => this.updateDisplay(e));

    // Ok, now it's safe to have FishWatcher start listening for the next bell.
    eorzeaTime.currentBellChanged
      .skip(1)
      .subscribe((bell) => fishWatcher.updateFishes());

    console.timeEnd("Initialization");
  }

  updateDisplay(reason) {
    // This functionality used to be applyFiltersAndResort. Instead of causing
    // and outside event, we're going to ask the layout class to do the hard
    // work.

    // This function is intended to be called whenever major parts of the fish
    // data have changed. That includes filtering, sorting, and availability
    // changes.

    let updateUpcomingTime = this.settings.upcomingWindowFormat == 'fromNow';

    let fishWithUpdatedState = [];

    // The `countdown` reason is ALWAYS sent alone (due to how merge works).
    if (reason !== null &&
        'countdown' in reason)
    {
      console.time('updateDisplay[countdown]');
      // We only need to update the already displayed fish. No destructive
      // changes need to be made this time.
      // The update function needs an EARTH timestamp, which we get from the
      // countdown event itself.
      let timestamp = reason.countdown;

      // Update the main header's earth and eorzea times.
      $('#earthClock').text(dateFns.format(timestamp, "dddd, MMMM Do YYYY, h:mm:ss a"));
      $('#eorzeaClock').text(moment.utc(eorzeaTime.toEorzea(timestamp)).format("HH:mm"));

      _(this.fishEntries).each(entry => {
        // Update the data for this entry first.
        entry.update(timestamp);
        // Then have the layout make necessary updates.
        if (this.layout.update(entry, timestamp, updateUpcomingTime)) {
          // Queue this fish entry for resorting as well!
          // We're basically doing FishWatcher's job for it now...
          // TODO: [NEEDS-REFACTOR]
          fishWithUpdatedState.push(entry.id);
        }
      });

      if (fishWithUpdatedState.length > 0) {
        // Looks like we need to resort the display.
        this.layout.sort(this.sorterFunc, eorzeaTime.toEorzea(timestamp));
      }
      console.timeEnd('updateDisplay[countdown]');
      return;
    }

    console.info("Updating display...", reason);
    console.time('updateDisplay');

    // We need a base time!
    let earthTime = Date.now();

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
      .each(fish => this.activateEntry(fish, earthTime));

    // Remove any entries which are still inactive.
    for (let k in this.fishEntries) {
      var entry = this.fishEntries[k];
      if (!entry.active) {
        // No one likes stale, rotten fish.  They stink, so remove them.
        this.removeEntry(entry, k);
      }
    }

    // Was this change caused by filter change?
    if (reason !== null && ('filterCompletion' in reason || 'filterPatch' in reason))
    {
      // Let FishWatcher know!
      fishWatcher.updateFishes();
    }

    // Finally, we can apply sorting to the list of active fish.
    // NOTE: Sorting used to be handled here... but there's a lot of layout
    // information that goes into sorting.
    this.layout.sort(this.sorterFunc, eorzeaTime.toEorzea(earthTime));

    console.timeEnd('updateDisplay');
  }

  isFishPinned(fishId) {
    return _(this.settings.pinned).contains(fishId);
  }

  isFishCaught(fishId) {
    return _(this.settings.completed).contains(fishId);
  }

  isFishFiltered(fish) {
    // Pinned fish are NEVER filtered out!
    if (this.isFishPinned(fish.id))
      return false;

    // Filter by patch.
    if (!_(this.settings.filters.patch).contains(fish.patch))
      return true;

    // Filter by completion state.
    if (this.settings.filters.completion == 'uncaught') {
      if (this.isFishCaught(fish.id))
        return true;
    } else if (this.settings.filters.completion == 'caught') {
      if (!this.isFishCaught(fish.id))
        return true;
    }

    // No other reason to filter.
    return false;
  }

  activateEntry(fish, earthTime) {
    // Check if there's already an entry for this fish.
    if (this.fishEntries[fish.id]) {
      // There is, so just mark it as active and return.
      this.fishEntries[fish.id].active = true;
      return;
    }

    // Otherwise, we have to create a new entry for this fish.
    this.createEntry(fish, earthTime);
  }

  createEntry(fish, earthTime) {
    let entry = new FishEntry(fish);

    // Request FishWatcher update our information, please?
    // This /should/ take care of fish which were pulled out of tracking, then
    // added back in later.
    fishWatcher.reinitRangesForFish(fish);
    // Update the display fields for this entry.
    entry.update(earthTime, true);
    // Have the layout build a new row for this entry.
    let $entry = $(this.layout.templates.fishEntry(entry));
    // Associate the DOM element with the back-end data.
    $entry.data('view', entry);
    entry.element = $entry;

    // Add the new entry to the set of tracked fish entries.
    // This way, whenever display changes, we'll get checked as well.
    this.fishEntries[fish.id] = entry;

    // Append the entry to the layout itself.
    this.layout.append($entry);

    // Don't forget to activate the new entry!!!
    entry.active = true;

    // Connect the catchableRangesObserver to our fishChanged subject.
    entry.subscription = fish.catchableRangesObserver.debounce(100).subscribe((r) => {
      // Pass this event to the view model's fish changed subject.
      this.fishChangedSubject.onNext(fish.id);
    });

    // TODO: Connect the new entry's events.

    return entry;
  }

  removeEntry(entry, k) {
    this.layout.remove(entry.element);
    entry.subscription.dispose();
    delete this.fishEntries[k];
  }

  filterCompletionClicked(e) {
    e.stopPropagation();
    var $this = $(this);

    // Set the active filter.
    $this.addClass('active').siblings().removeClass('active');
    ViewModel.settings.filters.completion = $this.data('filter');

    // Notify anyone interested in this change.
    ViewModel.filterCompletionSubject.onNext(ViewModel.settings.filters.completion);
    ViewModel.saveSettings();
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
    ViewModel.saveSettings();
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
    ViewModel.saveSettings();
    return false;
  }

  filterPatchSetClicked(e) {
    e.stopPropagation();
    var $this = $(this);

    // Toggle full patch activation in the UI.
    $this.toggleClass('active');
    if ($this.hasClass('active')) {
      // Activate the rest of the buttons as well, and add to the filter settings.
      $this.siblings(":not(.disabled)").addClass('active').each(function() {
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
    ViewModel.saveSettings();
    return false;
  }

  sortingTypeChecked(e) {
    if (e) e.stopPropagation();
    let $this = $(this);
    let sortingType = $this.val();

    if (sortingType == 'overallRarity') {
      ViewModel.sorterFunc = Sorters.sortByOverallRarity;
    } else if (sortingType == 'windowPeriods') {
      ViewModel.sorterFunc = Sorters.sortByWindowPeriods;
    } else {
      console.error("Invalid sortingType: ", settings.sortingType);
      return;
    }

    ViewModel.settings.sortingType = sortingType;
    ViewModel.sortingTypeSubject.onNext(sortingType);
    ViewModel.saveSettings();
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
        console.warn("Trying to restore settings from legacy version...");
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
        settings.filters.patch = this.settings.filters.patch;
      }
    }

    // Set the sorter function.
    if (settings.sortingType == 'overallRarity') {
      this.sorterFunc = Sorters.sortByOverallRarity;
    } else if (settings.sortingType == 'windowPeriods') {
      this.sorterFunc = Sorters.sortByWindowPeriods;
    } else {
      console.error("Invalid sortingType: ", settings.sortingType);
    }
    $('#sortingType input[value="' + settings.sortingType + '"]').parent().checkbox('check');

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
