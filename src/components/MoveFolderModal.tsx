import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  FolderInput, 
  Folder, 
  FolderOpen, 
  Check, 
  Plus, 
  ChevronRight,
  FolderPlus
} from 'lucide-react';
import type { StoredFile, FileCategory } from '../types/index.ts';
import { MAIN_FOLDERS, normalizeCategory, getFolderDefinition } from '../utils/folderConstants.ts';

interface MoveFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: StoredFile | null;
  files: StoredFile[];
  onConfirmMove: (fileId: string, targetCategory: FileCategory, targetSubfolder?: string) => void;
}

export const MoveFolderModal: React.FC<MoveFolderModalProps> = ({
  isOpen,
  onClose,
  file,
  files,
  onConfirmMove
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('contract');
  const [selectedSubfolder, setSelectedSubfolder] = useState<string>('');
  const [customSubfolderInput, setCustomSubfolderInput] = useState<string>('');
  const [isCreatingNewSubfolder, setIsCreatingNewSubfolder] = useState(false);

  // Initialize selected folder and subfolder when modal opens with a file
  useEffect(() => {
    if (file && isOpen) {
      const cat = normalizeCategory(file.category);
      setSelectedCategory(cat);
      setSelectedSubfolder(file.subfolder || '');
      setCustomSubfolderInput('');
      setIsCreatingNewSubfolder(false);
    }
  }, [file, isOpen]);

  // Read custom subfolders from localStorage
  const storedCustomSubfolders = useMemo<Record<string, string[]>>(() => {
    if (!isOpen) return {};
    try {
      const saved = localStorage.getItem('docuvault_custom_subfolders_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }, [isOpen]);

  // Aggregate all subfolders for the currently selected category:
  // Default subfolders + custom subfolders + any subfolders currently on files
  const availableSubfolders = useMemo(() => {
    const folderDef = MAIN_FOLDERS.find((f) => f.id === selectedCategory);
    const defaults = folderDef?.defaultSubfolders || [];
    const custom = storedCustomSubfolders[selectedCategory] || [];
    
    // Find subfolders from actual files
    const fromFiles = files
      .filter((f) => normalizeCategory(f.category) === selectedCategory && f.subfolder?.trim())
      .map((f) => f.subfolder!.trim());

    return Array.from(new Set([...defaults, ...custom, ...fromFiles])).filter(Boolean);
  }, [selectedCategory, storedCustomSubfolders, files]);

  if (!isOpen || !file) return null;

  const currentFolderDef = getFolderDefinition(file.category);
  const targetFolderDef = getFolderDefinition(selectedCategory);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const finalSubfolder = isCreatingNewSubfolder 
      ? customSubfolderInput.trim() 
      : selectedSubfolder.trim();

    if (finalSubfolder) {
      try {
        const raw = localStorage.getItem('docuvault_custom_subfolders_v1');
        const custom = raw ? JSON.parse(raw) : {};
        const list = custom[selectedCategory] || [];
        if (!list.includes(finalSubfolder)) {
          custom[selectedCategory] = [...list, finalSubfolder];
          localStorage.setItem('docuvault_custom_subfolders_v1', JSON.stringify(custom));
        }
      } catch {}
    }

    onConfirmMove(file.id, selectedCategory, finalSubfolder || undefined);
    onClose();
  };

  const handleQuickMove = (cat: FileCategory, sub?: string) => {
    onConfirmMove(file.id, cat, sub?.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Chuyển thư mục tài liệu</h3>
              <p className="text-xs text-slate-500 truncate max-w-md" title={file.name}>
                Tệp: <span className="font-semibold text-slate-800">{file.name}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Current Location Banner */}
          <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-500">Vị trí hiện tại:</span>
              <span className={`px-2 py-0.5 rounded-md font-bold ${currentFolderDef.badgeBg} ${currentFolderDef.badgeText}`}>
                📁 {currentFolderDef.number}. {currentFolderDef.name}
              </span>
              {file.subfolder ? (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    📂 {file.subfolder}
                  </span>
                </>
              ) : (
                <span className="text-slate-400 italic">(Thư mục gốc)</span>
              )}
            </div>
          </div>

          {/* Step 1: Select Main Category Folder */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Chọn thư mục chính (5 nhóm)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MAIN_FOLDERS.map((folder) => {
                const isSelected = selectedCategory === folder.id;
                return (
                  <button
                    type="button"
                    key={folder.id}
                    onClick={() => {
                      setSelectedCategory(folder.id);
                      // Clear subfolder or reset
                      setSelectedSubfolder('');
                      setIsCreatingNewSubfolder(false);
                    }}
                    className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? `${folder.badgeBg} ${folder.badgeText} ring-2 ring-blue-500/30 border-blue-500 shadow-2xs font-bold`
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <Folder className={`w-3.5 h-3.5 shrink-0 ${folder.folderText}`} />
                        <span className="font-mono text-[11px] opacity-70">{folder.number}.</span>
                        <span className="truncate">{folder.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Subfolder inside chosen Category */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Chọn thư mục con trong "{targetFolderDef.name}"</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNewSubfolder(!isCreatingNewSubfolder);
                  if (!isCreatingNewSubfolder) {
                    setSelectedSubfolder('');
                  }
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo thư mục con mới</span>
              </button>
            </div>

            {/* List of Subfolders */}
            <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
              
              {/* Option A: Thư mục gốc (Root without subfolder) */}
              <div
                onClick={() => {
                  setSelectedSubfolder('');
                  setIsCreatingNewSubfolder(false);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer border transition-all ${
                  selectedSubfolder === '' && !isCreatingNewSubfolder
                    ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5" />
                  <span>Thư mục gốc (Không vào thư mục con)</span>
                </div>
                {selectedSubfolder === '' && !isCreatingNewSubfolder && (
                  <Check className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Option B: Available Subfolders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {availableSubfolders.map((subName) => {
                  const isSelected = selectedSubfolder === subName && !isCreatingNewSubfolder;
                  return (
                    <button
                      type="button"
                      key={subName}
                      onClick={() => {
                        setSelectedSubfolder(subName);
                        setIsCreatingNewSubfolder(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left border transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                        <span className="truncate">{subName}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Option C: Create New Subfolder Input */}
              {isCreatingNewSubfolder && (
                <div className="pt-2 mt-2 border-t border-slate-200">
                  <label className="block text-[11px] font-semibold text-blue-900 mb-1 flex items-center gap-1">
                    <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tên thư mục con mới:</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customSubfolderInput}
                      onChange={(e) => setCustomSubfolderInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubmit(e);
                      }}
                      placeholder="VD: Hợp đồng mua bán 2026, Mẫu tờ khai thuế..."
                      autoFocus
                      className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 bg-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                    {customSubfolderInput.trim() && (
                      <button
                        type="button"
                        onClick={() => handleSubmit()}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 shadow-2xs"
                      >
                        Chuyển ngay
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Chuyển đến: <strong className="text-slate-900">{targetFolderDef.name}</strong>
            {(isCreatingNewSubfolder ? customSubfolderInput.trim() : selectedSubfolder) && (
              <span className="text-blue-700 font-bold">
                {' '}/ {isCreatingNewSubfolder ? customSubfolderInput.trim() : selectedSubfolder}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/80 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 transition-all active:scale-98"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Xác nhận chuyển</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
