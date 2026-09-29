import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateDistributions,DistributionProvider} from '../backend/distributions.js';

const now=Date.now();
const config={distribution:{enabled:true,senderAddress:'11111111111111111111111111111111',assetMint:'So11111111111111111111111111111111111111112',assetSymbol:'USDC',indexerUrl:''}};
const transfer=(extra={})=>({txHash:'distribution-1',instructionIndex:0,timestamp:now-1000,sender:config.distribution.senderAddress,recipient:'Vote111111111111111111111111111111111111111',mint:config.distribution.assetMint,amount:100,finalized:true,priceBasis:'historical',historicalUsdPrice:1,...extra});

test('distribution accounting ranks receivers and deduplicates transfer instructions',()=>{
 const first=transfer(),second=transfer({txHash:'distribution-2',recipient:'Stake11111111111111111111111111111111111111',amount:50});
 const result=aggregateDistributions([first,second,first],config,now);
 assert.equal(result.totalAmount,150);assert.equal(result.totalUsdValue,150);assert.equal(result.transactionCount,2);assert.equal(result.uniqueRecipients,2);assert.equal(result.distributed24h,150);
 assert.equal(result.topReceivers[0].address,first.recipient);assert.equal(result.topReceivers[0].percentage,100/150*100);
});

test('distribution accounting rejects wrong sender, mint, failed and self transfers',()=>{
 const result=aggregateDistributions([transfer({sender:'BadSender'}),transfer({mint:'SOL'}),transfer({failed:true}),transfer({recipient:config.distribution.senderAddress})],config,now);
 assert.equal(result.totalAmount,null);assert.equal(result.transactionCount,0);assert.deepEqual(result.topReceivers,[]);
});

test('distribution provider stays pending until wallet, asset and history provider exist',async()=>{
 const missing=await new DistributionProvider({...config,distribution:{...config.distribution,senderAddress:''}}).get();assert.equal(missing.status,'pending');
 const noIndexer=await new DistributionProvider(config).get();assert.equal(noIndexer.status,'pending');assert.equal(noIndexer.totalUsdValue,null);
});
