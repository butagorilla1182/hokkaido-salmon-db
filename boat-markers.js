(() => {
  function field(v) { return String(v ?? "").trim(); }
  function truthy(v) { return v === true || ["true","1","yes","on","有効","はい"].includes(field(v).toLowerCase()); }
  function validLatLng(lat, lng) {
    lat = Number(lat); lng = Number(lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 40 && lat <= 46.5 && lng >= 138 && lng <= 147;
  }
  function esc(s) {
    return field(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }
  function boatPopup(point) {
    const name = field(point["地点名"] || point["名称"] || "船釣り情報");
    const note = field(point["注意・メモ"] || point["備考"] || point["メモ"]);
    const source = field(point["情報元"]);
    return `<div style="min-width:210px;max-width:300px;"><strong>🚤 ${esc(name)}</strong><hr><div><b>種別:</b> 船アキアジ釣果</div>${note ? `<div>${esc(note)}</div>` : ""}${source ? `<div style="margin-top:8px;"><b>情報元:</b> ${esc(source)}</div>` : ""}</div>`;
  }
  function getPoints() {
    try { if (typeof mapPoints !== "undefined" && Array.isArray(mapPoints)) return mapPoints; } catch (_) {}
    return Array.isArray(window.mapPoints) ? window.mapPoints : [];
  }
  function getMap() {
    try { if (typeof salmonMap !== "undefined" && salmonMap) return salmonMap; } catch (_) {}
    return window.salmonMap || null;
  }
  function getBoatPoints() {
    return getPoints().filter(point => field(point["種別"]).includes("船") && truthy(point["有効"]) && validLatLng(point["緯度"], point["経度"]));
  }
  function updateStatus(count) {
    const el = document.getElementById("boatCatchStatus");
    if (!el) return;
    el.textContent = count > 0 ? `🚤 直近7日：船アキアジ釣果 ${count}地点表示` : "🚤 直近7日：海域を確認できる船アキアジ釣果なし";
  }
  function drawBoatMarkers() {
    const map = getMap();
    const points = getBoatPoints();
    if (map && typeof L !== "undefined") {
      map.eachLayer(layer => { if (layer?.options?.boatCatchMarker) map.removeLayer(layer); });
      points.forEach(point => {
        const icon = (typeof makeEmojiIcon === "function") ? makeEmojiIcon("🚤") : L.divIcon({className:"emoji-marker",html:"<span style='font-size:30px'>🚤</span>",iconSize:[34,34],iconAnchor:[17,17]});
        L.marker([Number(point["緯度"]), Number(point["経度"])], {icon, boatCatchMarker:true, zIndexOffset:1000}).addTo(map).bindPopup(boatPopup(point));
      });
    }
    updateStatus(points.length);
  }
  function install() {
    // app.js の let 変数は window のプロパティではないため、同じグローバルスコープから直接参照する。
    // Sheet読込完了時刻に左右されないよう短時間ポーリングし、確認中表示を必ず確定させる。
    [300, 800, 1500, 2500, 4000, 6500].forEach(ms => setTimeout(drawBoatMarkers, ms));

    document.querySelector('nav button[data-page="map"]')?.addEventListener("click", () => {
      setTimeout(drawBoatMarkers, 250);
      setTimeout(drawBoatMarkers, 900);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();