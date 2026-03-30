import type { StatsHistoryEntry } from '../types';

const DB_NAME = 'DegenAnalyticsDB';
const STORE_NAME = 'statsHistory';
const DB_VERSION = 1;
const MAX_ENTRIES = 20;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('time', 'time', { unique: false });
      }
    };
  });
}

export async function saveStatsToHistory(entry: StatsHistoryEntry): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    const countRequest = store.count();
    const count = await new Promise<number>((resolve, reject) => {
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error);
    });

    if (count > MAX_ENTRIES) {
      const index = store.index('time');
      let deleteCount = count - MAX_ENTRIES;

      await new Promise<void>((resolve, reject) => {
        const allRequest = index.openCursor();

        allRequest.onsuccess = event => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor && deleteCount > 0) {
            store.delete(cursor.primaryKey);
            deleteCount--;
            cursor.continue();
          } else {
            resolve();
          }
        };

        allRequest.onerror = () => reject(allRequest.error);
      });
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    db.close();
  } catch (error) {
    console.error('Failed to save stats history to IndexedDB:', error);
    throw error;
  }
}

export async function getStatsFromHistory(): Promise<StatsHistoryEntry[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('time');

    const entries = await new Promise<StatsHistoryEntry[]>((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return entries;
  } catch (error) {
    console.error('Failed to retrieve stats history from IndexedDB:', error);
    return [];
  }
}

export async function clearStatsHistory(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    db.close();
  } catch (error) {
    console.error('Failed to clear stats history:', error);
    throw error;
  }
}
