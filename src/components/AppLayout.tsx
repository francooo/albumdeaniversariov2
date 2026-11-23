import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { House, BookOpen, UserRound, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Logo } from './ui';
import { getPlan } from '../lib/plans';

const NAV = [
  { to: '/inicio', label: 'Início', Icon: House, match: ['/inicio'] },
  { to: '/albums', label: 'Meus álbuns', Icon: BookOpen, match: ['/albums'] },
  { to: '/conta', label: 'Conta', Icon: UserRound, match: ['/conta', '/privacidade'] },
];

interface AppLayoutProps {
  children: ReactNode;
  /** Classe de largura do conteúdo. Padrão: 1160 px (1280 − 2×60 do handoff). */
  maxWidth?: string;
  /** Item da navegação destacado quando a rota não está na lista (ex.: edição de álbum → Meus álbuns). */
  activeOverride?: string;
}

export default function AppLayout({ children, maxWidth = 'max-w-[1160px]', activeOverride }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (item: (typeof NAV)[number]) =>
    activeOverride ? activeOverride === item.to : item.match.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-dvh bg-cream text-ink">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-paper focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-40 border-b border-divider bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center gap-6 px-4 sm:px-8 lg:px-[60px]">
          <Logo to="/inicio" />

          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={isActive(item) ? 'page' : undefined}
                className={`inline-flex h-10 items-center rounded-full px-5 text-sm transition-colors ${
                  isActive(item) ? 'bg-sand font-semibold text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div ref={menuRef} className="relative ml-auto">
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Menu da conta"
              className="flex items-center gap-2 rounded-full p-1 hover:bg-sand/70"
            >
              <Avatar name={user?.name} src={user?.avatar_url} size={34} />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-[calc(100%+8px)] w-64 animate-pop-in rounded-[22px] border border-divider bg-paper p-2">
                <div className="px-3 pb-2 pt-2">
                  <p className="truncate font-bold text-ink">{user?.name}</p>
                  <p className="truncate text-sm text-muted">{user?.email}</p>
                  <p className="mt-1 text-sm text-sage-text">Plano {getPlan(user?.plan_type).name}</p>
                </div>
                <div className="my-1 h-px bg-divider" />
                <MenuLink to="/conta" icon={<UserRound className="size-4" />}>Conta e planos</MenuLink>
                <MenuLink to="/privacidade" icon={<Shield className="size-4" />}>Privacidade</MenuLink>
                <button
                  role="menuitem"
                  type="button"
                  onClick={handleLogout}
                  className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-sm text-ink hover:bg-sand"
                >
                  <LogOut className="size-4" /> Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="conteudo" className={`mx-auto w-full ${maxWidth} px-4 pb-28 pt-6 sm:px-8 md:pb-16 md:pt-8 lg:px-0`}>
        {children}
      </main>

      {/* Navegação inferior no mobile */}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {NAV.map(({ to, label, Icon, ...item }) => {
            const active = isActive({ to, label, Icon, ...item });
            return (
              <Link key={to} to={to} aria-current={active ? 'page' : undefined} className="flex h-16 flex-col items-center justify-center gap-1 text-xs">
                <span className={`inline-flex h-8 w-14 items-center justify-center rounded-full ${active ? 'bg-sand text-ink' : 'text-muted'}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className={active ? 'font-bold text-ink' : 'text-muted'}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function MenuLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link role="menuitem" to={to} className="flex h-11 items-center gap-3 rounded-[14px] px-3 text-sm text-ink hover:bg-sand">
      {icon}
      {children}
    </Link>
  );
}
