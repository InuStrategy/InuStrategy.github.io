/** All financial data enters the UI here. null means unknown; 0 means a measured zero. */
export const EMPTY_TOKEN = {status:'prelaunch',price:null,priceChange24h:null,return7d:null,return30d:null,marketCap:null,liquidity:null,volume24h:null,holders:null,topHolders:[],totalSupply:null,activity:{transactions:null,buys:null,sells:null,newHolders:null},history:[],source:'',updatedAt:null};
const num = x => x!==null && x!==undefined && x!=='' && Number.isFinite(Number(x)) ? Number(x) : null;
const positive = x => {const n=num(x);return n!=null&&n>=0?n:null;};
const isAddress = x => typeof x==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x);
async function json(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(15000),cache:'no-store'});if(!r.ok){const error=new Error('Data request failed');error.status=r.status;throw error;}return r.json();}
export async function rpc(config,method,params){const result=await json(config.rpcUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});if(result.error||!('result' in result))throw new Error('Solana RPC unavailable');return result.result;}
export function normalizeToken(input){
 const result=structuredClone(EMPTY_TOKEN);
 for(const key of ['price','marketCap','liquidity','volume24h','holders','totalSupply'])result[key]=positive(input[key]);
 result.priceChange24h=num(input.priceChange24h);
 result.return7d=num(input.return7d);result.return30d=num(input.return30d);
 for(const key of Object.keys(result.activity))result.activity[key]=positive(input.activity?.[key]);
 result.history=(Array.isArray(input.history)?input.history:[]).filter(x=>Number.isFinite(x.timestamp)&&x.timestamp<=Date.now()&&positive(x.price)!==null).map(x=>({timestamp:x.timestamp,price:positive(x.price),volume:positive(x.volume)})).sort((a,b)=>a.timestamp-b.timestamp);
 result.status='live';result.source=typeof input.source==='string'?input.source:'Configured data provider';result.updatedAt=Date.now();return result;
}
export async function enrichHolders(data,config){
 if(config.holderProvider==='pumpfun'){
 try{
 const result=await json('https://advanced-api-v2.pump.fun/coins/top-holders/'+encodeURIComponent(config.tokenAddress));
 if(!Array.isArray(result.topHolders)||!Number.isSafeInteger(result.totalHolders)||result.totalHolders<result.topHolders.length)throw new Error('Invalid holder count');
 const supply=positive(data.totalSupply);
 data.topHolders=result.topHolders.filter(row=>isAddress(row?.address)&&positive(row?.amount)>0).slice(0,10).map(row=>({address:row.address,amount:positive(row.amount),percentage:supply>0?positive(row.amount)/supply*100:null}));
 data.holders=result.totalHolders;data.holdersSource='Pump.fun';data.holdersUpdatedAt=Date.now();data.holdersStatus='live';
 }catch{data.holdersStatus='unavailable';}
 return data;
 }

 if(!config.solscanApiKey){data.holdersStatus='not-configured';return data;}
 try{
 const endpoint=new URL('https://pro-api.solscan.io/v2.0/token/holders');
 endpoint.searchParams.set('address',config.tokenAddress);endpoint.searchParams.set('page','1');endpoint.searchParams.set('page_size','10');
 const result=await json(endpoint,{headers:{token:config.solscanApiKey,accept:'application/json'}});
 const count=result.data?.total;
 if(result.success!==true||!Number.isSafeInteger(count)||count<0)throw new Error('Invalid holder count');
 data.holders=count;data.holdersSource='Solscan';data.holdersUpdatedAt=Date.now();data.holdersStatus='live';
 }catch(error){data.holdersStatus='unavailable';console.warn('Solscan holder lookup failed:',Number.isInteger(error.status)?'HTTP '+error.status:'invalid response or connection failure');}
 return data;
}
export class TokenProvider{
 constructor(config){this.config=config;}
 async get(){const c=this.config;if(!c.tokenAddress)return structuredClone(EMPTY_TOKEN);try{
   if(!isAddress(c.tokenAddress))throw new Error('Invalid mint');
   const mint=await rpc(c,'getAccountInfo',[c.tokenAddress,{encoding:'jsonParsed',commitment:'finalized'}]);
   if(!mint?.value||!['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'].includes(mint.value.owner)||mint.value.data?.parsed?.type!=='mint')throw new Error('Configured address is not a Solana mint');
   if(c.tokenDataUrl){const endpoint=new URL(c.tokenDataUrl);endpoint.searchParams.set('mint',c.tokenAddress);const data=await json(endpoint);if(data.mint!==c.tokenAddress)throw new Error('Mint mismatch');return enrichHolders(normalizeToken(data),c);}
   const pairs=await json('https://api.dexscreener.com/token-pairs/v1/solana/'+encodeURIComponent(c.tokenAddress));
   const pair=pairs.filter(p=>p.chainId==='solana'&&p.baseToken.address===c.tokenAddress).sort((a,b)=>(b.liquidity?.usd||0)-(a.liquidity?.usd||0))[0];
   if(!pair)return structuredClone(EMPTY_TOKEN);
   const data=normalizeToken({price:pair.priceUsd,priceChange24h:pair.priceChange?.h24,marketCap:pair.marketCap,liquidity:pair.liquidity?.usd,volume24h:pair.volume?.h24,activity:{buys:pair.txns?.h24?.buys,sells:pair.txns?.h24?.sells},source:'DEX Screener · highest-liquidity pool'});
   // Supply is optional: an unavailable RPC must not discard valid market data.
   try{const supply=await rpc(c,'getTokenSupply',[c.tokenAddress,{commitment:'finalized'}]);data.totalSupply=positive(supply.value.uiAmountString);}catch{}
   return enrichHolders(data,c);
 }catch{return {...structuredClone(EMPTY_TOKEN),status:'error'};}}
}
const emptyFees = (c,status='pending',note='') => ({status,recipientAddress:c.fee.recipientAddress,recipientName:c.fee.recipientName,totalTokenFees:null,totalUsdValue:null,transactionCount:null,fees24h:null,fees7d:null,fees30d:null,transactions:[],assetTotals:[],lastTransaction:null,note});
/** Aggregation never substitutes spot prices for historical prices or mixes asset units. */
export function aggregateFees(transfers,config,now=Date.now()){
 const unique=new Map();
 for(const t of transfers){
   if(t.recipient!==config.fee.recipientAddress||t.finalized!==true||t.failed||!t.txHash||!Number.isInteger(t.instructionIndex)||!(t.amount>0)||!Number.isFinite(t.amount)||!Number.isFinite(t.timestamp)||t.timestamp>now)continue;
   if(config.fee.sourceAddresses?.length&&!config.fee.sourceAddresses.includes(t.sender))continue;
   const category=t.mint===config.tokenAddress?'token':t.mint==='SOL'&&config.fee.includeNative?'native':config.fee.otherAssets?.find(x=>x.mint===t.mint)?'other':null;
   if(!category)continue;
   const asset=category==='token'?config.symbol:category==='native'?'SOL':config.fee.otherAssets.find(x=>x.mint===t.mint).symbol;
   const historical=t.priceBasis==='historical'&&positive(t.historicalUsdPrice)!=null;
   unique.set(t.txHash+':'+t.instructionIndex,{...t,asset,category,usdValue:historical?t.amount*t.historicalUsdPrice:null});
 }
 const transactions=[...unique.values()].sort((a,b)=>b.timestamp-a.timestamp||b.instructionIndex-a.instructionIndex);
 const total=list=>list.every(t=>t.usdValue!==null)?list.reduce((sum,t)=>sum+t.usdValue,0):null;
 const assetTotals=[];for(const tx of transactions){let row=assetTotals.find(a=>a.mint===tx.mint);if(!row){row={mint:tx.mint,asset:tx.asset,category:tx.category,amount:0};assetTotals.push(row);}row.amount+=tx.amount;}
 return {...emptyFees(config,'verified'),transactions,assetTotals,totalTokenFees:transactions.filter(t=>t.category==='token').reduce((sum,t)=>sum+t.amount,0),totalUsdValue:total(transactions),transactionCount:new Set(transactions.map(t=>t.txHash)).size,fees24h:total(transactions.filter(t=>t.timestamp>=now-86400000)),fees7d:total(transactions.filter(t=>t.timestamp>=now-7*86400000)),fees30d:total(transactions.filter(t=>t.timestamp>=now-30*86400000)),lastTransaction:transactions[0]||null,note:transactions.some(t=>t.usdValue===null)?'Historical prices are unavailable for some transfers. Raw asset totals are shown; no lifetime USD total is estimated. Recipient identity is not independently verified.':'USD values use historical prices at transfer time. Accounting covers only the currently configured recipient. Recipient identity is not independently verified.'};
}
/** Extract actual inbound transfer instructions; transaction fees, rent and swaps are not inferred as payments. */
export function extractTransfers(transaction,signature,accounts,config){
 if(!transaction||transaction.meta?.err||!transaction.blockTime)return [];
 const result=[],balances=[...(transaction.meta.preTokenBalances||[]),...(transaction.meta.postTokenBalances||[])];
 const keys=transaction.transaction.message.accountKeys.map(x=>typeof x==='string'?x:x.pubkey);
 const tokenInfo=new Map(balances.map(b=>[keys[b.accountIndex],b]));
 const instructions=[...transaction.transaction.message.instructions,...(transaction.meta.innerInstructions||[]).flatMap(x=>x.instructions)];
 instructions.forEach((instruction,index)=>{
   const parsed=instruction.parsed,info=parsed?.info;if(!info||!['transfer','transferChecked'].includes(parsed.type))return;
   let mint,amount,sender;
   if(instruction.program==='system'&&config.fee.includeNative&&info.destination===config.fee.recipientAddress){mint='SOL';amount=Number(info.lamports)/1e9;sender=info.source;}
   else if(instruction.program==='spl-token'&&accounts.has(info.destination)){
     const balance=tokenInfo.get(info.destination);mint=info.mint||balance?.mint;const decimals=info.tokenAmount?.decimals??balance?.uiTokenAmount?.decimals;
     if(decimals==null)return;amount=Number(info.tokenAmount?.amount??info.amount)/10**decimals;
     sender=tokenInfo.get(info.source)?.owner||info.authority||info.source;
   }else return;
   result.push({txHash:signature,instructionIndex:index,timestamp:transaction.blockTime*1000,recipient:config.fee.recipientAddress,sender,mint,amount,finalized:true,failed:false,priceBasis:'unavailable'});
 });return result;
}
export class FeeProvider{
 constructor(config){this.config=config;}
 async get(){const c=this.config;
   if(!c.fee.enabled||!c.tokenAddress||!c.fee.recipientAddress)return emptyFees(c);
   // An arbitrary incoming transfer cannot be identified as a protocol fee without its source.
   if(!c.fee.sourceAddresses?.length)return emptyFees(c,'pending','Recipient configured. Awaiting verified fee-source addresses so ordinary transfers are not counted as protocol fees. Recipient identity is not independently verified.');
   try{
     if(!isAddress(c.tokenAddress)||!isAddress(c.fee.recipientAddress)||!c.fee.sourceAddresses.every(isAddress))throw new Error('Invalid address');
     if(c.fee.indexerUrl){
       const url=new URL(c.fee.indexerUrl,globalThis.location?.href);url.searchParams.set('recipient',c.fee.recipientAddress);url.searchParams.set('mint',c.tokenAddress);
       const response=await json(url);
       // Only a full, finalized, recipient-scoped history qualifies as lifetime accounting.
       if(response.recipient!==c.fee.recipientAddress||response.mint!==c.tokenAddress||response.completeHistory!==true||response.commitment!=='finalized'||!Array.isArray(response.transfers))throw new Error('Incomplete fee history');
       return aggregateFees(response.transfers,c);
     }
     return await this.fromRpc();
   }catch{return emptyFees(c,'error','Verified fee history could not be loaded in full. No partial lifetime total is displayed. Retrying automatically.');}
 }
 async fromRpc(){
   const c=this.config,recipient=c.fee.recipientAddress,accounts=new Set(),signatures=new Set();
   const mints=[c.tokenAddress,...(c.fee.otherAssets||[]).map(x=>x.mint)];
   for(const mint of mints){const response=await rpc(c,'getTokenAccountsByOwner',[recipient,{mint},{encoding:'jsonParsed',commitment:'finalized'}]);for(const a of response.value)accounts.add(a.pubkey);}
   // Closed historical token accounts are not discoverable using getTokenAccountsByOwner.
   // Consequently RPC-only results are a current-account snapshot, never a lifetime USD claim.
   for(const address of [recipient,...accounts]){
     let before;for(let page=0;page<20;page++){
       const list=await rpc(c,'getSignaturesForAddress',[address,{limit:1000,commitment:'finalized',...(before?{before}:{})}]);
       list.filter(t=>!t.err).forEach(t=>signatures.add(t.signature));if(list.length<1000)break;
       if(page===19)throw new Error('Indexer required for complete history');before=list.at(-1).signature;
     }
   }
   const transfers=[];
   for(const signature of signatures){const tx=await rpc(c,'getTransaction',[signature,{encoding:'jsonParsed',commitment:'finalized',maxSupportedTransactionVersion:0}]);if(!tx)throw new Error('Missing historical transaction');transfers.push(...extractTransfers(tx,signature,accounts,c));}
   const result=aggregateFees(transfers,c);result.totalUsdValue=null;result.status='partial';result.note='Verified transfers for currently open recipient token accounts. Closed accounts may be missing, so lifetime USD totals are withheld. Historical pricing requires an indexer. Recipient identity is not independently verified.';return result;
 }
}
