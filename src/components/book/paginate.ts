import { getLayout, type LayoutId } from './themes';

export interface BookPhoto {
  id: string;
  url: string;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface BookSection {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
}

export interface BookAlbum {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  event_date?: string | null;
  cover_url?: string | null;
  theme?: string | null;
  layout?: string | null;
  style?: string | null;
  owner_name?: string | null;
}

export type BookPageData =
  | { kind: 'cover' }
  | { kind: 'chapter'; chapter: number; section: BookSection; photo?: BookPhoto }
  | { kind: 'photos'; chapter: number; section: BookSection; photos: BookPhoto[] }
  | { kind: 'end'; sections: number; photos: number }
  | { kind: 'blank' };

interface MediaLike {
  id: string;
  section_id?: string | null;
  original_url?: string | null;
  thumbnail_url?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  file_type?: string | null;
}

/** Agrupa as fotos por seção, incluindo a imagem antiga da seção (image_url) e fotos sem seção. */
export function groupPhotos(sections: BookSection[], media: MediaLike[], useThumbs = false) {
  const bySection = new Map<string, BookPhoto[]>();
  const orphans: BookPhoto[] = [];
  const known = new Set(sections.map(s => s.id));
  for (const m of media) {
    if (m.file_type && !m.file_type.startsWith('image/')) continue;
    const url = (useThumbs ? m.thumbnail_url || m.original_url : m.original_url || m.thumbnail_url) || '';
    if (!url) continue;
    const photo: BookPhoto = { id: m.id, url, caption: m.caption, width: m.width, height: m.height };
    if (m.section_id && known.has(m.section_id)) {
      const list = bySection.get(m.section_id) ?? [];
      list.push(photo);
      bySection.set(m.section_id, list);
    } else {
      orphans.push(photo);
    }
  }
  const chapters = sections.map(s => {
    const photos = bySection.get(s.id) ?? [];
    if (s.image_url) photos.unshift({ id: `section-${s.id}`, url: s.image_url, caption: null });
    return { section: s, photos };
  });
  if (orphans.length) {
    chapters.push({ section: { id: 'outras', title: 'Outras fotos' }, photos: orphans });
  }
  return chapters;
}

/** Monta as páginas: capa → (abertura de capítulo + páginas de fotos)* → página final. */
export function paginate(
  chapters: { section: BookSection; photos: BookPhoto[] }[],
  layout?: string | null,
  opts: { skipEmpty?: boolean } = {},
): BookPageData[] {
  const perPage = getLayout(layout as LayoutId).perPage;
  const pages: BookPageData[] = [{ kind: 'cover' }];
  let totalPhotos = 0;
  // Na leitura, capítulos sem fotos e sem texto ficam de fora
  const list = opts.skipEmpty ? chapters.filter(c => c.photos.length > 0 || c.section.description) : chapters;
  list.forEach(({ section, photos }, i) => {
    const chapter = i + 1;
    totalPhotos += photos.length;
    const [first, ...rest] = photos;
    pages.push({ kind: 'chapter', chapter, section, photo: first });
    for (let p = 0; p < rest.length; p += perPage) {
      pages.push({ kind: 'photos', chapter, section, photos: rest.slice(p, p + perPage) });
    }
  });
  pages.push({ kind: 'end', sections: list.length, photos: totalPhotos });
  return pages;
}

/**
 * Agrupa as páginas em duplas para a visualização de livro aberto.
 * A capa fica sozinha (como num livro de verdade); o resto vai em pares.
 */
export function toSpreads(pages: BookPageData[]): number[][] {
  const spreads: number[][] = [[0]];
  for (let i = 1; i < pages.length; i += 2) {
    spreads.push(i + 1 < pages.length ? [i, i + 1] : [i]);
  }
  return spreads;
}
