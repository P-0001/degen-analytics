export interface RawBetRecord {
  id: string;
  game_name: string;
  bet_amount: string | number;
  currency: string;
  currency_amount?: string | number;
  payout: string | number;
  currency_payout?: string | number;
  multiplier: number;
  time: string;
  icon?: string;
  rollback: boolean;
  complete: boolean;
}

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

export interface RawTransactionRecord {
  id: string;
  status: string;
  type: string;
  method: string;
  amount: string;
  currency: string;
  external_amount?: string;
  external_currency?: string;
  external_txid?: string;
  updated_at: string;
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

export interface StatsHistoryEntry {
  id: string;
  time: number;
  bets: number;
  data: {
    overall: OverallStats;
    games: GameStats[];
    providers: ProviderStats[];
    streaks: Streaks;
    betStats: BetStats;
    equityCurve: EquityPoint[];
    invalidRecords: number;
    processingTime: number;
  };
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

export interface BetStats {
  topBets: BetRecord[];
}

export interface EquityPoint {
  time: number;
  value: number;
}

export interface StatsResult {
  overall: OverallStats;
  games: GameStats[];
  providers: ProviderStats[];
  streaks: Streaks;
  betStats: BetStats;
  equityCurve: EquityPoint[];
  invalidRecords: number;
  processingTime: number;
}

export interface FilterOptions {
  currency?: string;
  game?: string;
  minPlays?: number;
  top?: number;
  topBets?: number;
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

export interface ProcessFilesMessage {
  type: 'process';
  data: {
    files: { name: string; content: string }[];
    fileType: 'bets' | 'deposits' | 'withdrawals';
    convertCurrency?: boolean;
    currencyFrom?: string;
    currencyTo?: string;
    currencyColumns?: string[];
  };
}

export interface ProgressMessage {
  type: 'progress';
  progress: number;
}

export interface CompleteMessage {
  type: 'complete';
  data: {
    csv: string;
    rowCount: number;
    fileType: string;
  };
}

export interface ErrorMessage {
  type: 'error';
  error: string;
}

export interface FileGroup {
  bets: File[];
  deposits: File[];
  withdrawals: File[];
}
