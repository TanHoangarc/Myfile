import type { StoredFile } from '../types/index.ts';
import { 
  saveFileToFirestore, 
  deleteFileFromFirestore, 
  updateFileInFirestore 
} from '../firebase.ts';

// Save file to centralized cloud storage (accessible by ALL machines immediately)
export async function autoSaveFileToCloud(file: StoredFile): Promise<boolean> {
  let serverSaved = false;

  // 1. Post to Server API (guarantees cross-machine visibility with zero quota limits)
  try {
    const res = await fetch('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(file)
    });
    if (res.ok) {
      serverSaved = true;
    }
  } catch (err) {
    console.warn('Server sync error:', err);
  }

  // 2. Also save to Firebase Firestore in background
  saveFileToFirestore(file).catch(() => {});

  return serverSaved;
}

// Fetch files from server
export async function fetchServerFilesList(): Promise<StoredFile[]> {
  try {
    const res = await fetch('/api/files');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.warn('Error fetching server files:', err);
  }
  return [];
}

// Fetch complete file including binary fileData
export async function fetchServerFileContent(fileId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/files/${fileId}`);
    if (res.ok) {
      const data = await res.json();
      return data.fileData || null;
    }
  } catch (err) {
    console.warn(`Error fetching content for ${fileId}:`, err);
  }
  return null;
}

// Batch sync local files to server
export async function batchSyncToServer(files: StoredFile[]): Promise<number> {
  if (files.length === 0) return 0;
  try {
    const res = await fetch('/api/files/batch-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files })
    });
    if (res.ok) {
      const data = await res.json();
      return data.count || 0;
    }
  } catch (err) {
    console.warn('Batch sync to server error:', err);
  }
  return 0;
}

// Delete file from both server and Firebase
export async function deleteFileFromCloudStorage(fileId: string): Promise<void> {
  try {
    await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
  } catch {}
  deleteFileFromFirestore(fileId).catch(() => {});
}

// Subscribe to real-time events across all machines
export function subscribeToRealtimeCloudEvents(onEvent: () => void): () => void {
  let eventSource: EventSource | null = null;
  let intervalId: any = null;

  try {
    eventSource = new EventSource('/api/files-events');
    eventSource.onmessage = () => {
      onEvent();
    };
    eventSource.onerror = () => {
      // Reconnect automatically handled by browser
    };
  } catch {}

  // Fallback heartbeat polling every 4 seconds to guarantee all machines stay in sync
  intervalId = setInterval(() => {
    onEvent();
  }, 4000);

  return () => {
    if (eventSource) {
      eventSource.close();
    }
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}
