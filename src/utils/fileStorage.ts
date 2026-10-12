// Persistent client-side storage with IndexedDB + in-memory cache fallback
const DB_NAME = 'MyFile_Storage_DB';
const DB_VERSION = 1;
const STORE_NAME = 'file_blobs';

// Fast memory fallback cache for active session
const memoryCache = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn('IndexedDB open blocked');
        reject(new Error('IndexedDB blocked'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

export async function storeFileContent(fileId: string, fileData: string): Promise<void> {
  if (!fileId || !fileData) return;
  
  // Store in memory cache immediately
  memoryCache.set(fileId, fileData);

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put({ id: fileId, data: fileData, timestamp: Date.now() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB store fallback to memoryCache:', err);
  }
}

export async function retrieveFileContent(fileId: string): Promise<string | null> {
  if (!fileId) return null;

  // Check memory cache first (instant)
  if (memoryCache.has(fileId)) {
    return memoryCache.get(fileId) || null;
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(fileId);

      req.onsuccess = () => {
        if (req.result && req.result.data) {
          memoryCache.set(fileId, req.result.data);
          resolve(req.result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('IndexedDB retrieve fallback:', err);
    return memoryCache.get(fileId) || null;
  }
}

export async function removeFileContent(fileId: string): Promise<void> {
  if (!fileId) return;
  memoryCache.delete(fileId);

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(fileId);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {}
}

// Convert Base64 data: URL to blob: URL
export function dataUrlToBlobUrl(dataUrl: string): string {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      return dataUrl;
    }
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(parts[1]);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('Error converting dataUrl to blobUrl:', err);
    return dataUrl;
  }
}
