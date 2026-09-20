const API="https://script.google.com/macros/s/AKfycbzUWA0w2_MzltOtgGSBStBZKHzTaHt41DF2-3nw9niiMTOSHQRjNkbz5nETV8j_Mw0_/exec";

const $=s=>document.querySelector(s);
const score={A:3,B:2,C:1};

let data=[];
let summaries=[];

async function getSheet(sheet){
  const r=await fetch(API+"?sheet="+encodeURIComponent(sheet));
  if(r.ok===false) throw new Error("HTTP "+r.status);

  const j=await r.json();
  if(j.ok===false) throw new Error(j.error||"API error");

  return j.data||[];
}

function num(v){
  if(v===null||v===undefined||v==="") return null;

  const m=String(v).match(/\d+/);
  return m?Number(m[0]):null;
}

function timeGroup(v){
  v=String(v||"");

  if(v.includes("朝")||/0[4-9]:/.test(v)) return "朝";
  if(v.includes("昼")||/1[0-4]:/.test(v)) return "昼";
  if(v.includes("夕")||/1[5-8]:/.test(v)) return "夕";
  if(v.includes("夜")||/(?:19|2[0-3]|0[0-3]):/.test(v)) return "夜";

  return v||"不明";
}

function normalizeField(x){
  return {
    date:x["実釣日"]||x["確認日"]||"",
    area:x["エリア"]||"",
    spot:x["具体地点"]||"地点詳細不明",
    time:timeGroup(x["時間帯"]),
    rawTime:x["時間帯"]||"",
    n:num(x["釣果本数"]),
    t:x["信頼度"]||"C",
    kind:x["情報区分"]||"",
    source:x["情報源"]||"",
    method:x["釣法"]||""
  };
}

function setupAreas(){
  const sel=$("#area");

  sel.innerHTML="";

  ["all",...new Set(data.map(x=>x.area).filter(Boolean))]
    .forEach(v=>{
      sel.add(
        new Option(
          v==="all"?"全エリア":v,
          v
        )
      );
    });
}

function render(){
  let a=[...data];

  const ar=$("#area").value;
  const c=$("#caught").value;
  const t=$("#trust").value;
  const tm=$("#time").value;
  const s=$("#sort").value;

  const dateFrom=$("#dateFrom").value;
  const dateTo=$("#dateTo").value;

  if(ar!=="all"){
    a=a.filter(x=>x.area===ar);
  }

  if(c==="yes"){
    a=a.filter(x=>x.n!==null&&x.n>0);
  }

  if(c==="no"){
    a=a.filter(x=>x.n===0);
  }

  if(t!=="all"){
    a=a.filter(
      x=>(score[x.t]||0)>=(score[t]||0)
    );
  }

  if(tm!=="all"){
    a=a.filter(x=>x.time===tm);
  }

  if(dateFrom){
    a=a.filter(
      x=>x.date&&x.date>=dateFrom
    );
  }

  if(dateTo){
    a=a.filter(
      x=>x.date&&x.date<=dateTo
    );
  }

  if(s==="new"){
    a.sort(
      (x,y)=>y.date.localeCompare(x.date)
    );
  }

  if(s==="old"){
    a.sort(
      (x,y)=>x.date.localeCompare(y.date)
    );
  }

  if(s==="catch"){
    a.sort(
      (x,y)=>(y.n??-1)-(x.n??-1)
    );
  }

  if(s==="trust"){
    a.sort(
      (x,y)=>(score[y.t]||0)-(score[x.t]||0)
    );
  }

  $("#count").textContent=a.length+"件";

  $("#cards").innerHTML=a.map(x=>`
    <article class="card">

      <div class="top">
        <h3>${x.area||"エリア不明"}</h3>

        <b>
          ${x.n===null
            ?"本数不明"
            :x.n+"本"}
        </b>
      </div>

      <div class="meta">
        ${x.date||"日付不明"}
        ・
        ${x.rawTime||x.time}
        ・
        ${x.spot}
      </div>

      <span class="chip ${x.t}">
        信頼度 ${x.t}
      </span>

      ${
        x.kind
        ?`<span class="chip">${x.kind}</span>`
        :""
      }

      ${
        x.method
        ?`<div class="meta">🎣 ${x.method}</div>`
        :""
      }

      ${
        x.source
        ?`<div class="meta">出典：${x.source}</div>`
        :""
      }

    </article>
  `).join("")
  ||
  '<div class="empty">条件に合う記録なし</div>';
}

