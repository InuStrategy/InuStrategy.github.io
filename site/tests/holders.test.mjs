import test from 'node:test';
import assert from 'node:assert/strict';
import {enrichHolders} from '../backend/providers.js';
const config={tokenAddress:'So11111111111111111111111111111111111111112',solscanApiKey:'test-only-key'};
test('Solscan uses aggregate total, not page length, and keeps key out of result',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{assert.equal(new URL(url).searchParams.get('address'),config.tokenAddress);assert.equal(options.headers.token,config.solscanApiKey);return {ok:true,json:async()=>({success:true,data:{total:1234,items:[{}]}})};};
 try{const data=await enrichHolders({holders:null,price:2},config);assert.equal(data.holders,1234);assert.equal(data.holdersSource,'Solscan');assert.equal(JSON.stringify(data).includes(config.solscanApiKey),false);}finally{globalThis.fetch=original;}
});
test('missing key skips requests; failed and invalid responses preserve market data',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw new Error('unauthorized');};
 try{assert.equal((await enrichHolders({holders:null},{})).holdersStatus,'not-configured');assert.equal(calls,0);
 const failed=await enrichHolders({holders:null,price:2},config);assert.equal(failed.price,2);assert.equal(failed.holders,null);assert.equal(failed.holdersStatus,'unavailable');
 for(const total of [-1,1.2,null,'12']){globalThis.fetch=async()=>({ok:true,json:async()=>({success:true,data:{total}})});assert.equal((await enrichHolders({holders:null},config)).holders,null);}
 globalThis.fetch=async()=>({ok:true,json:async()=>({success:true,data:{total:0}})});assert.equal((await enrichHolders({holders:null},config)).holders,0);
 }finally{globalThis.fetch=original;}
});
