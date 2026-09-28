import {enrichHistory} from '../backend/history.js';
import {readFile,writeFile} from 'node:fs/promises';
import {TokenProvider} from '../backend/providers.js';
const config=JSON.parse(await readFile(new URL('../config.json',import.meta.url),'utf8'));
config.tokenAddress='CbcyNo7m1amFWqEQm2m4PLv1UNvpcL3C1Ujm6AkzpKoU';
config.solscanApiKey=process.env.SOLSCAN_API_KEY||'';
config.tokenDataUrl='';config.rpcUrl=process.env.SOLANA_RPC_URL||config.rpcUrl;
const token=await new TokenProvider(config).get();
await enrichHistory(token,config.tokenAddress);
let feeProofSummary='UsePaid routing proof could not be retrieved. Payment status is unknown.';
try{const response=await fetch('https://usepaid.app/api/fee-proof?mint='+config.tokenAddress,{signal:AbortSignal.timeout(15000)});const data=await response.json();feeProofSummary=`UsePaid proof endpoint returned HTTP ${response.status}. Routing status: ${String(data.status||"unknown")}; verified: ${data.verified===true?"yes":"no"}; proof attached: ${data.proof?"yes":"no"}. This does not establish any payout to the recipient.`;console.log('UsePaid response:',JSON.stringify(data).slice(0,4000));}catch{}
await writeFile(new URL('../dist/data/test-token.json',import.meta.url),JSON.stringify({generatedAt:new Date().toISOString(),mint:config.tokenAddress,token,feeProofSummary},null,2)+'\n');
console.log('Separate test snapshot:',token.status);
