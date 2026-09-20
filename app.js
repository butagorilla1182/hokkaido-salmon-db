const API =
  'https://script.google.com/macros/s/AKfycbzUWA0w2_MzltOtgGSBStBZKHzTaHt41DF2-3nw9niiMTOSHQRjNkbz5nETV8j_Mw0_/exec';

let summaryData = [];
let catchData = [];
let areaMaster = [];
let mapPoints = [];

let salmonMap = null;
let mapLayer = null;


/* =========================
   API
========================= */

async function getSheet(sheet) {
  const url = `${API}?sheet=${encodeURIComponent(sheet)}`;

  const res = await fetch(url, {
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || 'API error');
  }

  return json.data || [];
}


/* =========================
   COMMON
========================= */

function normalizeField(obj, names) {
  for (const name of names) {
    if (
      obj &&
      Object.prototype.hasOwnProperty.call(obj, name) &&
      obj[name] !== ''
    ) {
      return obj[name];
    }
  }

  return '';
}


function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function getDate(row) {
  return normalizeField(
    row,
    ['実釣日', '確認日', '日付']
  );
}


function getCatchCount(row) {
  const value = normalizeField(
    row,
    ['釣果本数', '直近実釣果']
  );

  const match = String(value).match(/\d+/);

  return match ? Number(match[0]) : 0;
}


function trustScore(value) {
  const trust = String(value || '').trim();

  if (trust === 'A') return 3;
  if (trust === 'B') return 2;
  if (trust === 'C') return 1;

  return 0;
}


function isTrue(value) {
  const v = String(value ?? '')
    .trim()
    .toLowerCase();

  return (
    v === 'true' ||
    v === '1' ||
    v === 'yes' ||
    v === '有効'
  );
}


/* =========================
   AREA SELECT
========================= */

function setupAreas() {
  const area = document.getElementById('area');

  if (!area) return;

  const values = [
    ...new Set(
      catchData
        .map(row =>
          normalizeField(
            row,
            ['エリア', '地域']
          )
        )
        .filter(Boolean)
    )
  ].sort();

  area.innerHTML =
    '<option value="all">すべて</option>' +
    values
      .map(value =>
        `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`
      )
      .join('');
}


/* =========================
   SEARCH
========================= */

function render() {
  const cards = document.getElementById('cards');
  const count = document.getElementById('count');

  if (!cards || !count) return;

  const areaValue =
    document.getElementById('area')?.value || 'all';

  const caughtValue =
    document.getElementById('caught')?.value || 'all';

  const trustValue =
    document.getElementById('trust')?.value || 'all';

  const timeValue =
    document.getElementById('time')?.value || 'all';

  const dateFrom =
    document.getElementById('dateFrom')?.value || '';

  const dateTo =
    document.getElementById('dateTo')?.value || '';

  const sortValue =
    document.getElementById('sort')?.value || 'new';


  let rows = [...catchData];


  if (areaValue !== 'all') {
    rows = rows.filter(row => {
      const value = normalizeField(
        row,
        ['エリア', '地域']
      );

      return value === areaValue;
    });
  }


  if (caughtValue === 'yes') {
    rows = rows.filter(
      row => getCatchCount(row) > 0
    );
  }


  if (caughtValue === 'no') {
    rows = rows.filter(
      row => getCatchCount(row) === 0
    );
  }


  if (trustValue !== 'all') {
    const minimum =
      trustScore(trustValue);

    rows = rows.filter(row => {
      const trust =
        normalizeField(
          row,
          ['信頼度']
        );

      return trustScore(trust) >= minimum;
    });
  }


  if (timeValue !== 'all') {
    rows = rows.filter(row => {
      const value = normalizeField(
        row,
        ['時間帯']
      );

      return String(value).includes(timeValue);
    });
  }


  if (dateFrom) {
    rows = rows.filter(row => {
      const date = getDate(row);

      return date && date >= dateFrom;
    });
  }


  if (dateTo) {
    rows = rows.filter(row => {
      const date = getDate(row);

      return date && date <= dateTo;
    });
  }


  rows.sort((a, b) => {
    if (sortValue === 'old') {
      return String(getDate(a))
        .localeCompare(String(getDate(b)));
    }

    if (sortValue === 'catch') {
      return (
        getCatchCount(b) -
        getCatchCount(a)
      );
    }

    if (sortValue === 'trust') {
      return (
        trustScore(
          normalizeField(b, ['信頼度'])
        ) -
        trustScore(
          normalizeField(a, ['信頼度'])
        )
      );
    }

    return String(getDate(b))
      .localeCompare(String(getDate(a)));
  });


  count.textContent = `${rows.length}件`;


  if (!rows.length) {
    cards.innerHTML =
      '<div class="empty">条件に一致する釣果情報がありません。</div>';

    return;
  }


  cards.innerHTML = rows
    .map(row => {
      const area =
        normalizeField(
          row,
          ['エリア', '地域']
        ) || 'エリア不明';

      const point =
        normalizeField(
          row,
          ['具体地点']
        );

      const date =
        getDate(row) || '日付不明';

      const time =
        normalizeField(
          row,
          ['時間帯']
        );

      const catches =
        normalizeField(
          row,
          ['釣果本数']
        );

      const trust =
        normalizeField(
          row,
          ['信頼度']
        );

      const method =
        normalizeField(
          row,
          ['釣法']
        );

      const lure =
        normalizeField(
          row,
          ['ルアー・餌']
        );

      const source =
        normalizeField(
          row,
          ['情報源']
        );

      const memo =
        normalizeField(
          row,
          ['メモ']
        );


      return `
        <article class="card">

          <div class="top">
            <h3>${escapeHtml(area)}</h3>

            ${
              trust
                ? `<span class="chip ${escapeHtml(trust)}">信頼度 ${escapeHtml(trust)}</span>`
                : ''
            }
          </div>

          <div class="meta">
            ${escapeHtml(date)}
            ${time ? ` ・ ${escapeHtml(time)}` : ''}
          </div>

          ${
            point
              ? `<span class="chip">📍 ${escapeHtml(point)}</span>`
              : ''
          }

          ${
            catches
              ? `<span class="chip">🎣 ${escapeHtml(catches)}本</span>`
              : ''
          }

          ${
            method
              ? `<span class="chip">${escapeHtml(method)}</span>`
              : ''
          }

          ${
            lure
              ? `<p><b>ルアー・餌：</b>${escapeHtml(lure)}</p>`
              : ''
          }

          ${
            source
              ? `<p><b>情報源：</b>${escapeHtml(source)}</p>`
              : ''
          }

          ${
            memo
              ? `<p>${escapeHtml(memo)}</p>`
              : ''
          }

        </article>
      `;
    })
    .join('');
}


