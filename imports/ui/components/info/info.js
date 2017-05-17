import { Fishes } from '/imports/api/fishes/fishes.js';
// import { Area, Region } from '/imports/api/area/area.js'
import { eorzeaTime } from '/imports/api/time/time.js';
import { completionManager } from '/imports/api/completion/client/completion.js';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var'

import { weatherService } from '/imports/api/weatherservice/weatherservice.js';
import { fishWatcher } from '/imports/api/fishes/fishwatcher.js';

import './info.html';

import '../fish/fish.js';

// import '../regionweather/regionweather.js';

// Template.info.onCreated(function () {
//   Meteor.subscribe('fishes.all');
// });

// YES! I KNOW THESE ARE GLOBAL!!! I'll fix this some day...
var baseTime = eorzeaTime.getCurrentEorzeaDate();
var maxTime = 0x7FFFFFFFFFFF;

function compare(a, b) {
  return a < b ? -1 : b < a ? 1 : 0;
}

function getWindowStart(windows, offset) {
  if (windows === undefined) { return maxTime; }
  if (windows.length <= offset) { return maxTime; }
  return windows[offset][0];
}
function getWindowEnd(windows, offset) {
  if (windows === undefined) { return maxTime; }
  if (windows.length <= offset) { return maxTime; }
  return windows[offset][1];
}

function compareWindows(aStart, bStart) {
  if (moment(aStart).isBefore(baseTime)) {
    aStart = moment(baseTime);
  }
  if (moment(bStart).isBefore(baseTime)) {
    bStart = moment(baseTime);
  }
  if (moment(aStart).isBefore(bStart)) {
    return -1;
  } else if (moment(aStart).isAfter(bStart)) {
    return 1;
  } else {
    return 0;
  }
}

