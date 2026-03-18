import type {
  BetRecord,
  TransactionRecord,
  TransactionStats,
  RawBetRecord,
  RawTransactionRecord,
} from '../types';

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
  if (typeof value !== 'string') throw new Error('Invalid timestamp Not String');

  const normalized = value.includes('/') ? replaceAll(value, '/', '-') : value;

  const isoLike = normalized.includes('T') ? normalized : normalized.replace(' ', 'T');

  const timestamp = new Date(isoLike + (isoLike.endsWith('Z') ? '' : 'Z'));

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
  const netScore = net <= 0 ? -1 : net / 10;

  const multiplierScore = Math.round((m - 1) * 100) / 100;

  return netScore + multiplierScore;
}
