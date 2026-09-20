// 北海道連合海区漁業調整委員会「秋さけ沿岸漁獲実績・速報」から作成。
// 2016-2018は確定値、2019-2025は各年12月末速報値を地域集計。
// 独自集約: 道東=オホーツク+根室+えりも以東、道央太平洋=日高+胆振+噴火湾。
const SALMON_HARVEST = {
  years: [2016,2017,2018,2019,2020,2021,2022,2023,2024,2025],
  regions: {
    east: { label: "道東", detail: "オホーツク・根室・えりも以東", values: [18724604,11436665,15936489,11372928,11054107,13268645,22998299,17451746,14522367,4687251] },
    central: { label: "道央太平洋", detail: "日高・胆振・噴火湾", values: [2686521,1864447,3308903,2176140,1694806,494492,1049554,231498,193533,371423] },
    south: { label: "道南", detail: "えりも以西・道南地区", values: [614664,546771,438898,179767,160153,100634,255226,61542,14129,7625] },
    japansea: { label: "日本海", detail: "日本海南部・中部・北部", values: [1451162,1876171,1244950,1494227,2809787,2825490,5096186,1473387,895867,549535] }
  }
};

let harvestChart = null;

function fmtHarvest(n){ return Number(n || 0).toLocaleString("ja-JP") + "尾"; }

function renderHarvestAnalysis(){
  const regionKey = document.getElementById("harvestRegion")?.value || "central";
  const region = SALMON_HARVEST.regions[regionKey];
  const canvas = document.getElementById("harvestChart");
  const stats = document.getElementById("harvestStats");
  const subtitle = document.getElementById("harvestSubtitle");
  if (!region || !canvas || !window.Chart) return;

  if (subtitle) subtitle.textContent = `${region.label}（${region.detail}）`;
  const vals = region.values;
  const avg = Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
  const max = Math.max(...vals), min = Math.min(...vals);
  const maxYear = SALMON_HARVEST.years[vals.indexOf(max)];
  const minYear = SALMON_HARVEST.years[vals.indexOf(min)];
  const latest = vals[vals.length-1], prev = vals[vals.length-2];
  const yoy = prev ? ((latest/prev-1)*100) : 0;

  if (stats) stats.innerHTML = `
    <div><small>2025</small><strong>${fmtHarvest(latest)}</strong></div>
    <div><small>前年比</small><strong>${yoy >= 0 ? "+" : ""}${yoy.toFixed(1)}%</strong></div>
    <div><small>10年平均</small><strong>${fmtHarvest(avg)}</strong></div>
    <div><small>最多</small><strong>${maxYear}・${fmtHarvest(max)}</strong></div>
    <div><small>最少</small><strong>${minYear}・${fmtHarvest(min)}</strong></div>`;

  harvestChart?.destroy();
  harvestChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: SALMON_HARVEST.years.map(String),
      datasets: [{ label: `${region.label} 秋サケ漁獲尾数`, data: vals, borderWidth: 3, pointRadius: 3, tension: .2, fill: false }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => fmtHarvest(c.parsed.y) } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => (v/10000).toLocaleString("ja-JP") + "万" }, title: { display: true, text: "漁獲尾数" } },
        x: { title: { display: true, text: "年" } }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("harvestRegion")?.addEventListener("change", renderHarvestAnalysis);
  renderHarvestAnalysis();
});
