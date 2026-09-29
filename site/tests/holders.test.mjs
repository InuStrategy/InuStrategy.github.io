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

test('Pump.fun uses totalHolders rather than top-holder list length',async()=>{
 const original=globalThis.fetch;
 try{
 const address='5pHeNsWMVEi1cbMzLhgqABnhEUwRTSzy5vBfeGWyJfxS';
 globalThis.fetch=async(url,options)=>({ok:true,json:async()=>String(url).includes('pump.fun')?{topHolders:[{address,amount:250}],totalHolders:9562}:{result:{value:[{owner:'11111111111111111111111111111111',executable:false}]}}});
 const data=await enrichHolders({holders:null,totalSupply:1000},{...config,holderProvider:'pumpfun'});
 assert.equal(data.holders,9562);assert.equal(data.holdersSource,'Pump.fun');
 assert.deepEqual(data.topHolders,[{address,amount:250,percentage:25}]);
 assert.equal(data.topHoldersStatus,'verified-wallets');
 for(const result of [{topHolders:[{}]},{topHolders:[{}],totalHolders:0},{topHolders:[],totalHolders:-1}]){
 globalThis.fetch=async()=>({ok:true,json:async()=>result});assert.equal((await enrichHolders({holders:null},{...config,holderProvider:'pumpfun'})).holders,null);
 }
 }finally{globalThis.fetch=original;}
});
test('Pump.fun top holder list excludes program-owned and unresolved addresses',async()=>{const original=globalThis.fetch;const wallet='5pHeNsWMVEi1cbMzLhgqABnhEUwRTSzy5vBfeGWyJfxS',pool='4fvH46ajCnwsDxcdr9LWMMB4BfPnxtk8KLof9bTrBp9K',unknown='DZZVfvX7qyW468KgLa1mS5bdDunAoMq2JXPqHi2HjAvR';try{globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('pump.fun')?{topHolders:[{address:pool,amount:500},{address:wallet,amount:250},{address:unknown,amount:100}],totalHolders:20}:{result:{value:[{owner:'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',executable:false},{owner:'11111111111111111111111111111111',executable:false},null]}}});const data=await enrichHolders({totalSupply:1000},{...config,holderProvider:'pumpfun'});assert.deepEqual(data.topHolders,[{address:wallet,amount:250,percentage:25}]);assert.equal(data.topHoldersExcluded,2);}finally{globalThis.fetch=original;}});
