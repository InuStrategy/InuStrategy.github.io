import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyToken,getIcrcToken,isCanisterId} from '../backend/icp.js';
const ledger='l3iu2-tyaaa-aaaal-qxm4q-cai';
test('validates ICP canister IDs',()=>{assert.equal(isCanisterId(ledger),true);assert.equal(isCanisterId('solana-address'),false);});
test('production remains prelaunch without a ledger',async()=>{assert.equal((await getIcrcToken({ledgerCanisterId:''})).status,'prelaunch');});
test('maps only verified ICRC account data',async()=>{const replies=[{total:2},{data:[{id:'aaaaa-aa',balance:'25'},{id:'bbbbb-bb',balance:'10'}]}],fetchImpl=async()=>({ok:true,json:async()=>replies.shift()});const token=await getIcrcToken({ledgerCanisterId:ledger},{fetchImpl});assert.equal(token.holders,2);assert.equal(token.holdersStatus,'live');assert.equal(token.topHolders[0].amount,25);assert.equal(token.price,null);});
test('withholds unavailable holder data',async()=>{const token=await getIcrcToken({ledgerCanisterId:ledger},{fetchImpl:async()=>({ok:false,status:503})});assert.equal(token.holders,null);assert.equal(token.holdersStatus,'unavailable');assert.deepEqual(token.topHolders,[]);assert.equal(emptyToken().price,null);});
