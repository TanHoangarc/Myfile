import React from 'react';
import { Cloud, AlertTriangle, CheckCircle2, HardDrive, X, RefreshCw } from 'lucide-react';

interface SyncNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetrySync?: () => void;
  isSyncing?: boolean;
  isQuota?: boolean;
  title: string;
  message: string;
  syncedCount?: number;
  failedCount?: number;
}

export const SyncNoticeModal: React.FC<SyncNoticeModalProps> = ({
  isOpen,
  onClose,
  onRetrySync,
  isSyncing = false,
  isQuota = false,
  title,
  message,
  syncedCount,
  failedCount
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
              isQuota 
                ? 'bg-amber-500 text-white' 
                : 'bg-blue-600 text-white'
            }`}>
              {isQuota ? <AlertTriangle className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{title}</h3>
              <p className="text-xs text-slate-500">Trạng thái đồng bộ đám mây Firebase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed font-normal">
            {message}
          </p>

          {/* Detailed Info Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <HardDrive className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Dữ liệu an toàn 100%:</strong>
                <p className="text-slate-600 mt-0.5">
                  Tệp đã được lưu trữ vĩnh viễn trong bộ nhớ thiết bị (IndexedDB). Bạn xem trước, tải về, chỉnh sửa và in ấn bình thường mà không bị mất.
                </p>
              </div>
            </div>

            {isQuota && (
              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/80">
                <Cloud className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Cơ chế Hạn ngạch Google Firebase:</strong>
                  <p className="text-slate-600 mt-0.5">
                    Gói miễn phí Firebase cấp 20.000 lượt ghi/ngày. Google sẽ tự động gia hạn mức mới vào 0:00 PST (khoảng 14:00 giờ VN). Khi đó bạn có thể bấm nút Đồng bộ lại bất kỳ lúc nào.
                  </p>
                </div>
              </div>
            )}

            {syncedCount !== undefined && syncedCount > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Đã ghi thành công {syncedCount} tệp lên Firebase Cloud!</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3">
          {onRetrySync && (
            <button
              onClick={onRetrySync}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs inline-flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Đang thử đồng bộ...' : 'Thử đồng bộ lại ngay'}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
