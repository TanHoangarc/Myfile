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
      
      {/* Quick Toolbar for DOCX */}
      <div className="w-full max-w-[850px] mb-3 px-4 py-2 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-2 z-10">
        
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] border border-blue-200">
            W
          </div>
          <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
          {stats.wordCount > 0 && (
            <span className="hidden sm:inline-block text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
              {stats.wordCount.toLocaleString()} từ • {stats.charCount.toLocaleString()} ký tự
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

      {/* Main Document Paper Container */}
      <div 
        className="w-full max-w-[850px] min-h-[900px] bg-white shadow-2xl rounded-sm border border-slate-300 relative transition-transform duration-150 origin-top overflow-x-auto"
        style={{
          transform: activeZoom !== 1 ? `scale(${activeZoom})` : undefined,
          transformOrigin: 'top center'
        }}
      >
        
        {/* Loading State */}
        {loading && (
          <div className="min-h-[500px] flex flex-col items-center justify-center p-8 space-y-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Đang đọc tài liệu Word DOCX...</p>
            <p className="text-xs text-slate-500">Đang hiển thị trang văn bản và định dạng gốc</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-4">
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

        {/* 1. Primary Engine Container (docx-preview) */}
        <div 
          ref={containerRef} 
          className={`w-full min-h-[700px] docx-viewer-wrapper p-4 sm:p-8 ${useMammothFallback || loading || error ? 'hidden' : 'block'}`}
        />

        {/* 2. Fallback Mammoth HTML Container */}
        {useMammothFallback && mammothHtml && !loading && !error && (
          <div className="p-8 sm:p-14 text-slate-800 leading-relaxed text-sm sm:text-base prose prose-slate max-w-none">
            <div 
              dangerouslySetInnerHTML={{ __html: mammothHtml }} 
              className="space-y-4 font-serif leading-7"
            />
          </div>
        )}

      </div>

      {/* Global CSS enhancements for docx preview styling */}
      <style>{`
        .docx-preview-content {
          background-color: transparent !important;
          box-shadow: none !important;
          margin: 0 auto !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .docx-preview-content section.docx {
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08) !important;
          margin-bottom: 24px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          box-sizing: border-box !important;
        }
        .docx-preview-content table {
          border-collapse: collapse !important;
          margin: 12px 0 !important;
          width: 100% !important;
        }
        .docx-preview-content td, .docx-preview-content th {
          border: 1px solid #cbd5e1 !important;
          padding: 6px 10px !important;
        }
        @media (max-width: 640px) {
          .docx-preview-content section.docx {
            padding: 16px !important;
            width: 100% !important;
            min-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
