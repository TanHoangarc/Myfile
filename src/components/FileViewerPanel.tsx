import React, { useState, useEffect, useMemo } from 'react';
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
  ExternalLink,
  ChevronLeft,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import type { StoredFile } from '../types/index.ts';
import { 
  formatFileSize, 
  formatDateVN, 
  calculateExpirationInfo, 
  getCategoryLabel, 
  downloadFile 
} from '../utils/fileHelpers.ts';
import { retrieveFileContent, storeFileContent, dataUrlToBlobUrl } from '../utils/fileStorage.ts';
import { fetchFileContentFromFirestore } from '../firebase.ts';

interface FileViewerPanelProps {
  file: StoredFile | null;
  warningDaysThreshold: number;
  onOpenZaloShare: (file: StoredFile) => void;
  onExtendValidity: (file: StoredFile) => void;
  onDeleteFile: (file: StoredFile) => void;
  onBackToList?: () => void; // Mobile back button
  onFileDataLoaded?: (fileId: string, dataUrl: string) => void;
}

export const FileViewerPanel: React.FC<FileViewerPanelProps> = ({
  file,
  warningDaysThreshold,
  onOpenZaloShare,
  onExtendValidity,
  onDeleteFile,
  onBackToList,
  onFileDataLoaded
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loadedDataUrl, setLoadedDataUrl] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Load fileData from: 1) file.fileData, 2) IndexedDB, 3) Firebase Firestore
  useEffect(() => {
    let isMounted = true;
    if (!file) {
      setLoadedDataUrl('');
      return;
    }

    // Reset controls on file change
    setZoomLevel(1);
    setRotation(0);

    if (file.fileData) {
      setLoadedDataUrl(file.fileData);
      return;
    }

    // Try IndexedDB first, then Firestore
    setIsLoadingContent(true);
    retrieveFileContent(file.id)
      .then(async (localData) => {
        if (!isMounted) return;
        if (localData) {
          setLoadedDataUrl(localData);
          setIsLoadingContent(false);
          onFileDataLoaded?.(file.id, localData);
          return;
        }

        // Fetch from Firestore (supports chunks)
        try {
          const remoteData = await fetchFileContentFromFirestore(file.id);
          if (!isMounted) return;
          if (remoteData) {
            setLoadedDataUrl(remoteData);
            storeFileContent(file.id, remoteData).catch(() => {});
            onFileDataLoaded?.(file.id, remoteData);
          }
        } catch (err) {
          console.warn('Could not fetch file content from Firestore:', err);
        } finally {
          if (isMounted) setIsLoadingContent(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingContent(false);
      });

    return () => {
      isMounted = false;
    };
  }, [file?.id, file?.fileData]);

  // Convert to Blob URL for safe iframe / object rendering
  const blobUrl = useMemo(() => {
    const data = loadedDataUrl || file?.fileData || '';
    if (!data) return '';
    return dataUrlToBlobUrl(data);
  }, [loadedDataUrl, file?.fileData]);

  const expInfo = useMemo(() => {
    return file ? calculateExpirationInfo(file.expiresAt, warningDaysThreshold) : null;
  }, [file?.expiresAt, warningDaysThreshold]);

  // Extension & mime-type robust checking (computed unconditionally)
  const lowerName = file ? file.name.toLowerCase() : '';
  const effectiveData = loadedDataUrl || file?.fileData || '';

  const isImage = Boolean(file && (
    file.type.startsWith('image/') || 
    effectiveData.startsWith('data:image/') || 
    /\.(jpe?g|png|gif|webp|svg|bmp|ico|heic)$/i.test(lowerName)
  ));

  const isPdf = Boolean(file && (
    file.type === 'application/pdf' || 
    effectiveData.startsWith('data:application/pdf') || 
    /\.pdf$/i.test(lowerName)
  ));

  const isSpreadsheet = Boolean(file && (
    /\.(xlsx?|ods)$/i.test(lowerName) || 
    file.type.includes('excel') || 
    file.type.includes('spreadsheet')
  ));

  const isCsv = Boolean(file && (/\.csv$/i.test(lowerName) || file.type.includes('csv')));

  const isText = Boolean(file && (
    file.type.startsWith('text/') || 
    effectiveData.startsWith('data:text/') || 
    file.type.includes('json') || 
    isCsv ||
    /\.(txt|md|json|csv|log|xml|html|js|ts|css)$/i.test(lowerName)
  ));

  const isAudio = Boolean(file && (
    file.type.startsWith('audio/') || 
    effectiveData.startsWith('data:audio/') || 
    /\.(mp3|wav|ogg|m4a|aac)$/i.test(lowerName)
  ));

  const isVideo = Boolean(file && (
    file.type.startsWith('video/') || 
    effectiveData.startsWith('data:video/') || 
    /\.(mp4|webm|mov|mkv)$/i.test(lowerName)
  ));

  // Extract plain text string (unconditional hook)
  const textContent = useMemo(() => {
    if (!isText || !effectiveData) return '';
    if (effectiveData.startsWith('data:')) {
      try {
        const base64 = effectiveData.split(',')[1];
        return decodeURIComponent(escape(atob(base64)));
      } catch (e) {
        try {
          return atob(effectiveData.split(',')[1]);
        } catch {
          return effectiveData;
        }
      }
    }
    return effectiveData;
  }, [isText, effectiveData]);

  // CSV rows for table preview (unconditional hook)
  const csvRows = useMemo(() => {
    if (!isCsv || !textContent) return [];
    try {
      const lines = textContent.trim().split('\n').slice(0, 50); // Preview first 50 rows
      return lines.map((line) => line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, '')));
    } catch {
      return [];
    }
  }, [isCsv, textContent]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
  };
  const handlePrint = () => window.print();

  const handleOpenExternal = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    } else if (file) {
      downloadFile({ ...file, fileData: effectiveData });
    }
  };

  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Safe early return ONLY after ALL hooks are called
  if (!file) {
    return (
      <div className="h-full min-h-[550px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4 shadow-2xs">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">Chưa có tài liệu nào để hiển thị</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1.5">
          Danh sách tài liệu đang trống. Hãy nhấn nút "Tải tệp" ở khung bên trái để tải lên tài liệu của bạn.
        </p>
      </div>
    );
  }

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
            {isImage ? (
              <ImageIcon className="w-5 h-5" />
            ) : isSpreadsheet || isCsv ? (
              <FileSpreadsheet className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base truncate max-w-md" title={file.name}>
              {file.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="font-medium text-slate-700">{getCategoryLabel(file.category)}</span>
              <span>•</span>
              <span className="font-mono">{formatFileSize(file.size)}</span>
              {expInfo && (
                <>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${expInfo.colorClass.badge}`}>
                    {expInfo.label}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5">
          {/* Open full in new tab */}
          {(isPdf || isImage || blobUrl) && (
            <button
              onClick={handleOpenExternal}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              title="Mở trong tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

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
            onClick={() => downloadFile({ ...file, fileData: effectiveData })}
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
      <div className="flex-1 flex flex-col bg-slate-100/70 relative overflow-hidden min-h-[440px]">
        
        {/* Floating Controls for Image */}
        {isImage && effectiveData && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-slate-200/80">
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
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              title="Đặt lại"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-600 px-2 font-mono">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
        )}

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-3 sm:p-5">
          
          {isLoadingContent ? (
            <div className="text-center p-8 space-y-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Đang tải dữ liệu xem trước từ Firebase...</p>
            </div>
          ) : isImage && effectiveData ? (
            /* 1. IMAGE VIEWER */
            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center p-2">
              <img
                src={effectiveData}
                alt={file.name}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out'
                }}
                className="max-w-full max-h-[64vh] object-contain rounded-xl shadow-md border border-slate-200 bg-white"
              />
            </div>
          ) : isPdf && blobUrl ? (
            /* 2. PDF VIEWER: With toolbar and embedded view */
            <div className="w-full h-full min-h-[520px] flex flex-col bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-800 text-white flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{file.name}</span>
                  <span className="text-slate-400 font-mono">({formatFileSize(file.size)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenExternal}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở tab mới</span>
                  </button>
                  <button
                    onClick={() => downloadFile({ ...file, fileData: effectiveData })}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về</span>
                  </button>
                </div>
              </div>
              <iframe
                src={`${blobUrl}#toolbar=1&navpanes=0`}
                title={file.name}
                className="w-full flex-1 min-h-[500px] border-0"
              />
            </div>
          ) : isCsv && csvRows.length > 0 ? (
            /* 3. CSV SPREADSHEET TABLE VIEWER */
            <div className="w-full h-full max-h-[64vh] bg-white rounded-xl shadow-xs border border-slate-200 overflow-auto flex flex-col">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Xem trước dữ liệu bảng ({csvRows.length} dòng)</span>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Đã sao chép' : 'Sao chép CSV'}</span>
                </button>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      {csvRows[0].map((header, idx) => (
                        <th key={idx} className="p-2.5 border-r border-slate-200 last:border-r-0 whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {csvRows.slice(1).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2 border-r border-slate-100 last:border-r-0 whitespace-nowrap max-w-xs truncate">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : isText && textContent ? (
            /* 4. TEXT / CODE VIEWER */
            <div className="w-full h-full min-h-[450px] max-h-[65vh] bg-slate-900 text-slate-100 rounded-xl flex flex-col overflow-hidden shadow-inner font-mono text-xs">
              <div className="px-4 py-2 bg-slate-800 text-slate-300 flex items-center justify-between border-b border-slate-700 text-xs">
                <span>{file.name}</span>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-slate-300 hover:text-white"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Đã chép' : 'Sao chép văn bản'}</span>
                </button>
              </div>
              <div className="p-4 overflow-auto flex-1 leading-relaxed">
                <pre className="whitespace-pre-wrap select-text">{textContent}</pre>
              </div>
            </div>
          ) : isAudio && effectiveData ? (
            /* 5. AUDIO VIEWER */
            <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center space-y-4 max-w-md w-full">
              <h4 className="font-bold text-slate-800 text-sm">{file.name}</h4>
              <audio controls className="w-full">
                <source src={effectiveData} type={file.type} />
              </audio>
            </div>
          ) : isVideo && effectiveData ? (
            /* 6. VIDEO VIEWER */
            <div className="max-w-2xl w-full bg-black rounded-2xl overflow-hidden shadow-xl">
              <video controls className="w-full h-auto max-h-[65vh]">
                <source src={effectiveData} type={file.type} />
              </video>
            </div>
          ) : (
            /* 7. WORD / EXCEL / DOCUMENTS OR WHEN DATA IS AVAILABLE FOR DOWNLOAD */
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full space-y-4 my-auto">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                {isSpreadsheet ? (
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                ) : (
                  <FileText className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">{file.name}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Định dạng: <span className="font-semibold text-slate-700">{file.type || 'Tài liệu'}</span> • {formatFileSize(file.size)}
                </p>
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đã lưu trữ an toàn trên MyFile & Firebase</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => downloadFile({ ...file, fileData: effectiveData })}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải về máy tính</span>
                </button>
                <button
                  onClick={() => onOpenZaloShare(file)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Gửi qua Zalo</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Bottom Metadata & Notes Bar */}
      <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        
        {/* Validity Summary */}
        <div className={`p-3 rounded-xl border ${expInfo?.colorClass.border || 'border-slate-200'} ${expInfo?.colorClass.bg || 'bg-slate-50'} flex items-center justify-between`}>
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

        {/* Details & Uploader */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Người tải:</span>
            <span className="font-medium text-slate-800">{file.uploader || 'Người dùng'}</span>
          </div>
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Lượt gửi Zalo:</span>
            <span className="font-semibold text-blue-600">{file.shareCount || 0} lượt</span>
          </div>
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Ngày tạo:</span>
            <span className="font-medium text-slate-700">{formatDateVN(file.createdAt)}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
