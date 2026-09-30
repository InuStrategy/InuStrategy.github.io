export function selectMarket(pairs,mint){
 if(!Array.isArray(pairs))throw new Error('Invalid DEX response');
 const pair=pairs.filter(p=>p&&p.chainId==='solana'&&p.baseToken?.address===mint).sort((a,b)=>(b.liquidity?.usd||0)-(a.liquidity?.usd||0))[0];
 if(!pair)throw new Error('No matching pool');
 const values={price:pair.priceUsd,priceChange24h:pair.priceChange?.h24,marketCap:pair.marketCap,liquidity:pair.liquidity?.usd,volume24h:pair.volume?.h24};
 const valid={};for(const [key,raw] of Object.entries(values)){if(raw===null||raw===undefined||raw===''||!['number','string'].includes(typeof raw))continue;const value=Number(raw);if(Number.isFinite(value)&&(key==='priceChange24h'||value>=0))valid[key]=value;}
 if(!Object.keys(valid).length)throw new Error('No valid market metrics');
 const buys=Number(pair.txns?.h24?.buys),sells=Number(pair.txns?.h24?.sells),activity={};if(Number.isFinite(buys)&&buys>=0)activity.buys=buys;if(Number.isFinite(sells)&&sells>=0)activity.sells=sells;
 return {...valid,...(Object.keys(activity).length?{activity}:{}),status:'live',source:'DEX Screener · highest-liquidity pool',updatedAt:Date.now()};
}
const CACHE_TTL=10000;
const cacheKey=mint=>'inu-market-v2:'+mint;
const lockKey=mint=>'inu-market-lock-v2:'+mint;
function readCache(mint){try{const value=JSON.parse(localStorage.getItem(cacheKey(mint)));return value?.mint===mint&&Number.isFinite(value.savedAt)&&value.data?value:null;}catch{return null;}}
function writeCache(mint,data){try{localStorage.setItem(cacheKey(mint),JSON.stringify({mint,savedAt:Date.now(),data}));}catch{}}
function acquireLock(mint){try{const key=lockKey(mint),now=Date.now(),active=Number(localStorage.getItem(key));if(Number.isFinite(active)&&active>now)return false;localStorage.setItem(key,String(now+CACHE_TTL));return true;}catch{return true;}}
function releaseLock(mint){try{localStorage.removeItem(lockKey(mint));}catch{}}
export function startMarketRefresh(getMint,onData){
 let busy=false;
 async function update(){if(busy||document.visibilityState==='hidden')return;const mint=getMint();if(!mint)return;const cached=readCache(mint),now=Date.now();if(cached){onData(cached.data);if(now-cached.savedAt<CACHE_TTL)return;}if(!acquireLock(mint))return;busy=true;
 try{let pairs,lastError;for(const url of ['https://api.dexscreener.com/token-pairs/v1/solana/'+encodeURIComponent(mint),'https://api.dexscreener.com/tokens/v1/solana/'+encodeURIComponent(mint)]){try{const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('DEX Screener HTTP '+response.status);pairs=await response.json();break;}catch(error){lastError=error;}}if(!pairs)throw lastError||new Error('DEX Screener unavailable');const data=selectMarket(pairs,mint);writeCache(mint,data);if(getMint()===mint)onData(data);}
 catch(error){console.warn('Market refresh failed; retaining last values.',error.message);}finally{releaseLock(mint);busy=false;}}
 function start(){void update();setInterval(update,CACHE_TTL);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 addEventListener('storage',event=>{const mint=getMint();if(mint&&event.key===cacheKey(mint)){const cached=readCache(mint);if(cached)onData(cached.data);}});
 return update;
}
