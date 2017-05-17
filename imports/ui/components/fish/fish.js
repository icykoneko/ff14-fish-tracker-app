import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import './fish.html';
import { FISH_AND_TACKLE, Fishes } from '/imports/api/fishes/fishes.js';
import { completionManager } from '/imports/api/completion/client/completion.js';
import { WEATHER_TYPES, WEATHER_RATES } from '/imports/api/weatherservice/weatherservice.js';
import { FISHING_SPOTS } from '/imports/api/area/location.js';
import { eorzeaTime } from '/imports/api/time/time.js';
import { fishWatcher } from '/imports/api/fishes/fishwatcher.js';

var TIMER = new Tracker.Dependency;

function getUpdatedWindowTimer(date, _until) {
  TIMER.depend();
  if (_until)
    return moment(date).fromNow();
  else
    return moment(date).fromNow();
}

Template.fish.onCreated(function() {
  Meteor.setInterval(() => { TIMER.changed(); }, 1000);
});

Template.fish.onRendered(function() {
  $('[data-toggle="tooltip"]').tooltip();
});

Template.fish.events({
  'click .fishCaught, click .fishCaught.glyphicon'(e) {
    completionManager.toggleCaughtState(this._id);
    // IMPORTANT: Due to visual updates, you need to manually kill the tooltip.
    $(e.target).closest('[data-toggle="tooltip"]').tooltip('hide');
  },
  'click .fishPinned, click .fishPinned.glyphicon'(e) {
    completionManager.togglePinnedState(this._id);
    // IMPORTANT: Due to visual updates, you need to manually kill the tooltip.
    $(e.target).closest('[data-toggle="tooltip"]').tooltip('hide');
  }
});

function mergeCatchableRanges(crs) {
  return crs;
}

Template.fish.helpers({
  isCaught() {
    return completionManager.isFishCaught(this._id);
  },
  isPinned() {
    return completionManager.isFishPinned(this._id);
  },
  catchabilityStatus() {
    if (completionManager.isFishCaught(this._id)) {
      return "success";
    }

    var crs = mergeCatchableRanges(this.catchableRanges);
    if (crs.length > 0) {
      if (moment().isSameOrAfter(eorzeaTime.toEarth(crs[0].start()))) {
        // if (_(crs).chain()
        //      .map((r) => { return r.asDuration('minutes'); })
        //      .reduce((memo, d) => { return memo.add(d); }, moment.duration(0))
        //      .value().asHours() < 4) {
        //   // Rare fish is up!
        //   return "warning";
        // }
        // Fish is currently up.
        return "info";
      }
    }
  },
  location() {
    if (this.location !== null) {
      var fishingSpot = FISHING_SPOTS[this.location];
      return {
        'name': fishingSpot.name,
        'zoneName': WEATHER_RATES[fishingSpot.territory_id].zone_name,
        'id': fishingSpot._id
      };
    } else {
      return {'name': '', 'zoneName': '', 'id': 0};
    }
  },
  alwaysAvailable() {
    return (this.weatherSet.length == 0 && this.startHour == 0 && this.endHour == 24);
  },
  //availability() {
  availability_nextCatchable() {
    //console.log("Catchable Windows for:", this.name, this.catchableRanges);
    if (this.weatherSet.length == 0 && this.startHour == 0 && this.endHour == 24) {
      return "Always";
    }
    var crs = mergeCatchableRanges(this.catchableRanges);
    if (crs.length > 0) {
      if (moment().isBefore(eorzeaTime.toEarth(crs[0].start()))) {
        return getUpdatedWindowTimer(eorzeaTime.toEarth(crs[0].start()), true);
      } else {
        return "closes " + getUpdatedWindowTimer(eorzeaTime.toEarth(crs[0].end()), false);
      }
    } else {
      // We haven't determined the next time it will be up!
      //return "more than " + fishWatcher.getFetchDuration().humanize();
      return "unknown";
    }
  },
  availability_nextCatchable_earth() {
    var crs = mergeCatchableRanges(this.catchableRanges);
    if (crs.length > 0) {
      if (moment().isBefore(eorzeaTime.toEarth(crs[0].start()))) {
        return eorzeaTime.toEarth(crs[0].start()).local().calendar();
      } else {
        return eorzeaTime.toEarth(crs[0].end()).local().calendar();
      }
    }
  },
  availability_uptime() {
    var crs = mergeCatchableRanges(this.catchableRanges);
    if (crs.length > 0) {
      // If this fish has a predator, consider their overall time rather than
      // the overall time of this fish.
      var overallTime = +_(crs).last().end() - +_(crs).first().start();
      if (this.predator != null) {
        var predator = Fishes.findOne({_id: this.predator});
        if (predator.catchableRanges.length > 0) {
          overallTime = +_(predator.catchableRanges).last()[1] -
            +_(predator.catchableRanges).first()[0];
        }
      }
      var uptime = _(crs).reduce(
        (memo, r) => memo += (+r.end() - +r.start()), 0);
      return ((uptime / overallTime) * 100.0).toFixed(1);

      // var uptime = _(crs).chain()
      //   .map((r) => { return r.asDuration('minutes'); })
      //   .reduce((memo, d) => { return memo.add(d); }, moment.duration(0))
      //   .value()
      //   .asMinutes();
    }
  },
  next_catch_time() {
    if (this.weatherSet.length == 0 && this.startHour == 0 && this.endHour == 24) {
      return "n/a";
    }
    var crs = mergeCatchableRanges(this.catchableRanges);
    if (crs.length > 1) {
      return getUpdatedWindowTimer(eorzeaTime.toEarth(crs[1].start()), true);
    } else {
      // We haven't determined the next time it will be up!
      //return "more than " + fishWatcher.getFetchDuration().humanize();
      return "unknown";
    }
  },
  next_catch_time_earth() {
    var crs = mergeCatchableRanges(this.catchableRanges);
    if (crs.length > 1) {
      return eorzeaTime.toEarth(crs[1].start()).local().calendar();
    }
  },
  next_catch_time_attrs() {
    try {
      var crs = mergeCatchableRanges(this.catchableRanges);
      if (crs.length > 1) {
        if (eorzeaTime.toEarth(crs[0].end()).add(3, 'hours').isSameOrAfter(eorzeaTime.toEarth(crs[1].start()))) {
          return {
            style: {'font-weight': 'bold'}
          }
        }
      }
    } catch (e) {
      console.error("Cannot compute next catch time for:", this.name(), e);
    }
  },
});

Template.conditions.helpers({
  previousWeatherSet() {
    return _(this.previousWeatherSet).map((v) => WEATHER_TYPES[v]);
  },
  weatherSet() {
    return _(this.weatherSet).map((v) => WEATHER_TYPES[v]);
  },
});

Template.bait.helpers({
  hasPredators() {
    return _(this.predators).size() > 0;
  },
  // predator() {
  //   if (this.predator !== null) {
  //     return FISH_AND_TACKLE[this.predator];
  //   }
  // },
  predators() {
    if (_(this.predators).size() > 0) {
      return _(this.predators).map((v, k) => {
        var info = FISH_AND_TACKLE[k];
        return {
          count: v,
          name: info.name,
          icon: info.icon
        };
      });
    }
  },
  bestCatchPath() {
    return _(this.bestCatchPath).map((x) => {
      return FISH_AND_TACKLE[x];
    });
  },
  hookset() {
    if (this.hookset !== null) {
      return {
        type: this.hookset,
        icon: this.hookset.toLowerCase() + "_hookset.png"
      };
    }
  },
});
