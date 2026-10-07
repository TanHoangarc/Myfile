import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Share2, 
  Bell, 
  FolderLock, 
  FileText,
  Eye,
  List
} from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { 
  auth, 
  signInWithGoogle, 
  logOut, 
  ensureAuth,
  saveFileToFirestore, 
  updateFileInFirestore, 
  deleteFileFromFirestore, 
  getFileFromFirestore, 
  subscribeToFiles 
} from './firebase.ts';
import type { StoredFile } from './types/index.ts';
import { 
  calculateExpirationInfo, 
  downloadFile 
} from './utils/fileHelpers.ts';
import { 
  storeFileContent, 
  retrieveFileContent, 
  removeFileContent 
} from './utils/fileStorage.ts';
import { 
  playAlertSound, 
  requestBrowserNotificationPermission, 
  sendBrowserNotification, 
  checkAndNotifyExpiringFiles 
} from './utils/notificationService.ts';
import { Navbar } from './components/Navbar.tsx';
import { FileList } from './components/FileList.tsx';
import { FileViewerPanel } from './components/FileViewerPanel.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { ZaloShareModal } from './components/ZaloShareModal.tsx';
import { ExtendExpiryModal } from './components/ExtendExpiryModal.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';

const SETTINGS_KEY = 'myfile_settings_v1';

