import QRCode from 'qrcode';
import type { StoredFile } from '../types/index.ts';
import { formatDateVN, formatFileSize, getCategoryLabel, calculateExpirationInfo } from './fileHelpers.ts';

export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0068ff', // Zalo signature blue
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}

export function getFileShareUrl(fileId?: string, filter?: string): string {
  const origin = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  if (fileId) {
    params.set('fileId', fileId);
  }
  if (filter) {
    params.set('filter', filter);
  }
  const queryString = params.toString();
  return queryString ? `${origin}?${queryString}` : origin;
}

export function generateZaloShareMessage(file?: StoredFile, pageTitle = 'MyFile - Quản Lý Tệp Tin'): string {
  if (!file) {
    const url = getFileShareUrl();
    return `📋 Danh sách tệp tin & quản lý hạn dùng trên MyFile:\n🔗 Xem ngay tại: ${url}\n(Hệ thống theo dõi tự động tệp sắp hết hạn & lưu trữ Firebase)`;
  }

  const expInfo = calculateExpirationInfo(file.expiresAt);
  const shareUrl = getFileShareUrl(file.id);

  let statusEmoji = '🟢';
  if (expInfo.status === 'expired') statusEmoji = '🔴';
  else if (expInfo.status === 'expiring_soon') statusEmoji = '🟡';

  return `📄 [Tài liệu]: ${file.name}
📂 Phân loại: ${getCategoryLabel(file.category)}
💾 Dung lượng: ${formatFileSize(file.size)}
${statusEmoji} Tình trạng hạn dùng: ${expInfo.label} (Hạn đến: ${formatDateVN(file.expiresAt)})
${file.notes ? `📝 Ghi chú: ${file.notes}\n` : ''}🔗 Xem & Tải về trực tiếp qua MyFile:
${shareUrl}`;
}

export function openZaloShare(url: string, title?: string, message?: string): void {
  // Method 1: Zalo Web share link
  const zaloShareUrl = `https://zalo.me/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || 'Chia sẻ tài liệu MyFile')}`;
  
  // Try opening in new window or tab
  const width = 600;
  const height = 500;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  const popup = window.open(
    zaloShareUrl,
    'ZaloShareWindow',
    `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
  );

  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    // If pop-up blocked or inside restricted frame, fallback to opening directly or chat.zalo.me
    window.open(`https://chat.zalo.me/?url=${encodeURIComponent(url)}`, '_blank');
  }
}
