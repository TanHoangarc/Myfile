import React from 'react';
import { 
  X, 
  Bell, 
  Clock, 
  AlertTriangle, 
  AlertOctagon, 
  Calendar, 
  Share2, 
  Download, 
  Eye, 
  Volume2, 
  VolumeX,
  Settings,
  CheckCircle2
} from 'lucide-react';
import type { StoredFile } from '../types/index.ts';
import { 
  calculateExpirationInfo, 
  formatDateVN, 
  getCategoryLabel, 
  downloadFile 
} from '../utils/fileHelpers.ts';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  files: StoredFile[];
  warningDaysThreshold: number;
  onChangeWarningThreshold: (days: number) => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  isBrowserNotificationGranted: boolean;
  onRequestBrowserNotification: () => void;
  onPreviewFile: (file: StoredFile) => void;
  onOpenZaloShare: (file: StoredFile) => void;
  onExtendValidity: (file: StoredFile) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  files,
  warningDaysThreshold,
  onChangeWarningThreshold,
  isSoundEnabled,
  onToggleSound,
  isBrowserNotificationGranted,
  onRequestBrowserNotification,
  onPreviewFile,
  onOpenZaloShare,
  onExtendValidity
}) => {
  if (!isOpen) return null;

  // Filter files that are expiring soon or expired
  const expiringOrExpired = files.filter((f) => {
    const info = calculateExpirationInfo(f.expiresAt, warningDaysThreshold);
    return info.status === 'expiring_soon' || info.status === 'expired';
  }).sort((a, b) => {
    const timeA = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
    const timeB = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
    return timeA - timeB;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Trung tâm cảnh báo hạn dùng
              </h3>
              <p className="text-xs text-slate-500">
                {expiringOrExpired.length} tài liệu cần được chú ý
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

        {/* Configuration Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              Ngưỡng cảnh báo trước:
            </span>
            <div className="flex gap-1">
              {[3, 7, 14, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => onChangeWarningThreshold(days)}
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-all ${
                    warningDaysThreshold === days
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {days} ngày
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            {/* Audio Toggle */}
            <button
              onClick={onToggleSound}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                isSoundEnabled
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{isSoundEnabled ? 'Chuông: Bật' : 'Chuông: Tắt'}</span>
            </button>

            {/* Desktop Notification Button */}
            {!isBrowserNotificationGranted ? (
              <button
                onClick={onRequestBrowserNotification}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-2xs"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Bật thông báo Desktop</span>
              </button>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã bật báo Desktop
              </span>
            )}
          </div>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {expiringOrExpired.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Tất cả tài liệu đều an toàn!</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Không có tệp nào sắp hết hạn trong vòng {warningDaysThreshold} ngày tới hoặc bị quá hạn.
              </p>
            </div>
          ) : (
            expiringOrExpired.map((file) => {
              const expInfo = calculateExpirationInfo(file.expiresAt, warningDaysThreshold);
              const isExpired = expInfo.status === 'expired';

              return (
                <div
                  key={file.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isExpired 
                      ? 'bg-rose-50/70 border-rose-200' 
                      : 'bg-amber-50/70 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isExpired ? (
                          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {file.name}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {getCategoryLabel(file.category)} • Hạn: {formatDateVN(file.expiresAt)}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${expInfo.colorClass.badge}`}>
                      {expInfo.label}
                    </span>
                  </div>

                  {file.notes && (
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-1 italic bg-white/60 p-1.5 rounded-lg border border-slate-100">
                      "{file.notes}"
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => onExtendValidity(file)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 transition-colors"
                    >
                      <Calendar className="w-3 h-3 text-blue-600" />
                      Gia hạn
                    </button>
                    <button
                      onClick={() => onOpenZaloShare(file)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1 transition-colors"
                    >
                      <Share2 className="w-3 h-3" />
                      Gửi Zalo
                    </button>
                    <button
                      onClick={() => onPreviewFile(file)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-white/80 transition-colors ml-auto"
                      title="Xem tài liệu"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => downloadFile(file)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-white/80 transition-colors"
                      title="Tải về"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Hệ thống tự động kiểm tra mỗi ngày
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