/* =========================
   SUMMARY
========================= */

function renderSummary() {
  const box =
    document.getElementById('summaryCards');

  if (!box) return;


  if (!summaryData.length) {
    box.innerHTML =
      '<div class="empty">日次サマリーがありません。</div>';

    return;
  }


  const dates = summaryData
    .map(row =>
      normalizeField(row, ['日付'])
    )
    .filter(Boolean)
    .sort();


  const latestDate =
    dates[dates.length - 1];


  let rows = summaryData.filter(
    row =>
      normalizeField(
        row,
        ['日付']
      ) === latestDate
  );


  rows.sort(
    (a, b) =>
      Number(
        normalizeField(a, ['順位']) || 999
      ) -
      Number(
        normalizeField(b, ['順位']) || 999
      )
  );


  const hero =
    document.querySelector(
      '#summary .hero'
    );


  if (hero) {
    hero.innerHTML = `
      <small>最新更新日</small>
      <h3>${escapeHtml(latestDate || '---')}</h3>
      <div>${rows.length}エリアを表示中</div>
    `;
  }


  box.innerHTML = rows
    .map(row => {
      const rank =
        normalizeField(
          row,
          ['順位']
        );

      const area =
        normalizeField(
          row,
          ['エリア']
        );

      const status =
        normalizeField(
          row,
          ['総合判定']
        );

      const catchInfo =
        normalizeField(
          row,
          ['直近実釣果']
        );

      const temp =
        normalizeField(
          row,
          ['海水温']
        );

      const condition =
        normalizeField(
          row,
          ['風・波・濁り']
        );

      const target =
        normalizeField(
          row,
          ['狙い目・注意']
        );

      const source =
        normalizeField(
          row,
          ['主要根拠']
        );


      return `
        <article class="card">

          <div class="top">
            <h3>
              ${rank ? `${escapeHtml(rank)}位 ` : ''}
              ${escapeHtml(area)}
            </h3>
          </div>

          ${
            status
              ? `<p><b>${escapeHtml(status)}</b></p>`
              : ''
          }

          ${
            catchInfo
              ? `<p><b>直近：</b>${escapeHtml(catchInfo)}</p>`
              : ''
          }

          ${
            temp
              ? `<span class="chip">🌡️ ${escapeHtml(temp)}</span>`
              : ''
          }

          ${
            condition
              ? `<p><b>海況：</b>${escapeHtml(condition)}</p>`
              : ''
          }

          ${
            target
              ? `<p><b>狙い目：</b>${escapeHtml(target)}</p>`
              : ''
          }

          ${
            source
              ? `<p class="meta">根拠：${escapeHtml(source)}</p>`
              : ''
          }

        </article>
      `;
    })
    .join('');
}


