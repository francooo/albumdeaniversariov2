import { useAuth } from '../contexts/AuthContext';
import { ButtonLink, Logo } from '../components/ui';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cream px-6 text-center">
      <Logo size={44} textClass="text-[22px]" />
      <div>
        <p className="font-display text-7xl font-semibold text-terra">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Esta página não existe</h1>
        <p className="mt-2 max-w-sm text-muted">O endereço pode ter mudado ou a página foi removida.</p>
      </div>
      <ButtonLink to={user ? '/inicio' : '/login'}>{user ? 'Voltar para o início' : 'Ir para o login'}</ButtonLink>
    </div>
  );
}
