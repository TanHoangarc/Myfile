import React from 'react';
import { 
  Files, 
  CheckCircle, 
  Clock, 
  AlertOctagon, 
  HardDrive, 
  AlertTriangle,
  ArrowRight,
  Share2
} from 'lucide-react';
import type { StoredFile } from '../types/index.ts';
import { formatFileSize } from '../utils/fileHelpers.ts';

interface StatsDashboardProps {
  files: StoredFile[];
  activeCount: number;
  expiringCount: number;
  expiredCount: number;
  totalSize: number;
  currentFilter: string;
  onSelectFilter: (filter: string) => void;
  onOpenZaloShare: () => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  files,
  activeCount,
  expiringCount,
  expiredCount,
  totalSize,
  currentFilter,
  onSelectFilter,
  onOpenZaloShare
}) => {
  return (
    <div className="space-y-4 mb-6">
      
      {/* Critical Alert Banner if there are expiring files */}
      {expiringCount > 0 && (
        <div className="bg-linear-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-amber-900">
                Cảnh báo tự động: Có {expiringCount} tệp sắp hết hiệu lực!
              </h4>
              <p className="text-xs text-amber-800">
                Các văn bản, chứng từ hoặc hợp đồng này sẽ hết hạn trong vài ngày tới. Hãy kiểm tra và gia hạn kịp thời.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => onSelectFilter('expiring_soon')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center gap-1.5 transition-colors"
            >
              Xem tệp sắp hết hạn
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenZaloShare}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs flex items-center gap-1 transition-colors"
              title="Gửi danh sách cảnh báo qua Zalo"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              Báo qua Zalo
            </button>
          </div>
        </div>
      )}

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: All Files */}
        <div
          onClick={() => onSelectFilter('all')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            currentFilter === 'all'
              ? 'bg-blue-50/80 border-blue-400 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tổng số tệp</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Files className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{files.length}</span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-400" />
              {formatFileSize(totalSize)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Tất cả tài liệu lưu trữ</div>
        </div>

        {/* Card 2: Active Files */}
        <div
          onClick={() => onSelectFilter('active')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            currentFilter === 'active'
              ? 'bg-emerald-50/80 border-emerald-400 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Còn hiệu lực</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600">{activeCount}</span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-full">
              Hợp lệ
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Thời hạn sử dụng an toàn</div>
        </div>

        {/* Card 3: Expiring Soon */}
        <div
          onClick={() => onSelectFilter('expiring_soon')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            currentFilter === 'expiring_soon'
              ? 'bg-amber-50/90 border-amber-400 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Sắp hết hạn</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600">{expiringCount}</span>
            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
              Cần chú ý
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Hết hạn trong vòng 7 ngày</div>
        </div>

        {/* Card 4: Expired */}
        <div
          onClick={() => onSelectFilter('expired')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            currentFilter === 'expired'
              ? 'bg-rose-50/90 border-rose-400 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Đã hết hiệu lực</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-600">{expiredCount}</span>
            <span className="text-xs font-medium text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">
              Hết hạn
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Cần gia hạn hoặc thanh lý</div>
        </div>

      </div>

    </div>
  );
};
