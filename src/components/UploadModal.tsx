import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Calendar, 
  AlignLeft, 
  Check, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { StoredFile, FileCategory } from '../types/index.ts';
import { formatFileSize, readFileAsDataURL, detectMimeType } from '../utils/fileHelpers.ts';
import { playAlertSound } from '../utils/notificationService.ts';
import { storeFileContent } from '../utils/fileStorage.ts';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFile: (file: StoredFile) => Promise<void>;
  currentUser: User | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSaveFile,
  currentUser
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState<FileCategory>('contract');
  const [validFrom, setValidFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [expiresAt, setExpiresAt] = useState('');
  const [hasNoExpiration, setHasNoExpiration] = useState(false);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);

      // Auto detect category
      const lower = file.name.toLowerCase();
      if (lower.includes('hop-dong') || lower.includes('hopdong') || lower.includes('contract')) {
        setCategory('contract');
      } else if (lower.includes('cccd') || lower.includes('cmnd') || lower.includes('passport') || lower.includes('giay-to') || lower.includes('id')) {
        setCategory('id_card');
      } else {
        setCategory('other');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Vui lòng chọn một tệp để tải lên.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      // Read file to data URL
      let fileData = '';
      if (selectedFile.size <= 25 * 1024 * 1024) { // Up to 25MB encoded in browser
        fileData = await readFileAsDataURL(selectedFile);
      }

      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Persist full file data in IndexedDB
      if (fileData) {
        await storeFileContent(fileId, fileData);
      }

      const newFile: StoredFile = {
        id: fileId,
        name: fileName.trim() || selectedFile.name,
        originalName: selectedFile.name,
        size: selectedFile.size,
        type: detectMimeType(selectedFile.name, selectedFile.type),
        category,
        fileData,
        validFrom: validFrom || undefined,
        expiresAt: hasNoExpiration ? undefined : (expiresAt || undefined),
        notes: notes.trim() || undefined,
        uploader: currentUser?.displayName || 'Người dùng',
        uploaderEmail: currentUser?.email || 'hoangdan.xnk@gmail.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shareCount: 0
      };

      await onSaveFile(newFile);
      playAlertSound('success');
      onClose();
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err?.message || 'Có lỗi xảy ra khi lưu tệp vào Firebase.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Tải lên tệp mới</h3>
              <p className="text-xs text-slate-500">Lưu trữ tệp và quản lý thời hạn hiệu lực</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
              selectedFile 
                ? 'border-emerald-300 bg-emerald-50/30' 
                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/20 bg-slate-50/40'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900 truncate max-w-sm">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Tệp tài liệu'}
                  </p>
                  <p className="text-[11px] text-blue-600 hover:underline mt-0.5">
                    Nhấn để đổi tệp khác
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-blue-600 hover:underline">
                    Chọn tệp từ máy tính
                  </span>
                  <span className="text-sm text-slate-600"> hoặc kéo thả vào đây</span>
                </div>
                <p className="text-xs text-slate-400">
                  Hỗ trợ PDF, Word, Excel, Hình ảnh (PNG/JPG), Văn bản,...
                </p>
              </div>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên hiển thị tài liệu
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="VD: Hợp đồng cung ứng dịch vụ 2026.pdf"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Selection: Exactly 3 items */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Phân loại danh mục
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'contract', label: 'Hợp đồng' },
                { id: 'id_card', label: 'Giấy tờ tùy thân' },
                { id: 'other', label: 'Tài liệu khác' }
              ].map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id as FileCategory)}
                  className={`px-3 py-2.5 rounded-xl text-xs text-center transition-all border ${
                    category === cat.id
                      ? 'bg-blue-50 text-blue-700 border-blue-500 shadow-2xs font-bold ring-2 ring-blue-500/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-medium'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Validity Period & Expiration (without quick presets) */}
          <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Thời hạn hiệu lực
              </span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasNoExpiration}
                  onChange={(e) => {
                    setHasNoExpiration(e.target.checked);
                    if (e.target.checked) setExpiresAt('');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">Vô thời hạn</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Ngày bắt đầu có hiệu lực
                </label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Ngày hết hiệu lực (Expiration Date)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  disabled={hasNoExpiration}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                    hasNoExpiration ? 'opacity-40 cursor-not-allowed bg-slate-100' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
              Ghi chú nội dung
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú thêm cho tài liệu (nếu có)..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading || !selectedFile}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang tải lên...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Lưu tài liệu</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
