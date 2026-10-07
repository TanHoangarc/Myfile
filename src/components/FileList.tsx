import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  Trash2, 
  Share2, 
  Calendar, 
  Clock, 
  FileText, 
  CheckSquare, 
  Square, 
  ChevronDown,
  Plus,
  HardDrive
} from 'lucide-react';
import type { StoredFile } from '../types/index.ts';
import { 
  formatFileSize, 
  formatDateVN, 
  calculateExpirationInfo 
} from '../utils/fileHelpers.ts';

interface FileListProps {
  files: StoredFile[];
  selectedFileId: string | null;
  onSelectFile: (file: StoredFile) => void;
  warningDaysThreshold: number;
  currentStatusFilter: string;
  onFilterChange: (filter: string) => void;
  onDownloadFile: (file: StoredFile) => void;
  onDeleteFile: (file: StoredFile) => void;
  onOpenZaloShare: (file: StoredFile) => void;
  onExtendValidity: (file: StoredFile) => void;
  onBatchDelete: (fileIds: string[]) => void;
  onBatchDownload: (files: StoredFile[]) => void;
  onOpenUpload: () => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  warningDaysThreshold,
  currentStatusFilter,
  onFilterChange,
  onDownloadFile,
  onDeleteFile,
  onOpenZaloShare,
  onExtendValidity,
  onBatchDelete,
  onBatchDownload,
  onOpenUpload
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'expiry_asc' | 'created_desc' | 'name_asc' | 'size_desc'>('expiry_asc');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [fileToDelete, setFileToDelete] = useState<StoredFile | null>(null);

  // Filter logic
  const filteredFiles = files.filter((file) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = file.name.toLowerCase().includes(q);
      const matchNotes = file.notes?.toLowerCase().includes(q);
      const matchTags = file.tags?.some((t) => t.toLowerCase().includes(q));
      const matchUploader = file.uploader?.toLowerCase().includes(q);
      if (!matchName && !matchNotes && !matchTags && !matchUploader) return false;
    }

    // Expiration status filter
    const expInfo = calculateExpirationInfo(file.expiresAt, warningDaysThreshold);
    if (currentStatusFilter === 'active' && expInfo.status !== 'active') return false;
    if (currentStatusFilter === 'expiring_soon' && expInfo.status !== 'expiring_soon') return false;
    if (currentStatusFilter === 'expired' && expInfo.status !== 'expired') return false;
    if (currentStatusFilter === 'permanent' && expInfo.status !== 'permanent') return false;

    return true;
  });

  // Sort logic
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === 'expiry_asc') {
      const aTime = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
      const bTime = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
      return aTime - bTime;
    } else if (sortBy === 'created_desc') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'name_asc') {
      return a.name.localeCompare(b.name, 'vi');
    } else if (sortBy === 'size_desc') {
      return b.size - a.size;
    }
    return 0;
  });

  // Batch selection
  const handleToggleBatchFile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedBatchIds.length === sortedFiles.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(sortedFiles.map((f) => f.id));
    }
  };

  const handleBatchDeleteClick = () => {
    if (selectedBatchIds.length === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedBatchIds.length} tệp đã chọn khỏi hệ thống?`)) {
      onBatchDelete(selectedBatchIds);
      setSelectedBatchIds([]);
    }
  };

  const handleBatchDownloadClick = () => {
    const toDownload = files.filter((f) => selectedBatchIds.includes(f.id));
    onBatchDownload(toDownload);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-full min-h-[900px] lg:min-h-[1200px] overflow-hidden">
      
      {/* Top Header of Left Panel */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3 shrink-0">
        
        {/* Title & Upload Button */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span>Danh sách tệp tin</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                {sortedFiles.length}
              </span>
            </h3>
          </div>

          <button
            onClick={onOpenUpload}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs flex items-center gap-1.5 transition-all active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tải tệp</span>
          </button>
        </div>

        {/* Search Bar & Sort Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên tệp, ghi chú..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative w-36 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full pl-2.5 pr-6 py-1.5 text-[11px] rounded-xl border border-slate-200 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="expiry_asc">⏳ Hạn gần nhất</option>
              <option value="created_desc">🆕 Mới nhất</option>
              <option value="name_asc">🔤 Tên A-Z</option>
              <option value="size_desc">💾 Dung lượng</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-1 text-[11px]">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'expiring_soon', label: '🟡 Sắp hết hạn' },
            { id: 'expired', label: '🔴 Đã hết hạn' },
            { id: 'active', label: '🟢 Còn hạn' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                currentStatusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Batch Bar if any items selected */}
      {selectedBatchIds.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-2.5 px-3 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-1.5 font-semibold text-blue-900">
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
              {selectedBatchIds.length}
            </span>
            <span>Đã chọn</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleBatchDownloadClick}
              className="px-2 py-0.5 rounded bg-white text-blue-700 font-semibold border border-blue-200 hover:bg-blue-100 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Tải về
            </button>
            <button
              onClick={handleBatchDeleteClick}
              className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Xóa
            </button>
          </div>
        </div>
      )}

      {/* File List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
        {sortedFiles.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Chưa có tài liệu nào</p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery ? `Không tìm thấy tài liệu phù hợp với "${searchQuery}"` : 'Danh sách tài liệu của bạn đang trống.'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={onOpenUpload}
                className="mt-1 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tải lên tệp mới</span>
              </button>
            )}
          </div>
        ) : (
          sortedFiles.map((file) => {
            const isSelected = file.id === selectedFileId;
            const isChecked = selectedBatchIds.includes(file.id);
            const expInfo = calculateExpirationInfo(file.expiresAt, warningDaysThreshold);

            return (
              <div
                key={file.id}
                onClick={() => onSelectFile(file)}
                className={`p-3 rounded-xl border transition-all cursor-pointer group flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-2xs ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                {/* Top Row: Checkbox, Name, and Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => handleToggleBatchFile(e, file.id)}
                      className="mt-0.5 text-slate-400 hover:text-blue-600 shrink-0"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <h4 
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-600'
                        }`}
                        title={file.name}
                      >
                        {file.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono">{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${expInfo.colorClass.badge}`}>
                    {expInfo.label}
                  </span>
                </div>

                {/* Expiration Date & Quick Hover Actions */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100/80 text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Hạn: <strong className="text-slate-700">{formatDateVN(file.expiresAt)}</strong></span>
                  </div>

                  {/* Hover Quick Action Icons */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenZaloShare(file)}
                      className="p-1 rounded text-blue-600 hover:bg-blue-100"
                      title="Gửi Zalo"
                    >
                      <Share2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onExtendValidity(file)}
                      className="p-1 rounded text-amber-600 hover:bg-amber-100"
                      title="Gia hạn"
                    >
                      <Clock className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDownloadFile(file)}
                      className="p-1 rounded text-slate-600 hover:bg-slate-200"
                      title="Tải về"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setFileToDelete(file)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Xóa tệp"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Xác nhận xóa tài liệu?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tệp <span className="font-semibold text-slate-800">"{fileToDelete.name}"</span> sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu Firebase. Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onDeleteFile(fileToDelete);
                  setFileToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
