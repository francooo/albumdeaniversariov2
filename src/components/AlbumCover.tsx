import { BookOpen } from 'lucide-react';
import { themeSwatch } from './book/themes';

/** Capa de álbum para cards: foto (cover) ou a cor do tema com o ícone do livro. */
export default function AlbumCover({ src, theme, className = '', alt = '' }: { src?: string | null; theme?: string | null; className?: string; alt?: string }) {
  if (src) return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
  // O tema Creme tem a mesma cor dos cards; usa um areia mais escuro para a capa vazia aparecer sobre paper e sand
  const swatch = themeSwatch(theme);
  const bg = swatch === '#FFF9F0' ? '#E2D0B2' : swatch;
  const dark = bg === '#2A2A28';
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ backgroundColor: bg }} aria-hidden>
      <BookOpen className={`size-1/4 max-h-14 max-w-14 ${dark ? 'text-paper/50' : 'text-ink/25'}`} />
    </div>
  );
}
