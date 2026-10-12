import type { FileCategory } from '../types/index.ts';

export interface FolderDefinition {
  id: FileCategory;
  number: number;
  name: string;
  shortName: string;
  description: string;
  iconType: 'template' | 'contract' | 'id_card' | 'other' | 'invoice';
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  folderBg: string;
  folderText: string;
  defaultSubfolders: string[];
}

export const MAIN_FOLDERS: FolderDefinition[] = [
  {
    id: 'template',
    number: 1,
    name: 'File mẫu',
    shortName: 'File mẫu',
    description: 'Biểu mẫu, mẫu hợp đồng, mẫu văn bản, tờ khai chuẩn',
    iconType: 'template',
    color: 'emerald',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    folderBg: 'bg-emerald-500/10 text-emerald-700',
    folderText: 'text-emerald-700',
    defaultSubfolders: ['Mẫu hợp đồng', 'Mẫu tờ khai & đơn từ', 'Mẫu biên bản', 'Biểu mẫu quy trình']
  },
  {
    id: 'contract',
    number: 2,
    name: 'Hợp đồng',
    shortName: 'Hợp đồng',
    description: 'Hợp đồng kinh tế, dịch vụ, lao động, mua bán, thuê tài sản',
    iconType: 'contract',
    color: 'blue',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    folderBg: 'bg-blue-500/10 text-blue-700',
    folderText: 'text-blue-700',
    defaultSubfolders: ['Hợp đồng kinh tế', 'Hợp đồng lao động', 'Hợp đồng dịch vụ', 'Phụ lục hợp đồng']
  },
  {
    id: 'id_card',
    number: 3,
    name: 'Giấy tờ tuỳ thân',
    shortName: 'Giấy tờ tuỳ thân',
    description: 'Căn cước công dân (CCCD), CMND, Hộ chiếu, Giấy phép lái xe, Bằng cấp',
    iconType: 'id_card',
    color: 'purple',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    folderBg: 'bg-purple-500/10 text-purple-700',
    folderText: 'text-purple-700',
    defaultSubfolders: ['CCCD / Hộ chiếu', 'Bằng lái xe', 'Bằng cấp & Chứng chỉ', 'Hồ sơ cá nhân']
  },
  {
    id: 'other',
    number: 4,
    name: 'Tài liệu khác',
    shortName: 'Tài liệu khác',
    description: 'Biên bản bàn giao, quy chế nội bộ, đề án, công văn, tài liệu dự án',
    iconType: 'other',
    color: 'slate',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    folderBg: 'bg-slate-500/10 text-slate-700',
    folderText: 'text-slate-700',
    defaultSubfolders: ['Biên bản bàn giao', 'Quy chế & Nội quy', 'Công văn & Thông báo', 'Tài liệu tham khảo']
  },
  {
    id: 'invoice',
    number: 5,
    name: 'Hoá đơn quyết toán',
    shortName: 'Hoá đơn quyết toán',
    description: 'Hoá đơn GTGT / VAT, biên lai thanh toán, bảng kê quyết toán chi phí',
    iconType: 'invoice',
    color: 'amber',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    folderBg: 'bg-amber-500/10 text-amber-800',
    folderText: 'text-amber-800',
    defaultSubfolders: ['Hoá đơn VAT / Điện tử', 'Biên lai & Phiếu chi', 'Bảng kê quyết toán', 'Chứng từ ngân hàng']
  }
];

export function normalizeCategory(category?: string): FileCategory {
  if (!category) return 'other';
  if (category === 'template') return 'template';
  if (category === 'contract') return 'contract';
  if (category === 'id_card' || category === 'certificate') return 'id_card';
  if (category === 'invoice') return 'invoice';
  return 'other';
}

export function getFolderDefinition(category: FileCategory): FolderDefinition {
  const norm = normalizeCategory(category);
  return MAIN_FOLDERS.find((f) => f.id === norm) || MAIN_FOLDERS[3]; // default other
}
