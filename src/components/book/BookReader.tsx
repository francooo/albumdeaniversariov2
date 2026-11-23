import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BookAlbum, BookPageData } from './paginate';
import { toSpreads } from './paginate';
import { BookSpread } from './BookSpread';
import { BookPage } from './BookPage';

function useIsWide() {
  const query = '(min-width: 768px)';
  const [wide, setWide] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : true));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

/** Leitura do livro: duplas no desktop, uma página por vez no celular; setas, teclado e gesto de arrastar. */
export function BookReader({ pages, album }: { pages: BookPageData[]; album: BookAlbum }) {
  const wide = useIsWide();
  const spreads = useMemo(() => toSpreads(pages), [pages]);
  const [pageIndex, setPageIndex] = useState(0); // página de referência (mantém a posição ao girar o celular)
  const touchX = useRef<number | null>(null);

  const spreadIndex = Math.max(0, spreads.findIndex(s => s.includes(pageIndex)));
  const steps = wide ? spreads.length : pages.length;
  const step = wide ? spreadIndex : pageIndex;

  const go = useCallback(
    (delta: number) => {
      if (wide) {
        const next = Math.min(spreads.length - 1, Math.max(0, spreadIndex + delta));
        setPageIndex(spreads[next][0]);
      } else {
        setPageIndex(i => Math.min(pages.length - 1, Math.max(0, i + delta)));
      }
    },
    [wide, spreads, spreadIndex, pages.length],
  );

  const goTo = (s: number) => setPageIndex(wide ? spreads[s][0] : s);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, [role="dialog"]')) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const current = wide ? spreads[spreadIndex] : [pageIndex];
  const label =
    current.length === 2 ? `Páginas ${current[0] + 1}–${current[1] + 1} de ${pages.length}` : `Página ${current[0] + 1} de ${pages.length}`;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex w-full items-center justify-center"
        onTouchStart={e => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={e => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <NavArrow dir="prev" disabled={step === 0} onClick={() => go(-1)} />
        <div
          className="mx-auto"
          aria-live="polite"
          aria-label={label}
          style={
            wide
              ? { width: 'min(100%, calc((100dvh - 240px) * 2.5))' }
              : { width: 'min(100%, calc((100dvh - 230px) * 0.8))' }
          }
        >
          {wide ? (
            <BookSpread pages={pages} indices={current} album={album} />
          ) : (
            <div className="aspect-[4/5] w-full overflow-hidden rounded-[6px]">
              <BookPage page={pages[pageIndex]} album={album} pageNumber={pageIndex + 1} side="single" />
            </div>
          )}
        </div>
        <NavArrow dir="next" disabled={step >= steps - 1} onClick={() => go(1)} />
      </div>

      <p className="mt-4 text-sm text-muted">{label}</p>
      <Progress count={steps} active={step} onSelect={goTo} />
    </div>
  );
}

function NavArrow({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Página anterior' : 'Próxima página'}
      className={`absolute top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-ink transition-opacity hover:bg-sand disabled:pointer-events-none disabled:opacity-0 md:static md:mx-3 md:translate-y-0 ${
        dir === 'prev' ? 'left-1' : 'right-1'
      }`}
    >
      <Icon className="size-5" />
    </button>
  );
}

function Progress({ count, active, onSelect }: { count: number; active: number; onSelect: (i: number) => void }) {
  if (count <= 1) return null;
  if (count > 14) {
    return (
      <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-divider" aria-hidden>
        <div className="h-full rounded-full bg-terra transition-[width]" style={{ width: `${((active + 1) / count) * 100}%` }} />
      </div>
    );
  }
  return (
    <div className="mt-3 flex items-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Ir para ${i === 0 ? 'a capa' : `a parte ${i + 1}`}`}
          aria-current={i === active || undefined}
          className="flex h-6 items-center"
        >
          <span className={`block h-1.5 w-[26px] rounded-full transition-colors ${i === active ? 'bg-terra' : 'bg-divider hover:bg-[#D2C2A6]'}`} />
        </button>
      ))}
    </div>
  );
}