function sortByNextAvailable(a, b) {
  return compareWindows(getWindowStart(a.catchableRanges, 0),
                        getWindowStart(b.catchableRanges, 0));
}
function getDowntimes(ranges) {
  var lastEnd = getWindowEnd(ranges, 0);
  return _(ranges).chain().drop().reduce((downtimes, range) => {
    downtimes.push(range[0] - lastEnd);
    lastEnd = range[1];
    return downtimes;
  }, []).value();
}
function getUptime(ranges) {
  if (ranges.length > 0) {
    return _(ranges).reduce((uptime, range) => {
      return uptime + (range[1] - range[0]);
    }, 0) / (_(ranges).last()[1] - _(ranges).first()[0]);
  } else {
    return 1;
  }
}
function average(values) {
  if (_(values).isEmpty()) return 0xFFFFFFFFFFFFFFFF;
  return _(values).reduce((memo, n) => memo + n, 0) / values.length;
}
function shouldLog(a, b) {
  // fishes = _([a,b]).map((x) => x.name());
  // return _(fishes).contains("Ghost Carp");
  return false;
}
function isFishAlwaysUp(fish) {
  return fish.weatherSet.length == 0 && fish.startHour == 0 && fish.endHour == 24;
}
function sortByWindowPeriods(a, b) {
  var result = 0;
  // PINNED FISH ALWAYS COME FIRST!!!
  var pinnedA = completionManager.isFishPinned(a._id) ? -1 : 1;
  var pinnedB = completionManager.isFishPinned(b._id) ? -1 : 1;
  result = compare(pinnedA, pinnedB);
  if (result != 0) {
    return result;
  }

  // Fish which are ALWAYS up should come AFTER fish with limited uptime.
  var limitedA = isFishAlwaysUp(a) ? 1 : -1;
  var limitedB = isFishAlwaysUp(b) ? 1 : -1;
  result = compare(limitedA, limitedB);
  if (shouldLog(a, b))
    console.log("Comparing all-day availability:", result,
      "\n", a.name(), isFishAlwaysUp(a),
      "\n", b.name(), isFishAlwaysUp(b));
  if (result != 0) {
    return result;
  }

  // Next, we must consider fish which are CURRENTLY available.
  result = sortByNextAvailable(a, b);
  if (shouldLog(a, b))
    console.log("Comparing next available:", result,
      "\n", a.name(), getWindowStart(a.catchableRanges, 0),
      "\n", b.name(), getWindowStart(b.catchableRanges, 0));
  if (result != 0) {
    // if (shouldLog(a, b))
    //   console.log("Comparing next available:", result,
    //     "\n", a.name(), getWindowStart(a.catchableRanges, 0),
    //     "\n", b.name(), getWindowStart(b.catchableRanges, 0));
    return result;
  }

  // // Then, how long is it until the NEXT window for that fish?
  // aDown = getDowntimes(a.catchableRanges);
  // bDown = getDowntimes(b.catchableRanges);
  //
  // // Compare the AVERAGE downtime for both fish (longer comes first)
  // result = compare(average(bDown), average(aDown));
  // if (shouldLog(a, b))
  //   console.log("Comparing downtime:", result,
  //     "\n", a.name(), aDown, average(aDown),
  //     "\n", b.name(), bDown, average(bDown));
  // if (result != 0) {
  //   // if (shouldLog(a, b))
  //   //   console.log("Comparing downtime:", a.name(), aDown, b.name(), bDown, result);
  //   return result;
  // }
  // How long is it up over the next n windows, relative to the other fish!
  aUptime = getUptime(a.catchableRanges);
  bUptime = getUptime(b.catchableRanges);
  // Compare uptime (shorter comes first)
  result = compare(aUptime, bUptime);
  if (shouldLog(a, b))
    console.log("Comparing uptime:", result,
      "\n", a.name(), aUptime,
      "\n", b.name(), bUptime);
  if (result != 0) return result;

  // If both are the same, the fish with the longer time till next window
  // comes first.
  result = compare(getWindowStart(b.catchableRanges, 1) || 0,
                   getWindowStart(a.catchableRanges, 1) || 0);
  if (shouldLog(a, b))
    console.log("Comparing time till next window:", result,
      "\n", a.name(), getWindowStart(a.catchableRanges, 1),
      "\n", b.name(), getWindowStart(b.catchableRanges, 1));
  if (result == 0) {
    // Or, which ever fish's window closes first.
    result = compare(getWindowEnd(a.catchableRanges, 0),
                     getWindowEnd(b.catchableRanges, 0));
    if (shouldLog(a, b))
      console.log("Comparing remaining window time:", result,
        "\n", a.name(), getWindowEnd(a.catchableRanges, 0),
        "\n", b.name(), getWindowEnd(b.catchableRanges, 0));
    if (result == 0) {
      // Ok fine... SORT BY ID!
      result = compare(a._id, b._id);
    }
  }

  return result;
}

var patchFilter = new ReactiveDict('patchFilter');
patchFilter.set({'2': true,
                 '2.1': true,
                 '2.2': true,
                 '2.3': true,
                 '2.4': true,
                 '2.5': true,
                 '3': true,
                 '3.1': true,
                 '3.2': true,
                 '3.3': true,
                 '3.4': true,
                 '3.5': true});

var locationFilter = new ReactiveDict('locationFilter');


Template.info.onCreated(function() {
  Meteor.autorun(() => {
    this.isReady = new ReactiveVar(false);
  });
});

