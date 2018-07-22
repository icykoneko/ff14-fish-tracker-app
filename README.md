# FFX|V Fish Tracker App
A webapp designed for tracking big fish and arranging them by which fish are less often available rather than just available right now.

## Building sprites
In order to cut down on GET requests, all of the images are bundled into a single sprite image.

```
sprity create ./public/images/ ./private/images/**/*.png -c . -s sprite.css --prefix sprite-icon --margin 2 --orientation binary-tree
```

After updating the sprites, make sure to update the _cache buster_ value in `index.html` so visitors get the latest version.

## Adding new fish data
Add new entries to the `private/fishData.yaml` file, then run `private/manageFishData.py rebuild --with-icons`. This will produce a new `data.js` file to replace the existing one in `js/app/data.js`. Any new fish icons will be extracted and added to the private images folder. Remember to rebuild the sprites and update the _cache buster_ value in `index.html` so visitors get the latest version.

## Step-by-step Instructions for Updating Data
Sometimes you forget how to do this after several months... Clearly the TODO list isn't getting done...

* Collect information from http://en.ff14angler.com/fish/ regarding new fishies. Include only those fish with special catch conditions (such as weather or time of day), and all *big fish*. Update the `private/fishData.yaml` with the new additions (or changes).
  * Use the `private/fishDataTemplate.yaml` as a template for adding new records. For new patches, include a comment before the start of the patch additions (for readability-sake, I dunno...).
* Update clone of `SaintCoinach` master branch, then compare with the *my-current* branch for changes.
  * `git diff -U20 my-current`
  * If necessary, update the `saintcoinach-py` project to reflect any recent changes and comment to the local repo there. (Yes, that's right, I ported SaintCoinach to Python!)
  * Switch to the *my-current* branch, and merge the latest changes from *master*: `git pull master` or use the GitDesktop app to make life easier...
* Rebuild the fish data JS file: `py ./private/manageFishData.py rebuild -o ./js/app/data.js --with-icons`
  * If changes to the SaintCoinach library break the script, fix it, then commit the changes as a separate commit.
  * **NOTE:** Pay attention to the log messages. If the script extracted any new textures, you'll need to update the sprite image.
* Update the *cache buster* in `index.html` for `js/app/data.js`. Use the format: `?${ver}_YYYYMMDD`.
* If adding fish for a new patch;
  * Update the `viewModel.filter` definition in `index.html` by adding the patch version. (You'll also need to update the entry in `js/app/viewmodel.js`)
  * Remove the `disabled` class from the new patch version.
    * **NOTE:** If it's a new expansion, well... make sure it looks nice, and set the patch buttons to `disabled` at first.
* If new textures were extracted (i.e. new fish images, or new bait images);
  * Update the *cache buster* in `index.html` for `public/images/sprite.css`. Use the format `?${ver}_YYYYMMDD`.
  * Rebuild the sprite image using: `sprity create ./public/images/ ./private/images/**/*.png -c . -s sprite.css --prefix sprite-icon --margin 2 --orientation binary-tree`
    * **NOTE:** This command **must** be run via CMD, not bash. For some reason, bash will cause the entries in the CSS to be different...
  * Edit the `public/images/sprite.css` file and add a *cache buster* to the main image. Use the format: `?YYYYMMDD`.
  * Compress the `public/images/sprite.png` file using https://tinypng.com/. This should reduce its size by ~67% and that reduces bandwidth, and costs.
* Test the site locally!!!
* Commit changes to master with an appropriate message. Don't forget to `git push` all changes to GitHub as well.
* Synchronize the website, run: `./private/sync-bucket.sh` from the base folder.
* Go fish?!

## TODOs
* Automation of sprite generation
* Better automation of fish data updating...
