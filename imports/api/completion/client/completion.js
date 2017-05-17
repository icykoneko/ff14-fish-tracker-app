import { Meteor } from 'meteor/meteor';

class CompletionManager {
  constructor() {
    this.completed = new ReactiveDict('completed');
    this.pinned = new ReactiveDict('pinned');
    if (localStorage.completed) {
      var completed = JSON.parse(localStorage.completed);
      this.completed.set(_(completed).reduce((o, v) => {
        o[v] = true; return o;
      }, { }));
    }
    if (localStorage.pinned) {
      var pinned = JSON.parse(localStorage.pinned);
      this.pinned.set(_(pinned).reduce((o, v) => {
        o[v] = true; return o;
      }, { }));
    }
  }

  isFishCaught(fish) {
    return this.completed.get(fish);
  }

  isFishPinned(fish) {
    return this.pinned.get(fish);
  }

  toggleCaughtState(fish) {
    if (this.isFishCaught(fish)) {
      this.completed.set(fish, false);
    } else {
      this.completed.set(fish, true);
    }
    var completed = _(this.completed.all())
      .reduce((a, v, k) => {
        if (v === true) { a.push(k); }
        return a;
      }, [ ]);
    localStorage.completed = JSON.stringify(completed);
  }

  togglePinnedState(fish) {
    if (this.isFishPinned(fish)) {
      this.pinned.set(fish, false);
    } else {
      this.pinned.set(fish, true);
    }
    var pinned = _(this.pinned.all())
      .reduce((a, v, k) => {
        if (v === true) { a.push(k); }
        return a;
      }, [ ]);
    localStorage.pinned = JSON.stringify(pinned);
  }
}

export let completionManager = new CompletionManager;
