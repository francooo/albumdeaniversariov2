import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function getPlanLabel(planType?: string): string {
  switch (planType) {
    case 'premium': return 'Plano Premium';
    case 'basic':
    case 'free':
    default:
      return 'Plano Básico';
  }
}

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/overview', icon: 'dashboard', label: 'Visão Geral' },
  { to: '/albums', icon: 'auto_stories', label: 'Meus Álbuns' },
  { to: '/uploads', icon: 'cloud_upload', label: 'Uploads' },
];

const SETTINGS_ITEMS: NavItem[] = [
  { to: '/account', icon: 'settings', label: 'Conta' },
  { to: '/privacy', icon: 'lock', label: 'Privacidade' },
];

interface AppLayoutProps {
  children: ReactNode;
  maxWidth?: string;
}

export default function AppLayout({ children, maxWidth = 'max-w-6xl' }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const SidebarContent = () => (
    <>
      <div className="p-5 md:p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-background-dark flex-shrink-0">
          <span className="material-symbols-outlined">auto_awesome_motion</span>
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">Memórias</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Álbum de Luxo</p>
        </div>
        {/* Close button - mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
          aria-label="Fechar menu"
        >
          <span className="material-symbols-outlined text-slate-400">close</span>
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive(item.to)
                ? 'bg-primary/20 text-slate-900 dark:text-white border-l-4 border-primary'
                : 'text-slate-600 dark:text-slate-300 hover:bg-primary/10'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive(item.to) ? 'text-primary' : ''}`}
              style={isActive(item.to) ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {item.icon}
            </span>
            <span className={`text-sm ${isActive(item.to) ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
          </Link>
        ))}

        <div className="pt-4 pb-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold px-3">Configurações</div>

        {SETTINGS_ITEMS.map(item => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive(item.to)
                ? 'bg-primary/20 text-slate-900 dark:text-white border-l-4 border-primary'
                : 'text-slate-600 dark:text-slate-300 hover:bg-primary/10'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive(item.to) ? 'text-primary' : ''}`}
              style={isActive(item.to) ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {item.icon}
            </span>
            <span className={`text-sm ${isActive(item.to) ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-primary/10 space-y-2">
        <Link to="/account" onClick={() => setSidebarOpen(false)} className="block">
          <div className="bg-primary/5 hover:bg-primary/10 transition-colors rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{authUser?.name || '...'}</p>
              <p className={`text-xs truncate font-medium ${authUser?.plan_type === 'premium' ? 'text-primary' : 'text-slate-500'}`}>
                {getPlanLabel(authUser?.plan_type)}
              </p>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
          </div>
        </Link>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="flex h-screen overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
          w-72 flex-shrink-0 border-r border-primary/20 bg-white dark:bg-background-dark flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-background-light dark:bg-background-dark min-w-0">
          {/* Top bar with hamburger */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white/50 dark:bg-background-dark/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Abrir menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
              {authUser?.name || 'Memórias'}
            </span>
          </div>

          <div className={`${maxWidth} mx-auto w-full px-4 md:px-8 py-6 md:py-8 flex-1`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
