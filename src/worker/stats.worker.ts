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

interface RawBetRecord {
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

export function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === ',') {
      out.push(cur);
      cur = '';
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    cur += ch;
  }

  out.push(cur);
  return out.map(field => field.trim());
}

export function parseCSV(text: string): RawBetRecord[] {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trimEnd())
    .filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const records: RawBetRecord[] = [];

  const headerMap: Record<string, string> = {
    id: 'id',
    game: 'game_name',
    'game name': 'game_name',
    game_name: 'game_name',
    provider: 'provider',
    amount: 'bet_amount',
    'bet amount': 'bet_amount',
    bet_amount: 'bet_amount',
    multiplier: 'multiplier',
    payout: 'payout',
    currency: 'currency',
    status: 'status',
    'created at': 'time',
    time: 'time',
    'updated at': 'updated_at',
    rollback: 'rollback',
    complete: 'complete',
  };

  const columnIndices: Record<string, number> = {};
  headers.forEach((header, index) => {
    const mapped = headerMap[header];
    if (mapped) {
      columnIndices[mapped] = index;
    }
  });

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length === 1 && values[0] === '') continue;

    const id = values[columnIndices['id']]?.trim() || '';
    const gameName = values[columnIndices['game_name']]?.trim() || '';
    const provider = values[columnIndices['provider']]?.trim() || '';
    const betAmount = values[columnIndices['bet_amount']]?.trim() || '0';
    const payout = values[columnIndices['payout']]?.trim() || '0';
    const multiplier = values[columnIndices['multiplier']]?.trim() || '0';
    const currency = values[columnIndices['currency']]?.trim() || 'USD';
    const status = values[columnIndices['status']]?.trim() || 'complete';
    const time = values[columnIndices['time']]?.trim();
    if (!time) continue;

    const record: RawBetRecord = {
      id,
      game_name: provider ? `${provider}:${gameName}` : gameName,
      bet_amount: betAmount,
      payout,
      multiplier: parseFloat(multiplier) || 0,
      currency,
      time,
      rollback: status.toLowerCase() === 'rollback',
      complete: status.toLowerCase() === 'complete',
    };

    records.push(record);
  }

  return records;
}

interface RawTransactionRecord {
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

export function parseTransactionCSV(text: string): RawTransactionRecord[] {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trimEnd())
    .filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const records: RawTransactionRecord[] = [];

  const headerMap: Record<string, string> = {
    id: 'id',
    status: 'status',
    type: 'type',
    method: 'method',
    amount: 'amount',
    currency: 'currency',
    'external amount': 'external_amount',
    'external currency': 'external_currency',
    'external txid': 'external_txid',
    'updated at': 'updated_at',
  };

  const columnIndices: Record<string, number> = {};
  headers.forEach((header, index) => {
    const mapped = headerMap[header];
    if (mapped) {
      columnIndices[mapped] = index;
    }
  });

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length === 1 && values[0] === '') continue;

    const record: RawTransactionRecord = {
      id: values[columnIndices['id']]?.trim() || '',
      status: values[columnIndices['status']]?.trim() || '',
      type: values[columnIndices['type']]?.trim() || '',
      method: values[columnIndices['method']]?.trim() || '',
      amount: values[columnIndices['amount']]?.trim() || '0',
      currency: values[columnIndices['currency']]?.trim() || 'USD',
      external_amount: values[columnIndices['external_amount']]?.trim(),
      external_currency: values[columnIndices['external_currency']]?.trim(),
      external_txid: values[columnIndices['external_txid']]?.trim(),
      updated_at: values[columnIndices['updated_at']]?.trim() || new Date().toISOString(),
    };

    records.push(record);
  }

  return records;
}

export function normalizeTransaction(raw: RawTransactionRecord): TransactionRecord | null {
  try {
    const amount = parseFloat(raw.amount);

    if (!Number.isFinite(amount)) {
      return null;
    }

    if (!raw.type) {
      return null;
    }

    const type = raw.type.toLowerCase();
    if (type !== 'deposit' && type !== 'withdrawal') {
      return null;
    }

    return {
      id: raw.id || '',
      status: raw.status || '',
      type: type as 'deposit' | 'withdrawal',
      method: raw.method || '',
      amount,
      currency: raw.currency || 'USD',
      externalAmount: raw.external_amount ? parseFloat(raw.external_amount) : undefined,
      externalCurrency: raw.external_currency,
      externalTxid: raw.external_txid,
      updatedAt: new Date(raw.updated_at),
    };
  } catch {
    return null;
  }
}

