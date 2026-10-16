import React, { useState, useEffect } from 'react';
import { X, Folder, Pencil, Check, AlertCircle } from 'lucide-react';
import type { FileCategory } from '../types/index.ts';
import { getFolderDefinition } from '../utils/folderConstants.ts';

interface RenameSubfolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: FileCategory;
  currentSubfolder: string;
  onConfirmRename: (category: FileCategory, oldName: string, newName: string) => void;
}

export const RenameSubfolderModal: React.FC<RenameSubfolderModalProps> = ({
  isOpen,
  onClose,
  category,
  currentSubfolder,
  onConfirmRename
}) => {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewName(currentSubfolder);
      setError('');
    }
  }, [isOpen, currentSubfolder]);

  if (!isOpen) return null;

  const folderDef = getFolderDefinition(category);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Tên thư mục con không được để trống.');
      return;
    }
    if (trimmed === currentSubfolder.trim()) {
      onClose();
      return;
    }

    onConfirmRename(category, currentSubfolder.trim(), trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Đổi tên thư mục con</h3>
              <p className="text-[11px] text-slate-500">
                Thuộc nhóm: <span className="font-semibold text-slate-700">{folderDef.number}. {folderDef.name}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên thư mục con hiện tại
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200">
              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">{currentSubfolder}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên mới cho thư mục con
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Nhập tên mới..."
              autoFocus
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
            />
            {error && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 leading-relaxed">
            💡 <strong>Tự động đồng bộ:</strong> Tất cả các tài liệu bên trong thư mục con này sẽ được tự động đổi sang tên mới và lưu lên Firebase Cloud.
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 transition-all active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Lưu tên mới</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
