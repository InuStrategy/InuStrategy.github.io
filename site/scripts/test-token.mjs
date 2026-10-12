import {readFile,writeFile} from 'node:fs/promises';
import {getIcrcToken} from '../backend/icp.js';
const root=JSON.parse(await readFile(new URL('../config.json',import.meta.url),'utf8')),test=root.testToken;
const config={name:test.name,symbol:test.symbol,chain:'icp',ledgerCanisterId:test.ledgerCanisterId,marketCanisterId:test.marketCanisterId,poolCanisterId:test.poolCanisterId,links:{buy:test.launchpadUrl,explorer:`https://dashboard.internetcomputer.org/canister/${test.ledgerCanisterId}`,x:'',youtube:''},announcement:root.announcement};
const token=await getIcrcToken(config);
await writeFile(new URL('../dist/data/test-token.json',import.meta.url),JSON.stringify({schemaVersion:2,generatedAt:new Date().toISOString(),config,token},null,2)+'\n');
console.log(`ICP test snapshot generated: ledger=${test.ledgerCanisterId}; market=${test.marketCanisterId}.`);
