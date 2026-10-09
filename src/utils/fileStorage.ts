import type { StoredFile } from '../types/index.ts';

// Persistent client-side storage with IndexedDB + in-memory cache fallback
const DB_NAME = 'MyFile_Storage_DB';
const DB_VERSION = 2;
const STORE_BLOBS = 'file_blobs';
const STORE_RECORDS = 'file_records';

// Fast memory fallback cache for active session
const memoryCache = new Map<string, string>();
const recordMemoryCache = new Map<string, StoredFile>();

// Tombstone tracking for deleted files to avoid resurrection
const TOMBSTONE_KEY = 'myfile_tombstone_ids_v2';

export function getTombstones(): Set<string> {
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function isDeletedTombstone(fileId: string): boolean {
  if (!fileId) return false;
  return getTombstones().has(fileId);
}

export function addTombstone(fileId: string): void {
  if (!fileId) return;
  try {
    const set = getTombstones();
    set.add(fileId);
    const arr = Array.from(set).slice(-300);
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(arr));
  } catch {}
}

export function removeTombstone(fileId: string): void {
  if (!fileId) return;
  try {
    const set = getTombstones();
    set.delete(fileId);
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

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
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_RECORDS)) {
          db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
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

// Store bulky file binary/dataUrl in blobs store
export async function storeFileContent(fileId: string, fileData: string): Promise<void> {
  if (!fileId || !fileData) return;
  
  memoryCache.set(fileId, fileData);

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_BLOBS, 'readwrite');
      const store = transaction.objectStore(STORE_BLOBS);
      const req = store.put({ id: fileId, data: fileData, timestamp: Date.now() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB blob store fallback to memoryCache:', err);
  }
}

// Retrieve bulky file binary/dataUrl
export async function retrieveFileContent(fileId: string): Promise<string | null> {
  if (!fileId) return null;

  if (memoryCache.has(fileId)) {
    return memoryCache.get(fileId) || null;
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_BLOBS, 'readonly');
      const store = transaction.objectStore(STORE_BLOBS);
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

// Remove bulky file content
export async function removeFileContent(fileId: string): Promise<void> {
  if (!fileId) return;
  memoryCache.delete(fileId);

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_BLOBS, 'readwrite');
      const store = transaction.objectStore(STORE_BLOBS);
      const req = store.delete(fileId);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {}
}

// Persist complete file metadata record in IndexedDB
export async function saveLocalFileRecord(file: StoredFile): Promise<void> {
  if (!file || !file.id) return;

  removeTombstone(file.id);
  recordMemoryCache.set(file.id, file);

  // If file contains fileData, store in blob store
  if (file.fileData) {
    storeFileContent(file.id, file.fileData).catch(() => {});
  }

  try {
    const db = await openDB();
    const cleanRecord = { ...file };
    // Don't duplicate massive base64 in metadata record if it's already in blobs store
    if (cleanRecord.fileData && cleanRecord.fileData.length > 500000) {
      delete cleanRecord.fileData;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_RECORDS, 'readwrite');
      const store = transaction.objectStore(STORE_RECORDS);
      const req = store.put(cleanRecord);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveLocalFileRecord fallback:', err);
  }
}

// Retrieve all local files from IndexedDB
export async function getAllLocalFiles(): Promise<StoredFile[]> {
  try {
    const db = await openDB();
    const records = await new Promise<StoredFile[]>((resolve) => {
      const transaction = db.transaction(STORE_RECORDS, 'readonly');
      const store = transaction.objectStore(STORE_RECORDS);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(Array.isArray(req.result) ? req.result : []);
      };
      req.onerror = () => {
        resolve([]);
      };
    });

    if (records.length > 0) {
      records.forEach((r) => recordMemoryCache.set(r.id, r));
      return records;
    }
  } catch (err) {
    console.warn('getAllLocalFiles fallback to memory/localStorage:', err);
  }

  // Fallback to memoryCache or localStorage
  if (recordMemoryCache.size > 0) {
    return Array.from(recordMemoryCache.values());
  }
  return getCachedMetadataList();
}

// Delete file record from all local stores and record tombstone
export async function deleteLocalFileRecord(fileId: string): Promise<void> {
  if (!fileId) return;

  addTombstone(fileId);
  recordMemoryCache.delete(fileId);
  memoryCache.delete(fileId);

  // Remove from blobs
  removeFileContent(fileId).catch(() => {});

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_RECORDS, 'readwrite');
      const store = transaction.objectStore(STORE_RECORDS);
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

// Cache file metadata list (excluding bulky fileData) for instant synchronous offline startup
const META_LIST_KEY = 'myfile_meta_list_v2';

export function cacheMetadataList(files: any[]): void {
  try {
    const tombstones = getTombstones();
    const lightweightList = files
      .filter((f) => !tombstones.has(f.id))
      .map((f) => {
        const { fileData, ...rest } = f;
        return rest;
      });
    localStorage.setItem(META_LIST_KEY, JSON.stringify(lightweightList));
  } catch (err) {
    console.warn('Failed to cache metadata list:', err);
  }
}

export function getCachedMetadataList(): any[] {
  try {
    const raw = localStorage.getItem(META_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const tombstones = getTombstones();
    return Array.isArray(parsed) ? parsed.filter((f) => !tombstones.has(f.id)) : [];
  } catch {
    return [];
  }
}
