import test from 'node:test';
import assert from 'node:assert/strict';
import {candles,enrichHistory} from '../backend/history.js';
test('candles use close and volume, reject invalid and future entries, sort and deduplicate',()=>{assert.deepEqual(candles([[2,9,9,9,3,4],[1,9,9,9,2,3],[2,9,9,9,4,5],[4,0,0,0,1,1],[1,0,0,0,-1,1]],3000),[{timestamp:1000,price:2,volume:3},{timestamp:2000,price:4,volume:5}]);});
test('chart failures never discard current market data',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('offline');};try{const token={status:'live',price:1};assert.equal((await enrichHistory(token,'mint')).price,1);}finally{globalThis.fetch=original;}});
