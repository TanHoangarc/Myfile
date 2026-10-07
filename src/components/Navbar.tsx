import React, { useState } from 'react';
import { 
  Bell, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  FolderLock
} from 'lucide-react';
import type { User } from 'firebase/auth';

interface NavbarProps {
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenUpload?: () => void;
  onOpenZaloShareAll?: () => void;
  expiringCount: number;
  expiredCount: number;
  onToggleNotificationDrawer: () => void;
  isNotificationDrawerOpen: boolean;
  totalFiles: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogin,
  onLogout,
  expiringCount,
  expiredCount,
  onToggleNotificationDrawer,
  isNotificationDrawerOpen,
  totalFiles
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const totalAlerts = expiringCount + expiredCount;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <FolderLock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">MyFile</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                Firebase Cloud
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Expiration Notification Bell */}
          <div className="relative">
            <button
              onClick={onToggleNotificationDrawer}
              className={`relative p-2 rounded-lg border transition-all ${
                totalAlerts > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Thông báo tệp sắp hết hạn & hết hiệu lực"
            >
              <Bell className="w-5 h-5" />
              {totalAlerts > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-rose-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {totalAlerts}
                </span>
              )}
            </button>
          </div>

          {/* Auth Button / User Profile */}
          <div className="relative">
            {currentUser ? (
              <div>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 pl-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white transition-all text-xs font-medium"
                >
                  <img
                    src={currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.email || 'User'}`}
                    alt="avatar"
                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                  />
                  <span className="hidden md:inline max-w-[120px] truncate text-slate-700 font-medium">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {currentUser.displayName || 'Tài khoản Google'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã kết nối Firebase
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                title="Đăng nhập tài khoản Google để bảo mật và đồng bộ"
              >
                <LogIn className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
