///////////////////////////////////////////////////////////////////////////////
// View Model (v2)
// ============================================================================
// View model will encapsulate all of the display logic and timer subscriptions.
// Individual displayed fish entries will be HTML elements using data to link
// back to the back-end data model. On initialization, the view model will still
// need to wrap the data model to support all of its fields.

// Update this whenever a new patch is released.
const LATEST_PATCH = 6.4;
// Set this to the date at which new patch fishes are displayed by default.
const SHOW_LATEST_PATCH_AFTER = dateFns.add(new Date(2023, 4, 23), { weeks: 2 });

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
      patch: new Set([2, 2.1, 2.2, 2.3, 2.4, 2.5,
                      3, 3.1, 3.2, 3.3, 3.4, 3.5,
                      4, 4.1, 4.2, 4.3, 4.4, 4.5,
                      5, 5.1, 5.2, 5.3, 5.4, 5.5,
                      6, 6.1, 6.2, 6.3, 6.4]),
      // Extra filtering:
      // * all: Display all fish, regardless of extra status.
      // * collectable: Display only collectable fish.
      // * aquarium: Display only aquarium fish.
      // * big: Display only big fish.
      extra: 'all',
      // Filter out fish that are always available?
      hideAlwaysAvailable: true,
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
    // * completed: A set of fish ids which have been caught.
    // * pinned: A set of fish ids which should be pinned.
    this.completed = new Set();
    this.pinned = new Set();

    // Latest Patch:
    // * Records the latest patch available when the user last visited.
    //   Used for including NEW patch data to filter on next visit.
    this.latestPatch = LATEST_PATCH;
  }
}

