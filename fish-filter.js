// 魚種フィルター（釣果・現地情報シートの「魚種」列を使用）
(() => {
  let ready = false;

  function setupFishFilter() {
    if (ready || typeof catches === "undefined" || !Array.isArray(catches) || !catches.length) return;

    const select = document.getElementById("fish");
    if (!select) return;

    const values = [...new Set(
      catches
        .map(row => String(row["魚種"] ?? "").trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "ja"));

    select.innerHTML =
      '<option value="all">すべて</option>' +
      values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");

    ready = true;
    renderWithFish();
  }

  function renderWithFish() {
    if (typeof render !== "function" || typeof catches === "undefined") return;

    const fish = document.getElementById("fish")?.value || "all";
    if (fish === "all") {
      render();
      return;
    }

    const original = catches;
    catches = original.filter(
      row => String(row["魚種"] ?? "").trim() === fish
    );

    try {
      render();
    } finally {
      catches = original;
    }
  }

  document.getElementById("fish")?.addEventListener("change", renderWithFish);

  ["area", "caught", "trust", "time", "dateFrom", "dateTo", "sort"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => {
      setTimeout(renderWithFish, 0);
    });
  });

  document.getElementById("reset")?.addEventListener("click", () => {
    const fish = document.getElementById("fish");
    if (fish) fish.value = "all";
    setTimeout(renderWithFish, 0);
  });

  const timer = setInterval(() => {
    setupFishFilter();
    if (ready) clearInterval(timer);
  }, 200);

  setTimeout(() => clearInterval(timer), 15000);
})();
