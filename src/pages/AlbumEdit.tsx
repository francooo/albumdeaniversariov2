import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Ellipsis,
  FolderInput,
  ImagePlus,
  LoaderCircle,
  Move,
  Pencil,
  Plus,
  Star,
  Trash2,
  Type,
  Upload,
  CircleCheck,
  CircleAlert,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import ShareModal from '../components/ShareModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { SectionModal, type SectionFormData } from '../components/SectionModal';
import AlbumCover from '../components/AlbumCover';
import { Badge, Button, ButtonLink, Field, Input, Menu, PageLoader, ProgressBar, Textarea } from '../components/ui';
import {
  createSection,
  deleteAlbum,
  deleteMedia,
  deleteSection,
  getAlbumById,
  getMediaThumbsByAlbum,
  getSectionsByAlbum,
  publishAlbum,
  reorderMedia,
  reorderSections,
  setCoverMedia,
  unpublishAlbum,
  updateAlbumDetails,
  updateMedia,
  updateSection,
  type Album,
  type Media,
  type MediaThumb,
  type Section,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useUploadQueue } from '../lib/useUploadQueue';
import { ACCEPT_ATTR } from '../lib/imageCompress';
import { formatLongDate, plural, toInputDate } from '../lib/format';

/** Foto exibida na grade: mídia real ou a imagem antiga gravada na própria seção. */
type LegacyTile = { legacy: true; id: string; section_id: string; thumbnail_url: string };
type Tile = MediaThumb | LegacyTile;

function asMedia(tile: Tile): MediaThumb | null {
  return 'legacy' in tile ? null : tile;
}

