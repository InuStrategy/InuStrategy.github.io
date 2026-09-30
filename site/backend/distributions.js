const positive=value=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;
const isAddress=value=>typeof value==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);

export const emptyDistributions=(config,status='pending',note='')=>({
 status,senderAddress:config.distribution.senderAddress,assetMint:config.distribution.assetMint,assetSymbol:config.distribution.assetSymbol,
 totalAmount:null,totalUsdValue:null,totalBtcValue:null,transactionCount:null,uniqueRecipients:null,distributed24h:null,distributed7d:null,
 transactions:[],topReceivers:[],lastDistribution:null,note
});

export function aggregateDistributions(transfers,config,now=Date.now()){
 const unique=new Map(),expected=config.distribution;
 for(const transfer of Array.isArray(transfers)?transfers:[]){
  if(transfer.sender!==expected.senderAddress||transfer.mint!==expected.assetMint||!isAddress(transfer.recipient)||transfer.recipient===expected.senderAddress||transfer.finalized!==true||transfer.failed||!transfer.txHash||!Number.isInteger(transfer.instructionIndex)||!Number.isFinite(transfer.timestamp)||transfer.timestamp>now)continue;
  const amount=positive(transfer.amount);if(amount===null)continue;
  const priced=transfer.priceBasis==='historical'&&positive(transfer.historicalUsdPrice)!==null,btcPrice=positive(transfer.historicalBtcUsdPrice),usdValue=priced?amount*transfer.historicalUsdPrice:null;
  unique.set(transfer.txHash+':'+transfer.instructionIndex,{...transfer,amount,asset:expected.assetSymbol,usdValue,btcValue:usdValue!==null&&btcPrice!==null?usdValue/btcPrice:null});
 }
 const transactions=[...unique.values()].sort((a,b)=>b.timestamp-a.timestamp||b.instructionIndex-a.instructionIndex);
 const totalAmount=transactions.reduce((sum,row)=>sum+row.amount,0),completeUsd=list=>list.every(row=>row.usdValue!==null)?list.reduce((sum,row)=>sum+row.usdValue,0):null;
 const receivers=new Map();for(const row of transactions){let receiver=receivers.get(row.recipient);if(!receiver){receiver={address:row.recipient,amount:0,usdValue:0,priced:true,transfers:0};receivers.set(row.recipient,receiver);}receiver.amount+=row.amount;receiver.transfers++;if(row.usdValue===null)receiver.priced=false;else receiver.usdValue+=row.usdValue;}
 const topReceivers=[...receivers.values()].map(row=>({address:row.address,amount:row.amount,usdValue:row.priced?row.usdValue:null,transfers:row.transfers,percentage:totalAmount>0?row.amount/totalAmount*100:null})).sort((a,b)=>b.amount-a.amount).slice(0,10);
 const totalBtcValue=transactions.length&&transactions.every(row=>row.btcValue!==null)?transactions.reduce((sum,row)=>sum+row.btcValue,0):null;
 return {...emptyDistributions(config,'verified'),totalAmount:transactions.length?totalAmount:null,totalUsdValue:transactions.length?completeUsd(transactions):null,totalBtcValue,transactionCount:new Set(transactions.map(row=>row.txHash)).size,uniqueRecipients:receivers.size,distributed24h:completeUsd(transactions.filter(row=>row.timestamp>=now-86_400_000)),distributed7d:completeUsd(transactions.filter(row=>row.timestamp>=now-7*86_400_000)),transactions,topReceivers,lastDistribution:transactions[0]||null,note:transactions.some(row=>row.usdValue===null)?'On-chain payouts are verified. Some historical USD prices are unavailable, so incomplete USD totals are withheld.':transactions.some(row=>row.btcValue===null)?'USD values are verified at payout time. Historical BTC/USD data is still required for the BTC total.':'USD and BTC values use historical prices at each payout time.'};
}

export class DistributionProvider{
 constructor(config){this.config=config;}
 async get(){const config=this.config,distribution=config.distribution;if(!distribution.enabled||!distribution.senderAddress||!distribution.assetMint)return emptyDistributions(config,'pending','Awaiting the official distribution wallet and payout asset.');
  if(!isAddress(distribution.senderAddress)||!(distribution.assetMint==='SOL'||isAddress(distribution.assetMint)))return emptyDistributions(config,'error','The configured distribution wallet or payout asset is invalid.');
  if(!distribution.indexerUrl)return emptyDistributions(config,'pending','Distribution wallet configured. Awaiting a complete finalized transfer-history provider.');
  try{
   const url=new URL(distribution.indexerUrl);url.searchParams.set('sender',distribution.senderAddress);url.searchParams.set('mint',distribution.assetMint);
   const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Distribution request failed');const data=await response.json();
   if(data.sender!==distribution.senderAddress||data.mint!==distribution.assetMint||data.completeHistory!==true||data.commitment!=='finalized'||!Array.isArray(data.transfers))throw new Error('Incomplete distribution history');
   return aggregateDistributions(data.transfers,config);
  }catch{return emptyDistributions(config,'error','Verified distribution history is temporarily unavailable. Retrying automatically.');}
 }
}
