const API =
  "https://script.google.com/macros/s/AKfycbzUWA0w2_MzltOtgGSBStBZKHzTaHt41DF2-3nw9niiMTOSHQRjNkbz5nETV8j_Mw0_/exec";

// ========================================
// 地図 初期表示
// ========================================
const HOKKAIDO_CENTER = [43.05, 142.35];
const HOKKAIDO_ZOOM = 7;

let summaries = [];
let catches = [];
let areaMasters = [];
let mapPoints = [];
let regulations = [];

let salmonMap = null;
let mapRendered = false;

async function getSheet(sheet) {
  const res = await fetch(`${API}?sheet=${encodeURIComponent(sheet)}`, {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`${sheet}: HTTP ${res.status}`);
  }

  const json = await res.json();

  if (!json.ok) {
    throw new Error(`${sheet}: API error`);
  }

  return json.data || [];
}

function normalizeField(v) {
  return String(v ?? "").trim();
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getDate(row) {
  return normalizeField(row["実釣日"] || row["確認日"] || row["日付"]);
}

function getCatchCount(row) {
  const n = Number(row["釣果本数"]);
  return Number.isFinite(n) ? n : 0;
}

function trustScore(v) {
  const s = normalizeField(v).toUpperCase();

  if (s.startsWith("A")) return 3;
  if (s.startsWith("B")) return 2;
  if (s.startsWith("C")) return 1;

  return 0;
}

function isTrue(v) {
  return ["TRUE", "1", "YES", "有効", "はい"].includes(
    normalizeField(v).toUpperCase()
  );
}

function validLatLng(lat, lng) {
  const a = Number(lat);
  const b = Number(lng);

  return (
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    a >= -90 &&
    a <= 90 &&
    b >= -180 &&
    b <= 180
  );
}

// 北海道周辺かどうか
// 異常座標が混ざっても地図表示には影響させない
function isHokkaidoLatLng(lat, lng) {
  const a = Number(lat);
  const b = Number(lng);

  return (
    validLatLng(a, b) &&
    a >= 40.0 &&
    a <= 46.5 &&
    b >= 138.0 &&
    b <= 147.0
  );
}

function setupAreas() {
  const select = document.getElementById("area");
  if (!select) return;

  const values = [
    ...new Set(
      catches
        .map(x => normalizeField(x["エリア"]))
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "ja"));

  select.innerHTML =
    `<option value="all">すべて</option>` +
    values
      .map(
        v =>
          `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`
      )
      .join("");
}

function setupFishSpecies() {
  const select = document.getElementById("fish");
  if (!select) return;

  const values = [
    ...new Set(
      catches
        .map(x => normalizeField(x["魚種"]))
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "ja"));

  select.innerHTML =
    `<option value="all">すべて</option>` +
    values
      .map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)
      .join("");
}

