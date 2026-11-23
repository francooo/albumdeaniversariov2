import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ShareModal from '../components/ShareModal';
import { BookScreen } from '../components/book/BookScreen';
import { groupPhotos, paginate, type BookAlbum } from '../components/book/paginate';
import { ButtonLink, PageLoader } from '../components/ui';
import { getAlbumById, getMediaByAlbum, getSectionsByAlbum, type Album, type Media, type Section } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

/** Livro do próprio usuário (/livro/:albumId). Quem não é dono usa o link público. */
export default function Viewer() {
  const { albumId = '' } = useParams();
  const { user } = useAuth();
  const [album, setAlbum] = useState<Album | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const a = await getAlbumById(albumId);
        if (!a || a.user_id !== user.id) {
          setState('not_found');
          return;
        }
        const [secs, m] = await Promise.all([getSectionsByAlbum(albumId), getMediaByAlbum(albumId)]);
        setAlbum(a);
        setSections(secs.filter(s => s.status !== 'hidden'));
        setMedia(m);
        setState('ready');
      } catch (err) {
        console.error('Error loading book:', err);
        setState('error');
      }
    })();
  }, [albumId, user]);

  const pages = useMemo(() => paginate(groupPhotos(sections, media), album?.layout, { skipEmpty: true }), [sections, media, album?.layout]);

  if (state === 'loading') {
    return (
      <div className="min-h-dvh bg-book">
        <PageLoader label="Abrindo o livro…" />
      </div>
    );
  }

  if (state !== 'ready' || !album) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-book px-6 text-center">
        <h1 className="font-display text-3xl font-semibold">{state === 'error' ? 'Não foi possível abrir o livro' : 'Álbum não encontrado'}</h1>
        <p className="mt-2 max-w-sm text-muted">
          {state === 'error' ? 'Verifique sua conexão e tente de novo.' : 'Ele pode ter sido excluído ou pertencer a outra conta.'}
        </p>
        <ButtonLink to="/albums" className="mt-6">
          Ir para Meus álbuns
        </ButtonLink>
      </div>
    );
  }

  const coverMedia = media.find(m => m.is_cover) ?? media.find(m => m.file_type?.startsWith('image/'));
  const bookAlbum: BookAlbum = {
    title: album.title,
    subtitle: album.subtitle,
    description: album.description,
    event_date: album.event_date,
    cover_url: album.cover_image_url || coverMedia?.original_url || sections.find(s => s.image_url)?.image_url,
    theme: album.theme,
    layout: album.layout,
    style: album.style,
    owner_name: user?.name,
  };

  return (
    <>
      <BookScreen album={bookAlbum} pages={pages} likeKey={`liked_album_${album.id}`} backTo={`/albums/${album.id}`} onShare={() => setShareOpen(true)} />
      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} albumId={album.id} albumTitle={album.title} />
    </>
  );
}
