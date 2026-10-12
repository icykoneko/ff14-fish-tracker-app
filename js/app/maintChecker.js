let MaintChecker = function() {
  const CURRENT_MAINTENANCE_URL = "https://lodestonenews.com/news/maintenance/current";
  
  class _MaintChecker
  {
    constructor() {
      // On initialization, we're going to request maintenance windows ONCE.
      // That should be sufficient as I'd assume most users eventually refresh
      // the tab, or close their browser... eventually right?
      // Maybe consider setting a weekly, or daily timer? I don't want to hammer
      // another site, but LodestoneNews does provide their API for Discord feeds
      // Still... that's per server, not per use.

      this.cachedInfo = null;

      // Prime the cache immediately.
      this.promisedCache = this.getMaintenanceInfo();
    }

    async getMaintenanceInfo() {
      if (this.promisedCache !== undefined) {
        return this.promisedCache;
      }
      return fetch(new Request(CURRENT_MAINTENANCE_URL))
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          // Now we have the JSON data. We only care about the `game` item.
          const gameMaintData = data.game;
          if (gameMaintData === undefined) {
            // This means there's an API expectation issue - I'm sure someone
            // will let me know, right? There's really not much I can log besides
            // the contents of the data... so do that at least?
            console.error(JSON.stringify(data));
            throw new Error("Lodestonenews API fetch issue, please let Carby know!");
          }
          // There should normally be nothing here (i.e. empty array).
          // It will NEVER be undefined though!
          if (gameMaintData == []) {
            // Nothing to do... moving on.
            this.cachedInfo = [];
            return;
          }
          // Otherwise, we will distill it further into just start/end times.
          // In fact, let's convert the times to Eorzea time as well, or at least
          // cache that version.
          this.cachedInfo = []; // starts empty, hang on...
          for (const item of gameMaintData) {
            console.info(item.title);
            console.info(item.url);
            const earthStart = new Date(item.start);
            const earthEnd = new Date(item.end);
            const eorzeaStart = eorzeaTime.toEorzea(earthStart);
            const eorzeaEnd = eorzeaTime.toEorzea(earthEnd);
            // Store this into the cached info.
            this.cachedInfo.push({
              earth: {start: earthStart, end: earthEnd},
              eorzea: {start: eorzeaStart, end: eorzeaEnd},
            });
          }
          return this.cachedInfo;
        })
        .catch((error) => {
          console.error("Failed to fetch maintenance information:", error);
          // Don't keep trying
          this.cachedInfo = [];
        });
    }

    isWindowBlocked(range) {
      if (this.cachedInfo === null) {
        // Assume its not blocked.
        return false;
      }
      // Remember, `info` contains an array and can be empty.
      // So we have to check if ANY of the ranges in info match the input range.
      let blocked = this.cachedInfo.some(r =>
        null != dateFns.intervalIntersection(r.earth, range)
      );

      return blocked;
    }

    async isWindowBlockedAsync(range) {
      return this.getMaintenanceInfo().then(info => {
        let blocked = info.some(r =>
          null != dateFns.intervalIntersection(r.earth, range)
        );
        return blocked;
      });
    }
  }

  return new _MaintChecker();
}

let maintChecker = MaintChecker();