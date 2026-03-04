import { describe, it, expect } from 'vitest';
import type { BetRecord, TransactionRecord } from '../types';
import {
  parseCSVLine,
  parseCSV,
  parseTransactionCSV,
  normalizeBet,
  normalizeTransaction,
  computeStats,
  computeTransactionStats,
} from '../worker/stats.worker';
import { genRandomCSVData } from './gen';

describe('Stats Worker Functions', () => {
  describe('CSV Line Parsing', () => {
    it('should parse simple CSV line', () => {
      const line = 'a,b,c';
      const result = parseCSVLine(line);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should parse CSV line with quoted fields', () => {
      const line = '"a,b",c,"d"';
      const result = parseCSVLine(line);
      expect(result).toEqual(['a,b', 'c', 'd']);
    });

    it('should handle escaped quotes', () => {
      const line = '"a""b",c';
      const result = parseCSVLine(line);
      expect(result).toEqual(['a"b', 'c']);
    });
  });

  describe('CSV Parsing', () => {
    it('should parse valid CSV bet data', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Blackjack,Evolution,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Roulette,Evolution,5,0,0,USD,complete,2024-01-01T00:01:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.totalBets).toBe(2);
      expect(stats.overall.totalBet).toBe(15);
      expect(stats.overall.totalPayout).toBe(20);
      expect(stats.overall.net).toBe(5);
      expect(stats.overall.wins).toBe(1);
      expect(stats.overall.losses).toBe(1);

      expect(stats.equityCurve.length).toBe(2);
      expect(stats.equityCurve[0]?.value).toBe(10);
      expect(stats.equityCurve[1]?.value).toBe(5);
    });

    it('should handle CSV with quoted fields', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,"Game, with comma",Evolution,10,15,1.5,USD,complete,2024-01-01T00:00:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.totalBets).toBe(1);
      expect(stats.games[0].gameName).toBe('Game, with comma');

      expect(stats.equityCurve.length).toBe(1);
      expect(stats.equityCurve[0]?.value).toBe(5);
    });

    it('should filter out rollback bets', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Blackjack,Evolution,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Roulette,Evolution,5,10,2,USD,rollback,2024-01-01T00:01:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.totalBets).toBe(1);
      expect(stats.overall.totalBet).toBe(10);

      expect(stats.equityCurve.length).toBe(1);
      expect(stats.equityCurve[0]?.value).toBe(10);
    });

    it('should handle empty CSV', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);

      expect(() => computeStats(bets, {})).toThrow();
    });
  });

  describe('Transaction CSV Parsing', () => {
    it('should parse deposit and withdrawal transactions', () => {
      const betsCsv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Blackjack,Evolution,10,20,2,USD,complete,2024-01-01T00:00:00Z`;

      const depositCsv = `id,status,type,method,amount,currency,updated at
1,complete,deposit,card,100,USD,2024-01-01T00:00:00Z
2,complete,deposit,card,50,USD,2024-01-01T00:01:00Z`;

      const withdrawalCsv = `id,status,type,method,amount,currency,updated at
1,complete,withdrawal,card,75,USD,2024-01-01T00:02:00Z`;

      const rawBets = parseCSV(betsCsv);
      const bets = rawBets.map(normalizeBet).filter((b): b is BetRecord => b !== null);

      const rawDeposits = parseTransactionCSV(depositCsv);
      const rawWithdrawals = parseTransactionCSV(withdrawalCsv);
      const transactions = [...rawDeposits, ...rawWithdrawals]
        .map(normalizeTransaction)
        .filter((t): t is TransactionRecord => t !== null);

      const transactionStats = computeTransactionStats(transactions, 'USD');
      const stats = computeStats(bets, { currency: 'USD' }, transactionStats);

      expect(stats.overall.transactions).toBeDefined();
      expect(stats.overall.transactions?.totalDeposits).toBe(150);
      expect(stats.overall.transactions?.totalWithdrawals).toBe(75);
      expect(stats.overall.transactions?.depositCount).toBe(2);
      expect(stats.overall.transactions?.withdrawalCount).toBe(1);
      expect(stats.overall.transactions?.netTransactions).toBe(-75);
    });

    it('should filter transactions by currency', () => {
      const depositCsv = `id,status,type,method,amount,currency,updated at
1,complete,deposit,card,100,USD,2024-01-01T00:00:00Z
2,complete,deposit,card,50,EUR,2024-01-01T00:01:00Z`;

      const rawDeposits = parseTransactionCSV(depositCsv);
      const transactions = rawDeposits
        .map(normalizeTransaction)
        .filter((t): t is TransactionRecord => t !== null);

      const transactionStats = computeTransactionStats(transactions, 'USD');

      expect(transactionStats.totalDeposits).toBe(100);
      expect(transactionStats.depositCount).toBe(1);
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate game statistics correctly', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Blackjack,Evolution,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Blackjack,Evolution,10,5,0.5,USD,complete,2024-01-01T00:01:00Z
3,Roulette,Evolution,5,10,2,USD,complete,2024-01-01T00:02:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.games.length).toBe(2);

      const blackjackStats = stats.games.find(g => g.gameName === 'Blackjack');
      expect(blackjackStats).toBeDefined();
      expect(blackjackStats!.count).toBe(2);
      expect(blackjackStats!.totalBet).toBe(20);
      expect(blackjackStats!.totalPayout).toBe(25);
      expect(blackjackStats!.wins).toBe(1);
      expect(blackjackStats!.losses).toBe(1);
    });

    it('should calculate provider statistics correctly', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Blackjack,Evolution,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Roulette,Evolution,10,5,0.5,USD,complete,2024-01-01T00:01:00Z
3,Slots,Pragmatic,5,10,2,USD,complete,2024-01-01T00:02:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.providers.length).toBe(2);

      const evolutionStats = stats.providers.find(p => p.provider === 'Evolution');
      expect(evolutionStats).toBeDefined();
      expect(evolutionStats!.count).toBe(2);
      expect(evolutionStats!.totalBet).toBe(20);
    });

    it('should track streaks correctly', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,20,2,USD,complete,2024-01-01T00:01:00Z
3,Game,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z
4,Game,Provider,10,5,0.5,USD,complete,2024-01-01T00:03:00Z
5,Game,Provider,10,5,0.5,USD,complete,2024-01-01T00:04:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.streaks.longestWinStreak).toBe(3);
      expect(stats.streaks.longestLossStreak).toBe(2);
      expect(stats.streaks.currentStreak.type).toBe('loss');
      expect(stats.streaks.currentStreak.count).toBe(2);
    });

    it('should calculate ROI correctly', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,100,110,1.1,USD,complete,2024-01-01T00:00:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.roi).toBe(10);
      expect(stats.overall.net).toBe(10);
    });

    it('should track max multiplier and max win/loss', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,100,10,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,5,0.5,USD,complete,2024-01-01T00:01:00Z
3,Game,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.maxMultiplier).toBe(10);
      expect(stats.overall.maxMultiplierBet).toBeDefined();
      expect(stats.overall.maxMultiplierBet?.multiplier).toBe(10);
      expect(stats.overall.maxWinBet).toBeDefined();
      expect(stats.overall.maxLossBet).toBeDefined();
    });
  });

  describe('Filtering', () => {
    it('should filter by currency', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,20,2,EUR,complete,2024-01-01T00:01:00Z
3,Game,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, { currency: 'USD' });

      expect(stats.overall.totalBets).toBe(2);
      expect(stats.overall.currency).toBe('USD');
    });

    it('should filter by game name', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Blackjack,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Roulette,Provider,10,20,2,USD,complete,2024-01-01T00:01:00Z
3,Blackjack,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, { game: 'Blackjack' });

      expect(stats.overall.totalBets).toBe(2);
      expect(stats.games.length).toBe(1);
      expect(stats.games[0].gameName).toBe('Blackjack');
    });

    it('should filter by minimum plays', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game1,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Game1,Provider,10,20,2,USD,complete,2024-01-01T00:01:00Z
3,Game1,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z
4,Game2,Provider,10,20,2,USD,complete,2024-01-01T00:03:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, { minPlays: 2 });

      expect(stats.games.length).toBe(1);
      expect(stats.games[0].gameName).toBe('Game1');
      expect(stats.games[0].count).toBe(3);
    });

    it('should limit results by top parameter', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game1,Provider,10,30,3,USD,complete,2024-01-01T00:00:00Z
2,Game2,Provider,10,25,2.5,USD,complete,2024-01-01T00:01:00Z
3,Game3,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z
4,Game4,Provider,10,15,1.5,USD,complete,2024-01-01T00:03:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, { top: 2 });

      expect(stats.games.length).toBe(2);
      expect(stats.games[0].gameName).toBe('Game1');
      expect(stats.games[1].gameName).toBe('Game2');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid bet amounts', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,invalid,20,2,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,20,2,USD,complete,2024-01-01T00:01:00Z`;

      const rawRecords = parseCSV(csvContent);
      const allBets = rawRecords.map(normalizeBet);
      const validBets = allBets.filter((b): b is BetRecord => b !== null);

      expect(rawRecords.length).toBe(2);
      expect(validBets.length).toBe(1);

      const stats = computeStats(validBets, {});
      expect(stats.overall.totalBets).toBe(1);
    });

    it('should handle missing timestamps', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,
2,Game,Provider,10,20,2,USD,complete,2024-01-01T00:01:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.totalBets).toBe(1);
    });

    it('should throw error when no valid bets found', () => {
      const csvContent = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,EUR,complete,2024-01-01T00:00:00Z`;

      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);

      expect(() => computeStats(bets, { currency: 'USD' })).toThrow();
    });
  });

  describe('Performance', () => {
    it('should process large dataset efficiently', () => {
      const csvContent = genRandomCSVData(10_000);
      const rawRecords = parseCSV(csvContent);
      const bets = rawRecords.map(normalizeBet).filter((b): b is BetRecord => b !== null);

      const stats = computeStats(bets, {});

      expect(stats.overall.totalBets).toBeGreaterThan(0);
      expect(stats.processingTime).toBeLessThan(100);
      expect(stats.games.length).toBeGreaterThan(0);
      expect(stats.providers.length).toBeGreaterThan(0);
    });
  });
});
