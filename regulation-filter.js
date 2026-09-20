// 河口規制マップ: 「今日」と「日付指定」で規制ピンを絞り込む
(() => {
  let mode = "today";
  let selectedDate = localISODate(new Date());

  function localISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function mdNumber(month, day) {
    return month * 100 + day;
  }

  function parseMD(text) {
    const m = String(text || "").trim().match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
    return m ? { month: Number(m[1]), day: Number(m[2]) } : null;
  }

  // 例: 5/1〜6/30、8/20〜11/30 / 9/1〜翌5/31 / 4/1〜8/19（海区）、8/20〜11/30
  function regulationActiveOn(row, isoDate) {
    const date = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    const target = mdNumber(date.getMonth() + 1, date.getDate());
    const raw = normalizeField(row["禁止期間"] || `${row["開始日"] || ""}〜${row["終了日"] || ""}`);
    if (!raw) return false;

    const ranges = raw.split(/[、,]/).map(x => x.trim()).filter(Boolean);
    return ranges.some(part => {
      const pair = part.split(/[〜～~-]/);
      if (pair.length < 2) return false;
      const start = parseMD(pair[0]);
      const end = parseMD(pair.slice(1).join("〜"));
      if (!start || !end) return false;
      const s = mdNumber(start.month, start.day);
      const e = mdNumber(end.month, end.day);
      return s <= e ? target >= s && target <= e : target >= s || target <= e;
    });
  }

  function isRegulationMarker(layer) {
    if (!(layer instanceof L.Marker)) return false;
    const html = String(layer?.options?.icon?.options?.html || "");
    return html.includes("⚠️");
  }

  function clearRegulationMarkers() {
    if (!salmonMap) return;
    const remove = [];
    salmonMap.eachLayer(layer => {
      if (isRegulationMarker(layer)) remove.push(layer);
    });
    remove.forEach(layer => salmonMap.removeLayer(layer));
  }

  function currentFilterDate() {
    return mode === "today" ? localISODate(new Date()) : selectedDate;
  }

  function drawFilteredRegulations() {
    if (!salmonMap || !Array.isArray(regulations)) return;
    clearRegulationMarkers();

    const targetDate = currentFilterDate();
    regulations
      .filter(row =>
        normalizeField(row["座標確認状態"]) === "検証済" &&
        isHokkaidoLatLng(row["緯度"], row["経度"]) &&
        regulationActiveOn(row, targetDate)
      )
      .forEach(row => {
        L.marker([Number(row["緯度"]), Number(row["経度"])], {
          icon: makeEmojiIcon("⚠️")
        })
          .addTo(salmonMap)
          .bindPopup(regulationPopup(row));
      });

    const status = document.getElementById("regulationFilterStatus");
    if (status) {
      const count = regulations.filter(row =>
        normalizeField(row["座標確認状態"]) === "検証済" &&
        isHokkaidoLatLng(row["緯度"], row["経度"]) &&
        regulationActiveOn(row, targetDate)
      ).length;
      status.textContent = `${targetDate}：河口規制 ${count}地点表示`;
    }
  }

  function setActiveButtons() {
    const today = document.getElementById("regTodayBtn");
    const specified = document.getElementById("regDateBtn");
    if (today) {
      today.style.background = mode === "today" ? "#0b1720" : "#fff";
      today.style.color = mode === "today" ? "#fff" : "#0b1720";
    }
    if (specified) {
      specified.style.background = mode === "date" ? "#0b1720" : "#fff";
      specified.style.color = mode === "date" ? "#fff" : "#0b1720";
    }
  }

  function setupRegulationFilter() {
    const mapEl = document.getElementById("salmonMap");
    if (!mapEl || document.getElementById("regulationFilter")) return;

    const box = document.createElement("div");
    box.id = "regulationFilter";
    box.style.cssText = "margin:0 0 12px;padding:12px;background:#fff;border-radius:18px;box-shadow:0 5px 18px rgba(0,0,0,.08);";
    box.innerHTML = `
      <div style="font-weight:800;margin-bottom:8px;">⚠️ 河口規制表示</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button id="regTodayBtn" type="button" style="border:1px solid #ccd5da;border-radius:999px;padding:9px 13px;font-weight:700;">今日の河口規制</button>
        <button id="regDateBtn" type="button" style="border:1px solid #ccd5da;border-radius:999px;padding:9px 13px;font-weight:700;">📅 日付指定</button>
        <input id="regDateInput" type="date" value="${selectedDate}" style="display:none;border:1px solid #ccd5da;border-radius:10px;padding:8px;font-size:16px;">
      </div>
      <div id="regulationFilterStatus" style="margin-top:8px;font-size:13px;color:#5d6b73;"></div>
    `;
    mapEl.parentNode.insertBefore(box, mapEl);

    document.getElementById("regTodayBtn")?.addEventListener("click", () => {
      mode = "today";
      document.getElementById("regDateInput").style.display = "none";
      setActiveButtons();
      drawFilteredRegulations();
    });

    document.getElementById("regDateBtn")?.addEventListener("click", () => {
      mode = "date";
      const input = document.getElementById("regDateInput");
      input.style.display = "inline-block";
      setActiveButtons();
      drawFilteredRegulations();
      input.focus();
    });

    document.getElementById("regDateInput")?.addEventListener("change", e => {
      if (!e.target.value) return;
      selectedDate = e.target.value;
      mode = "date";
      setActiveButtons();
      drawFilteredRegulations();
    });

    setActiveButtons();
  }

  // 既存renderMapの通常ピン描画は維持し、規制ピンだけ日付で差し替える。
  const originalRenderMap = renderMap;
  renderMap = function() {
    originalRenderMap();
    setupRegulationFilter();
    setTimeout(drawFilteredRegulations, 180);
  };

  setupRegulationFilter();
})();