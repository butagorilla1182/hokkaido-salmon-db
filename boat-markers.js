(() => {
  function field(v) { return String(v ?? "").trim(); }
  function truthy(v) { return v === true || ["true","1","yes","on","有効","はい"].includes(field(v).toLowerCase()); }
  function validLatLng(lat, lng) { lat=Number(lat); lng=Number(lng); return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=40&&lat<=46.5&&lng>=138&&lng<=147; }
  function esc(s) { return field(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
  function getPoints(){ try { if(typeof mapPoints!=="undefined"&&Array.isArray(mapPoints)) return mapPoints; } catch(_){} return Array.isArray(window.mapPoints)?window.mapPoints:[]; }
  function getMap(){ try { if(typeof salmonMap!=="undefined"&&salmonMap) return salmonMap; } catch(_){} return window.salmonMap||null; }
  function boatPoints(){ return getPoints().filter(p=>field(p["種別"]).includes("船")&&truthy(p["有効"])&&validLatLng(p["緯度"],p["経度"])); }
  function fisheryPoints(){ return getPoints().filter(p=>field(p["種別"]).includes("漁業")&&truthy(p["有効"])&&validLatLng(p["緯度"],p["経度"])); }
  function boatMeta(p){ const t=field(p["種別"]), sheetIcon=field(p["アイコン"]); if(t.includes("探索")||t.includes("出船")||sheetIcon==="🛥️") return {icon:"🛥️",label:"サケ便・探索・出船（実釣未確認）"}; return {icon:"🚤",label:"遊漁船のサケ・マス実釣"}; }
  function popup(p,icon,label){ const name=field(p["地点名"]||p["名称"]||label),checked=field(p["確認日"]||p["最終確認日"]||p["最終確認日時"]),note=field(p["注意・メモ"]||p["備考"]||p["メモ"]),src=field(p["情報元"]); return `<div style="min-width:210px;max-width:310px;"><strong>${icon} ${esc(name)}</strong><hr><div><b>種別:</b> ${esc(label)}</div><div><b>📅 確認日:</b> ${esc(checked||"未登録")}</div>${note?`<div style="margin-top:6px;">${esc(note)}</div>`:""}${src?`<div style="margin-top:8px;"><b>情報元:</b> ${esc(src)}</div>`:""}</div>`; }
  function status(id,count,icon,label,none){ const el=document.getElementById(id); if(el) el.textContent=count>0?`${icon} 直近情報：${label} ${count}地点表示`:`${icon} 直近情報：${none}`; }
  function draw(){ const map=getMap(),boats=boatPoints(),fisheries=fisheryPoints(); if(map&&typeof L!=="undefined"){
      map.eachLayer(layer=>{ if(layer?.options?.boatCatchMarker||layer?.options?.commercialFisheryMarker) map.removeLayer(layer); });
      boats.forEach(p=>{ const meta=boatMeta(p); const icon=typeof makeEmojiIcon==="function"?makeEmojiIcon(meta.icon):L.divIcon({className:"emoji-marker",html:`<span style='font-size:30px'>${meta.icon}</span>`,iconSize:[34,34],iconAnchor:[17,17]}); L.marker([+p["緯度"],+p["経度"]],{icon,boatCatchMarker:true,zIndexOffset:1000}).addTo(map).bindPopup(popup(p,meta.icon,meta.label)); });
      fisheries.forEach(p=>{ const icon=typeof makeEmojiIcon==="function"?makeEmojiIcon("⚓"):L.divIcon({className:"emoji-marker",html:"<span style='font-size:30px'>⚓</span>",iconSize:[34,34],iconAnchor:[17,17]}); L.marker([+p["緯度"],+p["経度"]],{icon,commercialFisheryMarker:true,zIndexOffset:950}).addTo(map).bindPopup(popup(p,"⚓","漁業のサケ・マス漁獲／水揚げ")); });
    }
    status("boatCatchStatus",boats.length,"🚤","遊漁船サケ・マス関連","確認できる遊漁船情報なし");
    status("commercialCatchStatus",fisheries.length,"⚓","サケ・マス漁獲／水揚げ","確認できる漁業情報なし");
  }
  function install(){ [300,800,1500,2500,4000,6500].forEach(ms=>setTimeout(draw,ms)); document.querySelector('nav button[data-page="map"]')?.addEventListener("click",()=>{setTimeout(draw,250);setTimeout(draw,900);}); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install); else install();
})();