export default function AlbumEdit() {
  const { albumId = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInput = useRef<HTMLInputElement>(null);

  const [album, setAlbum] = useState<Album | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [media, setMedia] = useState<MediaThumb[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [sectionModal, setSectionModal] = useState<{ open: boolean; section: Section | null }>({ open: false, section: null });
  const [savingSection, setSavingSection] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [captionFor, setCaptionFor] = useState<MediaThumb | null>(null);
  const [moveFor, setMoveFor] = useState<MediaThumb | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: 'photo'; tile: Tile } | { kind: 'section'; section: Section } | { kind: 'album' }>(null);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [fileDrag, setFileDrag] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  /* ---------- carregamento ---------- */
  const load = useCallback(async () => {
    try {
      const a = await getAlbumById(albumId);
      if (!a || a.user_id !== user?.id) {
        setNotFound(true);
        return;
      }
      const [secs, thumbs] = await Promise.all([getSectionsByAlbum(albumId), getMediaThumbsByAlbum(albumId)]);
      setAlbum(a);
      setSections(secs);
      setMedia(thumbs);
      setActiveId(prev => (prev && secs.some(s => s.id === prev) ? prev : secs[0]?.id ?? null));
    } catch (err) {
      console.error('Error loading album:', err);
      toast.error('Não foi possível carregar o álbum.');
    } finally {
      setLoading(false);
    }
  }, [albumId, user?.id, toast]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // "Adicionar fotos" vindo do Início abre o seletor de arquivos
  useEffect(() => {
    const state = location.state as { openUpload?: boolean; justCreated?: boolean } | null;
    if (!loading && state?.openUpload && activeId) {
      fileInput.current?.click();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [loading, activeId, location, navigate]);

  /* ---------- envio ---------- */
  const queue = useUploadQueue({
    userId: user?.id,
    albumId,
    onUploaded: (m: Media) => {
      const { original_url: _omit, ...thumb } = m;
      setMedia(list => [...list, { ...thumb, thumbnail_url: m.thumbnail_url || m.original_url } as MediaThumb]);
    },
    onStorageFull: message =>
      toast.error(message, { action: { label: 'Ver planos', onClick: () => navigate('/conta#planos') } }),
  });

  const activeSection = sections.find(s => s.id === activeId) ?? null;

  const addFiles = (files: File[]) => {
    if (!activeSection) {
      toast.info('Crie uma seção antes de adicionar fotos.');
      return;
    }
    if (!files.length) return;
    const errors = queue.add(files, activeSection.id);
    if (errors.length) toast.error(errors.length === 1 ? errors[0] : `${errors.length} arquivos não foram aceitos. Use fotos JPG, PNG, WEBP ou GIF de até 15 MB.`);
  };

  /* ---------- derivados ---------- */
  const tilesBySection = useMemo(() => {
    const map = new Map<string, Tile[]>();
    for (const s of sections) {
      const list: Tile[] = [];
      if (s.image_url) list.push({ legacy: true, id: `legacy-${s.id}`, section_id: s.id, thumbnail_url: s.image_url });
      map.set(s.id, list);
    }
    for (const m of media) {
      if (m.section_id && map.has(m.section_id)) map.get(m.section_id)!.push(m);
    }
    return map;
  }, [sections, media]);

  const tiles = activeId ? tilesBySection.get(activeId) ?? [] : [];
  const totalPhotos = [...tilesBySection.values()].reduce((n, l) => n + l.length, 0);
  const coverMedia = media.find(m => m.is_cover);
  const headerCover = album?.cover_thumbnail_url || album?.cover_image_url || coverMedia?.thumbnail_url || media[0]?.thumbnail_url || sections.find(s => s.image_url)?.image_url;

  /* ---------- ações do álbum ---------- */
  const togglePublish = async () => {
    if (!album) return;
    setPublishing(true);
    try {
      const updated = album.status === 'active' ? await unpublishAlbum(album.id) : await publishAlbum(album.id);
      setAlbum(updated);
      toast.success(updated.status === 'active' ? 'Álbum publicado' : 'O álbum voltou para rascunho');
    } catch {
      toast.error('Não foi possível mudar o status do álbum.');
    } finally {
      setPublishing(false);
    }
  };

  /* ---------- seções ---------- */
  const saveSection = async (data: SectionFormData) => {
    setSavingSection(true);
    try {
      if (sectionModal.section) {
        const updated = await updateSection(sectionModal.section.id, { title: data.title, description: data.description ?? '', icon: data.icon });
        setSections(list => list.map(s => (s.id === updated.id ? updated : s)));
        toast.success('Seção atualizada');
      } else {
        const created = await createSection({ album_id: albumId, title: data.title, description: data.description, icon: data.icon, section_type: 'category', status: 'active' });
        setSections(list => [...list, created]);
        setActiveId(created.id);
        toast.success('Seção criada');
      }
      setSectionModal({ open: false, section: null });
    } catch {
      toast.error('Não foi possível salvar a seção.');
    } finally {
      setSavingSection(false);
    }
  };

  const moveSection = async (section: Section, delta: number) => {
    const idx = sections.findIndex(s => s.id === section.id);
    const target = idx + delta;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSections(next);
    try {
      await reorderSections(albumId, next.map(s => s.id));
    } catch {
      toast.error('Não foi possível reordenar.');
      load();
    }
  };

  /* ---------- fotos ---------- */
  const makeCover = async (m: MediaThumb) => {
    setMedia(list => list.map(x => ({ ...x, is_cover: x.id === m.id })));
    setAlbum(a => (a ? { ...a, cover_image_url: undefined, cover_thumbnail_url: undefined } : a));
    try {
      await setCoverMedia(albumId, m.id);
      toast.success('Capa do álbum atualizada');
    } catch {
      toast.error('Não foi possível definir a capa.');
      load();
    }
  };

  const saveCaption = async (caption: string) => {
    if (!captionFor) return;
    const id = captionFor.id;
    setMedia(list => list.map(m => (m.id === id ? { ...m, caption } : m)));
    setCaptionFor(null);
    try {
      await updateMedia(id, { caption });
    } catch {
      toast.error('Não foi possível salvar a legenda.');
    }
  };

  const moveTo = async (sectionId: string) => {
    if (!moveFor) return;
    const id = moveFor.id;
    setMoveFor(null);
    setMedia(list => {
      const item = list.find(m => m.id === id)!;
      return [...list.filter(m => m.id !== id), { ...item, section_id: sectionId }];
    });
    try {
      await updateMedia(id, { section_id: sectionId });
      toast.success(`Foto movida para “${sections.find(s => s.id === sectionId)?.title}”`);
    } catch {
      toast.error('Não foi possível mover a foto.');
      load();
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'photo') {
        const t = confirm.tile;
        if ('legacy' in t) {
          await updateSection(t.section_id, { image_url: '' });
          setSections(list => list.map(s => (s.id === t.section_id ? { ...s, image_url: '' } : s)));
        } else {
          await deleteMedia(t.id);
          setMedia(list => list.filter(m => m.id !== t.id));
        }
        toast.success('Foto excluída');
      } else if (confirm.kind === 'section') {
        const s = confirm.section;
        for (const m of media.filter(x => x.section_id === s.id)) await deleteMedia(m.id);
        await deleteSection(s.id);
        setMedia(list => list.filter(m => m.section_id !== s.id));
        const rest = sections.filter(x => x.id !== s.id);
        setSections(rest);
        setActiveId(rest[0]?.id ?? null);
        toast.success('Seção excluída');
      } else {
        await deleteAlbum(albumId);
        toast.success('Álbum excluído');
        navigate('/albums');
        return;
      }
      setConfirm(null);
    } catch {
      toast.error('Não foi possível excluir. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  /* ---------- arrastar: fotos (reordenar) e arquivos (enviar) ---------- */
  const isFileDrag = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  const onPageDragOver = (e: DragEvent) => {
    if (!isFileDrag(e) || !activeSection) return;
    e.preventDefault();
    setFileDrag(true);
  };
  const onPageDragLeave = (e: DragEvent) => {
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setFileDrag(false);
  };
  const onPageDrop = (e: DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    setFileDrag(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const onTileDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId || !activeId) return;
    const sectionMedia = media.filter(m => m.section_id === activeId);
    const from = sectionMedia.findIndex(m => m.id === dragId);
    const to = sectionMedia.findIndex(m => m.id === targetId);
    if (from < 0 || to < 0) return;
    const reordered = [...sectionMedia];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setMedia(list => [...list.filter(m => m.section_id !== activeId), ...reordered.map((m, i) => ({ ...m, sort_order: i }))]);
    setDragId(null);
    try {
      await reorderMedia(reordered.map(m => m.id));
    } catch {
      toast.error('Não foi possível reordenar.');
      load();
    }
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <AppLayout activeOverride="/albums">
        <PageLoader />
      </AppLayout>
    );
  }

  if (notFound || !album) {
    return (
      <AppLayout activeOverride="/albums">
        <div className="mx-auto max-w-md py-16 text-center">
          <h1 className="font-display text-3xl font-semibold">Álbum não encontrado</h1>
          <p className="mt-2 text-muted">Ele pode ter sido excluído ou pertencer a outra conta.</p>
          <ButtonLink to="/albums" className="mt-6">
            Voltar para Meus álbuns
          </ButtonLink>
        </div>
      </AppLayout>
    );
  }

  const published = album.status === 'active';
  const sectionMediaIds = new Set(media.filter(m => m.section_id === activeId).map(m => m.id));

  return (
    <AppLayout activeOverride="/albums">
      <div onDragOver={onPageDragOver} onDragLeave={onPageDragLeave} onDrop={onPageDrop}>
        {/* Trilha */}
        <nav aria-label="Trilha" className="text-sm text-muted">
          <Link to="/albums" className="hover:text-ink hover:underline">
            Meus álbuns
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{album.title}</span>
        </nav>

        {/* Cabeçalho do álbum */}
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <AlbumCover src={headerCover} theme={album.theme} className="size-[72px] shrink-0 rounded-full sm:size-[92px]" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="min-w-0 truncate font-display text-[26px] font-semibold text-ink sm:text-[28px]">{album.title}</h1>
                {published ? <Badge tone="published">Publicado</Badge> : <Badge tone="draft" className="bg-terra-soft">Rascunho</Badge>}
                <button type="button" onClick={() => setDetailsOpen(true)} aria-label="Editar título, subtítulo e data" title="Editar dados do álbum" className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-sand hover:text-ink">
                  <Pencil className="size-4" />
                </button>
              </div>
              {album.subtitle && <p className="text-sm text-muted">{album.subtitle}</p>}
              {album.event_date && <p className="text-sm text-muted">{formatLongDate(album.event_date)}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <ButtonLink to={`/albums/${album.id}/personalizar`} variant="outline" size="sm">
              Personalizar
            </ButtonLink>
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              Compartilhar
            </Button>
            <ButtonLink to={`/livro/${album.id}`} variant="outline" size="sm">
              Visualizar
            </ButtonLink>
            <Button size="sm" variant={published ? 'soft' : 'primary'} onClick={togglePublish} loading={publishing}>
              {published ? 'Despublicar' : 'Publicar'}
            </Button>
          </div>
        </div>

        {/* Abas de seção */}
        <div className="mt-8 flex items-center gap-2">
          <div role="tablist" aria-label="Seções do álbum" className="-mx-4 flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto px-4 py-1 scrollbar-none sm:mx-0 sm:px-0">
            {sections.map(s => {
              const active = s.id === activeId;
              const count = tilesBySection.get(s.id)?.length ?? 0;
              return (
                <button
                  key={s.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setActiveId(s.id)}
                  className={`inline-flex h-10 shrink-0 items-center rounded-full px-5 text-sm transition-colors ${
                    active ? 'bg-sand font-bold text-ink' : 'border border-divider text-muted hover:text-ink'
                  }`}
                >
                  {s.title} · {count}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSectionModal({ open: true, section: null })}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-dashed border-divider px-5 text-sm font-semibold text-sage-text hover:bg-sage-soft/50"
            >
              <Plus className="size-4" /> Nova seção
            </button>
          </div>
          {activeSection && (
            <Menu
              label={`Opções da seção ${activeSection.title}`}
              align="right"
              trigger={<Ellipsis className="size-5" />}
              items={[
                { label: 'Editar seção', icon: <Pencil className="size-4" />, onSelect: () => setSectionModal({ open: true, section: activeSection }) },
                { label: 'Mover para a esquerda', icon: <ArrowLeft className="size-4" />, onSelect: () => moveSection(activeSection, -1), disabled: sections[0]?.id === activeSection.id },
                { label: 'Mover para a direita', icon: <ArrowRight className="size-4" />, onSelect: () => moveSection(activeSection, 1), disabled: sections[sections.length - 1]?.id === activeSection.id },
                { label: 'Excluir seção', icon: <Trash2 className="size-4" />, onSelect: () => setConfirm({ kind: 'section', section: activeSection }), danger: true },
              ]}
            />
          )}
        </div>

        {/* Grade de fotos */}
        {sections.length === 0 ? (
          <div className="mt-6 rounded-card border-2 border-dashed border-divider bg-paper p-10 text-center">
            <p className="font-display text-xl font-semibold text-ink">Crie a primeira seção</p>
            <p className="mt-1 text-sm text-muted">As seções viram capítulos do livro, como “A festa” ou “Dia 1”.</p>
            <Button className="mt-5" onClick={() => setSectionModal({ open: true, section: null })} icon={<Plus className="size-4" />}>
              Nova seção
            </Button>
          </div>
        ) : (
          <>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5" aria-label={`Fotos de ${activeSection?.title}`}>
              {tiles.map(tile => {
                const m = asMedia(tile);
                return (
                  <PhotoTile
                    key={tile.id}
                    tile={tile}
                    isCover={!!m?.is_cover && !album.cover_image_url}
                    draggable={!!m && sectionMediaIds.size > 1}
                    dragging={dragId === tile.id}
                    onDragStart={() => setDragId(tile.id)}
                    onDragEnd={() => setDragId(null)}
                    onDropOn={() => onTileDrop(tile.id)}
                    onCover={() => m && makeCover(m)}
                    onMove={() => m && setMoveFor(m)}
                    onCaption={() => m && setCaptionFor(m)}
                    onDelete={() => setConfirm({ kind: 'photo', tile })}
                    canMove={sections.length > 1}
                  />
                );
              })}
              <li className={tiles.length === 0 ? 'col-span-2 sm:col-span-3 lg:col-span-5' : 'col-span-2'}>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex h-full min-h-[128px] w-full items-center justify-center gap-4 rounded-[16px] border-2 border-dashed border-divider px-4 text-left transition-colors hover:bg-paper"
                >
                  <ImagePlus className="size-8 shrink-0 text-sage" aria-hidden />
                  <span className="text-sm">
                    <span className="block font-bold text-ink">Adicionar fotos</span>
                    <span className="text-muted">ou arraste para cá</span>
                  </span>
                </button>
              </li>
            </ul>
            <p className="mt-3 text-sm text-muted">JPG, PNG, WEBP ou GIF · até 15 MB por foto · vídeos ainda não são aceitos</p>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT_ATTR}
              multiple
              hidden
              onChange={e => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
          </>
        )}

        {/* Painel de envio */}
        {(fileDrag || queue.total > 0) && activeSection && (
          <UploadPanel fileDrag={fileDrag} sectionTitle={activeSection.title} queue={queue} />
        )}

        <div className="mt-12 flex flex-col gap-2 border-t border-divider pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            {plural(sections.length, 'seção', 'seções')} · {plural(totalPhotos, 'foto')}
          </p>
          <button type="button" onClick={() => setConfirm({ kind: 'album' })} className="self-start font-semibold text-terra-text hover:underline">
            Excluir álbum
          </button>
        </div>
      </div>

      {/* Modais */}
      <SectionModal isOpen={sectionModal.open} section={sectionModal.section} saving={savingSection} onClose={() => setSectionModal({ open: false, section: null })} onSave={saveSection} />
      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} albumId={album.id} albumTitle={album.title} />
      <AlbumDetailsModal
        isOpen={detailsOpen}
        album={album}
        onClose={() => setDetailsOpen(false)}
        onSaved={a => {
          setAlbum(a);
          setDetailsOpen(false);
          toast.success('Dados do álbum salvos');
        }}
      />
      <CaptionModal photo={captionFor} onClose={() => setCaptionFor(null)} onSave={saveCaption} />
      <Modal isOpen={!!moveFor} onClose={() => setMoveFor(null)} title="Mover foto" description="Escolha a seção de destino." size="sm">
        <div className="space-y-2">
          {sections
            .filter(s => s.id !== moveFor?.section_id)
            .map(s => (
              <button key={s.id} type="button" onClick={() => moveTo(s.id)} className="flex h-12 w-full items-center gap-3 rounded-[16px] bg-cream px-4 text-left text-ink hover:bg-sand">
                <FolderInput className="size-4 text-muted" />
                {s.title}
              </button>
            ))}
        </div>
      </Modal>
      <ConfirmationModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        isLoading={busy}
        confirmType={confirm?.kind === 'album' ? 'text' : 'none'}
        confirmValue="EXCLUIR"
        title={confirm?.kind === 'album' ? 'Excluir este álbum?' : confirm?.kind === 'section' ? 'Excluir esta seção?' : 'Excluir esta foto?'}
        confirmLabel="Excluir"
        message={
          confirm?.kind === 'album'
            ? `“${album.title}”, com ${plural(sections.length, 'seção', 'seções')} e ${plural(totalPhotos, 'foto')}, será removido para sempre.`
            : confirm?.kind === 'section'
              ? `A seção “${confirm.section.title}” e ${plural(tilesBySection.get(confirm.section.id)?.length ?? 0, 'foto')} serão removidas para sempre.`
              : 'A foto será removida do álbum para sempre.'
        }
      />
    </AppLayout>
  );
}

/* ---------- Peças da tela ---------- */

function PhotoTile({
  tile,
  isCover,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOn,
  onCover,
  onMove,
  onCaption,
  onDelete,
  canMove,
}: {
  tile: Tile;
  isCover: boolean;
  draggable: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: () => void;
  onCover: () => void;
  onMove: () => void;
  onCaption: () => void;
  onDelete: () => void;
  canMove: boolean;
}) {
  const [over, setOver] = useState(false);
  const media = asMedia(tile);
  const caption = media?.caption ?? null;
  return (
    <li
      draggable={draggable}
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tile.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={e => {
        if (Array.from(e.dataTransfer.types).includes('Files')) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        if (Array.from(e.dataTransfer.types).includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        onDropOn();
      }}
      className={`group relative aspect-[216/128] overflow-hidden rounded-[16px] bg-sand ${dragging ? 'opacity-40' : ''} ${over ? 'ring-2 ring-terra' : ''} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <img src={tile.thumbnail_url ?? ''} alt={caption || ''} loading="lazy" className="h-full w-full object-cover" draggable={false} />
      {isCover && (
        <span className="absolute left-3 top-3 rounded-full bg-paper px-3 py-0.5 text-sm font-semibold text-terra-text">Capa</span>
      )}
      {!media && <span className="absolute left-3 top-3 rounded-full bg-paper px-3 py-0.5 text-xs text-muted">Imagem da seção</span>}
      {caption && <span className="absolute inset-x-0 top-0 hidden truncate bg-gradient-to-b from-ink/50 to-transparent px-3 pb-4 pt-2 text-xs text-paper group-hover:block">{caption}</span>}
      <div className="absolute inset-x-0 bottom-0 flex h-12 items-center gap-1 bg-ink/60 px-2 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        {media && (
          <>
            <ToolButton label={isCover ? 'Esta é a capa' : 'Usar como capa'} onClick={onCover}>
              <Star className={`size-5 ${isCover ? 'fill-paper' : ''}`} />
            </ToolButton>
            {canMove && (
              <ToolButton label="Mover para outra seção" onClick={onMove}>
                <Move className="size-5" />
              </ToolButton>
            )}
            <ToolButton label={caption ? 'Editar legenda' : 'Adicionar legenda'} onClick={onCaption}>
              <Type className="size-5" />
            </ToolButton>
          </>
        )}
        <ToolButton label="Excluir foto" onClick={onDelete} className="ml-auto">
          <Trash2 className="size-5" />
        </ToolButton>
      </div>
    </li>
  );
}

function ToolButton({ label, onClick, children, className = '' }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`inline-flex size-9 items-center justify-center rounded-full text-paper hover:bg-paper/20 ${className}`}>
      {children}
    </button>
  );
}

function UploadPanel({ fileDrag, sectionTitle, queue }: { fileDrag: boolean; sectionTitle: string; queue: ReturnType<typeof useUploadQueue> }) {
  const current = queue.items.find(i => i.status === 'uploading');
  const waiting = queue.items.filter(i => i.status === 'queued');
  const nextUp = waiting[0];
  const processed = queue.done + queue.failed;
  const pct = queue.total ? Math.round(((processed + (current ? 0.5 : 0)) / queue.total) * 100) : 0;
  const finished = queue.total > 0 && !queue.active;

  return (
    <section aria-label="Envio de fotos" aria-live="polite" className="mt-6 grid gap-4 rounded-[24px] bg-sand p-4 lg:grid-cols-[356px_1fr_auto] lg:items-center">
      <div
        className={`flex min-h-[88px] items-center gap-3 rounded-[16px] border-2 border-dashed px-5 ${fileDrag ? 'border-terra bg-terra-soft/60' : 'border-terra/60'}`}
      >
        <Upload className="size-[22px] shrink-0 text-terra-text" aria-hidden />
        <p className="text-sm font-bold text-terra-text">Solte para adicionar à “{sectionTitle}”</p>
      </div>

      {queue.total > 0 ? (
        <div className="min-w-0 lg:max-w-[340px]">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-bold text-ink">
              {finished
                ? queue.failed
                  ? `${plural(queue.done, 'foto adicionada', 'fotos adicionadas')} · ${queue.failed} com erro`
                  : `${plural(queue.done, 'foto adicionada', 'fotos adicionadas')}`
                : `Enviando ${plural(queue.total, 'foto')} · ${Math.min(processed + 1, queue.total)} de ${queue.total}`}
            </p>
            <p className="text-sm font-bold text-terra-text">{pct}%</p>
          </div>
          <ProgressBar value={pct} track="bg-paper" className="mt-2 h-2.5" label="Progresso do envio" />
          <p className="mt-1.5 text-sm text-muted">
            {finished ? (queue.failed ? 'Confira os arquivos com erro e tente de novo.' : 'Tudo certo.') : `${pct}% · ${waiting.length ? `faltam ${plural(waiting.length + (current ? 1 : 0), 'foto')}` : 'quase lá'}`}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">Solte as fotos para começar o envio.</p>
      )}

      {(nextUp || current || finished) && queue.total > 0 && (
        <div className="flex min-w-0 items-center gap-3 lg:w-[300px]">
          {(() => {
            const item = nextUp ?? current ?? queue.items[queue.items.length - 1];
            const failed = queue.items.filter(i => i.status === 'error');
            const show = finished && failed.length ? failed[0] : item;
            return (
              <>
                <img src={show.previewUrl} alt="" className="size-14 shrink-0 rounded-[12px] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{show.file.name}</p>
                  <p className="text-sm text-muted">
                    {show.status === 'queued' && 'Na fila · aguardando envio'}
                    {show.status === 'uploading' && 'Comprimindo e enviando…'}
                    {show.status === 'done' && 'Enviada'}
                    {show.status === 'error' && <span className="text-terra-text">{show.error || 'Falhou'}</span>}
                  </p>
                </div>
                {show.status === 'queued' && <Clock className="size-5 shrink-0 text-muted" aria-hidden />}
                {show.status === 'uploading' && <LoaderCircle className="size-5 shrink-0 animate-spin text-terra-text" aria-hidden />}
                {show.status === 'done' && <CircleCheck className="size-5 shrink-0 text-sage-text" aria-hidden />}
                {show.status === 'error' && <CircleAlert className="size-5 shrink-0 text-terra-text" aria-hidden />}
              </>
            );
          })()}
          {finished && (
            <button type="button" onClick={queue.clear} className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-ink hover:bg-paper/60">
              Fechar
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function AlbumDetailsModal({ isOpen, album, onClose, onSaved }: { isOpen: boolean; album: Album; onClose: () => void; onSaved: (a: Album) => void }) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(album.title);
    setSubtitle(album.subtitle ?? '');
    setDate(toInputDate(album.event_date));
    setError(null);
  }, [isOpen, album]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('O título não pode ficar vazio');
      return;
    }
    setSaving(true);
    try {
      onSaved(await updateAlbumDetails(album.id, { title: title.trim(), subtitle: subtitle.trim() || null, event_date: date || null }));
    } catch {
      setError('Não foi possível salvar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dados do álbum"
      size="md"
      stickyFooter={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="album-details-form" loading={saving}>
            Salvar
          </Button>
        </div>
      }
    >
      <form id="album-details-form" onSubmit={submit} className="space-y-4">
        <Field label="Título" htmlFor="ad-title" error={error}>
          <Input id="ad-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} invalid={!!error} />
        </Field>
        <Field label="Subtítulo" htmlFor="ad-sub">
          <Input id="ad-sub" value={subtitle} onChange={e => setSubtitle(e.target.value)} maxLength={160} />
        </Field>
        <Field label="Data (opcional)" htmlFor="ad-date" className="sm:max-w-[250px]">
          <Input id="ad-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

function CaptionModal({ photo, onClose, onSave }: { photo: MediaThumb | null; onClose: () => void; onSave: (caption: string) => void }) {
  const [text, setText] = useState('');
  useEffect(() => setText(photo?.caption ?? ''), [photo]);
  return (
    <Modal
      isOpen={!!photo}
      onClose={onClose}
      title="Legenda da foto"
      description="Aparece embaixo da foto no livro."
      size="md"
      stickyFooter={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(text.trim())}>Salvar legenda</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {photo?.thumbnail_url && <img src={photo.thumbnail_url} alt="" className="max-h-48 w-full rounded-[16px] object-cover" />}
        <Field label="Legenda" htmlFor="caption-text">
          <Textarea id="caption-text" value={text} onChange={e => setText(e.target.value)} maxLength={240} placeholder="Ex.: Valentina apagando a vela, com a avó ao lado." autoFocus />
        </Field>
      </div>
    </Modal>
  );
}
