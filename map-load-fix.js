// Re-render the Leaflet map if the user opened the map before Google Sheet data finished loading.
// app.js marks the map as rendered even when the data arrays are still empty; in that race,
// the base map appears but no markers are created.
(function () {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;

    try {
      const mapPage = document.getElementById("map");
      const mapEl = document.getElementById("salmonMap");
      if (!mapPage || !mapEl) return;

      const dataReady =
        (typeof areaMasters !== "undefined" && areaMasters.length > 0) ||
        (typeof mapPoints !== "undefined" && mapPoints.length > 0) ||
        (typeof regulations !== "undefined" && regulations.length > 0);

      const mapExists = typeof salmonMap !== "undefined" && salmonMap;
      const markerCount = mapEl.querySelectorAll(".leaflet-marker-icon").length;

      if (dataReady && mapExists && markerCount === 0) {
        salmonMap.remove();
        salmonMap = null;
        mapRendered = false;
        renderMap();
      }

      if (dataReady && (!mapExists || markerCount > 0)) {
        clearInterval(timer);
      }
    } catch (e) {
      console.warn("map-load-fix", e);
    }

    if (attempts >= 40) clearInterval(timer);
  }, 250);
})();
