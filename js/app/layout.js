class FishTableLayout {
  __sub_templates = {
    fishTimeRestriction: {arg: 'it', text:
    `<span class="catchtime-hour">{{=Math.floor(it.startHour)}}</span>{{?it.startHour % 1 !== 0}}<span class="catchtime-minute">{{=String(Math.round((it.startHour % 1) * 60)).padStart(2, '0')}}</span>{{?}}
     -
     <span class="catchtime-hour">{{=Math.floor(it.endHour)}}</span>{{?it.endHour % 1 !== 0}}<span class="catchtime-minute">{{=String(Math.round((it.endHour % 1) * 60)).padStart(2, '0')}}</span>{{?}}`
    },
    baitEntry: {arg: 'it', text:
     `<span class="bait-span">
        {{?it.item.linked}}
          <a href="https://garlandtools.org/db/#item/{{=it.item.id}}" target="cp_gt">
        {{?}}
        <div class="ui middle aligned bait-icon sprite-icon sprite-icon-fish_n_tackle-{{=it.item.icon}}"
             title="{{=it.item.name}}" data-baitIdx="{{=it.idx}}"></div>
        {{?it.item.linked}}
          </a>
        {{?}}
        {{?it.nextBait !== undefined}}
          <div class="bait-badge-container">
            {{?it.nextBait.hookset}}
              <div class="ui middle aligned bait-icon hookset-modifier-icon sprite-icon sprite-icon-action-{{=it.nextBait.hookset.toLowerCase()}}_hookset"
                    title="{{=it.nextBait.hookset}} Hookset"></div>
            {{?}}
            {{?it.nextBait.tug}}
              <div class="tug-indicator {{=it.nextBait.tug}}-tug-indicator" title="{{=it.nextBait.tug}} tug">
                {{={'light': '!', 'medium': '!!', 'heavy': '!!!'}[it.nextBait.tug]}}
              </div>
            {{?}}
          </div>
        {{?}}
      </span>`
    },
    baitEntries: {arg: 'it', text:
     `<span class="bait-entries">{{~it.bait :item:idx}}
        {{?idx != 0}}<i class="arrow right icon"></i>{{?}}
        {{ var linked = idx == 0; }}
        {{ var nextBait = (idx + 1) < it.bait.length ? it.bait[idx + 1] : it.data; }}
        {{#def.baitEntry:{item:item,idx:idx,linked:linked,nextBait:nextBait} }}
        {{?idx == 0 && item.alternatives !== null}}
          <span class="alternative-bait-entries">{{~item.alternatives :altItem:altIdx}}
            <span style="font-size: 22px; vertical-align: middle; margin-left: 6px; margin-right: 2px;">⁄</span>
            {{#def.baitEntry:{item:altItem,idx:idx,linked:linked,nextBait:nextBait} }}
          {{~}}</span>
        {{?}}
      {{~}}</span>`
    },
  }

  constructor() {
    // Fix bug in doT.js template regex.
    doT.templateSettings.use = /\{\{#([\s\S\}]+?)\}\}/g;
    // Initialize the doT templates.
    this.templates = {
      fishTable: doT.template($('#fish-table-template').text()),
      fishEntry: doT.template($('#fish-template').text(), undefined, this.__sub_templates),
      intuitionFishEntry: doT.template($('#fish-intuition-template').text(), undefined, this.__sub_templates),
      upcomingWindows: doT.template($('#upcoming-windows-template').text()),
      sectionDivider: doT.template($('#table-section-divider-template').text())
    };
  }

  initializeLayout($fishTable) {
    // Store the <tbody> element, not the table itself.
    // TODO: We really should convert the templates to use <tbody> for each
    // entry, that way we can group intuition fish and mooch fish with their
    // parent.
    this.fishTable = $('tbody', $fishTable);
  }

  append(fishEntry) {
    // Appends a new fish entry to the layout.
    this.fishTable[0].appendChild(fishEntry.element);
    // Include any intuition elements as well.
    for (let subEntry of fishEntry.intuitionEntries) {
      this.fishTable[0].appendChild(subEntry.element);
    }
  }

  remove(fishEntry) {
    // Removes a new fish entry from the layout.
    fishEntry.element.remove();
    // Also remove any intuition elements.
    for (let subEntry of fishEntry.intuitionEntries) {
      subEntry.element.remove();
    }
  }

  updateCaughtState(fishEntry) {
    let $fishEntry = $(fishEntry.element);

    $fishEntry.toggleClass('fish-caught', fishEntry.isCaught);
    $('.fishCaught.button', $fishEntry).toggleClass('green', fishEntry.isCaught);
  }

  updatePinnedState(fishEntry) {
    // TODO: [OPTIMIZATION-POINT]
    // - Consider handling the moving of the element to the top of the list,
    //   and even resorting /only the pinned fish/.
    let $fishEntry = $(fishEntry.element);

    $fishEntry.toggleClass('fish-pinned', fishEntry.isPinned);
    $('.fishPinned.button', $fishEntry).toggleClass('red', fishEntry.isPinned);
  }

  updateLanguage(fishEntry) {
    // The Fish object actually stores language-specific values in certain
    // fields... To make our life easier, and to prevent any unforseen issues,
    // we'll run the applyLocalization function first, then update the DOM
    // elements that coorespond with the affected text.
    // SPOILER: THERE'S A LOT! Maybe it would be better to simply reapply the
    // template... but that has consequences of its own...

    // AFFECTED FIELDS:
    // it.data.name
    // it.data.location.name
    // it.data.location.zoneName
    // it.data.bait.predators[...].name

    fishEntry.data.applyLocalization();

    let $fishEntry = $(fishEntry.element);

    $('.fish-name', $fishEntry).text(fishEntry.data.name);
    $('.fish-name', $fishEntry).attr('href', fishEntry.getExternalLink());
    if (fishEntry.data.folklore !== null) {
      $('.sprite-icon-folklore', $fishEntry).attr(
        'data-tooltip', __p(DATA.FOLKLORE[fishEntry.data.folklore], 'name'));
    }
    $('.location-name', $fishEntry).text(fishEntry.data.location.name);
    $('.zone-name', $fishEntry).text(fishEntry.data.location.zoneName);
    $('.weather-icon', $fishEntry).each((nodeIdx, elem) => {
      let $elem = $(elem);
      let idx = $elem.attr('data-prevWeatherIdx');
      if (idx !== undefined) {
        $elem.attr('title',
          __p(fishEntry.data.conditions.previousWeatherSet[idx], 'name'));
      } else {
        idx = $elem.attr('data-currWeatherIdx');
        if (idx !== undefined) {
          $elem.attr('title',
            __p(fishEntry.data.conditions.weatherSet[idx], 'name'));
        }
      }
    });
    $('.bait-icon', $fishEntry).each((nodeIdx, elem) => {
      let $elem = $(elem);
      let idx = $elem.attr('data-baitIdx');
      if (idx !== undefined) {
        // NOTE: BaitEntry automatically returns the correct language name.
        $elem.attr('title', fishEntry.bait[idx].name);
      }
    });

    // Update the intuition entries as well...
    for (let subEntry of fishEntry.intuitionEntries) {
      this.updateLanguage(subEntry);
    }
  }

  update(fishEntry, baseTime, needsFullUpdate = false) {
    // NOTE: You should NEVER run any of this for fish that are naturally
    // always available. The "full update" is just a hint that the layout
    // needs to update the displayed text for availability; cause... that's
    // how I divided their responsibilities...
    // Sometimes I wonder if I'm holding this code together by fishing line.
    // You know what, best not to think about it!
    if (fishEntry.data.alwaysAvailable) {
      console.warn("Layout::update shouldn't be called for fish such as " +
                   "%s which are always available.", fishEntry.data.name);
      return false;
    }

    // Update the countdown information for this fish.
    let $fishEntry = $(fishEntry.element);
    let $currentAvail = $('.fish-availability-current', $fishEntry);
    let $upcomingAvail = $('.fish-availability-upcoming', $fishEntry);
    let $availability = $('.fish-availability', $fishEntry);

    let hasFishAvailabilityChanged = false;
    let hasLimitedAvailability = fishEntry.data.catchableRanges.length != 0;

    // First, check if the fish's availability changed.
    // YES, you still want to do this because of Fish Eyes.
    if (fishEntry.isCatchable != $fishEntry.hasClass('fish-active')) {
      $fishEntry.toggleClass('fish-active');
      console.debug(`${fishEntry.id} "${fishEntry.data.name}" has changed availability.`);
      hasFishAvailabilityChanged = true;
    }

    // Because of Fish Eyes, some fish might NOT have catchableRanges! That's because
    // Fish Eyes removed the only restriction on the fish, time! As a result,
    // displaying the whole "next available" time is sorta useless.
    if (hasLimitedAvailability && (hasFishAvailabilityChanged || needsFullUpdate)) {
      // WORKAROUND:
      // See the notes in ViewModel's FishEntry; but, if we detected change in
      // availability, there's a 50/50 chance part of the FishEntry data is
      // stale... So, rebake it before going any further...
      // SECOND WORKAROUND:
      // Not only that, but when the EARTH DATE rolls over, regardless of availability
      // changing, we must rebake all relative date display text!!!
      fishEntry.updateNextWindowData();

      $currentAvail
        .attr('data-val', fishEntry.availability.current.date)
        .attr('data-tooltip', dateFns.formatRelative(fishEntry.availability.current.date, baseTime));
      $upcomingAvail
        .attr('data-val', fishEntry.availability.upcoming.date)
        .attr('data-prevclose', fishEntry.availability.upcoming.prevdate)
        .attr('data-tooltip', dateFns.formatRelative(fishEntry.availability.upcoming.date, baseTime))
        .text(fishEntry.availability.upcoming.downtime);
      
      // If this fish is currently being displayed in the upcoming windows, update it now!
      if (ViewModel.upcomingWindowsEntry === fishEntry) {
        // Update it in real-time. Just re-run the template after clearing... it's not a
        // lot of data, so it should hopefully process quickly.
        ViewModel.$upcomingWindows.empty().append(
          this.templates.upcomingWindows(fishEntry));
      }

      // Update the 'uptime'.  Usually, this doesn't really change though.
      $('.fish-availability-uptime', $fishEntry)
        .text((fishEntry.uptime * 100.0).toFixed(1));
    }

    // Omit this if the fish doesn't have limited availability.. obviously...
    if (hasLimitedAvailability) {
      // Set the "current availability" time. Remember, we've cached the other
      // date in the data `val`.
      $currentAvail.text(
        ($fishEntry.hasClass('fish-active') ? 'closes ' : '') + 'in ' +
        dateFns.formatDistanceStrict(fishEntry.availability.current.date,
          baseTime, { roundingMethod: 'floor' })
      );
    }

    // Is this fish going to be up soon...
    // TODO: [NEEDS-OPTIMIZATION]
    if (!$fishEntry.hasClass('fish-intuition-row') &&
        !$fishEntry.hasClass('fish-active') &&
        (fishEntry.isUpSoon != $fishEntry.hasClass('fish-bin-15')))
    {
      $fishEntry.toggleClass('fish-bin-15');
      if (fishEntry.isUpSoon) {
        console.debug(`${fishEntry.id} "${fishEntry.data.name}" will be up soon.`);
        hasFishAvailabilityChanged = true;
      }
    }

    // During Fish Eyes, we want to hide the availability text when it doesn't matter.
    // We have to be deliberate about it.
    // This class will only get assigned to fish which do not have natural alwaysAvailable
    // status, so it's okay to use it here, and create style rules for it.
    $fishEntry.toggleClass('fish-unlimited', !hasLimitedAvailability);

    // Update any intuition fish rows as well!
    for (let subEntry of fishEntry.intuitionEntries) {
      if (!subEntry.data.alwaysAvailable)
        this.update(subEntry, baseTime, needsFullUpdate);
    }

    // Let the caller know this fish changed availability or bins.
    // They need to queue a resort.
    return hasFishAvailabilityChanged;
  }

  sort(cmpFunc, baseTime) {
    console.time('Sorting');

    // Get the displayed fish entries.
    var $entries = $('.fish-entry:not(.fish-intuition-row)', this.fishTable);

    // Sort the entries.
    $entries.sort((a, b) => {
      // TODO: Re-engineer sort function... It wants the `Fish` object itself,
      // not the `FishEntry`.  Seriously, picky...
      // Also, data... data... database, living in the database, woh woh.
      return cmpFunc($(a).data('view').data, $(b).data('view').data, baseTime);
    });
    // That just sorted the array, it didn't affect the table itself.
    // For that, we're literally going to append each entry back into the
    // table in order.  This works because a DOM element may only have one
    // parent at any time.
    // Another key thing to note, we haven't made any modifications to the
    // actual element itself.
    let lastFishPinned = false;
    let lastFishActive = false;
    let lastFishUpSoon = false;

    let keepChecking = false;

    // Remove any old classes.
    $entries
      .removeClass('entry-after-last-pinned-entry')
      .removeClass('entry-after-last-active-entry')
      .removeClass('entry-after-last-upsoon-entry');

    for (var i = 0; i < $entries.length; i++) {
      let entryElem = $entries[i];
      let $entryElem = $(entryElem);
      let entry = $entryElem.data('view');

      // This is super odd, but while we're doing this, we need to mark certain
      // rows to have alternate border style.
      // TODO: This really needs to be managed with CSS, but because the fish
      // aren't <tbody>'s it kinda messes things up...
      keepChecking = true;

      if (lastFishPinned !== null) {
        if (entry.isPinned) {
          lastFishPinned = true;
          keepChecking = false;
        } else if (lastFishPinned === true) {
          // But this fish is not pinned, so that's the last pinned fish.
          $entryElem.addClass('entry-after-last-pinned-entry');
          // Stop tracking this.
          lastFishPinned = null;
        } else if (lastFishPinned === false) {
          // No fish were pinned.
          lastFishPinned = null;
        }
      }
      if (keepChecking && lastFishActive !== null) {
        if (entry.isCatchable) {
          lastFishActive = true;
          keepChecking = false;
        } else if (lastFishActive === true) {
          $entryElem.addClass('entry-after-last-active-entry');
          // Stop tracking this.
          lastFishActive = null;
        } else if (lastFishActive === true) {
          // No fish are active.
          lastFishActive = null;
        }
      }
      if (keepChecking && lastFishUpSoon !== null) {
        if (entry.isUpSoon) {
          lastFishUpSoon = true;
        } else if (lastFishUpSoon === true) {
          $entryElem.addClass('entry-after-last-upsoon-entry');
          // Stop tracking this.
          lastFishUpSoon = null;
        }
      }

      this.append(entry);
    }

    console.timeEnd('Sorting');
  }
}
