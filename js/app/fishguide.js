let FishGuide = function(){

  // Templates
  // NOTE: These templates are simply for generating the initial HTML.
  // Do not continuously generate more nodes.  The scripts will reuse
  // the nodes as the user selects a different entry.
  var templates = {
    // Page Selector Widget
    pageSelector: `<div class="page-selector">
  <div class="ui tiny pagination link menu" id="fishGuidePageSelector">
    <div class="icon item"><i class="left chevron icon"></i></div>
    <div class="page-number item"></div>
    <div class="page-number item"></div>
    <div class="page-number item"></div>
    <div class="page-number item"></div>
    <div class="page-number item"></div>
    <div class="page-number item"></div>
    <div class="page-number item"></div>
    <div class="icon item"><i class="right chevron icon"></i></div>
  </div>
</div>`,

    // Fish grid entry
    fishGridEntry: `<div class="fish-entry">
  <div class="fish-icon sprite-icon"></div>
  <div class="ui left corner mini label"><i class="checkmark icon"></i></div>
</div>`,

    // Fish Grid.
    fishGrid: `<div class="fish-grid" id="fishGuideGrid">
  {{~ _.range(100) :k}}
    {{#def.fishGridEntry}}
  {{~}}
</div>`,

    // Fish Information
    fishInfo: `<div class="fish-info">
  <div class="fish-name heading">Fish Name</div>
  <div class="fish-level heading">Lv. 1</div>
  <div class="fish-waters heading">Waters</div>
  <div class="fish-desc">Description<br/>BLAH<br/>BLAH<br/>BLAH<br/>BLAH<br/>BLAH<br/>BLAH</div>
  <div class="fish-locations">
    <div class="heading">Prime Locations</div>
    <div class="text">Region<br/>Place</div>
  </div>
  <div class="fish-extra">
    <div class="heading">Additional Information</div>
    <div class="text">Collectable?</div>
  </div>
  <div class="fish-meta">
    <!-- TODO: Include things like, when is it up next, bait, etc. -->
  </div>
</div>`
  };

  var fishGuideTmpl = `<div class="fish-guide">
  {{#def.pageSelector}}
  <div class="fish-grid-out">
    {{#def.fishGrid}}
  </div>
  {{#def.fishInfo}}
</div>`;

  class _FishGuide {
    constructor() {
      // Compile the templates.
      this.fishGuideFn = doT.template(fishGuideTmpl, undefined, templates);

      // Initialize fields.
      this.MAX_PAGE = Math.ceil(_(FISH_INFO).keys().length / 100.0);
      this.pageNumbers = _.range(1, this.MAX_PAGE + 1);
      this.currentPage = 1;
      this.pageRange = 1;

      // Keep track of certain DOM objects.
      this.fishGuideContainer$ = null;
      this.pageSelector$ = null;
      this.fishGrid$ = null;
      this.fishGridEntries$ = null;
      this.fishInfo$ = null;
    }

    render(elem) {
      // Use the template to build the base HTML first.
      elem.innerHTML = this.fishGuideFn();

      // Now we can save the selector.
      this.fishGuideContainer$ = $(elem);
      this.pageSelector$ = $('.fish-guide .page-selector', elem);
      this.fishGrid$ = $('.fish-guide .fish-grid', elem);
      this.fishGridEntries$ = $('.fish-entry', this.fishGrid$);
      this.fishInfo$ = $('.fish-guide .fish-info', elem);

      let self = this;

      // Now, initialize all of the events.
      let items = $('.item', this.pageSelector$);
      items.on('click', function (e) {
        e.stopPropagation();
        let $this = $(this);

        // First off, is the button enabled?
        if ($this.hasClass('disabled')) {
          return;
        }

        // What page should we navigate to?
        let newPage = $this.data('num');

        // Display the new page now.
        self.displayFishGuidePage(newPage);
      });

      $('.label .icon', this.fishGridEntries$).on({
        mouseenter: function() {
          $(this).parents('.fish-entry .label').addClass('hovering');
        },
        mouseleave: function() {
          $(this).parents('.fish-entry .label').removeClass('hovering');
        },
        click: function() {
          // Okay, this gets tricky because if the fish isn't displayed, it's
          // more complicated. Either way, we need to update the ViewModel's
          // settings at a minimum...
          // TODO: The completion list really needs to be a set...
          self.toggleFishCaughtState($(this).parents('.fish-entry'));
        }
      });

      // Assign events to the fish entry slots as well.
      this.fishGridEntries$.on('click', function (e) {
        e.stopPropagation();
        let $this = $(this);

        if ($this.hasClass('disabled')) {
          // Deselect the current fish.
          self.fishGridEntries$.removeClass('selected');
          self.fishInfo$.addClass('hidden');
          return;
        }

        // Deselect the others.
        $this.addClass('selected').siblings().removeClass('selected');

        // Get the fishInfo object from the DOM data.
        let fishInfo = $this.data('fishInfo');
        // Display the information.
        self.displayFishInfo(fishInfo);
      });

      // If the user clicks anywhere else on the grid, deselect the current entry.
      this.fishGrid$.on('click', function(e) {
        e.stopPropagation();

        // Deselect the current fish.
        self.fishGridEntries$.removeClass('selected');
        self.fishInfo$.addClass('hidden');
      });

      // Finally, initialize the menu selector by "displaying" the first page.
      // NOTE: This won't really display anything since initially, the guide
      // should be invisible. It's just easier to get the display built in
      // advance.
      this.displayFishGuidePage(1);
    }

    // Populate the fish guide grid and menu selector.
    displayFishGuidePage(page) {
      // [<<] [1] [...] [n-1] [n] [n+1] [...] [M] [>>]
      //          ^^^^^ ^^^^^     ^^^^^ ^^^^^
      //           n>2   n>1      M-n>1 M-n>2
      // Omit [n] if n is 1 or M.
      // [<<] disabled if n == 1
      // [>>] disabled if n == M

      // Update the `currentPage` first.  This is needed for the remaining
      // calculations.
      this.currentPage = page;

      let items = $('.item', this.pageSelector$);

      let rangeStart = this.currentPage - this.pageRange;
      let rangeEnd = this.currentPage + this.pageRange;

      if (rangeEnd > this.MAX_PAGE) {
        rangeEnd = this.MAX_PAGE;
        rangeStart = this.MAX_PAGE - this.pageRange * 2;
        rangeStart = rangeStart < 1 ? 1 : rangeStart;
      }

      if (rangeStart <= 1) {
        rangeStart = 1;
        rangeEnd = Math.min(this.pageRange * 2 + 1, this.MAX_PAGE);
      }

      // At a minimum, increase range to 5 when possible.
      rangeEnd = Math.max(5, rangeEnd);
      rangeStart = Math.min(this.MAX_PAGE - 4, rangeStart);

      var i = 0;

      let item = items.first();
      item.toggleClass('disabled', page == 1)
          .data('num', page - 1);
      item = item.next()
                 .toggleClass('active', page == 1)
                 .text(1).data('num', 1);

      if (rangeStart <= 3) {
        for (i = 2; i < rangeStart; i++) {
          item = item.next()
                     .toggleClass('active', i == this.currentPage)
                     .removeClass('hidden disabled')
                     .text(i).data('num', i);
        }
      } else {
        item = item.next()
                   .removeClass('hidden active')
                   .addClass('disabled')
                   .text('...').removeData('num');
      }
      for (i = rangeStart; i <= rangeEnd; i++) {
        if (i == 1 || i == this.MAX_PAGE) {
          continue;
        }
        item = item.next()
                   .toggleClass('active', i == this.currentPage)
                   .removeClass('disabled hidden')
                   .text(i).data('num', i);
      }
      if (rangeEnd >= this.MAX_PAGE - 2) {
        for (i = rangeEnd + 1; i <= this.MAX_PAGE - 1; i++) {
          item = item.next()
                     .toggleClass('active', i == this.currentPage)
                     .removeClass('hidden disabled')
                     .text(i).data('num', i);
        }
      } else {
        item = item.next()
                   .removeClass('hidden active')
                   .addClass('disabled')
                   .text('...').removeData('num');
      }

      item = item.next()
                 .removeClass('disabled hidden')
                 .toggleClass('active', page == this.MAX_PAGE)
                 .text(this.MAX_PAGE).data('num', this.MAX_PAGE);

      // Hide all remaining elements
      item = item.nextAll().addClass('hidden').removeData('num').last();
      // The last element is the ">>".
      item.removeClass('hidden')
          .toggleClass('disabled', page == this.MAX_PAGE)
          .data('num', page + 1);

      // Deselect the current fish, and fixup other properties.
      this.fishGridEntries$.removeClass('selected')
                           .addClass('disabled')
                           .removeClass('caught');
      this.fishInfo$.addClass('hidden');
      // This resets the icons since they are controlled by unique style classes.
      $('.fish-icon', this.fishGridEntries$).attr('class', 'fish-icon sprite-icon');

      // Finally, update the page contents.
      // We take advantage of DOM data in order to avoid extra lookups.
      let fishInfosForPage = FISH_INFO.slice(100 * (page - 1), (100 * (page - 1)) + 100);
      for (i = 0; i < fishInfosForPage.length; i++) {
        $(this.fishGridEntries$[i]).data('fishInfo', fishInfosForPage[i])
                                   .removeClass('disabled')
                                   .toggleClass('caught', ViewModel.isFishCaught(fishInfosForPage[i].id))
                                   .children('.fish-icon').addClass('sprite-icon-fish_n_tackle-' + fishInfosForPage[i].icon);
      }
    }

    displayFishInfo(fishInfo) {
      // NOTE: This function should be called again if the language is changed.
      // That, or just reset the guide back to page 1...

      this.fishInfo$.find('.fish-name').text(__p(fishInfo, 'name'));
      this.fishInfo$.find('.fish-level').text("Lv. " + fishInfo.level[0] + " " + "★".repeat(fishInfo.level[1]));
      this.fishInfo$.find('.fish-waters').text(__p(fishInfo, 'record'));
      this.fishInfo$.find('.fish-desc').html(__p(fishInfo, 'desc').replace(/\n/g, '<br/>'));
      this.fishInfo$.find('.fish-locations .text').html(__p(fishInfo, 'region') + '<br/>' + __p(fishInfo, 'zone'));

      let addtInfo$ = this.fishInfo$.find('.fish-extra .text');
      let extraText = "";
      if (fishInfo.collectable) {
        extraText += "Collectable<br/>"
      }
      addtInfo$.html(extraText);

      this.fishInfo$.removeClass('hidden');
    }

    toggleFishCaughtState(fishEntry$) {
      let fishInfo = fishEntry$.data('fishInfo');
      // Assuming everything has stayed up-to-date, we can trust the 'caught'
      // class' presence to determine if the fish is caught or not.
      var isCaught = null;
      if (!fishEntry$.hasClass('caught')) {
        // The fish has been marked as caught now.
        isCaught = true;
      } else {
        // The fish was previously marked as caught, but no longer is.  Oops?
        isCaught = false;
      }

      // Check if the ViewModel has an entry for this fish. We have to manually
      // update it otherwise (for now at least...)
      // We always start by updating the settings object.
      if (isCaught) {
        ViewModel.settings.completed.add(fishInfo.id);
      } else {
        ViewModel.settings.completed.delete(fishInfo.id);
      }
      ViewModel.saveSettings();

      let fishEntry = ViewModel.fishEntries[fishInfo.id];
      if (fishEntry !== undefined) {
        // Since the fish is currently visible, we need to do a little more work.
        fishEntry.isCaught = !fishEntry.isCaught;
        ViewModel.layout.updateCaughtState(fishEntry);
      }
      ViewModel.updateDisplay();

      // Toggle the visible check mark.
      fishEntry$.toggleClass('caught');
    }

    preShowHandler() {
      // Before the guide is displayed, we must refresh the current page's
      // entries, in particular, the caught state for the fish entries.
      this.fishGridEntries$.filter(':not(.disabled)').each(function(idx, elem) {
        let fishInfo = $(elem).data('fishInfo');
        $(elem).toggleClass('caught', ViewModel.isFishCaught(fishInfo.id));
      });
    }
  };

  return new _FishGuide();
}();
