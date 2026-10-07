import React, { useState } from 'react';
import { 
  Download, 
  Share2, 
  Calendar, 
  Clock, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Printer, 
  Trash2,
  Tag, 
  Info,
  Maximize2,
  ExternalLink,
  ChevronLeft,
  Sparkles,
  FileCheck
} from 'lucide-react';
import type { StoredFile } from '../types/index.ts';
import { 
  formatFileSize, 
  formatDateVN, 
  calculateExpirationInfo, 
  getCategoryLabel, 
  downloadFile 
} from '../utils/fileHelpers.ts';

interface FileViewerPanelProps {
  file: StoredFile | null;
  warningDaysThreshold: number;
  onOpenZaloShare: (file: StoredFile) => void;
  onExtendValidity: (file: StoredFile) => void;
  onDeleteFile: (file: StoredFile) => void;
  onBackToList?: () => void; // Mobile back button
}

export const FileViewerPanel: React.FC<FileViewerPanelProps> = ({
  file,
  warningDaysThreshold,
  onOpenZaloShare,
  onExtendValidity,
  onDeleteFile,
  onBackToList
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!file) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">Chưa chọn tài liệu để xem</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1.5">
          Vui lòng nhấn vào bất kỳ tệp nào trong danh sách bên trái để mở chế độ xem trước trực tiếp và theo dõi hạn hiệu lực.
        </p>
      </div>
    );
  }

  const expInfo = calculateExpirationInfo(file.expiresAt, warningDaysThreshold);
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isText = file.type.startsWith('text/') || file.type.includes('json') || file.type.includes('csv');
  const isAudio = file.type.startsWith('audio/');
  const isVideo = file.type.startsWith('video/');

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handlePrint = () => window.print();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-full min-h-[620px] overflow-hidden">
      
      {/* Header of Viewer */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
        
        {/* Mobile Back Button & File Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onBackToList && (
            <button
              onClick={onBackToList}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
              title="Quay lại danh sách"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base truncate max-w-md" title={file.name}>
              {file.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="font-medium text-slate-700">{getCategoryLabel(file.category)}</span>
              <span>•</span>
              <span className="font-mono">{formatFileSize(file.size)}</span>
              <span>•</span>
              <span className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${expInfo.colorClass.badge}`}>
                {expInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5">
          {/* Zalo Share */}
          <button
            onClick={() => onOpenZaloShare(file)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition-all"
            title="Chia sẻ tệp qua Zalo"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold">
              Z
            </div>
            <span>Zalo</span>
          </button>

          {/* Extend Expiry */}
          <button
            onClick={() => onExtendValidity(file)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs transition-all"
            title="Gia hạn thời hạn"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Gia hạn</span>
          </button>

          {/* Download */}
          <button
            onClick={() => downloadFile(file)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all"
            title="Tải xuống tệp trực tiếp"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tải về</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors hidden sm:block"
            title="In tài liệu"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDeleteFile(file)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Xóa tệp"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col bg-slate-100/60 relative overflow-hidden min-h-[420px]">
        
        {/* Floating Controls for Image */}
        {isImage && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-xl p-1 shadow-md border border-slate-200/80">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              title="Xoay hình ảnh"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-500 px-2">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
        )}

        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          
          {/* IMAGE VIEWER */}
          {isImage && (
            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
              <img
                src={file.fileData || `https://placehold.co/800x600/e2e8f0/1e293b?text=${encodeURIComponent(file.name)}`}
                alt={file.name}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out'
                }}
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
              />
            </div>
          )}

          {/* PDF VIEWER */}
          {isPdf && (
            <div className="w-full h-full min-h-[480px] flex flex-col bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              {file.fileData ? (
                <iframe
                  src={file.fileData}
                  title={file.name}
                  className="w-full h-full min-h-[480px] border-0"
                />
              ) : (
                <div className="m-auto text-center p-8 max-w-md space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">{file.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Tài liệu PDF lưu trữ trên Firebase. Bạn có thể xem trực tiếp hoặc tải về máy.
                    </p>
                  </div>
                  <button
                    onClick={() => downloadFile(file)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 mx-auto"
                  >
                    <Download className="w-4 h-4" />
                    Tải PDF về máy
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TEXT / CODE VIEWER */}
          {isText && (
            <div className="w-full h-full min-h-[450px] bg-slate-900 text-slate-100 rounded-xl p-5 font-mono text-xs overflow-auto shadow-inner">
              <pre className="whitespace-pre-wrap">
                {file.fileData || `Nội dung tài liệu "${file.name}" được lưu trữ an toàn.`}
              </pre>
            </div>
          )}

          {/* AUDIO VIEWER */}
          {isAudio && (
            <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center space-y-4">
              <h4 className="font-bold text-slate-800">{file.name}</h4>
              <audio controls className="w-full max-w-md mx-auto">
                {file.fileData && <source src={file.fileData} type={file.type} />}
              </audio>
            </div>
          )}

          {/* VIDEO VIEWER */}
          {isVideo && (
            <div className="max-w-2xl w-full bg-black rounded-2xl overflow-hidden shadow-xl">
              <video controls className="w-full h-auto">
                {file.fileData && <source src={file.fileData} type={file.type} />}
              </video>
            </div>
          )}

          {/* OTHER DOCUMENTS (Word, Excel, ZIP) */}
          {!isImage && !isPdf && !isText && !isAudio && !isVideo && (
            <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center max-w-md space-y-4 my-auto">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">{file.name}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Định dạng ({file.type}). Tệp được bảo vệ an toàn trên đám mây Firebase.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => downloadFile(file)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  Tải về máy
                </button>
                <button
                  onClick={() => onOpenZaloShare(file)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  Gửi qua Zalo
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Bottom Metadata & Notes Bar */}
      <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        
        {/* Validity Summary */}
        <div className={`p-3 rounded-xl border ${expInfo.colorClass.border} ${expInfo.colorClass.bg} flex items-center justify-between`}>
          <div className="space-y-0.5">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Hạn hiệu lực
            </span>
            <p className="text-slate-600">
              {formatDateVN(file.validFrom)} → <span className="font-semibold text-slate-800">{formatDateVN(file.expiresAt)}</span>
            </p>
          </div>
          <button
            onClick={() => onExtendValidity(file)}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg font-semibold text-[11px] shadow-2xs"
          >
            Gia hạn
          </button>
        </div>

        {/* Notes */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 block mb-0.5">
            Ghi chú
          </span>
          <p className="text-slate-700 line-clamp-2 italic">
            {file.notes || 'Không có ghi chú thêm.'}
          </p>
        </div>

        {/* Tags & Uploader */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Người tải:</span>
            <span className="font-medium text-slate-800">{file.uploader || 'Người dùng'}</span>
          </div>
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Lượt gửi Zalo:</span>
            <span className="font-semibold text-blue-600">{file.shareCount || 0} lượt</span>
          </div>
          {file.tags && file.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {file.tags.map((t) => (
                <span key={t} className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
