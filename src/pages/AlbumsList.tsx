import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, List, Plus, Search } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import CreateAlbumModal from '../components/CreateAlbumModal';
import AlbumCover from '../components/AlbumCover';
import { AlbumCardSkeleton } from '../components/LoadingSkeleton';
import { Badge, ButtonLink, Button, Chip, Input, ProgressBar, Segmented } from '../components/ui';
import { getAlbumSummaries, getUserStats, type AlbumSummary } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getPlan } from '../lib/plans';
import { formatBytes, plural } from '../lib/format';

type Filter = 'all' | 'published' | 'draft';
type View = 'grid' | 'list';

const VIEW_KEY = 'albums_view';

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function AlbumsList() {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [storage, setStorage] = useState({ used: 0, limit: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<View>(readView);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    Promise.all([getAlbumSummaries(user.id), getUserStats(user.id)])
      .then(([list, s]) => {
        if (!alive) return;
        setAlbums(list);
        setStorage({ used: s.storageUsed, limit: s.storageLimit });
      })
      .catch(err => {
        console.error('Error loading albums:', err);
        if (alive) setLoadError(true);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user]);

  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* preferência opcional */
    }
  };

  const plan = getPlan(user?.plan_type);
  const finite = Number.isFinite(plan.albumLimit);
  const atLimit = finite && albums.length >= plan.albumLimit;
  const remaining = finite ? Math.max(0, plan.albumLimit - albums.length) : Infinity;

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return albums.filter(a => {
      if (filter === 'published' && a.status !== 'active') return false;
      if (filter === 'draft' && a.status === 'active') return false;
      if (q && !normalize(`${a.title} ${a.subtitle ?? ''}`).includes(q)) return false;
      return true;
    });
  }, [albums, filter, query]);

  const counts = {
    all: albums.length,
    published: albums.filter(a => a.status === 'active').length,
    draft: albums.filter(a => a.status !== 'active').length,
  };

  const openCreate = () => {
    if (atLimit) {
      document.getElementById('limite')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('limite')?.focus();
      return;
    }
    setCreateOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[30px] font-semibold text-ink sm:text-[34px]">Meus álbuns</h1>
          <p className="mt-1 text-sm text-muted">
            {finite ? `${albums.length} de ${plan.albumLimit} álbuns no plano ${plan.name}` : `${plural(albums.length, 'álbum', 'álbuns')} no plano ${plan.name}`}
          </p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="size-4" />} className="self-start sm:self-auto">
          Novo álbum
        </Button>
      </div>

      {/* Busca, filtros e visualização */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="w-full lg:w-[300px]">
          <label htmlFor="album-search" className="sr-only">
            Buscar álbum
          </label>
          <Input
            id="album-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar álbum"
            leading={<Search className="size-[18px]" />}
            className="h-11 rounded-full"
          />
        </div>
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0" role="group" aria-label="Filtrar álbuns">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            Todos
          </Chip>
          <Chip active={filter === 'published'} onClick={() => setFilter('published')}>
            Publicados{counts.published ? ` · ${counts.published}` : ''}
          </Chip>
          <Chip active={filter === 'draft'} onClick={() => setFilter('draft')}>
            Rascunhos{counts.draft ? ` · ${counts.draft}` : ''}
          </Chip>
        </div>
        <div className="lg:ml-auto">
          <Segmented
            label="Visualização"
            value={view}
            onChange={changeView}
            options={[
              { value: 'grid', label: <><LayoutGrid className="size-4" aria-hidden /> Grade</> },
              { value: 'list', label: <><List className="size-4" aria-hidden /> Lista</> },
            ]}
          />
        </div>
      </div>

      {loadError && (
        <p role="alert" className="mt-6 rounded-[20px] bg-terra-soft p-4 text-sm text-terra-text">
          Não conseguimos carregar seus álbuns. Atualize a página para tentar de novo.
        </p>
      )}

      {/* Lista */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2].map(i => (
              <AlbumCardSkeleton key={i} />
            ))}
          </div>
        ) : visible.length === 0 && albums.length > 0 ? (
          <div className="rounded-card border-2 border-dashed border-divider bg-paper p-10 text-center">
            <p className="font-display text-xl font-semibold text-ink">Nenhum álbum encontrado</p>
            <p className="mt-1 text-sm text-muted">Tente outra busca ou outro filtro.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              Limpar filtros
            </Button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map(a => (
              <AlbumGridCard key={a.id} album={a} />
            ))}
            {filter !== 'published' && !query && <CreateCard onClick={openCreate} disabled={atLimit} />}
          </div>
        ) : (
          <ul className="divide-y divide-divider overflow-hidden rounded-card bg-paper">
            {visible.map(a => (
              <AlbumListRow key={a.id} album={a} />
            ))}
            {filter !== 'published' && !query && (
              <li>
                <button
                  type="button"
                  onClick={openCreate}
                  disabled={atLimit}
                  className="flex w-full items-center gap-4 p-4 text-left text-ink hover:bg-sand/50 disabled:opacity-50"
                >
                  <span className="inline-flex size-16 items-center justify-center rounded-[16px] border-2 border-dashed border-divider">
                    <Plus className="size-6 text-sage" />
                  </span>
                  <span>
                    <span className="block font-bold">Criar novo álbum</span>
                    <span className="text-sm text-muted">Comece por uma ocasião</span>
                  </span>
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Espaço e limite do plano */}
      {!loading && (
        <div className="mt-10 grid items-center gap-6 lg:grid-cols-[1fr_500px]">
          <div className="max-w-[360px]">
            <p className="text-sm text-muted">
              {formatBytes(storage.used)} de {formatBytes(storage.limit || plan.storageBytes)} usados
            </p>
            <ProgressBar value={storage.used} max={storage.limit || plan.storageBytes} className="mt-2 h-2.5" label="Espaço usado" />
            {finite && !atLimit && (
              <p className="mt-3 text-sm text-muted">
                {remaining === 1 ? 'Falta 1 álbum' : `Faltam ${remaining} álbuns`} para o limite do plano {plan.name}
              </p>
            )}
          </div>

          {atLimit && (
            <div id="limite" tabIndex={-1} className="flex flex-col gap-4 rounded-[22px] bg-terra-soft p-5 outline-none sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-terra-text">Limite atingido · Faça upgrade</p>
                <p className="mt-1 text-sm text-terra-text">
                  Você chegou ao máximo de {plan.albumLimit} álbuns do plano {plan.name}.
                </p>
              </div>
              <ButtonLink to="/conta#planos" className="shrink-0">
                Fazer upgrade
              </ButtonLink>
            </div>
          )}
        </div>
      )}

      <CreateAlbumModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </AppLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  return status === 'active' ? <Badge tone="published">Publicado</Badge> : <Badge tone="draft">Rascunho</Badge>;
}

function AlbumGridCard({ album }: { album: AlbumSummary }) {
  return (
    <Link to={`/albums/${album.id}`} className="group block rounded-[24px]">
      <div className="relative overflow-hidden rounded-[24px]">
        <AlbumCover src={album.cover_thumb} theme={album.theme} className="aspect-[270/228] w-full transition-transform duration-300 group-hover:scale-[1.02]" />
        <span className="absolute left-3.5 top-3.5">
          <StatusBadge status={album.status} />
        </span>
      </div>
      <p className="mt-3 truncate font-display text-xl font-semibold text-ink">{album.title}</p>
      <p className="text-sm text-muted">
        {plural(album.section_count, 'seção', 'seções')} · {plural(Number(album.total_photos) || 0, 'foto')}
      </p>
    </Link>
  );
}

function AlbumListRow({ album }: { album: AlbumSummary }) {
  return (
    <li>
      <Link to={`/albums/${album.id}`} className="flex items-center gap-4 p-4 hover:bg-sand/50">
        <AlbumCover src={album.cover_thumb} theme={album.theme} className="size-16 shrink-0 rounded-[16px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{album.title}</p>
          <p className="truncate text-sm text-muted">
            {plural(album.section_count, 'seção', 'seções')} · {plural(Number(album.total_photos) || 0, 'foto')}
            {album.subtitle ? ` · ${album.subtitle}` : ''}
          </p>
        </div>
        <StatusBadge status={album.status} />
      </Link>
    </li>
  );
}

function CreateCard({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={disabled}
      className={`flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-divider p-6 text-center transition-colors ${
        disabled ? 'opacity-60' : 'hover:bg-paper'
      }`}
    >
      <Plus className="size-11 text-sage" aria-hidden />
      <span className="mt-4 font-bold text-ink">Criar novo álbum</span>
      <span className="mt-1 text-sm text-muted">{disabled ? 'Limite do plano atingido' : 'Comece por uma ocasião'}</span>
    </button>
  );
}
