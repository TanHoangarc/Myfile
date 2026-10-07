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
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import type { StoredFile } from './types/index.ts';

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

export async function logOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// Firestore File Collection operations
const FILES_COLLECTION = 'files';

export async function saveFileToFirestore(file: StoredFile): Promise<void> {
  const docRef = doc(db, FILES_COLLECTION, file.id);
  try {
    // Sanitize payload to avoid undefined values
    const payload: Record<string, any> = {
      id: file.id,
      name: file.name,
      originalName: file.originalName,
      size: file.size,
      type: file.type,
      category: file.category || 'other',
      createdAt: file.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shareCount: file.shareCount || 0
    };

    if (file.fileData) payload.fileData = file.fileData;
    if (file.validFrom) payload.validFrom = file.validFrom;
    if (file.expiresAt) payload.expiresAt = file.expiresAt;
    if (file.notes) payload.notes = file.notes;
    if (file.tags && file.tags.length > 0) payload.tags = file.tags;
    if (file.uploader) payload.uploader = file.uploader;
    if (file.uploaderEmail) payload.uploaderEmail = file.uploaderEmail;

    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${FILES_COLLECTION}/${file.id}`);
  }
}

export async function updateFileInFirestore(fileId: string, updates: Partial<StoredFile>): Promise<void> {
  const docRef = doc(db, FILES_COLLECTION, fileId);
  try {
    const payload: Record<string, any> = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${FILES_COLLECTION}/${fileId}`);
  }
}

export async function deleteFileFromFirestore(fileId: string): Promise<void> {
  const docRef = doc(db, FILES_COLLECTION, fileId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
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
      console.warn('Files snapshot error (may require authentication):', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, FILES_COLLECTION);
    }
  );
}
