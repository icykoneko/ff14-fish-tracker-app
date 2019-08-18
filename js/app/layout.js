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
    this.fishTable.append($fishEntry);
  }

  remove(fishEntry) {
    // Removes a new fish entry from the layout.
    $(fishEntry).remove();
  }

  update(fishEntry, baseTime, updateUpcomingTime = false) {
    // Update the countdown information for this fish.
    let $fishEntry = $(fishEntry.element);
    let $currentAvail = $('.fish-availability-current', $fishEntry);
    let $upcomingAvail = $('.fish-availability-upcoming', $fishEntry);

    // First, check if the fish's availability changed.
    if (fishEntry.isCatchable != $fishEntry.hasClass('fish-active')) {
      $fishEntry.toggleClass('fish-active');
      updateUpcomingTime = true; // because status changed
      // HACK: Fish whose availability state changes will always have catchableRanges.
      // That's why we don't bother checking it.
      $currentAvail.data('val', fishEntry.availability.current.date);
      $upcomingAvail.data('val', fishEntry.availability.upcoming.date);
    }

    // Set the "current availability" time. Remember, we've cached the other
    // date in the data `val`.
    $currentAvail.text(
      ($fishEntry.hasClass('fish-active') ? 'closes ' : '') + 'in ' +
      dateFns.distanceInWordsStrict(baseTime, $currentAvail.data('val'))
    );

    // Is this fish going to be up soon...
    // TODO: [NEEDS-OPTIMIZATION]
    if (!$fishEntry.hasClass('fish-active') && fishEntry.isUpSoon) {
      $fishEntry.addClass('fish-bin-15');
    } else {
      $fishEntry.removeClass('fish-bin-15');
    }

    // Updating the "upcoming availability" time depends on the view model
    // settings. If set to "From Now", we need to update; otherwise, we can
    // skip this.
    if (updateUpcomingTime) {
      $upcomingAvail.text(
        'in ' + dateFns.distanceInWordsStrict(baseTime, $upcomingAvail.data('val'))
      );
    }
  }

  sort(cmpFunc, baseTime) {
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
      this.fishTable.append($entries[i]);
    }
  }
}