export function computeTransactionStats(
  transactions: TransactionRecord[],
  currency?: string
): TransactionStats {
  let filtered = transactions.filter(t => t.status.toLowerCase() === 'complete');

  if (currency) {
    filtered = filtered.filter(t => t.currency.toLowerCase() === currency.toLowerCase());
  }

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let depositCount = 0;
  let withdrawalCount = 0;

  for (const transaction of filtered) {
    if (transaction.type === 'deposit') {
      totalDeposits += transaction.amount;
      depositCount++;
    } else if (transaction.type === 'withdrawal') {
      totalWithdrawals += transaction.amount;
      withdrawalCount++;
    }
  }

  return {
    totalDeposits,
    totalWithdrawals,
    depositCount,
    withdrawalCount,
    netTransactions: totalWithdrawals - totalDeposits,
  };
}

export function normalizeBet(raw: RawBetRecord): BetRecord | null {
  try {
    const betAmount =
      typeof raw.bet_amount === 'string' ? parseFloat(raw.bet_amount) : raw.bet_amount;

    const payout = typeof raw.payout === 'string' ? parseFloat(raw.payout) : raw.payout;

    if (!Number.isFinite(betAmount) || !Number.isFinite(payout)) {
      return null;
    }

    const gameNameParts = raw.game_name?.split(':') || [];
    const gameName = gameNameParts[gameNameParts.length - 1]?.trim() || raw.game_name || 'Unknown';
    const provider = gameNameParts.length > 1 ? gameNameParts[0].trim() : undefined;

    return {
      id: raw.id || '',
      gameName,
      provider,
      betAmount,
      payout,
      multiplier: raw.multiplier || 0,
      currency: raw.currency || 'USD',
      time: new Date(raw.time),
      rollback: raw.rollback || false,
      complete: raw.complete !== false,
    };
  } catch {
    return null;
  }
}

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
      currentStreak = { type: 'push', count: 1 };
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

  const games = Array.from(gameMap.values()).map(g => {
    let roi = 0;
    if (g.totalBet > 0.01) {
      roi = ((g.totalPayout - g.totalBet) / g.totalBet) * 100;
      roi = Math.max(-1000, Math.min(10000, roi));
    }
    return {
      ...g,
      roi,
      winRate: g.count > 0 ? (g.wins / g.count) * 100 : 0,
    };
  });

  const providers = Array.from(providerMap.values()).map(p => {
    let roi = 0;
    if (p.totalBet > 0.01) {
      roi = ((p.totalPayout - p.totalBet) / p.totalBet) * 100;
      roi = Math.max(-1000, Math.min(10000, roi));
    }
    return {
      ...p,
      roi,
      winRate: p.count > 0 ? (p.wins / p.count) * 100 : 0,
    };
  });

  if (options.minPlays !== undefined) {
    const minPlays = options.minPlays;
    const filteredGames = games.filter(g => g.count >= minPlays);
    const filteredProviders = providers.filter(p => p.count >= minPlays);
    games.length = 0;
    games.push(...filteredGames);
    providers.length = 0;
    providers.push(...filteredProviders);
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

  const delta = performance.now() - startTime;
  const processingTime = Math.round(delta * 100) / 100;

  return {
    overall,
    games,
    providers,
    streaks,
    equityCurve,
    invalidRecords: bets.length - filtered.length,
    processingTime,
  };
}

self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'process') {
    try {
      const { fileContent, options, depositContent, withdrawalContent } = data;

      self.postMessage({ type: 'progress', progress: 10 });

      const rawRecords = parseCSV(fileContent);

      self.postMessage({ type: 'progress', progress: 30 });

      const bets: BetRecord[] = [];
      for (const raw of rawRecords) {
        const bet = normalizeBet(raw);
        if (bet) bets.push(bet);
      }

      self.postMessage({ type: 'progress', progress: 50 });

      let transactionStats: TransactionStats | undefined;
      if (depositContent || withdrawalContent) {
        const transactions: TransactionRecord[] = [];

        if (depositContent) {
          const rawDeposits = parseTransactionCSV(depositContent);
          for (const raw of rawDeposits) {
            const transaction = normalizeTransaction(raw);
            if (transaction) transactions.push(transaction);
          }
        }

        if (withdrawalContent) {
          const rawWithdrawals = parseTransactionCSV(withdrawalContent);
          for (const raw of rawWithdrawals) {
            const transaction = normalizeTransaction(raw);
            if (transaction) transactions.push(transaction);
          }
        }

        transactionStats = computeTransactionStats(transactions, options.currency);
      }

      self.postMessage({ type: 'progress', progress: 70 });

      const stats = computeStats(bets, options, transactionStats);

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
