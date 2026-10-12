import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {getIcrcToken,isCanisterId} from '../backend/icp.js';
const config=JSON.parse(await readFile(new URL('../config.json',import.meta.url),'utf8'));
if(config.chain!=='icp')throw new Error('Only ICP is configured');
config.ledgerCanisterId=process.env.ICP_LEDGER_CANISTER_ID||config.ledgerCanisterId;
config.marketCanisterId=process.env.ICP_MARKET_CANISTER_ID||config.marketCanisterId;
config.poolCanisterId=process.env.ICP_POOL_CANISTER_ID||config.poolCanisterId;
for(const id of [config.ledgerCanisterId,config.marketCanisterId,config.poolCanisterId].filter(Boolean))if(!isCanisterId(id))throw new Error('Invalid ICP canister ID');
const token=await getIcrcToken(config);
const links={};for(const key of ['buy','explorer','x','youtube']){const value=config.links[key];links[key]=typeof value==='string'&&value.startsWith('https://')?value:'';}
if(!links.explorer&&config.ledgerCanisterId)links.explorer=`https://dashboard.internetcomputer.org/canister/${encodeURIComponent(config.ledgerCanisterId)}`;
const publicConfig={name:config.name,symbol:config.symbol,chain:config.chain,ledgerCanisterId:config.ledgerCanisterId,marketCanisterId:config.marketCanisterId,poolCanisterId:config.poolCanisterId,links,announcement:config.announcement};
const snapshot={schemaVersion:2,generatedAt:new Date().toISOString(),config:publicConfig,token};
const output=new URL('../dist/data/',import.meta.url);await mkdir(output,{recursive:true});
await writeFile(new URL('snapshot.tmp',output),JSON.stringify(snapshot,null,2)+'\n');await rename(new URL('snapshot.tmp',output),new URL('snapshot.json',output));
console.log(`ICP snapshot generated: token=${token.status}; ledger=${config.ledgerCanisterId||'pending'}.`);