function render() {
  const fish = document.getElementById("fish")?.value || "all";
  const area = document.getElementById("area")?.value || "all";
  const caught = document.getElementById("caught")?.value || "all";
  const trust = document.getElementById("trust")?.value || "all";
  const time = document.getElementById("time")?.value || "all";
  const dateFrom = document.getElementById("dateFrom")?.value || "";
  const dateTo = document.getElementById("dateTo")?.value || "";
  const sort = document.getElementById("sort")?.value || "new";

  let rows = catches.filter(row => {
    const rowFish = normalizeField(row["魚種"]);
    const rowArea = normalizeField(row["エリア"]);
    const rowTime = normalizeField(row["時間帯"]);
    const rowTrust = normalizeField(row["信頼度"]);
    const rowDate = getDate(row);
    const count = getCatchCount(row);

    if (fish !== "all" && rowFish !== fish) return false;
    if (area !== "all" && rowArea !== area) return false;

    if (caught === "yes" && count <= 0) return false;
    if (caught === "no" && count > 0) return false;

    if (trust !== "all") {
      if (trustScore(rowTrust) < trustScore(trust)) return false;
    }

    if (time !== "all" && !rowTime.includes(time)) return false;

    if (dateFrom && rowDate && rowDate < dateFrom) return false;
    if (dateTo && rowDate && rowDate > dateTo) return false;

    return true;
  });

  if (sort === "new") {
    rows.sort((a, b) => getDate(b).localeCompare(getDate(a)));
  }

  if (sort === "old") {
    rows.sort((a, b) => getDate(a).localeCompare(getDate(b)));
  }

  if (sort === "catch") {
    rows.sort((a, b) => getCatchCount(b) - getCatchCount(a));
  }

  if (sort === "trust") {
    rows.sort(
      (a, b) =>
        trustScore(b["信頼度"]) - trustScore(a["信頼度"])
    );
  }

  const countEl = document.getElementById("count");

  if (countEl) {
    countEl.textContent = `${rows.length}件`;
  }

  const cards = document.getElementById("cards");
  if (!cards) return;

  if (!rows.length) {
    cards.innerHTML =
      `<div class="empty">条件に一致する情報はありません。</div>`;
    return;
  }

  cards.innerHTML = rows
    .map(row => {
      const trustClass =
        normalizeField(row["信頼度"]).charAt(0).toUpperCase();

      return `
        <article class="card">
          <div class="top">
            <h3>${escapeHtml(row["エリア"] || "未分類")}</h3>

            <span class="chip ${escapeHtml(trustClass)}">
              信頼度 ${escapeHtml(row["信頼度"] || "-")}
            </span>
          </div>

          <div class="meta">
            ${escapeHtml(getDate(row) || "-")}
            ${
              row["時間帯"]
                ? `・${escapeHtml(row["時間帯"])}`
                : ""
            }
          </div>

          ${
            row["具体地点"]
              ? `<span class="chip">📍 ${escapeHtml(
                  row["具体地点"]
                )}</span>`
              : ""
          }

          ${
            row["釣果本数"] !== ""
              ? `<span class="chip">🎣 ${escapeHtml(
                  row["釣果本数"]
                )}本</span>`
              : ""
          }

          ${
            row["釣法"]
              ? `<span class="chip">${escapeHtml(
                  row["釣法"]
                )}</span>`
              : ""
          }

          ${
            row["風・波・濁り"]
              ? `<p>${escapeHtml(row["風・波・濁り"])}</p>`
              : ""
          }

          ${
            row["メモ"]
              ? `<p>${escapeHtml(row["メモ"])}</p>`
              : ""
          }

          <div class="meta">
            ${escapeHtml(
              row["情報源"] || row["情報区分"] || ""
            )}
          </div>
        </article>
      `;
    })
    .join("");
}

function getLatestSummary() {
  if (!summaries.length) return [];

  const dates = summaries
    .map(x => normalizeField(x["日付"]))
    .filter(Boolean)
    .sort();

  const latest = dates[dates.length - 1];

  return summaries.filter(
    x => normalizeField(x["日付"]) === latest
  );
}

// 列名の空白・全角括弧の違いを吸収して取得する。
function renderOtherFish(row) {
  const target = "今釣れてる魚(アキアジ以外)";
  const key = Object.keys(row || {}).find(
    name => name.normalize("NFKC").replace(/\s+/g, "") === target
  );
  const value = normalizeField(key ? row[key] : "");

  return `
    <div class="detail other-fish">
      <strong>🐟 今釣れてる魚（アキアジ以外）</strong>
      <p style="white-space: pre-wrap; overflow-wrap: anywhere;">${escapeHtml(value || "情報未確認")}</p>
    </div>
  `;
}

