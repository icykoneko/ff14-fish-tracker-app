# FFX|V Fish Tracker App
A webapp designed for tracking big fish and arranging them by which fish are less often available rather than just available right now.

I'll fill in more details later... maybe...

## Static Version

Still working on it, but I think I have most of the kinks worked out. Still a few style fixes that need to happen too.

## Building sprites
In order to cut down on GET requests, all of the images are bundled into a single sprite image.

```
sprity create ./public/images/ ./public/images/**/*.png -c . -s sprite.css --prefix sprite-icon --margin 2 --orientation binary-tree
```

Also, use the `generate_item_icon_map.py` helper script to generate a mapping of icons to include. This should probably get pushed into the main code?

## Adding new fish data
Run the local `importNewFishData_v2.py` script with `fishData-x.y.yaml` to add new fish data. This will produce `fish_data_updated.py`. After confirming the data is good, copy the file to `fish_data_current.py` run `dumpFishDataToYaml.py` to update `fishData.yaml`.  Copy `fish_data_updated.js` to `fish_data_current.js` as well. This is the data used for the web pages.
