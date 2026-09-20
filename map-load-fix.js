// Re-render the Leaflet map if the user opened the map before Google Sheet data finished loading.
// Also keep map-point popups explicit about when each item was confirmed.
(function () {
  // app.js is loaded before this file. Override its popup renderer so every map point
  // can show the dedicated 「確認日」 column from マップ地点.
  window.mapPointPopup = function (point) {
    const type = normalizeField(point["種別"]);
    const name = normalizeField(point["地点名"] || point["名称"] || "地点");
    const checked = normalizeField(point["確認日"] || point["最終確認日"] || point["最終確認日時"]);
    const note = normalizeField(point["注意・メモ"] || point["備考"] || point["メモ"]);
    const source = normalizeField(point["情報元"] || point["URL"] || point["出典"]);
    const sourceHtml = source && /^https?:\/\//i.test(source)
      ? `<div><b>情報元:</b> <a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source)}</a></div>`
      : (source ? `<div><b>情報元:</b> ${escapeHtml(source)}</div>` : "");
    return `<div style="min-width:200px;max-width:280px;"><strong>${escapeHtml(name)}</strong><hr><div><b>種別:</b> ${escapeHtml(type || "未設定")}</div><div><b>📅 確認日:</b> ${escapeHtml(checked || "未登録")}</div>${note ? `<div>${escapeHtml(note)}</div>` : ""}${sourceHtml}</div>`;
  };

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
