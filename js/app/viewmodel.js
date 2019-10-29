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
              5, 5.1],
    };

    // Upcoming Window Format:
    // * fromPrevClose: Display the time until next window starting from the
    //                  current window's end.
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

class BaitEntry {
  constructor(itemId) {
    this.id = itemId;
    // Wrap the item data using reference.
    this.itemData = DATA.ITEMS[itemId];
    // If it's a fish, include a reference to that as well.
    // - Unfortunately, we can't expect to find a FishEntry for this record.
    this.fishData = DATA.FISH[itemId];
  }

  get name() {
    return __p(this.itemData, "name");
  }

  get icon() {
    return this.itemData.icon;
  }

  get hookset() {
    if (this.fishData && 'hookset' in this.fishData) {
      return this.fishData.hookset;
    }
    return null;
  }
}

class FishEntry {
  constructor(fish) {
    // TODO:
    this.active = false;
    this.id = fish.id;
    
    // This is the DOM element associated with this Fish.
    this.element = null;
    
    this.upcomingWindowsPopupElement = null;

    // TODO: Improve this
    // For fish with intuition requirements, include their entries here as
    // well.
    this.intuitionEntries = [];

    // Subscription while active.
    this.subscription = null;

    // HOLD A REFERENCE TO THE FISH DATA!!!
    // What's the alternative? Copying every field into this object?
    // Just make sure you don't leak references...
    this.data = fish;

    // The Fish object actually stores language-specific values in certain
    // fields... This really only helps when the fish is displayed initially
    // though...
    this.data.applyLocalization();

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

    // View model version of bait.
    // TODO: [FIXME-DUPLICATION]
    // Technically, this should ONLY exist as part of the view model, and not
    // within the Fish object.
    // `bait`: Array[BaitEntry]
    this.bait = _(fish.bestCatchPath).map(x => new BaitEntry(x));
  }

  get uptime() { return this.data.uptime(); }

  updateNextWindowData() {
    // WORKAROUND:
    // - For some reason, there's a race condition preventing `update` from
    //   being called with `full` set.  This is probably happening when a
    //   fish's window closes, but the timer event triggers before the
    //   FishWatcher event does. As a result, the cached information regarding
    //   /next catch time/ is never updated, since we don't expect it to change
    //   very often...
    // - This is also due to how the popup for next windows is coded. If we
    //   just generated it on demand, it'd be safer.  Until then, we have this.
    // This function must be called during a `countdown` event where layout
    // returns TRUE, indicating the fish's state has changed. Since it's
    // less efficient to have the view model do this, we'll rely on layout to
    // make this call before it would need to use the data.
    // AGAIN, THIS IS BASICALLY A WORKAROUND. FIX YOUR CRAPPY CODE, PLUSHY!

    let fish = this.data;
    let crs = fish.catchableRanges;

    if (crs.length > 0) {
      let currEnd = eorzeaTime.toEarth(+crs[0].end());
      let nextStart = eorzeaTime.toEarth(+crs[1].start());

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
        this.updateNextWindowData();
      }
    }

    for (let subEntry of this.intuitionEntries) {
      subEntry.update(earthTime, full);
    }
  }
}

class IntuitionFishEntry extends FishEntry {
  // TODO: If we are independently tracking this fish, have IntuitionFishEntry
  // just point at the main FishEntry for that fish.

  constructor(fish, intuitionForFish, count) {
    super(fish);

    this.intuitionCount = count;
    this.intuitionFor = intuitionForFish;
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
    doT.templateSettings.strip = false;

    // Finally, initialize the display.
    this.initializeDisplay();
  }

