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

  // Workaround until we switch to FUI 2.9.
  $.modal = $.fn.modal;
  $.toast = $.fn.toast;

  // This controls whether the user is a passenger, or the conductor making the train.
  // NOTE: For now, there's no special conductor mode besides the normal fish train page.
  // When running the actual train, you should all use the passenger mode.
  var I_AM_A_PASSENGER = false;

  function formatDuration(duration, prefix, date) {
    if (duration.years || duration.months || duration.days || duration.hours > 4) {
      return dateFns.format(date, 'Pp');
    }
    return `${prefix}${duration.hours}:${String(duration.minutes).padStart(2, '0')}:${String(duration.seconds).padStart(2, '0')}`;
  }

  var sub_templates = {
    fishEntryInterval: {arg: 'it', text:
     `{{? it.lastDT != it.i.dt }}
        <td class="{{? it.idx == 0}}first {{?}}fishtrain-fishentry-interval{{? !it.i.skip}} has-window{{?}}">
          <div class="weather-indicator-outer">
            <span class="previous-weather">
              <div class="ui middle aligned weather-icon sprite-icon sprite-icon-weather-{{=it.i.previousWeather.icon}}"
                   title="{{=__p(it.i.previousWeather,'name')}}"></div>
              <i class="arrow right icon"></i>
            </span>
            <div class="ui middle aligned weather-icon sprite-icon sprite-icon-weather-{{=it.i.weather.icon}}"
                 title="{{=__p(it.i.weather,'name')}}"></div>
          </div>
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

    fishTimeRestriction: {arg: 'it', text:
    `<span class="catchtime-hour">{{=Math.floor(it.startHour)}}</span>{{?it.startHour % 1 !== 0}}<span class="catchtime-minute">{{=String(Math.round((it.startHour % 1) * 60)).padStart(2, '0')}}</span>{{?}}
     -
     <span class="catchtime-hour">{{=Math.floor(it.endHour)}}</span>{{?it.endHour % 1 !== 0}}<span class="catchtime-minute">{{=String(Math.round((it.endHour % 1) * 60)).padStart(2, '0')}}</span>{{?}}`
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
            <i class="cloud icon"></i> Weather Unknown
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
            <i class="clock icon"></i> Time Unknown
            {{? it.data.startHour !== 0 || it.data.endHour !== 24 }}
              <i class="exclamation triangle icon" title="Unknown/Incomplete"></i>
              {{#def.fishTimeRestriction:it.data}}
            {{?}}
          {{?}}
        {{??}}
          <i class="alarm-cmd-button wait icon"></i>&nbsp;
          {{? it.data.startHour === 0 && it.data.endHour === 24}}
            All Day
          {{??}}
            {{#def.fishTimeRestriction:it.data}}
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
      <a class="fish-name" target="_blank" href="{{=it.getExternalLink()}}">{{=it.data.name}}</a>
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
     `{{~ it.intervals :k:idx}}
        <div class="interval-marker" style="left: {{= (idx * it.duration) * 6 }}px">
          <div class="label">{{= dateFns.format(dateFns.toDate(+k + (it.duration * 60 * 1000)), 'p')}}</div>
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
      <tr class="scheduled-fish-entry fish-entry{{?it.isWeatherRestricted}} fish-weather-restricted{{?}}" data-id="{{=it.id}}">
        <td class="fish-caughtStatus">
          <div class="ui middle aligned mini very compact icon button fishCaught">
            <i class="checkmark icon"></i>
          </div>
        </td>
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
          <div class="ui active slow tiny inline loader inverted"></div>
          <span class="fish-availability-current" data-val="{{=schedEntry.range.start}}" data-tooltip="{{var d = schedEntry.range.start; if (d) { out += dateFns.format(d, 'Pp'); } }}"></span>
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
        <td class="fish-caughtStatus">
          <div class="ui middle aligned mini very compact icon button fishCaught">
            <i class="checkmark icon"></i>
          </div>
        </td>
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
      </tr>`,
    tackleBoxBaitItems:
     `{{~it :item}}
        <div class="column">
          <div class="content">
            <div class="ui middle aligned bait-icon sprite-icon sprite-icon-fish_n_tackle-{{=item.icon}}" title="{{=item.name}}" style="margin-right: 0px;"></div>
            {{=item.name}}
          </div>
        </div>
      {{~}}`
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
      // Reference to DOM element for more details.
      this.detailsEl = null;

      this.availability = {
        current: {
          date: null
        },
        upcoming: {
          duration: null,
          date: null,
          downtime: null,
          prevdate: null
        },
      };
      this.isCatchable = false;

      this.refCount = 1;
    }

    get uptime() { return this.data.uptime(); }

    updateIntervals(intervals, duration) {
      let fish = this.data;
      let crs = fish.catchableRanges;

      let durationMS = dateFns.milliseconds(duration);

      if (fish.alwaysAvailable == true) {
        this.intervals = _(intervals).map(start => {
          let [previousWeather, weather] = _(weatherService.getWeatherSetForAreaAtTime(fish.location.zoneId, eorzeaTime.toEorzea(+start))).map((w) => DATA.WEATHER_TYPES[w]);
          return {
            dt: +start,
            skip: false,
            indicatorLeft: 0,
            indicatorWidth: 100,
            weather: weather,
            previousWeather: previousWeather
          };
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
        let eStart = eorzeaTime.toEorzea(+start);
        let eEnd = eorzeaTime.toEorzea(+dateFns.add(start, duration));
        let hit = false;
        let [previousWeather, weather] = _(weatherService.getWeatherSetForAreaAtTime(fish.location.zoneId, eStart)).map((w) => DATA.WEATHER_TYPES[w]);
        while (crs_idx < crs.length) {
          // Does the next catchable range start AFTER this interval ends?
          if (dateFns.isSameOrAfter(crs[crs_idx].start, eEnd)) {
            // Skip this interval and move on to the next.
            if (hit) {
              return memo;
            } else {
              return memo.concat({ dt: +start, skip: true, weather: weather, previousWeather: previousWeather });
            }
          }
          // Try intersecting this catchable range first.
          let range = dateFns.intervalIntersection(crs[crs_idx], {start: eStart, end: eEnd});
          if (range === null) {
            // Not up during this interval; move on to the next.
            if (hit) {
              return memo;
            } else {
              return memo.concat({ dt: +start, skip: true, weather: weather, previousWeather: previousWeather });
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
              weather: weather,
              previousWeather: previousWeather,
            });
            hit = true;
            if (dateFns.isSameOrBefore(crs[crs_idx].end, eEnd)) {
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
      // Since we cannot use FishWatcher the normal way, we have to manually determine
      // if the fish is still available WITHOUT modifying the CRS. Since we aren't using
      // FishEyes for this, it's enough to simply update the `isCatchable` field on
      // demand.
      let crs = _(fish.catchableRanges).dropWhile(
        cr => dateFns.isSameOrAfter(earthTime, eorzeaTime.toEarth(+cr.end)));

      // The rest requires catchable ranges.
      if (crs.length > 0) {
        // Cache the dates, they are used A LOT.
        let currStart = eorzeaTime.toEarth(+crs[0].start);
        let currEnd = eorzeaTime.toEarth(+crs[0].end);
        if (dateFns.isAfter(currStart, earthTime)) {
          // The fish is not currently available.
          this.isCatchable = false;
          this.availability.current.date = currStart;
        } else {
          // The fish is currently available!
          this.isCatchable = true;
          this.availability.current.date = currEnd;
        }
      } else if (fish.catchableRanges.length > 0) {
        // It *was* up, but all recorded windows have been exhausted.
        // Seriously, how long have you had the page open for?! The train's
        // come and gone long ago now!
        this.isCatchable = false;
      }

      for (let subEntry of this.intuitionEntries) {
        subEntry.update(earthTime);
      }
    }

    updateLanguage() {
      // Handle text in TIMELINE view.
      if (this.timelineEl !== null) {
        this.updateLanguageForNode(this, $(this.timelineEl));
        for (let subEntry of this.intuitionEntries) {
          this.updateLanguageForNode(subEntry, $(subEntry.timelineEl));
        }
      }
      // Handle text in DETAILS view.
      if (this.detailsEl !== null) {
        this.updateLanguageForNode(this, $(this.detailsEl));
      }
    }

    updateLanguageForNode(fishEntry, $node) {
      // Since it's possible for the fish entries to get out-of-sync,
      // you need to make sure you've applied the new language to the underlying
      // data as well. This does mean you might re-run this for the same fish.
      // Surely there's a better way...
      fishEntry.data.applyLocalization();
      // Just about all of the displays use the same fields and classes.
      // jQuery's selectors will let us get away with issues where a selector matches nothing.
      $('a.fish-name', $node)
        .attr('href', fishEntry.getExternalLink())
        .text(fishEntry.data.name);
      if (fishEntry.data.folklore !== null) {
        $('.sprite-icon-folklore', $node).attr(
          'data-tooltip', __p(DATA.FOLKLORE[fishEntry.data.folklore], 'name'));
      }
      $('.location-name', $node).text(fishEntry.data.location.name);
      $('.zone-name', $node).text(fishEntry.data.location.zoneName);
      $('.weather-icon', $node).each((nodeIdx, elem) => {
        let $elem = $(elem);
        let idx = $elem.attr('data-prevWeatherIdx');
        if (idx !== undefined) {
          $elem.attr('title',
            __p(fishEntry.data.conditions.previousWeatherSet[idx], 'name'));
        } else {
          idx = $elem.attr('data-currWeatherIdx');
          if (idx !== undefined) {
            $elem.attr('title',
              __p(fishEntry.data.conditions.weatherSet[idx], 'name'));
          }
        }
      });
      $('.bait-icon', $node).each((nodeIdx, elem) => {
        let $elem = $(elem);
        let idx = $elem.attr('data-baitIdx');
        if (idx !== undefined) {
          // NOTE: BaitEntry automatically returns the correct language name.
          $elem.attr('title', fishEntry.bait[idx].name);
        }
      });
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
      // Up ref count to prevent deletion due to filtering.
      this.fishEntry.refCount++;
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

    updateLanguage() {
      // Handle text in LIST view.
      if (this.listEl !== null) {
        this.fishEntry.updateLanguageForNode(this.fishEntry, $(this.listEl));
        for (let subEntry of this.intuitionEntries) {
          subEntry.fishEntry.updateLanguageForNode(subEntry.fishEntry, $(subEntry.listEl));
        }
      }
      // Nothing to fix for BAR view.
    }
  }

  class ScheduleIntuitionEntry {
    constructor(fishEntry) {
      // This is the specific intuition requirement fish.
      this.fishEntry = fishEntry;
      // Up ref count to prevent deletion due to filtering.
      this.fishEntry.refCount++;

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
        tackleBoxBaitItems: doT.template(templates.tackleBoxBaitItems),
      };

      this.teamcraftId = null;
      this.scheduleDirty = false;
    }

    initialize() {
      // Default Settings
      this.settings = {
        filters: {
          patch: new Set([2, 2.1, 2.2, 2.3, 2.4, 2.5,
                          3, 3.1, 3.2, 3.3, 3.4, 3.5,
                          4, 4.1, 4.2, 4.3, 4.4, 4.5,
                          5, 5.1, 5.2, 5.3, 5.4, 5.5,
                          6, 6.1, 6.2, 6.3, 6.4, 6.5]),
          extra: 'all',
        },
        sortingType: 'overallRarity',
        theme: 'dark',
        timelineInterval: /*30*/ 1400/60,
      };

      this.timeline = {
        start: null,
        end: null,
        fish: [],
        intervals: [],
      };
      this.timeline.start = dateFns.startOfMinute(new Date());
      this.timeline.end = dateFns.addHours(this.timeline.start, 3);
      this.timelineReady = false;

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

    validatePassWithTC(tcid) {
      // NOTE: Passing through value in querystring directly! Sanitize and verify no illegal characters.
      if (!tcid.match(/[0-9a-zA-Z]{20}/)) {
        // The ID doesn't seem to be well-formed...
        console.warn("TCID seems malformed, but Miu says you're allowed to try it... You better not be messing with us.");
      }
      return fetch(`https://api.ffxivteamcraft.com/fish-train/${tcid}`, {
        method: 'GET',
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`Error communicating with Teamcraft server! Status: ${response.status}`);
        }
        return response.json();
      });
    }

    convertTrainData(data, tcid) {
      console.debug("Teamcraft Fish Train Data: ", data);
      // Save the ID (just in case)
      this.teamcraftId = tcid;
      // Decode the Teamcraft trainpass.
      let trainPass = {
        timeline: {
          start: new Date(data.start),
          end: null,
        },
        scheduleEntries: data.fish.map((fish) => {
          return {
            fishId: fish.id,
            crsIdx: null,
            range: {
              start: new Date(fish.start),
              end: new Date(fish.end)
            }};
        }),
        name: data.name || null,
        world: data.world || null,
        tcid: tcid,
      };
      console.debug("Train Pass Data: ", trainPass);
      return trainPass;
    }

    initializeForPassenger() {
      // TOGGLE PASSENGER MODE!!!
      I_AM_A_PASSENGER = true;
      // For now, we're just going to use dark mode.
      this.settings = {
        theme: 'dark',
      }
      this.timelineReady = false;
      this.scheduleEntries = [];
      this.completion = new Set();

      // Save certain DOM element references.
      this.scheduleListEntries$ = $('.fishtrain-schedule-list tbody');
      this.departureMessage$ = $('#departure-message');
      this.departureCountdown$ = $('#departure-message .departure-countdown');

      this.initCommonView();

      this.applyTheme(this.settings.theme);
      $('#theme-toggle .toggle').on('click', this, this.themeButtonClicked);

      $('#viewBaitButton').on('click', this, this.viewBaitClicked);

      // Validate the rider's pass first of course.
      var tcid = null;
      let trainPassPromise = null;
      let url = new URL(window.location);
      if (url.searchParams.has('tcid')) {
        tcid = url.searchParams.get('tcid');
        trainPassPromise = this.validatePassWithTC(tcid);
      } else {
        trainPassPromise = Promise.reject(new Error("Missing train pass ID"));
      }

      trainPassPromise.then((data) => {
        let trainPass = this.convertTrainData(data, tcid);
        // Initialize FishTrain tool using the pass.
        this.redeemPass(trainPass);
      }).catch((error) => {
        console.error(error);
        // If the pass isn't valid... well, you did something wrong (or TC is down).
        $.modal({
          class: 'basic',
          title: 'Invalid Pass',
          closable: false,
          content: `<p>The pass you tried to use was either invalid, expired, or not yet ready</p><p>Please check with your conductor.</p><p><b>Error Message:</b> ${_.escape(error)}</p>`
        }).modal('show');
      }).finally(() => {
        this.initializeCompletion();
      });
    }

    redeemPass(trainPass) {
      this.timeline = trainPass.timeline;
      // Initialize the departure message, iif we're early.
      if (dateFns.isBefore(Date.now(), this.timeline.start)) {
        this.departureMessage$.addClass('visible');
        this.departureMessage$.find('.departure-time-exact').text(dateFns.format(this.timeline.start, 'Pp'));
        this.departureCountdown$.text(dateFns.formatDistance(Date.now(), this.timeline.start, {includeSeconds: true}));
      }
      // Set the train title if present.
      if (trainPass.name) {
        $('#fish-train-title').text(trainPass.name);
      }
      // Set the world if present.
      if (trainPass.world) {
        try
        {
          let dataCenter = _(EXTRA_DATA.WORLDS).findKey(v => _(v).chain().map(z => z.toLowerCase()).contains(trainPass.world.toLowerCase()).value());
          let worldName = _(EXTRA_DATA.WORLDS[dataCenter]).find(v => v.toLowerCase() == trainPass.world.toLowerCase());
          $('.data-center-name').text(dataCenter);
          $('.world-name').text(worldName);
        } catch (error) {
          console.error("Something went wrong trying to lookup data center and world names.", error);
        }
      }
      // Update the TC link.
      $('#tc-link').attr('href', `https://ffxivteamcraft.com/fish-train/${trainPass.tcid}`);

      // Before you do anything else, RESET THE SITE DATA!
      // This will force the Weather Service to reset any data and begin computing
      // ranges based on the timeline's start (not the current time).
      // This is critical because depending on the amount of time between now and
      // the train start, the catchable range data might be close enough to not
      // require recomputation, or far enough that pruning doesn't correctly match
      // the original range indices.
      // Look, trust the process, believe in the power of the power cycle, and all
      // the fish will be just fine <><.  See, happy fish. ><> <3
      CarbyUtils._resetSiteData(+this.timeline.start);

      // The Fish Watcher service is still not active because we need to generate
      // FishEntry's for all of the fish mentioned in the schedule entries.
      // Mind you, the entries in the pass are not real ScheduleEntry objects, but
      // to make those, you need FishEntry objects.
      // Look, it's gonna work out, trust the process.
      this.fishEntries = {};
      // Link it to the fishWatcher.
      fishWatcher.fishEntries = this.fishEntries;

      for (const entry of trainPass.scheduleEntries) {
        let fish = _(Fishes).findWhere({id: entry.fishId});
        let fishEntry = this.activateEntry(fish, +this.timeline.start);
        entry.fishEntry = fishEntry;
      }

      // Let FishWatcher know it needs to reinit everything.
      // This will calculate the catchable ranges of the next 10 windows.
      // That will take care mostly of our intuition fish stuff, but they are managed
      // by the IntuitionFishEntry update function anyways...
      fishWatcher.updateFishes({earthTime: +this.timeline.start});

      // Now to add our fishies to the schedule list.
      for (const entry of trainPass.scheduleEntries) {
        this.addToScheduleList(entry.fishEntry, entry.crsIdx, entry.range);
      }

      // Configure common event handlers.
      this.initCommonEventHandlers();

      // Configure react.
      this.initReact();
    }

    addToScheduleList(fishEntry, crsIdx, range) {
      // FIXME:
      // This is kinda a duplicate of "addSelectionToSchedule", but I wanted
      // it done quick. Clean up this mess later please.

      // Create a REAL ScheduleEntry for this record.
      let scheduleEntry = new ScheduleEntry(fishEntry, {
        crsIdx: crsIdx,
        range: range
      });

      if (crsIdx !== null) {
        // Adjust the range to correctly match the CR.
        try {
          let cr = fishEntry.data.catchableRanges[crsIdx];
          scheduleEntry.range.start = eorzeaTime.toEarth(cr.start);
          scheduleEntry.range.end = eorzeaTime.toEarth(cr.end);
        } catch {
          // Ignore for now...
        }
      }

      // Determine where this entry goes in the list.
      let insertAtIdx = _(this.scheduleEntries).sortedIndex(scheduleEntry, e => e.range.start);
      var scheduleListEntry$ = $(this.templates.scheduleListEntry(scheduleEntry));
      scheduleEntry.listEl = scheduleListEntry$[0];
      scheduleListEntry$.data('model', scheduleEntry);

      // Next, select the item that will be AFTER this (if there will be any)
      // We need to do this because the number of rows in the list varies if the fish
      // has intuition requirements.
      if (this.scheduleEntries.length == insertAtIdx) {
        // Already at the end, so it's easy!
        scheduleListEntry$.appendTo(this.scheduleListEntries$);
        this.scheduleEntries.push(scheduleEntry);
      } else {
        // Not quite so easy, but still manageable.
        scheduleListEntry$.insertBefore($(this.scheduleEntries[insertAtIdx].listEl));
        this.scheduleEntries.splice(insertAtIdx, 0, scheduleEntry);
      }
      if (this.settings.theme === 'dark') {
        $('*[data-tooltip]', scheduleListEntry$).attr('data-inverted', '');
      }
      if (scheduleEntry.fishEntry.intuitionEntries.length > 0) {
        // Include the intuition entries next.
        var intuitionEntries$ = $();
        _(scheduleEntry.fishEntry.intuitionEntries).each(entry => {
          // Create a new schedule list intuition entry for this fish.
          var subEntry = new ScheduleIntuitionEntry(entry);
          var subEntry$ = $(this.templates.scheduleListIntuitionEntry(subEntry));
          subEntry.listEl = subEntry$[0];
          subEntry$.data('model', subEntry);
          scheduleEntry.intuitionEntries.push(subEntry);
          intuitionEntries$ = intuitionEntries$.add(subEntry$);
          if (this.settings.theme === 'dark') {
            $('*[data-tooltip]', subEntry$).attr('data-inverted', '');
          }
        });
        // Insert these AFTER the main entry for the fish. Lucky for us, they won't be moving around.
        intuitionEntries$.insertAfter(scheduleListEntry$);
      }

      return scheduleEntry;
    }

    initializeView() {
      // Track certain DOM objects.
      this.fishTrainTableHeader$ = $('table#fishtrain thead tr').first();
      this.fishTrainTableBody$ = $('table#fishtrain tbody');
      this.scheduleIntervalMarkers$ = $('.fishtrain-schedule .bar');
      this.scheduleFishEntries$ = $('.fishtrain-schedule .items');
      this.scheduleListEntries$ = $('.fishtrain-schedule-list tbody');
      this.scheduleBarCurrentTimeIndicator$ = $('.ui.fishtrain-schedule.segment .current-time-indicator');
      this.fishTrainTable$ = $('table#fishtrain');

      this.initCommonView();
      $('.ui.accordion').accordion({
        exclusive: false,
        onOpening: _(this.onOpeningControlSection).partial(this),
        onOpen: _(this.onOpenControlSection).partial(this),
        onClose: _(this.onCloseControlSection).partial(this),
      });
      $('.ui.radio.checkbox').checkbox();
      $('#sortingType .radio.checkbox').checkbox({
        onChecked: _(this.sortingTypeChecked).partial(this)
      });
      $('#fishTableWeatherSetting .radio.checkbox').checkbox({
        onChecked: _(this.fishTableWeatherSettingChecked).partial(this)
      });
      $('#fish-train-worldName').dropdown({
        values: _(EXTRA_DATA.WORLDS).reduce((a,v,k) => {
          return a.concat({type: 'menu', name: k, values: v.map((e) => { return {name: e, value: e.toLowerCase()}; })})}, []),
        onChange: () => { this.scheduleDirty = true },
      });

      // Apply theme to elements now.
      // DO NOT ADD ANY MORE UI ELEMENTS AFTER THIS LINE OR THEY WILL
      // NOT AUTOMATICALLY BE UPDATED.
      this.applyTheme(this.settings.theme);

      // Calendar's are special... they need to be reinitialized to pick up inverted class.
      this.reinitCalendarFields();

      $('input[name="fishTrainTitle"]').on('change', () => { this.scheduleDirty = true });

      $('#updateList').on('click', this, this.updateList);
      $('#generatePass').on('click', this, this.generateTrainPass);
      $('#editExistingTrain').on('click', this, this.editExistingTrain);

      $('#filterPatch .button:not(.patch-set)').on({
        click: this.filterPatchClicked,
        dblclick: this.filterPatchDblClicked
      }, this);
      $('#filterPatch .button.patch-set').on('click', this, this.filterPatchSetClicked);
      $('#filterExtra .button').on('click', this, this.filterExtraClicked);

      // Add delegated event listeners to the timeline table.
      this.fishTrainTableBody$.on(
        'click', 'td.col-fish', this, this.showDetailsInTimeline);
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

      // Configure common event handlers.
      this.initCommonEventHandlers();

      // Configure react.
      this.initReact();
    }

    initCommonView() {
      $('.ui.dropdown').dropdown();
      $('#main-menu.dropdown').dropdown({
        action: 'hide'
      });
      $('#languageChoice.dropdown')
      .dropdown('set selected', localizationHelper.getLanguage())
      .dropdown({
        onChange: (value, text, $choice) => localizationHelper.setLanguage(value),
      });

      // Initialize the fishing spot location map modal.
      FishingSpotMap.initialize();
    }

    initCommonEventHandlers() {
      $('#theme-toggle .toggle').on('click', this, this.themeButtonClicked);
      $('body').on('click', '.location-button', this, this.onFishEntryShowLocationClicked);
      if (I_AM_A_PASSENGER) {
        this.scheduleListEntries$.on(
          'click', '.fishCaught.button', this, this.onFishEntryCaughtClicked);
      }
    }

    initReact() {
      var resumeTime = null;
      $('#eorzeaClock').on('click', () => {
        if (resumeTime !== null) {
          resumeTime();
        } else {
          eorzeaTime.zawarudo(resolve => {
            $('#eorzeaClock').css({filter: 'drop-shadow(orange 2px 2px 2px)', color: 'yellow'}).text("ザ・ワールド");
            resumeTime = resolve;
          }).then(() => {
            $('#eorzeaClock').css({filter: '', color: ''});
            resumeTime = null;
          });
        }
      });

      const { Subject, BehaviorSubject, merge, interval } = rxjs;
      const { buffer, debounceTime, map, filter, skip, timestamp } = rxjs.operators;

      if (!I_AM_A_PASSENGER) {
        this.filterExtraSubject = new BehaviorSubject(this.settings.filters.extra);
        this.filterPatchSubject = new BehaviorSubject(this.settings.filters.patch);
        this.sortingTypeSubject = new BehaviorSubject(this.settings.sortingType);
      } else {
        // These are unused as a passenger.
        this.filterExtraSubject = new Subject();
        this.filterPatchSubject = new Subject();
        this.sortingTypeSubject = new Subject();
      }

      const filterPatch$ = this.filterPatchSubject.pipe(
        skip(1),
        debounceTime(250),
        map(e => { return {filterPatch: e} })
      );
      const filterExtra$ = this.filterExtraSubject.pipe(
        skip(1),
        debounceTime(250),
        map(e => { return {filterExtra: e} })
      );
      const sortingType$ = this.sortingTypeSubject.pipe(
        skip(1),
        debounceTime(250),
        map(e => { return {sortingType: e} })
      );
      const language$ = localizationHelper.languageChanged.pipe(
        skip(1),
        map(e => { return {language: e} })
      );

      const updateDisplaySources$ = merge(
        filterPatch$,
        filterExtra$,
        sortingType$,
        language$);

      merge(
        interval(1000).pipe(
          filter(() => resumeTime === null),
          timestamp(),
          map(e => { return {countdown: e.timestamp} })
        ),
        updateDisplaySources$.pipe(
          buffer(updateDisplaySources$.pipe(debounceTime(250))),
          filter(x => x.length > 0),
          map(e => {
            // Combine these into a single object.
            return e.reduce((acc, curr) => {
              return Object.assign(acc, curr);
            }, {});
          })
        )
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

    loadExistingTrain(existingSchedule) {
      this.timelineReady = false;
      // Clear the table.
      this.fishTrainTableBody$.empty();
      this.fishTrainTableHeader$.find('.interval').remove();
      for (let k in this.fishEntries) {
        this.removeEntry(this.fishEntries[k], k);
      }

      // Update the intervals.
      // NOTE: timelineInterval is not included in train pass data.
      // so we just continue using whatever the user had originally.
      // this.settings.timelineInterval = $('#timelineInterval').dropdown('get value');
      this.settings.timelineInterval = 1400/60; /* Force using 8 Eorzean Bells */
      $('#rangestart').calendar('set date', existingSchedule.timeline.start);
      this.timeline.start = existingSchedule.timeline.start;
      // NOTE: Teamcraft doesn't record the END time, so derive it as one interval after
      // the last fish in the list.
      // this.timeline.end = dateFns.addMinutes(
      //   _(existingSchedule.scheduleEntries).last().range.end, this.settings.timelineInterval);
      this.timeline.end = eorzeaTime.toEarth(dateFns.addHours(startOfPeriod(
        eorzeaTime.toEorzea(_(existingSchedule.scheduleEntries).last().range.end)), 8));
      $('#rangeend').calendar('set date', this.timeline.end);

      // Clear schedule
      this.scheduleIntervalMarkers$.empty();
      this.scheduleFishEntries$.empty();
      this.scheduleListEntries$.empty();
      this.scheduleEntries = [];

      // Reinitialize the availability data and weather.
      CarbyUtils._resetSiteData(+this.timeline.start)

      // Get intervals but exclude the last entry if it matches an interval.
      // To accomplish this, we subtract one second from the end date.
      // var intervals = dateFns.eachMinuteOfInterval(
      //   {start: this.timeline.start, end: +this.timeline.end-1},
      //   {step: this.settings.timelineInterval});
      var intervals = [];
      let currentIntervalStart = +this.timeline.start;
      while (currentIntervalStart <= +this.timeline.end-1) {
        intervals.push(dateFns.toDate(currentIntervalStart));
        currentIntervalStart += (this.settings.timelineInterval * 60 * 1000);
      }

      this.timeline.intervals = intervals;

      // Update the table headers.
      this.fishTrainTableHeader$.append(
        this.templates.intervalHeadings(_(intervals).map(x => dateFns.format(x, 'p'))));

      // Update the schedule interval markers.
      this.scheduleIntervalMarkers$
        .removeClass()
        // .addClass(`bar interval-${this.settings.timelineInterval}min`)
        .addClass('bar interval-8bells')
        .append(
          this.templates.scheduleIntervalMarkers({
            intervals: intervals,
            duration: this.settings.timelineInterval
      }));

      // Update Display will configure the Fish Table and intervals.
      this.timelineReady = true;
      this.updateDisplay(null);

      // But afterwards, we need to re-enable any fish entries associated with
      // the schedule before we can add them to the list. This is because if the
      // CURRENT filters don't include a fish in the schedule, the add to schedule
      // list will fail. I know, I know, you're better than this, but it's late,
      // I just want it to work.
      for (const entry of existingSchedule.scheduleEntries) {
        let fish = _(Fishes).findWhere({id: entry.fishId});
        let fishEntry = this.activateEntry(fish, +this.timeline.start);
        entry.fishEntry = fishEntry;
      }

      // Let FishWatcher know it needs to reinit everything.
      // This will calculate the catchable ranges of the next 10 windows.
      // That will take care mostly of our intuition fish stuff, but they are managed
      // by the IntuitionFishEntry update function anyways...
      fishWatcher.updateFishes({earthTime: +this.timeline.start});

      // Now you can finally add the scheduled fish from the train pass
      // to the Schedule List and Schedule Bar components.
      for (const entry of existingSchedule.scheduleEntries) {
        let scheduleEntry = this.addToScheduleList(
          entry.fishEntry, entry.crsIdx, entry.range);

        // Also add to the Schedule Bar.
        var viewParams = {
          timeOffset: dateFns.differenceInSeconds(
            entry.range.start, this.timeline.start, {roundingMethod: 'floor'}) / 60.0,
          timeDuration: dateFns.differenceInSeconds(
            entry.range.end, entry.range.start, {roundingMethod: 'ceil'}) / 60.0,
          icon: entry.fishEntry.data.icon,
          id: entry.fishEntry.id,
          crsIdx: entry.crsIdx,
        };
        var scheduleEntry$ =
          $(this.templates.scheduleFishEntry(viewParams)).appendTo(this.scheduleFishEntries$);
        scheduleEntry.el = scheduleEntry$[0];
        scheduleEntry$.data('model', scheduleEntry);
      }

      // Fix the size of the schedule bar as well.
      this.updateScheduleBarScrollContextWidth();

      // Enable the "Generate Train Pass" button (assuming there's actually fish).
      $('#generatePass.button').toggleClass('disabled', this.scheduleEntries.length == 0);

      // DO NOT MARK THE TRAIN AS DIRTY!
      this.scheduleDirty = false;
      $('#existing-train-information').removeClass('hidden').addClass('visible');
      $('#existing-train-tcid').text(this.teamcraftId);
      $('input[name="fishTrainTitle"]').val(existingSchedule.name);
      $('#fish-train-worldName').dropdown('set selected', existingSchedule.world);

      return;
    }

    updateList(e) {
      e.stopPropagation();
      // Reset the main context.
      var _this = e.data;

      _this.timelineReady = false;

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
      for (let k in _this.fishEntries) {
        _this.removeEntry(_this.fishEntries[k], k);
      }

      // Determine the intervals.
      // _this.settings.timelineInterval = $('#timelineInterval').dropdown('get value');
      _this.settings.timelineInterval = 1400/60; /* Force using 8 Eorzean Bells */
      _this.timeline.start = $('#rangestart').calendar('get date');
      _this.timeline.end = $('#rangeend').calendar('get date');

      // Adjust start and end to fully contain weather intervals.
      _this.timeline.start = eorzeaTime.toEarth(startOfPeriod(eorzeaTime.toEorzea(_this.timeline.start)));
      _this.timeline.end = eorzeaTime.toEarth(dateFns.addHours(startOfPeriod(eorzeaTime.toEorzea(_this.timeline.end)), 8));

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
      // var intervals = dateFns.eachMinuteOfInterval(
      //   {start: _this.timeline.start, end: +_this.timeline.end-1},
      //   {step: _this.settings.timelineInterval});
      var intervals = [];
      let currentIntervalStart = +_this.timeline.start;
      while (currentIntervalStart <= +_this.timeline.end-1) {
        intervals.push(dateFns.toDate(currentIntervalStart));
        currentIntervalStart += (_this.settings.timelineInterval * 60 * 1000);
      }

      _this.timeline.intervals = intervals;

      // Update the table headers.
      _this.fishTrainTableHeader$.append(
        _this.templates.intervalHeadings(_(intervals).map(x => dateFns.format(x, 'p'))));

      // Update the schedule interval markers.
      _this.scheduleIntervalMarkers$
        .removeClass()
        // .addClass(`bar interval-${_this.settings.timelineInterval}min`)
        .addClass('bar interval-8bells')
        .append(
          _this.templates.scheduleIntervalMarkers({
            intervals: intervals,
            duration: _this.settings.timelineInterval
      }));

      _this.timelineReady = true;
      _this.updateDisplay(null);

      // Fix the size of the schedule bar as well.
      _this.updateScheduleBarScrollContextWidth();

      // Disable the "Generate Train Pass" button too.
      $('#generatePass.button').addClass('disabled');

      // Mark schedule as dirty and clear any existing Teamcraft ID.
      if (_this.teamcraftId) {
        $('input[name="fishTrainTitle"]').val("");
        $('#fish-train-worldName').dropdown('clear', true);
        _this.teamcraftId = null;
      }
      _this.scheduleDirty = true;
      $('#existing-train-information').removeClass('visible').addClass('hidden');
      $('#existing-train-tcid').text("");

      return;
    }

    redrawTimeline() {
      // Sort the entries. While this technically creates a separate list, each
      // entry is still just a reference to the master list `fishEntries`.
      let sortedEntries = _(this.fishEntries).values().sort((a, b) => {
        return this.sorterFunc(a.data, b.data, +this.timeline.start);
      });

      _(sortedEntries).each(entry => {
        if (entry.timelineEl !== null) {
          // Move the existing element into position.
          this.fishTrainTableBody$.append(entry.timelineEl);
        }
        else
        {
          // Append the DOM for this entry first.
          let entry$ =
            $(this.templates.fishEntry(entry)).appendTo(this.fishTrainTableBody$);
          // Save reference to element on the entry.
          entry.timelineEl = entry$[0];
        }
        // Just in case there's stale data here...
        entry.detailsEl = null;
      });
    }

    updateDisplay(reason = null) {
      // The `countdown` reason is ALWAYS sent alone (due to how merge works).
      if (reason !== null && 'countdown' in reason) {
        let timestamp = reason.countdown;

        // Update the main header's times.
        $('#eorzeaClock').text(dateFns.format(dateFns.utc.toDate(eorzeaTime.toEorzea(timestamp)), "HH:mm"));

        if (!I_AM_A_PASSENGER) {
          // Update the current time bar in the schedule bar.
          if (this.scheduleFishEntries$.children().length > 0 &&
              dateFns.isWithinInterval(timestamp, this.timeline))
          {
            let currentTimeOffset = dateFns.differenceInSeconds(timestamp, this.timeline.start);
            this.scheduleBarCurrentTimeIndicator$.css('left', -100 + ((6/60) * currentTimeOffset));
          } else {
            this.scheduleBarCurrentTimeIndicator$.css('left', -1000);
          }
        } else {
          // For passengers, we need to update the countdown to departure, or remove it.
          if (dateFns.isBefore(timestamp, this.timeline.start)) {
            this.departureCountdown$.text(dateFns.formatDistance(timestamp, this.timeline.start, {includeSeconds: true}));
          } else {
            this.departureMessage$.removeClass('visible');
          }
        }

        var nth_upcoming = 0;

        let remove_upcoming_nth_classes = function(index, className) {
          let classNames = className.split(' ');
          return classNames.filter(v => v.startsWith('upcoming-nth-'));
        };

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
          let addUpcomingClass = false;

          // Remove any loader element placeholders first.
          $('.ui.loader', scheduleEntry$).remove();

          // Update the "isActive" state for the fish based on the range.
          if (dateFns.isWithinInterval(timestamp, entry.range)) {
            scheduleEntry$.addClass('fish-active').removeClass('upcoming').removeClass(remove_upcoming_nth_classes);
          } else if (dateFns.isAfter(timestamp, entry.range.end)) {
            scheduleEntry$.removeClass('fish-active').addClass('expired');
            hasExpired = true;
          } else {
            nth_upcoming += 1;
            scheduleEntry$.addClass('upcoming').removeClass(remove_upcoming_nth_classes).addClass(`upcoming-nth-${nth_upcoming}`);
            addUpcomingClass = true;
          }

          // Update countdown information.
          if (!hasExpired) {
            const isActive = scheduleEntry$.hasClass('fish-active');
            let endDate = entry.range.start;
            let windowDuration = dateFns.intervalToDuration(entry.range);
            if (isActive) {
              endDate = entry.range.end;
            }
            let countdownDuration = dateFns.intervalToDuration({start: timestamp, end: endDate});
            let txt = formatDuration(countdownDuration, (isActive ? 'closes ' : '') + 'in ', endDate);
            if (!isActive) {
              txt += "<br/>Lasting: " + dateFns.formatDuration(windowDuration, {format: ['minutes']});
            }
            currentAvail$
              .attr('data-val', endDate)
              .attr('data-tooltip', dateFns.format(endDate, 'Pp'))
              .html(txt);
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
              scheduleEntry$.removeClass('fish-active').removeClass('upcoming').addClass('expired');
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
                .text(formatDuration(
                  countdownDuration,
                  (scheduleEntry$.hasClass('fish-active') ? 'closes ' : '') + 'in ',
                  subEntry.fishEntry.availability.current.date));
            }
            if (addUpcomingClass) {
              scheduleEntry$.addClass('upcoming').removeClass(remove_upcoming_nth_classes).addClass(`upcoming-nth-${nth_upcoming}`);
            } else {
              scheduleEntry$.removeClass('upcoming').removeClass(remove_upcoming_nth_classes);
            }
          }
        });
        return;
      }

      // For all other reasons, we first need a base timestamp.
      let timestamp = Date.now();

      if (this.timelineReady &&
          ((reason === null) ||
           (reason !== null && ('filterPatch' in reason ||
                                'filterExtra' in reason))))
      {
        // Mark all existing entries as stale (or not active).
        // Anything that's not active, won't be displayed in the table.
        // Deleting it's entry in 'fishEntries' simply removes it from the
        // table, but will not affect the real object since it's in the
        // scheduleEntries.
        // Keep in mind, this does mean the object will become unsynced with
        // the schedule entries if you restore the filter without clearing the
        // schedule.
        _(this.fishEntries).each((entry) => entry.active = false);

        _(Fishes).chain()
          .reject(fish => this.isFishFiltered(fish))
          .each(fish => this.activateEntry(fish, +this.timeline.start));

        // Remove any left-over entries (so we only have fish matching the FILTER).
        for (let k in this.fishEntries) {
          var entry = this.fishEntries[k];
          if (!entry.active) {
            this.removeEntry(entry, k);
          }
        }

        // Let FishWatcher know it needs to reinit everything.
        // This will calculate the catchable ranges of the next 10 windows.
        // Hopefully, this is more than enough to cover the user's requested duration.
        fishWatcher.updateFishes({earthTime: +this.timeline.start});

        // Update the intervals for all active fish entries.
        // (At this point, there should only be ACTIVE entries)
        _(this.fishEntries).each(
          entry => entry.updateIntervals(
            this.timeline.intervals,
            { seconds: this.settings.timelineInterval * 60 }));

        // Remove any entries which ARE NOT UP during this time period.
        for (let k in this.fishEntries) {
          var entry = this.fishEntries[k];
          if (!entry.active) {
            this.removeEntry(entry, k);
          }
        }
      }

      if (this.timelineReady &&
          ((reason === null) ||
           (reason !== null && ('filterPatch' in reason ||
                                'filterExtra' in reason ||
                                'sortingType' in reason))))
      {
        // Defer call to redraw the timeline.
        $(() => {
          this.redrawTimeline();
        });
      }

      if (reason !== null && 'language' in reason) {
        _(this.fishEntries).each(entry => entry.updateLanguage());
        _(this.scheduleEntries).each(entry => entry.updateLanguage());
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
            end: +dateFns.add(interval.dt, { seconds: _this.settings.timelineInterval * 60.0 })
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
      var viewParams = {
        timeOffset: dateFns.differenceInSeconds(
          _this.currentSelection.range.start, _this.timeline.start, {roundingMethod: 'floor'}) / 60.0,
        timeDuration: dateFns.differenceInSeconds(
          _this.currentSelection.range.end, _this.currentSelection.range.start, {roundingMethod: 'ceil'}) / 60.0,
        icon: _this.currentSelection.entry.data.icon,
        id: _this.currentSelection.entry.id,
        crsIdx: _this.currentSelection.crsIdx,
      };

      console.info("Generating schedule entry DOM element from:", viewParams);

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

      // Finally, enable the "Generate Train Pass" button if it wasn't already.
      $('#generatePass.button').removeClass('disabled');

      // Mark the schedule as dirty.
      _this.scheduleDirty = true;

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
        // Decrement refCount for wraped FishEntry object. [REF-TRACKING]
        --_this.selectedScheduleEntry.intuitionEntries[subEntry].fishEntry.refCount;
        delete _this.selectedScheduleEntry.intuitionEntries[subEntry];
      }
      // Clean up.
      // Decrement refCount for wraped FishEntry object. [REF-TRACKING]
      --_this.selectedScheduleEntry.fishEntry.refCount;
      delete _this.selectedScheduleEntry;
      _this.selectedScheduleEntry = null;

      // If there's nothing left in the schedule, disable the "Generate Train Pass" button.
      if (_this.scheduleEntries.length == 0) {
        $('#generatePass.button').addClass('disabled');
      }

      // Mark the schedule as dirty.
      _this.scheduleDirty = true;
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
        .text(dateFns.format(dateFns.utc.toDate(eorzeaTime.toEorzea(scheduleEntry.range.start)), 'HH:mm'));
      $('.window-end', content$)
        .text(dateFns.format(scheduleEntry.range.end, 'p'));
      $('.window-end-ingame', content$)
        .text(dateFns.format(dateFns.utc.toDate(eorzeaTime.toEorzea(scheduleEntry.range.end)), 'HH:mm'));
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
      // Spearfishing is NOT INCLUDED!
      // I mean, if you wanna do that, you could, but it's not really the
      // vibe I'm going for with this tool.
      if (fish.location.spearfishing)
      return true;

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
        return this.fishEntries[fish.id];
      }

      // Otherwise, we have to create a new entry for this fish.
      return this.createEntry(fish, earthTime);
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
      // If currently showing in the timeline, remove that first.
      if (entry.timelineEl !== null) {
        $(entry.timelineEl).remove();
        entry.timelineEl = null;
      }
      if (entry.detailsEl !== null) {
        $(entry.detailsEl).remove();
        entry.detailsEl = null;
      }
      // Remove intuition entries as well.
      for (let subEntry in entry.intuitionEntries) {
        // IMPORTANT: Only remove the link to this fish entry from the fish train object itself.
        // There _may_ be other objects referencing this data. Yes, this will likely result in
        // a memory leak if the user toggles between filters excessively.
        if (--entry.intuitionEntries[subEntry].refCount == 0) {
          delete entry.intuitionEntries[subEntry];
        } else {
          // Help, the aquarium may have a leak.
          console.debug("Aquarium may leak:", entry.intuitionEntries[subEntry]);
        }
      }
      // FIXME: Instead of unlinking, use refCounter to determine if the entry needs to stay alive.
      // This will require changing other code to ignore non-active entries... -_-
      if (--entry.refCount != 0) {
        console.debug("Aquarium may leak:", entry);
      }
      delete this.fishEntries[k];
    }

    getTackleBoxContents() {
      function compareBaitEntries(a, b) {
        if (a.itemData.ilvl == b.itemData.ilvl) {
          return a.id < b.id ? -1 : 1;
        } else {
          return a.itemData.ilvl < b.itemData.ilvl ? 1 : -1;
        }
      }
      let baitEntries = _(this.scheduleEntries).chain()
        .map(x => x.fishEntry)
        .reduce((memo, fish) => _.union(memo, [fish], fish.intuitionEntries), [])
        .map((fish) => fish.bait[0])
        .filter(x => x)
        .unique(x => x.id)
        .value();
      return baitEntries.toSorted(compareBaitEntries);
    }

    viewBaitClicked(e) {
      e.stopPropagation();
      let _this = e.data;

      let baitItems = _this.getTackleBoxContents();

      $('#tackleBoxModal .bait-items').empty().append($(_this.templates.tackleBoxBaitItems(baitItems)));
      $('#tackleBoxModal').modal('show');
    }

    onFishEntryShowLocationClicked(e) {
      e.stopPropagation();
      let $this = $(this);

      let fishId = $this.closest('.fish-entry, .fishtrain-fishentry').data('id');
      FishingSpotMap.displayMap(_(Fishes).findWhere({id: fishId}));

      return false;
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

      // Notify others about the change.
      e.data.filterPatchSubject.next(e.data.settings.filters.patch);
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
      // Notify others about the change.
      e.data.filterPatchSubject.next(e.data.settings.filters.patch);
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

      // Notify others about the change.
      e.data.filterPatchSubject.next(e.data.settings.filters.patch);
      e.data.saveSettings();
      return false;
    }

    filterExtraClicked(e) {
      e.stopPropagation();
      var $this = $(this);

      // Set the active filter.
      $this.addClass('active').siblings().removeClass('active');
      e.data.settings.filters.extra = $this.data('filter');

      // Notify anyone interested in this change.
      e.data.filterExtraSubject.next(e.data.settings.filters.extra);
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
      _this.sortingTypeSubject.next(sortingType);
      _this.saveSettings();
    }

    fishTableWeatherSettingChecked(_this) {
      let $this = $(this);
      let weatherSettingPref = $this.val();

      if (weatherSettingPref == 'none') {
        _this.fishTrainTable$
          .removeClass('show-weather')
          .removeClass('show-previous-weather-first')
          .removeClass('show-previous-weather-all');
      } else if (weatherSettingPref == 'currentOnly') {
        _this.fishTrainTable$
          .addClass('show-weather')
          .removeClass('show-previous-weather-first')
          .removeClass('show-previous-weather-all');
      } else if (weatherSettingPref == 'firstPrevious') {
        _this.fishTrainTable$
          .addClass('show-weather')
          .addClass('show-previous-weather-first')
          .removeClass('show-previous-weather-all');
      } else if (weatherSettingPref == 'both') {
        _this.fishTrainTable$
          .addClass('show-weather')
          .removeClass('show-previous-weather-first')
          .addClass('show-previous-weather-all');
      } else {
        console.error("Invalid weather setting: ", weatherSettingPref);
        return;
      }
    }

    onOpeningControlSection(_this) {
      console.debug("Opening control section:", this[0]);
      return;
    }

    onOpenControlSection(_this) {
      console.debug("Opened control section:", this);
      if ($(this).data('controlname') === 'schedulebar') {
        _this.updateScheduleBarScrollContextWidth();
      }
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
      $('.ui.basic.label').toggleClass('inverted', theme === 'dark');

      $('.ui.calendar').toggleClass('inverted', theme === 'dark');
      this.reinitCalendarFields();
    }

    loadSettings() {
      if (I_AM_A_PASSENGER) { return this.settings; }

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
      if (I_AM_A_PASSENGER) { return this.settings; }

      if (!(settings.conductorToken)) {
        // Generate a new Conductor Token for use with Teamcraft.
        if (window.isSecureContext) {
          settings.conductorToken = crypto.randomUUID();
          console.info("Generated Conductor Token: ", settings.conductorToken);
        } else {
          console.warn("Unable to generate conductor token securely...");
        }
      }

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
      if (I_AM_A_PASSENGER) { return; }

      // Save the site settings to localStorage.
      try {
        localStorage.fishTrainToolSettings =
          JSON.stringify(this.settings,
                        (key, value) => value instanceof Set ? [...value] : value);
      } catch (ex) {
        console.warn("Unable to save settings to local storage.");
      }
    }

    onFishEntryCaughtClicked(e) {
      e.stopPropagation();
      let $this = $(this);

      let model = $this.closest('.fish-entry').data('model');
      let entry = model.fishEntry;
      let fishId = entry.id;
      let listEl = model.listEl;

      // If this fish appears multiple times in the list, we need to include those
      // nodes as well.
      let entryNodes$ = $(listEl).add(
        $(`.scheduled-fish-entry[data-id="${fishId}"]`));


      if (e.data.completion.has(fishId)) {
        // Odd... but maybe they clicked it by mistake?!
        e.data.completion.delete(fishId);
        entryNodes$.find(".button.fishCaught").removeClass('green');
        entryNodes$.removeClass('fish-caught');
      } else {
        // Hurray, congrats on the catch!
        e.data.completion.add(fishId);
        entryNodes$.find(".button.fishCaught").addClass('green');
        entryNodes$.addClass('fish-caught');
      }

      // Update the local storage.
      e.data.saveCompletion();

      return false;
    }

    initializeCompletion() {
      // Intended for passengers only. Attempt loading the user's existing completion status.
      // Some users may not have any existing data. We must be very careful not to break
      // the main page in this case.
      // KEEP IN MIND, IF THE USER HAS BOTH THE MAIN TRACKER OPEN AND A FISH PASS OPEN, THE
      // CHANGES WILL NOT BE PROPAGATED!!!
      // Keeping track of this would be difficult and likely require a transaction log which
      // kinda just wastes local storage memory...

      this.completion = new Set();
      try {
        if (localStorage.getItem('fishTrackerSettings')) {
          let settings = JSON.parse(localStorage.fishTrackerSettings);
          if (settings.completed) {
            // Initialize to saved completed list.
            this.completion = new Set(settings.completed);
          }
        } else {
          // Legacy mode (or brand new user)
          if (localStorage.completed) {
            // Initialize to saved completed list.
            this.completion = new Set(JSON.parse(localStorage.completed));
          }
        }
      } catch (ex) {
        // Ignore this. This may happen if localStorage is disabled or private browsing.
        console.warn("Unable to access localStorage. Settings not restored.");
      }

      // Update the view with the restored completion status.
      let alreadyCaughtIds = this.completion;
      this.scheduleListEntries$.find('tr.fish-entry').each(function() {
        if (alreadyCaughtIds.has(Number($(this).data('id')))) {
          $(this).find('.button.fishCaught').addClass('green');
          $(this).addClass('fish-caught');
        }
      });
    }

    saveCompletion() {
      // KEEP IN MIND, IF THE USER HAS BOTH THE MAIN TRACKER OPEN AND A FISH PASS OPEN, THE
      // CHANGES WILL NOT BE PROPAGATED HERE. THIS FUNCTION WILL OVERWRITE THE CHECKLIST!
      // This function ALWAYS checks if "fishTrackerSettings" exists first!!!
      console.log("Saving completion status to local storage...");
      try {
        if (localStorage.getItem('fishTrackerSettings')) {
          let settings = JSON.parse(localStorage.fishTrackerSettings);
          // Just overwrite the `completed` field and save.
          settings.completed = this.completion;
          localStorage.fishTrackerSettings =
            JSON.stringify(settings,
                           (key, value) => value instanceof Set ? [...value] : value);
        } else {
          // Legacy mode (or brand new user)
          // Save the `completed` field directly to localStorage so when the user tries
          // out the main tracker, the full settings are created properly.
          localStorage.completed = JSON.stringify([...this.completion]);
        }
      } catch (ex) {
        console.warn("Unable to save settings to local storage.");
      }
    }

    updateScheduleBarScrollContextWidth() {
      let scheduleBarNode$ = $('.ui.fishtrain-schedule.segment .bar');
      $('.ui.fishtrain-schedule.segment .current-time-indicator-bar').css('width', scheduleBarNode$[0].clientWidth);

      let scheduleBarContainerNode$ = $('.ui.fishtrain-schedule.segment').parent();
      $('.ui.fishtrain-schedule.segment .scroll-context').css('width', Math.min(scheduleBarContainerNode$[0].clientWidth, scheduleBarNode$[0].clientWidth + 35));
    }

    serializeSchedule() {
      // All times encoded as EARTH time!
      let schedule = {
        start: +this.timeline.start,
        // HARD CODED: Make train "discoverable" in Teamcraft 12 hours prior to actual start.
        validAfter: +dateFns.addHours(this.timeline.start, -12),
        name: $('input[name="fishTrainTitle"]').val(),
        world: $('input[name="worldName"]').val(),
        conductorToken: this.settings.conductorToken,
        fish: this.scheduleEntries.map((e) => {
          return {
            id: e.fishEntry.id,
            start: +e.range.start,
            end: +e.range.end
          };
        })
      };
      return schedule;
    }

    displayTrainPassModal() {
      let clipboardLink = new ClipboardJS('#generate-train-pass-copy-link', {
        container: document.getElementById('generate-train-pass-modal')
      });
      clipboardLink.on('success', function(e) {
        e.clearSelection();
      });
      let clipboardToken = new ClipboardJS('#generate-train-pass-copy-conductorToken', {
        container: document.getElementById('generate-train-pass-modal')
      });
      clipboardToken.on('success', function(e) {
        e.clearSelection();
      });

      $('#generate-train-pass-data').val(
        "https://ff14fish.carbuncleplushy.com/trainpass/?tcid="+this.teamcraftId);
      $('#generate-train-pass-tclink')
        .attr('href', `https://ffxivteamcraft.com/fish-train/${this.teamcraftId}`)
        .text(`https://ffxivteamcraft.com/fish-train/${this.teamcraftId}`);
      $('#generate-train-pass-conductorToken').text(this.settings.conductorToken);

      // Display the modal.
      $('#generate-train-pass-modal')
      .modal({
        onHidden: function() {
          // Clean up the clipboard DOM.
          clipboardLink.destroy();
          clipboardToken.destroy();
          // Erase displayed data from form please...
          $('#generate-train-pass-data').val("");
          $('#generate-train-pass-tclink').attr('href', '').text('');
          $('#generate-train-pass-conductorToken').text("");
        },
        closeIcon: true,
        closable: false,
      })
      .modal('show');
    }

    displayUpdateTrainPassModal() {
      // Display the modal.
      let _this = this;

      $('#update-existing-train-modal')
      .modal({
        onShow: function() {
          // Prepopulate the user's conductorToken field.
          $('#update-existing-train-token input').val(_this.settings.conductorToken);

        },
        onApprove: function($element) {
          $('#update-existing-train-modal .ui.form').form('remove errors');
          // Attempt to update the train on Teamcraft.
          // Serialize fish train for Teamcraft.
          let tcPayload = _this.serializeSchedule();
          tcPayload.conductorToken = $('#update-existing-train-token input').val();
          // POST the fish train to Teamcraft to get an ID.
          fetch(`https://api.ffxivteamcraft.com/fish-train/${_this.teamcraftId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(tcPayload)
          }).then((response) => {
            if (!response.ok) {
              throw new Error(`Error communicating with Teamcraft server! Status: ${response.status}`);
            }
            return response.json();
          }).then((data) => {
            console.log("Teamcraft Response: ", data);
            // Clear the dirty flag.
            _this.scheduleDirty = false;
            // Redisplay the train pass information.
            _this.displayTrainPassModal();
          }).catch((error) => {
              // The train pass itself is not valid.
              $('#update-existing-train-modal .ui.form').form('add errors', [error.toString()]);
          })

          // Async, so always return false.
          return false;
        },
        onHidden: function() {
          $('#update-existing-train-modal .ui.form').form('clear');
        }
      })
      .modal('show');
    }

    generateTrainPass(e) {
      let _this = e.data;

      // Check if the schedule is dirty before submitting it to Teamcraft (again).
      if (!_this.scheduleDirty && _this.teamcraftId !== null) {
        _this.displayTrainPassModal();
        return;
      }

      // Check if a Teamcraft ID has already been associated with this train.
      if (_this.teamcraftId !== null) {
        _this.displayUpdateTrainPassModal();
        return;
      }

      // Serialize fish train for Teamcraft.
      let tcPayload = _this.serializeSchedule();
      // POST the fish train to Teamcraft to get an ID.
      fetch("https://api.ffxivteamcraft.com/fish-train", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tcPayload)
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`Error communicating with Teamcraft server! Status: ${response.status}`);
        }
        return response.json();
      }).then((data) => {
        console.log("Teamcraft Response: ", data);
        // Prevent multiple requests if the train configuration hasn't been modified.
        // Cache the ID response from Teamcraft.
        _this.teamcraftId = data.id;
        _this.scheduleDirty = false;
        _this.displayTrainPassModal();
      }).catch((error) => {
        console.error(error);
        $.toast({
          position: 'top attached',
          class: 'error',
          message: 'An error occurred communicating with Teamcraft'
        });
      });
    }

    editExistingTrain(e) {
      let _this = e.data;

      $('#edit-existing-train-modal')
        .modal({
          onApprove: function($element) {
            $('#edit-existing-train-modal .ui.form').form('remove errors');
            let trainPassInput = $('#edit-existing-train-data').val();
            let trainPass = undefined;
            // Validate the train pass first.
            try {
              let url = new URL(trainPassInput);
              if (url.searchParams.has('tcid')) {
                trainPass = url.searchParams.get('tcid');
              }
            } catch {
              // Assume just the pass.
              trainPass = trainPassInput;
            }
            if (trainPass === undefined ||
                trainPass == "") {
              // Mark the URL as invalid.
              $('#edit-existing-train-modal .ui.form')
                .form('add errors', ['The Train Pass URL was invalid'])
                .form('get field', 'edit-existing-train-data')
                  .closest('.field').addClass('error');
              return false;
            }
            // // Make sure they entered their ConductorToken.
            // let conductorToken = $('#edit-existing-train-token').val();
            // if (conductorToken == "") {
            //   $('#edit-existing-train-modal .ui.form')
            //     .form('add errors', ['You must enter your Conductor Token'])
            //     .form('get field', 'edit-existing-train-token')
            //       .closest('.field').addClass('error');
            //   return false;
            // }

            // NOTE: Since the rest of this is async, you need to return false.
            // Have the internal functions forcefully close the modal if needed.
            // Otherwise, validate the train pass itself.
            _this.validatePassWithTC(trainPass).then((data) => {
              // Allow the dialog to close while we load the schedule.
              $('#edit-existing-train-modal').modal('hide');
              $(() => {
                let existingSchedule = _this.convertTrainData(data, trainPass);
                _this.loadExistingTrain(existingSchedule);
              });
            }).catch((error) => {
              // The train pass itself is not valid.
              $('#edit-existing-train-modal .ui.form')
                .form('add errors', ['The Train Pass is invalid'])
                .form('get field', 'edit-existing-train-data')
                  .closest('.field').addClass('error');
              return false;
            });
            return false;
          },
          onHidden: function() {
            // Reset data and clear errors.
            $('#edit-existing-train-modal .ui.form').form('clear');
          }
        })
        .modal('show');
    }
  }

  return new _FishTrain();
}();

function debug_adjustTime(interval) {
  // Time travel using the specified interval.
  CarbyUtils.timeTravel(dateFns.add(Date.now(), interval));
  // Reset classes on fish entries.
  _(FishTrain.scheduleEntries).each(entry => {
    let scheduleEntry$ = $(entry.listEl);
    scheduleEntry$.removeClass('expired').removeClass('upcoming').removeClass('fish-active').removeClass(function(index, className) {
      return className.startsWith('upcoming-nth-') ? className : null;
    });
    // Update any intuition fish rows as well!
    for (let subEntry of entry.intuitionEntries) {
      scheduleEntry$ = $(subEntry.listEl);
      scheduleEntry$.removeClass('expired').removeClass('upcoming').removeClass('fish-active').removeClass(function(index, className) {
        return className.startsWith('upcoming-nth-') ? className : null;
      });
    }
  });
}