const SAMPLE_FILE_IDS = [
  'doc-hop-dong-2026',
  'doc-chung-chi-iso',
  'doc-hoa-don-vat',
  'doc-cccd-giam-doc',
  'doc-quy-che-noi-bo'
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'list' | 'preview'>('list');
  
  // Settings & Filter State
  const [warningDaysThreshold, setWarningDaysThreshold] = useState<number>(7);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [isBrowserNotificationGranted, setIsBrowserNotificationGranted] = useState<boolean>(false);
  const [currentStatusFilter, setCurrentStatusFilter] = useState<string>('all');
  
  // Modals & Drawers
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [zaloShareFile, setZaloShareFile] = useState<StoredFile | null>(null);
  const [isZaloShareOpen, setIsZaloShareOpen] = useState(false);
  const [extendFile, setExtendFile] = useState<StoredFile | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // 1. Load initial settings and purge obsolete bloated localStorage keys to eliminate quota errors
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.threshold) setWarningDaysThreshold(parsed.threshold);
        if (parsed.sound !== undefined) setIsSoundEnabled(parsed.sound);
      }
    } catch {}

    if ('Notification' in window) {
      setIsBrowserNotificationGranted(Notification.permission === 'granted');
    }

    // Critical: Clean up any old localStorage file keys that caused quota errors
    try {
      localStorage.removeItem('docuvault_local_files_v1');
      localStorage.removeItem('docuvault_files_v1');
      localStorage.removeItem('docuvault_files');
    } catch {}

    // Clean up sample files from Firestore
    SAMPLE_FILE_IDS.forEach((id) => {
      deleteFileFromFirestore(id).catch(() => {});
    });
  }, []);

  // 2. Auth State Listener
  useEffect(() => {
    ensureAuth().catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 3. Real-time Firebase Sync: Active for all users with IndexedDB cache fallback
  useEffect(() => {
    const unsubscribeFirestore = subscribeToFiles(
      async (remoteFiles) => {
        const userFiles = remoteFiles.filter((f) => !SAMPLE_FILE_IDS.includes(f.id));
        
        // Enrich files with local IndexedDB content if fileData is not in remote doc
        const enriched = await Promise.all(
          userFiles.map(async (remote) => {
            if (remote.fileData) {
              storeFileContent(remote.id, remote.fileData).catch(() => {});
              return remote;
            }
            const localData = await retrieveFileContent(remote.id);
            return localData ? { ...remote, fileData: localData } : remote;
          })
        );

        setFiles(enriched);
      },
      (err) => {
        console.warn('Firestore subscription fallback:', err);
      }
    );

    return () => {
      unsubscribeFirestore();
    };
  }, []);

  // Automatically select first file when files load or if selected file was deleted
  useEffect(() => {
    if (files.length > 0) {
      if (!selectedFileId || !files.some((f) => f.id === selectedFileId)) {
        setSelectedFileId(files[0].id);
      }
    } else {
      setSelectedFileId(null);
    }
  }, [files, selectedFileId]);

  // Selected file object
  const activeFile = useMemo(() => {
    return files.find((f) => f.id === selectedFileId) || (files.length > 0 ? files[0] : null);
  }, [files, selectedFileId]);

  // 4. Handle direct Zalo / URL share links (?fileId=... or ?filter=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetFileId = params.get('fileId');
    const targetFilter = params.get('filter');

    if (targetFilter) {
      setCurrentStatusFilter(targetFilter);
    }

    if (targetFileId) {
      const existing = files.find((f) => f.id === targetFileId);
      if (existing) {
        setSelectedFileId(existing.id);
        setMobileTab('preview');
      } else {
        getFileFromFirestore(targetFileId)
          .then((remoteDoc) => {
            if (remoteDoc) {
              setFiles((prev) => [remoteDoc, ...prev.filter((p) => p.id !== remoteDoc.id)]);
              setSelectedFileId(remoteDoc.id);
              setMobileTab('preview');
            }
          })
          .catch((e) => console.warn('Could not fetch shared file by ID:', e));
      }
    }
  }, [files]);

  // 5. Automated Expiration Check & Alerting System
  useEffect(() => {
    if (files.length === 0 || initialCheckDone) return;

    const { expiringSoon, expired } = checkAndNotifyExpiringFiles(files, warningDaysThreshold);
    
    if (expiringSoon.length > 0 || expired.length > 0) {
      if (isSoundEnabled) {
        playAlertSound('warning');
      }

      if (isBrowserNotificationGranted) {
        sendBrowserNotification(
          `Cảnh báo MyFile: Có ${expiringSoon.length + expired.length} tệp cần chú ý!`,
          `Có ${expiringSoon.length} tệp sắp hết hạn trong ${warningDaysThreshold} ngày và ${expired.length} tệp đã quá hạn.`
        );
      }
    }

    setInitialCheckDone(true);
  }, [files, warningDaysThreshold, isSoundEnabled, isBrowserNotificationGranted, initialCheckDone]);

  // Calculations
  const stats = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;
    let totalSize = 0;

    files.forEach((f) => {
      totalSize += f.size || 0;
      const info = calculateExpirationInfo(f.expiresAt, warningDaysThreshold);
      if (info.status === 'active' || info.status === 'permanent') active++;
      else if (info.status === 'expiring_soon') expiring++;
      else if (info.status === 'expired') expired++;
    });

    return { active, expiring, expired, totalSize };
  }, [files, warningDaysThreshold]);

  // Handlers
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      playAlertSound('success');
    } catch (err) {
      console.error('Sign-in failed:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSaveFile = async (newFile: StoredFile) => {
    // 1. Immediately update local UI state so preview and list are responsive
    setFiles((prev) => [newFile, ...prev.filter((f) => f.id !== newFile.id)]);
    setSelectedFileId(newFile.id);
    setMobileTab('preview');

    // 2. Persist full binary content in IndexedDB & fast memory cache
    if (newFile.fileData) {
      await storeFileContent(newFile.id, newFile.fileData);
    }

    // 3. Save to Firebase Firestore (supports auto chunking for large files)
    try {
      await saveFileToFirestore(newFile);
    } catch (err) {
      console.warn('Firebase save warning:', err);
    }
  };

  const handleUpdateExpiry = async (fileId: string, newExpiresAt?: string) => {
    const updated = files.map((f) =>
      f.id === fileId ? { ...f, expiresAt: newExpiresAt, updatedAt: new Date().toISOString() } : f
    );
    setFiles(updated);

    try {
      await updateFileInFirestore(fileId, {
        expiresAt: newExpiresAt,
        updatedAt: new Date().toISOString()
      });
      playAlertSound('success');
    } catch (err) {
      console.warn('Firestore update error:', err);
    }
  };

  const handleDeleteFile = async (file: StoredFile) => {
    const updated = files.filter((f) => f.id !== file.id);
    setFiles(updated);

    // Remove from IndexedDB
    await removeFileContent(file.id);

    if (selectedFileId === file.id) {
      setSelectedFileId(updated.length > 0 ? updated[0].id : null);
    }

    try {
      await deleteFileFromFirestore(file.id);
    } catch (err) {
      console.warn('Firestore delete error:', err);
    }
  };

  const handleBatchDelete = async (fileIds: string[]) => {
    const updated = files.filter((f) => !fileIds.includes(f.id));
    setFiles(updated);

    if (selectedFileId && fileIds.includes(selectedFileId)) {
      setSelectedFileId(updated.length > 0 ? updated[0].id : null);
    }

    for (const id of fileIds) {
      try {
        await removeFileContent(id);
        await deleteFileFromFirestore(id);
      } catch (e) {}
    }
  };

  const handleDownloadFile = async (file: StoredFile) => {
    let toDownload = file;
    if (!toDownload.fileData) {
      const cached = await retrieveFileContent(file.id);
      if (cached) {
        toDownload = { ...file, fileData: cached };
      }
    }
    downloadFile(toDownload);
  };

  const handleBatchDownload = async (selectedFiles: StoredFile[]) => {
    selectedFiles.forEach((file, index) => {
      setTimeout(async () => {
        let toDown = file;
        if (!toDown.fileData) {
          const cached = await retrieveFileContent(file.id);
          if (cached) toDown = { ...file, fileData: cached };
        }
        downloadFile(toDown);
      }, index * 300);
    });
  };

  const handleZaloShared = async (fileId?: string) => {
    if (!fileId) return;
    const target = files.find((f) => f.id === fileId);
    if (!target) return;

    const newCount = (target.shareCount || 0) + 1;
    const updated = files.map((f) => (f.id === fileId ? { ...f, shareCount: newCount } : f));
    setFiles(updated);

    try {
      await updateFileInFirestore(fileId, { shareCount: newCount });
    } catch (e) {}
  };

  const handleSelectFile = (file: StoredFile) => {
    setSelectedFileId(file.id);
    setMobileTab('preview');
  };

  const handleRequestBrowserNotification = async () => {
    const granted = await requestBrowserNotificationPermission();
    setIsBrowserNotificationGranted(granted);
    if (granted) {
      playAlertSound('success');
      sendBrowserNotification('MyFile', 'Thông báo đã được bật thành công!');
    }
  };

  const handleChangeWarningThreshold = (days: number) => {
    setWarningDaysThreshold(days);
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ threshold: days, sound: isSoundEnabled })
      );
    } catch {}
  };

  const handleToggleSound = () => {
    const next = !isSoundEnabled;
    setIsSoundEnabled(next);
    if (next) playAlertSound('success');
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ threshold: warningDaysThreshold, sound: next })
      );
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenZaloShareAll={() => {
          setZaloShareFile(null);
          setIsZaloShareOpen(true);
        }}
        expiringCount={stats.expiring}
        expiredCount={stats.expired}
        onToggleNotificationDrawer={() => setIsNotificationDrawerOpen(!isNotificationDrawerOpen)}
        isNotificationDrawerOpen={isNotificationDrawerOpen}
        totalFiles={files.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1540px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-5 flex flex-col gap-4">
        
        {/* Header Title */}
        <div className="pb-1 border-b border-slate-200/80">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản lý Tài Liệu
          </h1>
        </div>

        {/* Mobile View Switcher (Visible only on small screens < lg) */}
        <div className="lg:hidden flex items-center bg-slate-200/80 p-1 rounded-xl">
          <button
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'list'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Danh sách tệp ({files.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'preview'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Xem tệp {activeFile ? `(${activeFile.name.slice(0, 15)}...)` : ''}</span>
          </button>
        </div>

        {/* TWO-COLUMN WORKSPACE: LEFT = File List, RIGHT = File Viewer */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT COLUMN: File Names & List Panel */}
          <div className={`lg:col-span-5 xl:col-span-4 ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
            <FileList
              files={files}
              selectedFileId={selectedFileId}
              onSelectFile={handleSelectFile}
              warningDaysThreshold={warningDaysThreshold}
              currentStatusFilter={currentStatusFilter}
              onFilterChange={setCurrentStatusFilter}
              onDownloadFile={handleDownloadFile}
              onDeleteFile={handleDeleteFile}
              onOpenZaloShare={(file) => {
                setZaloShareFile(file);
                setIsZaloShareOpen(true);
              }}
              onExtendValidity={(file) => setExtendFile(file)}
              onBatchDelete={handleBatchDelete}
              onBatchDownload={handleBatchDownload}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          </div>

          {/* RIGHT COLUMN: Live File Viewer & Expiry Details */}
          <div className={`lg:col-span-7 xl:col-span-8 ${mobileTab === 'list' ? 'hidden lg:block' : 'block'}`}>
            <FileViewerPanel
              file={activeFile}
              warningDaysThreshold={warningDaysThreshold}
              onOpenZaloShare={(file) => {
                setZaloShareFile(file);
                setIsZaloShareOpen(true);
              }}
              onExtendValidity={(file) => setExtendFile(file)}
              onDeleteFile={handleDeleteFile}
              onBackToList={() => setMobileTab('list')}
              onFileDataLoaded={(fileId, dataUrl) => {
                setFiles((prev) =>
                  prev.map((f) => (f.id === fileId ? { ...f, fileData: dataUrl } : f))
                );
              }}
            />
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5">
        <div className="max-w-[1540px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
              M
            </div>
            <span className="font-semibold text-slate-700">MyFile</span>
            <span>• Quản lý danh sách tệp & Xem trước tài liệu Firebase</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setZaloShareFile(activeFile);
                setIsZaloShareOpen(true);
              }}
              className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
            >
              <Share2 className="w-3.5 h-3.5" />
              Chia sẻ qua Zalo
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">
              Đồng bộ dữ liệu Firebase Cloud
            </span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      
      {/* 1. Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSaveFile={handleSaveFile}
        currentUser={currentUser}
      />

      {/* 2. Zalo Share Modal */}
      <ZaloShareModal
        isOpen={isZaloShareOpen}
        onClose={() => setIsZaloShareOpen(false)}
        file={zaloShareFile}
        onShared={handleZaloShared}
      />

      {/* 3. Extend Validity Modal */}
      <ExtendExpiryModal
        file={extendFile}
        onClose={() => setExtendFile(null)}
        onConfirmExtend={handleUpdateExpiry}
      />

      {/* 4. Notification & Alert Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        files={files}
        warningDaysThreshold={warningDaysThreshold}
        onChangeWarningThreshold={handleChangeWarningThreshold}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={handleToggleSound}
        isBrowserNotificationGranted={isBrowserNotificationGranted}
        onRequestBrowserNotification={handleRequestBrowserNotification}
        onPreviewFile={(file) => handleSelectFile(file)}
        onOpenZaloShare={(file) => {
          setZaloShareFile(file);
          setIsZaloShareOpen(true);
        }}
        onExtendValidity={(file) => setExtendFile(file)}
      />

    </div>
  );
}
