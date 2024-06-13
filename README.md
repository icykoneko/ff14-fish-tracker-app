# FFX|V Fish Tracker App
A webapp designed for tracking big fish and arranging them by which fish are less often available rather than just available right now.

## Development Notes
### Cloning this Repo
This repo makes use of submodules. When cloning, please include the `--recurse-submodules` option.

```
git clone --recurse-submodules https://github.com/icykoneko/ff14-fish-tracker-app.git
```

If you forgot to include the submodules during cloning, don't worry. Assuming you haven't checked them out yet, running `git submodule update --recursive --init` should take care of it.

If you've already checked out the submodules and are running into issues with the SaintCoinach module, the repo address recently changed. Unfortunately, it's a pain to fix... You'll most likely need to run `git submodule sync --recursive` after pulling the latest changes. After that, the `git submodule update --recursive` command should work right. Sorry it's such a pain.

### Setup
The management of fish data is done using Python. It's recommended you create a virtual environment.
```
py -m venv pyvirt
pyvirt\Scripts\activate
pip install -r private/python-requirements.txt
```

The webapp itself is completely static. At this time, some of the development environment functions are manually driven. Recommended you install [FNM](https://github.com/Schniz/fnm).

* Install FNM: `winget install Schniz.fnm`
* Configure your shell environment (see https://github.com/Schniz/fnm#shell-setup).
* When switching into the checkout, it should automatically load `lts-dubnium`.
* Install the webapp package requirements first: `npm install`
* You need to install sprity-cli globally to get access to the CLI `sprity`.
  * `npm i sprity-cli -g`
  * `npm i sprity-jimp -g`

**NOTE:** Sprity doesn't seem to work in newer versions of Node due to dependencies... I've only had success running it via Node v10.24.1 on Windows.

This application uses GitHub Pages to host the site, but the branch isn't a perfect copy of the main branch... I highly recommend using a worktree to have the `gh-pages` branch checked out in a folder named `dist`.
```
git worktree add --track ./dist gh-pages
```

## Step-by-step Instructions for Updating Data
Sometimes you forget how to do this after several months... Clearly the TODO list isn't getting done...

* Generate new YAML data for new fish using: `python ./private/manageFishData.py addnew -p <NEW_PATCH_NUMBER> -x ./private/ignoredFish.txt`
  * Add the new fish entries to the master YAML data file at a minimum before continuing.
* Collect information from the Fish'cord regarding new fishies. Include only those fish with special catch conditions (such as weather or time of day), and all *big fish*. Update the `private/fishData.yaml` with the new additions (or changes).
  * Use the `private/fishDataTemplate.yaml` as a template for adding new records. For new patches, include a comment before the start of the patch additions (for readability-sake, I dunno...).
* Update clone of `SaintCoinach` master branch, then compare with the *my-current* branch for changes.
  * `git diff -U20 my-current`
  * If necessary, update the `saintcoinach-py` project to reflect any recent changes and comment to the local repo there. (Yes, that's right, I ported SaintCoinach to Python!)
  * Switch to the *my-current* branch, and merge the latest changes from *master*: `git merge master` or use the GitDesktop app to make life easier...
  * In this repo, use the `git submodule update --recursive --remote` command to checkout the updates.
* Rebuild the fish data JS file: `python ./private/manageFishData.py rebuild -i ./private/fishData.yaml -o ./js/app/data.js --with-icons`
  * If changes to the SaintCoinach library break the script, fix it, then commit the changes as a separate commit.
  * **NOTE:** Pay attention to the log messages. If the script extracted any new textures, you'll need to update the sprite image.
  * Update the *cache buster* in `index.html`, `fishtrain.html`, and `trainpass/index.html` for `js/app/data.js`. Use the format: `?${ver}_YYYYMMDD_HHMM`.
* Rebuild the fish guide JS file: `python ./private/rebuildFishGuide.py -o ./js/app/fish_info_data.js --with-icons`
  * If changes to the SaintCoinach library break the script, fix it, then commit the changes as a separate commit.
  * **NOTE:** Pay attention to the log messages. If the script extracted any new textures, you'll need to update the sprite image.
  * Update the *cache buster* in `index.html`, `fishtrain.html`, and `trainpass/index.html` for `js/app/fish_info_data.js`. Use the format: `?${ver}_YYYYMMDD_HHMM`.
* If adding fish for a new patch;
  * Add the new patch to `SiteSettings::filters::patch` in `viewmodel.js` and `fishtrain.js`.
  * Update the `LATEST_PATCH` to the new patch number (only needed for M.m patches, not M.mm) in `viewmodel.js` only.
    * Set the date for `SHOW_LATEST_PATCH_AFTER` to patch release date, plus 2 weeks to prevent spoilers.
  * Update the *cache buster* in `index.html` for `js/app/viewmodel.js`. Use the format: `?YYYYMMDD_HHMM`.
  * Update the *cache buster* in `fishtrain.html` and `trainpass/index.html` for `js/app/fishtrain.js`. Use the format: `?YYYYMMDD_HHMM`.
  * Replace the `disabled` class from the new patch version with `active` in `index.html` and `fishtrain.html`.
    * **NOTE:** If it's a new expansion, well... make sure it looks nice, and set the patch buttons to `disabled` at first.
* If new textures were extracted (i.e. new fish images, or new bait images);
  * Update the *cache buster* in `index.html`, `fishtrain.html`, and `trainpass/index.html` for `public/images/sprite.css`. Use the format `?${ver}_YYYYMMDD`.
  * Rebuild the sprite image using: `sprity create ./public/images/ ./private/images/**/*.png -c . -s sprite.css --prefix sprite-icon --margin 2 --orientation binary-tree --engine jimp`
    * **NOTE:** This command **must** be run via CMD, not bash. For some reason, bash will cause the entries in the CSS to be different...
  * Edit the `public/images/sprite.css` file and add a *cache buster* to the main image. Use the format: `?YYYYMMDD`.
  * Compress the `public/images/sprite.png` file using https://tinypng.com/. This should reduce its size by ~67% and that reduces bandwidth, and costs.
* Rebuild any changes made to `date-fns` using the `npm run build` command.
* Test the site locally!!! `npm start` then open http://localhost:3000/.
* Commit changes to master with an appropriate message. Don't forget to `git push` all changes to GitHub as well.
* Go fish?!

### Updating Video Links
* Remember to use ENGLISH item names, or Item ID as the key.
* Add to the `gh-pages` branch under `_data/videoGuides.yaml`.
* Validate changes via Jekyll locally before pushing branch please! You should not see any errors in the console.

### Using Cache-Buster Update Script
Instead of manually updating the pages each time, before committing changes, you can use the updateCacheBuster Python script on the list of modified files.
```bash
python ./private/updateCacheBusters.py -p ${ver} $(git status -uno --porcelain=v1 | cut -c4-)
```

### Updating the website
* Rebuild any changes made to `date-fns` using the `npm run build` command.
* Switch to the `gh-pages` branch (or `cd dist`.)
* Merge the `master` branch in. You'll need to remove the entries that only exist in master... it's annoying, sorry.
* If changes were made to the sprites, you need to place the compressed `sprite.png` and `sprite.css` files in `public/images/` for the `gh-pages` branch. This is not included in the master branch!
* Copy the contents of `public/js` from master to the `gh-pages` branch as well.
* Commit, and push changes to GitHub.

```bash
npm run build
# Assuming you've created a "workspace" folder dist that's tied to the gh-pages branch...
cd dist
# Merge master branch (deal with any "missing" files...)
git merge master
for f in $(git status --porcelain | grep "^DU" | cut -f2 -d' '); do git rm $f; done
# In case anything changed, copy files from public into the branch too.
cp -vrf ../public/images/sprite.* ./public/images/
cp -vrf ../public/js/* ./public/js/
# Remember to add them.
git add public/images/ public/js/

# Always do one final check of the site to be sure nothing got messed up in the merge.
# (This is especially important when making large changes.)
bundle exec jekyll serve

# If everything's good, commit and push.
git commit
git push
```

# Contributing
There's lots of features waiting to be implemented if you feel you have an idea for tackling them. Please follow existing code patterns with regards to style, and when possible, utilize the Semantic UI widgets so everything meshes nicely. Keep PRs simple to ensure they get merged sooner.

For changes to availability of specific fish, please contact me directly via Discord (via [Fish'cord](https://discord.gg/fishcord)). Please do not open issues here for that purpose.
