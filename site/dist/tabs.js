// DOM order is the source of truth for left/right movement.
export function setupTabs(onChange){
 const ids=['overview','performance','holders','fees','media'],titles=['Overview','Performance','Holders','Fees','Media'];const main=document.querySelector('main');
 const holder=document.createElement('section');holder.id='holders';holder.innerHTML='<div class="eyebrow">TOKEN OWNERSHIP</div><h2>Holders</h2><div class="holder-total" id="holder-total">—</div><p id="holder-detail">Awaiting token launch.</p><div class="table-scroll holder-table"><table><thead><tr><th>Rank</th><th>Verified wallet</th><th>Balance</th><th>% Supply</th><th>Total Value</th></tr></thead><tbody id="holder-rows"><tr><td colspan="5" class="empty-row">Holder distribution will appear when available.</td></tr></tbody></table></div><p class="fine-print">Top wallet holders reported by Pump.fun and verified through Solana account ownership. Liquidity pools, executable programs, program-owned accounts, and unverified addresses are excluded. Total value uses the current token price.</p>';main.append(holder);
 const overview=document.createElement('div');overview.id='overview-panel';for(const id of ['overview','meme-metrics','allocation-note'])overview.append(document.getElementById(id));
 const panels=[overview,...ids.slice(1).map(id=>document.getElementById(id))];const stage=document.createElement('div');stage.className='tab-stage';main.append(stage);
 panels.forEach((p,i)=>{p.classList.add('tab-panel');p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby','tab-'+ids[i]);p.id=i===0?'overview-panel':ids[i];stage.append(p);});
 const links=[...document.querySelectorAll('#navigation a')];document.getElementById('navigation').setAttribute('role','tablist');
 let active=Math.max(0,ids.indexOf(location.hash.slice(1))),busy=false,pending=null;
 function mark(){panels.forEach((p,i)=>{p.hidden=i!==active;});links.forEach((a,i)=>{a.classList.toggle('active',i===active);a.setAttribute('aria-selected',String(i===active));a.tabIndex=i===active?0:-1;});document.title=`INSTR ${titles[active]} - InuStrategy`;}
 async function select(next){if(busy){pending=next;return;}if(next===active)return;busy=true;const old=panels[active],incoming=panels[next],right=next>active;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduced){old.classList.add('is-moving',right?'exit-left':'exit-right');await new Promise(r=>setTimeout(r,180));}
 old.hidden=true;old.classList.remove('is-moving','exit-left','exit-right');active=next;mark();
 if(!reduced){incoming.classList.add(right?'enter-right':'enter-left');void incoming.offsetWidth;incoming.classList.add('is-moving');incoming.classList.remove('enter-right','enter-left');}
 onChange();if(!reduced)await new Promise(r=>setTimeout(r,180));incoming.classList.remove('is-moving');busy=false;if(pending!==null){const n=pending;pending=null;select(n);}
 }
 links.forEach((a,i)=>{a.id='tab-'+ids[i];a.setAttribute('role','tab');a.setAttribute('aria-controls',panels[i].id);a.addEventListener('click',e=>{e.preventDefault();history.pushState(null,'','#'+ids[i]);select(i);});a.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%ids.length;if(e.key==='ArrowLeft')n=(i+ids.length-1)%ids.length;if(e.key==='Home')n=0;if(e.key==='End')n=ids.length-1;if(n!==undefined){e.preventDefault();links[n].focus();links[n].click();}});});
 addEventListener('hashchange',()=>select(Math.max(0,ids.indexOf(location.hash.slice(1)))));addEventListener('popstate',()=>select(Math.max(0,ids.indexOf(location.hash.slice(1)))));mark();
}
