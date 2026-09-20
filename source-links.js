// 釣果カードのリンクは app.js が実際に描画した catches の同一行から取得する。
// 別fetch・文字列推測・カード内容照合はしない。これで情報源とURLの行ズレを防ぐ。
(function () {
  const text = v => String(v ?? "").trim();

  function sourceUrl(row) {
    return [
      row?.["リンクURL"],
      row?.["URL/出典"],
      row?.["URL"],
      row?.["出典URL"],
      row?.["情報源URL"]
    ].map(text).find(v => /^https?:\/\//i.test(v)) || "";
  }

  function sourceLabel(row) {
    return text(row?.["リンク表示"] || row?.["情報源"] || row?.["情報区分"] || "情報源");
  }

  function renderedRows() {
    if (typeof catches === "undefined" || !Array.isArray(catches)) return [];

    const fish = document.getElementById("fish")?.value || "all";
    const area = document.getElementById("area")?.value || "all";
    const caught = document.getElementById("caught")?.value || "all";
    const trust = document.getElementById("trust")?.value || "all";
    const time = document.getElementById("time")?.value || "all";
    const dateFrom = document.getElementById("dateFrom")?.value || "";
    const dateTo = document.getElementById("dateTo")?.value || "";
    const sort = document.getElementById("sort")?.value || "new";

    let rows = catches.filter(row => {
      const rowFish = text(row["魚種"]);
      const rowArea = text(row["エリア"]);
      const rowTime = text(row["時間帯"]);
      const rowTrust = text(row["信頼度"]);
      const rowDate = getDate(row);
      const count = getCatchCount(row);

      // app.js render() と完全に同じフィルタ条件にする。
      // ここから魚種条件が抜けると、カードと別行のURLが結び付いてしまう。
      if (fish !== "all" && rowFish !== fish) return false;
      if (area !== "all" && rowArea !== area) return false;
      if (caught === "yes" && count <= 0) return false;
      if (caught === "no" && count > 0) return false;
      if (trust !== "all" && trustScore(rowTrust) < trustScore(trust)) return false;
      if (time !== "all" && !rowTime.includes(time)) return false;
      if (dateFrom && rowDate && rowDate < dateFrom) return false;
      if (dateTo && rowDate && rowDate > dateTo) return false;
      return true;
    });

    if (sort === "new") rows.sort((a, b) => getDate(b).localeCompare(getDate(a)));
    if (sort === "old") rows.sort((a, b) => getDate(a).localeCompare(getDate(b)));
    if (sort === "catch") rows.sort((a, b) => getCatchCount(b) - getCatchCount(a));
    if (sort === "trust") rows.sort((a, b) => trustScore(b["信頼度"]) - trustScore(a["信頼度"]));

    return rows;
  }

  function decorate() {
    const cards = [...document.querySelectorAll("#cards > .card")];
    if (!cards.length) return;

    const rows = renderedRows();

    cards.forEach((card, index) => {
      const row = rows[index];
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
      a.textContent = label.startsWith("🔗") ? label : `🔗 ${label || "元情報を開く"}`;
      a.style.color = "#177eaa";
      a.style.fontWeight = "700";
      a.style.textDecoration = "underline";
      a.style.textUnderlineOffset = "3px";
      a.style.cursor = "pointer";

      sourceMeta.textContent = "";
      sourceMeta.appendChild(a);
    });
  }

  const cards = document.getElementById("cards");
  if (cards) {
    new MutationObserver(() => requestAnimationFrame(decorate))
      .observe(cards, { childList: true });
  }

  document.addEventListener("change", () => requestAnimationFrame(decorate));
  window.addEventListener("load", () => setTimeout(decorate, 500));
})();
