export type FileCategory = 
  | 'contract'    // Hợp đồng
  | 'certificate' // Chứng chỉ / Bằng cấp
  | 'invoice'     // Hóa đơn / Chứng từ
  | 'id_card'     // Giấy tờ tùy thân / CCCD
  | 'report'      // Báo cáo / Đề án
  | 'other';      // Tài liệu khác

export type ExpirationStatus = 
  | 'active'        // Còn hiệu lực (> warning threshold)
  | 'expiring_soon' // Sắp hết hạn (<= warning threshold, > 0)
  | 'expired'       // Đã hết hiệu lực (<= 0)
  | 'permanent';    // Vô thời hạn (không có ngày hết hạn)

export interface StoredFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  category: FileCategory;
  fileData?: string; // Base64 data URL, plain text, or blob reference
  validFrom?: string; // YYYY-MM-DD
  expiresAt?: string; // YYYY-MM-DD
  notes?: string;
  tags?: string[];
  uploader?: string;
  uploaderEmail?: string;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
  shareCount?: number;
}

export interface ExpirationInfo {
  status: ExpirationStatus;
  daysRemaining: number | null;
  label: string;
  colorClass: {
    bg: string;
    text: string;
    border: string;
    dot: string;
    badge: string;
  };
}

export interface NotificationSetting {
  warningDaysThreshold: number; // e.g. 7 days
  enableBrowserNotification: boolean;
  enableSound: boolean;
}
