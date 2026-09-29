export function selectMarket(pairs,mint){
 if(!Array.isArray(pairs))throw new Error('Invalid DEX response');
 const pair=pairs.filter(p=>p&&p.chainId==='solana'&&p.baseToken?.address===mint).sort((a,b)=>(b.liquidity?.usd||0)-(a.liquidity?.usd||0))[0];
 if(!pair)throw new Error('No matching pool');
 const values={price:pair.priceUsd,priceChange24h:pair.priceChange?.h24,marketCap:pair.marketCap,liquidity:pair.liquidity?.usd,volume24h:pair.volume?.h24};
 const valid={};for(const [key,raw] of Object.entries(values)){if(raw===null||raw===undefined||raw===''||!['number','string'].includes(typeof raw))continue;const value=Number(raw);if(Number.isFinite(value)&&(key==='priceChange24h'||value>=0))valid[key]=value;}
 if(!Object.keys(valid).length)throw new Error('No valid market metrics');
 return {...valid,status:'live',source:'DEX Screener · highest-liquidity pool',updatedAt:Date.now()};
}
export function startMarketRefresh(getMint,onData){
 let busy=false;
 async function update(){if(busy)return;const mint=getMint();if(!mint)return;busy=true;
 try{const response=await fetch('https://api.dexscreener.com/token-pairs/v1/solana/'+encodeURIComponent(mint),{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('DEX Screener HTTP '+response.status);const data=selectMarket(await response.json(),mint);if(getMint()===mint)onData(data);}
 catch(error){console.warn('Market refresh failed; retaining last values.',error.message);}finally{busy=false;}}
 function start(){void update();setInterval(update,10000);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 return update;
}
