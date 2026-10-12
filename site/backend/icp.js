const PRINCIPAL=/^[a-z0-9]{5}(?:-[a-z0-9]{5}){3}-[a-z0-9]{3}$/;
export const emptyToken=(status='prelaunch')=>({status,price:null,priceChange24h:null,return7d:null,return30d:null,marketCap:null,liquidity:null,volume24h:null,holders:null,holdersSource:'ICP ICRC API',holdersStatus:'unavailable',holdersUpdatedAt:null,totalSupply:null,activity:{buys:null,sells:null},metrics:{},topHolders:[],history:[],historyByRange:{},historySource:'',source:'ICP network',updatedAt:Date.now()});
export function isCanisterId(value){return typeof value==='string'&&PRINCIPAL.test(value);}
async function json(url,fetchImpl){const response=await fetchImpl(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`ICP API returned HTTP ${response.status}`);return response.json();}
export async function getIcrcToken(config,{fetchImpl=fetch}={}){
 if(!config.ledgerCanisterId)return emptyToken();
 if(!isCanisterId(config.ledgerCanisterId))throw new Error('Invalid ICP ledger canister ID');
 const token=emptyToken('indexed');token.source='ICP ICRC API';token.updatedAt=Date.now();
 try{const base=`https://icrc-api.internetcomputer.org/api/v2/ledgers/${encodeURIComponent(config.ledgerCanisterId)}`;const [count,accounts]=await Promise.all([json(`${base}/accounts/count`,fetchImpl),json(`${base}/accounts?limit=10&sort_by=-balance`,fetchImpl)]);token.holders=Number.isSafeInteger(count?.total)&&count.total>0?count.total:null;token.holdersStatus=token.holders==null?'indexing':'live';token.holdersUpdatedAt=Date.now();token.topHolders=Array.isArray(accounts?.data)?accounts.data.map(row=>({address:String(row.id||row.owner||''),amount:Number(row.balance)})).filter(row=>row.address&&Number.isFinite(row.amount)&&row.amount>0):[];}catch{token.holdersStatus='unavailable';}
 return token;
}