function renderSummary(){

  if(summaries.length===0){
    $("#summaryCards").innerHTML=
      '<div class="empty">日次サマリーなし</div>';
    return;
  }

  const dates=summaries
    .map(x=>x["日付"])
    .filter(Boolean)
    .sort();

  const latest=dates[dates.length-1];

  const rows=summaries
    .filter(x=>x["日付"]===latest)
    .sort(
      (a,b)=>
        (Number(a["順位"])||999)
        -
        (Number(b["順位"])||999)
    );

  const hero=rows[0];

  document.querySelector("#summary .hero").innerHTML=
    hero
    ?`
      <small>DB最新日 ${latest}</small>

      <h3>
        ${hero["エリア"]||"最新情報"}
      </h3>

      <p>
        <strong>
          ${hero["総合判定"]||""}
        </strong>
      </p>

      <p>
        ${
          hero["狙い目・注意"]
          ||
          hero["直近実釣果"]
          ||
          ""
        }
      </p>
    `
    :"";

  $("#summaryCards").innerHTML=
    rows.map(x=>`

      <article class="card">

        <div class="top">

          <h3>
            ${
              x["順位"]
              ?x["順位"]+"位 "
              :""
            }
            ${x["エリア"]||""}
          </h3>

          <b>
            ${x["総合判定"]||""}
          </b>

        </div>

        <div class="meta">
          前日比：
          ${x["前日比"]||"未確認"}
        </div>

        <div class="meta">
          🎣
          ${x["直近実釣果"]||"最新釣果未確認"}
        </div>

        <div class="meta">
          🌊
          ${x["風・波・濁り"]||"海況未確認"}
        </div>

        <div class="meta">
          ⏰
          ${x["有望時間・潮"]||"未確認"}
        </div>

        ${
          x["1〜2週間期待"]
          ?`
            <span class="chip">
              期待 ${x["1〜2週間期待"]}
            </span>
          `
          :""
        }

      </article>

    `).join("");
}

async function load(){

  document.querySelector("#summary .hero").innerHTML=
    `
      <small>Google Sheet接続中</small>
      <h3>最新情報を取得しています…</h3>
    `;

  try{

    const results=await Promise.all([
      getSheet("日次サマリー"),
      getSheet("釣果・現地情報")
    ]);

    summaries=results[0];
    data=results[1].map(normalizeField);

    setupAreas();
    renderSummary();
    render();

    $("#analysisBox").innerHTML=`
      <small>Google Sheet LIVE</small>

      <h3>
        ${data.length}件
      </h3>

      <p>
        日次サマリー ${summaries.length}件 /
        釣果・現地情報 ${data.length}件を取得。
      </p>

      <p>
        再読み込みすると
        Google Sheetの最新データを取得します。
      </p>
    `;

  }catch(e){

    console.error(e);

    document.querySelector("#summary .hero").innerHTML=`
      <small>接続エラー</small>

      <h3>
        Google Sheetを取得できません
      </h3>

      <p>
        ${e.message}
      </p>
    `;
  }
}

document
  .querySelectorAll("select")
  .forEach(x=>x.onchange=render);

$("#dateFrom").onchange=render;
$("#dateTo").onchange=render;

$("#reset").onclick=()=>{

  document
    .querySelectorAll("#search select")
    .forEach(x=>x.selectedIndex=0);

  $("#dateFrom").value="";
  $("#dateTo").value="";

  render();
};

document
  .querySelectorAll("nav button")
  .forEach(b=>b.onclick=()=>{

    document
      .querySelectorAll(".page,nav button")
      .forEach(
        x=>x.classList.remove("active")
      );

    $("#"+b.dataset.page)
      .classList.add("active");

    b.classList.add("active");
  });

load();