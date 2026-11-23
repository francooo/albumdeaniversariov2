import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

/* ---------- Card ---------- */
type CardTone = 'sand' | 'paper' | 'dashed' | 'outline' | 'terra-soft';
const cardTones: Record<CardTone, string> = {
  sand: 'bg-sand',
  paper: 'bg-paper',
  outline: 'bg-paper border border-divider',
  dashed: 'bg-paper border-2 border-dashed border-divider',
  'terra-soft': 'bg-terra-soft',
};

export function Card({ tone = 'sand', className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { tone?: CardTone }) {
  return <div className={`rounded-card ${cardTones[tone]} ${className}`} {...rest} />;
}

/* ---------- Badge ---------- */
type BadgeTone = 'published' | 'draft' | 'neutral' | 'pro' | 'terra';
const badgeTones: Record<BadgeTone, string> = {
  published: 'bg-sage-soft text-sage-text',
  draft: 'bg-paper text-terra-text',
  neutral: 'bg-sand text-ink',
  pro: 'bg-ink text-paper',
  terra: 'bg-terra text-ink',
};

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-7 items-center gap-1 rounded-full px-3 text-sm font-semibold ${badgeTones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function ProBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full bg-ink px-1.5 py-0.5 text-[11px] font-bold leading-none text-paper ${className}`}>
      <Lock className="size-2.5" aria-hidden /> PRO
    </span>
  );
}

/* ---------- Chips / filtros ---------- */
export function Chip({
  active,
  children,
  className = '',
  ...rest
}: HTMLAttributes<HTMLButtonElement> & { active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm transition-colors ${
        active ? 'bg-terra font-bold text-ink' : 'border border-divider text-muted hover:bg-sand/60 hover:text-ink'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------- Segmented (Grade/Lista) ---------- */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-11 items-center rounded-full border border-divider bg-paper p-1">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm transition-colors ${
            value === o.value ? 'bg-sand font-semibold text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Toggle ---------- */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-sage' : 'bg-divider'
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-paper transition-transform ${checked ? 'translate-x-[28px]' : 'translate-x-1'}`}
      />
    </button>
  );
}

/* ---------- ProgressBar ---------- */
export function ProgressBar({
  value,
  max = 100,
  className = '',
  track = 'bg-divider',
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  track?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={`h-2 w-full overflow-hidden rounded-full ${track} ${className}`}
    >
      <div className="h-full rounded-full bg-terra transition-[width] duration-300" style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }} />
    </div>
  );
}

/* ---------- Avatar ---------- */
export function initialsOf(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

export function Avatar({
  name,
  src,
  size = 34,
  tone = 'sage',
  className = '',
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  tone?: 'sage' | 'terra';
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.36)) };
  if (src) {
    return <img src={src} alt="" referrerPolicy="no-referrer" style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      style={style}
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink ${tone === 'sage' ? 'bg-sage' : 'bg-terra'} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}

/* ---------- Logo ---------- */
export function Logo({ size = 34, to, textClass = 'text-lg' }: { size?: number; to?: string; textClass?: string }) {
  const content = (
    <span className="inline-flex items-center gap-2.5">
      <img src="/brand/logo-64.png" srcSet="/brand/logo-64.png 1x, /brand/logo.png 4x" width={size} height={size} alt="" className="shrink-0" />
      <span className={`font-display font-semibold leading-none text-ink ${textClass}`}>Memórias</span>
    </span>
  );
  return to ? (
    <Link to={to} aria-label="Memórias — início" className="rounded-full">
      {content}
    </Link>
  ) : (
    content
  );
}

/* ---------- Título de página com o marcador do handoff ---------- */
export function PageTitle({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm text-muted">{eyebrow}</p>}
        <h1 className="font-display text-[28px] font-semibold text-ink sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/* ---------- Spinner de página ---------- */
export function PageLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-muted" role="status">
      <span className="size-6 animate-spin rounded-full border-2 border-divider border-t-terra" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

/* ---------- Seção de formulário com título ---------- */
export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm font-bold text-sage-text ${className}`}>{children}</p>;
}
