import {enrichHistory} from '../backend/history.js';
import {readFile,writeFile} from 'node:fs/promises';
import {TokenProvider} from '../backend/providers.js';
import {getStonkfunRewards} from '../backend/stonkfun.js';
const config=JSON.parse(await readFile(new URL('../config.json',import.meta.url),'utf8'));
config.tokenAddress='DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP';config.symbol='SI';
config.solscanApiKey=process.env.SOLSCAN_API_KEY||'';
config.heliusApiKey=process.env.HELIUS_API_KEY||'';config.holderProvider='helius';
config.tokenDataUrl='';config.rpcUrl=process.env.SOLANA_RPC_URL||config.rpcUrl;
const tokenPromise=new TokenProvider(config).get();
const rewardsPromise=getStonkfunRewards(config.tokenAddress).catch(async()=>{
 try{const response=await fetch('https://inustrategy.com/data/test-token.json',{signal:AbortSignal.timeout(15000),cache:'no-store'});if(response.ok){const previous=await response.json();if(previous.mint===config.tokenAddress&&previous.distributions?.status==='verified')return {...previous.distributions,verifiedAt:previous.distributions.verifiedAt||previous.generatedAt,note:previous.distributions.note+' The latest provider refresh failed, so the last verified totals remain visible.'};}}catch{}
 return {status:'error',displayLabel:'Super Inu Holder Rewards · Test',senderAddress:'',assetMint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',assetSymbol:'NVDAX',totalAmount:null,totalUsdValue:null,totalBtcValue:null,transactionCount:null,uniqueRecipients:null,distributed24h:null,distributed7d:null,transactions:[],topReceivers:[],lastDistribution:null,source:'StonkFun public API',explorerAddressUrl:'https://solscan.io/token/'+config.tokenAddress,note:'StonkFun reward totals are temporarily unavailable. Retrying on the next scheduled refresh.'};
});
const [token,distributions]=await Promise.all([tokenPromise,rewardsPromise]);
await enrichHistory(token,config.tokenAddress);
await writeFile(new URL('../dist/data/test-token.json',import.meta.url),JSON.stringify({generatedAt:new Date().toISOString(),mint:config.tokenAddress,token,distributions},null,2)+'\n');
console.log('Separate test snapshot:',token.status);
