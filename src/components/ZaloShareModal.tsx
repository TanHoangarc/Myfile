import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  QrCode, 
  ExternalLink, 
  MessageSquare, 
  FileText, 
  Download
} from 'lucide-react';
import type { StoredFile } from '../types/index.ts';
import { 
  generateQRCodeDataUrl, 
  getFileShareUrl, 
  generateZaloShareMessage, 
  openZaloShare 
} from '../utils/zaloShare.ts';
import { playAlertSound } from '../utils/notificationService.ts';

interface ZaloShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file?: StoredFile | null;
  onShared?: (fileId?: string) => void;
}

export const ZaloShareModal: React.FC<ZaloShareModalProps> = ({
  isOpen,
  onClose,
  file,
  onShared
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [shareTab, setShareTab] = useState<'link' | 'qr' | 'message'>('link');

  const shareUrl = getFileShareUrl(file?.id);
  const zaloMessage = generateZaloShareMessage(file || undefined);

  useEffect(() => {
    if (isOpen) {
      generateQRCodeDataUrl(shareUrl).then((url) => setQrDataUrl(url));
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    playAlertSound('success');
    if (onShared && file) onShared(file.id);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(zaloMessage);
    setCopiedMessage(true);
    playAlertSound('success');
    if (onShared && file) onShared(file.id);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleOpenZalo = () => {
    openZaloShare(shareUrl, file?.name, zaloMessage);
    if (onShared && file) onShared(file.id);
  };

  const handleOpenZaloWeb = () => {
    window.open(`https://chat.zalo.me/?url=${encodeURIComponent(shareUrl)}`, '_blank');
    if (onShared && file) onShared(file.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-base">
              Z
            </div>
            <div>
              <h3 className="font-bold text-base">Chia sẻ qua Zalo</h3>
              <p className="text-xs text-blue-100">
                {file ? `Tệp: ${file.name}` : 'Chia sẻ toàn bộ trang quản lý tệp'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-4 text-xs font-semibold">
          <button
            onClick={() => setShareTab('link')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
              shareTab === 'link'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Liên kết & Zalo Web
          </button>
          <button
            onClick={() => setShareTab('qr')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
              shareTab === 'qr'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Mã QR Zalo Mobile
          </button>
          <button
            onClick={() => setShareTab('message')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
              shareTab === 'message'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Nội dung tin nhắn
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* TAB 1: Link & Direct Buttons */}
          {shareTab === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Đường dẫn xem trực tiếp
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 select-all focus:outline-hidden"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Đã chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons for Zalo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleOpenZalo}
                  className="p-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-98"
                >
                  <div className="w-5 h-5 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-xs">
                    Z
                  </div>
                  <span>Gửi qua Zalo ngay</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                </button>

                <button
                  onClick={handleOpenZaloWeb}
                  className="p-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-98"
                >
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>Mở Chat.Zalo.me</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-800 flex items-start gap-2">
                <span className="font-bold shrink-0">💡 Mẹo:</span>
                <span>
                  Người nhận qua Zalo có thể mở liên kết để xem tài liệu trực tiếp trên trình duyệt hoặc tải về máy mà không cần cài đặt ứng dụng phụ trợ.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: QR Code */}
          {shareTab === 'qr' && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs inline-block mx-auto">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Zalo QR Code"
                    className="w-56 h-56 mx-auto rounded-lg"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                    Đang tạo mã QR...
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-800">
                  Quét mã bằng ứng dụng Zalo trên điện thoại
                </p>
                <p className="text-[11px] text-slate-500">
                  Mở ứng dụng Zalo &gt; Chọn biểu tượng [Quét mã QR] ở góc trên để mở và lưu tệp.
                </p>
              </div>

              {qrDataUrl && (
                <div className="flex justify-center">
                  <a
                    href={qrDataUrl}
                    download={`Zalo-QR-${file?.id || 'MyFile'}.png`}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Lưu ảnh QR Code
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Pre-formatted Message */}
          {shareTab === 'message' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Mẫu tin nhắn sẵn có để dán vào nhóm Zalo
              </label>
              <textarea
                readOnly
                rows={6}
                value={zaloMessage}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed focus:outline-hidden"
              />
              <button
                onClick={handleCopyMessage}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
              >
                {copiedMessage ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Đã sao chép tin nhắn Zalo!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép toàn bộ tin nhắn để dán vào Zalo</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
