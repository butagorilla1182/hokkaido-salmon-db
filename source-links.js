// 釣果検索カードの情報源を、同じレコードの元URLへリンクする。
// DOMの表示順だけでURLを割り当てると同日データ等でズレるため、
// カードに実際に表示されている内容とSheet行を照合してからリンクする。
(function () {
  const API_URL =
    "https://script.google.com/macros/s/AKfycbzUWA0w2_MzltOtgGSBStBZKHzTaHt41DF2-3nw9niiMTOSHQRjNkbz5nETV8j_Mw0_/exec";

  let linkRows = [];
  const text = v => String(v ?? "").trim();
  const dateOf = r => text(r["実釣日"] || r["確認日"] || r["日付"]);

  function sourceUrl(row) {
    return [
      row?.["リンクURL"], row?.["URL/出典"], row?.["URL"],
      row?.["出典URL"], row?.["情報源URL"]
    ].map(text).find(v => /^https?:\/\//i.test(v)) || "";
  }

  function sourceLabel(row) {
    return text(row?.["情報源"] || row?.["情報区分"] || "情報源");
  }

  // app.js がカードに出している文字列を使って、対応するSheet行を特定する。
  // まず「エリア＋日付＋時間帯＋情報源＋メモ＋具体地点」で絞り、
  // 足りない項目がある場合でも最も一致数の高い行を選ぶ。
  function findRowForCard(card) {
    const cardText = text(card.textContent).replace(/\s+/g, " ");
    const title = text(card.querySelector("h3")?.textContent);
    if (!title) return null;

    const candidates = linkRows.filter(r => text(r["エリア"]) === title);
    if (!candidates.length) return null;

    let best = null;
    let bestScore = -1;

    for (const row of candidates) {
      let score = 0;
      const requiredDate = dateOf(row);
      const fields = [
        [requiredDate, 8],
        [text(row["時間帯"]), 4],
        [text(row["具体地点"]), 4],
        [text(row["メモ"]), 7],
        [sourceLabel(row), 8],
        [text(row["風・波・濁り"]), 5],
        [text(row["釣法"]), 2]
      ];

      // 日付がカードと違う行は候補外。
      if (requiredDate && !cardText.includes(requiredDate)) continue;

      for (const [value, weight] of fields) {
        if (value && cardText.includes(value)) score += weight;
      }

      // 釣果本数も一致判定に使う。ただし空欄は評価しない。
      const catchValue = text(row["釣果本数"]);
      if (catchValue && cardText.includes(`${catchValue}本`)) score += 3;

      if (score > bestScore) {
        best = row;
        bestScore = score;
      }
    }

    return best;
  }

  function decorateSourceLinks() {
    if (!linkRows.length) return;

    document.querySelectorAll("#cards > .card").forEach(card => {
      const row = findRowForCard(card);
      if (!row) return;

      const metas = card.querySelectorAll(".meta");
      const sourceMeta = metas[metas.length - 1];
      if (!sourceMeta) return;

      const label = sourceLabel(row);
      const url = sourceUrl(row);
      sourceMeta.textContent = label;

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
    });
  }

  async function load() {
    try {
      const res = await fetch(`${API_URL}?sheet=${encodeURIComponent("釣果・現地情報")}`, { cache: "no-store" });
      const json = await res.json();
      linkRows = Array.isArray(json?.data) ? json.data : [];
      decorateSourceLinks();
    } catch (e) {
      console.warn("情報源リンク用データの取得に失敗", e);
    }
  }

  const cards = document.getElementById("cards");
  if (cards) {
    new MutationObserver(() => requestAnimationFrame(decorateSourceLinks))
      .observe(cards, { childList: true });
  }
  document.addEventListener("change", () => setTimeout(decorateSourceLinks, 0));
  load();
})();
