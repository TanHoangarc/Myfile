import React, { useState } from 'react';
import { X, Calendar, Clock, Check, AlertCircle } from 'lucide-react';
import type { StoredFile } from '../types/index.ts';
import { formatDateVN, calculateExpirationInfo } from '../utils/fileHelpers.ts';

interface ExtendExpiryModalProps {
  file: StoredFile | null;
  onClose: () => void;
  onConfirmExtend: (fileId: string, newExpiresAt?: string) => Promise<void>;
}

export const ExtendExpiryModal: React.FC<ExtendExpiryModalProps> = ({
  file,
  onClose,
  onConfirmExtend
}) => {
  const [newDate, setNewDate] = useState(() => {
    if (!file?.expiresAt) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split('T')[0];
    }
    // Default to +30 days from current expiry or today (whichever is later)
    const current = new Date(file.expiresAt);
    const today = new Date();
    const base = current > today ? current : today;
    base.setDate(base.getDate() + 30);
    return base.toISOString().split('T')[0];
  });
  const [isPermanent, setIsPermanent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!file) return null;

  const expInfo = calculateExpirationInfo(file.expiresAt);

  const applyDays = (days: number) => {
    setIsPermanent(false);
    const d = new Date();
    d.setDate(d.getDate() + days);
    setNewDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onConfirmExtend(file.id, isPermanent ? undefined : newDate);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Gia hạn thời hạn hiệu lực</h3>
              <p className="text-xs text-slate-500 truncate max-w-[240px]">{file.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Hạn hiện tại:</span>
              <span className="font-semibold text-slate-800">{formatDateVN(file.expiresAt)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Trạng thái:</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${expInfo.colorClass.badge}`}>
                {expInfo.label}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Ngày hết hạn mới
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Chuyển sang Vô thời hạn</span>
              </label>
            </div>

            <input
              type="date"
              value={newDate}
              disabled={isPermanent}
              onChange={(e) => setNewDate(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                isPermanent ? 'opacity-40 cursor-not-allowed bg-slate-100' : ''
              }`}
            />
          </div>

          {!isPermanent && (
            <div>
              <span className="text-[11px] text-slate-500 font-medium block mb-1.5">
                Gia hạn nhanh:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '+15 ngày', days: 15 },
                  { label: '+30 ngày', days: 30 },
                  { label: '+90 ngày', days: 90 },
                  { label: '+6 tháng', days: 180 },
                  { label: '+1 năm', days: 365 },
                  { label: '+2 năm', days: 730 },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => applyDays(item.days)}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang cập nhật...' : 'Xác nhận gia hạn'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
