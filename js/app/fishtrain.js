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

  var templates = {
    fishEntryInterval:
      `<td class="fishtrain-fishentry-interval">
         <span class="interval-indicator"
               style="margin-left: {{=it.indicatorLeft}}%; width: {{=it.indicatorWidth}}%;"></span>
       </td>`,

    fishEntry: `<tr>
  <td class="sticky">
    <div class="ui middle aligned fish-icon sprite-icon sprite-icon-fish_n_tackle-{{=it.data.icon}}"
         style="transform: scale(0.5);"></div>
    <div class="ui middle aligned" style="display: inline-block;">
      <span>{{=it.data.name}}</span>
    </div>
  </td>
  <td class="sticky">
    <i class="location-button map icon"></i> <a href="https://ffxivteamcraft.com/db/en/{{?it.data.location.spearfishing}}spearfishing{{??}}fishing{{?}}-spot/{{=it.data.location.id}}"
       target="cp_gt" class="location-name">{{=it.data.location.name}}</a><br/>
    <span style="font-size: smaller" class="zone-name">{{=it.data.location.zoneName}}</span>
  </td>
  {{~ it.intervals :p}}
    {{#def.fishEntryInterval:p}}
  {{~}}
</tr>`,

    intervalHeadings:
     `{{~ it :k}}
        <th class="interval">{{=k}}</th>
      {{~}}`,
  };

  class FishEntry {
    constructor(fish) {
      this.active = true;
      this.intervals = [];
      this.data = fish;
    }
  }


  class _FishTrain {
    constructor() {
      // Compile the templates.
      this.templates = {
        fishEntry: doT.template(templates.fishEntry, undefined, templates),
        intervalHeadings: doT.template(templates.intervalHeadings)
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
        theme: 'dark',
        timelineInterval: 15,
      };

      this.timeline = {
        start: null,
        end: null,
        fish: [],
      };

      // Load the settings for this tool.
      this.loadSettings();

      // Fish entries for the timeline.
      // In order to calculate rarity, we need to check everything (otherwise
      // you could always guestimate.)
      this.fishEntries = {};
      // Link it to the fishWatcher.
      fishWatcher.fishEntries = this.fishEntries;

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
    }

    reinitCalendarFields(opts={}) {
      var startDate = $('#rangestart').calendar('get date');
      var endDate = $('#rangeend').calendar('get date');
      $('#rangestart').calendar({
        endCalendar: '#rangeend',
        initialDate: startDate
      });
      $('#rangeend').calendar({
        startCalendar: '#rangestart',
        initialDate: endDate
      });
    }

    updateList(e) {
      e.stopPropagation();
      // Reset the main context.
      var _this = e.data;

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

      // Update the table headers.
      _this.fishTrainTableHeader$.append(
        _this.templates.intervalHeadings(_(intervals).map(x => dateFns.format(x, 'p'))));

      // Now it's time to compute the availability for our fishies...
      // This might take a while...
      _(Fishes).chain()
        .reject(fish => _this.isFishFiltered.call(_this, fish))
        .each(fish => _this.activateEntry.call(_this, fish, +_this.timeline.start));

      // Remove any left-over entries.
      for (let k in this.fishEntries) {
        var entry = this.fishEntries[k];
        if (!entry.active) {
          this.removeEntry(entry, k);
        }
      }

      // Finally, let FishWatcher know it needs to reinit everything.
      fishWatcher.updateFishes({earthTime: +_this.timeline.start});

      return;
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
      // TODO: Remove entry from DOM.
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