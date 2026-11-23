const GB = 1024 ** 3;
const MB = 1024 ** 2;

export function formatBytes(bytes: number): string {
  const n = Number(bytes) || 0;
  if (n >= GB) return `${(n / GB).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`;
  if (n >= MB) return `${(n / MB).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** "120 MB / 300 MB" — uso de espaço no formato do handoff. */
export function formatStorage(used: number, limit: number): string {
  return `${formatBytes(Number(used) || 0)} / ${formatBytes(Number(limit) || 0)}`;
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** Datas tipo DATE do Postgres chegam como string 'YYYY-MM-DD' ou Date; evita deslocamento de fuso. */
function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function formatLongDate(value?: string | Date | null): string {
  if (!value) return '';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function todayLabel(): string {
  const s = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "ontem", "há 3 dias", "hoje" */
export function relativeDay(value?: string | Date | null): string {
  if (!value) return '';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 86400000);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  return `em ${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;
}

/** Converte DATE do banco para valor de <input type="date">. */
export function toInputDate(value?: string | Date | null): string {
  if (!value) return '';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function firstName(name?: string | null): string {
  return (name ?? '').trim().split(/\s+/)[0] || '';
}
