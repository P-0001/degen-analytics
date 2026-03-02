import type { BetRecord, StatsResult, FilterOptions, GameStats, ProviderStats, OverallStats, Streaks } from '../types';

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

function parseCSV(text: string): RawBetRecord[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const records: RawBetRecord[] = [];
  
  const headerMap: Record<string, string> = {
    'id': 'id',
    'game': 'game_name',
    'game name': 'game_name',
    'game_name': 'game_name',
    'provider': 'provider',
    'amount': 'bet_amount',
    'bet amount': 'bet_amount',
    'bet_amount': 'bet_amount',
    'multiplier': 'multiplier',
    'payout': 'payout',
    'currency': 'currency',
    'status': 'status',
    'created at': 'time',
    'time': 'time',
    'updated at': 'updated_at',
    'rollback': 'rollback',
    'complete': 'complete'
  };
  
  const columnIndices: Record<string, number> = {};
  headers.forEach((header, index) => {
    const mapped = headerMap[header];
    if (mapped) {
      columnIndices[mapped] = index;
    }
  });
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    
    const id = values[columnIndices['id']]?.trim() || '';
    const gameName = values[columnIndices['game_name']]?.trim() || '';
    const provider = values[columnIndices['provider']]?.trim() || '';
    const betAmount = values[columnIndices['bet_amount']]?.trim() || '0';
    const payout = values[columnIndices['payout']]?.trim() || '0';
    const multiplier = values[columnIndices['multiplier']]?.trim() || '0';
    const currency = values[columnIndices['currency']]?.trim() || 'USD';
    const status = values[columnIndices['status']]?.trim() || 'complete';
    const time = values[columnIndices['time']]?.trim() || new Date().toISOString();
    
    const record: RawBetRecord = {
      id,
      game_name: provider ? `${provider}:${gameName}` : gameName,
      bet_amount: betAmount,
      payout,
      multiplier: parseFloat(multiplier) || 0,
      currency,
      time,
      rollback: status.toLowerCase() === 'rollback',
      complete: status.toLowerCase() === 'complete'
    };
    
    records.push(record);
  }
  
  return records;
}


function normalizeBet(raw: RawBetRecord): BetRecord | null {
  try {
    const betAmount = typeof raw.bet_amount === 'string' 
      ? parseFloat(raw.bet_amount) 
      : raw.bet_amount;
    
    const payout = typeof raw.payout === 'string'
      ? parseFloat(raw.payout)
      : raw.payout;
    
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

function computeStats(bets: BetRecord[], options: FilterOptions): StatsResult {
  const startTime = performance.now();
  
  let filtered = bets.filter(b => !b.rollback && b.complete);
  
  if (options.currency) {
    filtered = filtered.filter(b => b.currency.toLowerCase() === options.currency!.toLowerCase());
  }
  
  if (options.game) {
    const gameLower = options.game.toLowerCase();
    filtered = filtered.filter(b => b.gameName.toLowerCase().includes(gameLower));
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
  
  let currentStreak: { type: 'win' | 'loss' | 'push'; count: number } = { type: 'push', count: 0 };
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;
  
  for (const bet of filtered) {
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
      if (bet.multiplier > providerStats.maxMultiplier) providerStats.maxMultiplier = bet.multiplier;
    }
  }
  
  const games = Array.from(gameMap.values()).map(g => ({
    ...g,
    roi: g.totalBet > 0 ? ((g.totalPayout - g.totalBet) / g.totalBet) * 100 : 0,
    winRate: g.count > 0 ? (g.wins / g.count) * 100 : 0,
  }));
  
  const providers = Array.from(providerMap.values()).map(p => ({
    ...p,
    roi: p.totalBet > 0 ? ((p.totalPayout - p.totalBet) / p.totalBet) * 100 : 0,
    winRate: p.count > 0 ? (p.wins / p.count) * 100 : 0,
  }));
  
  if (options.minPlays !== undefined) {
    const minPlays = options.minPlays;
    games.splice(0, games.length, ...games.filter(g => g.count >= minPlays));
    providers.splice(0, providers.length, ...providers.filter(p => p.count >= minPlays));
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
    firstBetTime: filtered[0]?.time,
    lastBetTime: filtered[filtered.length - 1]?.time,
    currency: options.currency || filtered[0]?.currency || 'USD',
  };
  
  const streaks: Streaks = {
    currentStreak,
    longestWinStreak,
    longestLossStreak,
  };
  
  const processingTime = performance.now() - startTime;
  
  return {
    overall,
    games,
    providers,
    streaks,
    invalidRecords: bets.length - filtered.length,
    processingTime,
  };
}

self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;
  
  if (type === 'process') {
    try {
      const { fileContent, options } = data;
      
      self.postMessage({ type: 'progress', progress: 10 });
      
      const rawRecords = parseCSV(fileContent);
      
      self.postMessage({ type: 'progress', progress: 30 });
      
      const bets: BetRecord[] = [];
      for (const raw of rawRecords) {
        const bet = normalizeBet(raw);
        if (bet) bets.push(bet);
      }
      
      self.postMessage({ type: 'progress', progress: 60 });
      
      const stats = computeStats(bets, options);
      
      self.postMessage({ type: 'progress', progress: 100 });
      self.postMessage({ type: 'complete', data: stats });
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
};
