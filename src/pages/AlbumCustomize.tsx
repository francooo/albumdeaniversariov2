import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Lock, Pencil, Upload, Check } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import ShareModal from '../components/ShareModal';
import AlbumCover from '../components/AlbumCover';
import { Button, ButtonLink, Card, PageLoader } from '../components/ui';
import { BookSpread } from '../components/book/BookSpread';
import { groupPhotos, paginate, type BookAlbum } from '../components/book/paginate';
import { LAYOUTS, STYLES, THEMES, getLayout, getStyle, getTheme, type LayoutId, type StyleId, type ThemeId } from '../components/book/themes';
import {
  getAlbumById,
  getMediaThumbsByAlbum,
  getSectionsByAlbum,
  setCoverMedia,
  updateAlbumDesign,
  type Album,
  type MediaThumb,
  type Section,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getPlan } from '../lib/plans';
import { ACCEPT_ATTR, compressImage, validateImageFile } from '../lib/imageCompress';

type CoverChoice = { kind: 'saved' } | { kind: 'media'; media: MediaThumb } | { kind: 'upload'; dataUrl: string; thumb: string };

export default function AlbumCustomize() {
  const { albumId = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const pro = getPlan(user?.plan_type).proDesigns;

  const [album, setAlbum] = useState<Album | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [media, setMedia] = useState<MediaThumb[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [theme, setTheme] = useState<ThemeId>('creme');
  const [layout, setLayout] = useState<LayoutId>('two');
  const [style, setStyle] = useState<StyleId>('jardim');
  const [cover, setCover] = useState<CoverChoice>({ kind: 'saved' });
  const [proNotice, setProNotice] = useState<string | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [spread, setSpread] = useState(0);

  const reset = (a: Album) => {
    setTheme(getTheme(a.theme).id);
    setLayout(getLayout(a.layout).id);
    setStyle(getStyle(a.style).id);
    setCover({ kind: 'saved' });
    setProNotice(null);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const a = await getAlbumById(albumId);
        if (!a || a.user_id !== user.id) {
          setNotFound(true);
          return;
        }
        const [secs, thumbs] = await Promise.all([getSectionsByAlbum(albumId), getMediaThumbsByAlbum(albumId)]);
        setAlbum(a);
        setSections(secs);
        setMedia(thumbs.filter(m => m.file_type?.startsWith('image/')));
        reset(a);
      } catch (err) {
        console.error(err);
        toast.error('Não foi possível carregar o álbum.');
      } finally {
        setLoading(false);
      }
    })();
  }, [albumId, user, toast]);

  const savedCoverUrl = useMemo(() => {
    if (!album) return null;
    return album.cover_thumbnail_url || album.cover_image_url || media.find(m => m.is_cover)?.thumbnail_url || media[0]?.thumbnail_url || sections.find(s => s.image_url)?.image_url || null;
  }, [album, media, sections]);

  const coverUrl = cover.kind === 'media' ? cover.media.thumbnail_url : cover.kind === 'upload' ? cover.thumb : savedCoverUrl;

  const dirty =
    !!album && (theme !== getTheme(album.theme).id || layout !== getLayout(album.layout).id || style !== getStyle(album.style).id || cover.kind !== 'saved');

  /* prévia: capa + capítulo 1, depois as próximas duplas */
  const bookAlbum: BookAlbum | null = album && {
    title: album.title,
    subtitle: album.subtitle,
    description: album.description,
    event_date: album.event_date,
    cover_url: coverUrl,
    theme,
    layout,
    style,
  };
  const pages = useMemo(() => paginate(groupPhotos(sections, media, true), layout), [sections, media, layout]);
  const spreads = useMemo(() => {
    const list: number[][] = [];
    for (let i = 0; i < pages.length; i += 2) list.push(i + 1 < pages.length ? [i, i + 1] : [i - 1, i]);
    return list;
  }, [pages]);
  const currentSpread = spreads[Math.min(spread, spreads.length - 1)] ?? [0];

  const pick = <T,>(item: { id: T; label: string; pro: boolean }, apply: (v: T) => void) => {
    if (item.pro && !pro) {
      setProNotice(`${item.label} faz parte do plano Premium.`);
      return;
    }
    setProNotice(null);
    apply(item.id);
  };

  const save = async (after?: () => void) => {
    if (!album) return;
    setSaving(true);
    try {
      let updated = await updateAlbumDesign(album.id, {
        theme,
        layout,
        style,
        cover_image_url: cover.kind === 'upload' ? cover.dataUrl : undefined,
        cover_thumbnail_url: cover.kind === 'upload' ? cover.thumb : undefined,
      });
      if (cover.kind === 'media') {
        await setCoverMedia(album.id, cover.media.id);
        updated = { ...updated, cover_image_url: undefined, cover_thumbnail_url: undefined };
        setMedia(list => list.map(m => ({ ...m, is_cover: m.id === cover.media.id })));
      }
      setAlbum(updated);
      reset(updated);
      toast.success('Personalização salva');
      after?.();
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível salvar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout activeOverride="/albums">
        <PageLoader />
      </AppLayout>
    );
  }
  if (notFound || !album || !bookAlbum) {
    return (
      <AppLayout activeOverride="/albums">
        <div className="mx-auto max-w-md py-16 text-center">
          <h1 className="font-display text-3xl font-semibold">Álbum não encontrado</h1>
          <ButtonLink to="/albums" className="mt-6">
            Voltar para Meus álbuns
          </ButtonLink>
        </div>
      </AppLayout>
    );
  }

  const themeInfo = getTheme(theme);
  const proThemes = THEMES.filter(t => t.pro).map(t => t.label);

  return (
    <AppLayout activeOverride="/albums">
      <nav aria-label="Trilha" className="text-sm text-muted">
        <Link to="/albums" className="hover:text-ink hover:underline">
          Meus álbuns
        </Link>
        <span className="mx-2">/</span>
        <Link to={`/albums/${album.id}`} className="hover:text-ink hover:underline">
          {album.title}
        </Link>
      </nav>

      <div className="mt-3 grid gap-8 lg:grid-cols-[460px_1fr] lg:gap-10">
        {/* Controles */}
        <div>
          <h1 className="font-display text-[30px] font-semibold text-ink">Personalizar</h1>
          <p className="mt-1 text-sm text-muted">Ajuste a capa, o tema e o estilo das páginas.</p>

          <Card tone="sand" className="mt-5 rounded-[22px] p-4">
            <button type="button" onClick={() => setCoverOpen(true)} className="flex w-full items-center gap-4 text-left">
              <AlbumCover src={coverUrl} theme={theme} className="size-[62px] shrink-0 rounded-[14px]" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-ink">Capa do álbum</span>
                <span className="text-sm text-terra-text">Clique para trocar a capa</span>
              </span>
              <Pencil className="size-5 text-ink" aria-hidden />
            </button>
          </Card>

          <fieldset className="mt-6">
            <legend className="text-sm text-muted">Tema</legend>
            <div className="mt-2 flex flex-wrap gap-3.5">
              {THEMES.map(t => {
                const selected = t.id === theme;
                const locked = t.pro && !pro;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pick(t, setTheme)}
                    aria-pressed={selected}
                    aria-label={`Tema ${t.label}${t.pro ? ' (PRO)' : ''}`}
                    title={`${t.label}${t.pro ? ' · PRO' : ''}`}
                    className={`relative size-12 rounded-[16px] p-0.5 ${selected ? 'ring-2 ring-terra' : ''}`}
                  >
                    <span className={`flex h-full w-full items-end justify-end rounded-[14px] p-1 ${t.id === 'creme' ? 'border border-divider' : ''}`} style={{ backgroundColor: t.swatch }}>
                      {locked && <Lock className={`size-3.5 ${t.id === 'noite' ? 'text-paper' : 'text-ink'}`} aria-hidden />}
                      {selected && !locked && <Check className={`size-3.5 ${t.id === 'noite' ? 'text-paper' : 'text-ink'}`} aria-hidden />}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-ink">
              Tema aplicado · <strong>{themeInfo.label}</strong>
              {!pro && <span className="text-muted"> · {proThemes.join(' e ')} são PRO</span>}
            </p>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm text-muted">Layout</legend>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {LAYOUTS.map(l => (
                <OptionPill key={l.id} selected={layout === l.id} onClick={() => setLayout(l.id)}>
                  {l.label}
                </OptionPill>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm text-muted">Estilo</legend>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {STYLES.map(s => (
                <OptionPill key={s.id} selected={style === s.id} locked={s.pro && !pro} onClick={() => pick(s, setStyle)}>
                  {s.label}
                  {s.pro && ' · PRO'}
                </OptionPill>
              ))}
            </div>
          </fieldset>

          {proNotice ? (
            <div role="status" className="mt-5 flex flex-col gap-3 rounded-[20px] bg-terra-soft p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-terra-text">
                <strong>{proNotice}</strong> Faça upgrade para liberar temas e estilos exclusivos.
              </p>
              <ButtonLink to="/conta#planos" size="sm" className="shrink-0">
                Fazer upgrade
              </ButtonLink>
            </div>
          ) : (
            !pro && <p className="mt-5 text-sm leading-relaxed text-muted">Temas e estilos com selo PRO ficam disponíveis no plano Premium.</p>
          )}
        </div>

        {/* Prévia */}
        <div className="min-w-0">
          <p className="text-sm text-muted">
            Prévia · tema {themeInfo.label} · layout {getLayout(layout).label} · estilo {getStyle(style).label}
          </p>
          <div className="mt-2 rounded-[32px] bg-sand p-4 sm:p-7">
            <BookSpread pages={pages} indices={currentSpread} album={bookAlbum} className="overflow-hidden rounded-[6px]" />
            {spreads.length > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button type="button" onClick={() => setSpread(s => Math.max(0, s - 1))} disabled={spread === 0} aria-label="Páginas anteriores" className="inline-flex size-10 items-center justify-center rounded-full bg-paper disabled:opacity-40">
                  <ChevronLeft className="size-5" />
                </button>
                <span className="text-sm text-muted">
                  {spread + 1} de {spreads.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSpread(s => Math.min(spreads.length - 1, s + 1))}
                  disabled={spread >= spreads.length - 1}
                  aria-label="Próximas páginas"
                  className="inline-flex size-10 items-center justify-center rounded-full bg-paper disabled:opacity-40"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => reset(album)} disabled={!dirty || saving} className="text-muted">
              Descartar
            </Button>
            <Button variant="outline" onClick={() => (dirty ? save(() => navigate(`/livro/${album.id}`)) : navigate(`/livro/${album.id}`))} disabled={saving}>
              {dirty ? 'Salvar e visualizar' : 'Visualizar'}
            </Button>
            <Button variant="outline" onClick={() => setShareOpen(true)}>
              Compartilhar
            </Button>
            <Button className="sm:ml-auto" onClick={() => save()} loading={saving} disabled={!dirty}>
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <CoverPicker
        isOpen={coverOpen}
        onClose={() => setCoverOpen(false)}
        media={media}
        onPick={choice => {
          setCover(choice);
          setCoverOpen(false);
        }}
        onError={msg => toast.error(msg)}
      />
      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} albumId={album.id} albumTitle={album.title} />
    </AppLayout>
  );
}

