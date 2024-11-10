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
          {{~ it :baitFishObj}}
          <tr>
            <td>
              <div style="vertical-align: middle;" class="fish-icon sprite-icon sprite-icon-fish_n_tackle-{{=baitFishObj.bait.icon}}"></div>
            </td>
            <td>
              <p><a class="fish-name" target="_blank" href="https://garlandtools.org/db/#item/{{=baitFishObj.bait.id}}">
                {{=baitFishObj.bait.name}}
              </a></p>
            </td>
            <td>
              {{=baitFishObj.fishArr.length}}
            </td>
            <td>
              {{~ baitFishObj.fishArr :fish}}
              <a class="fish-name" target="_blank" href="https://ffxivteamcraft.com/db/en/item/{{=fish.id}}">
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
      render(elem, fishEntrySet) {
        //Helper method for tallying
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
        const baitArray = [];       //for actual use in the template
        fishEntrySet.each((entry) => {
          mapFish(entry, baitMap, baitArray);
          entry.intuitionEntries.forEach((intuitionFish) => mapFish(intuitionFish, baitMap));
        });
        this.fishGuideFn = doT.template(tableTextTemplate);
        // console.log("fes:");
        // console.log(fishEntrySet);
        // var someArr = [{bait:1,fishes:2},{bait:3,fishes:4}]
        // console.log(Array.from(baitMap.entries()));
        // console.log(baitMap.entries());
        elem.innerHTML = this.fishGuideFn(baitArray); 
      //  elem.innerHTML = this.fishGuideFn(baitMap); //

        //And finally, put together the data and template
        // console.log("bait tally elem's inner html?");
        // console.log(elem.innerHTML)
  
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
  