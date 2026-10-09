import type { StoredFile, FileCategory, ExpirationInfo } from '../types/index.ts';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function calculateExpirationInfo(expiresAt?: string, warningDaysThreshold = 7): ExpirationInfo {
  if (!expiresAt) {
    return {
      status: 'permanent',
      daysRemaining: null,
      label: 'Vô thời hạn',
      colorClass: {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
        badge: 'bg-slate-100 text-slate-700 border-slate-300'
      }
    };
  }

  // Parse target date and current date (normalized to midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(expiresAt);
  target.setHours(0, 0, 0, 0);

  if (isNaN(target.getTime())) {
    return {
      status: 'permanent',
      daysRemaining: null,
      label: 'Không xác định',
      colorClass: {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
        badge: 'bg-slate-100 text-slate-700 border-slate-300'
      }
    };
  }

  const diffMs = target.getTime() - today.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    const passed = Math.abs(days);
    return {
      status: 'expired',
      daysRemaining: days,
      label: passed === 0 ? 'Hết hạn hôm nay' : `Hết hạn ${passed} ngày trước`,
      colorClass: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        badge: 'bg-rose-50 text-rose-700 border-rose-300'
      }
    };
  } else if (days === 0) {
    return {
      status: 'expiring_soon',
      daysRemaining: 0,
      label: 'Hết hạn hôm nay',
      colorClass: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-800 border-amber-300'
      }
    };
  } else if (days <= warningDaysThreshold) {
    return {
      status: 'expiring_soon',
      daysRemaining: days,
      label: `Còn ${days} ngày nữa`,
      colorClass: {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-800 border-amber-300'
      }
    };
  } else {
    return {
      status: 'active',
      daysRemaining: days,
      label: `Còn ${days} ngày`,
      colorClass: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-300'
      }
    };
  }
}

export function detectMimeType(fileName: string, providedType?: string): string {
  if (providedType && providedType !== 'application/octet-stream' && providedType.trim() !== '') {
    return providedType;
  }
  const ext = fileName.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'bmp': return 'image/bmp';
    case 'txt': return 'text/plain';
    case 'csv': return 'text/csv';
    case 'json': return 'application/json';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls': return 'application/vnd.ms-excel';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    default: return providedType || 'application/octet-stream';
  }
}

export function getCategoryLabel(category: FileCategory): string {
  switch (category) {
    case 'contract': return 'Hợp đồng';
    case 'id_card': return 'Giấy tờ tùy thân';
    case 'certificate':
    case 'invoice':
    case 'report':
    case 'other':
    default:
      return 'Tài liệu khác';
  }
}

export function downloadFile(file: StoredFile): void {
  try {
    let url = file.fileData;

    if (!url) {
      // If no data URL is attached, generate a descriptive text blob
      const content = `TÊN TÀI LIỆU: ${file.name}\nLOẠI: ${getCategoryLabel(file.category)}\nNGÀY TẢI LÊN: ${formatDateVN(file.createdAt)}\nHẠN HIỆU LỰC: ${file.expiresAt ? formatDateVN(file.expiresAt) : 'Vô thời hạn'}\nGHI CHÚ: ${file.notes || 'Không có'}\n\nNội dung tệp đã được bảo mật lưu trữ trên MyFile.`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      url = URL.createObjectURL(blob);
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = file.originalName || file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('Download error:', err);
  }
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Sample files list is empty so user can add their own files
export function getSampleFiles(): StoredFile[] {
  return [];
}

export async function createImageThumbnail(dataUrl: string, maxDimension = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve('');
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        if (width <= maxDimension && height <= maxDimension && dataUrl.length < 300000) {
          resolve(dataUrl);
          return;
        }
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const thumb = canvas.toDataURL('image/jpeg', quality);
        resolve(thumb);
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
}
