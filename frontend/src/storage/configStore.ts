import type { Settings } from '../types';

const DB_NAME = 'DocQAConfigDB';
const DB_VERSION = 1;
const CONFIG_STORE = 'config';
const CONFIG_KEY = 'app_settings';

let db: IDBDatabase | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains(CONFIG_STORE)) {
        database.createObjectStore(CONFIG_STORE, { keyPath: 'id' });
      }
    };
  });
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([CONFIG_STORE], 'readwrite');
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.put({ id: CONFIG_KEY, ...settings });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const loadSettings = async (): Promise<Settings | null> => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([CONFIG_STORE], 'readonly');
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.get(CONFIG_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      if (result && result.id === CONFIG_KEY) {
        const { id, ...settings } = result;
        resolve(settings as Settings);
      } else {
        resolve(null);
      }
    };
  });
};

export const deleteSettings = async (): Promise<void> => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([CONFIG_STORE], 'readwrite');
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.delete(CONFIG_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