  initializeDisplay() {
    // The main HTML is actually inlined, for the most part.
    console.time("Initialization");

    // Load the site settings.
    var settings = this.loadSettings();

    // Initialize the "last date". This is used to keep cached relative date
    // text fresh.
    this.lastDate = dateFns.getDayOfYear(Date.now());

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

    // The language buttons aren't managed by ViewModel's settings, so we need
    // to set the active button here...
    $('#languageChoice .button')
      .filter('[data-lang="' + localizationHelper.getLanguage() + '"]')
      .addClass('active');


    const { Subject, BehaviorSubject, merge, interval } = rxjs;
    const { buffer, debounceTime, map, filter, skip, timestamp } = rxjs.operators;

    // Subjects.
    // These are used for RxJS to allow subscription events to changes.
    this.fishChangedSubject = new Subject();
    this.filterCompletionSubject = new BehaviorSubject(settings.filters.completion);
    this.filterPatchSubject = new BehaviorSubject(settings.filters.patch);
    this.sortingTypeSubject = new BehaviorSubject(settings.sortingType);

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
    $('#theme-button').on('click', this.themeButtonClicked);
    $('#languageChoice .button').on('click', this.languageChoiceClicked);
    $('#checklist .button').on('click', this.onChecklistButtonClicked);

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

    const bufferedFishAvailability$ = this.fishChangedSubject.pipe(
      buffer(this.fishChangedSubject.pipe(debounceTime(100))),
      map(e => { return {fishAvailability: e} })
    );
    const filterCompletion$ = this.filterCompletionSubject.pipe(
      skip(1),
      debounceTime(250),
      map(e => { return {filterCompletion: e} })
    );
    const filterPatch$ = this.filterPatchSubject.pipe(
      skip(1),
      debounceTime(250),
      map(e => { return {filterPatch: e} })
    );
    const sortingType$ = this.sortingTypeSubject.pipe(
      skip(1),
      debounceTime(250),
      map(e => { return {sortingType: e} })
    )
    const language$ = localizationHelper.languageChanged.pipe(
      skip(1),
      map(e => { return {language: e} })
    )

    const updateDisplaySources$ = merge(
      bufferedFishAvailability$,
      filterCompletion$,
      filterPatch$,
      sortingType$,
      language$);

    merge(
      interval(1000).pipe(
        timestamp(),
        map(e => { return {countdown: e.timestamp} })
      ),
      updateDisplaySources$.pipe(
        buffer(updateDisplaySources$.pipe(debounceTime(100))),
        filter(x => x.length > 0),
        map(e => {
          // Combine these into a single object.
          return e.reduce((acc, curr) => {
            return Object.assign(acc, curr);
          }, {});
        })
      )
    ).subscribe(e => this.updateDisplay(e));

    // Ok, now it's safe to have FishWatcher start listening for the next bell.
    eorzeaTime.currentBellChanged.pipe(
      skip(1)
    ).subscribe(bell => fishWatcher.updateFishes());

    console.timeEnd("Initialization");
  }

