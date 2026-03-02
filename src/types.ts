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
}

export interface WorkerMessage {
  type: 'process' | 'progress' | 'complete' | 'error';
  data?: any;
  progress?: number;
  error?: string;
}
