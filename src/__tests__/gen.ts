// generate a csv file with random data
import { randomUUID, randomInt } from 'crypto';

// 8_000 rows is 1 mb
const mb = 8 * 1000;
const size_in_mb = 25;
const rowsToGenerate = size_in_mb * mb;

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomMultiplier(): number {
  const r = Math.random();

  // 85% losing bets: 0.5x - <1.0x
  if (r < 0.85) return randomFloat(0, 1);

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

async function fileMode() {
  const file = Bun.file('./src/__tests__/test.csv');
  // clear file
  await file.write('');
  const writer = file.writer();
  const header = 'ID,Game,Provider,Amount,Multiplier,Payout,Currency,Status,Created At,Updated At';
  let bytes = header.length;
  await writer.write(header + '\n');
  for (let i = 0; i < rowsToGenerate; i++) {
    const id = randomUUID();
    const game = 'Game' + ((i % 10) + 1);
    const provider = 'Provider' + ((i % 5) + 1);
    const betAmount = randomFloat(1, 10);
    const multiplier = randomMultiplier();
    const payout = betAmount * multiplier;

    const currency = 'USD';
    const timestamp = new Date(Date.now() - randomInt(0, 86400000)).toISOString();
    let line = `${id},${game},${provider},${betAmount},${multiplier},${payout},${currency},complete,${timestamp},${timestamp}\n`;
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
  const header = 'ID,Game,Provider,Amount,Multiplier,Payout,Currency,Status,Created At,Updated At';

  let txt = header + '\n';

  for (let i = 0; i < numRecords; i++) {
    const id = randomUUID();
    const game = 'Game' + ((i % 10) + 1);
    const provider = 'Provider' + ((i % 5) + 1);
    const betAmount = randomFloat(1, 10);
    const multiplier = randomMultiplier();
    const payout = betAmount * multiplier;

    const currency = 'USD';
    const timestamp = new Date(Date.now() - randomInt(0, 86400000)).toISOString();
    txt += `${id},${game},${provider},${betAmount},${multiplier},${payout},${currency},complete,${timestamp},${timestamp}\n`;
  }

  return txt;
}

if (process.argv.includes('--file') || process.argv.includes('-f')) {
  fileMode();
}
