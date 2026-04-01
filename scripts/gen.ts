// generate a csv file with random data
import crypto from 'crypto';

// 8000rows is 1 mb ish
const mb = 8000;
const sizeInMb = 5;
const rowsToGenerate = sizeInMb * mb;
const oneHour = 60 * 60 * 1000;
const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;

const header = 'ID,Game,Provider,Amount,Multiplier,Payout,Currency,Status,Created At,Updated At';
const currency = 'USD';
const status = 'complete';

const generateRandomSeed = (length: number = 64): string => {
  return crypto.randomBytes(length / 2).toString('hex');
};

const serverSeed = generateRandomSeed();
const clientSeed = generateRandomSeed();
let nonce = 1;

function getRandomFloatFromSeed(): number {
  // Create combined string and hash it using SHA-256
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  nonce++;

  // Use the first 8 hex digits (32 bits) for random value
  const num = Number.parseInt(hash.substring(0, 8), 16);
  const random = num / 0xffffffff;

  // Use next 8 hex digits for range selection
  const rangeNum = Number.parseInt(hash.substring(8, 16), 16);
  const rangeRandom = rangeNum / 0xffffffff;

  // Weighted distribution:
  // 85% -> 0-1
  // 10% -> 2-2.4
  // 4% -> 2.5-4.99
  // 1% -> 5-2000 (with 5 being common, 1995+ being super rare)
  if (rangeRandom < 0.80) {
    // 85%: 0-1
    return random;
  } else if (rangeRandom < 0.85) {
    // 10%: 1-1.4
    return 2 + random * 0.4;
    //0.9840862212140316
  } else if (rangeRandom < 0.99) {
    // 4%: 2.5-4.99
    return 2.5 + random * 2.49;
  } else {
    // 1%: 5-2000 with exponential distribution
    // Most values near 5, very few near 2000
    // Using power of 3 to make higher values exponentially rarer
    const exponential = Math.pow(random, 3);
    return 5 + exponential * 1995;
  }
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function roundToTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100;
}

export function randomMultiplier(): number {
  return getRandomFloatFromSeed();
}

function formatBytes(n: number): string {
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${parseFloat((n / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function makeBet(i: number): string {
  const id = crypto.randomUUID();
  const game = 'Game' + ((i % 10) + 1);
  const provider = 'Provider' + ((i % 5) + 1);
  const betAmount = roundToTwoDecimals(randomFloat(0.1, 10));
  const multiplier = roundToTwoDecimals(randomMultiplier());
  const payout = multiplier > 1 ? roundToTwoDecimals(betAmount * multiplier) : 0;
  const timestamp = new Date(Date.now() - crypto.randomInt(oneHour, twoYears)).toISOString();
  return `${id},${game},${provider},${betAmount},${multiplier},${payout},${currency},${status},${timestamp},${timestamp}\n`;
}

async function fileMode() {
  const start = Date.now();
  const file = Bun.file('../bets/test.csv');
  // clear file
  await file.write('');
  const writer = file.writer();
  let bytes = header.length + 1; // +1 for newline
  await writer.write(header + '\n');
  console.log(`Starting file generation for ${rowsToGenerate.toLocaleString("en-US")} rows...`);
  for (let i = 0; i < rowsToGenerate; i++) {
    const line = makeBet(i);
    bytes += line.length;
    await writer.write(line);
    if (i % 10000 === 0) {
      // console.log(`Wrote ${i + 1} rows of ${rowsToGenerate}`);
      await writer.flush();
      //console.log(`Memory usage: ${formatBytes(process.memoryUsage().heapUsed)}`);
      //console.log(`File size: ${formatBytes(bytes)}`);
    }
  }

  await writer.end();
  
  console.log('File generation complete');
  console.log(`Time taken: ${Date.now() - start}ms`);
  console.log(`File size: ${formatBytes(bytes)}`);
}

export function genRandomCSVData(numRecords: number = 1000) {
  let txt = header + '\n';

  for (let i = 0; i < numRecords; i++) {
    txt += makeBet(i);
  }

  return txt;
}

if (process.argv.includes('--file') || process.argv.includes('-f')) {
  fileMode()
}
if (process.argv.includes('--console') || process.argv.includes('-c')) {
  const index = process.argv.length - 1;
  const numRecords = parseInt(process.argv[index] ?? '25');
  console.log(genRandomCSVData(numRecords));
}

