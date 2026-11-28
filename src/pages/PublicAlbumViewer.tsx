import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { getPublicAlbum, claimAlbumShare, type Section, type Media } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { BookScreen } from '../components/book/BookScreen';
import { groupPhotos, paginate, type BookAlbum } from '../components/book/paginate';
import { Button, ButtonLink, Logo, PageLoader } from '../components/ui';

type ErrorKind = 'inactive' | 'expired' | 'not_found' | 'error';

const ERRORS: Record<ErrorKind, { title: string; message: string }> = {
  inactive: { title: 'Link desativado', message: 'Quem compartilhou este álbum desligou o link.' },
  expired: { title: 'Link expirado', message: 'Este link não vale mais. Peça um novo a quem compartilhou.' },
  not_found: { title: 'Link não encontrado', message: 'Este link não existe ou foi removido.' },
  error: { title: 'Não foi possível abrir', message: 'Verifique sua conexão e tente de novo.' },
};

export default function PublicAlbumViewer() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();

  const [album, setAlbum] = useState<(BookAlbum & { id: string }) | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorKind | null>(null);
  const [showBanner, setShowBanner] = useState(() => {
    try {
      return !sessionStorage.getItem(`banner_dismissed_${token}`);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    (async () => {
      try {
        // Uma única chamada com o token: álbum, seções visíveis e fotos
        const ctx = await getPublicAlbum(token);
        if (ctx.valid === false) {
          setError(ctx.error || 'not_found');
          return;
        }
        const { album: a, sections: secs, media: m } = ctx;
        const cover = m.find(x => x.is_cover) ?? m.find(x => x.file_type?.startsWith('image/'));
        setSections(secs);
        setMedia(m);
        setAlbum({
          id: a.id,
          title: a.title,
          subtitle: a.subtitle,
          description: a.description,
          event_date: a.event_date,
          cover_url: a.cover_image_url || cover?.original_url || secs.find(s => s.image_url)?.image_url,
          theme: a.theme,
          layout: a.layout,
          style: a.style,
          owner_name: ctx.ownerName,
        });
      } catch (err) {
        console.error('Error loading shared album:', err);
        setError('error');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Quem está logado e abre o link guarda o álbum na conta (somente leitura)
  useEffect(() => {
    if (user && album) claimAlbumShare(token).catch(console.error);
  }, [user, album, token]);

  const pages = useMemo(() => paginate(groupPhotos(sections, media), album?.layout, { skipEmpty: true }), [sections, media, album?.layout]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: album?.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado');
    } catch {
      /* compartilhamento cancelado */
    }
  };

  const goAuth = (path: '/register' | '/login') => {
    sessionStorage.setItem('pending_album_token', token);
    navigate(path);
  };

  const dismiss = () => {
    setShowBanner(false);
    try {
      sessionStorage.setItem(`banner_dismissed_${token}`, 'true');
    } catch {
      /* opcional */
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-dvh bg-book">
        <PageLoader label="Abrindo o álbum…" />
      </div>
    );
  }

  if (error || !album) {
    const e = ERRORS[error ?? 'not_found'];
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cream px-6 text-center">
        <Logo size={44} textClass="text-[22px]" />
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{e.title}</h1>
          <p className="mt-2 max-w-sm text-muted">{e.message}</p>
        </div>
        <ButtonLink to={user ? '/inicio' : '/login'}>{user ? 'Ir para o início' : 'Entrar no Memórias'}</ButtonLink>
      </div>
    );
  }

  const banner =
    !user && showBanner ? (
      <div className="mx-auto mb-2 w-full max-w-[1176px] px-4 sm:px-8">
        <div className="flex flex-col gap-3 rounded-[22px] bg-sand p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink">
            <strong>{album.owner_name || 'Alguém'}</strong> compartilhou este álbum com você. Crie sua conta para guardá-lo e fazer os seus.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={() => goAuth('/register')}>
              Criar conta
            </Button>
            <Button size="sm" variant="outline" onClick={() => goAuth('/login')}>
              Entrar
            </Button>
            <button type="button" onClick={dismiss} aria-label="Fechar aviso" className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-paper/60">
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return <BookScreen album={album} pages={pages} likeKey={`liked_public_${token}`} backTo={user ? '/inicio' : undefined} backLabel="Início" onShare={share} banner={banner} />;
}
