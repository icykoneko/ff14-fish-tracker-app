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

## TODOs
* Automation of sprite generation
* Better automation of fish data updating...
