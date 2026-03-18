// generate a csv file with random data
import { randomUUID, randomInt } from 'crypto';

// 8000rows is 1 mb ish
const mb = 8000;
const sizeInMb = 50;
const rowsToGenerate = sizeInMb * mb;
const oneHour = 60 * 60 * 1000;
const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;

const header = 'ID,Game,Provider,Amount,Multiplier,Payout,Currency,Status,Created At,Updated At';
const currency = 'USD';
const status = 'complete';

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function roundToTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100;
}

export function randomMultiplier(): number {
  const r = Math.random();

  // 85% losing bets: 0.5x - <1.0x
  if (r < 0.85) return randomFloat(0, 0.99);

  // 15% small wins: 1.0x - 2.0x
  if (r < 0.97) return randomFloat(1, 2);

  // 3% big wins: 2.0x - 100x (log-ish skew)
  const u = Math.random();
  const logMin = Math.log(2);
  const logMax = Math.log(100);
  return Math.exp(logMin + (logMax - logMin) * u);
}

function formatBytes(n: number): string {
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${parseFloat((n / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function makeBet(i: number): string {
  const id = randomUUID();
  const game = 'Game' + ((i % 10) + 1);
  const provider = 'Provider' + ((i % 5) + 1);
  const betAmount = roundToTwoDecimals(randomFloat(1, 10));
  const multiplier = roundToTwoDecimals(randomMultiplier());
  const payout = roundToTwoDecimals(betAmount * multiplier);
  const timestamp = new Date(Date.now() - randomInt(oneHour, twoYears)).toISOString();
  return `${id},${game},${provider},${betAmount},${multiplier},${payout},${currency},${status},${timestamp},${timestamp}\n`;
}

async function fileMode() {
  const file = Bun.file('../bets/test.csv');
  // clear file
  await file.write('');
  const writer = file.writer();
  let bytes = header.length + 1; // +1 for newline
  await writer.write(header + '\n');
  for (let i = 0; i < rowsToGenerate; i++) {
    const line = makeBet(i);
    bytes += line.length;
    await writer.write(line);
    if (i % 10000 === 0) {
      console.log(`Wrote ${i + 1} rows of ${rowsToGenerate}`);
      await writer.flush();
      console.log(`Memory usage: ${formatBytes(process.memoryUsage().heapUsed)}`);
      console.log(`File size: ${formatBytes(bytes)}`);
    }
  }

  await writer.end();
}

export function genRandomCSVData(numRecords: number = 1000) {
  let txt = header + '\n';

  for (let i = 0; i < numRecords; i++) {
    txt += makeBet(i);
  }

  return txt;
}

if (process.argv.includes('--file') || process.argv.includes('-f')) {
  fileMode();
}
