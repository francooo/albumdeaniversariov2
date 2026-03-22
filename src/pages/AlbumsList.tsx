import React, { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAlbumsByUser, createAlbum, getUserStats, type Album } from '../services/api';
import { Toast, AppLayout } from '../components';
import { useAuth } from '../contexts/AuthContext';

export default function AlbumsList() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumSubtitle, setNewAlbumSubtitle] = useState('');
  const [storageStats, setStorageStats] = useState({
    used: 0,
    limit: 1073741824, // 1GB default
    percentage: 0
  });

  useEffect(() => {
    if (authUser) loadAlbums();
  }, [authUser]);

  const loadAlbums = async () => {
    if (!authUser) return;
    try {
      setIsLoading(true);
      const albumsData = await getAlbumsByUser(authUser.id);
      setAlbums(albumsData);
      
      // Load user's storage stats
      const userStats = await getUserStats(authUser.id);
      setStorageStats({
        used: userStats.storageUsed,
        limit: userStats.storageLimit,
        percentage: Math.min(100, (userStats.storageUsed / userStats.storageLimit) * 100)
      });
    } catch (error) {
      console.error('Error loading albums:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setNewAlbumTitle(authUser ? `Álbum de ${authUser.name}` : '');
    setNewAlbumSubtitle('');
    setShowCreateModal(true);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateAlbum = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!newAlbumTitle.trim()) {
      showToast('Digite um título para o álbum', 'error');
      return;
    }

    if (!authUser) return;

    setIsCreating(true);

    try {
      const newAlbum = await createAlbum({
        user_id: authUser.id,
        title: newAlbumTitle,
        subtitle: newAlbumSubtitle || undefined,
        theme: 'gold',
        status: 'draft'
      });
      
      showToast('Álbum criado com sucesso!', 'success');
      setShowCreateModal(false);
      setNewAlbumTitle('');
      setNewAlbumSubtitle('');
      
      // Navigate to the new album's dashboard
      navigate(`/dashboard/${newAlbum.id}`);
    } catch (error) {
      console.error('Error creating album:', error);
      showToast('Erro ao criar álbum', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Format bytes to human readable
  const formatStorage = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getThemeColor = (theme: string) => {
    const colors: Record<string, string> = {
      gold: 'from-yellow-400 to-amber-600',
      silver: 'from-gray-300 to-gray-500',
      'rose-gold': 'from-rose-300 to-rose-500',
      minimal: 'from-slate-200 to-slate-400'
    };
    return colors[theme] || colors.gold;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      archived: 'bg-gray-100 text-gray-700'
    };
    const labels: Record<string, string> = {
      draft: 'Rascunho',
      active: 'Ativo',
      archived: 'Arquivado'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <AppLayout maxWidth="max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Meus Álbuns</h1>
          <p className="text-sm text-slate-500 mt-1">{albums.length} álbum{albums.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-primary text-background-dark px-4 py-2.5 rounded-lg text-sm font-bold hover:brightness-110 transition-all self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Novo Álbum
        </button>
      </div>

      <div>
        {/* Storage Widget */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-8 w-full sm:max-w-md sm:ml-auto">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">cloud</span>
            Armazenamento
          </h3>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full mb-2"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500">Usado</span>
                <span className="text-sm font-medium">
                  {formatStorage(storageStats.used)} / {formatStorage(storageStats.limit)}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${storageStats.percentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400">{storageStats.percentage.toFixed(1)}% utilizado</p>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 h-64 animate-pulse">
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-t-xl" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-primary">photo_album</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Nenhum álbum ainda
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Crie seu primeiro álbum de aniversário para começar a guardar suas memórias especiais.
            </p>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-primary text-background-dark px-6 py-3 rounded-lg font-bold hover:brightness-110 transition-all mx-auto"
            >
              <span className="material-symbols-outlined">add</span>
              Criar Primeiro Álbum
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => (
              <Link
                key={album.id}
                to={`/dashboard/${album.id}`}
                className="group bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Album Cover */}
                <div className={`h-40 bg-gradient-to-br ${getThemeColor(album.theme)} relative`}>
                  {album.cover_image_url ? (
                    <img
                      src={album.cover_image_url}
                      alt={album.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-white/50">photo_album</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(album.status)}
                  </div>
                </div>

                {/* Album Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors">
                    {album.title}
                  </h3>
                  {album.subtitle && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                      {album.subtitle}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">image</span>
                      {album.total_photos || 0} fotos
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">videocam</span>
                      {album.total_videos || 0} vídeos
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      {album.view_count || 0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Criado em {new Date(album.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </Link>
            ))}

            {/* Create New Card */}
            <button
              onClick={openCreateModal}
              className="group bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 h-64 flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-3xl text-primary">add</span>
              </div>
              <span className="font-bold text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                Criar Novo Álbum
              </span>
            </button>
          </div>
        )}
      {/* Create Album Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Criar Novo Álbum
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-slate-400">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Título do Álbum *
                </label>
                <input
                  type="text"
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  placeholder="Ex: Aniversário de 30 Anos"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Subtítulo (opcional)
                </label>
                <input
                  type="text"
                  value={newAlbumSubtitle}
                  onChange={(e) => setNewAlbumSubtitle(e.target.value)}
                  placeholder="Ex: Uma celebração especial"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-3 rounded-lg bg-primary text-background-dark font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Criando...' : 'Criar Álbum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      </div>
    </AppLayout>
  );
}
