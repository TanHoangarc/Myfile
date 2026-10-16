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
    case 'template': return '1. File mẫu';
    case 'contract': return '2. Hợp đồng';
    case 'id_card':
    case 'certificate': return '3. Giấy tờ tuỳ thân';
    case 'other':
    case 'report': return '4. Tài liệu khác';
    case 'invoice': return '5. Hoá đơn quyết toán';
    default:
      return '4. Tài liệu khác';
  }
}

export function getCleanCategoryName(category: FileCategory): string {
  switch (category) {
    case 'template': return 'File mẫu';
    case 'contract': return 'Hợp đồng';
    case 'id_card':
    case 'certificate': return 'Giấy tờ tuỳ thân';
    case 'other':
    case 'report': return 'Tài liệu khác';
    case 'invoice': return 'Hoá đơn quyết toán';
    default:
      return 'Tài liệu khác';
  }
}

export function downloadFile(file: StoredFile): void {
  try {
    let downloadUrl = '';
    let shouldRevoke = false;

    if (file.fileData && file.fileData.startsWith('data:')) {
      try {
        const parts = file.fileData.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (file.type || 'application/octet-stream');
        const binary = atob(parts[1]);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mime });
        downloadUrl = URL.createObjectURL(blob);
        shouldRevoke = true;
      } catch (convErr) {
        console.warn('Fallback using raw data URL for download:', convErr);
        downloadUrl = file.fileData;
      }
    } else if (file.fileData && file.fileData.startsWith('blob:')) {
      downloadUrl = file.fileData;
    } else if (file.fileData && file.fileData.startsWith('http')) {
      downloadUrl = file.fileData;
    } else {
      // If no data URL is attached, generate a descriptive text blob
      const content = `TÊN TÀI LIỆU: ${file.name}\nNHÓM TÀI LIỆU: ${getCleanCategoryName(file.category)}\nTHƯ MỤC CON: ${file.subfolder || 'Mặc định'}\nNGÀY TẢI LÊN: ${formatDateVN(file.createdAt)}\nHẠN HIỆU LỰC: ${file.expiresAt ? formatDateVN(file.expiresAt) : 'Vô thời hạn'}\nGHI CHÚ: ${file.notes || 'Không có'}\n\nNội dung tệp đã được bảo mật lưu trữ trên MyFile.`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      downloadUrl = URL.createObjectURL(blob);
      shouldRevoke = true;
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.originalName || file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (shouldRevoke) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 30000);
    }
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

// Starter files representation for the 5 main folders
export function getSampleFiles(): StoredFile[] {
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextWeek = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return [
    {
      id: 'demo-template-1',
      name: 'Mẫu hợp đồng lao động chuẩn 2026.docx',
      originalName: 'Mau_hop_dong_lao_dong_2026.docx',
      size: 48500,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      category: 'template',
      subfolder: 'Mẫu hợp đồng',
      notes: 'Mẫu chuẩn ban hành áp dụng cho nhân sự khối văn phòng',
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-contract-1',
      name: 'Hợp đồng thuê mặt bằng văn phòng 2026.pdf',
      originalName: 'Hop_dong_thue_van_phong_2026.pdf',
      size: 142000,
      type: 'application/pdf',
      category: 'contract',
      subfolder: 'Hợp đồng kinh tế',
      validFrom: '2026-01-01',
      expiresAt: nextMonth,
      notes: 'Hợp đồng thuê sàn văn phòng tầng 8, thanh toán 3 tháng/lần',
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-id-1',
      name: 'CCCD gắn chip - Giám đốc đại diện.jpg',
      originalName: 'CCCD_NguyenVanA.jpg',
      size: 215000,
      type: 'image/jpeg',
      category: 'id_card',
      subfolder: 'CCCD / Hộ chiếu',
      validFrom: '2024-05-10',
      expiresAt: nextYear,
      notes: 'Bản quét 2 mặt rõ nét phục vụ mở tài khoản ngân hàng và ký số',
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-other-1',
      name: 'Biên bản bàn giao trang thiết bị IT.pdf',
      originalName: 'Bien_ban_ban_giao_IT.pdf',
      size: 89000,
      type: 'application/pdf',
      category: 'other',
      subfolder: 'Biên bản bàn giao',
      notes: 'Bàn giao laptop MacBook và màn hình Dell cho bộ phận kỹ thuật',
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-invoice-1',
      name: 'Hoá đơn VAT xăng xe & công tác phí Q1-2026.pdf',
      originalName: 'Hoa_don_VAT_xang_xe_Q1.pdf',
      size: 96000,
      type: 'application/pdf',
      category: 'invoice',
      subfolder: 'Hoá đơn VAT / Điện tử',
      validFrom: '2026-03-01',
      expiresAt: nextWeek,
      notes: 'Hóa đơn điện tử số 0048291 cần hoàn tất quyết toán tài chính',
      createdAt: new Date().toISOString()
    }
  ];
}
