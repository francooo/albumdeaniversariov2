import type { BookAlbum, BookPageData } from './paginate';
import { BookPage } from './BookPage';

/**
 * Livro aberto (livro.xml): duas páginas com lombada no meio, sempre na mesma proporção.
 * A capa ocupa só a metade direita e uma última página ímpar só a esquerda, como num livro de verdade.
 */
export function BookSpread({ pages, indices, album, className = '' }: { pages: BookPageData[]; indices: number[]; album: BookAlbum; className?: string }) {
  const [a, b] = indices;
  const single = indices.length === 1;
  const left = single ? (a === 0 ? null : a) : a;
  const right = single ? (a === 0 ? a : null) : b;

  return (
    <div className={`relative grid aspect-[5/2] w-full grid-cols-2 ${className}`}>
      <Half index={left} pages={pages} album={album} side="left" />
      <Half index={right} pages={pages} album={album} side="right" />
      {!single && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[1.4%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#DACBB0]/70 to-transparent" aria-hidden />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#DACBB0]" aria-hidden />
        </>
      )}
    </div>
  );
}

function Half({ index, pages, album, side }: { index: number | null; pages: BookPageData[]; album: BookAlbum; side: 'left' | 'right' }) {
  if (index === null || !pages[index]) return <div aria-hidden />;
  return (
    <div className={`overflow-hidden ${side === 'left' ? 'rounded-l-[6px]' : 'rounded-r-[6px]'}`}>
      <BookPage page={pages[index]} album={album} pageNumber={index + 1} side={side} />
    </div>
  );
}
