import { saveStatsToHistory, getStatsFromHistory, clearStatsHistory as clearDB } from './historyDB';
import type {
  BetRecord,
  TransactionRecord,
  TransactionStats,
  RawBetRecord,
  RawTransactionRecord,
  StatsHistoryEntry,
  StatsResult,
} from '../types';

// Maximum points to store in equity curve
const MAX_EQUITY_CURVE_POINTS = 500;

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

  // Handle unclosed quotes - if still in quotes at end of line, treat as malformed
  if (inQuotes) {
    throw new Error('Malformed CSV: unclosed quote in line');
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

    let values: string[];
    try {
      values = parseCSVLine(line);
    } catch {
      // Skip malformed lines with unclosed quotes
      continue;
    }
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

    let values: string[];
    try {
      values = parseCSVLine(line);
    } catch {
      // Skip malformed lines with unclosed quotes
      continue;
    }
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

function replaceAll(s: string, searchValue: string, replaceValue: string) {
  return s.split(searchValue).join(replaceValue);
}

function parseDate(value: string): Date {
  if (!value || typeof value !== 'string') throw new Error('Invalid timestamp Not String');

  // example 2026/01/03 09:55:26 in UTC
  const raw = value.trim();
  const [datePart, timePart] = raw.split(' ');
  const datePartNormalized = replaceAll(datePart, '/', '-');
  const forcedIso = `${datePartNormalized}T${timePart}Z`;

  const timestamp = new Date(forcedIso);

  if (!Number.isFinite(timestamp.getTime())) {
    const d2 = new Date(value);
    if (!Number.isFinite(d2.getTime())) throw new Error(`Invalid time: ${value}`);
    return d2;
  }

  return timestamp;
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
      updatedAt: parseDate(raw.updated_at),
    };
  } catch {
    return null;
  }
}

export function computeTransactionStats(
  transactions: TransactionRecord[],
  currency?: string
): TransactionStats {
  const stats: TransactionStats = {
    totalDeposits: 0,
    totalWithdrawals: 0,
    depositCount: 0,
    withdrawalCount: 0,
    netTransactions: 0,
  };

  transactions.forEach(transaction => {
    const { status, currency: c, type, amount } = transaction;
    if (status.toLowerCase() !== 'complete') {
      return;
    }

    if (currency && c.toLowerCase() !== currency.toLowerCase()) {
      return;
    }

    if (type === 'deposit') {
      stats.totalDeposits += amount;
      stats.depositCount++;
    } else if (type === 'withdrawal') {
      stats.totalWithdrawals += amount;
      stats.withdrawalCount++;
    }
  });

  stats.netTransactions = stats.totalWithdrawals - stats.totalDeposits;

  return stats;
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
      time: parseDate(raw.time),
      rollback: raw.rollback || false,
      complete: raw.complete !== false,
    };
  } catch {
    return null;
  }
}

export function scoreBet(bet: BetRecord): number {
  if (!bet) return 0;

  const b = bet.betAmount;
  const p = bet.payout;
  const m = bet.multiplier;
  if (!Number.isFinite(b) || !Number.isFinite(p) || !Number.isFinite(m)) return 0;

  const net = p - b;
  const netScore = net <= 0 ? 0 : net;

  const multiplierScore = Math.round(m * 100) / 100;

  return Math.round(netScore + multiplierScore);
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // cSpell: disable-next-line
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function simplifyEquityCurve(
  curve: { time: number; value: number }[],
  maxPoints = MAX_EQUITY_CURVE_POINTS
): { time: number; value: number }[] {
  if (curve.length === 0) return [];
  if (curve.length <= maxPoints) return curve;

  const step = Math.ceil(curve.length / maxPoints);
  const simplified: { time: number; value: number }[] = [];

  for (let i = 0; i < curve.length; i += step) {
    const point = curve[i];
    if (point) {
      simplified.push(point);
    }
  }

  const lastPoint = curve[curve.length - 1];
  const lastSimplified = simplified[simplified.length - 1];
  if (lastPoint && lastSimplified && lastSimplified !== lastPoint) {
    simplified.push(lastPoint);
  }

  return simplified;
}

export async function saveStatsHistory(stats: StatsResult): Promise<void> {
  const historyEntry: StatsHistoryEntry = {
    id: generateUUID(),
    time: Date.now(),
    bets: stats.overall.totalBets,
    data: {
      overall: stats.overall,
      games: stats.games,
      providers: stats.providers,
      streaks: stats.streaks,
      betStats: stats.betStats,
      // Simplify equity curve to reduce storage size
      equityCurve: simplifyEquityCurve(stats.equityCurve),
      invalidRecords: stats.invalidRecords,
      processingTime: stats.processingTime,
    },
  };

  await saveStatsToHistory(historyEntry);
}

export async function getStatsHistory(): Promise<StatsHistoryEntry[]> {
  return await getStatsFromHistory();
}

export async function clearStatsHistory(): Promise<void> {
  await clearDB();
}
