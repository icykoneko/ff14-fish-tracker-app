///////////////////////////////////////////////////////////////////////////////
// Map Display
//
// How it works:
// - The map itself is inside a SemanticUI Modal control. The stylesheets
//   override some of the settings to make it appear centered on the page when
//   visible. In order to support common features such as panning and zooming,
//   mouse events are registed ONLY WHEN MAP IS DISPLAYED. Furthermore, certain
//   events are only active once panning has started.
//
// Scaling and Initial Positioning:
//   Special thanks to Garland Tools and SaintCoinach for all the math related
//   to map coordinates. When the map is initially displayed, it will be moved
//   such that the fishing point itself is centered. For some fishing points,
//   the radius is massive, and may not fit in the small viewport. In this
//   case, the map will be zoomed out to at least 0.25 * r to help with
//   context. All other cases will have the map at 1:1 zoom initially.
//
// Only ONE map will ever be displayed at any given time, so this component
// only needs to track that single instance.

let FishingSpotMap = function(){

  class _FishingSpotMap {
    constructor() {
      // Number of pixels representing a grid block.
      this.GRID_PIXELS = 50.0;
      // Drag properties.
      this.dragOriginX = 0;
      this.dragOriginY = 0;
      // Zoom property.
      this.zoomScale = 1.0;

      // CACHING:
      // Map images are provided by XIVAPI. The URL for these maps is also
      // determined by an AJAX call to XIVAPI. Since multiple fishing spots
      // use the same map, we can save making duplicate calls.
      // We'll depend on the browser's built-in caching for the map image
      // itself.
      this.mapUrls = {};
    }

    initialize() {
      // Call this AFTER the page is ready otherwise, these selectors won't
      // match anything!
      this.$widget = $('#fishingSpotMapModal');
      this.$mapContainer = $('#fishingSpotMapModal .map-container');
      this.$dimmer = $('#fishingSpotMapModal .dimmer');
      this.$canvas = $('#fishingSpotMapModal canvas');

      // Run initialization code for widget.
      this.$widget.modal();
    }

    displayMap(fish) {
      // fish: The {Fish} object we want to display a map for.

      // So that the user gets a smooth response, we'll immediately display
      // the modal widget, but activate a dimmer while loading the map. Once
      // the map's ready for interaction, we deactivate the dimmer and attach
      // events.

      // We need to determine the coordinates first, since they are needed for
      // both drawing the map, and attaching event listeners once the modal is
      // displayed.
      let map_scale = DATA.WEATHER_RATES[fish.location.zoneId].map_scale;
      let coords = fish.location.coords;

      // Convert the map scale into a percentage.
      let size = map_scale / 100.0;

      let img_coords = {
        x: (coords[0] - 1) * this.GRID_PIXELS * size,
        y: (coords[1] - 1) * this.GRID_PIXELS * size,
        r: ((this.GRID_PIXELS / size) * ((coords[2] * size) / 2048)) * Math.PI * 2
      };

      // Make sure the dimmer is active before showing the widget.
      this.$dimmer.addClass('active');
      this.$mapContainer.addClass('loading');
      // Reset the stateful information as well.
      this.dragOriginX = 0;
      this.dragOriginY = 0;
      this.zoomScale = 1.0;

      // Disable mouse wheel while map is being rendered.
      this.$mapContainer.on('wheel', e => false);

      this.$widget.modal({
        onShow: _.bind(this.handleOnShow, this, fish, img_coords),
        onVisible: _.bind(this.handleOnVisible, this, fish, img_coords),
        onHide: _.bind(this.handleOnHide, this),
        onHidden: _.bind(this.handleOnHidden, this)
      })
      .modal('show');
    }

    async getMapUrl(fish) {
      let self = this;
      let map_id = DATA.WEATHER_RATES[fish.location.zoneId].map_id;
      let map_url = self.mapUrls[map_id];
      if (map_url !== undefined) {
        console.info("Using cached map URL...");
        return map_url;
      }
      // Determine the URL.
      var jqxhr = $.getJSON(
        "https://xivapi.com/map/" + map_id, { columns: 'ID,MapFilename' });
      // Chain promise.
      return jqxhr.then(function(data) {
        console.info("XIVAPI Map: ", data.MapFilename);
        // Cache the result for later lookups.
        self.mapUrls[map_id] = "https://xivapi.com" + data.MapFilename;
        return self.mapUrls[map_id];
      });
    }

    handleOnShow(fish, img_coords) {
      let self = this;
      // The widget is starting to appear. While that's happening, we'll start
      // looking up the necessary information for the map.
      this.getMapUrl(fish).then(map_url => {
        console.info("Got map URL: ", map_url);
        // Next, we'll download the image and wait for it to finish.
        let map_img = new Image();
        return new Promise(resolve => {
          map_img.src = map_url;
          map_img.onload = ev => {
            resolve(map_img);
          };
        });
      }).then(map_img => {
        console.info("Map image has finished loading");
        // We're not quite done yet. Next, we need to draw our canvas.
        let ctx = self.$canvas[0].getContext('2d');

        // Start with the image of the map itself.
        ctx.drawImage(map_img, 0, 0);

        // Now, draw the fishing spot as a circle.
        ctx.beginPath();
        ctx.arc(img_coords.x, img_coords.y, img_coords.r, 0, Math.PI * 2, false);
        ctx.fillStyle = 'rgba(164, 164, 219, 0.5)';
        ctx.fill();

        // Wait ~250ms before moving on, otherwise the display acts weird.
        return new Promise(resolve => {
          window.setTimeout(() => resolve(), 250);
        });
      }).then(() => {
        // Finally, we can hide the loading message and attach events.
        self.$dimmer.removeClass('active');
        self.$mapContainer.removeClass('loading');

        self.$mapContainer.on({
          mousedown: e => {
            if (e.which != 1) return;

            self.$mapContainer.addClass('dragging');
            self.dragOriginX = e.pageX;
            self.dragOriginY = e.pageY;

            // Prevent the widget from closing if the user releases mouse
            // outside of the map.
            self.$widget.modal('remove clickaway');

            // Since the mouse could travel outside of the container, we have
            // to trap events on the ENTIRE window!
            $('html').on({
              mouseup: e => {
                // Dragging is now complete, remove the event handlers.
                $('html').off('mouseup mousemove');
                // Reset state.
                self.$mapContainer.removeClass('dragging');
                self.dragOriginX = 0;
                self.dragOriginY = 0;

                // Re-enable the clickaway setting, but wait until this event
                // is finished. Re-enabling it too early may confuse the
                // browser into thinking it should close the widget.
                _.defer(() => self.$widget.modal('set clickaway'));
                return false;
              },
              mousemove: e => {
                // Invert adjust the scroll offsets for the contain as the
                // use moves the mouse.
                let x = e.pageX;
                let y = e.pageY;
                let xDiff = self.dragOriginX - x;
                let yDiff = self.dragOriginY - y;
                if (xDiff != 0) {
                  self.$mapContainer[0].scrollLeft += xDiff;
                  self.dragOriginX = x;
                }
                if (yDiff != 0) {
                  self.$mapContainer[0].scrollTop += yDiff;
                  self.dragOriginY = y;
                }
                return false;
              }
            });
          },
          wheel: e => {
            let zoomIn = e.originalEvent.deltaY < 0;
            console.log("Zooming", zoomIn ? "in" : "out", e.originalEvent);

            let el = self.$mapContainer[0];

            // How to account for zoom.
            // Zoom will utilize the CSS 'transform' style as it's the most
            // cross-browser friendly for having the same effect. Regardless
            // of the zoom level, the act of panning the map is unaffected!

            // Check if we can still zoom out.
            if (!zoomIn && (el.scrollWidth == el.clientWidth))
            {
              console.debug("Map is already zoomed out to maximum range.");
              return false;
            }

            // Only zoom in up to 200%
            if (zoomIn && (self.zoomScale >= 2.0))
            {
              console.debug("Map is already zoomed in to maximum range.");
              return false;
            }

            // Each increment adjusts the zoom by 25%
            let delta = zoomIn > 0 ? 0.25 : -0.25;

            // This will "mess up" the current position of the map though, so we
            // have to fix the scrollLeft/scrollTop values to account for the new
            // zoomScale. Before applying the new transform, we need to compute
            // these new values. There's a catch though... because the adjustment
            // needs to be made relative to the unscaled, untranslated value.

            function toBaseScrollOffset(offset, scale) {
              return (offset + (512 * (1 - scale)) / 2) / scale;
            }

            function scaleScrollOffset(offset, scale) {
              return (offset * scale) - ((512 * (1 - scale)) / 2);
            }

            // When adjusting the zoom level, use the position of the pointer.
            // Remember, the mouse wheel even will only fire inside of the map
            // itself, so you can rely on those coordinates being useful!
            // The troubling part is... these coordinates are not immediately
            // useful; they are relative the offset data for the map-container.
            let baseContainerOffsets = self.$mapContainer.offset();
            let offsetX = (e.pageX - baseContainerOffsets.left) - (el.clientWidth / 2);
            let offsetY = (e.pageY - baseContainerOffsets.top) - (el.clientHeight / 2);

            let baseScrollLeft = toBaseScrollOffset(offsetX + el.scrollLeft, self.zoomScale);
            let baseScrollTop = toBaseScrollOffset(offsetY + el.scrollTop, self.zoomScale);

            self.zoomScale += delta;
            // The transate value needs to be half of the overall zoom factor and
            // negated.
            let translateValue = -1 * ((2048 * (1 - self.zoomScale)) / 2);

            // Adjust the CSS transform.
            // This requires two steps in order to keep the map from clipping
            // the scrollable box. First, translate the canvas by the same
            // factor as the new zoomScale, then apply the scaling.
            self.$canvas.css(
              "transform",
              `translate(${translateValue}px, ${translateValue}px) scale(${self.zoomScale},${self.zoomScale})`);

            // Now we can fix the scroll values.
            el.scrollTo({
              left: scaleScrollOffset(baseScrollLeft, self.zoomScale) - offsetX,
              top: scaleScrollOffset(baseScrollTop, self.zoomScale) - offsetY,
              behavior: 'auto'});

            return false;
          }
        });
      });
    }

    handleOnVisible(fish, img_coords) {
      console.info("Fishing Spot Map is now visible!");
      // Now we can recenter the map container. The actual displaying of the
      // map it being handled by the `handleOnShow` function, so don't worry
      // about that.
      let el = this.$mapContainer[0];
      el.scrollLeft = img_coords.x - el.clientWidth / 2;
      el.scrollTop = img_coords.y - el.clientHeight / 2;
      // TODO: Check the radius and determine if we need to zoom out.
    }

    handleOnHide() {
      console.info("Fishing Spot Map is being hidden again!");
      // Disarm all events related to the container.
      this.$mapContainer.off();
      return true;
    }

    handleOnHidden() {
      // TODO: Do any other cleanup necessary after the map is hidden.
      // RESET ANY TRANSFORMS. Attempting to do this even before reopening the
      // widget may cause visual issues and just looks dumb... By clearing the
      // style here, we can avoid all those nasty things.
      this.$canvas.css('transform', '');
    }

  };

  return new _FishingSpotMap();
}();