/* =========================
   ANALYSIS
========================= */

function renderAnalysis() {
  const box =
    document.getElementById('analysisBox');

  if (!box) return;


  const total =
    catchData.length;


  const caught =
    catchData.filter(
      row => getCatchCount(row) > 0
    ).length;


  const trustA =
    catchData.filter(
      row =>
        normalizeField(
          row,
          ['信頼度']
        ) === 'A'
    ).length;


  const areas =
    new Set(
      catchData
        .map(row =>
          normalizeField(
            row,
            ['エリア']
          )
        )
        .filter(Boolean)
    ).size;


  box.innerHTML = `
    <small>Google Sheet LIVE</small>
    <h3>${total}件の現地・釣果データ</h3>
    <p>釣果あり：${caught}件</p>
    <p>信頼度A：${trustA}件</p>
    <p>記録エリア：${areas}エリア</p>
  `;
}


/* =========================
   MAP SUMMARY HELPERS
========================= */

function getLatestSummary() {
  if (!summaryData.length) {
    return [];
  }

  const dates = summaryData
    .map(row =>
      normalizeField(
        row,
        ['日付']
      )
    )
    .filter(Boolean)
    .sort();

  const latest =
    dates[dates.length - 1];

  return summaryData.filter(
    row =>
      normalizeField(
        row,
        ['日付']
      ) === latest
  );
}


function findSummaryForArea(master) {
  const latest =
    getLatestSummary();

  const code =
    normalizeField(
      master,
      ['エリアコード']
    );

  const region =
    normalizeField(
      master,
      ['地域']
    );

  const name =
    normalizeField(
      master,
      ['表示名']
    );


  return latest.find(row => {
    const rowCode =
      normalizeField(
        row,
        ['エリアコード']
      );

    const rowArea =
      normalizeField(
        row,
        ['エリア']
      );

    return (
      (code && rowCode === code) ||
      (region && rowArea === region) ||
      (name && rowArea === name)
    );
  });
}


function findLatestCatch(master) {
  const code =
    normalizeField(
      master,
      ['エリアコード']
    );

  const region =
    normalizeField(
      master,
      ['地域']
    );

  const rows = catchData
    .filter(row => {
      const rowCode =
        normalizeField(
          row,
          ['エリアコード']
        );

      const rowArea =
        normalizeField(
          row,
          ['エリア']
        );

      return (
        (code && rowCode === code) ||
        (region && rowArea === region)
      );
    })
    .sort(
      (a, b) =>
        String(getDate(b))
          .localeCompare(
            String(getDate(a))
          )
    );

  return rows[0] || null;
}


function markerColor(summary) {
  const status =
    normalizeField(
      summary || {},
      ['総合判定']
    );

  if (
    String(status).includes('有望') ||
    String(status).includes('好調')
  ) {
    return '#20a45b';
  }

  if (
    String(status).includes('監視') ||
    String(status).includes('新報待ち') ||
    String(status).includes('魚は確認')
  ) {
    return '#e3a51a';
  }

  return '#89979e';
}


/* =========================
   MAP POINT ICON
========================= */

