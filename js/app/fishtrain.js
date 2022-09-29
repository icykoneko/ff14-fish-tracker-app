///////////////////////////////////////////////////////////////////////////////
// FishTrain
// ============================================================================
// Fish Train is a tool for planning out big fishing events. This code covers
// all the back-end view and model and is loosely based on the original
// ViewModel.
//
// Plushy didn't write this app well enough to just make use of the existing
// code, and thus, I exist. I'm sure they're sorry.

let FishTrain = function(){

  var sub_templates = {
    fishEntryInterval: {arg: 'it', text:
     `{{? it.lastDT != it.i.dt }}
        <td class="fishtrain-fishentry-interval {{? !it.i.skip}}has-window{{?}}">
      {{?}}
      {{? !it.i.skip }}
        <span class="interval-indicator"
              style="margin-left: {{=it.i.indicatorLeft}}%; width: {{=it.i.indicatorWidth}}%;"></span>
      {{?}}
      {{? it.lastDT != it.i.dt }}
        </td>
      {{?}}`
    },

    fishEntryDetailsInner: {arg: 'it', text:
     `<span><b>Details:</b></span>
      <!-- Additional Details -->
      <div class="ui middle aligned" style="display: inline-block; margin-left: 1em;">
        <div class="ui tiny circular label">{{=it.data.patch}}</div>
        <!-- check if fish can be put into the aquarium -->
        {{?it.data.aquarium !== null}}
          <div class="ui middle aligned sprite-icon sprite-icon-aquarium"
               data-tooltip="Tier {{=it.data.aquarium.size}} {{=it.data.aquarium.water}}" data-position="right center" data-variation="mini"></div>
        {{?}}
        {{?it.data.folklore !== null}}
          <div class="ui middle aligned sprite-icon sprite-icon-folklore"
               data-tooltip="{{=__p(DATA.FOLKLORE[it.data.folklore],'name')}}" data-position="right center" data-variation="mini"></div>
        {{?}}
        {{?it.data.collectable !== null}}
          <div class="ui middle aligned sprite-icon sprite-icon-collectable"
               data-tooltip="Minimum Collectability: {{=it.data.collectable}}" data-position="right center" data-variation="mini"></div>
        {{?}}
        {{?it.data.video !== null}}
          <!-- Include link to video guide -->
          {{~it.getVideoInfo() :videoInfo}}
            <a class="plainlink" href="{{=videoInfo.url}}" target="cp_vguide"><i class="{{=videoInfo.iconClass}} icon"></i></a>
          {{~}}
        {{?}}
      </div>
      <!-- Conditions Details -->
      <div class="ui middle aligned" style="display: inline-block; margin-left: 4em;">
        <!-- Weather -->
        {{?it.data.dataMissing !== false}}
          {{?it.data.dataMissing.weatherRestricted}}
            <i class="cloud icon"></i> Weather Restricted
            {{?it.data.conditions.weatherSet.length > 0}}
              <i class="exclamation triangle icon" title="Unknown/Incomplete"></i>
            {{?}}
          {{?}}
        {{?}}
        {{?it.data.conditions.previousWeatherSet.length > 0}}
          {{~it.data.conditions.previousWeatherSet :weather:windex}}
            <div class="ui middle aligned weather-icon sprite-icon sprite-icon-weather-{{=weather.icon}}"
                 title="{{=__p(weather,'name')}}"
                 data-prevWeatherIdx="{{=windex}}"></div>
          {{~}}
          <i class="arrow right icon"></i>
        {{?}}
        {{~it.data.conditions.weatherSet :weather:windex}}
          <div class="ui middle aligned weather-icon sprite-icon sprite-icon-weather-{{=weather.icon}}"
               title="{{=__p(weather,'name')}}"
               data-currWeatherIdx="{{=windex}}"></div>
        {{~}}
        <span style="{{?it.data.conditions.weatherSet.length > 0}}padding-left: 1em;{{?}}"></span>
        <!-- Time -->
        {{?it.data.dataMissing !== false}}
          {{?it.data.dataMissing.timeRestricted}}
            <i class="clock icon"></i> Time Restricted
            {{? it.data.startHour !== 0 || it.data.endHour !== 24 }}
              <i class="exclamation triangle icon" title="Unknown/Incomplete"></i>
              <span class="catchtime-hour">{{=Math.floor(it.data.startHour)}}</span>{{?it.data.startHour % 1 !== 0}}<span class="catchtime-minute">{{=(it.data.startHour % 1) * 60}}</span>{{?}}
              -
              <span class="catchtime-hour">{{=Math.floor(it.data.endHour)}}</span>{{?it.data.endHour % 1 !== 0}}<span class="catchtime-minute">{{=(it.data.endHour % 1) * 60}}</span>{{?}}
            {{?}}
          {{?}}
        {{??}}
          <i class="alarm-cmd-button wait icon"></i>&nbsp;
          {{? it.data.startHour === 0 && it.data.endHour === 24}}
            All Day
          {{??}}
            <span class="catchtime-hour">{{=Math.floor(it.data.startHour)}}</span>{{?it.data.startHour % 1 !== 0}}<span class="catchtime-minute">{{=(it.data.startHour % 1) * 60}}</span>{{?}}
            -
            <span class="catchtime-hour">{{=Math.floor(it.data.endHour)}}</span>{{?it.data.endHour % 1 !== 0}}<span class="catchtime-minute">{{=(it.data.endHour % 1) * 60}}</span>{{?}}
          {{?}}
        {{?}}
      </div>
      <!-- Requirements and Bait -->
      <div class="ui middle aligned" style="display: inline-block; margin-left: 4em;">
        {{?it.data.dataMissing !== false || it.data.gig === "UNKNOWN"}}
          <i class="question circle outline icon" title="Unknown/Incomplete"></i>
        {{?}}
        <!-- Put Fishers intuition if fish has at least 1 predetor -->
        {{?it.data.bait.hasPredators}}
          <div class="ui middle aligned status-icon sprite-icon sprite-icon-status-intuition{{?it.data.intuitionLength}} has-duration{{?}}" title="Fisher's Intuition">
            {{?it.data.intuitionLength}}
              <span>{{var d = it.data.intuitionLength; if (d) { out += Math.floor(d/60) + 'm' + (d % 60); }}}s</span>
            {{?}}
          </div>
        {{?}}
        {{?it.data.snagging}}
          <div class="ui middle aligned status-icon sprite-icon sprite-icon-status-snagging" title="Snagging"></div>
        {{?}}
        {{?it.data.gig}}
          {{?it.data.gig === "UNKNOWN"}}
            <span>Spearfishing</span>
          {{??}}
            <div class="ui middle aligned bait-icon sprite-icon sprite-icon-action-{{=it.data.gig.toLowerCase()}}_gig" title="{{=it.data.gig}} Gig"></div>
          {{?}}
        {{?}}
        <span class="bait-span">
          {{~it.bait :item:idx}}
            {{?idx == 0}}
              <a href="https://garlandtools.org/db/#item/{{=item.id}}" target="cp_gt">
            {{??}}
              <div class="bait-badge-container">
                {{?item.hookset}}
                  <div class="ui middle aligned bait-icon hookset-modifier-icon sprite-icon sprite-icon-action-{{=item.hookset.toLowerCase()}}_hookset"
                       title="{{=item.hookset}} Hookset"></div>
                {{?}}
                {{?item.tug}}
                  <div class="tug-indicator {{=item.tug}}-tug-indicator" title="{{=item.tug}} tug">
                    {{={'light': '!', 'medium': '!!', 'heavy': '!!!'}[item.tug]}}
                  </div>
                {{?}}
              </div>
              </span><!-- bait-span -->
              <i class="arrow right icon"></i>
              <span class="bait-span">
            {{?}}
            <div class="ui middle aligned bait-icon sprite-icon sprite-icon-fish_n_tackle-{{=item.icon}}" title="{{=item.name}}" data-baitIdx="{{=idx}}"></div>
            {{?idx == 0}}
              </a>
            {{?}}
          {{~}}
          <div class="bait-badge-container">
            {{?it.data.hookset}}
              <div class="ui middle aligned bait-icon hookset-modifier-icon sprite-icon sprite-icon-action-{{=it.data.hookset.toLowerCase()}}_hookset" title="{{=it.data.hookset}} Hookset"></div>
            {{?}}
            {{?it.data.tug}}
              <div class="tug-indicator {{=it.data.tug}}-tug-indicator" title="{{=it.data.tug}} tug">
                {{={'light': '!', 'medium': '!!', 'heavy': '!!!'}[it.data.tug]}}
              </div>
            {{?}}
          </div>
        </span><!-- bait span -->
      </div>
      `
    },
  };

  var templates = {
    fishEntry: `<tr class="fishtrain-fishentry" data-id={{=it.id}}>
  <td class="sticky col-fish">
    <div class="ui middle aligned small fish-icon sprite-icon sprite-icon-fish_n_tackle-{{=it.data.icon}}"></div>
    <div class="ui middle aligned" style="display: inline-block;">
      <span class="fish-name">{{=it.data.name}}</span>
    </div>
    <div class="ui middle aligned" style="display: inline-block; font-size: smaller; float: right;">
      (<b>Uptime:</b>&nbsp;<span class="fish-availability-uptime">{{=(it.uptime * 100.0).toFixed(1)}}</span>%)
    </div>
  </td>
  <td class="sticky col-location">
    <i class="location-button map icon"></i> <a href="https://ffxivteamcraft.com/db/en/{{?it.data.location.spearfishing}}spearfishing{{??}}fishing{{?}}-spot/{{=it.data.location.id}}"
       target="cp_gt" class="location-name">{{=it.data.location.name}}</a><br/>
    <span style="font-size: smaller" class="zone-name">{{=it.data.location.zoneName}}</span>
  </td>
  {{ var lastDT=0; }}
  {{~ it.intervals :p}}
    {{#def.fishEntryInterval:{i:p,lastDT:lastDT} }}
    {{ lastDT=p.dt; }}
  {{~}}
</tr>`,

    intervalHeadings:
     `{{~ it :k}}
        <th class="interval"><span>{{=k}}</span></th>
      {{~}}`,

    fishEntryDetails:
     `<tr class="fishtrain-fishentrydetails" data-id={{=it.entry.id}}>
        <td colspan="{{=it.colspan}}">
          <div class="contents" style="width: 0px">
            {{#def.fishEntryDetailsInner:it.entry }}
          </div>
        </td>
      </tr>`,
  };

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
      this.active = true;
      this.id = fish.id;
      this.intervals = [];
      this.data = fish;

      this.isWeatherRestricted = fish.conditions.weatherSet.length != 0;
      this.bait = _(fish.bestCatchPath).map(x => new BaitEntry(x));

      // Reference to DOM element in timeline table.
      this.timelineEl = null;
      // Reference to DOM element in schedule table.
      this.scheduleEl = null;
      // Reference to DOM element for more details.
      this.detailsEl = null;
    }

    get uptime() { return this.data.uptime(); }

    updateIntervals(intervals, duration) {
      let fish = this.data;
      let crs = fish.catchableRanges;

      let durationMS = dateFns.milliseconds(duration);

      if (fish.alwaysAvailable == true) {
        this.intervals = _(intervals).map(start => { 
          return { dt: +start, skip: false, indicatorLeft: 0, indicatorWidth: 100 };
        });
        return;
      }

      let crs_idx = 0;

      // Is the fish going to be up AT ALL during any interval?!
      let eEndOfIntervals = eorzeaTime.toEorzea(dateFns.add(_(intervals).last(), duration));
      if (dateFns.isSameOrAfter(_(crs).first().start, eEndOfIntervals)) {
        console.warn("%s won't be up for another %s", fish.name,
          dateFns.formatDistanceStrict(_(intervals).first(), eorzeaTime.toEarth(_(crs).first().start)));
        // Just deactivate this entry so we skip it.
        this.active = false;
        return;
      }

      this.intervals = _(intervals).reduce((memo, start) => {
        let eStart = eorzeaTime.toEorzea(start);
        let eEnd = eorzeaTime.toEorzea(dateFns.add(start, duration));
        let hit = false;
        while (crs_idx < crs.length) {
          // Does the next catchable range start AFTER this interval ends?
          if (dateFns.isSameOrAfter(crs[crs_idx].start, eEnd)) {
            // Skip this interval and move on to the next.
            if (hit) {
              return memo;
            } else {
              return memo.concat({ dt: +start, skip: true });
            }
          }
          // Try intersecting this catchable range first.
          let range = dateFns.intervalIntersection(crs[crs_idx], {start: eStart, end: eEnd});
          if (range === null) {
            // Not up during this interval; move on to the next.
            if (hit) {
              return memo;
            } else {
              return memo.concat({ dt: +start, skip: true });
            }
          } else {
            // At least part of this catchable range is during this interval.
            // Add to the list, but continue checking catchable ranges for wrap-around.
            let totalMS = dateFns.milliseconds(dateFns.intervalToDuration({
              start: eorzeaTime.toEarth(range.start),
              end: eorzeaTime.toEarth(range.end)}));
            let offsetMS = dateFns.differenceInMilliseconds(
              eorzeaTime.toEarth(range.start), start);
            memo = memo.concat({
              dt: +start, skip: false,
              earth: { start: +eorzeaTime.toEarth(crs[crs_idx].start),
                       end: +eorzeaTime.toEarth(crs[crs_idx].end) },
              eorzea: crs[crs_idx],
              indicatorLeft: Math.round(offsetMS / durationMS * 100),
              indicatorWidth: Math.round(totalMS / durationMS * 100)
            });
            hit = true;
            if (dateFns.isBefore(crs[crs_idx].end, eEnd)) {
              // The catchable range ends BEFORE the interval; check for multiple ranges.
              crs_idx++;
            }
            // Otherwise, the interval ends BEFORE this range. Return, but stay on the same range.
            return memo;
          }
        }
        return memo;
      }, []);
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


  class _FishTrain {
    constructor() {
      // Fix bug in doT.js template regex.
      doT.templateSettings.use = /\{\{#([\s\S\}]+?)\}\}/g;
      // Compile the templates.
      this.templates = {
        fishEntry: doT.template(templates.fishEntry, undefined, sub_templates),
        intervalHeadings: doT.template(templates.intervalHeadings),
        fishEntryDetails: doT.template(templates.fishEntryDetails, undefined, sub_templates),
      };
    }

    initialize() {
      // Default Settings
      this.settings = {
        filters: {
          patch: new Set([2, 2.1, 2.2, 2.3, 2.4, 2.5,
                          3, 3.1, 3.2, 3.3, 3.4, 3.5,
                          4, 4.1, 4.2, 4.3, 4.4, 4.5,
                          5, 5.1, 5.2, 5.3, 5.4, 5.5,
                          6, 6.1, 6.2]),
          extra: 'all',
        },
        sortingType: 'overallRarity',
        theme: 'dark',
        timelineInterval: 30,
      };

      this.timeline = {
        start: null,
        end: null,
        fish: [],
        intervals: [],
      };

      this.sorterFunc = (a, b) => a < b;

      // Load the settings for this tool.
      this.loadSettings();

      // Fish entries for the timeline.
      // In order to calculate rarity, we need to check everything (otherwise
      // you could always guestimate.)
      this.fishEntries = {};
      // Link it to the fishWatcher.
      fishWatcher.fishEntries = this.fishEntries;
      // Configure sorters.
      configureSorters({
        isFishPinned: (x) => false,
        includeVerySoonBin: false
      });

      // We don't want to actually fully initialize the weather service
      // because this tool doesn't need to update anything after the user
      // selects a time period.

      // Register subscribers for events.

      this.initializeView();
    }

    initializeView() {
      // Track certain DOM objects.
      this.fishTrainTableHeader$ = $('table#fishtrain thead tr').first();
      this.fishTrainTableBody$ = $('table#fishtrain tbody');

      $('.ui.dropdown').dropdown();
      $('#main-menu.dropdown').dropdown({
        action: 'hide'
      });
      $('.ui.radio.checkbox').checkbox();
      $('#languageChoice.dropdown')
      .dropdown('set selected', localizationHelper.getLanguage())
      .dropdown({
        onChange: (value, text, $choice) => localizationHelper.setLanguage(value),
      });
      $('#sortingType .radio.checkbox').checkbox({
        onChecked: _(this.sortingTypeChecked).partial(this)
      });

      // Apply theme to elements now.
      // DO NOT ADD ANY MORE UI ELEMENTS AFTER THIS LINE OR THEY WILL
      // NOT AUTOMATICALLY BE UPDATED.
      this.applyTheme(this.settings.theme);

      // Calendar's are special... they need to be reinitialized to pick up inverted class.
      this.reinitCalendarFields();

      $('#theme-toggle .toggle').on('click', this, this.themeButtonClicked);

      $('#updateList').on('click', this, this.updateList);

      $('#filterPatch .button:not(.patch-set)').on({
        click: this.filterPatchClicked,
        dblclick: this.filterPatchDblClicked
      }, this);
      $('#filterPatch .button.patch-set').on('click', this, this.filterPatchSetClicked);
      $('#filterExtra .button').on('click', this, this.filterExtraClicked);

      // Add delegated event listeners to the timeline table.
      this.fishTrainTableBody$.on(
        'click', 'span.fish-name', this, this.showDetailsInTimeline);
      
      // We need to awake of resizing...
      $(window).resize(this, this.adjustTimelineDetailsElements);
    }

    reinitCalendarFields(opts={}) {
      var startDate = $('#rangestart').calendar('get date');
      var endDate = $('#rangeend').calendar('get date');

      if (startDate === null) {
        startDate = new Date();
        endDate = dateFns.addHours(startDate, 3);
      }

      $('#rangestart').calendar({
        endCalendar: '#rangeend',
        initialDate: startDate,
        selectAdjacentDays: true,
        today: true,
      });
      $('#rangeend').calendar({
        startCalendar: '#rangestart',
        initialDate: endDate,
        selectAdjacentDays: true
      });
    }

    updateList(e) {
      e.stopPropagation();
      // Reset the main context.
      var _this = e.data;

      console.time("Generate Timeline");

      // Clear the table.
      _this.fishTrainTableBody$.empty();
      _this.fishTrainTableHeader$.find('.interval').remove();

      // Determine the intervals.
      _this.settings.timelineInterval = $('#timelineInterval').dropdown('get value');
      _this.timeline.start = $('#rangestart').calendar('get date');
      _this.timeline.end = $('#rangeend').calendar('get date');

      // Reinitialize the availability data and weather.
      CarbyUtils._resetSiteData(+_this.timeline.start)

      // Get intervals but exclude the last entry if it matches an interval.
      // To accomplish this, we subtract one second from the end date.
      var intervals = dateFns.eachMinuteOfInterval(
        {start: _this.timeline.start, end: _this.timeline.end-1},
        {step: _this.settings.timelineInterval});

      _this.timeline.intervals = intervals;

      // Update the table headers.
      _this.fishTrainTableHeader$.append(
        _this.templates.intervalHeadings(_(intervals).map(x => dateFns.format(x, 'p'))));

      // Mark all existing entries as stale (or not active).
      // Anything that's not active, won't be displayed, and at the end of this
      // function, will be removed from the list, making future updates faster.
      _(_this.fishEntries).each((entry) => entry.active = false);

      // Now it's time to compute the availability for our fishies...
      // This might take a while...
      _(Fishes).chain()
        .reject(fish => _this.isFishFiltered.call(_this, fish))
        .each(fish => _this.activateEntry.call(_this, fish, +_this.timeline.start));

      // Remove any left-over entries (so we only have fish matching the FILTER).
      for (let k in _this.fishEntries) {
        var entry = _this.fishEntries[k];
        if (!entry.active) {
          _this.removeEntry.call(_this, entry, k);
        }
      }

      // Let FishWatcher know it needs to reinit everything.
      // This will calculate the catchable ranges of the next 10 windows.
      // Hopefully, this is more than enough to cover the user's requested duration.
      fishWatcher.updateFishes({earthTime: +_this.timeline.start});

      // Update the intervals for all active fish entries.
      // (At this point, there should only be ACTIVE entries)
      console.time('Updating intervals');

      _(_this.fishEntries).each(
        entry => entry.updateIntervals(intervals, {minutes: _this.settings.timelineInterval}));

      // Remove any entries which ARE NOT UP during this time period.
      for (let k in _this.fishEntries) {
        var entry = _this.fishEntries[k];
        if (!entry.active) {
          _this.removeEntry.call(_this, entry, k);
        }
      }

      console.timeEnd('Updating intervals');

      // Defer call to redraw the timeline.
      $(() => {
        _this.redrawTimeline.call(_this);
      });

      console.timeEnd("Generate Timeline");

      return;
    }

    redrawTimeline() {
      // Sort the entries. While this technically creates a separate list, each
      // entry is still just a reference to the master list `fishEntries`.
      let sortedEntries = _(this.fishEntries).values().sort((a, b) => {
        return this.sorterFunc(a.data, b.data, +this.timeline.start);
      });

      _(sortedEntries).each(entry => {
        // Append the DOM for this entry first.
        let entry$ =
          $(this.templates.fishEntry(entry)).appendTo(this.fishTrainTableBody$);
        // Save reference to element on the entry.
        entry.timelineEl = entry$[0];
        // Just in case there's stale data here...
        entry.detailsEl = null;
      });
    }

    showDetailsInTimeline(e) {
      let _this = e.data;
      // Find the FishEntry for this event.
      let entry = _this.fishEntries[
        Number($(this).closest('tr.fishtrain-fishentry').data('id'))];
      // Check if we already created the DOM for this fish first,
      // and if not, create it now.
      if (entry.detailsEl == null) {
        // Determine the size of the table without scrolling so we can prevent
        // the details element from moving if the user scrolls horizontally.
        var scrollContext = $('#fishtrain').parent()[0];
        var scrollWidth = scrollContext.offsetWidth - scrollContext.clientWidth;
        var details$ = $(_this.templates.fishEntryDetails({
          colspan: 2 + _this.timeline.intervals.length,
          entry: entry
        }));
        // Add the element to the DOM after the fish entry.
        $(entry.timelineEl).after(details$);
        // And fixup its width.
        // var containerMeasurements = $('.contents', details$).parent().css(['padding-left', 'padding-right']);
        // var calculatedWidth = `calc(${scrollContext.clientWidth}px - ${containerMeasurements['padding-left']} - ${containerMeasurements['padding-right']})`;
        $('.contents', details$).css({
          // left: containerMeasurements['padding-left'],
          left: 0,
          width: scrollContext.clientWidth,
          position: 'sticky'
        });

        entry.detailsEl = details$[0];
      }

      if ($(entry.detailsEl).hasClass('visible')) {
        $(entry.detailsEl).removeClass('visible').addClass('hidden');
      } else {
        $(entry.detailsEl).removeClass('hidden').addClass('visible');
      }
    }

    adjustTimelineDetailsElements(e) {
      let _this = e.data;
      var scrollContext = $('#fishtrain').parent()[0];
      $('.fishtrain-fishentrydetails .contents').css('width', scrollContext.clientWidth);
    }

    isFishFiltered(fish) {
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

      // Filter by extra criteria.
      if (this.settings.filters.extra == 'big') {
        if (!fish.bigFish) return true;
      } else if (this.settings.filters.extra == 'collectable') {
        if (!fish.collectable) return true;
      } else if (this.settings.filters.extra == 'aquarium') {
        if (!fish.aquarium) return true;
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
      // Add the new entry to the set of tracked fish entry.
      this.fishEntries[fish.id] = entry;

      return entry;
    }

    removeEntry(entry, k) {
      delete this.fishEntries[k];
    }

    filterPatchClicked(e) {
      e.stopPropagation();
      var $this = $(this);

      // Update the UI and get the patch number together.
      var patch = Number($this.toggleClass('active').data('filter'));
      // Update the settings (after having toggled the patch element).
      if ($this.hasClass('active')) {
        e.data.settings.filters.patch.add(patch);
      } else {
        e.data.settings.filters.patch.delete(patch);
      }

      // If all of the sub-patches (that aren't disabled) are active, then the patch-set is too.
      var $patchSet = $this.siblings('.patch-set.button');
      var patchSetActive = $patchSet.siblings().not('.disabled').not('.active') == 0;
      $patchSet.toggleClass('active', patchSetActive);
  
      e.data.saveSettings();
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
      e.data.settings.filters.patch.clear();
      e.data.settings.filters.patch.add(patch);

      e.data.saveSettings();
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
          e.data.settings.filters.patch.add(Number($(this).data('filter')));
        });
      } else {
        // Deactivate the rest of the button as well, and remove from the filter settings.
        $this.siblings(":not(.disabled)").removeClass('active').each(function() {
          e.data.settings.filters.patch.delete(Number($(this).data('filter')));
        });
      }

      e.data.saveSettings();
      return false;
    }

    filterExtraClicked(e) {
      e.stopPropagation();
      var $this = $(this);

      // Set the active filter.
      $this.addClass('active').siblings().removeClass('active');
      e.data.settings.filters.extra = $this.data('filter');

      e.data.saveSettings();
      return false;
    }

    sortingTypeChecked(_this) {
      let $this = $(this);
      let sortingType = $this.val();
  
      if (sortingType == 'overallRarity') {
        _this.sorterFunc = Sorters.sortByOverallRarity;
      } else if (sortingType == 'windowPeriods') {
        _this.sorterFunc = Sorters.sortByWindowPeriods;
      } else {
        console.error("Invalid sortingType: ", sortingType);
        return;
      }
  
      _this.settings.sortingType = sortingType;
      _this.saveSettings();
    }
  
    themeButtonClicked(e) {
      if (e) e.stopPropagation();
      let $this = $(this);
      let theme = $this.data('theme');

      // Apply the theme.
      e.data.applyTheme(theme);
      // And save it to settings.
      e.data.settings.theme = theme;
      e.data.saveSettings();
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
      $('.ui.dropdown').toggleClass('inverted', theme === 'dark');
      $('.ui.input').toggleClass('inverted', theme === 'dark');

      $('.ui.calendar').toggleClass('inverted', theme === 'dark');
      this.reinitCalendarFields();
    }

    loadSettings() {
      let settings = this.settings;
      // Load the user's settings from localStorage.
      // These settings are specific to the Fish Train Tool.
      try {
        if (localStorage.getItem('fishTrainToolSettings')) {
          settings = JSON.parse(localStorage.fishTrainToolSettings);
        } else {
          // New user, start from default settings.
        }
      } catch (ex) {
        // Ignore this. This may happen if localStorage is disabled or private browsing.
        console.warn("Unable to access localStorage. Settings not restored.");
        // Just in case, use the default settings...
        settings = this.settings;
      }

      // Now, apply the settings to the current page, committing them if all is well.
      return this.applySettings(settings);
    }

    applySettings(settings) {
      if (!(settings.filters)) {
        // Why is `filters` missing?!
        console.warn("Why is filters missing??? Using default then...");
        settings.filters = this.settings.filters;
      }

      if (settings.filters.extra) {
        $('#filterExtra .button[data-filter="' + settings.filters.extra + '"]')
        .addClass('active').siblings().removeClass('active');
      }

      if (settings.filters.patch) {
        // Convert to a Set if it's not already.
        if (!(settings.filters.patch instanceof Set)) {
          settings.filters.patch = new Set(settings.filters.patch);
        }
      } else {
        // For some reason, the patch filter setting is missing?! Just use the default then.
        settings.filters.patch = this.settings.filters.patch;
      }
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
        localStorage.fishTrainToolSettings =
          JSON.stringify(this.settings,
                        (key, value) => value instanceof Set ? [...value] : value);
      } catch (ex) {
        console.warn("Unable to save settings to local storage.");
      }
    }
  }

  return new _FishTrain();
}();