Template.info.onRendered(function() {
  $.getScript(
    "https://cdnjs.cloudflare.com/ajax/libs/floatthead/2.0.3/jquery.floatThead.min.js",
    function() {
      $('#fishes').floatThead({
        // top: function () {
        //   return $('#currentTime').outerHeight(true);
        // },
        top: 50,
        position: 'fixed',
        autoReflow: true});
      $('#loadingAlert').on('closed.bs.alert', function () {
        // Realign the floating table header.
        $('#fishes').floatThead('reflow');
      })
    }
  );
  Meteor.defer(() => {
    // // Make sure the weather service has 7 days of data before starting.
    // console.log(moment().format(), "Starting forcast generation...");
    // weatherService.ensureForcasts(moment.utc(), moment.duration(14, 'days'));
    // Now, have the fish watcher starting polling availability.
    console.log(moment().format(), "Kicking off fish watcher...");
    fishWatcher.forceUpdate();
    // Now we can allow the page to fully render.
    this.isReady.set(true);
    console.info(moment().format(), "Ready to go!");
    this.$('#loadingAlert').alert('close');
  });

  // Tracker.autorun(() => {
  //   if (fishWatcher.getFetchDuration() >= fishWatcher.maxFetchDuration) {
  //     this.$('#chargingAvailRangeAlert').alert('close');
  //     console.log("Fully charged!");
  //   }
  // });
})

Template.info.helpers({
  fishes() {
    // Maybe it'd be best to do the sorting here. The reactive query will still
    // obtain the records for us.
    baseTime = eorzeaTime.getCurrentEorzeaDate();
    // // We might be still loading ranges, or simply don't have the range.
    // // Use the CURRENT fish watcher fetch duration as a MAX date.
    // maxDate = fishWatcher.getFetchDurationAsEorzeaDuration().afterMoment(baseTime);

    allFish = Fishes.find({}).fetch();
    // Collect just the pinned fish, then remove them from the list.
    pinnedFish = _(allFish).filter((v) => completionManager.isFishPinned(v._id));
    allFish = _(allFish).reject((v) => completionManager.isFishPinned(v._id));
    // Filter out patches.
    allFish = _(allFish).filter((v) => patchFilter.get(v.patch));
    if (Session.equals('completionFilter', 'uncaught')) {
      allFish = _(allFish).reject((v) => completionManager.isFishCaught(v._id));
    } else if (Session.equals('completionFilter', 'caught')) {
      allFish = _(allFish).filter((v) => completionManager.isFishCaught(v._id));
    }
    console.log("Current Eorzea Time:", +baseTime);
    // Now, add the pinned fish back into the list, after sorting them of course.
    // Pinned fish ALWAYS come first!!!
    var theFishes =
      _(allFish.concat(pinnedFish).sort((a, b) => sortByWindowPeriods(a, b))).map((v) => {
        // Convert the catchableRanges into actual ranges...
        v.catchableRanges =
          _(v.catchableRanges).map((r) => moment.utc(r[0]).twix(moment.utc(r[1])));
        return v;
      });
    //console.log("FISHES =", theFishes);
    return theFishes;
  },
  currentAvailRangeLimit() {
    //return fishWatcher.getFetchDuration().humanize();
  },
  // regions() {
  //   return _.map(Region, (value, key) => {
  //     return { _id: key, region: value };
  //   });
  // },
});

Template.info.events({
  'click #filterCompletion label'(event) {
    Session.set('completionFilter', $(event.target).find('input').data('filter'));
  },
  'click #filterPatch label'(event) {
    var e = $(event.target).find('input');
    // Bootstrap has a bug with buttons that are disabled...
    if ($(event.target).is('.disabled')) {
      event.stopImmediatePropagation();
      return false;
    }
    var newState = !e.is(':checked');
    patchFilter.set(e.data('filter'), newState);
    if (!newState)
      $(event.target).removeClass('btn-primary').addClass('btn-default');
    else
      $(event.target).removeClass('btn-default').addClass('btn-primary');
  }
});

/*
Template.info.events({
  'submit .info-link-add'(event) {
    event.preventDefault();

    const target = event.target;
    const title = target.title;
    const url = target.url;

    Meteor.call('links.insert', title.value, url.value, (error) => {
      if (error) {
        alert(error.error);
      } else {
        title.value = '';
        url.value = '';
      }
    });
  },
});
*/
