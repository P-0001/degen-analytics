import { describe, it, expect } from 'vitest';
import type {
  BetRecord,
  GameStats,
  ProviderStats,
  OverallStats,
  Streaks,
  TransactionRecord,
  TransactionStats,
  StatsResult,
  FilterOptions,
  BetStats,
  EquityPoint,
} from '../types';

describe('BetRecord Type', () => {
  it('should accept valid bet records with all required fields', () => {
    const betRecord: BetRecord = {
      id: '123',
      gameName: 'Blackjack',
      provider: 'Evolution',
      betAmount: 10,
      payout: 20,
      multiplier: 2,
      currency: 'USD',
      time: new Date('2024-01-01'),
      rollback: false,
      complete: true,
    };

    expect(betRecord.id).toBe('123');
    expect(betRecord.gameName).toBe('Blackjack');
    expect(betRecord.provider).toBe('Evolution');
    expect(betRecord.betAmount).toBe(10);
    expect(betRecord.payout).toBe(20);
    expect(betRecord.multiplier).toBe(2);
    expect(betRecord.currency).toBe('USD');
    expect(betRecord.time).toBeInstanceOf(Date);
    expect(betRecord.rollback).toBe(false);
    expect(betRecord.complete).toBe(true);
  });

  it('should allow optional provider field', () => {
    const betRecord: BetRecord = {
      id: '1',
      gameName: 'Poker',
      betAmount: 50,
      payout: 100,
      multiplier: 2,
      currency: 'USD',
      time: new Date(),
      rollback: false,
      complete: true,
    };

    expect(betRecord.provider).toBeUndefined();
  });

  it('should handle different currencies', () => {
    const currencies = ['USD', 'EUR', 'GBP', 'BTC'];
    currencies.forEach(currency => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Game',
        betAmount: 10,
        payout: 20,
        multiplier: 2,
        currency,
        time: new Date(),
        rollback: false,
        complete: true,
      };
      expect(bet.currency).toBe(currency);
    });
  });

  it('should handle various multiplier values', () => {
    const multipliers = [0, 0.5, 1, 2, 10, 100, 1000];
    multipliers.forEach(multiplier => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Game',
        betAmount: 10,
        payout: 10 * multiplier,
        multiplier,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };
      expect(bet.multiplier).toBe(multiplier);
    });
  });
});

describe('GameStats Type', () => {
  it('should contain all required statistical fields', () => {
    const gameStats: GameStats = {
      gameName: 'Roulette',
      count: 100,
      totalBet: 1000,
      totalPayout: 950,
      net: -50,
      wins: 45,
      losses: 50,
      pushes: 5,
      maxMultiplier: 35,
      roi: -5,
      winRate: 45,
    };

    expect(gameStats.gameName).toBe('Roulette');
    expect(gameStats.count).toBe(100);
    expect(gameStats.totalBet).toBe(1000);
    expect(gameStats.totalPayout).toBe(950);
    expect(gameStats.net).toBe(-50);
    expect(gameStats.wins).toBe(45);
    expect(gameStats.losses).toBe(50);
    expect(gameStats.pushes).toBe(5);
    expect(gameStats.maxMultiplier).toBe(35);
    expect(gameStats.roi).toBe(-5);
    expect(gameStats.winRate).toBe(45);
  });

  it('should validate that wins + losses + pushes equals count', () => {
    const gameStats: GameStats = {
      gameName: 'Slots',
      count: 100,
      totalBet: 1000,
      totalPayout: 1100,
      net: 100,
      wins: 60,
      losses: 30,
      pushes: 10,
      maxMultiplier: 50,
      roi: 10,
      winRate: 60,
    };

    expect(gameStats.wins + gameStats.losses + gameStats.pushes).toBe(gameStats.count);
  });

  it('should validate net equals totalPayout minus totalBet', () => {
    const gameStats: GameStats = {
      gameName: 'Blackjack',
      count: 50,
      totalBet: 500,
      totalPayout: 600,
      net: 100,
      wins: 30,
      losses: 20,
      pushes: 0,
      maxMultiplier: 5,
      roi: 20,
      winRate: 60,
    };

    expect(gameStats.net).toBe(gameStats.totalPayout - gameStats.totalBet);
  });
});

