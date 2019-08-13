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

  sort(cmpFunc) {
    // Get the displayed fish entries.
    var $entries = $('.fish-entry not(.fish-intuition-row)', this.fishTable);
    // Sort the entries.
    $entries.sort(cmpFunc);
    // That just sorted the array, it didn't affect the table itself.
    // For that, we're literally going to append each entry back into the
    // table in order.  This works because a DOM element may only have one
    // parent at any time.
    // Another key thing to note, we haven't made any modifications to the
    // actual element itself.
    for (var i = 0; i < $entries.length; i++) {
      this.fishTable.appendChild($entries[i]);
    }
  }
}
