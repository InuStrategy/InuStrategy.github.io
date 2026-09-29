const TRACKED = ['marketCap','liquidity','volume24h'];
const DAY = 86_400_000;

const finitePositive = value => value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;

export function appendMetricHistory(previous,current,now=Date.now()){
  const cutoff=now-8*DAY;
  const points=(Array.isArray(previous)?previous:[])
    .filter(point=>Number.isFinite(point?.timestamp)&&point.timestamp>=cutoff&&point.timestamp<=now)
    .map(point=>({timestamp:point.timestamp,...Object.fromEntries(TRACKED.map(key=>[key,finitePositive(point[key])]))}))
    .filter(point=>TRACKED.some(key=>point[key]!==null))
    .sort((a,b)=>a.timestamp-b.timestamp);
  const next={timestamp:now,...Object.fromEntries(TRACKED.map(key=>[key,finitePositive(current?.[key])]))};
  if(TRACKED.some(key=>next[key]!==null))points.push(next);
  return points.filter((point,index,list)=>index===list.length-1||point.timestamp!==list[index+1].timestamp).slice(-2400);
}

export function metricChange(current,history,now=Date.now()){
  const value=finitePositive(current);
  if(value===null||!Array.isArray(history)||!history.length)return null;
  const target=now-DAY;
  const eligible=history.filter(point=>Number.isFinite(point?.timestamp)&&point.timestamp<=target&&point.timestamp>=target-2*60*60*1000&&finitePositive(point.value)!==null);
  if(!eligible.length)return null;
  const baseline=eligible.at(-1).value;
  if(!(baseline>0))return null;
  const amount=value-baseline;
  return {amount,percent:amount/baseline*100,baseline};
}

export function enrichMetricChanges(token,previousHistory=[],now=Date.now()){
  const metricHistory=appendMetricHistory(previousHistory,token,now);
  const metricChanges24h={};
  for(const key of TRACKED){
    const history=metricHistory.map(point=>({timestamp:point.timestamp,value:point[key]}));
    metricChanges24h[key]=metricChange(token?.[key],history,now);
  }
  const pricePercent=Number.isFinite(token?.priceChange24h)?token.priceChange24h:null;
  if(token?.price!=null&&pricePercent!==null&&pricePercent>-100){
    const baseline=token.price/(1+pricePercent/100);
    metricChanges24h.price={amount:token.price-baseline,percent:pricePercent,baseline};
    if(token.marketCap!=null&&!metricChanges24h.marketCap){
      const marketBaseline=token.marketCap/(1+pricePercent/100);
      metricChanges24h.marketCap={amount:token.marketCap-marketBaseline,percent:pricePercent,baseline:marketBaseline};
    }
  }else metricChanges24h.price=null;
  token.metricHistory=metricHistory;
  token.metricChanges24h=metricChanges24h;
  return token;
}
