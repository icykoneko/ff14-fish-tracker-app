import { Meteor } from 'meteor/meteor';

class CompletionManager {
  constructor() {
    this.completed = new ReactiveDict('completed');
    if (localStorage.completed) {
      var completed = JSON.parse(localStorage.completed);
      this.completed.set(_(completed).reduce((o, v) => {
        o[v] = true; return o;
      }, { }));
    }
  }

  isFishCaught(fish) {
    return this.completed.get(fish);
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
}

export let completionManager = new CompletionManager;
