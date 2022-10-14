///////////////////////////////////////////////////////////////////////////////
// FishTrain
// ============================================================================
// Fish Train is a tool for planning out big fishing events. This code covers
// all the back-end view and model and is loosely based on the original
// ViewModel.
//
// Plushy didn't write this app well enough to just make use of the existing
// code, and thus, I exist. I'm sure they're sorry.

let FishTrain = function(){

  // Not sure if I want to keep this feature, so we'll just do this.
  var SCHEDULE_LIST_AND_BAR_MUTUALLY_EXCLUSIVE = false;

  function formatDuration(duration) {
    if (duration.years || duration.months || duration.days) {
      return ""; // shouldn't even be running if its that far off...
    }
    return `${duration.hours}:${String(duration.minutes).padStart(2, '0')}:${String(duration.seconds).padStart(2, '0')}`;
  }

  var sub_templates = {
    fishEntryInterval: {arg: 'it', text:
     `{{? it.lastDT != it.i.dt }}
        <td class="fishtrain-fishentry-interval {{? !it.i.skip}}has-window{{?}}">
      {{?}}
      {{? !it.i.skip }}
        <span class="interval-indicator"
              style="margin-left: {{=it.i.indicatorLeft}}%; width: {{=it.i.indicatorWidth}}%;"
              data-crsidx="{{=it.i.crsIdx}}"
              data-myidx="{{=it.idx}}"></span>
      {{?}}
      {{? it.lastDT != it.i.dt }}
        </td>
      {{?}}`
    },

    fishEntryDetailsInner: {arg: 'it', text:
     `<span><b>Details:</b></span>
      <!-- Additional Details -->
      <div class="ui middle aligned" style="display: inline-block; margin-left: 1em;">
        <div class="ui tiny circular label">{{=it.data.patch}}</div>
        <!-- check if fish can be put into the aquarium -->
        {{?it.data.aquarium !== null}}
          <div class="ui middle aligned sprite-icon sprite-icon-aquarium"
               data-tooltip="Tier {{=it.data.aquarium.size}} {{=it.data.aquarium.water}}" data-position="right center" data-variation="mini"></div>
        {{?}}
        {{?it.data.folklore !== null}}
          <div class="ui middle aligned sprite-icon sprite-icon-folklore"
               data-tooltip="{{=__p(DATA.FOLKLORE[it.data.folklore],'name')}}" data-position="right center" data-variation="mini"></div>
        {{?}}
        {{?it.data.collectable !== null}}
          <div class="ui middle aligned sprite-icon sprite-icon-collectable"
               data-tooltip="Minimum Collectability: {{=it.data.collectable}}" data-position="right center" data-variation="mini"></div>
        {{?}}
        {{?it.data.video !== null}}
          <!-- Include link to video guide -->
          {{~it.getVideoInfo() :videoInfo}}
            <a class="plainlink" href="{{=videoInfo.url}}" target="cp_vguide"><i class="{{=videoInfo.iconClass}} icon"></i></a>
          {{~}}
        {{?}}
      </div>
      <!-- Conditions Details -->
      <div class="ui middle aligned" style="display: inline-block; margin-left: 4em;">
        <!-- Weather -->
        {{?it.data.dataMissing !== false}}
          {{?it.data.dataMissing.weatherRestricted}}
            <i class="cloud icon"></i> Weather Restricted
            {{?it.data.conditions.weatherSet.length > 0}}
              <i class="exclamation triangle icon" title="Unknown/Incomplete"></i>
            {{?}}
          {{?}}
        {{?}}
        {{?it.data.conditions.previousWeatherSet.length > 0}}
          {{~it.data.conditions.previousWeatherSet :weather:windex}}
            <div class="ui middle aligned weather-icon sprite-icon sprite-icon-weather-{{=weather.icon}}"
                 title="{{=__p(weather,'name')}}"
                 data-prevWeatherIdx="{{=windex}}"></div>
          {{~}}
          <i class="arrow right icon"></i>
        {{?}}
        {{~it.data.conditions.weatherSet :weather:windex}}
          <div class="ui middle aligned weather-icon sprite-icon sprite-icon-weather-{{=weather.icon}}"
               title="{{=__p(weather,'name')}}"
               data-currWeatherIdx="{{=windex}}"></div>
        {{~}}
        <span style="{{?it.data.conditions.weatherSet.length > 0}}padding-left: 1em;{{?}}"></span>
        <!-- Time -->
        {{?it.data.dataMissing !== false}}
          {{?it.data.dataMissing.timeRestricted}}
            <i class="clock icon"></i> Time Restricted
            {{? it.data.startHour !== 0 || it.data.endHour !== 24 }}
              <i class="exclamation triangle icon" title="Unknown/Incomplete"></i>
              <span class="catchtime-hour">{{=Math.floor(it.data.startHour)}}</span>{{?it.data.startHour % 1 !== 0}}<span class="catchtime-minute">{{=(it.data.startHour % 1) * 60}}</span>{{?}}
              -
              <span class="catchtime-hour">{{=Math.floor(it.data.endHour)}}</span>{{?it.data.endHour % 1 !== 0}}<span class="catchtime-minute">{{=(it.data.endHour % 1) * 60}}</span>{{?}}
            {{?}}
          {{?}}
        {{??}}
          <i class="alarm-cmd-button wait icon"></i>&nbsp;
          {{? it.data.startHour === 0 && it.data.endHour === 24}}
            All Day
          {{??}}
            <span class="catchtime-hour">{{=Math.floor(it.data.startHour)}}</span>{{?it.data.startHour % 1 !== 0}}<span class="catchtime-minute">{{=(it.data.startHour % 1) * 60}}</span>{{?}}
            -
            <span class="catchtime-hour">{{=Math.floor(it.data.endHour)}}</span>{{?it.data.endHour % 1 !== 0}}<span class="catchtime-minute">{{=(it.data.endHour % 1) * 60}}</span>{{?}}
          {{?}}
        {{?}}
      </div>
      <!-- Requirements and Bait -->
      <div class="ui middle aligned" style="display: inline-block; margin-left: 4em;">
        {{?it.data.dataMissing !== false || it.data.gig === "UNKNOWN"}}
          <i class="question circle outline icon" title="Unknown/Incomplete"></i>
        {{?}}
        <!-- Put Fishers intuition if fish has at least 1 predetor -->
        {{?it.data.bait.hasPredators}}
          <div class="ui middle aligned status-icon sprite-icon sprite-icon-status-intuition{{?it.data.intuitionLength}} has-duration{{?}}" title="Fisher's Intuition">
            {{?it.data.intuitionLength}}
              <span>{{var d = it.data.intuitionLength; if (d) { out += Math.floor(d/60) + 'm' + (d % 60); }}}s</span>
            {{?}}
          </div>
        {{?}}
        {{?it.data.snagging}}
          <div class="ui middle aligned status-icon sprite-icon sprite-icon-status-snagging" title="Snagging"></div>
        {{?}}
        {{?it.data.gig}}
          {{?it.data.gig === "UNKNOWN"}}
            <span>Spearfishing</span>
          {{??}}
            <div class="ui middle aligned bait-icon sprite-icon sprite-icon-action-{{=it.data.gig.toLowerCase()}}_gig" title="{{=it.data.gig}} Gig"></div>
          {{?}}
        {{?}}
        <span class="bait-span">
          {{~it.bait :item:idx}}
            {{?idx == 0}}
              <a href="https://garlandtools.org/db/#item/{{=item.id}}" target="cp_gt">
            {{??}}
              <div class="bait-badge-container">
                {{?item.hookset}}
                  <div class="ui middle aligned bait-icon hookset-modifier-icon sprite-icon sprite-icon-action-{{=item.hookset.toLowerCase()}}_hookset"
                       title="{{=item.hookset}} Hookset"></div>
                {{?}}
                {{?item.tug}}
                  <div class="tug-indicator {{=item.tug}}-tug-indicator" title="{{=item.tug}} tug">
                    {{={'light': '!', 'medium': '!!', 'heavy': '!!!'}[item.tug]}}
                  </div>
                {{?}}
              </div>
              </span><!-- bait-span -->
              <i class="arrow right icon"></i>
              <span class="bait-span">
            {{?}}
            <div class="ui middle aligned bait-icon sprite-icon sprite-icon-fish_n_tackle-{{=item.icon}}" title="{{=item.name}}" data-baitIdx="{{=idx}}"></div>
            {{?idx == 0}}
              </a>
            {{?}}
          {{~}}
          <div class="bait-badge-container">
            {{?it.data.hookset}}
              <div class="ui middle aligned bait-icon hookset-modifier-icon sprite-icon sprite-icon-action-{{=it.data.hookset.toLowerCase()}}_hookset" title="{{=it.data.hookset}} Hookset"></div>
            {{?}}
            {{?it.data.tug}}
              <div class="tug-indicator {{=it.data.tug}}-tug-indicator" title="{{=it.data.tug}} tug">
                {{={'light': '!', 'medium': '!!', 'heavy': '!!!'}[it.data.tug]}}
              </div>
            {{?}}
          </div>
        </span><!-- bait span -->
      </div>
      `
    },
  };

  var templates = {
    fishEntry: `<tr class="fishtrain-fishentry" data-id={{=it.id}}>
  <td class="sticky col-fish">
    <div class="ui middle aligned small fish-icon sprite-icon sprite-icon-fish_n_tackle-{{=it.data.icon}}"></div>
    <div class="ui middle aligned" style="display: inline-block;">
      <span class="fish-name">{{=it.data.name}}</span>
    </div>
    <div class="ui middle aligned" style="display: inline-block; font-size: smaller; float: right;">
      (<b>Uptime:</b>&nbsp;<span class="fish-availability-uptime">{{=(it.uptime * 100.0).toFixed(1)}}</span>%)
    </div>
  </td>
  <td class="sticky col-location">
    <i class="location-button map icon"></i> <a href="https://ffxivteamcraft.com/db/en/{{?it.data.location.spearfishing}}spearfishing{{??}}fishing{{?}}-spot/{{=it.data.location.id}}"
       target="cp_gt" class="location-name">{{=it.data.location.name}}</a><br/>
    <span style="font-size: smaller" class="zone-name">{{=it.data.location.zoneName}}</span>
  </td>
  {{ var lastDT=0; }}
  {{~ it.intervals :p:idx}}
    {{#def.fishEntryInterval:{i:p,idx:idx,lastDT:lastDT} }}
    {{ lastDT=p.dt; }}
  {{~}}
</tr>`,

    intervalHeadings:
     `{{~ it :k}}
        <th class="interval"><span>{{=k}}</span></th>
      {{~}}`,

    fishEntryDetails:
     `<tr class="fishtrain-fishentrydetails" data-id={{=it.entry.id}}>
        <td colspan="{{=it.colspan}}">
          <div class="contents" style="width: 0px">
            {{#def.fishEntryDetailsInner:it.entry }}
          </div>
        </td>
      </tr>`,

    scheduleIntervalMarkers:
     `{{~ _.range(it.intervals.length) :k}}
        <div class="interval-marker">
          <div class="label">+{{= it.duration * (k + 1) }}m</div>
        </div>
      {{~}}`,

    scheduleFishEntry:
     `<div class="fish-entry"
           style="left: {{= it.timeOffset * 6 }}px; width: {{= it.timeDuration * 6 }}px;"
           data-id="{{=it.id}}">
        <div class="ui middle aligned fish-icon sprite-icon sprite-icon-fish_n_tackle-{{=it.icon}}"></div>
      </div>`,

    baitInfo:
     `<div class="ui middle aligned" style="display: inline-block;">
        {{?it.data.dataMissing !== false || it.data.gig === "UNKNOWN"}}
          <i class="question circle outline icon" title="Unknown/Incomplete"></i>
        {{?}}
        <!-- Put Fishers intuition if fish has at least 1 predetor -->
        {{?it.data.bait.hasPredators}}
          <div class="ui middle aligned status-icon sprite-icon sprite-icon-status-intuition{{?it.data.intuitionLength}} has-duration{{?}}" title="Fisher's Intuition">
            {{?it.data.intuitionLength}}
              <span>{{var d = it.data.intuitionLength; if (d) { out += Math.floor(d/60) + 'm' + (d % 60); }}}s</span>
            {{?}}
          </div>
        {{?}}
        {{?it.data.snagging}}
          <div class="ui middle aligned status-icon sprite-icon sprite-icon-status-snagging" title="Snagging"></div>
        {{?}}
        {{?it.data.gig}}
          {{?it.data.gig === "UNKNOWN"}}
            <span>Spearfishing</span>
          {{??}}
            <div class="ui middle aligned bait-icon sprite-icon sprite-icon-action-{{=it.data.gig.toLowerCase()}}_gig" title="{{=it.data.gig}} Gig"></div>
          {{?}}
        {{?}}
        <span class="bait-span">
          {{~it.bait :item:idx}}
            {{?idx == 0}}
              <a href="https://garlandtools.org/db/#item/{{=item.id}}" target="cp_gt">
            {{??}}
              <div class="bait-badge-container">
                {{?item.hookset}}
                  <div class="ui middle aligned bait-icon hookset-modifier-icon sprite-icon sprite-icon-action-{{=item.hookset.toLowerCase()}}_hookset"
                        title="{{=item.hookset}} Hookset"></div>
                {{?}}
                {{?item.tug}}
                  <div class="tug-indicator {{=item.tug}}-tug-indicator" title="{{=item.tug}} tug">
                    {{={'light': '!', 'medium': '!!', 'heavy': '!!!'}[item.tug]}}
                  </div>
                {{?}}
              </div>
              </span><!-- bait-span -->
              <i class="arrow right icon"></i>
              <span class="bait-span">
            {{?}}
            <div class="ui middle aligned bait-icon sprite-icon sprite-icon-fish_n_tackle-{{=item.icon}}" title="{{=item.name}}" data-baitIdx="{{=idx}}"></div>
            {{?idx == 0}}
              </a>
            {{?}}
          {{~}}
          <div class="bait-badge-container">
            {{?it.data.hookset}}
              <div class="ui middle aligned bait-icon hookset-modifier-icon sprite-icon sprite-icon-action-{{=it.data.hookset.toLowerCase()}}_hookset" title="{{=it.data.hookset}} Hookset"></div>
            {{?}}
            {{?it.data.tug}}
              <div class="tug-indicator {{=it.data.tug}}-tug-indicator" title="{{=it.data.tug}} tug">
                {{={'light': '!', 'medium': '!!', 'heavy': '!!!'}[it.data.tug]}}
              </div>
            {{?}}
          </div>
        </span><!-- bait span -->
      </div>`,

    // it = ScheduleEntry
    // This is probably the most similar clone of the main tracker's
    // 'fish-template' format. I really need to unify all of these...
    scheduleListEntry:
     `{{ var schedEntry = it; it = schedEntry.fishEntry; }}
      <tr class="scheduled-fish-entry fish-entry{{?it.isWeatherRestricted}} fish-weather-restricted{{?}} data-id="{{=it.id}}">
        <td class="fish-icon-and-name collapsing">
          <div class="ui middle aligned fish-icon sprite-icon sprite-icon-fish_n_tackle-{{=it.data.icon}}"></div>
          <div class="ui middle aligned" style="display: inline-block;">
            <span class="fish-name"><a class="fish-name" target="_blank" href="{{=it.getExternalLink()}}">{{=it.data.name}}</a></span>
            <span class="fish-details">
              <div class="ui tiny circular label">{{=it.data.patch}}</div>
              {{?it.data.aquarium !== null}}
                <div class="ui middle aligned sprite-icon sprite-icon-aquarium"
                     data-tooltip="Tier {{=it.data.aquarium.size}} {{=it.data.aquarium.water}}" data-position="right center" data-variation="mini"></div>
              {{?}}
              {{?it.data.folklore !== null}}
                <div class="ui middle aligned sprite-icon sprite-icon-folklore"
                     data-tooltip="{{=__p(DATA.FOLKLORE[it.data.folklore],'name')}}" data-position="right center" data-variation="mini"></div>
              {{?}}
              {{?it.data.collectable !== null}}
                <div class="ui middle aligned sprite-icon sprite-icon-collectable"
                     data-tooltip="Minimum Collectability: {{=it.data.collectable}}" data-position="right center" data-variation="mini"></div>
              {{?}}
              {{?it.data.video !== null}}
                {{~it.getVideoInfo() :videoInfo}}
                  <a class="plainlink" href="{{=videoInfo.url}}" target="cp_vguide"><i class="{{=videoInfo.iconClass}} icon"></i></a>
                {{~}}
              {{?}}
            </span>
          </div>
        </td>
        <!-- Availability (only displayed while fish is available) -->
        <td class="fish-availability">
          {{?it.data.alwaysAvailable && it.data.dataMissing !== false}}
            {{?it.data.dataMissing.timeRestricted || it.data.dataMissing.weatherRestricted}}
              <i class="question circle outline icon"></i> Unknown
            {{??}}
              Always
            {{?}}
          {{??it.data.alwaysAvailable && it.data.dataMissing === false}}
            Always
          {{??!it.data.alwaysAvailable}}
            {{?it.data.dataMissing !== false}}
              <i class="exclamation triangle icon" title="Unknown/Incomplete"></i>
            {{?}}
            <div class="ui active slow tiny inline loader inverted"></div>
            <span class="fish-availability-current" data-val="{{=schedEntry.range.start}}" data-tooltip="{{var d = schedEntry.range.start; if (d) { out += dateFns.format(d, 'Pp'); } }}"></span>
          {{?}}
        </td>
        <!-- Location -->
        <td class="fish-location">
          <span class="fishing-spot">
            <i class="location-button map icon"></i> <a href="https://ffxivteamcraft.com/db/en/{{?it.data.location.spearfishing}}spearfishing{{??}}fishing{{?}}-spot/{{=it.data.location.id}}" target="cp_gt" class="location-name">{{=it.data.location.name}}</a>
          </span>
          <span class="zone">
            <span class="zone-name">{{=it.data.location.zoneName}}</span>
            <span class="zone-coordinates">({{=it.data.location.coords[0].toFixed(1)}}, {{=it.data.location.coords[1].toFixed(1)}})</span>
          </span>
        </td>
        <!-- Requirements and Bait -->
        <td class="fish-requirements">
          {{?it.data.dataMissing !== false || it.data.gig === "UNKNOWN"}}
            <i class="question circle outline icon" title="Unknown/Incomplete"></i>
          {{?}}
          <!-- Put Fishers intuition if fish has at least 1 predator -->
          {{?it.data.bait.hasPredators}}
            <div class="ui middle aligned status-icon sprite-icon sprite-icon-status-intuition{{?it.data.intuitionLength}} has-duration{{?}}" title="Fisher's Intuition">
              {{?it.data.intuitionLength}}
                <span>{{var d = it.data.intuitionLength; if (d) { out += Math.floor(d/60) + 'm' + (d % 60); }}}s</span>
              {{?}}
            </div>
          {{?}}
          {{?it.data.snagging}}
            <div class="ui middle aligned status-icon sprite-icon sprite-icon-status-snagging" title="Snagging"></div>
          {{?}}
          {{?it.data.gig}}
            {{?it.data.gig === "UNKNOWN"}}
              <span>Spearfishing</span>
            {{??}}
              <div class="ui middle aligned bait-icon sprite-icon sprite-icon-action-{{=it.data.gig.toLowerCase()}}_gig" title="{{=it.data.gig}} Gig"></div>
            {{?}}
          {{?}}
          <span class="bait-span">
            {{~it.bait :item:idx}}
              {{?idx == 0}}
                <a href="https://garlandtools.org/db/#item/{{=item.id}}" target="cp_gt">
              {{??}}
                <div class="bait-badge-container">
                  {{?item.hookset}}
                    <div class="ui middle aligned bait-icon hookset-modifier-icon sprite-icon sprite-icon-action-{{=item.hookset.toLowerCase()}}_hookset"
                         title="{{=item.hookset}} Hookset"></div>
                  {{?}}
                  {{?item.tug}}
                    <div class="tug-indicator {{=item.tug}}-tug-indicator" title="{{=item.tug}} tug">
                      {{={'light': '!', 'medium': '!!', 'heavy': '!!!'}[item.tug]}}
                    </div>
                  {{?}}
                </div>
                </span><!-- bait-span -->
                <i class="arrow right icon"></i>
                <span class="bait-span">
              {{?}}
              <div class="ui middle aligned bait-icon sprite-icon sprite-icon-fish_n_tackle-{{=item.icon}}" title="{{=item.name}}" data-baitIdx="{{=idx}}"></div>
              {{?idx == 0}}
                </a>
              {{?}}
            {{~}}
            <div class="bait-badge-container">
              {{?it.data.hookset}}
                <div class="ui middle aligned bait-icon hookset-modifier-icon sprite-icon sprite-icon-action-{{=it.data.hookset.toLowerCase()}}_hookset" title="{{=it.data.hookset}} Hookset"></div>
              {{?}}
              {{?it.data.tug}}
                <div class="tug-indicator {{=it.data.tug}}-tug-indicator" title="{{=it.data.tug}} tug">
                  {{={'light': '!', 'medium': '!!', 'heavy': '!!!'}[it.data.tug]}}
                </div>
              {{?}}
            </div>
          </span><!-- bait span -->
        </td>
      </tr>`,
    scheduleListIntuitionEntry:
     `{{ var schedEntry = it; it = schedEntry.fishEntry; }}
      <tr class="scheduled-fish-entry fish-intuition-row fish-entry{{?it.isWeatherRestricted}} fish-weather-restricted{{?}}" data-id="{{=it.id}}" data-intuitionfor="{{=it.intuitionFor.id}}">
        <td class="fish-icon-and-name collapsing">
          <div class="intuition-count">{{=it.intuitionCount}}</div>
          <div class="ui middle aligned fish-icon sprite-icon sprite-icon-fish_n_tackle-{{=it.data.icon}}"></div>
          <span class="fish-name"><a class="fish-name" target="_blank" href="{{=it.getExternalLink()}}">{{=it.data.name}}</a></span>
        </td>
        <!-- Availability -->
        <td class="fish-availability" colspan="2">
          {{?it.data.alwaysAvailable && it.data.dataMissing !== false}}
            {{?it.data.dataMissing.timeRestricted || it.data.dataMissing.weatherRestricted}}
              <i class="question circle outline icon"></i> Unknown
            {{??}}
              Always
            {{?}}
          {{??it.data.alwaysAvailable && it.data.dataMissing === false}}
            Always
          {{??!it.data.alwaysAvailable}}
            {{?it.data.dataMissing !== false}}
              <i class="exclamation triangle icon" title="Unknown/Incomplete"></i>
            {{?}}
            <div class="ui active slow tiny inline loader inverted"></div>
            <span class="fish-availability-current" data-val="0" data-tooltip=""></span>
          {{?}}
        </td>
        <!-- Requirements and Bait -->
        <td class="fish-requirements">
          {{?it.data.dataMissing !== false || it.data.gig === "UNKNOWN"}}
            <i class="question circle outline icon" title="Unknown/Incomplete"></i>
          {{?}}
          {{?it.data.snagging}}
            <div class="ui middle aligned status-icon sprite-icon sprite-icon-status-snagging" title="Snagging"></div>
          {{?}}
          {{?it.data.gig}}
            {{?it.data.gig === "UNKNOWN"}}
              <span>Spearfishing</span>
            {{??}}
              <div class="ui middle aligned bait-icon sprite-icon sprite-icon-action-{{=it.data.gig.toLowerCase()}}_gig" title="{{=it.data.gig}} Gig"></div>
            {{?}}
          {{?}}
          <span class="bait-span">
            {{~it.bait :item:idx}}
              {{?idx == 0}}
                <a href="https://garlandtools.org/db/#item/{{=item.id}}" target="cp_gt">
              {{??}}
                <div class="bait-badge-container">
                  {{?item.hookset}}
                    <div class="ui middle aligned bait-icon hookset-modifier-icon sprite-icon sprite-icon-action-{{=item.hookset.toLowerCase()}}_hookset"
                         title="{{=item.hookset}} Hookset"></div>
                  {{?}}
                  {{?item.tug}}
                    <div class="tug-indicator {{=item.tug}}-tug-indicator" title="{{=item.tug}} tug">
                      {{={'light': '!', 'medium': '!!', 'heavy': '!!!'}[item.tug]}}
                    </div>
                  {{?}}
                </div>
                </span><!-- bait-span -->
                <i class="arrow right icon"></i>
                <span class="bait-span">
              {{?}}
              <div class="ui middle aligned bait-icon sprite-icon sprite-icon-fish_n_tackle-{{=item.icon}}" title="{{=item.name}}" data-baitIdx="{{=idx}}"></div>
              {{?idx == 0}}
                </a>
              {{?}}
            {{~}}
            <div class="bait-badge-container">
              {{?it.data.hookset}}
                <div class="ui middle aligned bait-icon hookset-modifier-icon sprite-icon sprite-icon-action-{{=it.data.hookset.toLowerCase()}}_hookset" title="{{=it.data.hookset}} Hookset"></div>
              {{?}}
              {{?it.data.tug}}
                <div class="tug-indicator {{=it.data.tug}}-tug-indicator" title="{{=it.data.tug}} tug">
                  {{={'light': '!', 'medium': '!!', 'heavy': '!!!'}[it.data.tug]}}
                </div>
              {{?}}
            </div>
          </span><!-- bait span -->
        </td>
      </tr>`
  };

  class BaitEntry {
    constructor(itemId) {
      this.id = itemId;
      // Wrap the item data using reference.
      this.itemData = DATA.ITEMS[itemId];
      // If it's a fish, include a reference to that as well.
      // - Unfortunately, we can't expect to find a FishEntry for this record.
      // Using Fishes in order to support live adjustments.
      this.fishData = _(Fishes).findWhere({id: itemId});
    }

    get name() {
      return __p(this.itemData, "name");
    }

    get icon() {
      return this.itemData.icon;
    }

    get hookset() {
      if (this.fishData && 'hookset' in this.fishData) {
        return this.fishData.hookset;
      }
      return null;
    }

    get tug() {
      if (this.fishData && 'tug' in this.fishData) {
        return this.fishData.tug;
      }
      return null;
    }
  }

  class FishEntry {
    constructor(fish) {
      this.active = true;
      this.id = fish.id;
      this.intervals = [];
      this.data = fish;

      this.isWeatherRestricted = fish.conditions.weatherSet.length != 0;
      this.bait = _(fish.bestCatchPath).map(x => new BaitEntry(x));

      this.intuitionEntries = [];

      // Reference to DOM element in timeline table.
      this.timelineEl = null;
      // Reference to DOM element in schedule table.
      this.scheduleEl = null;
      // Reference to DOM element for more details.
      this.detailsEl = null;

      this.availability = {
        current: {
          duration: null,
          date: null
        },
        upcoming: {
          duration: null,
          date: null,
          downtime: null,
          prevdate: null
        },
        upcomingWindows: [],
      };
      this.isCatchable = false;
    }

    get uptime() { return this.data.uptime(); }

    updateIntervals(intervals, duration) {
      let fish = this.data;
      let crs = fish.catchableRanges;

      let durationMS = dateFns.milliseconds(duration);

      if (fish.alwaysAvailable == true) {
        this.intervals = _(intervals).map(start => { 
          return { dt: +start, skip: false, indicatorLeft: 0, indicatorWidth: 100 };
        });
        return;
      }

      let crs_idx = 0;

      // Is the fish going to be up AT ALL during any interval?!
      let eEndOfIntervals = eorzeaTime.toEorzea(dateFns.add(_(intervals).last(), duration));
      if (dateFns.isSameOrAfter(_(crs).first().start, eEndOfIntervals)) {
        console.warn("%s won't be up for another %s", fish.name,
          dateFns.formatDistanceStrict(_(intervals).first(), eorzeaTime.toEarth(_(crs).first().start)));
        // Just deactivate this entry so we skip it.
        this.active = false;
        return;
      }

      this.intervals = _(intervals).reduce((memo, start) => {
        let eStart = eorzeaTime.toEorzea(start);
        let eEnd = eorzeaTime.toEorzea(dateFns.add(start, duration));
        let hit = false;
        while (crs_idx < crs.length) {
          // Does the next catchable range start AFTER this interval ends?
          if (dateFns.isSameOrAfter(crs[crs_idx].start, eEnd)) {
            // Skip this interval and move on to the next.
            if (hit) {
              return memo;
            } else {
              return memo.concat({ dt: +start, skip: true });
            }
          }
          // Try intersecting this catchable range first.
          let range = dateFns.intervalIntersection(crs[crs_idx], {start: eStart, end: eEnd});
          if (range === null) {
            // Not up during this interval; move on to the next.
            if (hit) {
              return memo;
            } else {
              return memo.concat({ dt: +start, skip: true });
            }
          } else {
            // At least part of this catchable range is during this interval.
            // Add to the list, but continue checking catchable ranges for wrap-around.
            let totalMS = dateFns.milliseconds(dateFns.intervalToDuration({
              start: eorzeaTime.toEarth(range.start),
              end: eorzeaTime.toEarth(range.end)}));
            let offsetMS = dateFns.differenceInMilliseconds(
              eorzeaTime.toEarth(range.start), start);
            memo = memo.concat({
              dt: +start, skip: false,
              earth: { start: +eorzeaTime.toEarth(crs[crs_idx].start),
                       end: +eorzeaTime.toEarth(crs[crs_idx].end) },
              eorzea: crs[crs_idx],
              indicatorLeft: Math.round(offsetMS / durationMS * 100),
              indicatorWidth: Math.round(totalMS / durationMS * 100),
              crsIdx: crs_idx,
            });
            hit = true;
            if (dateFns.isBefore(crs[crs_idx].end, eEnd)) {
              // The catchable range ends BEFORE the interval; check for multiple ranges.
              crs_idx++;
            }
            // Otherwise, the interval ends BEFORE this range. Return, but stay on the same range.
            return memo;
          }
        }
        return memo;
      }, []);
    }

    getExternalLink(site = 'TC') {
      // 'site': Must be 'CBH', 'GT', or 'TC'.
      if (site == 'TC') {
        // Teamcraft
        // NOTE: While the language code does not seem to change the site's language, it
        // is required in the URL. I suppose I could technically throw whatever into this
        // but I like Miu, and I don't want to crash their site :)
        return "https://ffxivteamcraft.com/db/" + localizationHelper.getLanguage() + "/item/" + this.id;
      }
      else if (site == 'GT') {
        // Garland Tools
        return "https://garlandtools.org/db/#item/" + this.id;
      }
      else if (site == 'CBH') {
        // CBH doesn't standardize their fish info pages on the game's IDs so we must use search.
        let lang = localizationHelper.getLanguage();
        if (lang == 'ja') {
          // They also don't use the standard two-letter country code for Japanese...
          lang = 'jp';
        }
        return "https://ff14angler.com/index.php?lang=" + lang + "&search=" + encodeURIComponent(this.data.name);
      }
      else {
        console.error("Invalid external site ID:", site);
        return "";
      }
    }

    getVideoInfo() {
      if (this.data.video !== null) {
        // We need to return an object with the following fields:
        // * url
        // * icon class
        return _(this.data.video).map((contentId, contentType) => {
          let videoInfo = null;
          if (contentType == "youtube") {
            videoInfo = {iconClass: 'youtube', url: `https://youtu.be/${contentId}`};
          }
          return videoInfo;
        });
      } else {
        return null;
      }
    }

    update(earthTime) {
      let fish = this.data;
      let crs = fish.catchableRanges;
      this.isCatchable = fish.isCatchable(fishWatcher.fishEyesEnabled);

      // The rest requires catchable ranges.
      if (crs.length > 0) {
        // Cache the dates, they are used A LOT.
        let currStart = eorzeaTime.toEarth(+crs[0].start);
        let currEnd = eorzeaTime.toEarth(+crs[0].end);
        // NOTE: If it has one entry, it'll have 2...
        if (crs.length < 2) {
          console.error("Expected at least 2 catchable ranges for " + fish.name);
          return;
        }
        let nextStart = eorzeaTime.toEarth(+crs[1].start);

        if (dateFns.isAfter(currStart, earthTime)) {
          // The fish is not currently available.
          this.availability.current.duration =
            "in " + dateFns.formatDistanceStrict(currStart, earthTime, { roundingMethod: 'floor' });
          this.availability.current.date = currStart;
        } else {
          // The fish is currently available!
          this.availability.current.duration =
            "closes in " + dateFns.formatDistanceStrict(currEnd, earthTime, { roundingMethod: 'floor' });
          this.availability.current.date = currEnd;
        }
        this.availability.upcoming.duration =
          "in " + dateFns.formatDistanceStrict(nextStart, earthTime, { roundingMethod: 'floor' });

        this.availability.upcoming.date = nextStart;
        this.availability.upcoming.prevdate = currEnd;
      }

      for (let subEntry of this.intuitionEntries) {
        subEntry.update(earthTime);
      }
    }
  }

  class IntuitionFishEntry extends FishEntry {
    // TODO: If we are independently tracking this fish, have IntuitionFishEntry
    // just point at the main FishEntry for that fish.

    constructor(fish, intuitionForFish, count) {
      super(fish);

      this.intuitionCount = count;
      this.intuitionFor = intuitionForFish;
    }
  }

  class ScheduleEntry {
    constructor(fishEntry, opts={}) {
      this.fishEntry = fishEntry;
      this.adjustable = true;
      if (opts.crsIdx !== null) {
        this.crsIdx = opts.crsIdx;
        this.adjustable = false;
      }
      if (opts.range !== null) {
        // Generate a copy to prevent any kind of unintended mutation.
        this.range = Object.assign({}, opts.range);
      }
      // DOM element hosting this entry in BAR.
      this.el = null;
      // DOM element hosting this entry in LIST.
      this.listEl = null;

      this.intuitionEntries = [];
    }
  }

  class ScheduleIntuitionEntry {
    constructor(fishEntry) {
      // This is the specific intuition requirement fish.
      this.fishEntry = fishEntry;

      // DOM element hosting this entry in LIST.
      this.listEl = null;
    }
  }

  class _FishTrain {
    constructor() {
      // Fix bug in doT.js template regex.
      doT.templateSettings.use = /\{\{#([\s\S\}]+?)\}\}/g;
      // Compile the templates.
      this.templates = {
        fishEntry: doT.template(templates.fishEntry, undefined, sub_templates),
        intervalHeadings: doT.template(templates.intervalHeadings),
        fishEntryDetails: doT.template(templates.fishEntryDetails, undefined, sub_templates),
        scheduleIntervalMarkers: doT.template(templates.scheduleIntervalMarkers),
        scheduleFishEntry: doT.template(templates.scheduleFishEntry),
        baitInfo: doT.template(templates.baitInfo),
        scheduleListEntry: doT.template(templates.scheduleListEntry),
        scheduleListIntuitionEntry: doT.template(templates.scheduleListIntuitionEntry),
      };
    }

    initialize() {
      // Default Settings
      this.settings = {
        filters: {
          patch: new Set([2, 2.1, 2.2, 2.3, 2.4, 2.5,
                          3, 3.1, 3.2, 3.3, 3.4, 3.5,
                          4, 4.1, 4.2, 4.3, 4.4, 4.5,
                          5, 5.1, 5.2, 5.3, 5.4, 5.5,
                          6, 6.1, 6.2]),
          extra: 'all',
        },
        sortingType: 'overallRarity',
        theme: 'dark',
        timelineInterval: 30,
      };

      this.timeline = {
        start: null,
        end: null,
        fish: [],
        intervals: [],
      };
      this.timeline.start = dateFns.startOfMinute(new Date());
      this.timeline.end = dateFns.addHours(this.timeline.start, 3);

      this.scheduleEntries = [];

      this.currentSelection = null;
      this.currentPopup = null;

      this.sorterFunc = (a, b) => a < b;

      // Load the settings for this tool.
      this.loadSettings();

      // Fish entries for the timeline.
      // In order to calculate rarity, we need to check everything (otherwise
      // you could always guestimate.)
      this.fishEntries = {};
      // Link it to the fishWatcher.
      fishWatcher.fishEntries = this.fishEntries;
      // Configure sorters.
      configureSorters({
        isFishPinned: (x) => false,
        includeVerySoonBin: false
      });

      // We don't want to actually fully initialize the weather service
      // because this tool doesn't need to update anything after the user
      // selects a time period.

      // Register subscribers for events.

      this.initializeView();
    }

    initializeView() {
      // Track certain DOM objects.
      this.fishTrainTableHeader$ = $('table#fishtrain thead tr').first();
      this.fishTrainTableBody$ = $('table#fishtrain tbody');
      this.scheduleIntervalMarkers$ = $('.fishtrain-schedule .bar');
      this.scheduleFishEntries$ = $('.fishtrain-schedule .items');
      this.scheduleListEntries$ = $('.fishtrain-schedule-list tbody');
      this.scheduleBarCurrentTimeIndicator$ = $('.ui.fishtrain-schedule.segment .current-time-indicator');

      $('#fishtrain-controls.ui.accordion').accordion({
        exclusive: false,
        onOpening: _(this.onOpeningControlSection).partial(this),
        onClose: _(this.onCloseControlSection).partial(this),
      })

      $('#instructions.ui.accordion').accordion();

      $('.ui.dropdown').dropdown();
      $('#main-menu.dropdown').dropdown({
        action: 'hide'
      });
      $('.ui.radio.checkbox').checkbox();
      $('#languageChoice.dropdown')
      .dropdown('set selected', localizationHelper.getLanguage())
      .dropdown({
        onChange: (value, text, $choice) => localizationHelper.setLanguage(value),
      });
      $('#sortingType .radio.checkbox').checkbox({
        onChecked: _(this.sortingTypeChecked).partial(this)
      });

      // Apply theme to elements now.
      // DO NOT ADD ANY MORE UI ELEMENTS AFTER THIS LINE OR THEY WILL
      // NOT AUTOMATICALLY BE UPDATED.
      this.applyTheme(this.settings.theme);

      // Calendar's are special... they need to be reinitialized to pick up inverted class.
      this.reinitCalendarFields();

      $('#theme-toggle .toggle').on('click', this, this.themeButtonClicked);

      $('#updateList').on('click', this, this.updateList);

      $('#filterPatch .button:not(.patch-set)').on({
        click: this.filterPatchClicked,
        dblclick: this.filterPatchDblClicked
      }, this);
      $('#filterPatch .button.patch-set').on('click', this, this.filterPatchSetClicked);
      $('#filterExtra .button').on('click', this, this.filterExtraClicked);

      // Add delegated event listeners to the timeline table.
      this.fishTrainTableBody$.on(
        'click', 'span.fish-name', this, this.showDetailsInTimeline);
      this.fishTrainTableBody$.on(
        'click', 'span.interval-indicator', this, this.timelineFishEntryIntervalClicked);
      this.scheduleFishEntries$.on(
        'click', '.fish-entry', this, this.scheduleEntryClicked);

      // Listen for "Add to schedule" events.
      $('#timeline-window-details .approve.button').on(
        'click', this, this.addSelectionToSchedule);
      // Listen for "Remove from schedule" events.
      $('#schedule-entry-details .approve.button').on(
        'click', this, this.removeSelectionFromSchedule);

      // We need to awake of resizing...
      $(window).resize(this, this.adjustTimelineDetailsElements);

      // Configure react.
      const { interval } = rxjs;
      const { map, timestamp } = rxjs.operators;

      interval(1000).pipe(
        timestamp(),
        map(e => { return {countdown: e.timestamp}})
      ).subscribe(e =>  this.updateDisplay(e));
    }

    reinitCalendarFields(opts={}) {
      var startDate = $('#rangestart').calendar('get date');
      var endDate = $('#rangeend').calendar('get date');

      if (startDate === null) {
        startDate = this.timeline.start;
        endDate = this.timeline.end;
      }

      $('#rangestart').calendar({
        endCalendar: '#rangeend',
        initialDate: startDate,
        selectAdjacentDays: true,
        today: true,
      });
      $('#rangeend').calendar({
        startCalendar: '#rangestart',
        initialDate: endDate,
        selectAdjacentDays: true
      });
    }

    updateList(e) {
      e.stopPropagation();
      // Reset the main context.
      var _this = e.data;

      console.time("Generate Timeline");

      // Hide and stash the timeline details popup.
      $('#timeline-window-details')
        .removeClass('visible')
        .addClass('hidden')
        .appendTo($('#popups-storage'));
      _this.currentPopup = null;
      $('#schedule-entry-details')
        .removeClass('visible')
        .addClass('hidden')
        .appendTo($('#popups-storage'));

      // Clear the table.
      _this.fishTrainTableBody$.empty();
      _this.fishTrainTableHeader$.find('.interval').remove();

      // Determine the intervals.
      _this.settings.timelineInterval = $('#timelineInterval').dropdown('get value');
      _this.timeline.start = $('#rangestart').calendar('get date');
      _this.timeline.end = $('#rangeend').calendar('get date');

      // TODO: Maybe don't always clear this?
      // Clear schedule
      _this.scheduleIntervalMarkers$.empty();
      _this.scheduleFishEntries$.empty();
      _this.scheduleListEntries$.empty();
      _this.scheduleEntries = [];

      // Reinitialize the availability data and weather.
      CarbyUtils._resetSiteData(+_this.timeline.start)

      // Get intervals but exclude the last entry if it matches an interval.
      // To accomplish this, we subtract one second from the end date.
      var intervals = dateFns.eachMinuteOfInterval(
        {start: _this.timeline.start, end: +_this.timeline.end-1},
        {step: _this.settings.timelineInterval});

      _this.timeline.intervals = intervals;

      // Update the table headers.
      _this.fishTrainTableHeader$.append(
        _this.templates.intervalHeadings(_(intervals).map(x => dateFns.format(x, 'p'))));

      // Update the schedule interval markers.
      _this.scheduleIntervalMarkers$
        .removeClass()
        .addClass(`bar interval-${_this.settings.timelineInterval}min`)
        .append(
          _this.templates.scheduleIntervalMarkers({
            intervals: intervals,
            duration: _this.settings.timelineInterval
      }));

      // Mark all existing entries as stale (or not active).
      // Anything that's not active, won't be displayed, and at the end of this
      // function, will be removed from the list, making future updates faster.
      _(_this.fishEntries).each((entry) => entry.active = false);

      // Now it's time to compute the availability for our fishies...
      // This might take a while...
      _(Fishes).chain()
        .reject(fish => _this.isFishFiltered.call(_this, fish))
        .each(fish => _this.activateEntry.call(_this, fish, +_this.timeline.start));

      // Remove any left-over entries (so we only have fish matching the FILTER).
      for (let k in _this.fishEntries) {
        var entry = _this.fishEntries[k];
        if (!entry.active) {
          _this.removeEntry.call(_this, entry, k);
        }
      }

      // Let FishWatcher know it needs to reinit everything.
      // This will calculate the catchable ranges of the next 10 windows.
      // Hopefully, this is more than enough to cover the user's requested duration.
      fishWatcher.updateFishes({earthTime: +_this.timeline.start});

      // Update the intervals for all active fish entries.
      // (At this point, there should only be ACTIVE entries)
      console.time('Updating intervals');

      _(_this.fishEntries).each(
        entry => entry.updateIntervals(intervals, {minutes: _this.settings.timelineInterval}));

      // Remove any entries which ARE NOT UP during this time period.
      for (let k in _this.fishEntries) {
        var entry = _this.fishEntries[k];
        if (!entry.active) {
          _this.removeEntry.call(_this, entry, k);
        }
      }

      console.timeEnd('Updating intervals');

      // Defer call to redraw the timeline.
      $(() => {
        _this.redrawTimeline.call(_this);
      });

      console.timeEnd("Generate Timeline");

      // Fix the size of the schedule bar as well.
      _this.updateScheduleBarScrollContextWidth();
      return;
    }

    redrawTimeline() {
      // Sort the entries. While this technically creates a separate list, each
      // entry is still just a reference to the master list `fishEntries`.
      let sortedEntries = _(this.fishEntries).values().sort((a, b) => {
        return this.sorterFunc(a.data, b.data, +this.timeline.start);
      });

      _(sortedEntries).each(entry => {
        // Append the DOM for this entry first.
        let entry$ =
          $(this.templates.fishEntry(entry)).appendTo(this.fishTrainTableBody$);
        // Save reference to element on the entry.
        entry.timelineEl = entry$[0];
        // Just in case there's stale data here...
        entry.detailsEl = null;
      });
    }

    updateDisplay(reason = null) {
      if (reason !== null && 'countdown' in reason) {
        let timestamp = reason.countdown;

        // Update the main header's times.
        $('#eorzeaClock').text(dateFns.format(dateFns.utc.toDate(eorzeaTime.toEorzea(timestamp)), "HH:mm"));

        // Update the current time bar in the schedule bar.
        
        if (this.scheduleFishEntries$.children().length > 0 &&
            dateFns.isWithinInterval(timestamp, this.timeline))
        {
          let currentTimeOffset = dateFns.differenceInSeconds(timestamp, this.timeline.start);
          this.scheduleBarCurrentTimeIndicator$.css('left', -100 + ((6/60) * currentTimeOffset));
        } else {
          this.scheduleBarCurrentTimeIndicator$.css('left', -1000);
        }

        _(this.scheduleEntries).each(entry => {
          let scheduleEntry$ = $(entry.listEl);
          // Has this record already expired (in the display?)
          if (scheduleEntry$.hasClass('expired')) {
            // Then there's nothing to do.
            return;
          }
          // Update the data for this entry first.
          entry.fishEntry.update(timestamp);
          // Then apply changes to the view.
          let currentAvail$ = $('.fish-availability-current', scheduleEntry$);
          let hasExpired = false;

          // Remove any loader element placeholders first.
          $('.ui.loader', scheduleEntry$).remove();

          // Update the "isActive" state for the fish based on the range.
          if (dateFns.isWithinInterval(timestamp, entry.range)) {
            scheduleEntry$.addClass('fish-active');
          } else if (dateFns.isAfter(timestamp, entry.range.end)) {
            scheduleEntry$.removeClass('fish-active').addClass('expired');
            hasExpired = true;
          }

          // Update countdown information.
          if (!hasExpired) {
            let endDate = entry.range.start;
            if (scheduleEntry$.hasClass('fish-active')) {
              endDate = entry.range.end;
            }
            let countdownDuration = dateFns.intervalToDuration({start: timestamp, end: endDate});
            currentAvail$
              .attr('data-val', endDate)
              .attr('data-tooltip', dateFns.format(endDate, 'Pp'))
              .text(
                (scheduleEntry$.hasClass('fish-active') ? 'closes ' : '') + 'in ' +
                formatDuration(countdownDuration));
          } else {
            currentAvail$.text("");
          }

          // Update any intuition fish rows as well!
          for (let subEntry of entry.intuitionEntries) {
            scheduleEntry$ = $(subEntry.listEl);
            currentAvail$ = $('.fish-availability-current', scheduleEntry$);
            // Remove any loader element placeholders first.
            $('.ui.loader', scheduleEntry$).remove();
            // If the main fish entry has expired, this is easy...
            if (hasExpired) {
              scheduleEntry$.removeClass('fish-active').addClass('expired');
              currentAvail$.text("");
            } else if (!subEntry.fishEntry.data.alwaysAvailable) {
              // Then apply changes to the view.
              // First, check if the fish's availability changed.
              if (subEntry.fishEntry.isCatchable != scheduleEntry$.hasClass('fish-active')) {
                scheduleEntry$.toggleClass('fish-active');
              }
              // Update countdown information.
              let countdownDuration = dateFns.intervalToDuration({
                start: timestamp,
                end: subEntry.fishEntry.availability.current.date});
              currentAvail$
                .attr('data-val', subEntry.fishEntry.availability.current.date)
                .attr('data-tooltip', dateFns.format(subEntry.fishEntry.availability.current.date, 'Pp'))
                .text(
                  (scheduleEntry$.hasClass('fish-active') ? 'closes ' : '') + 'in ' +
                  formatDuration(countdownDuration));
            }
          }
        });
      }
    }

    showDetailsInTimeline(e) {
      let _this = e.data;
      // Find the FishEntry for this event.
      let entry = _this.fishEntries[
        Number($(this).closest('tr.fishtrain-fishentry').data('id'))];
      // Check if we already created the DOM for this fish first,
      // and if not, create it now.
      if (entry.detailsEl == null) {
        // Determine the size of the table without scrolling so we can prevent
        // the details element from moving if the user scrolls horizontally.
        var scrollContext = $('#fishtrain').parent()[0];
        var scrollWidth = scrollContext.offsetWidth - scrollContext.clientWidth;
        var details$ = $(_this.templates.fishEntryDetails({
          colspan: 2 + _this.timeline.intervals.length,
          entry: entry
        }));
        // Add the element to the DOM after the fish entry.
        $(entry.timelineEl).after(details$);
        // And fixup its width.
        // var containerMeasurements = $('.contents', details$).parent().css(['padding-left', 'padding-right']);
        // var calculatedWidth = `calc(${scrollContext.clientWidth}px - ${containerMeasurements['padding-left']} - ${containerMeasurements['padding-right']})`;
        $('.contents', details$).css({
          // left: containerMeasurements['padding-left'],
          left: 0,
          width: scrollContext.clientWidth,
          position: 'sticky'
        });

        entry.detailsEl = details$[0];
      }

      if ($(entry.detailsEl).hasClass('visible')) {
        $(entry.detailsEl).removeClass('visible').addClass('hidden');
      } else {
        $(entry.detailsEl).removeClass('hidden').addClass('visible');
      }
    }

    adjustTimelineDetailsElements(e) {
      let _this = e.data;
      var scrollContext = $('#fishtrain').parent()[0];
      $('.fishtrain-fishentrydetails .contents').css('width', scrollContext.clientWidth);

      // Fix the size of the schedule bar as well.
      _this.updateScheduleBarScrollContextWidth();
    }

    timelineFishEntryIntervalClicked(e) {
      let _this = e.data;
      var indicator$ = $(this);
      // Find the FishEntry for this event.
      let entry$ = indicator$.closest('tr.fishtrain-fishentry');
      let entry = _this.fishEntries[Number(entry$.data('id'))];
      // If this fish isn't always up, make sure we are looking at the START
      // of its window (within the intervals).
      var content = "";

      if (!entry.data.alwaysAvailable) {
        let crsIdx = indicator$.data('crsidx');
        indicator$ =
          entry$.find('span.interval-indicator')
                .filter((e, x) => $(x).data('crsidx') == crsIdx).first();

        if (_this.currentPopup == indicator$[0]) {
          console.debug("Popup already visible:", indicator$[0]);
          e.stopPropagation();
          return;
        }

        let r = entry.data.catchableRanges[crsIdx];
        var windowStartTime = dateFns.format(eorzeaTime.toEarth(r.start), 'p');
        var gameTime = dateFns.format(r.start, 'HH:mm')
        content = `Starts ${windowStartTime} (${gameTime} ET)`;

        _this.currentSelection = {
          entry: entry,
          range: {
            start: eorzeaTime.toEarth(r.start),
            end: eorzeaTime.toEarth(r.end)
          },
          adjustable: false,
          crsIdx: crsIdx,
        };
      } else {
        if (_this.currentPopup == indicator$[0]) {
          console.debug("Popup already visible:", indicator$[0]);
          e.stopPropagation();
          return;
        }
        // Indicate the fish is always up and ask to add just THIS interval
        // to the schedule.
        var interval = entry.intervals[indicator$.data('myidx')];
        var intervalStartTime = dateFns.format(interval.dt, 'p');
        content = `Fish is always up.<br/>Add interval starting at ${intervalStartTime} to schedule?`;

        _this.currentSelection = {
          entry: entry,
          range: {
            start: interval.dt,
            end: dateFns.addMinutes(interval.dt, _this.settings.timelineInterval)
          },
          adjustable: true,
          crsIdx: null,
        };
      }

      if (_this.currentPopup !== null) {
        // Close the current popup first.
        console.debug("Closing current popup first:", _this.currentPopup);
        $(_this.currentPopup).popup('hide');
      }
      // Store the current popup so UI reacts nicely...
      _this.currentPopup = indicator$[0];

      // Update the content for the popup.
      $('#timeline-window-details .content').html(content);

      indicator$.popup({
        popup: '#timeline-window-details',
        // hoverable: true,
        on: 'manual',
        boundary: '#fishtrain tbody',
        scrollContext: $('#fishtrain').parent(),
        variation: _this.settings.theme == 'dark' ? 'inverted' : '',
        lastResort: true,
        movePopup: false,
        onHide: function (m) {
          console.debug("Popup hiding:", m);
          _this.currentPopup = null;
          return true;
        },
        onHidden: function (m) {
          console.debug("Popup hidden:", m);
          // $(m).popup('destroy');
        }
      });
      console.debug("Showing popup:", indicator$[0]);
      indicator$.popup('show');
    }

    addSelectionToSchedule(e) {
      let _this = e.data;

      console.info("Attempting to add selection to schedule:", _this.currentSelection);

      // Close the popup now.
      $(_this.currentPopup).popup('hide');

      // Update the schedule.
      // MAKE SURE YOU HAVEN'T ALREADY ADDED THIS ENTRY TO THE BAR!!!
      // For now, we're just going to prevent users from adding the same fish twice
      if (_(_this.scheduleEntries).find(
        entry => entry.fishEntry.id == _this.currentSelection.entry.id))
      {
        // That fish is already in the schedule.
        $('body').toast({
          class: 'error',
          message: `${_this.currentSelection.entry.data.name} is already in the schedule.`
        });
        return;
      }

      var viewParams = {
        timeOffset: dateFns.differenceInMinutes(
          _this.currentSelection.range.start, _this.timeline.start, {roundingMethod: 'floor'}),
        timeDuration: dateFns.differenceInMinutes(
          _this.currentSelection.range.end, _this.currentSelection.range.start, {roundingMethod: 'ceil'}),
        icon: _this.currentSelection.entry.data.icon,
        id: _this.currentSelection.entry.id,
        crsIdx: _this.currentSelection.crsIdx,
      };

      // Add to the list
      var scheduleEntry = new ScheduleEntry(_this.currentSelection.entry, {
        crsIdx: _this.currentSelection.crsIdx,
        range: _this.currentSelection.range
      });

      var scheduleEntry$ =
        $(_this.templates.scheduleFishEntry(viewParams)).appendTo(_this.scheduleFishEntries$);
      scheduleEntry.el = scheduleEntry$[0];
      scheduleEntry$.data('model', scheduleEntry);

      // Adding to the schedule list requires sorting
      // Maybe this should be done later?  They're going to age off though,
      // just sort and add now.
      // Sort based on WHEN the window begins for this list.
      var insertAtIdx = _(_this.scheduleEntries).sortedIndex(
        scheduleEntry, e => e.range.start);
      var scheduleListEntry$ =
        $(_this.templates.scheduleListEntry(scheduleEntry));
      scheduleEntry.listEl = scheduleListEntry$[0];
      scheduleListEntry$.data('model', scheduleEntry);
      // Next, select the item that will be AFTER this (if there will be any)
      // We need to do this because the number of rows in the list varies if the fish
      // has intuition requirements.
      if (_this.scheduleEntries.length == insertAtIdx) {
        // Already at the end, so it's easy!
        scheduleListEntry$.appendTo(_this.scheduleListEntries$);
        _this.scheduleEntries.push(scheduleEntry);
      } else {
        // Not quite so easy, but still manageable.
        scheduleListEntry$.insertBefore($(_this.scheduleEntries[insertAtIdx].listEl));
        _this.scheduleEntries.splice(insertAtIdx, 0, scheduleEntry);
      }

      if (_this.settings.theme === 'dark') {
        $('*[data-tooltip]', scheduleListEntry$).attr('data-inverted', '');
      }

      if (scheduleEntry.fishEntry.intuitionEntries.length > 0) {
        // Include the intuition entries next.
        var intuitionEntries$ = $();
        _(scheduleEntry.fishEntry.intuitionEntries).each(entry => {
          // Create a new schedule list intuition entry for this fish.
          var subEntry = new ScheduleIntuitionEntry(entry);
          var subEntry$ = $(_this.templates.scheduleListIntuitionEntry(subEntry));
          subEntry.listEl = subEntry$[0];
          subEntry$.data('model', subEntry);
          scheduleEntry.intuitionEntries.push(subEntry);
          intuitionEntries$ = intuitionEntries$.add(subEntry$);
          if (_this.settings.theme === 'dark') {
            $('*[data-tooltip]', subEntry$).attr('data-inverted', '');
          }
        });
        // Insert these AFTER the main entry for the fish. Lucky for us, they won't be moving around.
        intuitionEntries$.insertAfter(scheduleListEntry$);
      }

      console.log("Added entry to schedule:", scheduleEntry);
    }

    removeSelectionFromSchedule(e) {
      let _this = e.data;

      console.info("Removing selected entry from schedule:", _this.selectedScheduleEntry);

      // Close the popup now.
      $(_this.currentPopup).popup('hide');

      // Remove the entry from the list, and from the UI.
      _this.scheduleEntries.splice(
        _this.scheduleEntries.findIndex((x) => x === _this.selectedScheduleEntry ), 1);
      $(_this.selectedScheduleEntry.el).remove();
      $(_this.selectedScheduleEntry.listEl).remove();
      for (let subEntry in _this.selectedScheduleEntry.intuitionEntries) {
        $(_this.selectedScheduleEntry.intuitionEntries[subEntry].listEl).remove();
        delete _this.selectedScheduleEntry.intuitionEntries[subEntry];
      }
      // Clean up.
      delete _this.selectedScheduleEntry;
      _this.selectedScheduleEntry = null;
    }

    scheduleEntryClicked(e) {
      let _this = e.data;
      let scheduleEntry$ = $(this);
      let scheduleEntry = scheduleEntry$.data('model');

      if (_this.currentPopup == scheduleEntry$[0]) {
        // Already selected, ignore.
        console.debug("Popup already visible:", scheduleEntry$[0]);
        e.stopPropagation();
        return;
      }
      if (_this.currentPopup !== null) {
        // Close the current popup first.
        console.debug("Closing current popup first:", _this.currentPopup);
        $(_this.currentPopup).popup('hide');
      }
      // Store the current popup so UI reacts nicely...
      _this.currentPopup = scheduleEntry$[0];
      // Remember our selected entry.
      _this.selectedScheduleEntry = scheduleEntry;

      // Update the contents for the popup.
      $('#schedule-entry-details .header').text(scheduleEntry.fishEntry.data.name);
      var content$ = $('#schedule-entry-details .content');
      $('.window-start', content$)
        .text(dateFns.format(scheduleEntry.range.start, 'p'));
      $('.window-start-ingame', content$)
        .text(dateFns.format(eorzeaTime.toEorzea(scheduleEntry.range.start), 'HH:mm'));
      $('.window-end', content$)
        .text(dateFns.format(scheduleEntry.range.end, 'p'));
      $('.window-end-ingame', content$)
        .text(dateFns.format(eorzeaTime.toEorzea(scheduleEntry.range.end), 'HH:mm'));
      var location = scheduleEntry.fishEntry.data.location;
      $('.location-name', content$)
        .text(`${location.name} - ${location.zoneName} (${location.coords[0].toFixed(1)}, ${location.coords[1].toFixed(1)})`);
      $('.bait-info', content$).html(_this.templates.baitInfo(scheduleEntry.fishEntry));

      scheduleEntry$.popup({
        popup: '#schedule-entry-details',
        on: 'manual',
        variation: _this.settings.theme == 'dark' ? 'inverted' : '',
        position: 'top center',
        movePopup: false,
        onHide: function(m) {
          console.debug("Popup hiding:", m);
          _this.currentPopup = null;
          return true;
        },
        onHidden: function(m) {
          console.debug("Popup hidden:", m);
        }
      });
      console.debug("Showing popup:", scheduleEntry$[0]);
      scheduleEntry$.popup('show');
    }

    isFishFiltered(fish) {
      // Filter by patch.
      // Patches can be... odd sometimes.  Convert to string, and only compare
      // with the first number following the decimal.
      function normalizePatch(patch) {
        let strPatch = String(patch);
        let pos = strPatch.indexOf(".");
        if (pos > 0) {
          // Convert to a number keeping only the first digit after decimal.
          return Number(strPatch.substr(0, pos+2))
        } else {
          // Otherwise, it's already a flat number.
          return patch;
        }
      }
      if (!this.settings.filters.patch.has(normalizePatch(fish.patch)))
        return true;

      // Filter by extra criteria.
      if (this.settings.filters.extra == 'big') {
        if (!fish.bigFish) return true;
      } else if (this.settings.filters.extra == 'collectable') {
        if (!fish.collectable) return true;
      } else if (this.settings.filters.extra == 'aquarium') {
        if (!fish.aquarium) return true;
      }

      // No other reason to filter.
      return false;
    }

    activateEntry(fish, earthTime) {
      // Check if there's already an entry for this fish.
      if (this.fishEntries[fish.id]) {
        // There is, so just mark it as active and return.
        this.fishEntries[fish.id].active = true;
        return;
      }

      // Otherwise, we have to create a new entry for this fish.
      this.createEntry(fish, earthTime);
    }

    createEntry(fish, earthTime) {
      let entry = new FishEntry(fish);

      // Don't forget to activate the new entry!!!
      entry.active = true;
      // Add the new entry to the set of tracked fish entry.
      this.fishEntries[fish.id] = entry;

      // Check if this fish has intuition requirements.
      for (let intuitionFish of fish.intuitionFish) {
        let intuitionFishEntry = new IntuitionFishEntry(
          intuitionFish.data, fish, intuitionFish.count);
        intuitionFishEntry.active = true;
        // Initially, FishWatcher only determined if this fish /would/ be up.
        // It doesn't necessarily compute the ranges.
        fishWatcher.reinitRangesForFish(intuitionFish.data, {earthTime: earthTime});
        // Unlike normal entries, this only gets added to the parent fish.
        entry.intuitionEntries.push(intuitionFishEntry);
      }

      return entry;
    }

    removeEntry(entry, k) {
      // Remove intuition entries as well.
      for (let subEntry in entry.intuitionEntries) {
        delete entry.intuitionEntries[subEntry];
      }
      delete this.fishEntries[k];
    }

    filterPatchClicked(e) {
      e.stopPropagation();
      var $this = $(this);

      // Update the UI and get the patch number together.
      var patch = Number($this.toggleClass('active').data('filter'));
      // Update the settings (after having toggled the patch element).
      if ($this.hasClass('active')) {
        e.data.settings.filters.patch.add(patch);
      } else {
        e.data.settings.filters.patch.delete(patch);
      }

      // If all of the sub-patches (that aren't disabled) are active, then the patch-set is too.
      var $patchSet = $this.siblings('.patch-set.button');
      var patchSetActive = $patchSet.siblings().not('.disabled').not('.active') == 0;
      $patchSet.toggleClass('active', patchSetActive);
  
      e.data.saveSettings();
      return false;
    }

    filterPatchDblClicked(e) {
      e.stopPropagation();
      var $this = $(this);
  
      // Update the UI making only the selected patch visible.
      $this.addClass('active').siblings().removeClass('active');
      $this.parent().parent().siblings().find('.button').removeClass('active');
      var patch = Number($this.data('filter'));

      // Just this patch is included now.
      e.data.settings.filters.patch.clear();
      e.data.settings.filters.patch.add(patch);

      e.data.saveSettings();
      return false;
    }

    filterPatchSetClicked(e) {
      e.stopPropagation();
      var $this = $(this);

      // Toggle full patch activation in the UI.
      $this.toggleClass('active');
      if ($this.hasClass('active')) {
        // Activate the rest of the buttons as well, and add to the filter settings.
        $this.siblings(":not(.disabled)").addClass('active').each(function() {
          e.data.settings.filters.patch.add(Number($(this).data('filter')));
        });
      } else {
        // Deactivate the rest of the button as well, and remove from the filter settings.
        $this.siblings(":not(.disabled)").removeClass('active').each(function() {
          e.data.settings.filters.patch.delete(Number($(this).data('filter')));
        });
      }

      e.data.saveSettings();
      return false;
    }

    filterExtraClicked(e) {
      e.stopPropagation();
      var $this = $(this);

      // Set the active filter.
      $this.addClass('active').siblings().removeClass('active');
      e.data.settings.filters.extra = $this.data('filter');

      e.data.saveSettings();
      return false;
    }

    sortingTypeChecked(_this) {
      let $this = $(this);
      let sortingType = $this.val();
  
      if (sortingType == 'overallRarity') {
        _this.sorterFunc = Sorters.sortByOverallRarity;
      } else if (sortingType == 'windowPeriods') {
        _this.sorterFunc = Sorters.sortByWindowPeriods;
      } else {
        console.error("Invalid sortingType: ", sortingType);
        return;
      }
  
      _this.settings.sortingType = sortingType;
      _this.saveSettings();
    }

    onOpeningControlSection(_this) {
      console.debug("Opening control section:", this[0]);

      if (SCHEDULE_LIST_AND_BAR_MUTUALLY_EXCLUSIVE) {
        // While the user may have multiple control sections active, the schedule
        // bar and detail list sections are mutually exclusive.
        if (this.data('controlname') === 'schedulebar') {
          $('#fishtrain-controls').accordion('close', 1);
        } else if (this.data('controlname') === 'schedulelist') {
          $('#fishtrain-controls').accordion('close', 2);
        }
      }

      if (this.data('controlname') === 'schedulebar') {
        _this.updateScheduleBarScrollContextWidth();
      }
      return;
    }

    onCloseControlSection(_this) {
      // After closing the configuration control, update the title details with
      // a one-line description of the settings.
      console.debug("Closed control section:", this);
      if ($(this).data('controlname') === 'configuration') {
        $(this).prev('.title').find('.inactive-details').text(
          `${dateFns.format(_this.timeline.start, 'Pp')} - ${dateFns.format(_this.timeline.end, 'Pp')} (${_this.settings.timelineInterval} minute intervals)`);
      }
    }

    themeButtonClicked(e) {
      if (e) e.stopPropagation();
      let $this = $(this);
      let theme = $this.data('theme');

      // Apply the theme.
      e.data.applyTheme(theme);
      // And save it to settings.
      e.data.settings.theme = theme;
      e.data.saveSettings();
    }

    applyTheme(theme) {
      if (theme === 'dark') {
        $('body').addClass('dark');
        $('*[data-tooltip]').attr('data-inverted', '');
      } else {
        $('body').removeClass('dark');
        $('*[data-tooltip]').removeAttr('data-inverted');
      }

      $('.ui.menu').toggleClass('inverted', theme === 'dark');
      $('.ui.modal').toggleClass('inverted', theme === 'dark');
      $('.ui.message').toggleClass('inverted', theme === 'dark');
      $('.ui.message.announcement').toggleClass('inverted', theme === 'dark');
      $('.ui.container').toggleClass('inverted', theme === 'dark');
      $('.ui.form').toggleClass('inverted', theme === 'dark');
      $('.ui.segment').toggleClass('inverted', theme === 'dark');
      $('.ui.table').toggleClass('inverted', theme === 'dark');
      $('.ui.list').toggleClass('inverted', theme === 'dark');
      $('.ui.top.attached.label').toggleClass('black', theme === 'dark');
      $('.ui.dropdown').toggleClass('inverted', theme === 'dark');
      $('.ui.input').toggleClass('inverted', theme === 'dark');
      $('.ui.accordion').toggleClass('inverted', theme === 'dark');

      $('.ui.calendar').toggleClass('inverted', theme === 'dark');
      this.reinitCalendarFields();
    }

    loadSettings() {
      let settings = this.settings;
      // Load the user's settings from localStorage.
      // These settings are specific to the Fish Train Tool.
      try {
        if (localStorage.getItem('fishTrainToolSettings')) {
          settings = JSON.parse(localStorage.fishTrainToolSettings);
        } else {
          // New user, start from default settings.
        }
      } catch (ex) {
        // Ignore this. This may happen if localStorage is disabled or private browsing.
        console.warn("Unable to access localStorage. Settings not restored.");
        // Just in case, use the default settings...
        settings = this.settings;
      }

      // Now, apply the settings to the current page, committing them if all is well.
      return this.applySettings(settings);
    }

    applySettings(settings) {
      if (!(settings.filters)) {
        // Why is `filters` missing?!
        console.warn("Why is filters missing??? Using default then...");
        settings.filters = this.settings.filters;
      }

      if (settings.filters.extra) {
        $('#filterExtra .button[data-filter="' + settings.filters.extra + '"]')
        .addClass('active').siblings().removeClass('active');
      }

      if (settings.filters.patch) {
        // Convert to a Set if it's not already.
        if (!(settings.filters.patch instanceof Set)) {
          settings.filters.patch = new Set(settings.filters.patch);
        }
      } else {
        // For some reason, the patch filter setting is missing?! Just use the default then.
        settings.filters.patch = this.settings.filters.patch;
      }
      // Probably need to adjust the patch filter UI as a result...
      $('#filterPatch .button').removeClass('active');
      for (let includedPatch of settings.filters.patch) {
        // Activate THIS patch's filter button.
        $('#filterPatch .button[data-filter="' + includedPatch + '"]:not(.patch-set)').toggleClass('active', true);
      }
      // Second pass to determine if the patch-set button should be active or not.
      // If all of the sub-patches (that aren't disabled) are active, then the patch-set is too.
      for (let patchSet of $('#filterPatch .patch-set.button')) {
        let patchSetActive = $(patchSet).siblings().not('.disabled').not('.active').length == 0;
        $(patchSet).toggleClass('active', patchSetActive);
      }

      // Set the sorter function.
      if (!(settings.sortingType)) {
        // Why is `sortingType` missing???
        console.warn("Why is sortingType missing??? Using default then...");
        settings.sortingType = this.settings.sortingType;
      }
      if (settings.sortingType == 'overallRarity') {
        this.sorterFunc = Sorters.sortByOverallRarity;
      } else if (settings.sortingType == 'windowPeriods') {
        this.sorterFunc = Sorters.sortByWindowPeriods;
      } else {
        console.error("Invalid sortingType: ", settings.sortingType);
      }
      $('#sortingType input[value="' + settings.sortingType + '"]').parent().checkbox('check');

      // Set the theme.
      if (!(settings.theme)) {
        // Why is `theme` missing???
        console.warn("Why is theme missing??? Using default then...");
        settings.theme = this.settings.theme;
      }
      this.applyTheme(settings.theme);

      // Save the settings to the model.
      this.settings = settings;
      // And update local storage.
      this.saveSettings();

      return settings;
    }

    saveSettings() {
      // Save the site settings to localStorage.
      try {
        localStorage.fishTrainToolSettings =
          JSON.stringify(this.settings,
                        (key, value) => value instanceof Set ? [...value] : value);
      } catch (ex) {
        console.warn("Unable to save settings to local storage.");
      }
    }

    updateScheduleBarScrollContextWidth() {
      let scheduleBarNode$ = $('.ui.fishtrain-schedule.segment .bar');
      $('.ui.fishtrain-schedule.segment .current-time-indicator-bar').css('width', scheduleBarNode$[0].clientWidth);

      let scheduleBarContainerNode$ = $('.ui.fishtrain-schedule.segment').parent();
      $('.ui.fishtrain-schedule.segment .scroll-context').css('width', Math.min(scheduleBarContainerNode$[0].clientWidth, scheduleBarNode$[0].clientWidth + 28));
    }
  }

  return new _FishTrain();
}();