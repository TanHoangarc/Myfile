import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  signInAnonymously,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import type { StoredFile } from './types/index.ts';
import { createImageThumbnail } from './utils/fileHelpers.ts';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

// Test Connection as mandated by Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client offline warning:", error.message);
    }
  }
}
testConnection();

// Required Error Handling format
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Quota Management: Avoid bombarding backend when free daily write quota is reached
const QUOTA_KEY = 'firestore_quota_exhausted_until';

export function isFirestoreQuotaExhausted(): boolean {
  try {
    const val = localStorage.getItem(QUOTA_KEY);
    if (!val) return false;
    const expires = parseInt(val, 10);
    if (Date.now() < expires) {
      return true;
    }
    localStorage.removeItem(QUOTA_KEY);
    return false;
  } catch {
    return false;
  }
}

export function markFirestoreQuotaExhausted(): void {
  try {
    // Suppress repeated failed writes for 3 hours to avoid backoff loop and console overload
    localStorage.setItem(QUOTA_KEY, String(Date.now() + 3 * 60 * 60 * 1000));
  } catch {}
}

export function isQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : err?.message || err?.code || '';
  return (
    err?.code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Free daily write units')
  );
}

// Authentication helpers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('Google Sign In Error:', err);
    throw err;
  }
}

export async function ensureAuth(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    return null;
  }
}

export async function logOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// Firestore File Collection operations
const FILES_COLLECTION = 'files';

export async function saveFileToFirestore(file: StoredFile): Promise<void> {
  // If quota is exhausted, skip remote write to avoid repetitive backoff errors
  if (isFirestoreQuotaExhausted()) {
    console.info('Firestore daily write quota reached; file safely stored in local IndexedDB.');
    return;
  }

  const docRef = doc(db, FILES_COLLECTION, file.id);
  try {
    const fileDataStr = file.fileData || '';

    // Sanitize payload
    const payload: Record<string, any> = {
      id: file.id,
      name: file.name,
      originalName: file.originalName,
      size: file.size,
      type: file.type,
      category: file.category || 'other',
      createdAt: file.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shareCount: file.shareCount || 0,
      hasChunks: false
    };

    if (file.validFrom) payload.validFrom = file.validFrom;
    if (file.expiresAt) payload.expiresAt = file.expiresAt;
    if (file.notes) payload.notes = file.notes;
    if (file.tags && file.tags.length > 0) payload.tags = file.tags;
    if (file.uploader) payload.uploader = file.uploader;
    if (file.uploaderEmail) payload.uploaderEmail = file.uploaderEmail;

    // Fast & Safe file storage strategy:
    // 1. If small dataURL (<= 350KB), save directly into the Firestore doc (1 single atomic write)
    // 2. If it's an image > 350KB, compress to a lightweight web thumbnail so cloud sync is fast and quota-safe
    // 3. For large non-images, store metadata in Firestore while full data lives securely in local IndexedDB
    if (fileDataStr) {
      if (fileDataStr.length <= 350000) {
        payload.fileData = fileDataStr;
      } else if (file.type.startsWith('image/') || fileDataStr.startsWith('data:image/')) {
        try {
          const thumb = await createImageThumbnail(fileDataStr, 800, 0.7);
          if (thumb && thumb.length <= 350000) {
            payload.fileData = thumb;
          }
        } catch {}
      }
    }

    // Set doc with 4s timeout to guarantee zero UI hanging even on bad networks or quota rate limits
    const savePromise = setDoc(docRef, payload);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore save timed out')), 4000)
    );

    await Promise.race([savePromise, timeoutPromise]);
  } catch (error: any) {
    if (isQuotaError(error)) {
      markFirestoreQuotaExhausted();
      console.warn('Firestore quota reached. Document is securely saved locally in IndexedDB.', error);
      return;
    }
    console.warn('Firestore save non-fatal note:', error);
  }
}

export async function fetchFileContentFromFirestore(fileId: string): Promise<string | null> {
  const docRef = doc(db, FILES_COLLECTION, fileId);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();

    // 1. If stored directly in fileData
    if (data.fileData) {
      return data.fileData as string;
    }

    // 2. If stored in chunks subcollection
    if (data.hasChunks && data.chunkCount) {
      const chunksCol = collection(db, FILES_COLLECTION, fileId, 'chunks');
      const q = query(chunksCol, orderBy('chunkIndex', 'asc'));
      const chunkSnaps = await getDocs(q);
      let combined = '';
      chunkSnaps.forEach((cdoc) => {
        const cdata = cdoc.data();
        if (cdata.data) {
          combined += cdata.data;
        }
      });
      return combined || null;
    }

    return null;
  } catch (error) {
    console.warn(`Could not fetch content from Firestore for ${fileId}:`, error);
    return null;
  }
}

export async function updateFileInFirestore(fileId: string, updates: Partial<StoredFile>): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  const docRef = doc(db, FILES_COLLECTION, fileId);
  try {
    const payload: Record<string, any> = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await updateDoc(docRef, payload);
  } catch (error: any) {
    if (isQuotaError(error)) {
      markFirestoreQuotaExhausted();
      console.warn('Firestore quota reached during update. Changes saved locally in IndexedDB.');
      return;
    }
    handleFirestoreError(error, OperationType.UPDATE, `${FILES_COLLECTION}/${fileId}`);
  }
}

export async function deleteFileFromFirestore(fileId: string): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  const docRef = doc(db, FILES_COLLECTION, fileId);
  try {
    // Delete any subcollection chunks first
    try {
      const chunksCol = collection(db, FILES_COLLECTION, fileId, 'chunks');
      const chunkSnaps = await getDocs(chunksCol);
      for (const cdoc of chunkSnaps.docs) {
        await deleteDoc(cdoc.ref);
      }
    } catch {}

    await deleteDoc(docRef);
  } catch (error: any) {
    if (isQuotaError(error)) {
      markFirestoreQuotaExhausted();
      console.warn('Firestore quota reached during delete. Item removed locally in IndexedDB.');
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `${FILES_COLLECTION}/${fileId}`);
  }
}

export async function getFileFromFirestore(fileId: string): Promise<StoredFile | null> {
  const docRef = doc(db, FILES_COLLECTION, fileId);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as StoredFile;
    }
    return null;
  } catch (error) {
    if (isQuotaError(error)) {
      markFirestoreQuotaExhausted();
      return null;
    }
    handleFirestoreError(error, OperationType.GET, `${FILES_COLLECTION}/${fileId}`);
  }
}

export function subscribeToFiles(
  onUpdate: (files: StoredFile[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, FILES_COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: StoredFile[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as StoredFile);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Files snapshot error:', error);
      if (isQuotaError(error)) {
        markFirestoreQuotaExhausted();
      }
      if (onError) onError(error);
      if (!isQuotaError(error)) {
        handleFirestoreError(error, OperationType.LIST, FILES_COLLECTION);
      }
    }
  );
}
