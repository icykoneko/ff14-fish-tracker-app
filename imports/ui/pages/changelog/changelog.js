import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { eorzeaTime } from '/imports/api/time/time.js';

import './changelog.html';

var timeTick = new Tracker.Dependency;
// Update the clock every 3 seconds.
Meteor.setInterval(() => { timeTick.changed(); }, 1000);

Template.App_changelog.helpers({
  eorzeaTime() {
    timeTick.depend();
    return eorzeaTime.getCurrentEorzeaDate().format("HH:mm");
  },
  earthTime() {
    timeTick.depend();
    return moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
  },
});
