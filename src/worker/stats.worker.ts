import type {
  BetRecord,
  StatsResult,
  FilterOptions,
  GameStats,
  ProviderStats,
  OverallStats,
  Streaks,
  TransactionRecord,
  TransactionStats,
} from '../types';
import {
  parseCSV,
  parseTransactionCSV,
  normalizeBet,
  normalizeTransaction,
  computeTransactionStats,
  scoreBet,
} from './utils';

export function computeStats(
  bets: BetRecord[],
  options: FilterOptions,
  transactionStats?: TransactionStats
): StatsResult {
  const startTime = performance.now();

  let filtered = bets.filter(b => !b.rollback && b.complete);

  if (options.currency) {
    filtered = filtered.filter(b => b.currency.toLowerCase() === options.currency!.toLowerCase());
  }

  if (options.game) {
    const gameLower = options.game.toLowerCase();
    filtered = filtered.filter(b => b.gameName.toLowerCase().includes(gameLower));
  }

  // Validate that we have data after filtering
  if (filtered.length === 0) {
    throw new Error(
      options.currency || options.game
        ? `No bets found matching your filters. ${options.currency ? `Currency: ${options.currency}` : ''} ${options.game ? `Game: ${options.game}` : ''}`
        : 'No valid bets found in the uploaded file. Please check your CSV format.'
    );
  }

  const sortedForCurve = [...filtered].sort((a, b) => a.time.getTime() - b.time.getTime());
  const equityCurve: { time: number; value: number }[] = [];
  let cumulativeNet = 0;
  for (const bet of sortedForCurve) {
    cumulativeNet += bet.payout - bet.betAmount;
    equityCurve.push({
      time: bet.time.getTime(),
      value: Math.round(cumulativeNet * 100) / 100,
    });
  }

  const gameMap = new Map<string, GameStats>();
  const providerMap = new Map<string, ProviderStats>();

  let totalBet = 0;
  let totalPayout = 0;
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let maxMultiplier = 0;
  let maxMultiplierBet: BetRecord | undefined;
  let maxWinBet: BetRecord | undefined;
  let maxLossBet: BetRecord | undefined;
  let maxWin = 0;
  let maxLoss = 0;

  let firstBetTime: Date | undefined;
  let lastBetTime: Date | undefined;

  let currentStreak: { type: 'win' | 'loss' | 'push'; count: number } = { type: 'push', count: 0 };
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;
  let tempPushStreak = 0;

  for (const bet of filtered) {
    if (!firstBetTime || bet.time < firstBetTime) firstBetTime = bet.time;
    if (!lastBetTime || bet.time > lastBetTime) lastBetTime = bet.time;

    const net = bet.payout - bet.betAmount;

    totalBet += bet.betAmount;
    totalPayout += bet.payout;

    if (net > 0) {
      wins++;
      tempWinStreak++;
      tempLossStreak = 0;
      tempPushStreak = 0;
      if (tempWinStreak > longestWinStreak) longestWinStreak = tempWinStreak;
      currentStreak = { type: 'win', count: tempWinStreak };

      if (net > maxWin) {
        maxWin = net;
        maxWinBet = bet;
      }
    } else if (net < 0) {
      losses++;
      tempLossStreak++;
      tempWinStreak = 0;
      tempPushStreak = 0;
      if (tempLossStreak > longestLossStreak) longestLossStreak = tempLossStreak;
      currentStreak = { type: 'loss', count: tempLossStreak };

      if (net < maxLoss) {
        maxLoss = net;
        maxLossBet = bet;
      }
    } else {
      pushes++;
      tempWinStreak = 0;
      tempLossStreak = 0;
      tempPushStreak++;
      currentStreak = { type: 'push', count: tempPushStreak };
    }

    if (bet.multiplier > maxMultiplier) {
      maxMultiplier = bet.multiplier;
      maxMultiplierBet = bet;
    }

    const gameKey = bet.gameName;
    let gameStats = gameMap.get(gameKey);
    if (!gameStats) {
      gameStats = {
        gameName: bet.gameName,
        count: 0,
        totalBet: 0,
        totalPayout: 0,
        net: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        maxMultiplier: 0,
        roi: 0,
        winRate: 0,
      };
      gameMap.set(gameKey, gameStats);
    }

    gameStats.count++;
    gameStats.totalBet += bet.betAmount;
    gameStats.totalPayout += bet.payout;
    gameStats.net += net;
    if (net > 0) gameStats.wins++;
    else if (net < 0) gameStats.losses++;
    else gameStats.pushes++;
    if (bet.multiplier > gameStats.maxMultiplier) gameStats.maxMultiplier = bet.multiplier;

    if (bet.provider) {
      const providerKey = bet.provider;
      let providerStats = providerMap.get(providerKey);
      if (!providerStats) {
        providerStats = {
          provider: bet.provider,
          count: 0,
          totalBet: 0,
          totalPayout: 0,
          net: 0,
          wins: 0,
          losses: 0,
          pushes: 0,
          maxMultiplier: 0,
          roi: 0,
          winRate: 0,
        };
        providerMap.set(providerKey, providerStats);
      }

      providerStats.count++;
      providerStats.totalBet += bet.betAmount;
      providerStats.totalPayout += bet.payout;
      providerStats.net += net;
      if (net > 0) providerStats.wins++;
      else if (net < 0) providerStats.losses++;
      else providerStats.pushes++;
      if (bet.multiplier > providerStats.maxMultiplier)
        providerStats.maxMultiplier = bet.multiplier;
    }
  }

  let games = Array.from(gameMap.values()).map(g => {
    let roi = 0;
    if (g.totalBet > 0) {
      roi = ((g.totalPayout - g.totalBet) / g.totalBet) * 100;
    }
    return {
      ...g,
      roi,
      winRate: g.count > 0 ? (g.wins / g.count) * 100 : 0,
    };
  });

  let providers = Array.from(providerMap.values()).map(p => {
    let roi = 0;
    if (p.totalBet > 0) {
      roi = ((p.totalPayout - p.totalBet) / p.totalBet) * 100;
    }
    return {
      ...p,
      roi,
      winRate: p.count > 0 ? (p.wins / p.count) * 100 : 0,
    };
  });

  if (options.minPlays !== undefined) {
    const minPlays = options.minPlays;
    games = games.filter(g => g.count >= minPlays);
    providers = providers.filter(p => p.count >= minPlays);
  }

  games.sort((a, b) => b.net - a.net);
  providers.sort((a, b) => b.net - a.net);

  if (options.top) {
    games.splice(options.top);
    providers.splice(options.top);
  }

  const net = totalPayout - totalBet;
  const roi = totalBet > 0 ? (net / totalBet) * 100 : 0;
  const winRate = filtered.length > 0 ? (wins / filtered.length) * 100 : 0;

  const overall: OverallStats = {
    totalBets: filtered.length,
    totalBet,
    totalPayout,
    net,
    roi,
    wins,
    losses,
    pushes,
    winRate,
    maxMultiplier,
    maxMultiplierBet,
    maxWinBet,
    maxLossBet,
    firstBetTime,
    lastBetTime,
    currency: options.currency || filtered[0]?.currency || 'USD',
    transactions: transactionStats,
  };

  const streaks: Streaks = {
    currentStreak,
    longestWinStreak,
    longestLossStreak,
  };

  const topBetsLimit = options.topBets ?? 10;
  const topBets = [...filtered].sort((a, b) => scoreBet(b) - scoreBet(a)).slice(0, topBetsLimit);

  const betStats = {
    topBets,
  };

  const delta = performance.now() - startTime;
  const processingTime = Math.round(delta * 100) / 100;

  return {
    overall,
    games,
    providers,
    streaks,
    betStats,
    equityCurve,
    invalidRecords: bets.length - filtered.length,
    processingTime,
  };
}

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'process') {
    try {
      const { fileContent, options, depositContent, withdrawalContent } = data;

      self.postMessage({ type: 'progress', progress: 0 });

      const rawRecords = parseCSV(fileContent);
      self.postMessage({ type: 'progress', progress: 20 });

      const bets: BetRecord[] = [];
      const totalRawRecords = rawRecords.length;
      for (let i = 0; i < rawRecords.length; i++) {
        const bet = normalizeBet(rawRecords[i]);
        if (bet) bets.push(bet);

        const progressInterval = Math.max(100, Math.floor(totalRawRecords / 10));
        if (i % progressInterval === 0) {
          const progress = 20 + Math.floor((i / totalRawRecords) * 20);
          self.postMessage({ type: 'progress', progress });
        }
      }
      self.postMessage({ type: 'progress', progress: 40 });

      let transactionStats: TransactionStats | undefined;
      if (depositContent || withdrawalContent) {
        const transactions: TransactionRecord[] = [];

        if (depositContent) {
          const rawDeposits = parseTransactionCSV(depositContent);
          self.postMessage({ type: 'progress', progress: 50 });

          for (const raw of rawDeposits) {
            const transaction = normalizeTransaction(raw);
            if (transaction) transactions.push(transaction);
          }
        }

        if (withdrawalContent) {
          const rawWithdrawals = parseTransactionCSV(withdrawalContent);
          self.postMessage({ type: 'progress', progress: 60 });

          for (const raw of rawWithdrawals) {
            const transaction = normalizeTransaction(raw);
            if (transaction) transactions.push(transaction);
          }
        }

        transactionStats = computeTransactionStats(transactions, options.currency);
        self.postMessage({ type: 'progress', progress: 70 });
      } else {
        self.postMessage({ type: 'progress', progress: 70 });
      }

      const stats = computeStats(bets, options, transactionStats);
      self.postMessage({ type: 'progress', progress: 95 });

      self.postMessage({ type: 'progress', progress: 100 });
      self.postMessage({ type: 'complete', data: stats });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};
