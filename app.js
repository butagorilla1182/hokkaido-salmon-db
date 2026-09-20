const API =
  "https://script.google.com/macros/s/AKfycbzUWA0w2_MzltOtgGSBStBZKHzTaHt41DF2-3nw9niiMTOSHQRjNkbz5nETV8j_Mw0_/exec";

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let summaryData = [];
let catchData = [];
let areaMaster = [];

let salmonMap = null;
let mapLayer = null;


/* =========================
   API
========================= */

async function getSheet(sheet) {

  const url =
    API + "?sheet=" + encodeURIComponent(sheet);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${sheet} の取得に失敗しました`
    );
  }

  const json = await response.json();

  /*
    Apps Script側が
    配列を直接返す場合と
    {data:[...]} で返す場合の両方に対応
  */

  if (Array.isArray(json)) {
    return json;
  }

  if (Array.isArray(json.data)) {
    return json.data;
  }

  return [];
}


/* =========================
   共通
========================= */

function normalizeField(obj, names) {

  for (const name of names) {

    if (
      obj[name] !== undefined &&
      obj[name] !== null &&
      obj[name] !== ""
    ) {
      return obj[name];
    }

  }

  return "";
}


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function getDate(row) {

  return String(
    normalizeField(
      row,
      ["実釣日", "確認日", "日付"]
    )
  ).slice(0, 10);
}


function getCatchCount(row) {

  const value =
    normalizeField(
      row,
      ["釣果本数", "釣果"]
    );

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const match =
    String(value).match(/\d+/);

  return match
    ? Number(match[0])
    : 0;
}


function trustScore(value) {

  const t =
    String(value || "")
      .trim()
      .toUpperCase();

  if (t === "A") return 3;
  if (t === "B") return 2;
  if (t === "C") return 1;

  return 0;
}


/* =========================
   エリア選択
========================= */

function setupAreas() {

  const select = $("#area");

  const areas = [
    ...new Set(
      catchData
        .map(x => x["エリア"])
        .filter(Boolean)
    )
  ].sort();

  select.innerHTML =
    `<option value="all">すべて</option>` +
    areas
      .map(
        x =>
          `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`
      )
      .join("");
}


/* =========================
   釣果検索
========================= */

function render() {

  let data = [...catchData];

  const area = $("#area").value;
  const caught = $("#caught").value;
  const trust = $("#trust").value;
  const time = $("#time").value;
  const dateFrom = $("#dateFrom").value;
  const dateTo = $("#dateTo").value;
  const sort = $("#sort").value;


  if (area !== "all") {

    data = data.filter(
      x => x["エリア"] === area
    );

  }


  if (caught === "yes") {

    data = data.filter(
      x => getCatchCount(x) > 0
    );

  }


  if (caught === "no") {

    data = data.filter(
      x => getCatchCount(x) === 0
    );

  }


  if (trust !== "all") {

    data = data.filter(
      x =>
        trustScore(x["信頼度"]) >=
        trustScore(trust)
    );

  }


  if (time !== "all") {

    data = data.filter(
      x =>
        String(
          x["時間帯"] || ""
        ).includes(time)
    );

  }


  if (dateFrom) {

    data = data.filter(
      x =>
        getDate(x) &&
        getDate(x) >= dateFrom
    );

  }


  if (dateTo) {

    data = data.filter(
      x =>
        getDate(x) &&
        getDate(x) <= dateTo
    );

  }


  if (sort === "new") {

    data.sort(
      (a, b) =>
        getDate(b).localeCompare(
          getDate(a)
        )
    );

  }


  if (sort === "old") {

    data.sort(
      (a, b) =>
        getDate(a).localeCompare(
          getDate(b)
        )
    );

  }


  if (sort === "catch") {

    data.sort(
      (a, b) =>
        getCatchCount(b) -
        getCatchCount(a)
    );

  }


  if (sort === "trust") {

    data.sort(
      (a, b) =>
        trustScore(b["信頼度"]) -
        trustScore(a["信頼度"])
    );

  }


  $("#count").textContent =
    `${data.length}件`;


  if (!data.length) {

    $("#cards").innerHTML =
      `<div class="empty">
        条件に一致する情報がありません
      </div>`;

    return;
  }


  $("#cards").innerHTML =
    data.map(row => {

      const area =
        row["エリア"] || "地点未設定";

      const place =
        row["具体地点"] || "";

      const date =
        getDate(row);

      const time =
        row["時間帯"] || "";

      const catches =
        normalizeField(
          row,
          ["釣果本数", "釣果"]
        );

      const trust =
        row["信頼度"] || "-";

      const source =
        row["情報源"] || "";

      const method =
        row["釣法"] || "";

      const memo =
        row["メモ"] || "";

      return `
        <article class="card">

          <div class="top">

            <h3>
              ${escapeHtml(area)}
            </h3>

            <span class="chip ${escapeHtml(trust)}">
              信頼度${escapeHtml(trust)}
            </span>

          </div>

          <div class="meta">
            ${escapeHtml(date)}
            ${time ? "　" + escapeHtml(time) : ""}
          </div>

          ${
            place
              ? `<div class="meta">
                   📍 ${escapeHtml(place)}
                 </div>`
              : ""
          }

          <p>
            <strong>
              🎣 ${escapeHtml(catches || "0")}本
            </strong>
          </p>

          <div>

            ${
              method
                ? `<span class="chip">
                     ${escapeHtml(method)}
                   </span>`
                : ""
            }

            ${
              source
                ? `<span class="chip">
                     ${escapeHtml(source)}
                   </span>`
                : ""
            }

          </div>

          ${
            memo
              ? `<p class="meta">
                   ${escapeHtml(memo)}
                 </p>`
              : ""
          }

        </article>
      `;

    }).join("");
}


/* =========================
   今日の要約
========================= */

function renderSummary() {

  if (!summaryData.length) {

    $("#summaryCards").innerHTML =
      `<div class="empty">
        日次サマリーがありません
      </div>`;

    return;
  }


  const dates =
    summaryData
      .map(x =>
        String(x["日付"] || "")
          .slice(0, 10)
      )
      .filter(Boolean);


  const latestDate =
    dates.sort().at(-1);


  const latest =
    summaryData
      .filter(
        x =>
          String(
            x["日付"] || ""
          ).slice(0, 10)
          === latestDate
      )
      .sort(
        (a, b) =>
          Number(a["順位"] || 999) -
          Number(b["順位"] || 999)
      );


  if (!latest.length) return;


  const top = latest[0];


  const hero =
    $("#summary .hero");


  hero.innerHTML = `

    <small>
      DB最新日 ${escapeHtml(latestDate)}
    </small>

    <h3>
      ${escapeHtml(top["エリア"] || "")}
    </h3>

    <p>
      <strong>
        ${escapeHtml(top["総合判定"] || "")}
      </strong>
    </p>

    <p>
      ${escapeHtml(
        top["狙い目・注意"] ||
        top["主要根拠"] ||
        ""
      )}
    </p>

  `;


  $("#summaryCards").innerHTML =
    latest.map(row => `

      <article class="card">

        <div class="top">

          <h3>
            ${escapeHtml(
              row["順位"] || "-"
            )}位　
            ${escapeHtml(
              row["エリア"] || ""
            )}
          </h3>

        </div>

        <p>
          <strong>
            ${escapeHtml(
              row["総合判定"] || ""
            )}
          </strong>
        </p>

        ${
          row["海水温"]
            ? `<span class="chip">
                 🌊 ${escapeHtml(row["海水温"])}
               </span>`
            : ""
        }

        ${
          row["前日比"]
            ? `<span class="chip">
                 ${escapeHtml(row["前日比"])}
               </span>`
            : ""
        }

        ${
          row["直近実釣果"]
            ? `<p class="meta">
                 🎣 ${escapeHtml(row["直近実釣果"])}
               </p>`
            : ""
        }

        ${
          row["狙い目・注意"]
            ? `<p class="meta">
                 ${escapeHtml(row["狙い目・注意"])}
               </p>`
            : ""
        }

      </article>

    `).join("");
}


/* =========================
   過去分析
========================= */

function renderAnalysis() {

  if (!catchData.length) {

    $("#analysisBox").innerHTML =
      `<h3>データがありません</h3>`;

    return;
  }


  const total =
    catchData.length;

  const catches =
    catchData.filter(
      x => getCatchCount(x) > 0
    ).length;

  const aCount =
    catchData.filter(
      x =>
        String(
          x["信頼度"] || ""
        ).toUpperCase() === "A"
    ).length;


  $("#analysisBox").innerHTML = `

    <small>
      DATABASE
    </small>

    <h3>
      ${total}件の現地・釣果情報
    </h3>

    <p>
      釣果確認あり：
      <strong>${catches}件</strong>
    </p>

    <p>
      信頼度A：
      <strong>${aCount}件</strong>
    </p>

    <p>
      今後ここに、
      エリア別・月別・時間帯別の
      傾向分析を追加できます。
    </p>

  `;
}


/* =========================
   MAP
========================= */

function getLatestSummary() {

  if (!summaryData.length) {
    return [];
  }

  const latestDate =
    summaryData
      .map(x =>
        String(
          x["日付"] || ""
        ).slice(0, 10)
      )
      .filter(Boolean)
      .sort()
      .at(-1);


  return summaryData.filter(
    x =>
      String(
        x["日付"] || ""
      ).slice(0, 10)
      === latestDate
  );
}


function findSummaryForArea(master) {

  const latest =
    getLatestSummary();

  /*
    まずエリアコードで探す
  */

  let row =
    latest.find(
      x =>
        String(
          x["エリアコード"] || ""
        ).trim()
        ===
        String(
          master["エリアコード"] || ""
        ).trim()
    );


  if (row) return row;


  /*
    樽前川・別々川など
    日次サマリーでは
    「苫小牧・白老」にまとめている場合
  */

  row =
    latest.find(
      x =>
        String(
          x["エリア"] || ""
        ).trim()
        ===
        String(
          master["地域"] || ""
        ).trim()
    );


  return row || null;
}


function findLatestCatch(master) {

  const code =
    String(
      master["エリアコード"] || ""
    ).trim();

  const region =
    String(
      master["地域"] || ""
    ).trim();


  let rows =
    catchData.filter(
      x =>
        String(
          x["エリアコード"] || ""
        ).trim()
        === code
    );


  /*
    個別地点データがない場合は
    地域単位の最新情報を使う
  */

  if (!rows.length) {

    rows =
      catchData.filter(
        x =>
          String(
            x["エリア"] || ""
          ).trim()
          === region
      );

  }


  rows.sort(
    (a, b) =>
      getDate(b).localeCompare(
        getDate(a)
      )
  );


  return rows[0] || null;
}


function markerColor(summary) {

  if (!summary) {
    return "#71808a";
  }


  const status =
    String(
      summary["総合判定"] || ""
    );


  if (
    status.includes("有望") ||
    status.includes("好調")
  ) {
    return "#19a463";
  }


  if (
    status.includes("監視") ||
    status.includes("新報待ち") ||
    status.includes("魚は確認")
  ) {
    return "#e5a91c";
  }


  return "#71808a";
}


function renderMap() {

  if (
    typeof L === "undefined"
  ) {
    return;
  }


  if (!salmonMap) {

    salmonMap =
      L.map(
        "salmonMap",
        {
          zoomControl:true
        }
      ).setView(
        [42.65, 141.45],
        7
      );


    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom:18,
        attribution:
          "&copy; OpenStreetMap contributors"
      }
    ).addTo(salmonMap);


    mapLayer =
      L.layerGroup()
        .addTo(salmonMap);
  }


  mapLayer.clearLayers();


  const bounds = [];


  areaMaster.forEach(master => {

    const tracking =
      String(
        master["追跡対象"] || ""
      ).toUpperCase();


    if (
      tracking !== "TRUE" &&
      tracking !== "1"
    ) {
      return;
    }


    const lat =
      Number(master["緯度"]);

    const lng =
      Number(master["経度"]);


    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat === 0 ||
      lng === 0
    ) {
      return;
    }


    const summary =
      findSummaryForArea(master);

    const latestCatch =
      findLatestCatch(master);

    const color =
      markerColor(summary);


    const marker =
      L.circleMarker(
        [lat, lng],
        {
          radius:10,
          color:"#ffffff",
          weight:2,
          fillColor:color,
          fillOpacity:0.95
        }
      );


    const name =
      master["表示名"] || "";

    const region =
      master["地域"] || "";

    const status =
      summary
        ? summary["総合判定"]
        : "最新判定なし";

    const sea =
      summary
        ? summary["海水温"]
        : "";

    const summaryDate =
      summary
        ? String(
            summary["日付"] || ""
          ).slice(0, 10)
        : "";

    const catchDate =
      latestCatch
        ? getDate(latestCatch)
        : "";

    const catchCount =
      latestCatch
        ? normalizeField(
            latestCatch,
            ["釣果本数", "釣果"]
          )
        : "";

    const source =
      latestCatch
        ? latestCatch["情報源"] || ""
        : "";


    const popup = `

      <div class="map-popup">

        <h3>
          ${escapeHtml(name)}
        </h3>

        <div class="region">
          ${escapeHtml(region)}
        </div>

        <div class="status">
          ${escapeHtml(status)}
        </div>

        ${
          summaryDate
            ? `<div class="detail">
                 📅 最新更新：
                 ${escapeHtml(summaryDate)}
               </div>`
            : ""
        }

        ${
          sea
            ? `<div class="detail">
                 🌊 海水温：
                 ${escapeHtml(sea)}
               </div>`
            : ""
        }

        ${
          latestCatch
            ? `<div class="detail">
                 🎣 最新釣果：
                 ${escapeHtml(catchDate)}
                 ${
                   catchCount !== ""
                     ? " / " +
                       escapeHtml(catchCount) +
                       "本"
                     : ""
                 }
               </div>`
            : `<div class="detail">
                 🎣 最新釣果：新報待ち
               </div>`
        }

        ${
          source
            ? `<div class="detail">
                 🔎 ${escapeHtml(source)}
               </div>`
            : ""
        }

        <button
          onclick="openAreaSearch('${escapeHtml(region)}')"
        >
          このエリアの釣果を見る
        </button>

      </div>
    `;


    marker
      .bindPopup(popup)
      .addTo(mapLayer);


    bounds.push(
      [lat, lng]
    );

  });


  if (bounds.length) {

    salmonMap.fitBounds(
      bounds,
      {
        padding:[25,25],
        maxZoom:8
      }
    );

  }


  setTimeout(
    () =>
      salmonMap.invalidateSize(),
    150
  );
}


/* =========================
   MAP → 釣果検索
========================= */

window.openAreaSearch =
function(region) {

  $$(".page").forEach(
    x =>
      x.classList.remove("active")
  );

  $("#search")
    .classList.add("active");


  $$("nav button").forEach(
    x =>
      x.classList.remove("active")
  );


  const button =
    document.querySelector(
      'nav button[data-page="search"]'
    );

  if (button) {
    button.classList.add("active");
  }


  const select =
    $("#area");


  const option =
    [...select.options].find(
      x =>
        x.value === region
    );


  if (option) {

    select.value =
      region;

  } else {

    select.value =
      "all";

  }


  render();


  window.scrollTo(
    {
      top:0,
      behavior:"smooth"
    }
  );
};


/* =========================
   NAV
========================= */

$$("nav button").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const page =
        button.dataset.page;


      $$(".page").forEach(
        x =>
          x.classList.remove("active")
      );


      $("#" + page)
        .classList.add("active");


      $$("nav button").forEach(
        x =>
          x.classList.remove("active")
      );


      button.classList.add("active");


      if (page === "map") {

        renderMap();

        setTimeout(
          () =>
            salmonMap &&
            salmonMap.invalidateSize(),
          200
        );

      }

    }
  );

});


/* =========================
   FILTER EVENTS
========================= */

[
  "#area",
  "#caught",
  "#trust",
  "#time",
  "#sort"
].forEach(selector => {

  $(selector)
    .addEventListener(
      "change",
      render
    );

});


$("#dateFrom")
  .addEventListener(
    "change",
    render
  );


$("#dateTo")
  .addEventListener(
    "change",
    render
  );


$("#reset")
  .addEventListener(
    "click",
    () => {

      document
        .querySelectorAll(
          "#search select"
        )
        .forEach(
          x =>
            x.selectedIndex = 0
        );


      $("#dateFrom").value = "";
      $("#dateTo").value = "";


      render();

    }
  );


/* =========================
   LOAD
========================= */

async function load() {

  try {

    const [
      summary,
      catches,
      master
    ] =
      await Promise.all([

        getSheet(
          "日次サマリー"
        ),

        getSheet(
          "釣果・現地情報"
        ),

        getSheet(
          "エリアマスタ"
        )

      ]);


    summaryData =
      summary;

    catchData =
      catches;

    areaMaster =
      master;


    setupAreas();

    renderSummary();

    render();

    renderAnalysis();


  } catch (error) {

    console.error(error);


    $("#summary .hero")
      .innerHTML = `

        <small>
          ERROR
        </small>

        <h3>
          データを取得できませんでした
        </h3>

        <p>
          ${escapeHtml(
            error.message
          )}
        </p>

      `;

  }

}


load();