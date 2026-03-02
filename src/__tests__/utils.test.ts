import { describe, it, expect } from 'vitest';

describe('Utility Functions', () => {
  describe('Number Formatting', () => {
    it('should format currency correctly', () => {
      const formatCurrency = (value: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
        }).format(value);
      };

      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(-500)).toBe('-$500.00');
    });

    it('should format percentages correctly', () => {
      const formatPercentage = (value: number, decimals: number = 2) => {
        return `${value.toFixed(decimals)}%`;
      };

      expect(formatPercentage(45.5)).toBe('45.50%');
      expect(formatPercentage(100)).toBe('100.00%');
      expect(formatPercentage(-5.25)).toBe('-5.25%');
    });
  });

  describe('Statistics Calculations', () => {
    it('should calculate ROI correctly', () => {
      const calculateROI = (totalBet: number, totalPayout: number): number => {
        if (totalBet === 0) return 0;
        return ((totalPayout - totalBet) / totalBet) * 100;
      };

      expect(calculateROI(1000, 1100)).toBe(10);
      expect(calculateROI(1000, 900)).toBe(-10);
      expect(calculateROI(0, 0)).toBe(0);
    });

    it('should calculate win rate correctly', () => {
      const calculateWinRate = (wins: number, total: number): number => {
        if (total === 0) return 0;
        return (wins / total) * 100;
      };

      expect(calculateWinRate(50, 100)).toBe(50);
      expect(calculateWinRate(0, 100)).toBe(0);
      expect(calculateWinRate(100, 100)).toBe(100);
    });
  });
});