  updateDisplay(reason = null) {
    // This functionality used to be applyFiltersAndResort. Instead of causing
    // and outside event, we're going to ask the layout class to do the hard
    // work.

    // This function is intended to be called whenever major parts of the fish
    // data have changed. That includes filtering, sorting, and availability
    // changes.

    let fishWithUpdatedState = [];

    // The `countdown` reason is ALWAYS sent alone (due to how merge works).
    if (reason !== null &&
        'countdown' in reason)
    {
      // console.time('updateDisplay[countdown]');
      // We only need to update the already displayed fish. No destructive
      // changes need to be made this time.
      // The update function needs an EARTH timestamp, which we get from the
      // countdown event itself.
      let timestamp = reason.countdown;

      // Update the main header's earth and eorzea times.
      $('#earthClock').text(dateFns.format(timestamp, "dddd, MMMM Do YYYY, h:mm:ss a"));
      $('#eorzeaClock').text(moment.utc(eorzeaTime.toEorzea(timestamp)).format("HH:mm"));

      // Check if the EARTH DATE has changed as well. If so, we must also
      // refresh the cached relative date text!
      let currDay = dateFns.getDayOfYear(timestamp);
      let needsFullUpdate = this.lastDate != currDay;
      this.lastDate = currDay;

      _(this.fishEntries).each(entry => {
        // Update the data for this entry first.
        entry.update(timestamp, needsFullUpdate);
        // Then have the layout make necessary updates.
        if (this.layout.update(entry, timestamp, needsFullUpdate)) {
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
      // console.timeEnd('updateDisplay[countdown]');
      return;
    }

    // console.info("Updating display...", reason);
    // console.time('updateDisplay');

    // We need a base time!
    let timestamp = Date.now();

    if (reason !== null && 'fishAvailability' in reason)
    {
      // FishWatcher doesn't send a message when a fish window opens...
      // But it's important to know that one closed, since this results in new
      // availability values getting computed...
      // Either way... we'll update ALL THE FISH ENTRIES to prevent a
      // double-resort.
      _(this.fishEntries).each(entry => {
        // Update the data for this entry first.
        entry.update(timestamp, true);
        // Then have the layout make necessary updates.
        this.layout.update(entry, timestamp);
      });
      // Fall-through just in case filters were changed at the same time...
    }

    if ((reason === null) ||
        (reason !== null && ('filterCompletion' in reason || 'filterPatch' in reason)))
    {
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
        .each(fish => this.activateEntry(fish, timestamp));

      // Remove any entries which are still inactive.
      for (let k in this.fishEntries) {
        var entry = this.fishEntries[k];
        if (!entry.active) {
          // No one likes stale, rotten fish.  They stink, so remove them.
          this.removeEntry(entry, k);
        }
      }
    }

    // Was this change caused by filter change?
    if (reason !== null && ('filterCompletion' in reason || 'filterPatch' in reason))
    {
      // Let FishWatcher know!
      fishWatcher.updateFishes();
    }

    if ((reason === null) ||
        (reason !== null && ('filterCompletion' in reason ||
                             'filterPatch' in reason ||
                             'fishAvailability' in reason ||
                             'sortingType' in reason)))
    {
      // Finally, we can apply sorting to the list of active fish.
      // NOTE: Sorting used to be handled here... but there's a lot of layout
      // information that goes into sorting.
      this.layout.sort(this.sorterFunc, eorzeaTime.toEorzea(timestamp));
    }

    // This function is also used whenever the language is updated.
    // Now that everything's been resorted, ask the layout to update any fields
    // which are language-dependent.
    if (reason !== null && 'language' in reason) {
      _(this.fishEntries).each(entry => this.layout.updateLanguage(entry));
    }

    // console.timeEnd('updateDisplay');
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

    // Don't forget to activate the new entry!!!
    entry.active = true;

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
    entry.element = $entry[0];

    // Add the new entry to the set of tracked fish entries.
    // This way, whenever display changes, we'll get checked as well.
    this.fishEntries[fish.id] = entry;

    // Check if this fish has intuition requirements.
    for (let intuitionFish of fish.intuitionFish) {
      let intuitionFishEntry = new IntuitionFishEntry(
        intuitionFish.data, fish, intuitionFish.count);
      intuitionFishEntry.active = true;
      // Initially, FishWatcher only determined if this fish /would/ be up.
      // It doesn't necessarily compute the ranges.
      fishWatcher.reinitRangesForFish(intuitionFish.data);
      // Update the entry's display fields.
      intuitionFishEntry.update(earthTime, true);
      // Have the layout build a new row for this intuition entry.
      let $subEntry =
        $(this.layout.templates.intuitionFishEntry(intuitionFishEntry));
      // Connect DOM and object together.
      $subEntry.data('view', intuitionFishEntry);
      intuitionFishEntry.element = $subEntry[0];

      if (this.settings.theme === 'dark') {
        $('*[data-tooltip]', $subEntry).attr('data-inverted', '');
      }

      // Unlike normal entries, this only gets added to the parent fish.
      entry.intuitionEntries.push(intuitionFishEntry);
    }

    // Append the entry to the layout.
    this.layout.append(entry);

    // Connect the catchableRangesObserver to our fishChanged subject.
    entry.subscription = fish.catchableRangesObserver.pipe(
      rxjs.operators.debounceTime(100)
    ).subscribe(r => {
      // Pass this event to the view model's fish changed subject.
      this.fishChangedSubject.next(fish.id);
    });

    // Connect the new entry's events.
    $('.fishCaught.button', $entry).on('click', this.onFishEntryCaughtClicked);
    $('.fishPinned.button', $entry).on('click', this.onFishEntryPinnedClicked);
    
    $('.ui.popup.upcoming-windows', $entry).append(
      this.layout.templates.upcomingWindows(entry));
    $('.upcoming-windows-button', $entry).popup({
      addTouchEvents: false,
      hoverable: true,
      popup: '.ui.popup.upcoming-windows',
      position: 'right center',
      target: $('.upcoming-windows-button', $entry).parent(),
      on: 'click',
      maxSearchDepth: 3,
      observeChanges: false
    });
    entry.upcomingWindowsPopupElement = $('.ui.popup.upcoming-windows', $entry)[0];

    if (this.settings.theme === 'dark') {
      $('.ui.popup.upcoming-windows', $entry).addClass('inverted');
      $('*[data-tooltip]', $entry).attr('data-inverted', '');
    }

    return entry;
  }

  removeEntry(entry, k) {
    entry.subscription.unsubscribe();
    this.layout.remove(entry);
    // Remove intuition entries as well.
    for (let subEntry in entry.intuitionEntries) {
      delete entry.intuitionEntries[subEntry];
    }
    delete this.fishEntries[k];
  }

  onFishEntryCaughtClicked(e) {
    e.stopPropagation();
    let $this = $(this);

    let entry = $this.closest('.fish-entry').data('view');
    if (entry.isCaught) {
      ViewModel.settings.completed = _(ViewModel.settings.completed).without(entry.id);
    } else {
      ViewModel.settings.completed.push(entry.id);
    }
    entry.isCaught = !entry.isCaught;
    ViewModel.saveSettings();

    // TODO: Determine if this fish should still be displayed efficiently.
    ViewModel.layout.updateCaughtState(entry);
    ViewModel.updateDisplay();

    return false;
  }

  onFishEntryPinnedClicked(e) {
    e.stopPropagation();
    let $this = $(this);

    let entry = $this.closest('.fish-entry').data('view');
    if (entry.isPinned) {
      ViewModel.settings.pinned = _(ViewModel.settings.pinned).without(entry.id);
    } else {
      ViewModel.settings.pinned.push(entry.id);
    }
    entry.isPinned = !entry.isPinned;
    ViewModel.saveSettings();

    // TODO: Determine if this fish should still be displayed efficiently.
    ViewModel.layout.updatePinnedState(entry);
    ViewModel.updateDisplay();

    return false;
  }

  filterCompletionClicked(e) {
    e.stopPropagation();
    var $this = $(this);

    // Set the active filter.
    $this.addClass('active').siblings().removeClass('active');
    ViewModel.settings.filters.completion = $this.data('filter');

    // Notify anyone interested in this change.
    ViewModel.filterCompletionSubject.next(ViewModel.settings.filters.completion);
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
    ViewModel.filterPatchSubject.next(ViewModel.settings.filters.patch);
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
    ViewModel.filterPatchSubject.next(ViewModel.settings.filters.patch);
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
    ViewModel.filterPatchSubject.next(ViewModel.settings.filters.patch);
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
    ViewModel.sortingTypeSubject.next(sortingType);
    ViewModel.saveSettings();
  }

  themeButtonClicked(e) {
    if (e) e.stopPropagation();
    let $this = $(this);
    let theme = $this.prop('checked') ? 'dark' : 'light';

    // Apply the theme.
    ViewModel.applyTheme(theme);
    // And save it to settings.
    ViewModel.settings.theme = theme;
    ViewModel.saveSettings();
  }

  languageChoiceClicked(e) {
    if (e) e.stopPropagation();
    let $this = $(this);
    
    let lang = $this.data('lang');
    // Update the `active` status for the language buttons.
    $this.addClass('active').siblings().removeClass('active');
    // Tell localization helper to update the language setting.
    // TODO: This is the only setting that's NOT managed directly by the
    //       ViewModel. That needs to be fixed so everything's in one
    //       central location :/
    localizationHelper.setLanguage(lang);
    // We really should still defer updating the display so the click
    // event can actually finish within reasonable time.
  }

  applyTheme(theme) {
    if (theme === 'dark') {
      $('body').addClass('dark');
      $('.ui.message.announcement').addClass('inverted');
      $('.ui.popup.upcoming-windows').addClass('inverted');
      $('*[data-tooltip]').attr('data-inverted', '');
    } else {
      $('body').removeClass('dark');
      $('.ui.message.announcement').removeClass('inverted');
      $('.ui.popup.upcoming-windows').removeClass('inverted');
      $('*[data-tooltip]').removeAttr('data-inverted');
    }
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
        if (localStorage.theme) {
          settings.theme = localStorage.theme;
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

    // Set the theme.
    $('#theme-button').prop('checked', settings.theme === 'dark');
    this.applyTheme(settings.theme);

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

  exportChecklist() {
    // NOTE: THIS IS NOT THE SAME AS EXPORTING THE ENTIRE SITE'S SETTINGS

    // Pop up dialog box with completion value for user to save.
    let result = {
      completed: this.settings.completed,
      pinned: this.settings.pinned
    };

    // TODO: The window.prompt might not be able to fit everything now...
    window.prompt('Fishing Checklist Code:', JSON.stringify(result));
  }

  importChecklist() {
    // NOTE: THIS IS NOT THE SAME AS IMPORTING THE ENTIRE SITE'S SETTINGS
    let completion = window.prompt("Enter Fishing Checklist Code:");
    if (completion === null || completion === "") { return; }
    try {
      completion = JSON.parse(completion);
    } catch (ex) {
      window.alert("Error: Malformed fishing checklist.");
      return;
    }
    if ('pinned' in completion && completion["pinned"].length > 0) {
      try {
        // Update the settings
        this.settings.pinned =
          _(completion["pinned"]).reduce((o, v) => o.concat(Number(v)), []);
      } catch (ex) {
        window.alert("Error: Malformed fishing checklist.")
        return;
      }
    }
    if ('completed' in completion && completion["completed"].length > 0) {
      try {
        // Update the settings
        this.settings.completed =
          _(completion["completed"]).reduce((o, v) => o.concat(Number(v)), []);
      } catch (ex) {
        window.alert("Error: Malformed fishing checklist.")
        return;
      }
    }
    this.saveSettings();
    // Update the fish entries.
    // TODO: [NEEDS-OPTIMIZATION]
    _(this.fishEntries).each(entry => {
      entry.update();
      this.layout.updatePinnedState(entry);
      this.layout.updateCaughtState(entry);
    });
    this.updateDisplay();
  }

  onChecklistButtonClicked(e) {
    if (e) e.stopPropagation();
    let $this = $(this);

    if ($this.data('action') === 'export') {
      ViewModel.exportChecklist();
    } else {
      ViewModel.importChecklist();
    }
    return false;
  }
};
