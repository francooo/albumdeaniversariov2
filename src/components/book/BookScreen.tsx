import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Share } from 'lucide-react';
import { BookReader } from './BookReader';
import type { BookAlbum, BookPageData } from './paginate';

function readLiked(key: string) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/** Tela de leitura (livro.xml): cabeçalho com voltar, título, compartilhar e curtir; livro no centro. */
export function BookScreen({
  album,
  pages,
  likeKey,
  backTo,
  backLabel = 'Voltar',
  onShare,
  banner,
}: {
  album: BookAlbum;
  pages: BookPageData[];
  likeKey: string;
  backTo?: string;
  backLabel?: string;
  onShare: () => void;
  banner?: ReactNode;
}) {
  const [liked, setLiked] = useState(() => readLiked(likeKey));

  useEffect(() => {
    document.title = `${album.title} · Memórias`;
    return () => {
      document.title = 'Memórias';
    };
  }, [album.title]);

  const toggleLike = () => {
    setLiked(v => {
      try {
        localStorage.setItem(likeKey, v ? '0' : '1');
      } catch {
        /* curtida só neste navegador */
      }
      return !v;
    });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-book text-ink">
      <header className="mx-auto grid h-16 w-full max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-8 lg:px-[52px]">
        <div className="flex items-center gap-3">
          {backTo ? (
            <Link to={backTo} className="inline-flex h-10 items-center gap-2 rounded-full pl-2 pr-3 text-sm text-ink hover:bg-sand/70">
              <ArrowLeft className="size-5" aria-hidden />
              <span className="hidden sm:inline">{backLabel}</span>
              <span className="sr-only sm:hidden">{backLabel}</span>
            </Link>
          ) : null}
          <img src="/brand/logo-64.png" alt="Memórias" className="hidden size-8 sm:block" />
        </div>
        <h1 className="truncate text-center font-sans text-base font-semibold text-ink sm:text-lg">{album.title}</h1>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onShare} className="inline-flex h-10 items-center gap-2 rounded-full border border-divider px-3 text-sm text-ink hover:bg-sand/70 sm:px-4">
            <Share className="size-[18px]" aria-hidden />
            <span className="hidden sm:inline">Compartilhar</span>
            <span className="sr-only sm:hidden">Compartilhar</span>
          </button>
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? 'Descurtir álbum' : 'Curtir álbum'}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sand/70"
          >
            <Heart className={`size-6 text-terra ${liked ? 'fill-terra' : ''}`} />
          </button>
        </div>
      </header>

      {banner}

      <main className="flex flex-1 flex-col justify-center px-2 pb-6 pt-2 sm:px-6 lg:px-10">
        <BookReader pages={pages} album={album} />
      </main>

      <p className="hidden pb-6 text-center text-sm text-muted md:block">Use as setas do teclado ou as laterais para folhear.</p>
    </div>
  );
}
