let CheckForUpdates = function() {

  class _CheckForUpdates
  {
    checkForUpdates(current_sha) {
      this.currentVersionSha = current_sha;
      console.log("Setting current deployment to %s", current_sha);
      // Obtain the last modified time information (this can be done asyncly)
      octokit.repos.getDeployments({
        owner: "icykoneko",
        repo: "ff14-fish-tracker-app",
        sha: current_sha
      }).then(result => {
        let siteUpdatedDate = new Date(Date.parse(result.data[0].updated_at));
        if (current_sha === "") {
          // WORKAROUND: https://github.com/jekyll/github-metadata/issues/220
          current_sha = result.data[0].sha;
          console.info("APPLYING WORKAROUND: Github Pages Metadata fix; setting current deployment to %s", current_sha);
          this.currentVersionSha = current_sha
        }
        $('#site-version').text(new Intl.DateTimeFormat(undefined, {
          year: 'numeric', month: 'numeric', day: 'numeric',
          hour: 'numeric', minute: 'numeric', second: 'numeric',
          timeZoneName: 'short' }).format(siteUpdatedDate));
      }).catch(error => { /* do nothing */ });
      // Periodically check for updates by invoking onCheckForUpdates.
      setTimeout(this.onCheckForUpdates.bind(this), 5 * 60 * 1000, null);
    }

    onCheckForUpdates(current_sha=null) {
      octokit.repos.getDeployments({
        owner: "icykoneko",
        repo: "ff14-fish-tracker-app",
        per_page: 1
      }).then(result => {
        if (result.data.length > 0) {
          console.log("Checking for updates... latest deployment is %s", result.data[0].sha);
          if (result.data[0].sha != this.currentVersionSha) {
            // Change the last update menu item to reflect.
            console.info("A newer version of the site is available. Please reload the page.");
            $('#site-last-update')
              .addClass('update-available')
              .html("<i class=\"exclamation triangle icon\"></i> <span><a class=\"ui link\" href=\"\">Refresh</a> for Update!</span>");
            $('#site-last-update a.link').on('click', function() {
              // Reload the site.
              document.refresh();
            });
          } else {
            // Check again later.
            setTimeout(this.onCheckForUpdates.bind(this), 5 * 60 * 1000, null);
          }
        }
      }).catch(error => {
        console.warn("Failed to check for updates...", error);
      });
    }
  }

  return new _CheckForUpdates();
}();