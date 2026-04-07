import { parseCSVLine } from './utils';
import type { ProcessFilesMessage, ProgressMessage, CompleteMessage, ErrorMessage } from '../types';

export function parseGenericCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push(row);
    } catch {
      continue;
    }
  }

  return rows;
}

export function dedupeRows(rows: Record<string, string>[]): Record<string, string>[] {
  const seen = new Set<string>();
  const out: Record<string, string>[] = [];

  for (const row of rows) {
    const id = row.ID || row.id || row.Id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }

  return out;
}

async function fetchExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    const data = (await response.json()) as { rates: Record<string, number> };
    if (!data.rates || Object.keys(data.rates).length === 0) {
      throw new Error('Failed to load exchange rates');
    }
    return data.rates;
  } catch (error) {
    throw new Error(
      `Failed to fetch exchange rates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
}

export function convertCurrencyInRows(
  rows: Record<string, string>[],
  columns: string[],
  data: {
    toCurrency: string;
    exchangeRates: Record<string, number>;
  }
): Record<string, string>[] {
  return rows.map(row => {
    const newRow = { ...row };
    const fromCurrency = newRow.Currency;
    
    if (fromCurrency === data.toCurrency) {
      return newRow;
    }

    const rate = data.exchangeRates[fromCurrency];
    if (!rate) {
      console.warn(`No exchange rate found for ${fromCurrency}`);
      return newRow;
    }

    for (const col of columns) {
      if (newRow[col]) {
        const value = parseFloat(newRow[col]);
        if (!isNaN(value)) {
          newRow[col] = (value / rate).toFixed(2);
        }
      }
    }
    
    newRow.Currency = data.toCurrency;
    return newRow;
  });
}

export function rowsToCsv(rows: Record<string, string>[], firstFileHeaders?: string[]): string {
  if (rows.length === 0) return '';

  const headerSet = new Set<string>();
  const headerOrder: string[] = [];

  if (firstFileHeaders && firstFileHeaders.length > 0) {
    for (const h of firstFileHeaders) {
      if (!headerSet.has(h)) {
        headerSet.add(h);
        headerOrder.push(h);
      }
    }
  }

  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!headerSet.has(k)) {
        headerSet.add(k);
        headerOrder.push(k);
      }
    }
  }

  const headers = headerOrder;
  const escape = (v: string) =>
    v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;

  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h] || '')).join(',')),
  ];

  return lines.join('\n') + '\n';
}

self.onmessage = async (e: MessageEvent<ProcessFilesMessage>): Promise<void> => {
  const { type, data } = e.data;

  if (type === 'process') {
    try {
      const { files, fileType, convertCurrency, currencyFrom, currencyTo, currencyColumns } = data;

      self.postMessage({ type: 'progress', progress: 0 } as ProgressMessage);

      const allRows: Record<string, string>[] = [];
      const totalFiles = files.length;
      let firstFileHeaders: string[] | undefined;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const lines = file.content.split(/\r?\n/).filter(l => l.trim().length > 0);
          if (lines.length >= 1 && i === 0) {
            firstFileHeaders = parseCSVLine(lines[0]);
          }

          const rows = parseGenericCSV(file.content);
          allRows.push(...rows);

          const progress = Math.floor(((i + 1) / totalFiles) * 80);
          self.postMessage({ type: 'progress', progress } as ProgressMessage);
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
        }
      }

      self.postMessage({ type: 'progress', progress: 85 } as ProgressMessage);

      let deduped = dedupeRows(allRows);

      if (
        convertCurrency &&
        currencyFrom &&
        currencyTo &&
        currencyColumns &&
        currencyColumns.length > 0
      ) {
        const rates = await fetchExchangeRates(currencyFrom);
        console.log(rates);
        const conversionRate = rates[currencyTo];
        if (!conversionRate) {
          throw new Error(`Conversion rate not found for ${currencyFrom} to ${currencyTo}`);
        }
        deduped = convertCurrencyInRows(deduped, currencyColumns, {
          toCurrency: currencyTo,
          exchangeRates: rates,
        });
      }

      self.postMessage({ type: 'progress', progress: 95 } as ProgressMessage);

      const csv = rowsToCsv(deduped, firstFileHeaders);

      self.postMessage({ type: 'progress', progress: 100 } as ProgressMessage);

      self.postMessage({
        type: 'complete',
        data: {
          csv,
          rowCount: deduped.length,
          fileType,
        },
      } as CompleteMessage);
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ErrorMessage);
    }
  }
};
