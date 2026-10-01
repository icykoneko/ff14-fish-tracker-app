let BaitTally = function(){

    // Template
    const tableTextTemplate =
        `<table class='ui selectable striped very basic very compact unstackable table inverted'>
          <thead>
            <tr>
              <th colspan=2>Bait</th>
              <th>Count</th>
              <th>Fishes</th>
            </tr>
          </thead>
          {{~ it :baitFishObj}}
          <tr>
            <td>
              <div style="vertical-align: middle;" class="fish-icon sprite-icon sprite-icon-fish_n_tackle-{{=baitFishObj.bait.icon}}"></div>
            </td>
            <td class="bait-tally-table-entry-name">
              <p><a class="fish-name" target="_blank" href="https://garlandtools.org/db/#item/{{=baitFishObj.bait.id}}">
                {{=baitFishObj.bait.name}}
              </a></p>
            </td>
            <td>
              {{=baitFishObj.fishArr.length}}
            </td>
            <td>
              {{~ baitFishObj.fishArr :fish}}
              {{? (typeof ViewModel !== 'undefined') && ((fish.id & 0x80000000) == 0) && !fish.intuitionFor }}
              <div style="padding-left: 1px; padding-right: 2px; border-top-right-radius: 0; border-bottom-right-radius: 0; margin-right: -8px; height: 40px; vertical-align: middle;" class="ui middle aligned mini very compact icon button fishPinned" data-id="{{=fish.id}}">
                <i class="pin icon"></i>
              </div>
              {{?}}
              <a class="fish-name" target="_blank" href="https://ffxivteamcraft.com/db/en/item/{{=fish.id}}">
                <div class="ui middle aligned fish-icon sprite-icon sprite-icon-fish_n_tackle-{{=fish.data.icon}}"
              title="{{=fish.data.name}}"></div>
              </a>
              {{~}}
            </td>
          </tr>
          {{~}}
    </table>`;
  
    class _BaitTallyTable {
      render(elem, fishEntrySet) {
        //Helper method for tallying.
        //Whenever a bait or fish is added to a map, it is also copied to an array. The arrays are then used
        //as data for the above doT template.
        function mapFish(fish, map, arr) {
          if (fish.bait.length > 0) {
            let bait = fish.bait[0];
            if (!map.has(bait.id)) {
              var baitFishObj = {bait: bait, fishMap: new Map(), fishArr: []};
              map.set(bait.id, baitFishObj);
              arr.push(baitFishObj);
            }
            let _fishMap = map.get(bait.id).fishMap;
            if (!_fishMap.has(fish.id)) {
              _fishMap.set(fish.id, fish);
              map.get(bait.id).fishArr.push(fish);
            }
          }
        }

        const baitMap = new Map();  //for keeping track
        var baitArray = [];         //for actual use in the template
        fishEntrySet.each((entry) => {
          mapFish(entry, baitMap, baitArray);
          entry.intuitionEntries.forEach((intuitionFish) => mapFish(intuitionFish, baitMap, baitArray));
        });
        var sortedBaitArray = _.sortBy(baitArray.reverse(), (obj) => obj.fishArr.length).reverse();
        this.fishGuideFn = doT.template(tableTextTemplate);
        elem.innerHTML = this.fishGuideFn(sortedBaitArray);
        if (typeof ViewModel !== 'undefined') {
          // Connect pin/unpin to ViewModel.
          $('.fishPinned.button', elem).each(function() {
            let $this = $(this);
            const fishId = $this.data('id');
            let entry = ViewModel.fishEntries[fishId];
            if (entry.isPinned) {
              $this.addClass('red');
            }
          });
          $(elem).on('click', '.fishPinned.button', function() {
            let $this = $(this);
            const fishId = $this.data('id');
            let entry = ViewModel.fishEntries[fishId];
            if (entry === undefined) {
              // [!] DANGER: This can happen if the user unpinned the fish earlier,
              // thus removing it from the view model's filters!
              // To resolve this, we have to change the ordering just a little...
              ViewModel.settings.pinned.add(fishId);
              $this.addClass('red');
              ViewModel.saveSettings();
              // Updating the display /should/ bring the fish entry back.
              ViewModel.updateDisplay();
              // The model should be correct as well.
            }
            else
            {
              if (entry.isPinned) {
                ViewModel.settings.pinned.delete(entry.id);
                $this.removeClass('red');
              } else {
                ViewModel.settings.pinned.add(entry.id);
                $this.addClass('red');
              }
              entry.isPinned = !entry.isPinned;
              ViewModel.saveSettings();

              // TODO: Determine if this fish should still be displayed efficiently.
              ViewModel.layout.updatePinnedState(entry);
              ViewModel.updateDisplay();
            }
          });
          
        }
      }
    };
  
    return new _BaitTallyTable();
  }();
  