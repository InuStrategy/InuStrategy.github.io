import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCandles,loadShortHistory} from '../dist/live-history.js';

test('short history validates candles and maps them to 15 minute and 1 hour ranges',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return {ok:true,json:async()=>calls.length===1?{data:[{attributes:{address:'pool',reserve_in_usd:'10'},relationships:{base_token:{data:{id:'solana_mint'}}}}]}:{meta:{base:{address:'mint'}},data:{attributes:{ohlcv_list:[[2,0,0,0,2,20],[1,0,0,0,1,10],['bad']]}}}};};
 try{const result=await loadShortHistory('mint');assert.deepEqual(result.historyByRange['15M'],[{timestamp:1000,price:1,volume:10},{timestamp:2000,price:2,volume:20}]);assert.equal(result.historyByRange['1H'],result.historyByRange['15M']);assert.equal(result.historySource,'GeckoTerminal');assert.match(calls[1],/ohlcv\/minute/);}finally{globalThis.fetch=original;}
});

test('candle parser rejects invalid values',()=>{assert.deepEqual(parseCandles([[1,0,0,0,-1,2],[2,0,0,0,1,-2],null]),[]);});
