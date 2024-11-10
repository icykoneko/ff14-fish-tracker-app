let BaitTally = function(){

    // Template
    // For each map entry - value baitFishObj, key baitId
    //    For each baitFishObj.fish - value fish, key fishId
    const tableTextTemplate =
        `<table class='ui selectable striped very basic very compact unstackable table inverted'>
          <tr>
            <th colspan=2>Bait</th>
            <th>Count</th>
            <th>Fishes</th>
          </tr>

          {{~ it :baitFishObj:baitId}}
          <tr>
            {{=baitId}}
            <td>
              <div style="vertical-align: middle;" class="fish-icon sprite-icon sprite-icon-fish_n_tackle-{{=baitFishObj.bait.icon}}"></div>
            </td>
            <td>
              <p><a class="fish-name" target="_blank" href="https://garlandtools.org/db/#item/{{=baitId}}">
                {{=baitFishObj.bait.name}}
              </a></p>
            </td>
            <td>
              {{=baitFishObj.fishes.size}}}
            </td>
            <td>
              {{~ baitFishObj.fish :fish:fishId}}
              <a class="fish-name" target="_blank" href="https://ffxivteamcraft.com/db/en/item/{{=fishId}}">
              <div style="vertical-align: middle; width: 44px; height: 44px;" class="fish-icon sprite-icon sprite-icon-fish_n_tackle-{{=fish.data.icon}}"
              title="{{=fish.data.name}}">
              </div>
              </a>
              {{~}}
            </td>
          </tr>
          {{~}}
    </table>`;
  
    class _BaitTallyTable {
      constructor() {
        
      }
  
      preShowHandler() {
        console.log("preshowhandler for bait tally========");
        // Before the guide is displayed, we must refresh the current page's
        // entries, in particular, the caught state for the fish entries.
        // this.fishGridEntries$.filter(':not(.disabled)').each(function(idx, elem) {
        //   let fishInfo = $(elem).data('fishInfo');
        //   $(elem).toggleClass('caught', ViewModel.isFishCaught(fishInfo.id));
        // });
      }


      render(elem, fishEntrySet) {
        //Helper method for tallying
        function mapFish(fish, map) {
          if (fish.bait.length > 0) {
            let bait = fish.bait[0];
            
            if (!map.has(bait.id)) {
              map.set(bait.id, {bait: bait, fishes: new Map()});
            }
            let fishMap = map.get(bait.id).fishes;
            if (!fishMap.has(fish.id)) {
              fishMap.set(fish.id, fish);
            }
          }
        }

        const baitMap = new Map();
        fishEntrySet.each((entry) => {
          mapFish(entry, baitMap);
          entry.intuitionEntries.forEach((intuitionFish) => mapFish(intuitionFish, baitMap));
        });
        this.fishGuideFn = doT.template(tableTextTemplate);
        console.log("baitmap:");
        var someArr = [{a:1,b:2},{a:3,b:4}]
        // console.log(baitMap.entries());
        elem.innerHTML = this.fishGuideFn(someArr); 
//        elem.innerHTML = this.fishGuideFn(baitMap.entries()); //

        //And finally, put together the data and template
        console.log("bait tally elem's inner html?");
        console.log(elem.innerHTML)
  
        // // Now we can save the selector.
        // this.fishGuideContainer$ = $(elem);
        // this.pageSelector$ = $('.fish-guide .page-selector', elem);
        // this.fishGrid$ = $('.fish-guide .fish-grid', elem);
        // this.fishGridEntries$ = $('.fish-entry', this.fishGrid$);
        // this.fishInfo$ = $('.fish-guide .fish-info', elem);
      }

      
    };
  
    return new _BaitTallyTable();
  }();
  