export interface BetRecord {
  id: string;
  gameName: string;
  provider?: string;
  betAmount: number;
  payout: number;
  multiplier: number;
  currency: string;
  time: Date;
  rollback: boolean;
  complete: boolean;
}

export interface GameStats {
  gameName: string;
  count: number;
  totalBet: number;
  totalPayout: number;
  net: number;
  wins: number;
  losses: number;
  pushes: number;
  maxMultiplier: number;
  roi: number;
  winRate: number;
}

export interface ProviderStats {
  provider: string;
  count: number;
  totalBet: number;
  totalPayout: number;
  net: number;
  wins: number;
  losses: number;
  pushes: number;
  maxMultiplier: number;
  roi: number;
  winRate: number;
}

export interface TransactionRecord {
  id: string;
  status: string;
  type: 'deposit' | 'withdrawal';
  method: string;
  amount: number;
  currency: string;
  externalAmount?: number;
  externalCurrency?: string;
  externalTxid?: string;
  updatedAt: Date;
}

export interface TransactionStats {
  totalDeposits: number;
  totalWithdrawals: number;
  depositCount: number;
  withdrawalCount: number;
  netTransactions: number;
}

export interface OverallStats {
  totalBets: number;
  totalBet: number;
  totalPayout: number;
  net: number;
  roi: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  maxMultiplier: number;
  maxMultiplierBet?: BetRecord;
  maxWinBet?: BetRecord;
  maxLossBet?: BetRecord;
  firstBetTime?: Date;
  lastBetTime?: Date;
  currency: string;
  transactions?: TransactionStats;
}

export interface Streaks {
  currentStreak: { type: 'win' | 'loss' | 'push'; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
}

export interface StatsResult {
  overall: OverallStats;
  games: GameStats[];
  providers: ProviderStats[];
  streaks: Streaks;
  invalidRecords: number;
  processingTime: number;
}

export interface FilterOptions {
  currency?: string;
  game?: string;
  minPlays?: number;
  top?: number;
  depositFile?: File;
  withdrawalFile?: File;
}

export interface WorkerMessage {
  type: 'process' | 'progress' | 'complete' | 'error';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  progress?: number;
  error?: string;
}