function pointIcon(point) {
  const type =
    normalizeField(
      point,
      ['種別']
    );

  let emoji =
    normalizeField(
      point,
      ['アイコン']
    );


  if (!emoji) {
    if (type === '駐車場') {
      emoji = '🚗';
    } else if (type === '注意地点') {
      emoji = '⚠️';
    } else {
      emoji = '🐟';
    }
  }


  let className =
    'map-point-fish';

  if (type === '駐車場') {
    className =
      'map-point-car';
  }

  if (type === '注意地点') {
    className =
      'map-point-warning';
  }


  return L.divIcon({
    className: '',
    html: `
      <div
        class="map-point-icon ${className}"
        style="
          width:38px;
          height:38px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          background:white;
          border:3px solid ${
            type === '注意地点'
              ? '#e53935'
              : type === '駐車場'
                ? '#2878d0'
                : '#16a36a'
          };
          box-shadow:0 2px 8px rgba(0,0,0,.28);
          font-size:21px;
        "
      >
        ${escapeHtml(emoji)}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -21]
  });
}


/* =========================
   MAP POINT POPUP
========================= */

function mapPointPopup(point) {
  const name =
    normalizeField(
      point,
      ['地点名']
    ) || '地点';

  const type =
    normalizeField(
      point,
      ['種別']
    );

  const memo =
    normalizeField(
      point,
      ['注意・メモ']
    );

  const source =
    normalizeField(
      point,
      ['情報元']
    );


  if (type === '注意地点') {
    return `
      <div class="map-popup">

        <h3>⚠️ ${escapeHtml(name)}</h3>

        <div class="status">
          🚫 サケ・マス採捕禁止
        </div>

        <div class="detail">
          📅 9月1日〜12月10日
        </div>

        <div class="detail">
          📏 左岸500m・右岸500m・沖合500m
        </div>

        ${
          memo
            ? `<div class="detail">⚠️ ${escapeHtml(memo)}</div>`
            : ''
        }

        ${
          source
            ? `<div class="meta">情報：${escapeHtml(source)}</div>`
            : ''
        }

      </div>
    `;
  }


  return `
    <div class="map-popup">

      <h3>
        ${type === '駐車場' ? '🚗' : '🐟'}
        ${escapeHtml(name)}
      </h3>

      <div class="status">
        ${escapeHtml(type || '地点')}
      </div>

      ${
        memo
          ? `<div class="detail">${escapeHtml(memo)}</div>`
          : ''
      }

      ${
        source
          ? `<div class="meta">情報：${escapeHtml(source)}</div>`
          : ''
      }

    </div>
  `;
}


/* =========================
   MAP
========================= */

function renderMap() {
  const element =
    document.getElementById(
      'salmonMap'
    );

  if (!element) return;


  if (!salmonMap) {
    salmonMap = L.map(
      'salmonMap',
      {
        zoomControl: true
      }
    ).setView(
      [42.65, 141.45],
      7
    );


    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 18,
        attribution:
          '&copy; OpenStreetMap'
      }
    ).addTo(salmonMap);
  }


  if (mapLayer) {
    mapLayer.clearLayers();
  } else {
    mapLayer =
      L.layerGroup()
        .addTo(salmonMap);
  }


  const bounds = [];


  /* -------------------------
     エリア代表ピン
  ------------------------- */

  areaMaster
    .filter(row =>
      isTrue(
        normalizeField(
          row,
          ['追跡対象']
        )
      )
    )
    .forEach(master => {
      const lat =
        Number(
          normalizeField(
            master,
            ['緯度']
          )
        );

      const lng =
        Number(
          normalizeField(
            master,
            ['経度']
          )
        );


      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        return;
      }


      const name =
        normalizeField(
          master,
          ['表示名']
        );

      const region =
        normalizeField(
          master,
          ['地域']
        );

      const summary =
        findSummaryForArea(master);

      const latestCatch =
        findLatestCatch(master);


      const status =
        normalizeField(
          summary || {},
          ['総合判定']
        ) || '最新判定なし';

      const date =
        normalizeField(
          summary || {},
          ['日付']
        );

      const temp =
        normalizeField(
          summary || {},
          ['海水温']
        );

      const source =
        normalizeField(
          summary || {},
          ['主要根拠']
        );


      const catchDate =
        latestCatch
          ? getDate(latestCatch)
          : '';

      const catchCount =
        latestCatch
          ? normalizeField(
              latestCatch,
              ['釣果本数']
            )
          : '';


      const marker =
        L.circleMarker(
          [lat, lng],
          {
            radius: 9,
            color: '#ffffff',
            weight: 2,
            fillColor:
              markerColor(summary),
            fillOpacity: 1
          }
        );


      marker.bindPopup(`
        <div class="map-popup">

          <h3>${escapeHtml(name)}</h3>

          <div class="region">
            ${escapeHtml(region)}
          </div>

          <div class="status">
            ${escapeHtml(status)}
          </div>

          ${
            date
              ? `<div class="detail">📅 ${escapeHtml(date)}</div>`
              : ''
          }

          ${
            temp
              ? `<div class="detail">🌡️ ${escapeHtml(temp)}</div>`
              : ''
          }

          ${
            catchDate
              ? `
                <div class="detail">
                  🎣 最新釣果：
                  ${escapeHtml(catchDate)}
                  ${catchCount ? ` / ${escapeHtml(catchCount)}本` : ''}
                </div>
              `
              : ''
          }

          ${
            source
              ? `<div class="detail">根拠：${escapeHtml(source)}</div>`
              : ''
          }

          <button
            onclick="openAreaSearch('${escapeHtml(region)}')"
          >
            このエリアの釣果を見る
          </button>

        </div>
      `);


      marker.addTo(mapLayer);

      bounds.push(
        [lat, lng]
      );
    });


  /* -------------------------
     釣り場・駐車場・規制地点
  ------------------------- */

  mapPoints
    .filter(point =>
      isTrue(
        normalizeField(
          point,
          ['有効']
        )
      )
    )
    .forEach(point => {
      const lat =
        Number(
          normalizeField(
            point,
            ['緯度']
          )
        );

      const lng =
        Number(
          normalizeField(
            point,
            ['経度']
          )
        );


      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        return;
      }


      const marker =
        L.marker(
          [lat, lng],
          {
            icon:
              pointIcon(point),
            zIndexOffset: 500
          }
        );


      marker.bindPopup(
        mapPointPopup(point)
      );


      marker.addTo(
        mapLayer
      );


      bounds.push(
        [lat, lng]
      );
    });


  if (bounds.length) {
    salmonMap.fitBounds(
      bounds,
      {
        padding: [25, 25],
        maxZoom: 8
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
   OPEN SEARCH FROM MAP
========================= */

window.openAreaSearch =
  function(region) {
    document
      .querySelectorAll('.page')
      .forEach(page =>
        page.classList.remove(
          'active'
        )
      );


    document
      .getElementById('search')
      ?.classList.add(
        'active'
      );


    document
      .querySelectorAll(
        'nav button'
      )
      .forEach(button =>
        button.classList.remove(
          'active'
        )
      );


    document
      .querySelector(
        'nav button[data-page="search"]'
      )
      ?.classList.add(
        'active'
      );


    const area =
      document.getElementById(
        'area'
      );


    if (area) {
      area.value = region;

      if (
        area.value !== region
      ) {
        const option =
          [...area.options]
            .find(
              item =>
                item.textContent ===
                region
            );

        if (option) {
          area.value =
            option.value;
        }
      }
    }


    render();
  };


/* =========================
   NAV
========================= */

document
  .querySelectorAll(
    'nav button'
  )
  .forEach(button => {
    button.addEventListener(
      'click',
      () => {
        const pageName =
          button.dataset.page;


        document
          .querySelectorAll(
            '.page'
          )
          .forEach(page =>
            page.classList.remove(
              'active'
            )
          );


        document
          .getElementById(
            pageName
          )
          ?.classList.add(
            'active'
          );


        document
          .querySelectorAll(
            'nav button'
          )
          .forEach(item =>
            item.classList.remove(
              'active'
            )
          );


        button.classList.add(
          'active'
        );


        if (
          pageName === 'map'
        ) {
          setTimeout(
            () => {
              renderMap();

              salmonMap
                ?.invalidateSize();
            },
            100
          );
        }
      }
    );
  });


/* =========================
   FILTER EVENTS
========================= */

[
  'area',
  'caught',
  'trust',
  'time',
  'dateFrom',
  'dateTo',
  'sort'
].forEach(id => {
  document
    .getElementById(id)
    ?.addEventListener(
      'change',
      render
    );
});


document
  .getElementById('reset')
  ?.addEventListener(
    'click',
    () => {
      document.getElementById(
        'area'
      ).value = 'all';

      document.getElementById(
        'caught'
      ).value = 'all';

      document.getElementById(
        'trust'
      ).value = 'all';

      document.getElementById(
        'time'
      ).value = 'all';

      document.getElementById(
        'dateFrom'
      ).value = '';

      document.getElementById(
        'dateTo'
      ).value = '';

      document.getElementById(
        'sort'
      ).value = 'new';

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
      master,
      points
    ] =
      await Promise.all([
        getSheet(
          '日次サマリー'
        ),

        getSheet(
          '釣果・現地情報'
        ),

        getSheet(
          'エリアマスタ'
        ),

        getSheet(
          'マップ地点'
        )
      ]);


    summaryData =
      summary || [];

    catchData =
      catches || [];

    areaMaster =
      master || [];

    mapPoints =
      points || [];


    setupAreas();

    render();

    renderSummary();

    renderAnalysis();

    renderMap();

  } catch (error) {
    console.error(error);


    const summaryBox =
      document.getElementById(
        'summaryCards'
      );

    if (summaryBox) {
      summaryBox.innerHTML =
        `<div class="empty">データ取得エラー：${escapeHtml(error.message)}</div>`;
    }
  }
}


load();