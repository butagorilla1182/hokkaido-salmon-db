// 釣果検索カードの「情報源」から元情報へ直接移動するための追加処理。
// Google Sheet の「リンクURL」を優先し、「URL/出典」がURLの場合はフォールバックする。
(function () {
  function text(v) {
    return String(v ?? "").trim();
  }

  function sourceUrl(row) {
    const candidates = [row?.["リンクURL"], row?.["URL/出典"]];
    return candidates.map(text).find(v => /^https?:\/\//i.test(v)) || "";
  }

  function visibleRows() {
    if (!Array.isArray(window.catches)) return [];

    const area = document.getElementById("area")?.value || "all";
    const caught = document.getElementById("caught")?.value || "all";
    const trust = document.getElementById("trust")?.value || "all";
    const time = document.getElementById("time")?.value || "all";
    const dateFrom = document.getElementById("dateFrom")?.value || "";
    const dateTo = document.getElementById("dateTo")?.value || "";
    const sort = document.getElementById("sort")?.value || "new";

    let rows = window.catches.filter(row => {
      const rowArea = text(row["エリア"]);
      const rowTime = text(row["時間帯"]);
      const rowTrust = text(row["信頼度"]);
      const rowDate = window.getDate ? window.getDate(row) : text(row["実釣日"] || row["確認日"] || row["日付"]);
      const count = window.getCatchCount ? window.getCatchCount(row) : Number(row["釣果本数"] || 0);

      if (area !== "all" && rowArea !== area) return false;
      if (caught === "yes" && count <= 0) return false;
      if (caught === "no" && count > 0) return false;
      if (trust !== "all" && window.trustScore && window.trustScore(rowTrust) < window.trustScore(trust)) return false;
      if (time !== "all" && !rowTime.includes(time)) return false;
      if (dateFrom && rowDate && rowDate < dateFrom) return false;
      if (dateTo && rowDate && rowDate > dateTo) return false;
      return true;
    });

    if (sort === "new") rows.sort((a, b) => window.getDate(b).localeCompare(window.getDate(a)));
    if (sort === "old") rows.sort((a, b) => window.getDate(a).localeCompare(window.getDate(b)));
    if (sort === "catch") rows.sort((a, b) => window.getCatchCount(b) - window.getCatchCount(a));
    if (sort === "trust") rows.sort((a, b) => window.trustScore(b["信頼度"]) - window.trustScore(a["信頼度"]));

    return rows;
  }

  function decorateSourceLinks() {
    const cards = [...document.querySelectorAll("#cards > .card")];
    if (!cards.length) return;

    const rows = visibleRows();

    cards.forEach((card, i) => {
      const row = rows[i];
      const url = sourceUrl(row);
      if (!row || !url) return;

      const metas = card.querySelectorAll(".meta");
      const sourceMeta = metas[metas.length - 1];
      if (!sourceMeta || sourceMeta.dataset.sourceLinked === "1") return;

      const label = text(row["情報源"] || row["情報区分"] || "元情報を開く");
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = label ? `🔗 ${label}` : "🔗 元情報を開く";
      a.style.color = "inherit";
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
    const observer = new MutationObserver(() => {
      requestAnimationFrame(decorateSourceLinks);
    });
    observer.observe(cards, { childList: true });
  }

  // app.js の初回非同期読込後、およびフィルター再描画後の保険。
  document.addEventListener("change", () => requestAnimationFrame(decorateSourceLinks));
  window.addEventListener("load", () => setTimeout(decorateSourceLinks, 300));
})();
