class FishTableLayout {
  constructor() {
    // Initialize the doT templates.
    this.templates = {
      fishTable: doT.template($('#fish-table-template').text()),
      fishEntry: doT.template($('#fish-template').text()),
      intuitionFishEntry: doT.template($('#fish-intuition-template').text()),
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

  update(fishEntry, baseTime) {
    let updateUpcomingTime = ViewModel.settings.upcomingWindowFormat == 'fromNow';
    // Update the countdown information for this fish.
    let $fishEntry = $(fishEntry.element);
    let $currentAvail = $('.fish-availability-current', $fishEntry);
    let $upcomingAvail = $('.fish-availability-upcoming', $fishEntry);

    let hasFishAvailabilityChanged = false;

    // First, check if the fish's availability changed.
    if (fishEntry.isCatchable != $fishEntry.hasClass('fish-active')) {
      $fishEntry.toggleClass('fish-active');
      console.info(`${fishEntry.id} "${fishEntry.data.name}" has changed availability.`);
      updateUpcomingTime = true; // because status changed
      hasFishAvailabilityChanged = true;
      // HACK: Fish whose availability state changes will always have catchableRanges.
      // That's why we don't bother checking it.
      $currentAvail
        .attr('data-val', fishEntry.availability.current.date)
        .attr('data-tooltip', moment(fishEntry.availability.current.date).calendar());
      $upcomingAvail
        .attr('data-val', fishEntry.availability.upcoming.date)
        .attr('data-prevclose', fishEntry.availability.upcoming.prevdate)
        .attr('data-tooltip', moment(fishEntry.availability.upcoming.date).calendar());
      
      // If this fish has upcoming windows data, update it now.
      if (fishEntry.upcomingWindowsPopupElement !== null) {
        $('.upcoming-windows-button', $fishEntry).popup('hide');
        $(fishEntry.upcomingWindowsPopupElement).children().first().replaceWith(
          this.templates.upcomingWindows(fishEntry));
      }
    }

    // Set the "current availability" time. Remember, we've cached the other
    // date in the data `val`.
    $currentAvail.text(
      ($fishEntry.hasClass('fish-active') ? 'closes ' : '') + 'in ' +
      dateFns.distanceInWordsStrict(baseTime, fishEntry.availability.current.date)
    );

    // Is this fish going to be up soon...
    // TODO: [NEEDS-OPTIMIZATION]
    if (!$fishEntry.hasClass('fish-intuition-row') &&
        !$fishEntry.hasClass('fish-active') &&
        (fishEntry.isUpSoon != $fishEntry.hasClass('fish-bin-15')))
    {
      $fishEntry.toggleClass('fish-bin-15');
      if (fishEntry.isUpSoon) {
        console.info(`${fishEntry.id} "${fishEntry.data.name}" will be up soon.`);
        hasFishAvailabilityChanged = true;
      }
    }

    // Updating the "upcoming availability" time depends on the view model
    // settings. If set to "From Now", we need to update; otherwise, we can
    // skip this.
    if (updateUpcomingTime) {
      $upcomingAvail.text(
        'in ' + dateFns.distanceInWordsStrict(baseTime, fishEntry.availability.upcoming.date)
      );
    }

    // Update any intuition fish rows as well!
    for (let subEntry of fishEntry.intuitionEntries) {
      this.update(subEntry, baseTime);
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
    let careAboutUpSoon = ViewModel.settings.sortingType == 'overallRarity';

    if (!careAboutUpSoon) {
      lastFishUpSoon = null;
    }

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
      if (lastFishPinned !== null) {
        if (entry.isPinned) {
          lastFishPinned = true;
        } else if (lastFishPinned === true) {
          // But this fish is not pinned, so that's the last pinned fish.
          $entryElem.addClass('entry-after-last-pinned-entry');
          // Stop tracking this.
          lastFishPinned = null;
        }
      }
      else if (lastFishActive !== null) {
        if (entry.isCatchable) {
          lastFishActive = true;
        } else if (lastFishActive === true) {
          $entryElem.addClass('entry-after-last-active-entry');
          // Stop tracking this.
          lastFishActive = null;
        }
      }
      else if (lastFishUpSoon !== null) {
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
