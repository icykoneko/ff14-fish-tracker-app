# FFX|V Fish Tracker App
A webapp designed for tracking big fish and arranging them by which fish are less often available rather than just available right now.

## Building sprites
In order to cut down on GET requests, all of the images are bundled into a single sprite image.

```
sprity create ./public/images/ ./private/images/**/*.png -c . -s sprite.css --prefix sprite-icon --margin 2 --orientation binary-tree
```

Also, use the `generate_item_icon_map.py` helper script to generate a mapping of icons to include. This should probably get pushed into the main code?

After updating the sprites, make sure to update the _cache buster_ value in `index.html` so visitors get the latest version.

## Adding new fish data
Run the local `importNewFishData_v2.py` script with `fishData-x.y.yaml` to add new fish data. This will produce `fish_data_updated.py`. After confirming the data is good, copy the file to `fish_data_current.py` run `dumpFishDataToYaml.py` to update `fishData.yaml`.  Copy `fish_data_updated.js` to `fish_data_current.js` as well. This is the data used for the web pages. Copy it to `js/app/data.js`, then, update the _cache buster_ value in `index.html` so visitors get the latest version.

## TODOs
* Automation of sprite generation
* Better automation of fish data updating...
* Consider committing the _raw_ fish data YAML files and scripts (this has very specific scripts I wasn't planning to share... so, maybe not...)