class BaitEntry {
  constructor(itemId) {
    this.id = itemId;
    // Wrap the item data using reference.
    this.itemData = DATA.ITEMS[itemId];
    // If it's a fish, include a reference to that as well.
    // - Unfortunately, we can't expect to find a FishEntry for this record.
    // Using Fishes in order to support live adjustments.
    this.fishData = _(Fishes).findWhere({id: itemId});
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

  get tug() {
    if (this.fishData && 'tug' in this.fishData) {
      return this.fishData.tug;
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

    this.isWeatherRestricted = fish.conditions.weatherSet.length != 0;

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
      let currEnd = eorzeaTime.toEarth(+crs[0].end);
      let nextStart = eorzeaTime.toEarth(+crs[1].start);

      this.availability.upcoming.downtime = dateFns.formatDistanceStrict(
        nextStart, currEnd, { roundingMethod: 'floor' }) + " later";

      this.availability.upcomingWindows = _(crs).map((cr, idx) => {
        let start = eorzeaTime.toEarth(+cr.start);
        let end = eorzeaTime.toEarth(+cr.end);
        let downtime = "";
        if (idx + 1 < crs.length) {
          downtime = dateFns.formatDistanceStrict(
            eorzeaTime.toEarth(+crs[idx+1].start), end, { roundingMethod: 'floor' });
        }
        let [previousWeather, weather] = _(weatherService.getWeatherSetForAreaAtTime(fish.location.zoneId, +cr.start)).map((w) => DATA.WEATHER_TYPES[w]);
        return {
          start: start,
          end: end,
          duration: dateFns.formatDistanceStrict(end, start, { roundingMethod: 'floor' }),
          downtime: downtime,
          previousWeather: previousWeather,
          weather: weather
        };
      });
    }
  }

  update(earthTime, full = false) {
    // This function should be called whenever the underlying fish data has changed.
    // Make sure you do this BEFORE updating the display...
    let fish = this.data;

    // TODO: Even this is pretty heavy-handed. We should really only update
    // the fields which have changed... [NEEDS-OPTIMIZATION]

    this.isCatchable = fish.isCatchable(fishWatcher.fishEyesEnabled);
    this.isCaught = ViewModel.isFishCaught(this.id);
    this.isPinned = ViewModel.isFishPinned(this.id);

    let crs = fish.catchableRanges;

    // The rest requires catchable ranges.
    if (crs.length > 0) {
      // NOTE: If it has one entry, it'll have 2...
      if (crs.length < 2) {
        console.error("Expected at least 2 catchable ranges for " + fish.name);
        return;
      }

      // Cache the dates, they are used A LOT.
      let currEnd = eorzeaTime.toEarth(+crs[0].end);
      // CHECK IF THE CRS HAS EXPIRED!!!
      if (dateFns.isSameOrAfter(earthTime, currEnd)) {
        // Let the FishWatcher know it needs to update this fish!
        currEnd = eorzeaTime.toEarth(+crs[1].end);
        fishWatcher.reinitRangesForFish(fish, {earthTime: earthTime});
        // NOTE: This will shift the CRS back!!!
      }

      let currStart = eorzeaTime.toEarth(+crs[0].start);
      let nextStart = eorzeaTime.toEarth(+crs[1].start);

      if (dateFns.isAfter(currStart, earthTime)) {
        // The fish is not currently available.
        this.isUpSoon = dateFns.differenceInMinutes(currStart, earthTime) < 15;
        this.availability.current.duration =
          "in " + dateFns.formatDistanceStrict(currStart, earthTime, { roundingMethod: 'floor' });
        this.availability.current.date = currStart;
      } else {
        // The fish is currently available!
        this.isUpSoon = false; // It's already up! XD
        this.availability.current.duration =
          "closes in " + dateFns.formatDistanceStrict(currEnd, earthTime, { roundingMethod: 'floor' });
        this.availability.current.date = currEnd;
      }
      this.availability.upcoming.duration =
        "in " + dateFns.formatDistanceStrict(nextStart, earthTime, { roundingMethod: 'floor' });

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

  getExternalLink(site = 'TC') {
    // 'site': Must be 'CBH', 'GT', or 'TC'.
    if (site == 'TC') {
      // Teamcraft
      // NOTE: While the language code does not seem to change the site's language, it
      // is required in the URL. I suppose I could technically throw whatever into this
      // but I like Miu, and I don't want to crash their site :)
      return "https://ffxivteamcraft.com/db/" + localizationHelper.getLanguage() + "/item/" + this.id;
    }
    else if (site == 'GT') {
      // Garland Tools
      return "https://garlandtools.org/db/#item/" + this.id;
    }
    else if (site == 'CBH') {
      // CBH doesn't standardize their fish info pages on the game's IDs so we must use search.
      let lang = localizationHelper.getLanguage();
      if (lang == 'ja') {
        // They also don't use the standard two-letter country code for Japanese...
        lang = 'jp';
      }
      return "https://ff14angler.com/index.php?lang=" + lang + "&search=" + encodeURIComponent(this.data.name);
    }
    else {
      console.error("Invalid external site ID:", site);
      return "";
    }
  }

  getVideoInfo() {
    if (this.data.video !== null) {
      // We need to return an object with the following fields:
      // * url
      // * icon class
      return _(this.data.video).map((contentId, contentType) => {
        let videoInfo = null;
        if (contentType == "youtube") {
          videoInfo = {iconClass: 'youtube', url: `https://youtu.be/${contentId}`};
        }
        return videoInfo;
      });
    } else {
      return null;
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

    // The entry being used for upcoming windows modal.
    this.upcomingWindowsEntry = null;
  }

  initialize() {
    doT.templateSettings.strip = false;

    // Share reference of fishEntries with fishWatcher.
    fishWatcher.fishEntries = this.fishEntries;

    // Initialize the weather tracking.
    weatherService.initializeWeatherTracking();

    // Configure Sorters.
    configureSorters({
      isFishPinned: this.isFishPinned.bind(this),
      includeVerySoonBin: true,
    });

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

    // Render the fish guide from template.
    FishGuide.render(document.getElementById('fishGuideElem'));
    $('#fishGuideModal').modal({
      onShow: function() {
        // Before displaying, make sure any completion data is updated
        // first.
        FishGuide.preShowHandler();
      }
    });

    // Initialize the fishing spot location map modal.
    FishingSpotMap.initialize();

    // Save the upcoming windows element.
    this.$upcomingWindows = $('#upcoming-windows');
    this.$upcomingWindows.modal({
      onHide: this.onHideUpcomingWindows
    });

    // Apply theme to elements now.
    // DO NOT ADD ANY MORE UI ELEMENTS AFTER THIS LINE OR THEY WILL
    // NOT AUTOMATICALLY BE UPDATED.
    this.applyTheme(this.settings.theme);

    $('#fish-guide-button').on('click', function(e) {
      if (e) e.stopPropagation();
      $('#main-menu.dropdown').dropdown('hide');
      $('#fishGuideModal').modal('show');
    });

    $('#tips-and-tricks-button').on('click', function(e) {
      if (e) e.stopPropagation();
      $('#main-menu.dropdown').dropdown('hide');
      $('#tips-and-tricks-modal').modal('show');
    });

    $('#settings-button').on('click', function(e) {
      if (e) e.stopPropagation();
      $('#advanced-settings-modal').modal('show');
    });

    $('#main-menu.dropdown').dropdown({
      action: 'hide'
    });

    // The language selection isn't managed by ViewModel's settings, so we need
    // to set the active language here...
    $('#languageChoice.dropdown')
      .dropdown('set selected', localizationHelper.getLanguage())
      .dropdown({
        onChange: (value, text, $choice) => localizationHelper.setLanguage(value),
      });

    const { Subject, BehaviorSubject, merge, interval } = rxjs;
    const { buffer, debounceTime, map, filter, skip, timestamp } = rxjs.operators;

    // Subjects.
    // These are used for RxJS to allow subscription events to changes.
    this.fishChangedSubject = new Subject();
    this.filterCompletionSubject = new BehaviorSubject(settings.filters.completion);
    this.filterExtraSubject = new BehaviorSubject(settings.filters.extra);
    this.filterPatchSubject = new BehaviorSubject(settings.filters.patch);
    this.filterAlwaysAvailableSubject = new BehaviorSubject(settings.filters.hideAlwaysAvailable);
    this.sortingTypeSubject = new BehaviorSubject(settings.sortingType);

    // Update the table!
    this.updateDisplay(null);

    // At this point, we need to remove the dimmer...
    $('#fish-table-container .ui.dimmer').removeClass('active');

    // Set event handlers.
    $('#filterCompletion .button').on('click', this.filterCompletionClicked);
    $('#filterExtra .button').on('click', this.filterExtraClicked);
    $('#filterHideAlwaysAvailable.checkbox').checkbox({
      onChange: this.filterHideAlwaysAvailableChecked
    });
    $('#filterPatch .button:not(.patch-set)').on({
      click: this.filterPatchClicked,
      dblclick: this.filterPatchDblClicked
    });
    $('#filterPatch .button.patch-set').on('click', this.filterPatchSetClicked);
    $('#theme-toggle .toggle').on('click', this.themeButtonClicked);
    $('#checklist .button').on('click', this.onChecklistButtonClicked);
    $('#fish-eyes-button').on('click', this.onFishEyesButtonClicked)

    // Initialize import/export modals.
    $('#export-settings-modal').modal();
    $('#import-settings-modal').modal();
    $('#alarm-cmd-modal').modal();

    // Special event handlers.
    // These are mainly supporting the SemanticUI widgets.
    $('#sortingType .radio.checkbox').checkbox({
      onChecked: this.sortingTypeChecked
    });

    var resumeTime = null;
    $('#eorzeaClock').on('click', () => {
      if (resumeTime !== null) {
        resumeTime();
      } else {
        eorzeaTime.zawarudo(resolve => {
          $('#eorzeaClock').css({filter: 'drop-shadow(orange 2px 2px 2px)', color: 'yellow'}).text("ザ・ワールド");
          resumeTime = resolve;
        }).then(() => {
          $('#eorzeaClock').css({filter: '', color: ''});
          resumeTime = null;
        });
      }
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
    const filterExtra$ = this.filterExtraSubject.pipe(
      skip(1),
      debounceTime(250),
      map(e => { return {filterExtra: e} })
    );
    const filterAlwaysAvailable$ = this.filterAlwaysAvailableSubject.pipe(
      skip(1),
      debounceTime(250),
      map(e => { return {filterAlwaysAvailable: e} })
    );
    const sortingType$ = this.sortingTypeSubject.pipe(
      skip(1),
      debounceTime(250),
      map(e => { return {sortingType: e} })
    );
    const language$ = localizationHelper.languageChanged.pipe(
      skip(1),
      map(e => { return {language: e} })
    );
    const fishEyes$ = fishWatcher.fishEyesChanged.pipe(
      skip(1),
      map(e => { return {fishEyes: e} })
    );

    const updateDisplaySources$ = merge(
      bufferedFishAvailability$,
      filterCompletion$,
      filterPatch$,
      filterExtra$,
      filterAlwaysAvailable$,
      sortingType$,
      language$,
      fishEyes$);

    merge(
      interval(1000).pipe(
        filter(() => resumeTime === null),
        timestamp(),
        map(e => { return {countdown: e.timestamp} })
      ),
      updateDisplaySources$.pipe(
        buffer(updateDisplaySources$.pipe(debounceTime(250))),
        filter(x => x.length > 0),
        map(e => {
          // Combine these into a single object.
          return e.reduce((acc, curr) => {
            return Object.assign(acc, curr);
          }, {});
        })
      )
    ).subscribe(e => this.updateDisplay(e));

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

      // Update the main header's times.
      $('#eorzeaClock').text(dateFns.format(dateFns.utc.toDate(eorzeaTime.toEorzea(timestamp)), "HH:mm"));

      // Check if the EARTH DATE has changed as well. If so, we must also
      // refresh the cached relative date text!
      let currDay = dateFns.getDayOfYear(timestamp);
      let needsFullUpdate = this.lastDate != currDay;
      this.lastDate = currDay;

      _(this.fishEntries).chain().reject(entry => entry.data.alwaysAvailable).each(entry => {
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

    console.info("Updating display...", reason);
    console.time('updateDisplay');

    // We need a base time!
    let timestamp = Date.now();

    if (reason !== null && ('fishAvailability' in reason || 'fishEyes' in reason))
    {
      // FishWatcher doesn't send a message when a fish window opens...
      // But it's important to know that one closed, since this results in new
      // availability values getting computed...
      // Either way... we'll update ALL THE FISH ENTRIES to prevent a
      // double-resort.
      _(this.fishEntries).chain().reject(entry => entry.data.alwaysAvailable).each(entry => {
        // Update the data for this entry first.
        entry.update(timestamp, true);
        // Then have the layout make necessary updates.
        // If Fish Eyes effect was recently changed, tell layout to do FULL update!
        this.layout.update(entry, timestamp, 'fishEyes' in reason);
      });
      // Fall-through just in case filters were changed at the same time...
    }

    if ((reason === null) ||
        (reason !== null && ('filterCompletion' in reason ||
                             'filterPatch' in reason ||
                             'filterExtra' in reason ||
                             'filterAlwaysAvailable' in reason)))
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
    if (reason !== null && ('filterCompletion' in reason ||
                            'filterPatch' in reason ||
                            'filterExtra' in reason ||
                            'filterAlwaysAvailable' in reason))
    {
      // Let FishWatcher know!
      fishWatcher.updateFishes();
    }

    if ((reason === null) ||
        (reason !== null && ('filterCompletion' in reason ||
                             'filterPatch' in reason ||
                             'filterExtra' in reason ||
                             'filterAlwaysAvailable' in reason ||
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

    console.timeEnd('updateDisplay');
  }

  isFishPinned(fishId) {
    return this.settings.pinned.has(fishId);
  }

  isFishCaught(fishId) {
    return this.settings.completed.has(fishId);
  }

  isFishFiltered(fish) {
    // Pinned fish are NEVER filtered out!
    if (this.isFishPinned(fish.id))
      return false;

    // Filter by patch.
    // Patches can be... odd sometimes.  Convert to string, and only compare
    // with the first number following the decimal.
    function normalizePatch(patch) {
      let strPatch = String(patch);
      let pos = strPatch.indexOf(".");
      if (pos > 0) {
        // Convert to a number keeping only the first digit after decimal.
        return Number(strPatch.substr(0, pos+2))
      } else {
        // Otherwise, it's already a flat number.
        return patch;
      }
    }
    if (!this.settings.filters.patch.has(normalizePatch(fish.patch)))
      return true;

    // Filter by completion state.
    if (this.settings.filters.completion == 'uncaught') {
      if (this.isFishCaught(fish.id))
        return true;
    } else if (this.settings.filters.completion == 'caught') {
      if (!this.isFishCaught(fish.id))
        return true;
    }

    // Filter by extra criteria.
    if (this.settings.filters.extra == 'big') {
      if (!fish.bigFish) return true;
    } else if (this.settings.filters.extra == 'collectable') {
      if (!fish.collectable) return true;
    } else if (this.settings.filters.extra == 'aquarium') {
      if (!fish.aquarium) return true;
    }

    // Filter by availability.
    if (this.settings.filters.hideAlwaysAvailable) {
      if (fish.alwaysAvailable && !fish.dataMissing) return true;
      if (fish.alwaysAvailable && fish.dataMissing !== false &&
          !(fish.dataMissing.weatherRestricted || fish.dataMissing.timeRestricted)) return true;
    }

    // No other reason to filter.
    return false;
  }

  displayAlarmCommand(entry) {
    let clipboard = new ClipboardJS('#alarm-cmd-copy', {
      container: document.getElementById('alarm-cmd-modal')
    });
    clipboard.on('success', function(e) {
      console.info("Command copied to clipboard.");
      e.clearSelection();
    });
    clipboard.on('error', function(e) {
      console.error("Failed to copy command");
    });
    // eg /alarm "アラームaaaaaa" et 0500 6 (max 10 chars)
    const fourDigitEoTime = ('0' + (entry.data.startHour | 0)).slice(-2) + ('0' + (60*(entry.data.startHour % 1) | 0)).slice(-2)
    $('#alarm-cmd-data').text('/alarm "' + entry.data.name.substring(0,10) + '" et ' + fourDigitEoTime + ' 3');
    // Display the modal.
    $('#alarm-cmd-modal')
      .modal({
        onHidden: function() {
          // Clean up the clipboard DOM.
          clipboard.destroy();
        }
      })
      .modal('show');
  }


  displayUpcomingWindows(entry) {
    console.time("Display upcoming windows");
    // If for some reason, the modal is already showing, we should hide it first.
    // This really cannot happen unless this function was called directly... so
    // don't do that...
    if (this.$upcomingWindows.hasClass('active')) {
      this.$upcomingWindows.modal('hide');
    }

    // First, we need to update the contents of the modal. It may already be empty,
    // but either way, we're going to clear out, and start fresh.
    // We also want to remember which fish is being displayed.
    this.upcomingWindowsEntry = entry;
    this.$upcomingWindows.empty().append(
      this.layout.templates.upcomingWindows(entry));

    // Now we can display the modal. If it wasn't already initialized, this should
    // take can of that too.
    this.$upcomingWindows.modal('show');
    console.timeEnd("Display upcoming windows");
  }

  onHideUpcomingWindows($element) {
    // Since the modal is now hidden, let's remove the setting too.
    ViewModel.upcomingWindowsEntry = null;
    // Always allow the modal to hide.
    return true;
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

      $('.upcoming-windows-button', $subEntry).on('click', e => {
        console.info("Displaying upcoming windows for %s", intuitionFish.data.name);
        this.displayUpcomingWindows(intuitionFishEntry);
      });

      $('.alarm-cmd-button', $subEntry).on('click', e => {
        console.info("Displaying in-game alarm command for %s", intuitionFish.data.name);
        this.displayAlarmCommand(intuitionFishEntry);
      });

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

    $('.upcoming-windows-button', $entry).on('click', e => {
      console.info("Displaying upcoming windows for %s", fish.name);
      this.displayUpcomingWindows(entry);
    });

    $('.alarm-cmd-button', $entry).on('click', e => {
      console.info("Displaying in-game alarm command for %s", fish.name);
      this.displayAlarmCommand(entry);
    });

    // Connect location button.
    $('.location-button', $entry).on('click', this.onFishEntryShowLocationClicked);

    if (this.settings.theme === 'dark') {
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
      ViewModel.settings.completed.delete(entry.id);
    } else {
      ViewModel.settings.completed.add(entry.id);
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
      ViewModel.settings.pinned.delete(entry.id);
    } else {
      ViewModel.settings.pinned.add(entry.id);
    }
    entry.isPinned = !entry.isPinned;
    ViewModel.saveSettings();

    // TODO: Determine if this fish should still be displayed efficiently.
    ViewModel.layout.updatePinnedState(entry);
    ViewModel.updateDisplay();

    return false;
  }

  onFishEntryShowLocationClicked(e) {
    e.stopPropagation();
    let $this = $(this);

    let entry = $this.closest('.fish-entry').data('view');
    FishingSpotMap.displayMap(entry.data);

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
    // Update the settings (after having toggled the patch element).
    if ($this.hasClass('active')) {
      ViewModel.settings.filters.patch.add(patch);
    } else {
      ViewModel.settings.filters.patch.delete(patch);
    }

    // If all of the sub-patches (that aren't disabled) are active, then the patch-set is too.
    var $patchSet = $this.siblings('.patch-set.button');
    var patchSetActive = $patchSet.siblings().not('.disabled').not('.active') == 0;
    $patchSet.toggleClass('active', patchSetActive);

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
    $this.parent().parent().siblings().find('.button').removeClass('active');
    var patch = Number($this.data('filter'));

    // Just this patch is included now.
    ViewModel.settings.filters.patch.clear();
    ViewModel.settings.filters.patch.add(patch);
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
        ViewModel.settings.filters.patch.add(Number($(this).data('filter')));
      });
    } else {
      // Deactivate the rest of the button as well, and remove from the filter settings.
      $this.siblings(":not(.disabled)").removeClass('active').each(function() {
        ViewModel.settings.filters.patch.delete(Number($(this).data('filter')));
      });
    }

    // Notify others about this change.
    ViewModel.filterPatchSubject.next(ViewModel.settings.filters.patch);
    ViewModel.saveSettings();
    return false;
  }

  filterExtraClicked(e) {
    e.stopPropagation();
    var $this = $(this);

    // Set the active filter.
    $this.addClass('active').siblings().removeClass('active');
    ViewModel.settings.filters.extra = $this.data('filter');

    // Notify anyone interested in this change.
    ViewModel.filterExtraSubject.next(ViewModel.settings.filters.extra);
    ViewModel.saveSettings();
    return false;
  }

  filterHideAlwaysAvailableChecked(e) {
    if (e) e.stopPropagation();
    let $this = $(this);

    ViewModel.settings.filters.hideAlwaysAvailable = $this.closest('.checkbox').checkbox('is checked');

    // Notify anyone interested in this change.
    ViewModel.filterAlwaysAvailableSubject.next(ViewModel.settings.filters.extra);
    ViewModel.saveSettings();
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

  onFishEyesButtonClicked(e) {
    if (e) e.stopPropagation();

    // Toggle the "active" class on the button, and use this to
    // determine what to set Fish Eyes enabled to in FishWatcher.
    let $fe = $('#fish-eyes-button');
    let enabled = $fe.toggleClass('active').hasClass('active');

    // Stop time while making this change to prevent JoJo from... err...
    // you know, nevermind.
    eorzeaTime.zawarudo(resolve => {
      fishWatcher.setFishEyes(enabled);
      resolve();
    }).then(() => {
      // Afterwards, update the styles please.
      $('#fishes').toggleClass('fish-eyes-enabled', enabled);
    });
  }

  themeButtonClicked(e) {
    if (e) e.stopPropagation();
    let $this = $(this);
    let theme = $this.data('theme');

    // Apply the theme.
    ViewModel.applyTheme(theme);
    // And save it to settings.
    ViewModel.settings.theme = theme;
    ViewModel.saveSettings();
  }

  applyTheme(theme) {
    if (theme === 'dark') {
      $('body').addClass('dark');
      $('*[data-tooltip]').attr('data-inverted', '');
    } else {
      $('body').removeClass('dark');
      $('*[data-tooltip]').removeAttr('data-inverted');
    }

    $('.ui.menu').toggleClass('inverted', theme === 'dark');
    $('.ui.modal').toggleClass('inverted', theme === 'dark');
    $('.ui.message.announcement').toggleClass('inverted', theme === 'dark');
    $('.ui.container').toggleClass('inverted', theme === 'dark');
    $('.ui.form').toggleClass('inverted', theme === 'dark');
    $('.ui.segment').toggleClass('inverted', theme === 'dark');
    $('.ui.table').toggleClass('inverted', theme === 'dark');
    $('.ui.list').toggleClass('inverted', theme === 'dark');
    $('.ui.top.attached.label').toggleClass('black', theme === 'dark');
  }

  loadSettings() {
    let settings = this.settings;
    let newUser = false;

    // Try loading the user's settings from localStorage.
    try {
      if (localStorage.getItem('fishTrackerSettings')) {
        settings = JSON.parse(localStorage.fishTrackerSettings);
      } else {
        newUser = true;
        if (localStorage.completed ||
            localStorage.pinned ||
            localStorage.theme) {
          // COMPATIBILITY SUPPORT:
          // * The old view model stores settings in individual keys. Check for them
          //   first, and upgrade to the new model.
          console.warn("Trying to restore settings from legacy version...");
          if (localStorage.completed) {
            settings.completed = new Set(JSON.parse(localStorage.completed));
          }
          if (localStorage.pinned) {
            settings.pinned = new Set(JSON.parse(localStorage.pinned));
          }
          if (localStorage.theme) {
            settings.theme = localStorage.theme;
          }
        }
      }
    } catch (ex) {
      // Ignore this. This may happen if localStorage is disabled or private browsing.
      console.warn("Unable to access localStorage. Settings not restored.");
      // Just in case, use the default settings...
      settings = this.settings;
    }

    if (newUser) {
      // New users will always have properly configured filter settings (initially).
      // But let's prevent spoiling any brand new content by checking first.
      if (dateFns.isBefore(Date.now(), SHOW_LATEST_PATCH_AFTER)) {
        settings.filters.patch.delete(LATEST_PATCH);
      }
    }

    // Now, apply the settings to the current page, committing them if all is well.
    return this.applySettings(settings);
  }

  applySettings(settings) {
    // NOTE: In order to prevent data corruption, this function assumes `this.settings`
    // is still completely valid.  As it processes the `settings` object, it will check
    // that it contains each key, and if one is missing, it will fall back to the
    // original valid data.

    // Make sure `completed` and `pinned` are stored internally as Sets.
    if (settings.completed && !(settings.completed instanceof Set)) {
      settings.completed = new Set(settings.completed);
    }
    if (settings.pinned && !(settings.pinned instanceof Set)) {
      settings.pinned = new Set(settings.pinned);
    }

    if (!(settings.filters)) {
      // Why is `filters` missing?!
      console.warn("Why is filters missing??? Using default then...");
      settings.filters = this.settings.filters;
    }
    if (settings.filters.completion) {
      $('#filterCompletion .button[data-filter="' + settings.filters.completion + '"]')
      .addClass('active').siblings().removeClass('active');
    }
    if (settings.filters.extra) {
      $('#filterExtra .button[data-filter="' + settings.filters.extra + '"]')
      .addClass('active').siblings().removeClass('active');
    }
    if (settings.filters.hideAlwaysAvailable === undefined) {
      console.info("Defaulting the 'hideAlwaysAvailable' setting to TRUE");
      settings.filters.hideAlwaysAvailable = true;
      let $message = $('#hideAlwaysAvailable_message');
      $message.removeClass('hidden');
      $message.find(".close").on('click', function() {
        $(this).closest('.message').transition('fade');
      });
    }
    if (settings.filters.hideAlwaysAvailable) {
      $('#filterHideAlwaysAvailable').checkbox('set checked');
    } else {
      $('#filterHideAlwaysAvailable').checkbox('set unchecked');
    }
    if (settings.filters.patch) {
      // Convert to a Set if it's not already.
      if (!(settings.filters.patch instanceof Set)) {
        settings.filters.patch = new Set(settings.filters.patch);
      }
      // Check if they've been here since the latest patch.
      if (settings.latestPatch !== LATEST_PATCH) {
        console.info("Welcome back! There's new fishies to be caught!");
        // Rather than force the new patch into the filters, display a message
        // for the user so they are aware there's new fish to track.
        $('#new-fish-available-modal').modal({
          onApprove: function($element) {
            // Approval means they want the latest patch's fish displayed, NOW!
            ViewModel.settings.filters.patch.add(Number(LATEST_PATCH));

            // FIXME: Duplicate code!
            $('#filterPatch .button').removeClass('active');
            for (let includedPatch of ViewModel.settings.filters.patch) {
              // Activate THIS patch's filter button.
              $('#filterPatch .button[data-filter="' + includedPatch + '"]:not(.patch-set)').toggleClass('active', true);
            }
            // Second pass to determine if the patch-set button should be active or not.
            // If all of the sub-patches (that aren't disabled) are active, then the patch-set is too.
            for (let patchSet of $('#filterPatch .patch-set.button')) {
              let patchSetActive = $(patchSet).siblings().not('.disabled').not('.active').length == 0;
              $(patchSet).toggleClass('active', patchSetActive);
            }

            // Notify others about the change.
            ViewModel.filterPatchSubject.next(ViewModel.settings.filters.patch);
            ViewModel.saveSettings();

            return true;
          }
        })
        .modal('show');
      }
    } else {
      // For some reason, the patch filter setting is missing?! Just use the default then.
      settings.filters.patch = this.settings.filters.patch;
    }
    // Always reset the latest patch; fish that have been seen, cannot be unseen... CUPFISH!
    // This will prevent the site from notifying the user as well.
    settings.latestPatch = LATEST_PATCH;
    // Probably need to adjust the patch filter UI as a result...
    $('#filterPatch .button').removeClass('active');
    for (let includedPatch of settings.filters.patch) {
      // Activate THIS patch's filter button.
      $('#filterPatch .button[data-filter="' + includedPatch + '"]:not(.patch-set)').toggleClass('active', true);
    }
    // Second pass to determine if the patch-set button should be active or not.
    // If all of the sub-patches (that aren't disabled) are active, then the patch-set is too.
    for (let patchSet of $('#filterPatch .patch-set.button')) {
      let patchSetActive = $(patchSet).siblings().not('.disabled').not('.active').length == 0;
      $(patchSet).toggleClass('active', patchSetActive);
    }

    // Set the sorter function.
    if (!(settings.sortingType)) {
      // Why is `sortingType` missing???
      console.warn("Why is sortingType missing??? Using default then...");
      settings.sortingType = this.settings.sortingType;
    }
    if (settings.sortingType == 'overallRarity') {
      this.sorterFunc = Sorters.sortByOverallRarity;
    } else if (settings.sortingType == 'windowPeriods') {
      this.sorterFunc = Sorters.sortByWindowPeriods;
    } else {
      console.error("Invalid sortingType: ", settings.sortingType);
    }
    $('#sortingType input[value="' + settings.sortingType + '"]').parent().checkbox('check');

    // Set the theme.
    if (!(settings.theme)) {
      // Why is `theme` missing???
      console.warn("Why is theme missing??? Using default then...");
      settings.theme = this.settings.theme;
    }
    this.applyTheme(settings.theme);

    // Save the settings to the model.
    this.settings = settings;
    // And update local storage.
    this.saveSettings();

    return settings;
  }

  saveSettings() {
    // Save the site settings to localStorage.
    try {
      localStorage.fishTrackerSettings =
        JSON.stringify(this.settings,
                       (key, value) => value instanceof Set ? [...value] : value);
    } catch (ex) {
      console.warn("Unable to save settings to local storage.");
    }
  }

  overwriteChecklist(checklist) {
    // NOTE: It's fine if the checklist contains IDs that aren't in the list...
    // Again, if a user provides bad data, they're just gonna break the page for
    // themselves...
    console.info("Overwriting checklist...\nWas:", [...this.settings.completed], "\nNow:", checklist);
    this.settings.completed = new Set(checklist);
  }

  exportSiteSettings() {
    let clipboard = new ClipboardJS('#export-settings-copy', {
      container: document.getElementById('export-settings-modal')
    });
    clipboard.on('success', function(e) {
      console.info("Settings copied to clipboard.");
      e.clearSelection();
    });
    clipboard.on('error', function(e) {
      console.error("Failed to copy settings");
    });

    // Generate the exportable site data.
    // TODO: Support compression.
    $('#export-settings-data').val(
      JSON.stringify(this.settings,
                     (key, value) => value instanceof Set ? [...value] : value));

    // TODO: Support uploading to cl1p.net

    // Display the modal.
    $('#export-settings-modal')
      .modal({
        onHidden: function() {
          // Clean up the clipboard DOM.
          clipboard.destroy();
          // Erase displayed data from form please...
          $('#export-settings-data').val("");
        }
      })
      .modal('show');
  }

  importSiteSettings() {
    $('#import-settings-modal')
      .modal({
        onApprove: function($element) {
          // Apply the imported settings now.
          let settings = JSON.parse($('#import-settings-data').val());
          // Check if the `settings` is a list or object.
          if (settings instanceof Array) {
            // Array means it's just a checklist. Don't overwrite any other settings...
            // NOTE: This will OVERWRITE the checklist! I'm assuming you've tracked the fish elsewhere...
            ViewModel.overwriteChecklist(settings);
          } else {
            // Otherwise, it should be valid settings.
            ViewModel.applySettings(settings);
          }
          // Update the fish entries.
          // TODO: [NEEDS-OPTIMIZATION]
          let earthTime = new Date();
          _(ViewModel.fishEntries).each(entry => {
            entry.update(earthTime, true);
            ViewModel.layout.updatePinnedState(entry);
            ViewModel.layout.updateCaughtState(entry);
          });
          // Update the display to update the fish table as well.
          ViewModel.updateDisplay(null);
          return true;
        },
        onHidden: function() {
          // Erase saved data from form please...
          $('#import-settings-data').val("");
        }
      })
      .modal('show');
  }

  onChecklistButtonClicked(e) {
    if (e) e.stopPropagation();
    let $this = $(this);

    if ($this.data('action') === 'export') {
      ViewModel.exportSiteSettings();
    } else {
      ViewModel.importSiteSettings();
    }
    return false;
  }
};
