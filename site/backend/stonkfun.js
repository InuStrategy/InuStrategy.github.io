const number=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const nonnegative=value=>{const n=number(value);return n!==null&&n>=0?n:null;};
const address=value=>typeof value==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
const unwrap=(payload,key)=>payload?.data?.[key]??payload?.[key]??payload?.data??payload;

async function json(fetchImpl,url){
 const response=await fetchImpl(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(!response.ok)throw new Error(`StonkFun request failed (${response.status})`);
 return response.json();
}

/** Maps StonkFun's public, per-token lifetime summary without inventing 24-hour or receiver data. */
export async function getStonkfunRewards(mint,{fetchImpl=fetch}={}){
 if(!address(mint))throw new Error('Invalid reward token mint');
 const root='https://www.stonkfun.xyz/api/public/v1/tokens/'+encodeURIComponent(mint);
 const [tokenPayload,rewardPayload,pairs]=await Promise.all([
  json(fetchImpl,root),json(fetchImpl,root+'/rewards'),json(fetchImpl,'https://api.dexscreener.com/token-pairs/v1/solana/'+encodeURIComponent(mint))
 ]);
 const token=unwrap(tokenPayload,'token'),rewards=unwrap(rewardPayload,'rewards');
 const responseMint=token?.mint??token?.address??token?.tokenMint??rewards?.mint??rewards?.tokenMint;
 if(responseMint!==mint||token?.mode!=='reward')throw new Error('Token is not a matching StonkFun reward token');
 const quote=rewards?.quote??token?.quote;
 if(!address(quote?.mint)||typeof quote?.symbol!=='string'||!quote.symbol.trim())throw new Error('Invalid reward quote asset');
 const distributed=nonnegative(rewards?.distributedTokens),undistributed=nonnegative(rewards?.undistributedTokens),payoutCount=nonnegative(rewards?.payoutCount),holderCount=nonnegative(rewards?.holderCount);
 if(distributed===null||undistributed===null||!Number.isSafeInteger(payoutCount)||!Number.isSafeInteger(holderCount))throw new Error('Invalid reward totals');
 const lastTimestamp=Date.parse(rewards?.lastPayoutAt);if(!Number.isFinite(lastTimestamp))throw new Error('Invalid last payout time');
 const pair=Array.isArray(pairs)?pairs.filter(row=>row?.chainId==='solana'&&row?.baseToken?.address===mint&&row?.quoteToken?.address===quote.mint).sort((a,b)=>(b?.liquidity?.usd||0)-(a?.liquidity?.usd||0))[0]:null;
 const tokenUsd=nonnegative(pair?.priceUsd),tokenQuote=nonnegative(pair?.priceNative),quoteUsd=tokenUsd!==null&&tokenQuote>0?tokenUsd/tokenQuote:null,totalUsdValue=quoteUsd===null?null:distributed*quoteUsd;
 return {
  status:'verified',verifiedAt:new Date().toISOString(),displayLabel:'Super Inu Holder Rewards · Test',senderAddress:'',assetMint:quote.mint,assetSymbol:quote.symbol.trim(),
  totalAmount:distributed,totalUsdValue,totalBtcValue:null,transactionCount:payoutCount,uniqueRecipients:holderCount,distributed24h:null,distributed7d:null,
  undistributedAmount:undistributed,transferFeeBps:nonnegative(token?.transferFee?.bps),transactions:[],topReceivers:[],
  lastDistribution:{timestamp:lastTimestamp,amount:null,asset:quote.symbol.trim(),usdValue:null,txHash:'',recipient:''},
  explorerAddressUrl:'https://solscan.io/token/'+encodeURIComponent(mint),source:'StonkFun public API',
  note:`Verified StonkFun lifetime reward totals paid in ${quote.symbol.trim()}. A complete 24-hour total and receiver leaderboard are not provided by the per-token public summary.`
 };
}
