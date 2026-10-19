import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as docx from 'docx-preview';
import mammoth from 'mammoth';
import { 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Copy, 
  Check, 
  Download, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import type { StoredFile } from '../types/index.ts';
import { formatFileSize, downloadFile } from '../utils/fileHelpers.ts';
import { generateSampleLaborContractDocx } from '../utils/sampleDocx.ts';

interface DocxViewerProps {
  file: StoredFile;
  dataUrl?: string;
  zoomLevel?: number;
  className?: string;
  onTextExtracted?: (text: string) => void;
}

export const DocxViewer: React.FC<DocxViewerProps> = ({
  file,
  dataUrl,
  zoomLevel: externalZoom,
  className = '',
  onTextExtracted
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalZoom, setInternalZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [useMammothFallback, setUseMammothFallback] = useState(false);
  const [mammothHtml, setMammothHtml] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [stats, setStats] = useState<{ wordCount: number; charCount: number }>({ wordCount: 0, charCount: 0 });

  const activeZoom = externalZoom !== undefined ? externalZoom : internalZoom;

  const handleZoomIn = () => setInternalZoom((z) => Math.min(z + 0.2, 2.5));
  const handleZoomOut = () => setInternalZoom((z) => Math.max(z - 0.2, 0.6));
  const handleResetZoom = () => setInternalZoom(1);

  // Convert dataURL or remote URL to ArrayBuffer
  const getArrayBuffer = async (): Promise<ArrayBuffer> => {
    let rawData = dataUrl || file.fileData;
    if (!rawData) {
      try {
        rawData = await generateSampleLaborContractDocx();
      } catch {
        throw new Error('Không tìm thấy dữ liệu tệp DOCX');
      }
    }

    if (rawData.startsWith('data:')) {
      const parts = rawData.split(',');
      const base64 = parts[1] || '';
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }

    // If it's a blob URL or http URL
    const response = await fetch(rawData);
    if (!response.ok) {
      throw new Error(`Tải tệp không thành công: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  };

  useEffect(() => {
    let isCancelled = false;

    const renderDocument = async () => {
      setLoading(true);
      setError(null);
      setUseMammothFallback(false);
      setMammothHtml('');

      try {
        const buffer = await getArrayBuffer();
        if (isCancelled) return;

        // Try extracting text & stats using mammoth
        try {
          const mammothResult = await mammoth.extractRawText({ arrayBuffer: buffer.slice(0) });
          if (!isCancelled && mammothResult.value) {
            const text = mammothResult.value.trim();
            setExtractedText(text);
            onTextExtracted?.(text);
            const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
            setStats({ wordCount: words, charCount: text.length });
          }
        } catch (e) {
          console.warn('Mammoth text extraction warning:', e);
        }

        // 1. Primary engine: docx-preview for high fidelity page rendering
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          try {
            await docx.renderAsync(buffer, containerRef.current, undefined, {
              className: 'docx-preview-content',
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
              ignoreFonts: false,
              breakPages: true,
              useBase64URL: true,
              trimXmlDeclaration: true,
              debug: false
            });

            if (!isCancelled) {
              setLoading(false);
              return;
            }
          } catch (renderErr) {
            console.warn('docx-preview failed, attempting mammoth HTML fallback...', renderErr);
          }
        }

        // 2. Fallback engine: mammoth convertToHtml
        if (!isCancelled) {
          try {
            const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
            if (!isCancelled) {
              setMammothHtml(htmlResult.value);
              setUseMammothFallback(true);
              setLoading(false);
              return;
            }
          } catch (mammothErr: any) {
            console.error('All docx renderers failed:', mammothErr);
            if (!isCancelled) {
              setError(mammothErr?.message || 'Không thể đọc nội dung định dạng DOCX này.');
              setLoading(false);
            }
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('DOCX load error:', err);
          setError(err?.message || 'Không thể mở xem trước tài liệu DOCX.');
          setLoading(false);
        }
      }
    };

    renderDocument();

    return () => {
      isCancelled = true;
    };
  }, [file.id, dataUrl, file.fileData]);

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      
      {/* Quick Toolbar for DOCX - Exactly matches A4 paper width */}
      <div className="w-full max-w-[794px] md:w-[794px] mb-3 px-4 py-2 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-2 z-10 shrink-0">
        
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shadow-2xs">
            W
          </div>
          <span className="font-semibold text-slate-800 truncate max-w-[170px] sm:max-w-xs">{file.name}</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
            📄 Khổ A4 (210 × 297 mm)
          </span>
          {stats.wordCount > 0 && (
            <span className="hidden md:inline-block text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
              {stats.wordCount.toLocaleString()} từ
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom Controls */}
          {externalZoom === undefined && (
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:bg-white rounded-md text-slate-700 transition-colors"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:bg-white rounded-md text-slate-700 transition-colors"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 hover:bg-white rounded-md text-slate-700 transition-colors"
                title="Đặt lại zoom"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <span className="text-[11px] font-mono font-semibold text-slate-600 px-1.5">
                {Math.round(internalZoom * 100)}%
              </span>
            </div>
          )}

          {/* Copy Text */}
          {extractedText && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 active:scale-98"
              title="Sao chép toàn bộ văn bản"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span className="hidden sm:inline">{isCopied ? 'Đã chép' : 'Chép nội dung'}</span>
            </button>
          )}

          {/* Direct Download */}
          <button
            onClick={() => downloadFile({ ...file, fileData: dataUrl || file.fileData })}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all active:scale-98"
            title="Tải tệp Word về máy"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tải về</span>
          </button>
        </div>

      </div>

      {/* Main Document Paper Workspace - Scales A4 sheets accurately */}
      <div 
        className="w-full flex flex-col items-center transition-transform duration-150 origin-top overflow-x-visible"
        style={{
          transform: activeZoom !== 1 ? `scale(${activeZoom})` : undefined,
          transformOrigin: 'top center'
        }}
      >
        
        {/* Loading State - Exact A4 sheet placeholder */}
        {loading && (
          <div className="w-full max-w-[794px] md:w-[794px] min-h-[1123px] bg-white shadow-2xl rounded-xs border border-slate-300 flex flex-col items-center justify-center p-8 space-y-3 my-2">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Đang đọc tài liệu Word DOCX...</p>
            <p className="text-xs text-slate-500">Đang thiết lập trang tài liệu đúng chuẩn khổ A4 (210 × 297 mm)</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="w-full max-w-[794px] md:w-[794px] min-h-[600px] bg-white shadow-2xl rounded-xs border border-slate-300 flex flex-col items-center justify-center p-8 text-center space-y-4 my-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs border border-amber-200">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="max-w-md">
              <h4 className="font-bold text-slate-800 text-base">Không thể tải trực tiếp bản xem trước</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {error} Bạn vẫn có thể tải tệp về để mở trực tiếp trong Microsoft Word hoặc Office 365.
              </p>
            </div>
            <button
              onClick={() => downloadFile({ ...file, fileData: dataUrl || file.fileData })}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Tải {file.name} về máy
            </button>
          </div>
        )}

        {/* 1. Primary Engine Container (docx-preview renders separate section.docx A4 sheets) */}
        <div 
          ref={containerRef} 
          className={`w-full flex flex-col items-center docx-viewer-wrapper ${useMammothFallback || loading || error ? 'hidden' : 'block'}`}
        />

        {/* 2. Fallback Mammoth HTML Container - Styled exactly like an A4 sheet */}
        {useMammothFallback && mammothHtml && !loading && !error && (
          <div className="w-full max-w-[794px] md:w-[794px] min-h-[1123px] bg-white shadow-2xl rounded-xs border border-slate-300 p-12 sm:p-20 text-slate-800 leading-relaxed text-sm sm:text-base prose prose-slate max-w-none flex flex-col justify-between my-2">
            <div>
              <div className="border-b-2 border-slate-800 pb-4 mb-8 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">{file.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">Dung lượng: {formatFileSize(file.size)}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200">
                  Tài liệu DOCX
                </span>
              </div>
              <div 
                dangerouslySetInnerHTML={{ __html: mammothHtml }} 
                className="space-y-4 font-serif leading-7"
              />
            </div>
            <div className="border-t border-slate-200 pt-4 mt-12 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>MyFile DOCX Reader</span>
              <span>Khổ giấy chuẩn A4 (210 × 297 mm)</span>
            </div>
          </div>
        )}

      </div>

      {/* Global CSS enhancements for docx preview styling */}
      <style>{`
        .docx-viewer-wrapper {
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }
        .docx-viewer-wrapper .docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: 100% !important;
        }
        /* DESKTOP: EXACT A4 PAPER DIMENSIONS (210mm x 297mm = 794px x 1123px at 96 DPI) */
        @media (min-width: 768px) {
          .docx-viewer-wrapper section.docx {
            width: 794px !important;
            max-width: 794px !important;
            min-height: 1123px !important;
            box-sizing: border-box !important;
            margin: 8px auto 32px auto !important;
            background: #ffffff !important;
            box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.08) !important;
            border-radius: 2px !important;
            border: 1px solid #cbd5e1 !important;
            padding: 72px 80px !important; /* Authentic 25mm Word document margins */
            position: relative !important;
          }
          /* Subtle watermark page indicator in bottom right corner of each A4 page */
          .docx-viewer-wrapper section.docx::after {
            content: "Khổ A4 (210 × 297 mm)";
            position: absolute;
            bottom: 14px;
            right: 24px;
            font-size: 10px;
            font-family: monospace;
            color: #94a3b8;
            opacity: 0.7;
          }
        }
        /* MOBILE VIEWPORT RESPONSIVENESS */
        @media (max-width: 767px) {
          .docx-viewer-wrapper section.docx {
            width: 100% !important;
            min-height: 500px !important;
            box-sizing: border-box !important;
            margin: 4px auto 16px auto !important;
            background: #ffffff !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
            border-radius: 6px !important;
            border: 1px solid #e2e8f0 !important;
            padding: 24px 16px !important;
          }
        }
        .docx-viewer-wrapper table {
          border-collapse: collapse !important;
          margin: 14px 0 !important;
          width: 100% !important;
        }
        .docx-viewer-wrapper td, .docx-viewer-wrapper th {
          border: 1px solid #cbd5e1 !important;
          padding: 6px 10px !important;
        }
      `}</style>
    </div>
  );
};
