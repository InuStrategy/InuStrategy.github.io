import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCandles,loadChartHistory} from '../dist/live-history.js';

test('chart history validates candles and maps every requested range',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return {ok:true,json:async()=>calls.length===1?{data:[{attributes:{address:'pool',reserve_in_usd:'10'},relationships:{base_token:{data:{id:'solana_mint'}}}}]}:{meta:{base:{address:'mint'}},data:{attributes:{ohlcv_list:[[2,0,0,0,2,20],[1,0,0,0,1,10],['bad']]}}}};};
 try{const result=await loadChartHistory('mint');assert.deepEqual(Object.keys(result.historyByRange),['15M','1H','4H','1D','7D','30D','3M','ALL']);assert.deepEqual(result.historyByRange['15M'],[{timestamp:1000,price:1,volume:10},{timestamp:2000,price:2,volume:20}]);assert.equal(result.historySource,'GeckoTerminal');assert.equal(calls.length,5);assert.ok(calls.some(url=>url.includes('/ohlcv/day')));}finally{globalThis.fetch=original;}
});

test('candle parser rejects invalid values',()=>{assert.deepEqual(parseCandles([[1,0,0,0,-1,2],[2,0,0,0,1,-2],null]),[]);});
