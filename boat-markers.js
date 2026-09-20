(() => {
  // 船釣り地点は「マップ地点」シートの種別に「船」を含めて登録する。
  // 座標を公開情報で確認できた地点だけを表示し、推測座標は使わない。
  function boatPopup(point) {
    const name = normalizeField(point["地点名"] || point["名称"] || "船釣り情報");
    const note = normalizeField(point["注意・メモ"] || point["備考"] || point["メモ"]);
    const source = normalizeField(point["情報元"]);
    return `
      <div style="min-width:210px;max-width:300px;">
        <strong>🚤 ${escapeHtml(name)}</strong>
        <hr>
        <div><b>種別:</b> 船アキアジ釣果</div>
        ${note ? `<div>${escapeHtml(note)}</div>` : ""}
        ${source ? `<div style="margin-top:8px;"><b>情報元:</b> ${escapeHtml(source)}</div>` : ""}
      </div>`;
  }

  function drawBoatMarkers() {
    if (!window.salmonMap && typeof salmonMap === "undefined") return;
    if (!Array.isArray(mapPoints)) return;
    const map = salmonMap;
    if (!map) return;

    // 再描画時の重複防止
    map.eachLayer(layer => {
      if (layer?.options?.boatCatchMarker) map.removeLayer(layer);
    });

    mapPoints
      .filter(point => {
        const type = normalizeField(point["種別"]);
        return type.includes("船") && isTrue(point["有効"]) &&
          isHokkaidoLatLng(point["緯度"], point["経度"]);
      })
      .forEach(point => {
        L.marker([Number(point["緯度"]), Number(point["経度"])], {
          icon: makeEmojiIcon("🚤"),
          boatCatchMarker: true,
          zIndexOffset: 1000
        }).addTo(map).bindPopup(boatPopup(point));
      });
  }

  const originalRenderMap = window.renderMap || renderMap;
  window.renderMap = function(...args) {
    const result = originalRenderMap.apply(this, args);
    setTimeout(drawBoatMarkers, 220);
    return result;
  };

  // app.js のグローバル関数参照も置き換える
  try { renderMap = window.renderMap; } catch (_) {}
})();