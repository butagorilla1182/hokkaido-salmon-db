const data=[
{date:"2025-10-12",area:"古平",spot:"古平川周辺",time:"朝",n:0,t:"A",kind:"現地確認"},
{date:"2025-10-10",area:"チマイベツ",spot:"チマイベツ周辺",time:"朝",n:null,t:"A",kind:"直接確認"},
{date:"2025-10-09",area:"チマイベツ",spot:"チマイベツ周辺",time:"朝",n:null,t:"C",kind:"伝聞・未検証"},
{date:"2025-10-09",area:"古平",spot:"古平川周辺",time:"朝",n:1,t:"C",kind:"伝聞"},
{date:"2025-10-02",area:"古平",spot:"古平川周辺",time:"朝",n:3,t:"A",kind:"実釣・現地確認"},
{date:"2025-09-20",area:"樽前川",spot:"樽前川河口周辺",time:"朝",n:0,t:"A",kind:"実釣"},
{date:"2025-09-08",area:"古平",spot:"古平川周辺",time:"朝",n:0,t:"A",kind:"実釣"}];
const sums=[["登別〜室蘭・チマイベツ","有望（暫定）"],["苫小牧・白老","有望（暫定）"],["浦河・歌別・えりも","魚は確認済み"],["古平・積丹","様子見"]];
const $=s=>document.querySelector(s),score={A:3,B:2,C:1};
["all",...new Set(data.map(x=>x.area))].forEach(v=>$("#area").add(new Option(v==="all"?"全エリア":v,v)));
function render(){let a=[...data],ar=$("#area").value,c=$("#caught").value,t=$("#trust").value,tm=$("#time").value,s=$("#sort").value;
if(ar!="all")a=a.filter(x=>x.area==ar);if(c=="yes")a=a.filter(x=>x.n>0);if(c=="no")a=a.filter(x=>x.n===0);if(t!="all")a=a.filter(x=>score[x.t]>=score[t]);if(tm!="all")a=a.filter(x=>x.time==tm);
if(s=="new")a.sort((x,y)=>y.date.localeCompare(x.date));if(s=="catch")a.sort((x,y)=>(y.n??-1)-(x.n??-1));if(s=="trust")a.sort((x,y)=>score[y.t]-score[x.t]);
$("#count").textContent=a.length+"件";$("#cards").innerHTML=a.map(x=>`<article class="card"><div class="top"><h3>${x.area}</h3><b>${x.n==null?"本数不明":x.n+"本"}</b></div><div class="meta">${x.date} ・ ${x.time} ・ ${x.spot}</div><span class="chip ${x.t}">信頼度 ${x.t}</span><span class="chip">${x.kind}</span></article>`).join("")||'<div class="empty">条件に合う記録なし</div>'}
document.querySelectorAll("select").forEach(x=>x.onchange=render);$("#reset").onclick=()=>{document.querySelectorAll("select").forEach(x=>x.selectedIndex=0);render()};
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".page,nav button").forEach(x=>x.classList.remove("active"));$("#"+b.dataset.page).classList.add("active");b.classList.add("active")});
$("#summaryCards").innerHTML=sums.map((x,i)=>`<article class="card"><div class="top"><h3>${i+1}位 ${x[0]}</h3><b>${x[1]}</b></div></article>`).join("");
$("#analysisBox").innerHTML=`<small>初号機データ</small><h3>${data.length}件</h3><p>次にGoogle Sheetを接続して、潮位・海水温・波・濁りまで分析対象にします。</p>`;render();