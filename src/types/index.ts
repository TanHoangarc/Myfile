export type FileCategory = 
  | 'template'    // 1. File mẫu
  | 'contract'    // 2. Hợp đồng
  | 'id_card'     // 3. Giấy tờ tuỳ thân / CCCD
  | 'other'       // 4. Tài liệu khác
  | 'invoice'     // 5. Hoá đơn quyết toán
  | 'certificate' // Hỗ trợ tương thích cũ -> nhóm Giấy tờ tuỳ thân
  | 'report';     // Hỗ trợ tương thích cũ -> nhóm Tài liệu khác

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
  subfolder?: string; // Thư mục con trong nhóm (VD: Mẫu biên bản, Hợp đồng dịch vụ...)
  fileData?: string; // Base64 data URL, plain text, or blob reference
  hasChunks?: boolean; // Whether content is split across Firestore chunks
  chunkCount?: number;
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
