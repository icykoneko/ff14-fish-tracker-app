# FFX|V Fish Tracker App
A webapp designed for tracking big fish and arranging them by which fish are less often available rather than just available right now.

## Development Notes
### Cloning this Repo
This repo makes use of submodules and symlinks. When cloning, please include the `--recurse-submodules` option.

If using Windows, you have a couple options for handling symlinks:

1. Follow the instructions in https://stackoverflow.com/questions/5917249/git-symlinks-in-windows, creating the command aliases. Then, after cloning, you should be able to just run `git submodule foreach --recursive git rm-symlinks` to convert them into hardlinks.
    * **NOTE:** You will need to run `git submodule foreach --recursive git checkout-symlinks` to restore the git symlinks.
2. Enable the permissions for creating symlinks in Git for Windows; see https://github.com/git-for-windows/git/wiki/Symbolic-Links.
    * **NOTE:** You need to start Git Bash in admin mode for it to create symlinks. If you forgot to do that during cloning, you'll need to follow the instructions in part 1 instead.

Alternatively, this workflow also works, and doesn't require any aliases. You do need to enable permissions, and will need to use admin mode for some parts:
```
git clone --recurse-submodules git@github.com:icykoneko/ff14-fish-tracker-app.git
git submodule foreach --recursive git config core.symlinks true
# As admin:
git submodule update --force --recursive
```

### Setup
The management of fish data is done using Python. It's recommended you create a virtual environment.
```
py -m venv pyvirt
pyvirt\Scripts\activate
pip install -r private/python-requirements.txt
```

The webapp itself is completely static. At this time, some of the development environment functions are manually driven. Make sure you've installed NPM and Node.JS first.

* Install the webapp package requirements first: `npm install`
* You need to install sprity-cli globally to get access to the CLI `sprity`.
  * `npm i sprity-cli -g`


## Step-by-step Instructions for Updating Data
Sometimes you forget how to do this after several months... Clearly the TODO list isn't getting done...

* Collect information from http://en.ff14angler.com/fish/ regarding new fishies. Include only those fish with special catch conditions (such as weather or time of day), and all *big fish*. Update the `private/fishData.yaml` with the new additions (or changes).
  * Use the `private/fishDataTemplate.yaml` as a template for adding new records. For new patches, include a comment before the start of the patch additions (for readability-sake, I dunno...).
  * Also get pestered by everyone in the Fish'cord. I love you guys!
* Update clone of `SaintCoinach` master branch, then compare with the *my-current* branch for changes.
  * `git diff -U20 my-current`
  * If necessary, update the `saintcoinach-py` project to reflect any recent changes and comment to the local repo there. (Yes, that's right, I ported SaintCoinach to Python!)
  * Switch to the *my-current* branch, and merge the latest changes from *master*: `git merge master` or use the GitDesktop app to make life easier...
* Rebuild the fish data JS file: `python ./private/manageFishData.py rebuild -i ./private/fishData.yaml -o ./js/app/data.js --with-icons`
  * If changes to the SaintCoinach library break the script, fix it, then commit the changes as a separate commit.
  * **NOTE:** Pay attention to the log messages. If the script extracted any new textures, you'll need to update the sprite image.
* Update the *cache buster* in `index.html` for `js/app/data.js`. Use the format: `?${ver}_YYYYMMDD`.
* If adding fish for a new patch;
  * Update the `viewModel.filter` definition in `index.html` by adding the patch version. (You'll also need to update the entry in `js/app/viewmodel.js`)
  * Remove the `disabled` class from the new patch version.
    * **NOTE:** If it's a new expansion, well... make sure it looks nice, and set the patch buttons to `disabled` at first.
* If new textures were extracted (i.e. new fish images, or new bait images);
  * Update the *cache buster* in `index.html` for `public/images/sprite.css`. Use the format `?${ver}_YYYYMMDD`.
  * Rebuild the sprite image using: `sprity create ./public/images/ ./private/images/**/*.png -c . -s sprite.css --prefix sprite-icon --margin 2 --orientation binary-tree --engine jimp`
    * **NOTE:** This command **must** be run via CMD, not bash. For some reason, bash will cause the entries in the CSS to be different...
  * Edit the `public/images/sprite.css` file and add a *cache buster* to the main image. Use the format: `?YYYYMMDD`.
  * Compress the `public/images/sprite.png` file using https://tinypng.com/. This should reduce its size by ~67% and that reduces bandwidth, and costs.
* Test the site locally!!! `npm start` then open http://localhost:3000/.
* Commit changes to master with an appropriate message. Don't forget to `git push` all changes to GitHub as well.
* Synchronize the website, run: `./private/sync-bucket.sh` from the base folder.
* Go fish?!

## TODOs
* Automation of sprite generation
* Better automation of fish data updating...
* Save the filter settings in local storage.
  * When user revisits the site, it should only compute availability for the fish being displayed.
  * Add filter settings to import/export blob.
* Provide option for displaying actual time instead of relative time by default.
* Optimize the code for refreshing fish data on screen. The for-each loop eats up a lot of time and probably doesn't need to be recomputed.
* Add GUI that resembles the in-game fishing log, allowing users an easier method of checking off the fish they've caught.
* Add area filtering?
