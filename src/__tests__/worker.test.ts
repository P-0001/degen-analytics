import { describe, it, expect } from 'vitest';
import type { BetRecord, TransactionRecord } from '../types';
import {
  parseCSVLine,
  parseCSV,
  parseTransactionCSV,
  normalizeBet,
  normalizeTransaction,
  computeTransactionStats,
  scoreBet,
} from '../worker/utils';
import { computeStats } from '../worker/stats.worker';
import { genRandomCSVData } from '../../scripts/gen';

describe('CSV Line Parser', () => {
  describe('Basic Parsing', () => {
    it('should parse simple comma-separated values', () => {
      expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(parseCSVLine('1,2,3')).toEqual(['1', '2', '3']);
    });

    it('should handle empty fields', () => {
      expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c']);
      expect(parseCSVLine(',,')).toEqual(['', '', '']);
      expect(parseCSVLine('a,b,')).toEqual(['a', 'b', '']);
    });

    it('should trim whitespace from fields', () => {
      expect(parseCSVLine('  a  ,  b  ,  c  ')).toEqual(['a', 'b', 'c']);
      expect(parseCSVLine('a , b , c')).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Quoted Fields', () => {
    it('should parse quoted fields containing commas', () => {
      expect(parseCSVLine('"a,b",c,"d"')).toEqual(['a,b', 'c', 'd']);
      expect(parseCSVLine('"Game, with comma",Provider,10')).toEqual([
        'Game, with comma',
        'Provider',
        '10',
      ]);
    });

    it('should handle escaped quotes (double quotes)', () => {
      expect(parseCSVLine('"a""b",c')).toEqual(['a"b', 'c']);
      expect(parseCSVLine('"He said ""hello""",world')).toEqual(['He said "hello"', 'world']);
    });

    it('should handle mixed quoted and unquoted fields', () => {
      expect(parseCSVLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
      expect(parseCSVLine('"quoted",unquoted,"quoted again"')).toEqual([
        'quoted',
        'unquoted',
        'quoted again',
      ]);
    });

    it('should handle empty quoted fields', () => {
      expect(parseCSVLine('"",a,""')).toEqual(['', 'a', '']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single field', () => {
      expect(parseCSVLine('single')).toEqual(['single']);
    });

    it('should handle empty string', () => {
      expect(parseCSVLine('')).toEqual(['']);
    });

    it('should handle complex nested quotes', () => {
      expect(parseCSVLine('"a""b""c",d')).toEqual(['a"b"c', 'd']);
    });
  });
});

describe('Bet CSV Parser', () => {
  describe('Header Mapping', () => {
    it('should handle various header formats', () => {
      const variations = [
        'id,game name,provider,bet amount,payout,multiplier,currency,status,created at',
        'id,game,provider,amount,payout,multiplier,currency,status,time',
        'ID,Game Name,Provider,Bet Amount,Payout,Multiplier,Currency,Status,Created At',
      ];

      variations.forEach(header => {
        const csv = `${header}\n1,Slots,Evolution,10,20,2,USD,complete,2024-01-01T00:00:00Z`;
        const records = parseCSV(csv);
        expect(records.length).toBe(1);
        expect(records[0].id).toBe('1');
      });
    });
  });

  describe('Data Parsing', () => {
    it('should parse complete bet records correctly', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Blackjack,Evolution,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Roulette,Pragmatic,5,0,0,EUR,complete,2024-01-01T00:01:00Z`;

      const records = parseCSV(csv);
      expect(records).toHaveLength(2);

      expect(records[0]).toMatchObject({
        id: '1',
        game_name: 'Evolution:Blackjack',
        bet_amount: '10',
        payout: '20',
        multiplier: 2,
        currency: 'USD',
        rollback: false,
        complete: true,
      });
    });

    it('should handle game names with commas in quotes', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,"Mega Moolah, Jackpot",Microgaming,10,15,1.5,USD,complete,2024-01-01T00:00:00Z`;

      const records = parseCSV(csv);
      expect(records[0].game_name).toBe('Microgaming:Mega Moolah, Jackpot');
    });

    it('should combine provider and game name', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Blackjack,Evolution,10,20,2,USD,complete,2024-01-01T00:00:00Z`;

      const records = parseCSV(csv);
      expect(records[0].game_name).toBe('Evolution:Blackjack');
    });

    it('should handle missing provider', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Blackjack,,10,20,2,USD,complete,2024-01-01T00:00:00Z`;

      const records = parseCSV(csv);
      expect(records[0].game_name).toBe('Blackjack');
    });
  });

  describe('Status Handling', () => {
    it('should identify rollback bets', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,rollback,2024-01-01T00:00:00Z
2,Game,Provider,10,20,2,USD,ROLLBACK,2024-01-01T00:01:00Z`;

      const records = parseCSV(csv);
      expect(records[0].rollback).toBe(true);
      expect(records[1].rollback).toBe(true);
    });

    it('should identify complete bets', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,20,2,USD,COMPLETE,2024-01-01T00:01:00Z`;

      const records = parseCSV(csv);
      expect(records[0].complete).toBe(true);
      expect(records[1].complete).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should skip empty lines', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z

2,Game,Provider,10,20,2,USD,complete,2024-01-01T00:01:00Z`;

      const records = parseCSV(csv);
      expect(records).toHaveLength(2);
    });

    it('should skip records with missing timestamps', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,
2,Game,Provider,10,20,2,USD,complete,2024-01-01T00:01:00Z`;

      const records = parseCSV(csv);
      expect(records).toHaveLength(1);
    });

    it('should return empty array for header-only CSV', () => {
      const csv = 'id,game name,provider,bet amount,payout,multiplier,currency,status,created at';
      const records = parseCSV(csv);
      expect(records).toEqual([]);
    });

    it('should return empty array for empty CSV', () => {
      expect(parseCSV('')).toEqual([]);
      expect(parseCSV('\n\n')).toEqual([]);
    });

    it('should handle Windows line endings', () => {
      const csv =
        'id,game name,provider,bet amount,payout,multiplier,currency,status,created at\r\n1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z';
      const records = parseCSV(csv);
      expect(records).toHaveLength(1);
    });
  });
});

describe('Transaction CSV Parser', () => {
  describe('Parsing', () => {
    it('should parse deposit transactions', () => {
      const csv = `id,status,type,method,amount,currency,updated at
1,complete,deposit,card,100,USD,2024-01-01T00:00:00Z
2,complete,deposit,crypto,50,BTC,2024-01-01T00:01:00Z`;

      const records = parseTransactionCSV(csv);
      expect(records).toHaveLength(2);
      expect(records[0]).toMatchObject({
        id: '1',
        status: 'complete',
        type: 'deposit',
        method: 'card',
        amount: '100',
        currency: 'USD',
      });
    });

    it('should parse withdrawal transactions', () => {
      const csv = `id,status,type,method,amount,currency,updated at
1,complete,withdrawal,bank,75,USD,2024-01-01T00:00:00Z`;

      const records = parseTransactionCSV(csv);
      expect(records[0].type).toBe('withdrawal');
    });

    it('should handle external transaction fields', () => {
      const csv = `id,status,type,method,amount,currency,external amount,external currency,external txid,updated at
1,complete,deposit,crypto,100,USD,0.0025,BTC,0x123abc,2024-01-01T00:00:00Z`;

      const records = parseTransactionCSV(csv);
      expect(records[0].external_amount).toBe('0.0025');
      expect(records[0].external_currency).toBe('BTC');
      expect(records[0].external_txid).toBe('0x123abc');
    });

    it('should default to current time if updated_at missing', () => {
      const csv = `id,status,type,method,amount,currency,updated at
1,complete,deposit,card,100,USD,`;

      const records = parseTransactionCSV(csv);
      expect(records[0].updated_at).toBeTruthy();
      const date = new Date(records[0].updated_at);
      expect(date.getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('Normalization', () => {
    it('should normalize valid transactions', () => {
      const raw = {
        id: '1',
        status: 'complete',
        type: 'deposit',
        method: 'card',
        amount: '100.50',
        currency: 'USD',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const normalized = normalizeTransaction(raw);
      expect(normalized).not.toBeNull();
      expect(normalized?.amount).toBe(100.5);
      expect(normalized?.type).toBe('deposit');
    });

    it('should reject invalid transaction types', () => {
      const raw = {
        id: '1',
        status: 'complete',
        type: 'invalid',
        method: 'card',
        amount: '100',
        currency: 'USD',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(normalizeTransaction(raw)).toBeNull();
    });

    it('should reject invalid amounts', () => {
      const raw = {
        id: '1',
        status: 'complete',
        type: 'deposit',
        method: 'card',
        amount: 'invalid',
        currency: 'USD',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(normalizeTransaction(raw)).toBeNull();
    });

    it('should handle case-insensitive transaction types', () => {
      const deposit = normalizeTransaction({
        id: '1',
        status: 'complete',
        type: 'DEPOSIT',
        method: 'card',
        amount: '100',
        currency: 'USD',
        updated_at: '2024-01-01T00:00:00Z',
      });
      const withdrawal = normalizeTransaction({
        id: '2',
        status: 'complete',
        type: 'Withdrawal',
        method: 'bank',
        amount: '50',
        currency: 'USD',
        updated_at: '2024-01-01T00:00:00Z',
      });

      expect(deposit?.type).toBe('deposit');
      expect(withdrawal?.type).toBe('withdrawal');
    });
  });
});

describe('Transaction Stats Computation', () => {
  it('should calculate deposit and withdrawal totals', () => {
    const transactions: TransactionRecord[] = [
      {
        id: '1',
        status: 'complete',
        type: 'deposit',
        method: 'card',
        amount: 100,
        currency: 'USD',
        updatedAt: new Date(),
      },
      {
        id: '2',
        status: 'complete',
        type: 'deposit',
        method: 'card',
        amount: 50,
        currency: 'USD',
        updatedAt: new Date(),
      },
      {
        id: '3',
        status: 'complete',
        type: 'withdrawal',
        method: 'bank',
        amount: 75,
        currency: 'USD',
        updatedAt: new Date(),
      },
    ];

    const stats = computeTransactionStats(transactions);
    expect(stats.totalDeposits).toBe(150);
    expect(stats.totalWithdrawals).toBe(75);
    expect(stats.depositCount).toBe(2);
    expect(stats.withdrawalCount).toBe(1);
    expect(stats.netTransactions).toBe(-75);
  });

  it('should filter by currency', () => {
    const transactions: TransactionRecord[] = [
      {
        id: '1',
        status: 'complete',
        type: 'deposit',
        method: 'card',
        amount: 100,
        currency: 'USD',
        updatedAt: new Date(),
      },
      {
        id: '2',
        status: 'complete',
        type: 'deposit',
        method: 'card',
        amount: 50,
        currency: 'EUR',
        updatedAt: new Date(),
      },
      {
        id: '3',
        status: 'complete',
        type: 'deposit',
        method: 'card',
        amount: 25,
        currency: 'USD',
        updatedAt: new Date(),
      },
    ];

    const stats = computeTransactionStats(transactions, 'USD');
    expect(stats.totalDeposits).toBe(125);
    expect(stats.depositCount).toBe(2);
  });

  it('should filter by status (only complete)', () => {
    const transactions: TransactionRecord[] = [
      {
        id: '1',
        status: 'complete',
        type: 'deposit',
        method: 'card',
        amount: 100,
        currency: 'USD',
        updatedAt: new Date(),
      },
      {
        id: '2',
        status: 'pending',
        type: 'deposit',
        method: 'card',
        amount: 50,
        currency: 'USD',
        updatedAt: new Date(),
      },
      {
        id: '3',
        status: 'failed',
        type: 'deposit',
        method: 'card',
        amount: 25,
        currency: 'USD',
        updatedAt: new Date(),
      },
    ];

    const stats = computeTransactionStats(transactions);
    expect(stats.totalDeposits).toBe(100);
    expect(stats.depositCount).toBe(1);
  });

  it('should handle case-insensitive currency and status', () => {
    const transactions: TransactionRecord[] = [
      {
        id: '1',
        status: 'COMPLETE',
        type: 'deposit',
        method: 'card',
        amount: 100,
        currency: 'usd',
        updatedAt: new Date(),
      },
      {
        id: '2',
        status: 'Complete',
        type: 'deposit',
        method: 'card',
        amount: 50,
        currency: 'USD',
        updatedAt: new Date(),
      },
    ];

    const stats = computeTransactionStats(transactions, 'USD');
    expect(stats.totalDeposits).toBe(150);
  });

  it('should calculate net as withdrawals minus deposits', () => {
    const transactions: TransactionRecord[] = [
      {
        id: '1',
        status: 'complete',
        type: 'deposit',
        method: 'card',
        amount: 1000,
        currency: 'USD',
        updatedAt: new Date(),
      },
      {
        id: '2',
        status: 'complete',
        type: 'withdrawal',
        method: 'bank',
        amount: 1200,
        currency: 'USD',
        updatedAt: new Date(),
      },
    ];

    const stats = computeTransactionStats(transactions);
    expect(stats.netTransactions).toBe(200);
  });
});

describe('Bet Normalization', () => {
  it('should normalize valid bet records', () => {
    const raw = {
      id: '123',
      game_name: 'Evolution:Blackjack',
      bet_amount: '10.50',
      payout: '21',
      multiplier: 2,
      currency: 'USD',
      time: '2024-01-01T00:00:00Z',
      rollback: false,
      complete: true,
    };

    const bet = normalizeBet(raw);
    expect(bet).not.toBeNull();
    expect(bet?.betAmount).toBe(10.5);
    expect(bet?.payout).toBe(21);
    expect(bet?.gameName).toBe('Blackjack');
    expect(bet?.provider).toBe('Evolution');
  });

  it('should extract provider from game_name', () => {
    const withProvider = normalizeBet({
      id: '1',
      game_name: 'Pragmatic:Sweet Bonanza',
      bet_amount: 10,
      payout: 20,
      multiplier: 2,
      currency: 'USD',
      time: '2024-01-01T00:00:00Z',
      rollback: false,
      complete: true,
    });
    expect(withProvider?.provider).toBe('Pragmatic');
    expect(withProvider?.gameName).toBe('Sweet Bonanza');

    const withoutProvider = normalizeBet({
      id: '2',
      game_name: 'Blackjack',
      bet_amount: 10,
      payout: 20,
      multiplier: 2,
      currency: 'USD',
      time: '2024-01-01T00:00:00Z',
      rollback: false,
      complete: true,
    });
    expect(withoutProvider?.provider).toBeUndefined();
    expect(withoutProvider?.gameName).toBe('Blackjack');
  });

  it('should reject invalid bet amounts', () => {
    expect(
      normalizeBet({
        id: '1',
        game_name: 'Game',
        bet_amount: 'invalid',
        payout: 20,
        multiplier: 2,
        currency: 'USD',
        time: '2024-01-01T00:00:00Z',
        rollback: false,
        complete: true,
      })
    ).toBeNull();

    expect(
      normalizeBet({
        id: '2',
        game_name: 'Game',
        bet_amount: NaN,
        payout: 20,
        multiplier: 2,
        currency: 'USD',
        time: '2024-01-01T00:00:00Z',
        rollback: false,
        complete: true,
      })
    ).toBeNull();
  });

  it('should reject invalid payouts', () => {
    expect(
      normalizeBet({
        id: '1',
        game_name: 'Game',
        bet_amount: 10,
        payout: 'invalid',
        multiplier: 2,
        currency: 'USD',
        time: '2024-01-01T00:00:00Z',
        rollback: false,
        complete: true,
      })
    ).toBeNull();
  });

  it('should handle various timestamp formats', () => {
    const formats = ['2024-01-01T00:00:00Z', '2024-01-01 00:00:00', '2024/01/01 00:00:00'];

    formats.forEach(timeStr => {
      const bet = normalizeBet({
        id: '1',
        game_name: 'Game',
        bet_amount: 10,
        payout: 20,
        multiplier: 2,
        currency: 'USD',
        time: timeStr,
        rollback: false,
        complete: true,
      });
      expect(bet).not.toBeNull();
      expect(bet?.time).toBeInstanceOf(Date);
    });
  });
});

describe('Stats Computation', () => {
  describe('Overall Statistics', () => {
    it('should calculate basic stats correctly', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Blackjack,Evolution,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Roulette,Evolution,5,0,0,USD,complete,2024-01-01T00:01:00Z
3,Slots,Pragmatic,15,30,2,USD,complete,2024-01-01T00:02:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.totalBets).toBe(3);
      expect(stats.overall.totalBet).toBe(30);
      expect(stats.overall.totalPayout).toBe(50);
      expect(stats.overall.net).toBe(20);
      expect(stats.overall.wins).toBe(2);
      expect(stats.overall.losses).toBe(1);
      expect(stats.overall.pushes).toBe(0);
    });

    it('should calculate ROI correctly', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,100,110,1.1,USD,complete,2024-01-01T00:00:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.roi).toBe(10);
      expect(stats.overall.net).toBe(10);
    });

    it('should calculate win rate correctly', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,20,2,USD,complete,2024-01-01T00:01:00Z
3,Game,Provider,10,5,0.5,USD,complete,2024-01-01T00:02:00Z
4,Game,Provider,10,5,0.5,USD,complete,2024-01-01T00:03:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.winRate).toBe(50);
    });

    it('should track max multiplier bet', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,100,10,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,20,2,USD,complete,2024-01-01T00:01:00Z
3,Game,Provider,10,50,5,USD,complete,2024-01-01T00:02:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.maxMultiplier).toBe(10);
      expect(stats.overall.maxMultiplierBet?.id).toBe('1');
    });

    it('should track max win and max loss bets', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,100,10,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,50,0,0,USD,complete,2024-01-01T00:01:00Z
3,Game,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.maxWinBet?.id).toBe('1');
      expect(stats.overall.maxLossBet?.id).toBe('2');
    });

    it('should handle pushes (break-even bets)', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,10,1,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,20,2,USD,complete,2024-01-01T00:01:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.pushes).toBe(1);
      expect(stats.overall.wins).toBe(1);
    });
  });

  describe('Game Statistics', () => {
    it('should aggregate stats by game', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Blackjack,Evolution,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Blackjack,Evolution,10,5,0.5,USD,complete,2024-01-01T00:01:00Z
3,Roulette,Evolution,5,10,2,USD,complete,2024-01-01T00:02:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.games).toHaveLength(2);

      const blackjack = stats.games.find(g => g.gameName === 'Blackjack');
      expect(blackjack?.count).toBe(2);
      expect(blackjack?.totalBet).toBe(20);
      expect(blackjack?.totalPayout).toBe(25);
      expect(blackjack?.net).toBe(5);
      expect(blackjack?.wins).toBe(1);
      expect(blackjack?.losses).toBe(1);
    });

    it('should calculate game-specific ROI and win rate', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Slots,Pragmatic,100,150,1.5,USD,complete,2024-01-01T00:00:00Z
2,Slots,Pragmatic,100,50,0.5,USD,complete,2024-01-01T00:01:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      const slots = stats.games[0];
      expect(slots.roi).toBe(0);
      expect(slots.winRate).toBe(50);
    });

    it('should sort games by net profit', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game1,Provider,10,30,3,USD,complete,2024-01-01T00:00:00Z
2,Game2,Provider,10,25,2.5,USD,complete,2024-01-01T00:01:00Z
3,Game3,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.games[0].gameName).toBe('Game1');
      expect(stats.games[1].gameName).toBe('Game2');
      expect(stats.games[2].gameName).toBe('Game3');
    });
  });

  describe('Provider Statistics', () => {
    it('should aggregate stats by provider', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Blackjack,Evolution,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Roulette,Evolution,10,5,0.5,USD,complete,2024-01-01T00:01:00Z
3,Slots,Pragmatic,5,10,2,USD,complete,2024-01-01T00:02:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.providers).toHaveLength(2);

      const evolution = stats.providers.find(p => p.provider === 'Evolution');
      expect(evolution?.count).toBe(2);
      expect(evolution?.totalBet).toBe(20);
      expect(evolution?.totalPayout).toBe(25);
    });
  });

  describe('Streak Tracking', () => {
    it('should track win streaks', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,20,2,USD,complete,2024-01-01T00:01:00Z
3,Game,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z
4,Game,Provider,10,5,0.5,USD,complete,2024-01-01T00:03:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.streaks.longestWinStreak).toBe(3);
      expect(stats.streaks.currentStreak.type).toBe('loss');
      expect(stats.streaks.currentStreak.count).toBe(1);
    });

    it('should track loss streaks', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,5,0.5,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,5,0.5,USD,complete,2024-01-01T00:01:00Z
3,Game,Provider,10,5,0.5,USD,complete,2024-01-01T00:02:00Z
4,Game,Provider,10,20,2,USD,complete,2024-01-01T00:03:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.streaks.longestLossStreak).toBe(3);
      expect(stats.streaks.currentStreak.type).toBe('win');
    });

    it('should handle alternating wins and losses', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,5,0.5,USD,complete,2024-01-01T00:01:00Z
3,Game,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z
4,Game,Provider,10,5,0.5,USD,complete,2024-01-01T00:03:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.streaks.longestWinStreak).toBe(1);
      expect(stats.streaks.longestLossStreak).toBe(1);
    });
  });

  describe('Equity Curve', () => {
    it('should generate equity curve in chronological order', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,5,0.5,USD,complete,2024-01-01T00:01:00Z
3,Game,Provider,10,25,2.5,USD,complete,2024-01-01T00:02:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.equityCurve).toHaveLength(3);
      expect(stats.equityCurve[0].value).toBe(10);
      expect(stats.equityCurve[1].value).toBe(5);
      expect(stats.equityCurve[2].value).toBe(20);
    });

    it('should handle negative equity', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,100,0,0,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,100,0,0,USD,complete,2024-01-01T00:01:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.equityCurve[0].value).toBe(-100);
      expect(stats.equityCurve[1].value).toBe(-200);
    });
  });

  describe('Filtering', () => {
    it('should filter by currency', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,20,2,EUR,complete,2024-01-01T00:01:00Z
3,Game,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
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

  describe('Rollback and Status Filtering', () => {
    it('should exclude rollback bets from stats', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,20,2,USD,rollback,2024-01-01T00:01:00Z
3,Game,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.totalBets).toBe(2);
      expect(stats.overall.totalBet).toBe(20);
    });

    it('should only include complete bets', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z
2,Game,Provider,10,20,2,USD,pending,2024-01-01T00:01:00Z
3,Game,Provider,10,20,2,USD,complete,2024-01-01T00:02:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.overall.totalBets).toBe(2);
    });
  });

  describe('Integration with Transactions', () => {
    it('should include transaction stats in overall stats', () => {
      const betsCsv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z`;

      const depositCsv = `id,status,type,method,amount,currency,updated at
1,complete,deposit,card,100,USD,2024-01-01T00:00:00Z`;

      const withdrawalCsv = `id,status,type,method,amount,currency,updated at
1,complete,withdrawal,bank,50,USD,2024-01-01T00:01:00Z`;

      const bets = parseCSV(betsCsv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const deposits = parseTransactionCSV(depositCsv)
        .map(normalizeTransaction)
        .filter((t): t is TransactionRecord => t !== null);
      const withdrawals = parseTransactionCSV(withdrawalCsv)
        .map(normalizeTransaction)
        .filter((t): t is TransactionRecord => t !== null);
      const transactions = [...deposits, ...withdrawals];
      const transactionStats = computeTransactionStats(transactions, 'USD');
      const stats = computeStats(bets, { currency: 'USD' }, transactionStats);

      expect(stats.overall.transactions).toBeDefined();
      expect(stats.overall.transactions?.totalDeposits).toBe(100);
      expect(stats.overall.transactions?.totalWithdrawals).toBe(50);
      expect(stats.overall.transactions?.netTransactions).toBe(-50);
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

    it('should handle processing time metadata', () => {
      const csv = `id,game name,provider,bet amount,payout,multiplier,currency,status,created at
1,Game,Provider,10,20,2,USD,complete,2024-01-01T00:00:00Z`;

      const bets = parseCSV(csv)
        .map(normalizeBet)
        .filter((b): b is BetRecord => b !== null);
      const stats = computeStats(bets, {});

      expect(stats.processingTime).toBeGreaterThan(0);
      expect(stats.processingTime).toBeLessThan(1000);
    });
  });
});

describe('Bet Scoring', () => {
  describe('Basic Scoring', () => {
    it('should score winning bets positively', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 10,
        payout: 20,
        multiplier: 2,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      const score = scoreBet(bet);
      expect(score).toBeGreaterThan(0);
    });

    it('should score losing bets negatively', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 10,
        payout: 0,
        multiplier: 0,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      const score = scoreBet(bet);
      expect(score).toBe(-2);
    });

    it('should calculate score based on net profit and multiplier', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 100,
        payout: 200,
        multiplier: 2,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      const score = scoreBet(bet);
      expect(score).toBe(11);
    });
  });

  describe('Edge Cases', () => {
    it('should return 0 for null or undefined bet', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(scoreBet(null as any)).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(scoreBet(undefined as any)).toBe(0);
    });

    it('should return 0 for invalid bet amounts', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: NaN,
        payout: 20,
        multiplier: 2,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      expect(scoreBet(bet)).toBe(0);
    });

    it('should return 0 for invalid payout', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 10,
        payout: NaN,
        multiplier: 2,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      expect(scoreBet(bet)).toBe(0);
    });

    it('should return 0 for invalid multiplier', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 10,
        payout: 20,
        multiplier: NaN,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      expect(scoreBet(bet)).toBe(0);
    });

    it('should handle break-even bets (1x multiplier)', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 10,
        payout: 10,
        multiplier: 1,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      const score = scoreBet(bet);
      expect(score).toBe(-1);
    });
  });

  describe('Multiplier Impact', () => {
    it('should increase score with higher multipliers', () => {
      const bet10x: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 10,
        payout: 100,
        multiplier: 10,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      const bet5x: BetRecord = {
        id: '2',
        gameName: 'Test',
        betAmount: 10,
        payout: 50,
        multiplier: 5,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      expect(scoreBet(bet10x)).toBeGreaterThan(scoreBet(bet5x));
    });

    it('should handle very high multipliers', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 1,
        payout: 1000,
        multiplier: 1000,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      const score = scoreBet(bet);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeCloseTo(1098.9, 1);
    });

    it('should round multiplier score to 2 decimal places', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 10,
        payout: 25,
        multiplier: 2.5,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      const score = scoreBet(bet);
      expect(score).toBe(3);
    });
  });

  describe('Net Profit Impact', () => {
    it('should calculate net score as -1 for losses', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 50,
        payout: 25,
        multiplier: 0.5,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      const score = scoreBet(bet);
      expect(score).toBe(-1.5);
    });

    it('should divide net profit by 10 for wins', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 10,
        payout: 110,
        multiplier: 11,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      const score = scoreBet(bet);
      expect(score).toBe(20);
    });

    it('should handle small net profits', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 10,
        payout: 11,
        multiplier: 1.1,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      const score = scoreBet(bet);
      expect(score).toBeCloseTo(0.2, 1);
    });
  });

  describe('Combined Scoring', () => {
    it('should combine net score and multiplier score correctly', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 100,
        payout: 300,
        multiplier: 3,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      const netScore = (300 - 100) / 10;
      const multiplierScore = 3 - 1;
      const expectedScore = netScore + multiplierScore;

      expect(scoreBet(bet)).toBe(expectedScore);
    });

    it('should handle zero payout correctly', () => {
      const bet: BetRecord = {
        id: '1',
        gameName: 'Test',
        betAmount: 100,
        payout: 0,
        multiplier: 0,
        currency: 'USD',
        time: new Date(),
        rollback: false,
        complete: true,
      };

      const score = scoreBet(bet);
      expect(score).toBe(-2);
    });
  });
});
