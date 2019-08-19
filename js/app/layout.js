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

  append($fishEntry) {
    // Appends a new fish entry to the layout.
    this.fishTable[0].appendChild($fishEntry[0]);
  }

  remove(fishEntry) {
    // Removes a new fish entry from the layout.
    $(fishEntry).remove();
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
        .data('val', fishEntry.availability.current.date)
        .data('tooltip', moment(fishEntry.availability.current.date).calendar());
      $upcomingAvail
        .data('val', fishEntry.availability.upcoming.date)
        .data('prevclose', fishEntry.availability.upcoming.prevdate)
        .data('tooltip', moment(fishEntry.availability.upcoming.date).calendar());
    }

    // Set the "current availability" time. Remember, we've cached the other
    // date in the data `val`.
    $currentAvail.text(
      ($fishEntry.hasClass('fish-active') ? 'closes ' : '') + 'in ' +
      dateFns.distanceInWordsStrict(baseTime, fishEntry.availability.current.date)
    );

    // Is this fish going to be up soon...
    // TODO: [NEEDS-OPTIMIZATION]
    if (!$fishEntry.hasClass('fish-active') &&
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
    for (var i = 0; i < $entries.length; i++) {
      this.fishTable[0].appendChild($entries[i]);
    }

    console.timeEnd('Sorting');
  }
}