describe('ProviderStats Type', () => {
  it('should have same structure as GameStats but with provider field', () => {
    const providerStats: ProviderStats = {
      provider: 'Evolution',
      count: 200,
      totalBet: 2000,
      totalPayout: 1900,
      net: -100,
      wins: 90,
      losses: 100,
      pushes: 10,
      maxMultiplier: 50,
      roi: -5,
      winRate: 45,
    };

    expect(providerStats.provider).toBe('Evolution');
    expect(providerStats.count).toBe(200);
    expect(typeof providerStats.totalBet).toBe('number');
    expect(typeof providerStats.roi).toBe('number');
  });
});

describe('TransactionRecord Type', () => {
  it('should accept deposit transactions', () => {
    const deposit: TransactionRecord = {
      id: '1',
      status: 'complete',
      type: 'deposit',
      method: 'card',
      amount: 100,
      currency: 'USD',
      updatedAt: new Date(),
    };

    expect(deposit.type).toBe('deposit');
    expect(deposit.amount).toBe(100);
  });

  it('should accept withdrawal transactions', () => {
    const withdrawal: TransactionRecord = {
      id: '2',
      status: 'complete',
      type: 'withdrawal',
      method: 'bank',
      amount: 50,
      currency: 'USD',
      updatedAt: new Date(),
    };

    expect(withdrawal.type).toBe('withdrawal');
  });

  it('should allow optional external transaction fields', () => {
    const transaction: TransactionRecord = {
      id: '3',
      status: 'complete',
      type: 'deposit',
      method: 'crypto',
      amount: 100,
      currency: 'USD',
      externalAmount: 0.0025,
      externalCurrency: 'BTC',
      externalTxid: '0x123abc',
      updatedAt: new Date(),
    };

    expect(transaction.externalAmount).toBe(0.0025);
    expect(transaction.externalCurrency).toBe('BTC');
    expect(transaction.externalTxid).toBe('0x123abc');
  });
});

describe('TransactionStats Type', () => {
  it('should contain deposit and withdrawal totals', () => {
    const stats: TransactionStats = {
      totalDeposits: 1000,
      totalWithdrawals: 500,
      depositCount: 5,
      withdrawalCount: 2,
      netTransactions: -500,
    };

    expect(stats.totalDeposits).toBe(1000);
    expect(stats.totalWithdrawals).toBe(500);
    expect(stats.depositCount).toBe(5);
    expect(stats.withdrawalCount).toBe(2);
    expect(stats.netTransactions).toBe(-500);
  });

  it('should validate net equals withdrawals minus deposits', () => {
    const stats: TransactionStats = {
      totalDeposits: 1000,
      totalWithdrawals: 1200,
      depositCount: 10,
      withdrawalCount: 5,
      netTransactions: 200,
    };

    expect(stats.netTransactions).toBe(stats.totalWithdrawals - stats.totalDeposits);
  });
});

describe('Streaks Type', () => {
  it('should track current streak with type and count', () => {
    const streaks: Streaks = {
      currentStreak: { type: 'win', count: 5 },
      longestWinStreak: 10,
      longestLossStreak: 7,
    };

    expect(streaks.currentStreak.type).toBe('win');
    expect(streaks.currentStreak.count).toBe(5);
    expect(streaks.longestWinStreak).toBe(10);
    expect(streaks.longestLossStreak).toBe(7);
  });

  it('should allow all streak types', () => {
    const types: Array<'win' | 'loss' | 'push'> = ['win', 'loss', 'push'];
    types.forEach(type => {
      const streaks: Streaks = {
        currentStreak: { type, count: 1 },
        longestWinStreak: 0,
        longestLossStreak: 0,
      };
      expect(streaks.currentStreak.type).toBe(type);
    });
  });
});

