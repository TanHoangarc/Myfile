import React, { useRef, useState } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  Download, 
  Upload, 
  CheckCircle2, 
  HardDrive, 
  Cloud, 
  AlertTriangle,
  HelpCircle,
  FileCheck,
  RefreshCw
} from 'lucide-react';
import type { StoredFile } from '../types/index.ts';
import { exportAllFilesBackup, importFilesBackup } from '../utils/fileStorage.ts';
import { playAlertSound } from '../utils/notificationService.ts';

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: StoredFile[];
  onFilesImported: (updatedFiles: StoredFile[]) => void;
  isQuotaExhausted: boolean;
}

export const DataMigrationModal: React.FC<DataMigrationModalProps> = ({
  isOpen,
  onClose,
  files,
  onFilesImported,
  isQuotaExhausted
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const syncedCount = files.filter((f) => f.isSyncedToCloud).length;
  const localOnlyCount = files.filter((f) => !f.isSyncedToCloud).length;

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const pkg = await exportAllFilesBackup();
      
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `DocuVault_SaoLuu_${files.length}Tep_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      playAlertSound('success');
    } catch (err: any) {
      console.error('Lỗi khi xuất gói dữ liệu:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportErrorMsg(null);
      setImportSuccessMsg(null);

      const text = await file.text();
      const json = JSON.parse(text);

      const result = await importFilesBackup(json);
      playAlertSound('success');
      setImportSuccessMsg(`Đã nhập thành công ${result.importedCount} tệp (kèm toàn bộ nội dung PDF) vào máy này!`);
      onFilesImported(result.files);
    } catch (err: any) {
      console.error('Lỗi nhập dữ liệu:', err);
      setImportErrorMsg(err?.message || 'Tệp sao lưu không đúng định dạng hoặc bị lỗi.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Đồng bộ & Chuyển dữ liệu giữa 2 máy</h3>
              <p className="text-xs text-slate-500">Giải thích và xử lý đồng bộ giữa Máy A và Máy B</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-sm text-slate-700">
          
          {/* Explanation banner: Why Machine A has 10 and Machine B has 7 */}
          <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 space-y-2">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 text-xs sm:text-sm">
                  Tại sao Máy A mở 10 file mà Máy B chỉ mở được 7 file?
                </h4>
                <div className="text-xs text-amber-800/90 mt-1.5 space-y-1.5 leading-relaxed">
                  <p>
                    <strong>1. Giới hạn Free Tier của Google Firebase:</strong> Dự án Firebase miễn phí có trần <strong>20.000 lượt ghi mỗi ngày</strong>. Khi đạt giới hạn này, Google tạm ngừng tiếp nhận ghi tệp mới.
                  </p>
                  <p>
                    <strong>2. Thời điểm tải lên:</strong> <strong>7 tệp đầu tiên</strong> đã kịp đồng bộ lên Firebase Cloud. <strong>3 tệp còn lại</strong> được tải lên sau khi Firebase đạt trần hạn mức, nên được lưu an toàn 100% trong bộ nhớ của <strong>Máy A</strong> (IndexedDB).
                  </p>
                  <p>
                    <strong>3. Máy B lấy từ đâu?</strong> Máy B chỉ kết nối tải từ Firebase Cloud, mà Firebase hiện mới có 7 tệp, nên Máy B chỉ hiển thị 7 tệp.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Device Status Pills */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-[11px] text-slate-500 block">Tổng tệp trên máy</span>
              <span className="text-base font-extrabold text-slate-800">{files.length}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
              <span className="text-[11px] text-emerald-700 block">Đã lên Firebase</span>
              <span className="text-base font-extrabold text-emerald-700">{syncedCount}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
              <span className="text-[11px] text-amber-700 block">Chờ Firebase</span>
              <span className="text-base font-extrabold text-amber-700">{localOnlyCount}</span>
            </div>
          </div>

          {/* Action 1: Export package from Machine A */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  A
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs sm:text-sm">Bước 1: Thực hiện trên Máy A (Có đủ 10 file)</h5>
                  <p className="text-[11px] text-slate-500">Xuất toàn bộ 10 file kèm nội dung PDF thành 1 tệp sao lưu</p>
                </div>
              </div>
              <button
                onClick={handleExportBackup}
                disabled={isExporting || files.length === 0}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-98 disabled:opacity-50"
              >
                {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>{isExporting ? 'Đang đóng gói...' : 'Xuất sang Máy B'}</span>
              </button>
            </div>
          </div>

          {/* Action 2: Import package on Machine B */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  B
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs sm:text-sm">Bước 2: Thực hiện trên Máy B (Đang có 7 file)</h5>
                  <p className="text-[11px] text-slate-500">Mở trang web trên Máy B và nạp tệp sao lưu vừa tải về</p>
                </div>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.docuvault"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-98 disabled:opacity-50"
                >
                  {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{isImporting ? 'Đang nạp...' : 'Nhập vào Máy B'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {importSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          {importErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{importErrorMsg}</span>
            </div>
          )}

          {/* Note about Firebase quota */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
            <span className="font-semibold text-slate-700 block">Cách 2 (Tự động đồng bộ Firebase sau khi reset):</span>
            <p>
              Google Cloud tự động hoàn trả 20.000 lượt ghi miễn phí vào 0:00 PST (khoảng 14:00 giờ Việt Nam). Khi đó bạn chỉ cần vào Máy A và bấm <strong>"Đồng bộ Firebase"</strong>, 3 tệp còn lại sẽ lập tức truyền sang Máy B qua mạng.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
