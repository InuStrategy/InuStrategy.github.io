export function candles(rows,now=Date.now()){
 return [...new Map((Array.isArray(rows)?rows:[]).filter(r=>Array.isArray(r)&&Number.isFinite(r[0])&&r[0]*1000<=now&&Number.isFinite(r[4])&&r[4]>=0&&Number.isFinite(r[5])&&r[5]>=0).map(r=>[r[0],{timestamp:r[0]*1000,price:r[4],volume:r[5]}])).values()].sort((a,b)=>a.timestamp-b.timestamp);
}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('Chart provider unavailable');return r.json();}
export async function enrichHistory(token,mint){
 if(token.status!=='live'||!mint)return token;
 try{
 const root='https://api.geckoterminal.com/api/v2/networks/solana';
 const pools=await get(root+'/tokens/'+encodeURIComponent(mint)+'/pools');
 const pool=pools.data?.filter(p=>p.relationships?.base_token?.data?.id==='solana_'+mint).sort((a,b)=>Number(b.attributes.reserve_in_usd)-Number(a.attributes.reserve_in_usd))[0];
 if(!pool)return token;
 token.historyByRange={};
 for(const [frame,aggregate,limit,ranges] of [['minute',1,1000,['1H','6H','12H']],['minute',15,96,['1D']],['hour',1,720,['7D','30D']],['day',1,180,['3M','ALL']]]){
 try{
 const result=await get(root+'/pools/'+encodeURIComponent(pool.attributes.address)+'/ohlcv/'+frame+'?aggregate='+aggregate+'&limit='+limit+'&currency=usd&token=base');
 if(result.meta?.base?.address!==mint)throw new Error('Chart mint mismatch');
 const points=candles(result.data?.attributes?.ohlcv_list);for(const range of ranges)token.historyByRange[range]=points;
 }catch{}
 }
 token.historySource='GeckoTerminal';token.historyPool=pool.attributes.address;token.historyUpdatedAt=Date.now();
 }catch{}
 return token;
}
