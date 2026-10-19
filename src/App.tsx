import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Share2, 
  Bell, 
  FolderLock, 
  FileText,
  Eye,
  List,
  FolderTree as FolderTreeIcon,
  FolderOpen,
  Sparkles,
  Layers,
  Folder
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
  subscribeToFiles,
  fetchFileContentFromFirestore 
} from './firebase.ts';
import type { StoredFile, FileCategory } from './types/index.ts';
import { 
  calculateExpirationInfo, 
  downloadFile,
  getSampleFiles 
} from './utils/fileHelpers.ts';
import { MAIN_FOLDERS, normalizeCategory, getFolderDefinition } from './utils/folderConstants.ts';
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
import { FolderTree } from './components/FolderTree.tsx';
import { FileViewerPanel } from './components/FileViewerPanel.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { MoveFolderModal } from './components/MoveFolderModal.tsx';
import { RenameSubfolderModal } from './components/RenameSubfolderModal.tsx';
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
  const [mobileTab, setMobileTab] = useState<'tree' | 'list' | 'preview'>('tree');
  
  // Folder Tree & Category Filtering State
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | 'all'>('all');
  const [selectedSubfolder, setSelectedSubfolder] = useState<string | null>(null);
  const [isTreeVisible, setIsTreeVisible] = useState<boolean>(true);
  const [uploadTargetCategory, setUploadTargetCategory] = useState<FileCategory>('contract');
  const [uploadTargetSubfolder, setUploadTargetSubfolder] = useState<string>('');
  
  // Settings & Filter State
  const [warningDaysThreshold, setWarningDaysThreshold] = useState<number>(7);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [isBrowserNotificationGranted, setIsBrowserNotificationGranted] = useState<boolean>(false);
  const [currentStatusFilter, setCurrentStatusFilter] = useState<string>('all');
  
  // Modals & Drawers
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<StoredFile | null>(null);
  const [subfolderToRename, setSubfolderToRename] = useState<{ category: FileCategory; subfolder: string } | null>(null);
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
      let cached = await retrieveFileContent(file.id);
      if (!cached) {
        try {
          cached = await fetchFileContentFromFirestore(file.id);
          if (cached) {
            await storeFileContent(file.id, cached);
          }
        } catch (err) {
          console.warn('Error fetching file content from Firestore for download:', err);
        }
      }
      if (cached) {
        toDownload = { ...file, fileData: cached };
      }
    }
    downloadFile(toDownload);
    playAlertSound('success');
  };

  const handleBatchDownload = async (selectedFiles: StoredFile[]) => {
    selectedFiles.forEach((file, index) => {
      setTimeout(async () => {
        let toDown = file;
        if (!toDown.fileData) {
          let cached = await retrieveFileContent(file.id);
          if (!cached) {
            try {
              cached = await fetchFileContentFromFirestore(file.id);
              if (cached) await storeFileContent(file.id, cached);
            } catch (err) {}
          }
          if (cached) toDown = { ...file, fileData: cached };
        }
        downloadFile(toDown);
      }, index * 350);
    });
    playAlertSound('success');
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

  const handleSelectFolder = (category: FileCategory | 'all', subfolder?: string | null) => {
    setSelectedCategory(category);
    setSelectedSubfolder(subfolder || null);
    if (window.innerWidth < 1024) {
      setMobileTab('list');
    }
  };

  const handleMoveFile = async (fileId: string, targetCategory: FileCategory, targetSubfolder?: string) => {
    const updated = files.map((f) =>
      f.id === fileId 
        ? { ...f, category: targetCategory, subfolder: targetSubfolder, updatedAt: new Date().toISOString() } 
        : f
    );
    setFiles(updated);

    try {
      await updateFileInFirestore(fileId, {
        category: targetCategory,
        subfolder: targetSubfolder || '',
        updatedAt: new Date().toISOString()
      });
      playAlertSound('success');
    } catch (err) {
      console.warn('Firestore move folder error:', err);
    }
  };

  const handleOpenUploadWithFolder = (category: FileCategory, subfolder?: string) => {
    setUploadTargetCategory(category);
    setUploadTargetSubfolder(subfolder || '');
    setIsUploadOpen(true);
  };

  const handleLoadSampleFiles = async () => {
    const samples = getSampleFiles();
    for (const sample of samples) {
      await handleSaveFile(sample);
    }
    playAlertSound('success');
  };

  const handleRenameSubfolder = async (category: FileCategory, oldSubfolder: string, newSubfolder: string) => {
    if (!newSubfolder.trim() || oldSubfolder.trim() === newSubfolder.trim()) return;
    const cleanNew = newSubfolder.trim();
    const cleanOld = oldSubfolder.trim();

    // 1. Update all files having this category and subfolder
    const filesToUpdate = files.filter(
      (f) => normalizeCategory(f.category) === category && f.subfolder?.trim() === cleanOld
    );

    if (filesToUpdate.length > 0) {
      const updated = files.map((f) => {
        if (normalizeCategory(f.category) === category && f.subfolder?.trim() === cleanOld) {
          return { ...f, subfolder: cleanNew, updatedAt: new Date().toISOString() };
        }
        return f;
      });
      setFiles(updated);

      for (const f of filesToUpdate) {
        try {
          await updateFileInFirestore(f.id, {
            subfolder: cleanNew,
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Update file subfolder error:', err);
        }
      }
    }

    // 2. If this subfolder is currently selected, update selection state
    if (selectedCategory === category && selectedSubfolder === oldSubfolder) {
      setSelectedSubfolder(cleanNew);
    }

    // 3. Update localStorage custom subfolder list
    try {
      const raw = localStorage.getItem('docuvault_custom_subfolders_v1');
      const custom = raw ? JSON.parse(raw) : {};
      const list: string[] = custom[category] || [];
      const updatedList = list.map((item) => (item === cleanOld ? cleanNew : item));
      if (!updatedList.includes(cleanNew)) updatedList.push(cleanNew);
      custom[category] = updatedList;
      localStorage.setItem('docuvault_custom_subfolders_v1', JSON.stringify(custom));
    } catch {}

    playAlertSound('success');
  };

  const handleDeleteSubfolder = async (category: FileCategory, subfolder: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa thư mục con "${subfolder}"? Các tệp bên trong sẽ được giữ lại trong thư mục chính.`)) {
      return;
    }

    const cleanSub = subfolder.trim();
    const filesToUpdate = files.filter(
      (f) => normalizeCategory(f.category) === category && f.subfolder?.trim() === cleanSub
    );

    if (filesToUpdate.length > 0) {
      const updated = files.map((f) => {
        if (normalizeCategory(f.category) === category && f.subfolder?.trim() === cleanSub) {
          return { ...f, subfolder: undefined, updatedAt: new Date().toISOString() };
        }
        return f;
      });
      setFiles(updated);

      for (const f of filesToUpdate) {
        try {
          await updateFileInFirestore(f.id, {
            subfolder: '',
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Clear file subfolder error:', err);
        }
      }
    }

    if (selectedCategory === category && selectedSubfolder === subfolder) {
      setSelectedSubfolder(null);
    }

    playAlertSound('success');
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

  // Active folder definition
  const activeFolderDef = selectedCategory !== 'all' 
    ? getFolderDefinition(selectedCategory) 
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenUpload={() => handleOpenUploadWithFolder(selectedCategory !== 'all' ? selectedCategory : 'contract')}
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
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-5 flex flex-col gap-4">
        
        {/* Header Title & Explorer View Controls */}
        <div className="pb-2 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Quản lý Tài Liệu
            </h1>
            {activeFolderDef && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${activeFolderDef.badgeBg} ${activeFolderDef.badgeText} ${activeFolderDef.badgeBorder}`}>
                <span>📁 {activeFolderDef.number}. {activeFolderDef.name}</span>
                {selectedSubfolder && <span>/ {selectedSubfolder}</span>}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Folder Tree Visibility on Desktop */}
            <button
              onClick={() => setIsTreeVisible(!isTreeVisible)}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isTreeVisible
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Ẩn / Hiện thanh Cây thư mục"
            >
              <FolderTreeIcon className="w-3.5 h-3.5" />
              <span>{isTreeVisible ? 'Đang hiện cây thư mục' : 'Hiện cây thư mục'}</span>
            </button>

            {/* Quick Demo Sample Loader */}
            {files.length === 0 && (
              <button
                onClick={handleLoadSampleFiles}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all shadow-2xs"
                title="Tạo nhanh 5 tài liệu mẫu vào 5 thư mục"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nạp mẫu 5 thư mục</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile View Switcher (Visible only on small screens < lg: 3 Tabs) */}
        <div className="lg:hidden flex items-center bg-slate-200/80 p-1 rounded-xl">
          <button
            onClick={() => setMobileTab('tree')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'tree'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTreeIcon className="w-4 h-4" />
            <span>Cây thư mục</span>
          </button>
          <button
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'list'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Danh sách ({files.length})</span>
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
            <span>Xem tệp</span>
          </button>
        </div>

        {/* WORKSPACE LAYOUT:
            - Column 1: Folder Tree (5 main folders & nested files)
            - Column 2: File List (Filtered list with search & batch actions)
            - Column 3: Live File Viewer (Full preview & detail)
        */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-5 items-stretch">
          
          {/* COLUMN 1: Directory Tree Panel (5 Main Folders) */}
          {isTreeVisible && (
            <div className={`lg:col-span-3 xl:col-span-2 h-full flex flex-col ${mobileTab === 'tree' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full min-h-[700px] lg:min-h-[1200px]">
                <FolderTree
                  files={files}
                  selectedCategory={selectedCategory}
                  selectedSubfolder={selectedSubfolder}
                  selectedFileId={selectedFileId}
                  warningDaysThreshold={warningDaysThreshold}
                  onSelectFolder={handleSelectFolder}
                  onSelectFile={handleSelectFile}
                  onMoveFile={handleMoveFile}
                  onOpenUploadWithFolder={handleOpenUploadWithFolder}
                  onLoadSampleFiles={handleLoadSampleFiles}
                  onRenameSubfolder={handleRenameSubfolder}
                  onRequestRenameSubfolder={(category, subfolder) => setSubfolderToRename({ category, subfolder })}
                  onDeleteSubfolder={handleDeleteSubfolder}
                />
              </div>
            </div>
          )}

          {/* COLUMN 2: File Names & List Panel */}
          <div className={`${isTreeVisible ? 'lg:col-span-4 xl:col-span-4' : 'lg:col-span-4 xl:col-span-4'} h-full flex flex-col ${mobileTab === 'list' ? 'flex' : 'hidden lg:flex'}`}>
            <FileList
              files={files}
              selectedFileId={selectedFileId}
              onSelectFile={handleSelectFile}
              warningDaysThreshold={warningDaysThreshold}
              currentStatusFilter={currentStatusFilter}
              onFilterChange={setCurrentStatusFilter}
              selectedCategory={selectedCategory}
              selectedSubfolder={selectedSubfolder}
              onSelectFolder={handleSelectFolder}
              onDownloadFile={handleDownloadFile}
              onDeleteFile={handleDeleteFile}
              onOpenZaloShare={(file) => {
                setZaloShareFile(file);
                setIsZaloShareOpen(true);
              }}
              onExtendValidity={(file) => setExtendFile(file)}
              onBatchDelete={handleBatchDelete}
              onBatchDownload={handleBatchDownload}
              onOpenUpload={() => handleOpenUploadWithFolder(selectedCategory !== 'all' ? selectedCategory : 'contract')}
              onMoveFile={handleMoveFile}
              onOpenMoveFolder={(file) => setFileToMove(file)}
              onRequestRenameSubfolder={(category, subfolder) => setSubfolderToRename({ category, subfolder })}
              onSwitchToTreeMobile={() => setMobileTab('tree')}
            />
          </div>

          {/* COLUMN 3: Live File Viewer & Expiry Details */}
          <div className={`${isTreeVisible ? 'lg:col-span-5 xl:col-span-6' : 'lg:col-span-8 xl:col-span-8'} h-full flex flex-col ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
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
              onUpdateCategory={(fileId, cat) => handleMoveFile(fileId, cat)}
              onOpenMoveFolder={(file) => setFileToMove(file)}
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
            <span>• Quản lý 5 nhóm tài liệu thư mục & Xem trước tài liệu Firebase</span>
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
        initialCategory={uploadTargetCategory}
        initialSubfolder={uploadTargetSubfolder}
      />

      {/* 2. Move Folder & Subfolder Modal */}
      <MoveFolderModal
        isOpen={!!fileToMove}
        onClose={() => setFileToMove(null)}
        file={fileToMove}
        files={files}
        onConfirmMove={handleMoveFile}
      />

      {/* 2b. Rename Subfolder Modal */}
      <RenameSubfolderModal
        isOpen={!!subfolderToRename}
        onClose={() => setSubfolderToRename(null)}
        category={subfolderToRename?.category || 'contract'}
        currentSubfolder={subfolderToRename?.subfolder || ''}
        onConfirmRename={handleRenameSubfolder}
      />

      {/* 3. Zalo Share Modal */}
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
