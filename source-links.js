// 釣果検索カードの情報源を、Google Sheet の元URLへリンクする。
// app.js の catches は top-level let なので window.catches には出ない。
// そのため、この補助スクリプト自身で「釣果・現地情報」を取得してカードと対応させる。
(function () {
  const API_URL =
    "https://script.google.com/macros/s/AKfycbzUWA0w2_MzltOtgGSBStBZKHzTaHt41DF2-3nw9niiMTOSHQRjNkbz5nETV8j_Mw0_/exec";

  let linkRows = [];

  const text = v => String(v ?? "").trim();
  const getDateLocal = row => text(row["実釣日"] || row["確認日"] || row["日付"]);
  const getCountLocal = row => {
    const n = Number(row["釣果本数"]);
    return Number.isFinite(n) ? n : 0;
  };
  const trustLocal = v => {
    const s = text(v).toUpperCase();
    if (s.startsWith("A")) return 3;
    if (s.startsWith("B")) return 2;
    if (s.startsWith("C")) return 1;
    return 0;
  };

  function sourceUrl(row) {
    // 現在のSheet列名に加え、将来の表記揺れも吸収する。
    const candidates = [
      row?.["リンクURL"],
      row?.["URL/出典"],
      row?.["URL"],
      row?.["出典URL"],
      row?.["情報源URL"]
    ];
    return candidates.map(text).find(v => /^https?:\/\//i.test(v)) || "";
  }

  async function loadLinkRows() {
    try {
      const res = await fetch(
        `${API_URL}?sheet=${encodeURIComponent("釣果・現地情報")}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      linkRows = Array.isArray(json?.data) ? json.data : [];
      decorateSourceLinks();
    } catch (e) {
      console.warn("情報源リンク用データの取得に失敗", e);
    }
  }

  function visibleRows() {
    const area = document.getElementById("area")?.value || "all";
    const caught = document.getElementById("caught")?.value || "all";
    const trust = document.getElementById("trust")?.value || "all";
    const time = document.getElementById("time")?.value || "all";
    const dateFrom = document.getElementById("dateFrom")?.value || "";
    const dateTo = document.getElementById("dateTo")?.value || "";
    const sort = document.getElementById("sort")?.value || "new";

    let rows = linkRows.filter(row => {
      const rowArea = text(row["エリア"]);
      const rowTime = text(row["時間帯"]);
      const rowTrust = text(row["信頼度"]);
      const rowDate = getDateLocal(row);
      const count = getCountLocal(row);

      if (area !== "all" && rowArea !== area) return false;
      if (caught === "yes" && count <= 0) return false;
      if (caught === "no" && count > 0) return false;
      if (trust !== "all" && trustLocal(rowTrust) < trustLocal(trust)) return false;
      if (time !== "all" && !rowTime.includes(time)) return false;
      if (dateFrom && rowDate && rowDate < dateFrom) return false;
      if (dateTo && rowDate && rowDate > dateTo) return false;
      return true;
    });

    if (sort === "new") rows.sort((a, b) => getDateLocal(b).localeCompare(getDateLocal(a)));
    if (sort === "old") rows.sort((a, b) => getDateLocal(a).localeCompare(getDateLocal(b)));
    if (sort === "catch") rows.sort((a, b) => getCountLocal(b) - getCountLocal(a));
    if (sort === "trust") rows.sort((a, b) => trustLocal(b["信頼度"]) - trustLocal(a["信頼度"]));

    return rows;
  }

  function decorateSourceLinks() {
    if (!linkRows.length) return;

    const cards = [...document.querySelectorAll("#cards > .card")];
    if (!cards.length) return;

    const rows = visibleRows();

    cards.forEach((card, i) => {
      const row = rows[i];
      if (!row) return;

      const url = sourceUrl(row);
      const metas = card.querySelectorAll(".meta");
      const sourceMeta = metas[metas.length - 1];
      if (!sourceMeta) return;

      // 再描画・フィルター変更時は一度素の状態に戻す。
      const label = text(row["情報源"] || row["情報区分"] || "情報源");
      sourceMeta.textContent = label;
      delete sourceMeta.dataset.sourceLinked;

      if (!url) return;

      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = `🔗 ${label || "元情報を開く"}`;
      a.style.color = "#177eaa";
      a.style.fontWeight = "700";
      a.style.textDecoration = "underline";
      a.style.textUnderlineOffset = "3px";
      a.style.cursor = "pointer";

      sourceMeta.textContent = "";
      sourceMeta.appendChild(a);
      sourceMeta.dataset.sourceLinked = "1";
    });
  }

  const cards = document.getElementById("cards");
  if (cards) {
    new MutationObserver(() => {
      requestAnimationFrame(decorateSourceLinks);
    }).observe(cards, { childList: true });
  }

  document.addEventListener("change", () =>
    setTimeout(decorateSourceLinks, 0)
  );

  loadLinkRows();
})();
