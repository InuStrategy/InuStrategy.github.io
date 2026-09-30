const root='https://api.geckoterminal.com/api/v2/networks/solana';
const request=async url=>{const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('GeckoTerminal HTTP '+response.status);return response.json();};
export function parseCandles(rows){return (Array.isArray(rows)?rows:[]).map(row=>({timestamp:Number(row?.[0])*1000,price:Number(row?.[4]),volume:Number(row?.[5])})).filter(point=>Number.isFinite(point.timestamp)&&point.timestamp>0&&Number.isFinite(point.price)&&point.price>=0&&Number.isFinite(point.volume)&&point.volume>=0).sort((a,b)=>a.timestamp-b.timestamp);}
export async function loadChartHistory(mint){
 const pools=await request(root+'/tokens/'+encodeURIComponent(mint)+'/pools?page=1');
 const pool=(pools.data||[]).filter(item=>item.relationships?.base_token?.data?.id==='solana_'+mint).sort((a,b)=>Number(b.attributes?.reserve_in_usd||0)-Number(a.attributes?.reserve_in_usd||0))[0];
 if(!pool?.attributes?.address)throw new Error('No matching GeckoTerminal pool');
 const address=encodeURIComponent(pool.attributes.address),frames=[['minute',1,300,['15M','1H','4H']],['minute',15,96,['1D']],['hour',1,720,['7D','30D']],['day',1,1000,['3M','ALL']]];
 const settled=await Promise.allSettled(frames.map(async([unit,aggregate,limit,ranges])=>{const result=await request(root+'/pools/'+address+'/ohlcv/'+unit+'?aggregate='+aggregate+'&limit='+limit+'&currency=usd&token=base');if(result.meta?.base?.address!==mint)throw new Error('Chart mint mismatch');const points=parseCandles(result.data?.attributes?.ohlcv_list);if(!points.length)throw new Error('No valid candle history');return {ranges,points};}));
 const historyByRange={};for(const result of settled)if(result.status==='fulfilled')for(const range of result.value.ranges)historyByRange[range]=result.value.points;
 if(!Object.keys(historyByRange).length)throw new Error('No chart history available');
 return {historyByRange,historySource:'GeckoTerminal'};
}
