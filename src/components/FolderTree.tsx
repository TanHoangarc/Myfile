import React, { useState, useMemo, useEffect } from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  FolderPlus, 
  Plus, 
  FileText, 
  Files,
  FileSignature, 
  IdCard, 
  Receipt, 
  Archive, 
  FileSpreadsheet, 
  Image as ImageIcon,
  Check, 
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Pencil,
  Trash2,
  FolderTree as FolderTreeIcon
} from 'lucide-react';
import type { StoredFile, FileCategory } from '../types/index.ts';
import { MAIN_FOLDERS, normalizeCategory, getFolderDefinition } from '../utils/folderConstants.ts';
import { calculateExpirationInfo, formatFileSize } from '../utils/fileHelpers.ts';

interface FolderTreeProps {
  files: StoredFile[];
  selectedCategory: FileCategory | 'all';
  selectedSubfolder: string | null;
  selectedFileId: string | null;
  warningDaysThreshold: number;
  onSelectFolder: (category: FileCategory | 'all', subfolder?: string | null) => void;
  onSelectFile: (file: StoredFile) => void;
  onMoveFile?: (fileId: string, targetCategory: FileCategory, targetSubfolder?: string) => void;
  onOpenUploadWithFolder?: (category: FileCategory, subfolder?: string) => void;
  onLoadSampleFiles?: () => void;
  onRenameSubfolder?: (category: FileCategory, oldSubfolder: string, newSubfolder: string) => void;
  onDeleteSubfolder?: (category: FileCategory, subfolder: string) => void;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  files,
  selectedCategory,
  selectedSubfolder,
  selectedFileId,
  warningDaysThreshold,
  onSelectFolder,
  onSelectFile,
  onMoveFile,
  onOpenUploadWithFolder,
  onLoadSampleFiles,
  onRenameSubfolder,
  onDeleteSubfolder
}) => {
  // Track open/collapsed folders in the tree
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    template: true,
    contract: true,
    id_card: true,
    other: false,
    invoice: true
  });

  // Track expanded subfolders
  const [expandedSubfolders, setExpandedSubfolders] = useState<Record<string, boolean>>({});

  // Inline creating subfolder state
  const [addingSubfolderFor, setAddingSubfolderFor] = useState<FileCategory | null>(null);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  
  // Custom user-created or edited subfolders stored in state and localStorage
  const [customSubfolders, setCustomSubfolders] = useState<Record<string, string[]>>({});

  // Subfolder editing state
  const [editingSubfolder, setEditingSubfolder] = useState<{ category: FileCategory; oldName: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Load custom subfolders from localStorage on initial render
  useEffect(() => {
    try {
      const saved = localStorage.getItem('docuvault_custom_subfolders_v1');
      if (saved) {
        setCustomSubfolders(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Drag over target folder id
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const toggleFolder = (folderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const toggleSubfolder = (key: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedSubfolders((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    MAIN_FOLDERS.forEach((f) => {
      allExpanded[f.id] = true;
    });
    setExpandedFolders(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedFolders({});
  };

  const handleStartRename = (category: FileCategory, oldName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSubfolder({ category, oldName });
    setEditingValue(oldName);
  };

  const handleSaveRename = (category: FileCategory, oldName: string) => {
    const trimmed = editingValue.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingSubfolder(null);
      return;
    }

    // Persist new list to customSubfolders
    setCustomSubfolders((prev) => {
      const folderDef = MAIN_FOLDERS.find((f) => f.id === category);
      const currentList = prev[category] || [...(folderDef?.defaultSubfolders || [])];
      const updated = currentList.map((item) => (item === oldName ? trimmed : item));
      if (!updated.includes(trimmed)) {
        updated.push(trimmed);
      }
      const nextState = { ...prev, [category]: updated };
      try {
        localStorage.setItem('docuvault_custom_subfolders_v1', JSON.stringify(nextState));
      } catch {}
      return nextState;
    });

    onRenameSubfolder?.(category, oldName, trimmed);
    setEditingSubfolder(null);
  };

  const handleDeleteSubfolderClick = (category: FileCategory, subName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onDeleteSubfolder?.(category, subName);

    setCustomSubfolders((prev) => {
      const folderDef = MAIN_FOLDERS.find((f) => f.id === category);
      const currentList = prev[category] || [...(folderDef?.defaultSubfolders || [])];
      const updated = currentList.filter((item) => item !== subName);
      const nextState = { ...prev, [category]: updated };
      try {
        localStorage.setItem('docuvault_custom_subfolders_v1', JSON.stringify(nextState));
      } catch {}
      return nextState;
    });
  };

  // Group files by normalized category and subfolder
  const folderData = useMemo(() => {
    const result: Record<string, {
      total: number;
      expiringCount: number;
      expiredCount: number;
      files: StoredFile[];
      subfolders: Record<string, StoredFile[]>;
      rootFiles: StoredFile[];
    }> = {};

    MAIN_FOLDERS.forEach((folder) => {
      result[folder.id] = {
        total: 0,
        expiringCount: 0,
        expiredCount: 0,
        files: [],
        subfolders: {},
        rootFiles: []
      };
    });

    files.forEach((file) => {
      const cat = normalizeCategory(file.category);
      if (!result[cat]) {
        result[cat] = { total: 0, expiringCount: 0, expiredCount: 0, files: [], subfolders: {}, rootFiles: [] };
      }
      result[cat].total++;
      result[cat].files.push(file);

      const exp = calculateExpirationInfo(file.expiresAt, warningDaysThreshold);
      if (exp.status === 'expired') result[cat].expiredCount++;
      if (exp.status === 'expiring_soon') result[cat].expiringCount++;

      const sub = file.subfolder?.trim();
      if (sub) {
        if (!result[cat].subfolders[sub]) {
          result[cat].subfolders[sub] = [];
        }
        result[cat].subfolders[sub].push(file);
      } else {
        result[cat].rootFiles.push(file);
      }
    });

    return result;
  }, [files, warningDaysThreshold]);

  const handleCreateSubfolder = (catId: FileCategory) => {
    if (!newSubfolderName.trim()) {
      setAddingSubfolderFor(null);
      return;
    }
    const name = newSubfolderName.trim();
    setCustomSubfolders((prev) => ({
      ...prev,
      [catId]: Array.from(new Set([...(prev[catId] || []), name]))
    }));
    setNewSubfolderName('');
    setAddingSubfolderFor(null);
    setExpandedFolders((prev) => ({ ...prev, [catId]: true }));
    onSelectFolder(catId, name);
  };

  // Drag and Drop handlers to move files into folder
  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(targetKey);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetCat: FileCategory, targetSub?: string) => {
    e.preventDefault();
    setDragOverTarget(null);
    const fileId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/file-id');
    if (fileId && onMoveFile) {
      onMoveFile(fileId, targetCat, targetSub);
    }
  };

  // Render specific icon by folder type
  const renderFolderIcon = (type: string, isExpanded: boolean, colorClass: string) => {
    if (isExpanded) {
      return <FolderOpen className={`w-4 h-4 ${colorClass}`} />;
    }
    return <Folder className={`w-4 h-4 ${colorClass}`} />;
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800">
      
      {/* Tree Explorer Header */}
      <div className="p-3 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs">
            <FolderTreeIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Cây thư mục</h3>
            <p className="text-[11px] text-slate-500">5 nhóm tài liệu chính</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px]">
          <button
            onClick={handleExpandAll}
            className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 font-medium transition-colors"
            title="Mở rộng tất cả"
          >
            Mở hết
          </button>
          <span className="text-slate-300">•</span>
          <button
            onClick={handleCollapseAll}
            className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 font-medium transition-colors"
            title="Thu gọn tất cả"
          >
            Thu gọn
          </button>
        </div>
      </div>

      {/* Root Node: Tất cả tài liệu */}
      <div className="p-2 border-b border-slate-100 bg-white">
        <div
          onClick={() => onSelectFolder('all', null)}
          className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 shrink-0" />
            <span className="truncate">Tất cả tài liệu</span>
          </div>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
            selectedCategory === 'all'
              ? 'bg-blue-700/80 text-white'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {files.length}
          </span>
        </div>
      </div>

      {/* Tree Node List: 5 Main Folders */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {MAIN_FOLDERS.map((folder) => {
          const isSelected = selectedCategory === folder.id && !selectedSubfolder;
          const isExpanded = !!expandedFolders[folder.id];
          const data = folderData[folder.id] || { total: 0, expiringCount: 0, expiredCount: 0, files: [], subfolders: {}, rootFiles: [] };
          const isDragTarget = dragOverTarget === folder.id;

          // Combine default subfolders with custom ones and existing ones in data
          const allSubfolderKeys = Array.from(new Set([
            ...folder.defaultSubfolders,
            ...(customSubfolders[folder.id] || []),
            ...Object.keys(data.subfolders)
          ]));

          return (
            <div 
              key={folder.id} 
              className={`rounded-xl transition-all ${isDragTarget ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder.id)}
            >
              
              {/* Main Folder Row */}
              <div
                onClick={() => onSelectFolder(folder.id, null)}
                className={`group flex items-center justify-between px-2 py-2 rounded-xl cursor-pointer text-xs transition-all ${
                  isSelected
                    ? `${folder.badgeBg} ${folder.badgeText} font-bold ring-1.5 ${folder.badgeBorder} shadow-2xs`
                    : 'text-slate-700 hover:bg-slate-100/90 font-medium'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {/* Chevron Expand/Collapse Toggle */}
                  <button
                    type="button"
                    onClick={(e) => toggleFolder(folder.id, e)}
                    className="p-1 rounded hover:bg-black/5 text-slate-400 group-hover:text-slate-600 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Folder Icon */}
                  <div className="shrink-0">
                    {renderFolderIcon(folder.iconType, isExpanded, folder.folderText)}
                  </div>

                  {/* Number & Name */}
                  <div className="min-w-0 flex items-center gap-1 truncate">
                    <span className="font-mono text-[11px] opacity-70">{folder.number}.</span>
                    <span className="truncate">{folder.name}</span>
                  </div>

                  {/* Alert dot if expiring or expired inside */}
                  {data.expiredCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" title={`Có ${data.expiredCount} tệp đã hết hạn`} />
                  )}
                  {data.expiredCount === 0 && data.expiringCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title={`Có ${data.expiringCount} tệp sắp hết hạn`} />
                  )}
                </div>

                {/* Right badges & actions */}
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  
                  {/* Quick Upload into this folder button on hover */}
                  {onOpenUploadWithFolder && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenUploadWithFolder(folder.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200/80 text-slate-500 hover:text-blue-600 transition-all"
                      title={`Tải tệp trực tiếp vào ${folder.name}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Add Subfolder button on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingSubfolderFor(addingSubfolderFor === folder.id ? null : folder.id);
                      setNewSubfolderName('');
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200/80 text-slate-500 hover:text-blue-600 transition-all"
                    title="Thêm thư mục con"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>

                  {/* File Count Badge */}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center ${
                    isSelected
                      ? 'bg-white shadow-2xs text-slate-800'
                      : data.total > 0
                        ? `${folder.badgeBg} ${folder.badgeText}`
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {data.total}
                  </span>
                </div>
              </div>

              {/* Inline input to add new subfolder */}
              {addingSubfolderFor === folder.id && (
                <div className="ml-7 mr-2 my-1.5 p-2 bg-slate-50 border border-blue-200 rounded-lg animate-in fade-in flex items-center gap-1.5">
                  <FolderPlus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <input
                    type="text"
                    value={newSubfolderName}
                    onChange={(e) => setNewSubfolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSubfolder(folder.id);
                      if (e.key === 'Escape') setAddingSubfolderFor(null);
                    }}
                    placeholder="Tên thư mục con..."
                    autoFocus
                    className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateSubfolder(folder.id)}
                    className="px-2 py-1 bg-blue-600 text-white text-[11px] font-semibold rounded hover:bg-blue-700 shrink-0"
                  >
                    Thêm
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingSubfolderFor(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Expanded Children Branch: Subfolders & Direct Files */}
              {isExpanded && (
                <div className="ml-4 pl-3 border-l-2 border-slate-200 space-y-0.5 my-1">
                  
                  {/* 1. Subfolders */}
                  {allSubfolderKeys.map((subName) => {
                    const subFiles = data.subfolders[subName] || [];
                    const isSubSelected = selectedCategory === folder.id && selectedSubfolder === subName;
                    const subKey = `${folder.id}-${subName}`;
                    const isSubExpanded = !!expandedSubfolders[subKey];
                    const isEditingThis = editingSubfolder?.category === folder.id && editingSubfolder?.oldName === subName;

                    if (isEditingThis) {
                      return (
                        <div 
                          key={subName}
                          onClick={(e) => e.stopPropagation()} 
                          className="my-1 p-1.5 bg-blue-50/90 border border-blue-400 rounded-lg flex items-center gap-1.5 animate-in fade-in"
                        >
                          <Folder className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(folder.id, subName);
                              if (e.key === 'Escape') setEditingSubfolder(null);
                            }}
                            autoFocus
                            placeholder="Nhập tên mới..."
                            className="w-full text-xs px-2 py-0.5 bg-white border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(folder.id, subName)}
                            className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
                            title="Lưu tên thư mục"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSubfolder(null)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
                            title="Hủy bỏ"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={subName} className="space-y-0.5">
                        <div
                          onClick={() => onSelectFolder(folder.id, subName)}
                          onDoubleClick={(e) => handleStartRename(folder.id, subName, e)}
                          className={`group/sub flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                            isSubSelected
                              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                          title="Nhấp đúp để chỉnh sửa tên thư mục con"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {subFiles.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => toggleSubfolder(subKey, e)}
                                className="p-0.5 text-slate-400 hover:text-slate-600"
                              >
                                {isSubExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </button>
                            )}
                            <Folder className={`w-3.5 h-3.5 shrink-0 ${subFiles.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                            <span className="truncate text-[11.5px]">{subName}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            {/* Hover Edit / Rename & Delete Buttons */}
                            <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-0.5 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => handleStartRename(folder.id, subName, e)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-200 transition-colors"
                                title="Đổi tên thư mục con"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSubfolderClick(folder.id, subName, e)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Xóa thư mục con"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Count Badge */}
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                              subFiles.length > 0 ? 'bg-slate-100 text-slate-700' : 'text-slate-300'
                            }`}>
                              {subFiles.length}
                            </span>
                          </div>
                        </div>

                        {/* Files inside this subfolder */}
                        {isSubExpanded && subFiles.length > 0 && (
                          <div className="ml-4 pl-2 border-l border-slate-200 space-y-0.5">
                            {subFiles.map((file) => {
                              const isFileActive = file.id === selectedFileId;
                              const exp = calculateExpirationInfo(file.expiresAt, warningDaysThreshold);

                              return (
                                <div
                                  key={file.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectFile(file);
                                  }}
                                  className={`flex items-center justify-between px-2 py-1 rounded text-[11px] cursor-pointer group transition-all ${
                                    isFileActive
                                      ? 'bg-blue-100 text-blue-900 font-bold'
                                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                                  title={file.name}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{file.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className={`w-1.5 h-1.5 rounded-full ${exp.colorClass.dot}`} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 2. Direct Root Files in this main folder (without subfolder) */}
                  {data.rootFiles.length > 0 && (
                    <div className="pt-1 space-y-0.5">
                      {data.rootFiles.map((file) => {
                        const isFileActive = file.id === selectedFileId;
                        const exp = calculateExpirationInfo(file.expiresAt, warningDaysThreshold);

                        return (
                          <div
                            key={file.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFile(file);
                            }}
                            className={`flex items-center justify-between px-2 py-1.5 rounded text-[11px] cursor-pointer group transition-all ${
                              isFileActive
                                ? 'bg-blue-100 text-blue-900 font-bold'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            title={file.name}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`w-1.5 h-1.5 rounded-full ${exp.colorClass.dot}`} />
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatFileSize(file.size)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Empty state hint */}
                  {data.total === 0 && (
                    <div className="py-1 px-2 text-[11px] text-slate-400 italic flex items-center justify-between">
                      <span>Chưa có tệp nào</span>
                      {onOpenUploadWithFolder && (
                        <button
                          type="button"
                          onClick={() => onOpenUploadWithFolder(folder.id)}
                          className="text-blue-600 hover:underline not-italic font-medium text-[10px]"
                        >
                          + Tải vào đây
                        </button>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Footer Helper: Seed / Demo starter files for the 5 folders if empty or user wants to test */}
      {files.length === 0 && onLoadSampleFiles && (
        <div className="p-3 border-t border-slate-200 bg-blue-50/50 text-center">
          <p className="text-[11px] text-slate-600 mb-2">Thử nghiệm cấu trúc 5 thư mục với dữ liệu mẫu?</p>
          <button
            onClick={onLoadSampleFiles}
            className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Nạp tài liệu mẫu vào 5 thư mục</span>
          </button>
        </div>
      )}

    </div>
  );
};
