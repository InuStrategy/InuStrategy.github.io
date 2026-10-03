import test from 'node:test';
import assert from 'node:assert/strict';
import {getStonkfunRewards} from '../backend/stonkfun.js';

const mint='DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP',quote='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh';
const response=value=>({ok:true,status:200,json:async()=>value});
const fetchImpl=async url=>url.endsWith('/rewards')?response({mint,distributedTokens:8000,undistributedTokens:25,payoutCount:2000000,holderCount:46000,lastPayoutAt:'2026-09-30T12:00:00.000Z',quote:{mint:quote,symbol:'NVDAX',decimals:6}}):url.includes('dexscreener')?response([{chainId:'solana',baseToken:{address:mint},quoteToken:{address:quote},priceUsd:'0.57',priceNative:'0.5',liquidity:{usd:1000}}]):response({mint,mode:'reward',transferFee:{bps:100}});

test('maps verified StonkFun lifetime rewards and quote value',async()=>{
 const result=await getStonkfunRewards(mint,{fetchImpl});
 assert.equal(result.status,'verified');assert.ok(Number.isFinite(Date.parse(result.verifiedAt)));assert.equal(result.totalAmount,8000);assert.equal(result.totalUsdValue,9120);assert.equal(result.transactionCount,2000000);assert.equal(result.uniqueRecipients,46000);assert.equal(result.assetSymbol,'NVDAX');assert.equal(result.distributed24h,null);assert.deepEqual(result.topReceivers,[]);
});

test('withholds USD totals when the quote asset has no priced pool',async()=>{
 const result=await getStonkfunRewards(mint,{fetchImpl:async url=>url.includes('dexscreener')?response([]):fetchImpl(url)});
 assert.equal(result.totalUsdValue,null);assert.equal(result.totalAmount,8000);
});

test('rejects a mismatched token or non-reward mode',async()=>{
 await assert.rejects(()=>getStonkfunRewards(mint,{fetchImpl:async url=>url.endsWith('/rewards')?fetchImpl(url):url.includes('dexscreener')?fetchImpl(url):response({mint,mode:'standard'})}),/reward token/);
});
