import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** Menu suspenso simples (botão + lista), fecha com Esc ou clique fora. */
export function Menu({ trigger, items, align = 'left', label }: { trigger: ReactNode; items: MenuItem[]; align?: 'left' | 'right'; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen(o => !o)}
        className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-sand/70"
      >
        {trigger}
      </button>
      {open && (
        <div role="menu" className={`absolute top-[calc(100%+6px)] z-30 min-w-56 animate-pop-in rounded-[20px] border border-divider bg-paper p-1.5 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {items.map(item => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-left text-sm disabled:opacity-40 ${
                item.danger ? 'text-terra-text hover:bg-terra-soft' : 'text-ink hover:bg-sand'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