describe('OverallStats Type', () => {
  it('should contain all required overall statistics', () => {
    const overallStats: OverallStats = {
      totalBets: 1000,
      totalBet: 10000,
      totalPayout: 9500,
      net: -500,
      roi: -5,
      wins: 450,
      losses: 500,
      pushes: 50,
      winRate: 45,
      maxMultiplier: 100,
      currency: 'USD',
    };

    expect(overallStats.totalBets).toBe(1000);
    expect(overallStats.totalBet).toBe(10000);
    expect(overallStats.totalPayout).toBe(9500);
    expect(overallStats.net).toBe(-500);
    expect(overallStats.roi).toBe(-5);
    expect(overallStats.wins).toBe(450);
    expect(overallStats.losses).toBe(500);
    expect(overallStats.pushes).toBe(50);
    expect(overallStats.winRate).toBe(45);
    expect(overallStats.maxMultiplier).toBe(100);
    expect(overallStats.currency).toBe('USD');
  });

  it('should allow optional bet and transaction references', () => {
    const bet: BetRecord = {
      id: '1',
      gameName: 'Slots',
      betAmount: 100,
      payout: 1000,
      multiplier: 10,
      currency: 'USD',
      time: new Date(),
      rollback: false,
      complete: true,
    };

    const transactions: TransactionStats = {
      totalDeposits: 1000,
      totalWithdrawals: 500,
      depositCount: 5,
      withdrawalCount: 2,
      netTransactions: -500,
    };

    const overallStats: OverallStats = {
      totalBets: 100,
      totalBet: 1000,
      totalPayout: 1100,
      net: 100,
      roi: 10,
      wins: 60,
      losses: 40,
      pushes: 0,
      winRate: 60,
      maxMultiplier: 10,
      maxMultiplierBet: bet,
      maxWinBet: bet,
      maxLossBet: bet,
      firstBetTime: new Date('2024-01-01'),
      lastBetTime: new Date('2024-01-31'),
      currency: 'USD',
      transactions,
    };

    expect(overallStats.maxMultiplierBet).toBeDefined();
    expect(overallStats.maxWinBet).toBeDefined();
    expect(overallStats.maxLossBet).toBeDefined();
    expect(overallStats.firstBetTime).toBeInstanceOf(Date);
    expect(overallStats.lastBetTime).toBeInstanceOf(Date);
    expect(overallStats.transactions).toBeDefined();
  });
});

describe('BetStats Type', () => {
  it('should contain array of top bets', () => {
    const bet: BetRecord = {
      id: '1',
      gameName: 'Game',
      betAmount: 10,
      payout: 100,
      multiplier: 10,
      currency: 'USD',
      time: new Date(),
      rollback: false,
      complete: true,
    };

    const betStats: BetStats = {
      topBets: [bet],
    };

    expect(betStats.topBets).toHaveLength(1);
    expect(betStats.topBets[0]).toBe(bet);
  });
});

describe('EquityPoint Type', () => {
  it('should contain time and value', () => {
    const point: EquityPoint = {
      time: Date.now(),
      value: 100.5,
    };

    expect(typeof point.time).toBe('number');
    expect(typeof point.value).toBe('number');
  });
});

describe('StatsResult Type', () => {
  it('should contain all result components', () => {
    const result: StatsResult = {
      overall: {
        totalBets: 100,
        totalBet: 1000,
        totalPayout: 1100,
        net: 100,
        roi: 10,
        wins: 60,
        losses: 40,
        pushes: 0,
        winRate: 60,
        maxMultiplier: 10,
        currency: 'USD',
      },
      games: [],
      providers: [],
      streaks: {
        currentStreak: { type: 'win', count: 3 },
        longestWinStreak: 5,
        longestLossStreak: 3,
      },
      betStats: {
        topBets: [],
      },
      equityCurve: [],
      invalidRecords: 5,
      processingTime: 25.5,
    };

    expect(result.overall).toBeDefined();
    expect(result.games).toBeInstanceOf(Array);
    expect(result.providers).toBeInstanceOf(Array);
    expect(result.streaks).toBeDefined();
    expect(result.betStats).toBeDefined();
    expect(result.equityCurve).toBeInstanceOf(Array);
    expect(result.invalidRecords).toBe(5);
    expect(result.processingTime).toBe(25.5);
  });
});

describe('FilterOptions Type', () => {
  it('should allow all optional filter fields', () => {
    const options: FilterOptions = {
      currency: 'USD',
      game: 'Blackjack',
      minPlays: 10,
      top: 5,
      topBets: 10,
    };

    expect(options.currency).toBe('USD');
    expect(options.game).toBe('Blackjack');
    expect(options.minPlays).toBe(10);
    expect(options.top).toBe(5);
    expect(options.topBets).toBe(10);
  });

  it('should allow empty filter options', () => {
    const options: FilterOptions = {};
    expect(options).toBeDefined();
  });
});
