import type { CSSProperties } from 'react';
import { BookOpen } from 'lucide-react';
import type { BookAlbum, BookPageData, BookPhoto } from './paginate';
import { getStyle, getTheme, type BookTheme, type StyleId } from './themes';
import { formatLongDate, plural } from '../../lib/format';

/**
 * Uma página do livro. Os tamanhos de texto usam unidades de container (cqw),
 * então a mesma página serve para a prévia pequena e para a leitura em tela cheia.
 */
export function BookPage({ page, album, pageNumber, side }: { page: BookPageData; album: BookAlbum; pageNumber?: number; side?: 'left' | 'right' | 'single' }) {
  const theme = getTheme(album.theme);
  const style = getStyle(album.style).id;
  const vars = { backgroundColor: theme.page, color: theme.text } as CSSProperties;

  return (
    <div className="@container relative h-full w-full overflow-hidden" style={vars}>
      <div className="absolute inset-0 flex flex-col p-[6cqw]">
        {page.kind === 'cover' && <CoverPage album={album} theme={theme} style={style} />}
        {page.kind === 'chapter' && <ChapterPage page={page} theme={theme} style={style} />}
        {page.kind === 'photos' && <PhotosPage photos={page.photos} theme={theme} style={style} />}
        {page.kind === 'end' && <EndPage page={page} album={album} theme={theme} />}
      </div>
      {pageNumber !== undefined && page.kind !== 'cover' && (
        <span
          className={`absolute bottom-[2.6cqw] text-[2.2cqw] ${side === 'left' ? 'left-[6cqw]' : 'right-[6cqw]'}`}
          style={{ color: theme.muted }}
        >
          {pageNumber}
        </span>
      )}
    </div>
  );
}

function frameClasses(style: StyleId) {
  switch (style) {
    case 'festa':
      return 'rounded-[2.6cqw]';
    case 'cinema':
      return 'rounded-none';
    case 'polaroid':
      return 'rounded-[0.6cqw]';
    default:
      return 'rounded-[0.8cqw]';
  }
}

export function BookImage({ photo, style, className = '', tilt = 0 }: { photo: BookPhoto; style: StyleId; className?: string; tilt?: number }) {
  if (style === 'polaroid') {
    return (
      <div
        className={`flex min-h-0 flex-col bg-[#FFFDF8] p-[1.4cqw] pb-[4.5cqw] ${className}`}
        style={{ transform: `rotate(${tilt}deg)`, boxShadow: '0 0 0 1px rgba(32,30,29,0.08)' }}
      >
        <img src={photo.url} alt={photo.caption || ''} loading="lazy" className="min-h-0 w-full flex-1 rounded-[0.4cqw] object-cover" />
      </div>
    );
  }
  return (
    <img
      src={photo.url}
      alt={photo.caption || ''}
      loading="lazy"
      className={`min-h-0 w-full object-cover ${frameClasses(style)} ${style === 'cinema' ? 'contrast-[1.05] saturate-[0.9]' : ''} ${className}`}
    />
  );
}

function CoverPage({ album, theme, style }: { album: BookAlbum; theme: BookTheme; style: StyleId }) {
  const date = formatLongDate(album.event_date);
  return (
    <div className="flex h-full flex-col">
      {album.cover_url ? (
        <BookImage photo={{ id: 'cover', url: album.cover_url }} style={style} className="flex-1" />
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-[1cqw]" style={{ backgroundColor: theme.swatch }}>
          <BookOpen className="size-[14cqw] opacity-40" style={{ color: theme.title }} aria-hidden />
        </div>
      )}
      <div className="pt-[4cqw]">
        <p className={`font-display font-semibold leading-[1.1] text-[7cqw] ${style === 'cinema' ? 'uppercase tracking-wide' : ''}`} style={{ color: theme.title }}>
          {album.title}
        </p>
        {album.subtitle && <p className="mt-[1cqw] text-[3.2cqw]">{album.subtitle}</p>}
        <div className="mt-[2cqw] h-[0.5cqw] w-[10cqw] rounded-full" style={{ backgroundColor: theme.line }} />
        {date && (
          <p className="mt-[2cqw] text-[2.6cqw]" style={{ color: theme.muted }}>
            {date}
          </p>
        )}
      </div>
    </div>
  );
}

