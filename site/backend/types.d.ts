export interface TokenData {
  mint: string;
  price: number | null;
  priceChange24h: number | null;
  marketCap: number | null;
  liquidity: number | null;
  volume24h: number | null;
  metricChanges24h?: Record<'price'|'marketCap'|'liquidity'|'volume24h', {amount: number; percent: number; baseline: number} | null>;
  metricHistory?: {timestamp: number; marketCap: number | null; liquidity: number | null; volume24h: number | null}[];
  holders: number | null;
  totalSupply: number | null;
  return7d: number | null;
  return30d: number | null;
  activity: {transactions: number | null; buys: number | null; sells: number | null; newHolders: number | null};
  history: {timestamp: number; price: number; volume: number | null}[];
  source: string;
}
export interface FeeTransfer {
  txHash: string;
  instructionIndex: number;
  timestamp: number;
  recipient: string;
  sender: string;
  mint: string;
  amount: number;
  finalized: boolean;
  failed?: boolean;
  priceBasis: 'historical' | 'unavailable';
  historicalUsdPrice?: number;
}
export interface FeeStats {
  recipientAddress: string;
  recipientName: string;
  totalTokenFees: number | null;
  totalUsdValue: number | null;
  transactionCount: number | null;
  fees24h: number | null;
  fees7d: number | null;
  fees30d: number | null;
  lastTransaction: (FeeTransfer & {usdValue: number | null; asset: string}) | null;
}
export interface DistributionTransfer {
  txHash: string;
  instructionIndex: number;
  timestamp: number;
  sender: string;
  recipient: string;
  mint: string;
  amount: number;
  finalized: boolean;
  failed?: boolean;
  priceBasis: 'historical' | 'unavailable';
  historicalUsdPrice?: number;
}
export interface DistributionStats {
  status: 'pending' | 'verified' | 'error';
  senderAddress: string;
  assetMint: string;
  assetSymbol: string;
  totalAmount: number | null;
  totalUsdValue: number | null;
  transactionCount: number | null;
  uniqueRecipients: number | null;
  distributed24h: number | null;
  distributed7d: number | null;
  topReceivers: {address: string; amount: number; usdValue: number | null; transfers: number; percentage: number | null}[];
}
