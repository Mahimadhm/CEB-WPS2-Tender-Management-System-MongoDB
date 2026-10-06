import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Menu, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const name = user?.name || 'User';
  const email = user?.email || '';

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;

    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/records')) return 'Records Management';
    if (path.includes('/categories')) return 'Category Management';
    if (path.includes('/departments')) return 'Department Management';
    if (path.includes('/tec-staff')) return 'Staff';
    if (path.includes('/bidders')) return 'Supplier Management';
    if (path.includes('/bid-opening')) return 'TEC Committee';
    if (path.includes('/users')) return 'User Management';
    if (path.includes('/audit-log')) return 'Audit Log';
    if (path.includes('/export')) return 'Export Data';

    return 'Tender Management';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <h1 className="text-xl font-semibold text-slate-800">
          {getPageTitle()}
        </h1>
      </div>

      <div ref={profileRef} className="relative">
        <button
          type="button"
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-colors"
          aria-expanded={isProfileOpen}
          aria-haspopup="menu"
        >
          <div className="hidden sm:block text-right leading-tight">
            <p className="text-sm font-medium text-slate-900">
              {name}
            </p>
            <p className="text-xs text-slate-500">
              {email}
            </p>
          </div>

          <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>

          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              isProfileOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isProfileOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            role="menu"
          >
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              role="menuitem"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