function OptionPill({ selected, locked, onClick, children }: { selected: boolean; locked?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex h-[38px] items-center gap-1.5 rounded-full px-4 text-sm transition-colors ${
        selected ? 'bg-sand font-bold text-ink' : locked ? 'border border-divider text-muted' : 'border border-divider bg-paper text-ink hover:bg-sand/50'
      }`}
    >
      {locked && <Lock className="size-3.5" aria-hidden />}
      {children}
    </button>
  );
}

function CoverPicker({
  isOpen,
  onClose,
  media,
  onPick,
  onError,
}: {
  isOpen: boolean;
  onClose: () => void;
  media: MediaThumb[];
  onPick: (c: CoverChoice) => void;
  onError: (m: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    const err = validateImageFile(file);
    if (err) return onError(err);
    setProcessing(true);
    try {
      const img = await compressImage(file);
      onPick({ kind: 'upload', dataUrl: img.dataUrl, thumb: img.thumbDataUrl });
    } catch {
      onError('Não foi possível ler esta imagem.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Capa do álbum" description="Escolha uma foto do álbum ou envie outra imagem." size="lg">
      <Button variant="outline" onClick={() => input.current?.click()} loading={processing} icon={<Upload className="size-4" />}>
        Enviar outra imagem
      </Button>
      <input ref={input} type="file" accept={ACCEPT_ATTR} hidden onChange={e => upload(e.target.files?.[0])} />
      {media.length > 0 ? (
        <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {media.map(m => (
            <li key={m.id}>
              <button type="button" onClick={() => onPick({ kind: 'media', media: m })} className="group relative block w-full overflow-hidden rounded-[14px]" aria-label={m.caption || m.file_name}>
                <img src={m.thumbnail_url ?? ''} alt="" className="aspect-square w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                {m.is_cover && <span className="absolute left-2 top-2 rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-terra-text">Capa</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-[18px] bg-cream p-4 text-sm text-muted">Este álbum ainda não tem fotos. Envie uma imagem para usar como capa.</p>
      )}
    </Modal>
  );
}
