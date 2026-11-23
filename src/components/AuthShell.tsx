import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Logo } from './ui';

/** Layout dividido do login (login.xml): formulário à esquerda, foto editorial e frase à direita. */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto grid min-h-dvh max-w-[1280px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_472px] lg:gap-16 lg:px-[60px]">
        <div className="flex flex-col px-4 pb-10 pt-6 sm:px-8 lg:px-5 lg:py-14">
          <Logo size={44} textClass="text-[22px]" />
          <div className="flex flex-1 items-center">
            <div className="w-full max-w-[440px] py-10 lg:py-6">{children}</div>
          </div>
        </div>

        <aside className="relative hidden py-[65px] lg:block" aria-hidden>
          <img
            src="/brand/login.jpg"
            alt=""
            className="h-full max-h-[760px] min-h-[540px] w-full rounded-[32px] object-cover"
          />
          <figure className="absolute bottom-[calc(65px+56px)] -left-[58px] w-[390px] rounded-[24px] bg-cream px-6 py-5">
            <blockquote className="font-display text-[19px] font-medium leading-snug text-ink">
              “As melhores memórias são aquelas que guardamos com brilho no olhar.”
            </blockquote>
          </figure>
        </aside>
      </div>
    </div>
  );
}

export function GoogleButton({ onClick, loading, children }: { onClick: () => void; loading?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex h-[52px] w-full items-center justify-center gap-3 rounded-full border border-divider bg-paper text-base font-semibold text-ink transition-colors hover:bg-sand/60 disabled:opacity-60"
    >
      {loading ? (
        <LoaderCircle className="size-5 animate-spin" aria-hidden />
      ) : (
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
      )}
      {children}
    </button>
  );
}

export function OrDivider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <span className="h-px flex-1 bg-divider" />
      {children}
      <span className="h-px flex-1 bg-divider" />
    </div>
  );
}