function Caption({ text, theme }: { text?: string | null; theme: BookTheme }) {
  if (!text) return null;
  return (
    <p className="mt-[2cqw] line-clamp-2 text-[2.6cqw] leading-snug" style={{ color: theme.muted }}>
      {text}
    </p>
  );
}

function ChapterPage({ page, theme, style }: { page: Extract<BookPageData, { kind: 'chapter' }>; theme: BookTheme; style: StyleId }) {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[2.4cqw] font-semibold uppercase tracking-[0.12em]" style={{ color: theme.muted }}>
        Capítulo {page.chapter}
      </p>
      <p className="mt-[0.6cqw] font-display text-[5.2cqw] font-semibold leading-[1.1]" style={{ color: theme.title }}>
        {page.section.title}
      </p>
      <div className="mt-[2cqw] h-[0.45cqw] w-[9cqw] rounded-full" style={{ backgroundColor: theme.line }} />
      {page.section.description && <p className="mt-[2.4cqw] line-clamp-3 text-[2.8cqw] leading-relaxed">{page.section.description}</p>}
      {page.photo ? (
        <>
          <BookImage photo={page.photo} style={style} tilt={-1} className="mt-[3cqw] flex-1" />
          <Caption text={page.photo.caption} theme={theme} />
        </>
      ) : (
        <p className="mt-[4cqw] text-[2.6cqw] italic" style={{ color: theme.muted }}>
          As fotos desta seção aparecem aqui.
        </p>
      )}
    </div>
  );
}

function PhotosPage({ photos, theme, style }: { photos: BookPhoto[]; theme: BookTheme; style: StyleId }) {
  const captions = photos.map(p => p.caption).filter(Boolean).join(' · ');
  return (
    <div className="flex h-full flex-col">
      {photos.length === 1 && <BookImage photo={photos[0]} style={style} tilt={0.8} className="flex-1" />}
      {photos.length === 2 && (
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-[3cqw]">
          <BookImage photo={photos[0]} style={style} tilt={-1.2} className="h-full" />
          <BookImage photo={photos[1]} style={style} tilt={1} className="h-full" />
        </div>
      )}
      {photos.length >= 3 && (
        <div className="grid min-h-0 flex-1 grid-rows-[1.6fr_1fr] gap-[2.6cqw]">
          <BookImage photo={photos[0]} style={style} tilt={-0.8} className="h-full" />
          <div className="grid min-h-0 grid-cols-2 gap-[2.6cqw]">
            <BookImage photo={photos[1]} style={style} tilt={1.2} className="h-full" />
            <BookImage photo={photos[2]} style={style} tilt={-1} className="h-full" />
          </div>
        </div>
      )}
      <Caption text={captions} theme={theme} />
    </div>
  );
}

function EndPage({ page, album, theme }: { page: Extract<BookPageData, { kind: 'end' }>; album: BookAlbum; theme: BookTheme }) {
  const year = album.event_date ? String(album.event_date).slice(0, 4) : String(new Date().getFullYear());
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-[2.6cqw] font-bold" style={{ color: theme.title }}>
        Sobre este álbum
      </p>
      <p className="mt-[1cqw] font-display text-[5.6cqw] font-semibold leading-[1.1]">{album.title}</p>
      {(album.description || album.subtitle) && <p className="mt-[2cqw] text-[3cqw] leading-relaxed">{album.description || album.subtitle}</p>}
      <div className="mt-[3cqw] h-[0.45cqw] w-[9cqw] rounded-full" style={{ backgroundColor: theme.line }} />
      <p className="mt-[3cqw] text-[2.6cqw]" style={{ color: theme.muted }}>
        {plural(page.sections, 'seção', 'seções')} · {plural(page.photos, 'foto')}
      </p>
      <p className="mt-[1cqw] text-[2.6cqw]" style={{ color: theme.muted }}>
        {album.title} © {year}
        {album.owner_name ? ` · ${album.owner_name}` : ''}
      </p>
      <div className="mt-auto flex items-center gap-[1.4cqw] pt-[4cqw] opacity-80">
        <img src="/brand/logo-64.png" alt="" className="size-[4.4cqw]" />
        <span className="font-display text-[2.8cqw] font-semibold">Memórias</span>
      </div>
    </div>
  );
}
