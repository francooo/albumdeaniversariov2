import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImagePlus, Plus } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import CreateAlbumModal from '../components/CreateAlbumModal';
import AlbumCover from '../components/AlbumCover';
import { Button, ButtonLink, Card, ProgressBar, SectionLabel } from '../components/ui';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { getAlbumSummaries, getMediaThumbsByAlbum, getUserStats, type AlbumSummary, type MediaThumb } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { firstName, formatStorage, plural, relativeDay, todayLabel } from '../lib/format';
import { getPlan } from '../lib/plans';

type Stats = Awaited<ReturnType<typeof getUserStats>>;

export default function Overview() {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [thumbs, setThumbs] = useState<MediaThumb[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const [list, s] = await Promise.all([getAlbumSummaries(user.id), getUserStats(user.id)]);
        if (!alive) return;
        setAlbums(list);
        setStats(s);
        if (list[0]) {
          const t = await getMediaThumbsByAlbum(list[0].id);
          if (alive) setThumbs(t.filter(m => m.file_type?.startsWith('image/')));
        }
      } catch (err) {
        console.error('Error loading home:', err);
        if (alive) setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const plan = getPlan(user?.plan_type);
  const current = albums[0];
  const recent = albums.slice(1, 3);
  const used = stats?.storageUsed ?? 0;
  const limit = stats?.storageLimit ?? plan.storageBytes;

  return (
    <AppLayout>
      {/* Saudação */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{todayLabel()}</p>
          <h1 className="font-display text-[30px] font-semibold text-ink sm:text-[34px]">Olá, {firstName(user?.name) || 'você'}</h1>
        </div>
        <div className="flex items-center gap-5">
          <div className="w-36">
            <p className="mb-1.5 text-right text-sm text-muted">{formatStorage(used, limit)}</p>
            <ProgressBar value={used} max={limit} label="Espaço usado" />
          </div>
          <Button onClick={() => setCreateOpen(true)} icon={<Plus className="size-4" />}>
            Novo álbum
          </Button>
        </div>
      </div>

      {loadError && (
        <p role="alert" className="mt-6 rounded-[20px] bg-terra-soft p-4 text-sm text-terra-text">
          Não conseguimos carregar seus álbuns agora. Atualize a página para tentar de novo.
        </p>
      )}

      {loading ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[760fr_368fr]">
          <CardSkeleton className="h-[300px]" />
          <CardSkeleton className="h-[300px]" />
        </div>
      ) : current ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[760fr_368fr] lg:gap-8">
          {/* Continue de onde parou */}
          <Card tone="sand" className="p-5 sm:p-6">
            <SectionLabel>Continue de onde parou</SectionLabel>
            <div className="mt-3 flex flex-row gap-4 sm:gap-6">
              <Link to={`/albums/${current.id}`} className="block w-24 shrink-0 self-start sm:w-[212px]">
                <AlbumCover src={current.cover_thumb} theme={current.theme} alt="" className="aspect-[212/228] w-full rounded-[20px]" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 className="truncate font-display text-[26px] font-semibold text-ink">{current.title}</h2>
                <p className="text-sm text-muted">
                  {plural(current.section_count, 'seção', 'seções')} · {plural(Number(current.total_photos) || 0, 'foto')}
                  {current.last_edited_at || current.updated_at ? ` · atualizado ${relativeDay(current.last_edited_at || current.updated_at)}` : ''}
                </p>

                {thumbs.length > 0 ? (
                  <div className="mt-4 flex items-center gap-2.5">
                    {thumbs.slice(0, 3).map(t => (
                      <img key={t.id} src={t.thumbnail_url ?? ''} alt={t.caption || ''} className="size-[78px] rounded-[14px] object-cover" loading="lazy" />
                    ))}
                    {thumbs.length > 3 && (
                      <p className="pl-2 text-sm leading-tight text-muted">
                        e mais
                        <br />
                        {plural(thumbs.length - 3, 'foto')}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">Ainda sem fotos. Que tal começar agora?</p>
                )}

                <div className="mt-auto flex flex-wrap gap-3 pt-5">
                  <ButtonLink to={`/albums/${current.id}`}>Abrir álbum</ButtonLink>
                  <ButtonLink to={`/albums/${current.id}`} state={{ openUpload: true }} variant="outline" className="border-terra text-terra-text">
                    Adicionar fotos
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Card>

          {/* Álbuns recentes */}
          <section aria-labelledby="recentes">
            <div className="flex items-baseline justify-between">
              <h2 id="recentes" className="font-sans text-base font-bold text-ink">
                Álbuns recentes
              </h2>
              <Link to="/albums" className="text-sm font-semibold text-terra-text hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="mt-3 space-y-3.5">
              {recent.length === 0 && (
                <Card tone="paper" className="p-5 text-sm text-muted">
                  Seus outros álbuns aparecem aqui.
                </Card>
              )}
              {recent.map(a => {
                const published = a.status === 'active';
                return (
                  <Link key={a.id} to={published ? `/livro/${a.id}` : `/albums/${a.id}`} className="flex items-center gap-4 rounded-[22px] bg-paper p-3 transition-colors hover:bg-[#FBF2E4]">
                    <AlbumCover src={a.cover_thumb} theme={a.theme} className="size-[84px] shrink-0 rounded-[16px]" />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{a.title}</p>
                      <p className="text-sm text-muted">
                        {published ? 'Publicado' : 'Rascunho'} · {plural(a.section_count, 'seção', 'seções')} · {plural(Number(a.total_photos) || 0, 'foto')}
                      </p>
                      <p className={`mt-0.5 text-sm font-semibold ${published ? 'text-terra-text' : 'text-sage-text'}`}>{published ? 'Ver álbum' : 'Continuar editando'}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {!loading && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[560fr_580fr]">
          {/* Estado vazio / novo álbum */}
          <div className="relative rounded-card border-2 border-dashed border-divider bg-paper p-6">
            <h2 className="font-display text-[22px] font-semibold text-ink">{current ? 'Um novo álbum começa aqui' : 'Seu primeiro álbum começa aqui'}</h2>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">Guarde as primeiras fotos e o Memórias monta o livro com você.</p>
            <Button className="mt-5" onClick={() => setCreateOpen(true)}>
              Criar álbum
            </Button>
            <ImagePlus className="absolute right-8 top-1/2 hidden size-14 -translate-y-1/2 text-sage/50 sm:block" aria-hidden />
          </div>

          {/* No seu espaço */}
          <Card tone="sand" className="p-6">
            <SectionLabel>No seu espaço</SectionLabel>
            <dl className="mt-4 grid grid-cols-4 gap-2">
              {[
                ['Álbuns', stats?.totalAlbums ?? albums.length],
                ['Seções', stats?.totalSections ?? 0],
                ['Fotos', stats?.totalPhotos ?? 0],
                ['Vídeos', stats?.totalVideos ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="font-display text-[30px] font-semibold leading-tight text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 border-t border-divider pt-3 text-sm text-muted">
              Plano {plan.name}
              {Number.isFinite(plan.albumLimit) ? ` · ${albums.length} de ${plan.albumLimit} álbuns usados` : ` · ${plural(albums.length, 'álbum', 'álbuns')}`}
            </div>
          </Card>
        </div>
      )}

      <CreateAlbumModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </AppLayout>
  );
}