function renderSummary() {
  const rows = getLatestSummary().sort(
    (a, b) =>
      Number(a["順位"] || 999) -
      Number(b["順位"] || 999)
  );

  const hero = document.querySelector("#summary .hero");
  const box = document.getElementById("summaryCards");

  if (!rows.length) {
    if (hero) {
      hero.innerHTML =
        `<small>Google Sheet LIVE</small><h3>最新情報なし</h3>`;
    }

    if (box) {
      box.innerHTML =
        `<div class="empty">日次サマリーがありません。</div>`;
    }

    return;
  }

  const latestDate = normalizeField(rows[0]["日付"]);

  if (hero) {
    hero.innerHTML = `
      <small>Google Sheet LIVE</small>
      <h3>${escapeHtml(latestDate)} 最新状況</h3>
    `;
  }

  if (!box) return;

  box.innerHTML = rows
    .map(
      row => `
        <article class="card">
          <div class="top">
            <h3>
              ${escapeHtml(row["順位"] || "-")}位　
              ${escapeHtml(row["エリア"] || "-")}
            </h3>
          </div>

          <p>
            <strong>
              ${escapeHtml(row["総合判定"] || "-")}
            </strong>
          </p>

          ${
            row["直近実釣果"]
              ? `<p>🎣 ${escapeHtml(row["直近実釣果"])}</p>`
              : ""
          }

          ${
            row["群れ・接岸"]
              ? `<p>🐟 ${escapeHtml(row["群れ・接岸"])}</p>`
              : ""
          }

          ${
            row["風・波・濁り"]
              ? `<p>🌊 ${escapeHtml(row["風・波・濁り"])}</p>`
              : ""
          }

          ${
            row["有望時間・潮"]
              ? `<p>⏰ ${escapeHtml(row["有望時間・潮"])}</p>`
              : ""
          }

          ${
            row["狙い目・注意"]
              ? `<p>💡 ${escapeHtml(row["狙い目・注意"])}</p>`
              : ""
          }

          ${renderOtherFish(row)}

          <div class="meta">
            更新 ${escapeHtml(row["更新時刻"] || "-")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderAnalysis() {
  const box = document.getElementById("analysisBox");
  if (!box) return;

  if (!catches.length) {
    box.innerHTML = `
      <small>Google Sheet LIVE</small>
      <h3>分析対象データなし</h3>
    `;
    return;
  }

  const caughtRows =
    catches.filter(x => getCatchCount(x) > 0);

  const areaCounts = {};

  caughtRows.forEach(row => {
    const area =
      normalizeField(row["エリア"]) || "未分類";

    areaCounts[area] =
      (areaCounts[area] || 0) +
      getCatchCount(row);
  });

  const ranking =
    Object.entries(areaCounts)
      .sort((a, b) => b[1] - a[1]);

  box.innerHTML = `
    <small>Google Sheet LIVE</small>
    <h3>登録 ${catches.length}件</h3>

    <p>釣果あり記録：${caughtRows.length}件</p>

    ${
      ranking.length
        ? ranking
            .map(
              ([area, count], i) =>
                `<p>${i + 1}. ${escapeHtml(area)}：${count}本</p>`
            )
            .join("")
        : "<p>釣果数データはまだありません。</p>"
    }
  `;
}

function findSummaryForArea(master) {
  const latest = getLatestSummary();

  const code = normalizeField(master["エリアコード"]);
  const region = normalizeField(master["地域"]);
  const name = normalizeField(master["表示名"]);

  return latest.find(
    x =>
      (code &&
        normalizeField(x["エリアコード"]) === code) ||
      (region &&
        normalizeField(x["エリア"]) === region) ||
      (name &&
        normalizeField(x["エリア"]) === name)
  );
}

function findLatestCatch(master) {
  const code = normalizeField(master["エリアコード"]);
  const region = normalizeField(master["地域"]);
  const name = normalizeField(master["表示名"]);

  return catches
    .filter(
      x =>
        (code &&
          normalizeField(x["エリアコード"]) === code) ||
        (region &&
          normalizeField(x["エリア"]) === region) ||
        (name &&
          normalizeField(x["エリア"]) === name)
    )
    .sort(
      (a, b) =>
        getDate(b).localeCompare(getDate(a))
    )[0];
}

function markerColor(summary) {
  const text =
    normalizeField(summary?.["総合判定"]);

  if (
    text.includes("有望") ||
    text.includes("魚は確認") ||
    text.includes("重点")
  ) {
    return "#2ecc71";
  }

  if (
    text.includes("監視") ||
    text.includes("新報待ち") ||
    text.includes("様子見")
  ) {
    return "#f1c40f";
  }

  return "#95a5a6";
}

function makeDivIcon(color) {
  return L.divIcon({
    className: "salmon-div-icon",
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,.45);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12]
  });
}

function makeEmojiIcon(emoji) {
  return L.divIcon({
    className: "emoji-div-icon",
    html: `<div style="font-size:26px;line-height:28px;text-shadow:0 1px 4px rgba(255,255,255,.95),0 1px 5px rgba(0,0,0,.35);">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
}

function summaryPopup(master, summary, latestCatch) {
  const name =
    normalizeField(master["表示名"] || master["地域"] || "未設定");

  const latestCatchText = latestCatch
    ? `${getDate(latestCatch) || "日付不明"} / ${normalizeField(latestCatch["具体地点"]) || "地点不明"} / ${normalizeField(latestCatch["釣果本数"]) || "0"}本`
    : "釣果記録なし";

  return `
    <div style="min-width:220px;max-width:280px;">
      <strong>${escapeHtml(name)}</strong>
      <hr>
      <div><b>総合判定:</b> ${escapeHtml(summary?.["総合判定"] || "未確認")}</div>
      <div><b>直近実釣:</b> ${escapeHtml(latestCatchText)}</div>
      <div><b>群れ・接岸:</b> ${escapeHtml(summary?.["群れ・接岸"] || "未確認")}</div>
      <div><b>狙い目:</b> ${escapeHtml(summary?.["狙い目・注意"] || "未確認")}</div>
      <br>
      <button onclick="openAreaSearch('${escapeHtml(normalizeField(master["地域"] || name))}')">このエリアの釣果を見る</button>
    </div>
  `;
}

function mapPointPopup(point) {
  const type = normalizeField(point["種別"]);
  const name = normalizeField(point["地点名"] || point["名称"] || "地点");
  const note = normalizeField(point["備考"] || point["メモ"]);

  return `
    <div style="min-width:200px;max-width:280px;">
      <strong>${escapeHtml(name)}</strong>
      <hr>
      <div><b>種別:</b> ${escapeHtml(type || "未設定")}</div>
      ${note ? `<div>${escapeHtml(note)}</div>` : ""}
    </div>
  `;
}

function regulationPopup(row) {
  const river = normalizeField(row["河川名"] || "河川名未確認");
  const start = normalizeField(row["開始日"]);
  const end = normalizeField(row["終了日"]);
  const left = normalizeField(row["左岸距離"]);
  const right = normalizeField(row["右岸距離"]);
  const offshore = normalizeField(row["沖合距離"]);
  const source = normalizeField(row["公式情報源URL"]);
  const checked = normalizeField(row["最終確認日時"]);

  return `
    <div style="min-width:220px;max-width:300px;">
      <strong>⚠️ ${escapeHtml(river)} 河口規制</strong>
      <hr>
      <div><b>期間:</b> ${escapeHtml(start || "未確認")} ～ ${escapeHtml(end || "未確認")}</div>
      <div><b>左岸:</b> ${escapeHtml(left || "未確認")}</div>
      <div><b>右岸:</b> ${escapeHtml(right || "未確認")}</div>
      <div><b>沖合:</b> ${escapeHtml(offshore || "未確認")}</div>
      <div><b>最終確認:</b> ${escapeHtml(checked || "未確認")}</div>
      ${source ? `<div><a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">公式根拠を開く</a></div>` : ""}
    </div>
  `;
}

function renderMap() {
  if (mapRendered || !window.L) return;

  const mapEl = document.getElementById("salmonMap");
  if (!mapEl) return;

  salmonMap = L.map("salmonMap", {
    zoomControl: true,
    minZoom: 5,
    maxZoom: 18
  }).setView(HOKKAIDO_CENTER, HOKKAIDO_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(salmonMap);

  areaMasters
    .filter(row => isHokkaidoLatLng(row["緯度"], row["経度"]))
    .forEach(master => {
      const lat = Number(master["緯度"]);
      const lng = Number(master["経度"]);
      const summary = findSummaryForArea(master);
      const latestCatch = findLatestCatch(master);
      const color = markerColor(summary);

      L.marker([lat, lng], { icon: makeDivIcon(color) })
        .addTo(salmonMap)
        .bindPopup(summaryPopup(master, summary, latestCatch));
    });

  mapPoints
    .filter(row => {
      return (
        isTrue(row["有効"]) &&
        isHokkaidoLatLng(row["緯度"], row["経度"])
      );
    })
    .forEach(point => {
      const lat = Number(point["緯度"]);
      const lng = Number(point["経度"]);
      const type = normalizeField(point["種別"]);
      let emoji = "📍";
      if (type.includes("釣")) emoji = "🐟";
      if (type.includes("駐")) emoji = "🚗";

      L.marker([lat, lng], { icon: makeEmojiIcon(emoji) })
        .addTo(salmonMap)
        .bindPopup(mapPointPopup(point));
    });

  regulations
    .filter(row => {
      return (
        isTrue(row["現在規制中"]) &&
        normalizeField(row["座標確認状態"]) === "検証済" &&
        isHokkaidoLatLng(row["緯度"], row["経度"])
      );
    })
    .forEach(row => {
      const lat = Number(row["緯度"]);
      const lng = Number(row["経度"]);

      L.marker([lat, lng], { icon: makeEmojiIcon("⚠️") })
        .addTo(salmonMap)
        .bindPopup(regulationPopup(row));
    });

  setTimeout(() => {
    salmonMap.invalidateSize();
    salmonMap.setView(HOKKAIDO_CENTER, HOKKAIDO_ZOOM, { animate: false });
  }, 100);

  mapRendered = true;
}

window.openAreaSearch = function(region) {
  const select = document.getElementById("area");

  if (select) {
    const option = [...select.options].find(
      o => o.value === region || region.includes(o.value) || o.value.includes(region)
    );

    select.value = option ? option.value : "all";
  }

  document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
  document.getElementById("search")?.classList.add("active");
  document.querySelectorAll("nav button").forEach(x =>
    x.classList.toggle("active", x.dataset.page === "search")
  );

  render();
};

function setupEvents() {
  [
    "fish",
    "area",
    "caught",
    "trust",
    "time",
    "dateFrom",
    "dateTo",
    "sort"
  ].forEach(id => {
    document.getElementById(id)?.addEventListener("change", render);
  });

  document.getElementById("reset")?.addEventListener("click", () => {
    const fish = document.getElementById("fish");
    const area = document.getElementById("area");
    const caught = document.getElementById("caught");
    const trust = document.getElementById("trust");
    const time = document.getElementById("time");
    const dateFrom = document.getElementById("dateFrom");
    const dateTo = document.getElementById("dateTo");
    const sort = document.getElementById("sort");

    if (fish) fish.value = "all";
    if (area) area.value = "all";
    if (caught) caught.value = "all";
    if (trust) trust.value = "all";
    if (time) time.value = "all";
    if (dateFrom) dateFrom.value = "";
    if (dateTo) dateTo.value = "";
    if (sort) sort.value = "new";

    render();
  });

  document.querySelectorAll("nav button").forEach(button => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;

      document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
      document.getElementById(page)?.classList.add("active");
      document.querySelectorAll("nav button").forEach(x =>
        x.classList.toggle("active", x === button)
      );

      if (page === "map") {
        renderMap();
        setTimeout(() => salmonMap?.invalidateSize(), 150);
      }
    });
  });
}

async function load() {
  try {
    const [summaryData, catchData, areaData, pointData, regulationData] =
      await Promise.all([
        getSheet("日次サマリー"),
        getSheet("釣果・現地情報"),
        getSheet("エリアマスタ"),
        getSheet("マップ地点"),
        getSheet("河口規制マスタ")
      ]);

    summaries = summaryData;
    catches = catchData;
    areaMasters = areaData;
    mapPoints = pointData;
    regulations = regulationData;

    setupFishSpecies();
    setupAreas();
    renderSummary();
    render();
    renderAnalysis();

    console.log(
      `読込完了: 日次${summaries.length} / ` +
      `釣果${catches.length} / ` +
      `エリア${areaMasters.length} / ` +
      `地点${mapPoints.length} / ` +
      `規制${regulations.length}`
    );
  } catch (error) {
    console.error(error);

    const hero = document.querySelector("#summary .hero");
    if (hero) {
      hero.innerHTML = `
        <small>ERROR</small>
        <h3>Google Sheetの取得に失敗しました</h3>
        <p>${escapeHtml(error.message)}</p>
      `;
    }
  }
}

setupEvents();
load();