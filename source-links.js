// 釣果カードのリンクと固有IDを、app.js が実際に描画した catches の同一行から付与する。
(function () {
  const text = v => String(v ?? "").trim();

  function sourceUrl(row) {
    return [row?.["リンクURL"],row?.["URL/出典"],row?.["URL"],row?.["出典URL"],row?.["情報源URL"]]
      .map(text).find(v => /^https?:\/\//i.test(v)) || "";
  }
  function sourceLabel(row) { return text(row?.["リンク表示"] || row?.["情報源"] || row?.["情報区分"] || "情報源"); }
  function recordId(row) { return text(row?.["ID"] || row?.["管理コード"]); }

  async function copyText(value, button) {
    try { await navigator.clipboard.writeText(value); }
    catch (_) {
      const t=document.createElement("textarea"); t.value=value; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    if(button){ const old=button.textContent; button.textContent="✓ コピー済"; setTimeout(()=>button.textContent=old,1200); }
  }

  function renderedRows() {
    if (typeof catches === "undefined" || !Array.isArray(catches)) return [];
    const fish=document.getElementById("fish")?.value||"all", area=document.getElementById("area")?.value||"all", caught=document.getElementById("caught")?.value||"all", trust=document.getElementById("trust")?.value||"all", time=document.getElementById("time")?.value||"all", dateFrom=document.getElementById("dateFrom")?.value||"", dateTo=document.getElementById("dateTo")?.value||"", sort=document.getElementById("sort")?.value||"new";
    let rows=catches.filter(row=>{const rowFish=text(row["魚種"]),rowArea=text(row["エリア"]),rowTime=text(row["時間帯"]),rowTrust=text(row["信頼度"]),rowDate=getDate(row),count=getCatchCount(row);if(fish!=="all"&&rowFish!==fish)return false;if(area!=="all"&&rowArea!==area)return false;if(caught==="yes"&&count<=0)return false;if(caught==="no"&&count>0)return false;if(trust!=="all"&&trustScore(rowTrust)<trustScore(trust))return false;if(time!=="all"&&!rowTime.includes(time))return false;if(dateFrom&&rowDate&&rowDate<dateFrom)return false;if(dateTo&&rowDate&&rowDate>dateTo)return false;return true;});
    if(sort==="new")rows.sort((a,b)=>getDate(b).localeCompare(getDate(a)));if(sort==="old")rows.sort((a,b)=>getDate(a).localeCompare(getDate(b)));if(sort==="catch")rows.sort((a,b)=>getCatchCount(b)-getCatchCount(a));if(sort==="trust")rows.sort((a,b)=>trustScore(b["信頼度"])-trustScore(a["信頼度"]));
    return rows;
  }

  function decorate() {
    const cards=[...document.querySelectorAll("#cards > .card")]; if(!cards.length)return;
    const rows=renderedRows();
    cards.forEach((card,index)=>{
      const row=rows[index]; if(!row)return;

      // ID は必ずカード上部に表示。app.js 側ですでに存在する場合は重複させない。
      const rid=recordId(row);
      if(rid && !card.querySelector(".record-id")){
        const top=card.querySelector(".top");
        const wrap=document.createElement("div"); wrap.className="record-id";
        const span=document.createElement("span"); span.textContent=`ID: ${rid}`;
        const btn=document.createElement("button"); btn.type="button"; btn.textContent="📋 コピー"; btn.addEventListener("click",()=>copyText(rid,btn));
        wrap.append(span,btn); top?.insertAdjacentElement("afterend",wrap);
      }

      const metas=card.querySelectorAll(".meta"), sourceMeta=metas[metas.length-1]; if(!sourceMeta)return;
      const label=sourceLabel(row),url=sourceUrl(row); sourceMeta.textContent=label; if(!url)return;
      const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label.startsWith("🔗")?label:`🔗 ${label||"元情報を開く"}`;a.style.color="#177eaa";a.style.fontWeight="700";a.style.textDecoration="underline";a.style.textUnderlineOffset="3px";a.style.cursor="pointer";sourceMeta.textContent="";sourceMeta.appendChild(a);
    });
  }

  const cards=document.getElementById("cards");
  if(cards)new MutationObserver(()=>requestAnimationFrame(decorate)).observe(cards,{childList:true});
  document.addEventListener("change",()=>requestAnimationFrame(decorate));
  window.addEventListener("load",()=>setTimeout(decorate,500));
})();