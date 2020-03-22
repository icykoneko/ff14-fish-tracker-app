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
  {{~ _.range(25) :k}}
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
    <!-- TODO: Include things like, when is it up next, bait, etc.
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
    }

    render(elem) {
      elem.innerHTML = this.fishGuideFn();
    }
  };

  return new _FishGuide();
}();
