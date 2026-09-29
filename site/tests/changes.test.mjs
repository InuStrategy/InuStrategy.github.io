import test from 'node:test';
import assert from 'node:assert/strict';
import {appendMetricHistory,enrichMetricChanges,metricChange} from '../backend/changes.js';

test('metric history keeps valid recent observations and appends the current snapshot',()=>{
 const now=10*86_400_000;
 const history=appendMetricHistory([
  {timestamp:now-9*86_400_000,liquidity:1},
  {timestamp:now-86_400_000,liquidity:100,volume24h:200,marketCap:300},
  {timestamp:now+1,liquidity:999}
 ],{liquidity:125,volume24h:250,marketCap:330},now);
 assert.equal(history.length,2);
 assert.deepEqual(history.at(-1),{timestamp:now,marketCap:330,liquidity:125,volume24h:250});
});

test('metric history does not turn unavailable values into measured zeroes',()=>{
 assert.deepEqual(appendMetricHistory([{timestamp:Date.now()-1000,liquidity:null}],{marketCap:null,liquidity:null,volume24h:null}),[]);
});

test('24 hour changes require a real baseline and calculate signed amount and percent',()=>{
 const now=2*86_400_000;
 assert.deepEqual(metricChange(125,[{timestamp:now-86_400_000,value:100}],now),{amount:25,percent:25,baseline:100});
 assert.equal(metricChange(125,[{timestamp:now-20*60*60*1000,value:100}],now),null);
});

test('price and market cap use the provider 24 hour price change immediately',()=>{
 const token={price:0.012,priceChange24h:20,marketCap:1_200_000,liquidity:500_000,volume24h:75_000};
 enrichMetricChanges(token,[],Date.now());
 assert.equal(token.metricChanges24h.price.amount,0.002);
 assert.equal(token.metricChanges24h.price.percent,20);
 assert.equal(token.metricChanges24h.marketCap.amount,200_000);
 assert.equal(token.metricChanges24h.liquidity,null);
});
