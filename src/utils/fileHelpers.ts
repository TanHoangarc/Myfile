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

// Generate realistic initial sample documents
export function getSampleFiles(): StoredFile[] {
  const now = new Date();
  
  // File 1: Sắp hết hạn trong 3 ngày
  const exp1 = new Date();
  exp1.setDate(now.getDate() + 3);
  
  // File 2: Đã hết hạn 5 ngày trước
  const exp2 = new Date();
  exp2.setDate(now.getDate() - 5);

  // File 3: Còn hạn 60 ngày
  const exp3 = new Date();
  exp3.setDate(now.getDate() + 60);

  // File 4: Còn hạn 180 ngày
  const exp4 = new Date();
  exp4.setDate(now.getDate() + 180);

  return [
    {
      id: 'doc-hop-dong-2026',
      name: 'Hop-Dong-Kinh-Te-Doi-Tac-2026.pdf',
      originalName: 'Hop-Dong-Kinh-Te-Doi-Tac-2026.pdf',
      size: 1420500,
      type: 'application/pdf',
      category: 'contract',
      validFrom: '2026-01-15',
      expiresAt: exp1.toISOString().split('T')[0],
      notes: 'Hợp đồng nguyên tắc cung ứng dịch vụ logistics năm 2026, cần liên hệ đối tác gia hạn trước khi hết hiệu lực.',
      tags: ['HopDong', 'DoiTac', 'QuanTrong'],
      uploader: 'Hoàng Đan',
      uploaderEmail: 'hoangdan.xnk@gmail.com',
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
      shareCount: 4
    },
    {
      id: 'doc-chung-chi-iso',
      name: 'Chung-Chi-ISO-9001-2015.pdf',
      originalName: 'Chung-Chi-ISO-9001-2015.pdf',
      size: 2150000,
      type: 'application/pdf',
      category: 'certificate',
      validFrom: '2023-10-01',
      expiresAt: exp2.toISOString().split('T')[0],
      notes: 'Chứng chỉ quản lý chất lượng ISO 9001:2015 - Đã hết hạn, cần hoàn thiện hồ sơ tái đánh giá.',
      tags: ['ISO', 'ChungChi', 'KiemDinh'],
      uploader: 'Ban Quản lý CL',
      uploaderEmail: 'hoangdan.xnk@gmail.com',
      createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
      shareCount: 8
    },
    {
      id: 'doc-hoa-don-vat',
      name: 'Hoa-Don-GTGT-Dich-Vu-So-002891.pdf',
      originalName: 'Hoa-Don-GTGT-Dich-Vu-So-002891.pdf',
      size: 489000,
      type: 'application/pdf',
      category: 'invoice',
      validFrom: '2026-09-01',
      expiresAt: exp3.toISOString().split('T')[0],
      notes: 'Hóa đơn điện tử thanh toán cước phần mềm quản lý kho bãi.',
      tags: ['HoaDon', 'KeToan', 'VAT'],
      uploader: 'Phòng Kế toán',
      uploaderEmail: 'hoangdan.xnk@gmail.com',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      shareCount: 2
    },
    {
      id: 'doc-cccd-giam-doc',
      name: 'CCCD-Gan-Chip-Nguoi-Dai-Dien-PL.jpg',
      originalName: 'CCCD-Gan-Chip-Nguoi-Dai-Dien-PL.jpg',
      size: 890400,
      type: 'image/jpeg',
      category: 'id_card',
      validFrom: '2024-05-10',
      expiresAt: exp4.toISOString().split('T')[0],
      notes: 'Bản quét căn cước công dân gắn chip phục vụ giao dịch ngân hàng & cấp chữ ký số.',
      tags: ['CCCD', 'PhapLy', 'BaoMat'],
      uploader: 'Hoàng Đan',
      uploaderEmail: 'hoangdan.xnk@gmail.com',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      shareCount: 1
    },
    {
      id: 'doc-quy-che-noi-bo',
      name: 'Quy-Che-Bao-Mat-Du-Lieu-Noi-Bo.docx',
      originalName: 'Quy-Che-Bao-Mat-Du-Lieu-Noi-Bo.docx',
      size: 615000,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      category: 'report',
      validFrom: '2026-01-01',
      expiresAt: undefined, // Vô thời hạn
      notes: 'Văn bản quy định nội bộ về bảo mật tài liệu và lưu trữ đám mây.',
      tags: ['QuyDinh', 'NoiBo'],
      uploader: 'Phòng Hành chính',
      uploaderEmail: 'hoangdan.xnk@gmail.com',
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      shareCount: 3
    }
  ];
}
