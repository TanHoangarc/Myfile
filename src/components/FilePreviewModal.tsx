import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Calendar, 
  Clock, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Printer, 
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Info
} from 'lucide-react';
import type { StoredFile } from '../types/index.ts';
import { 
  formatFileSize, 
  formatDateVN, 
  calculateExpirationInfo, 
  getCategoryLabel, 
  downloadFile 
} from '../utils/fileHelpers.ts';

interface FilePreviewModalProps {
  file: StoredFile | null;
  onClose: () => void;
  onOpenZaloShare: (file: StoredFile) => void;
  onExtendValidity: (file: StoredFile) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onOpenZaloShare,
  onExtendValidity
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!file) return null;

  const expInfo = calculateExpirationInfo(file.expiresAt);
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isText = file.type.startsWith('text/') || file.type.includes('json') || file.type.includes('csv');
  const isAudio = file.type.startsWith('audio/');
  const isVideo = file.type.startsWith('video/');

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                {file.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{getCategoryLabel(file.category)}</span>
                <span>•</span>
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold border ${expInfo.colorClass.badge}`}>
                  {expInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Zalo Share */}
            <button
              onClick={() => onOpenZaloShare(file)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition-all"
              title="Chia sẻ tệp này qua Zalo"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold">
                Z
              </div>
              <span className="hidden sm:inline">Gửi qua</span> Zalo
            </button>

            {/* Direct Download */}
            <button
              onClick={() => downloadFile(file)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all"
              title="Tải xuống trực tiếp"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải xuống</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors hidden sm:block"
              title="In tài liệu"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

          </div>

        </div>

        {/* Content Area: Viewer + Info Sidebar */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100/70">
          
          {/* Main Viewer Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {/* Viewer Controls for Image */}
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
              
              {/* IMAGE PREVIEW */}
              {isImage && (
                <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={file.fileData || `https://placehold.co/800x600/e2e8f0/1e293b?text=${encodeURIComponent(file.name)}`}
                    alt={file.name}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease-out'
                    }}
                    className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg border border-slate-200 bg-white"
                  />
                </div>
              )}

              {/* PDF PREVIEW */}
              {isPdf && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                  {file.fileData ? (
                    <iframe
                      src={file.fileData}
                      title={file.name}
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <div className="text-center p-8 max-w-md space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">{file.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Tài liệu PDF lưu trữ trên Firebase. Bạn có thể xem trực tiếp hoặc tải về máy để mở bằng Acrobat Reader.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => downloadFile(file)}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Tải PDF về máy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TEXT / CODE PREVIEW */}
              {isText && (
                <div className="w-full h-full bg-slate-900 text-slate-100 rounded-xl p-5 font-mono text-xs overflow-auto shadow-inner">
                  <pre className="whitespace-pre-wrap">
                    {file.fileData || `Nội dung tài liệu "${file.name}" được lưu trữ an toàn.`}
                  </pre>
                </div>
              )}

              {/* AUDIO / VIDEO PREVIEW */}
              {isAudio && (
                <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center space-y-4">
                  <h4 className="font-bold text-slate-800">{file.name}</h4>
                  <audio controls className="w-full max-w-md">
                    {file.fileData && <source src={file.fileData} type={file.type} />}
                  </audio>
                </div>
              )}

              {isVideo && (
                <div className="max-w-2xl w-full bg-black rounded-2xl overflow-hidden shadow-xl">
                  <video controls className="w-full h-auto">
                    {file.fileData && <source src={file.fileData} type={file.type} />}
                  </video>
                </div>
              )}

              {/* OTHER FORMATS (Word, Excel, Zip, etc.) */}
              {!isImage && !isPdf && !isText && !isAudio && !isVideo && (
                <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center max-w-md space-y-4">
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
                      Tải về mở trên máy
                    </button>
                    <button
                      onClick={() => onOpenZaloShare(file)}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-2"
                    >
                      Chia sẻ qua Zalo
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Sidebar: Details & Expiry Info */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-200 bg-white p-5 overflow-y-auto space-y-5">
            
            {/* Expiration Status Card */}
            <div className={`p-4 rounded-xl border ${expInfo.colorClass.border} ${expInfo.colorClass.bg} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Hạn hiệu lực
                </span>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${expInfo.colorClass.badge}`}>
                  {expInfo.label}
                </span>
              </div>
              
              <div className="text-xs space-y-1 pt-1">
                <div className="flex justify-between text-slate-600">
                  <span>Ngày bắt đầu:</span>
                  <span className="font-medium text-slate-800">{formatDateVN(file.validFrom)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Ngày kết thúc:</span>
                  <span className="font-medium text-slate-800">{formatDateVN(file.expiresAt)}</span>
                </div>
              </div>

              {/* Extend Expiry CTA */}
              <button
                onClick={() => onExtendValidity(file)}
                className="w-full mt-2 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Gia hạn hiệu lực
              </button>
            </div>

            {/* Metadata Summary */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Thông tin tài liệu
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Phân loại:</span>
                  <span className="font-medium text-slate-800">{getCategoryLabel(file.category)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Dung lượng:</span>
                  <span className="font-medium text-slate-800">{formatFileSize(file.size)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Định dạng:</span>
                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[140px]">{file.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Người tải lên:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[140px]">{file.uploader || 'Người dùng'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Ngày tạo:</span>
                  <span className="font-medium text-slate-800">{formatDateVN(file.createdAt)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Lượt chia sẻ Zalo:</span>
                  <span className="font-medium text-blue-600">{file.shareCount || 0} lượt</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {file.notes && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ghi chú
                </h4>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  {file.notes}
                </div>
              </div>
            )}

            {/* Tags */}
            {file.tags && file.tags.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  Nhãn phân loại
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {file.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Zalo Quick Share Action */}
            <div className="pt-2">
              <button
                onClick={() => onOpenZaloShare(file)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Chia sẻ ngay qua Zalo
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
