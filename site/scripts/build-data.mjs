import {enrichHistory} from '../backend/history.js';
import {enrichMetricChanges} from '../backend/changes.js';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {TokenProvider,FeeProvider} from '../backend/providers.js';
const config=JSON.parse(await readFile(new URL('../config.json',import.meta.url),'utf8'));
if(config.chain!=='solana')throw new Error('Only Solana is configured');
config.tokenAddress=process.env.TOKEN_CA||config.tokenAddress;
config.rpcUrl=process.env.SOLANA_RPC_URL||config.rpcUrl;
config.solscanApiKey=process.env.SOLSCAN_API_KEY||'';
config.tokenDataUrl=process.env.TOKEN_DATA_URL||config.tokenDataUrl;
config.fee.indexerUrl=process.env.FEE_INDEXER_URL||config.fee.indexerUrl;
config.fee.recipientAddress=process.env.FEE_RECIPIENT||config.fee.recipientAddress;
if(process.env.FEE_SOURCES)config.fee.sourceAddresses=process.env.FEE_SOURCES.split(',').map(x=>x.trim()).filter(Boolean);
for(const endpoint of [config.rpcUrl,config.tokenDataUrl,config.fee.indexerUrl].filter(Boolean)){if(new URL(endpoint).protocol!=='https:')throw new Error('Provider endpoints must use HTTPS');}
const [token,fees]=await Promise.all([new TokenProvider(config).get(),new FeeProvider(config).get()]);
await enrichHistory(token,config.tokenAddress);
let previousMetricHistory=[];
try{
 const previousUrl=process.env.PUBLIC_SNAPSHOT_URL||'https://inustrategy.com/data/snapshot.json';
 const response=await fetch(previousUrl,{cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(response.ok){const previous=await response.json();if(previous?.config?.tokenAddress===config.tokenAddress)previousMetricHistory=previous.token?.metricHistory||[];}
}catch{}
enrichMetricChanges(token,previousMetricHistory);
// These calculations run on the trusted build worker, never from browser input.
const buys=token.activity.buys,sells=token.activity.sells;
const trades=buys!=null&&sells!=null?buys+sells:null;
token.metrics={trades24h:trades,buySellRatio:sells>0&&buys!=null?buys/sells:null,averageTrade:trades>0&&token.volume24h!=null?token.volume24h/trades:null,volumeLiquidityRatio:token.liquidity>0&&token.volume24h!=null?token.volume24h/token.liquidity:null};
const links={};for(const key of ['buy','explorer','x']){const value=config.links[key];links[key]=typeof value==='string'&&value.startsWith('https://')?value:'';}
if(!links.explorer&&config.tokenAddress)links.explorer='https://solscan.io/token/'+encodeURIComponent(config.tokenAddress);
// Explicit public-field allowlist. RPC/indexer URLs and environment secrets are never published.
const publicConfig={name:config.name,symbol:config.symbol,chain:config.chain,tokenAddress:config.tokenAddress,links,announcement:config.announcement,fee:{enabled:config.fee.enabled,recipientAddress:config.fee.recipientAddress,recipientName:config.fee.recipientName,displayLabel:config.fee.displayLabel,explorerAddressUrl:config.fee.explorerAddressUrl}};
// Only the recent normalized fee records are needed by the UI. Lifetime accounting ran above.
fees.transactions=fees.transactions.slice(0,5).map(({timestamp,amount,asset,usdValue,txHash})=>({timestamp,amount,asset,usdValue,txHash}));
if(fees.lastTransaction){const {timestamp,amount,asset,usdValue,txHash}=fees.lastTransaction;fees.lastTransaction={timestamp,amount,asset,usdValue,txHash};}
const snapshot={schemaVersion:1,generatedAt:new Date().toISOString(),config:publicConfig,token,fees};
const output=new URL('../dist/data/',import.meta.url);await mkdir(output,{recursive:true});
await writeFile(new URL('snapshot.tmp',output),JSON.stringify(snapshot,null,2)+'\n');await rename(new URL('snapshot.tmp',output),new URL('snapshot.json',output));
console.log(`Snapshot generated: market=${token.status}; fees=${fees.status}. No credentials included.`);
