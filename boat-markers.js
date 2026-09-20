(() => {
  function field(v) { return String(v ?? "").trim(); }
  function truthy(v) { return v === true || ["true","1","yes","on","有効"].includes(field(v).toLowerCase()); }
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
  function getBoatPoints() {
    if (!Array.isArray(window.mapPoints)) return [];
    return window.mapPoints.filter(point => field(point["種別"]).includes("船") && truthy(point["有効"]) && validLatLng(point["緯度"], point["経度"]));
  }
  function updateStatus(count) {
    const el = document.getElementById("boatCatchStatus");
    if (!el) return;
    el.textContent = count > 0 ? `🚤 直近7日：船アキアジ釣果 ${count}地点表示` : "🚤 直近7日：海域を確認できる船アキアジ釣果なし";
  }
  function drawBoatMarkers() {
    const map = window.salmonMap;
    if (!map || typeof L === "undefined") { updateStatus(0); return; }
    const points = getBoatPoints();
    map.eachLayer(layer => { if (layer?.options?.boatCatchMarker) map.removeLayer(layer); });
    points.forEach(point => {
      const icon = typeof window.makeEmojiIcon === "function" ? window.makeEmojiIcon("🚤") : L.divIcon({className:"emoji-marker",html:"<span style='font-size:30px'>🚤</span>",iconSize:[34,34],iconAnchor:[17,17]});
      L.marker([Number(point["緯度"]), Number(point["経度"])], { icon, boatCatchMarker:true, zIndexOffset:1000 }).addTo(map).bindPopup(boatPopup(point));
    });
    updateStatus(points.length);
  }
  function install() {
    const original = window.renderMap;
    if (typeof original === "function" && !original.__boatWrapped) {
      const wrapped = function(...args) {
        const result = original.apply(this, args);
        setTimeout(drawBoatMarkers, 300);
        return result;
      };
      wrapped.__boatWrapped = true;
      window.renderMap = wrapped;
      try { renderMap = wrapped; } catch (_) {}
    }
    setTimeout(drawBoatMarkers, 800);
    setTimeout(drawBoatMarkers, 1800);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();