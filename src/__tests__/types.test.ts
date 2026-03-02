import { describe, it, expect } from 'vitest';
import type { BetRecord, GameStats, OverallStats, Streaks } from '../types';

describe('Type Definitions', () => {
  describe('BetRecord', () => {
    it('should create a valid bet record', () => {
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
      expect(betRecord.betAmount).toBe(10);
      expect(betRecord.payout).toBe(20);
      expect(betRecord.multiplier).toBe(2);
    });
  });

  describe('GameStats', () => {
    it('should calculate win rate correctly', () => {
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

      expect(gameStats.winRate).toBe(45);
      expect(gameStats.wins + gameStats.losses + gameStats.pushes).toBe(100);
    });
  });

  describe('Streaks', () => {
    it('should track current and longest streaks', () => {
      const streaks: Streaks = {
        currentStreak: { type: 'win', count: 5 },
        longestWinStreak: 10,
        longestLossStreak: 7,
      };

      expect(streaks.currentStreak.type).toBe('win');
      expect(streaks.currentStreak.count).toBe(5);
      expect(streaks.longestWinStreak).toBeGreaterThan(streaks.currentStreak.count);
    });
  });

  describe('OverallStats', () => {
    it('should calculate ROI correctly', () => {
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

      expect(overallStats.roi).toBe(-5);
      expect(overallStats.net).toBe(overallStats.totalPayout - overallStats.totalBet);
    });
  });
});
