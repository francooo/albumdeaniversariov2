import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserStats, getAlbumsByUser } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components';

interface Stats {
  totalAlbums: number;
  totalSections: number;
  totalPhotos: number;
  totalVideos: number;
  storageUsed: number;
  storageLimit: number;
}

interface RecentAlbum {
  id: string;
  title: string;
  updated_at: string;
  cover_image_url?: string;
}

export default function Overview() {
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentAlbums, setRecentAlbums] = useState<RecentAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('Usuário');

  useEffect(() => {
    if (authUser) loadData();
  }, [authUser]);

  const loadData = async () => {
    if (!authUser) return;
    try {
      setUserName(authUser.name);
      
      const [userStats, albums] = await Promise.all([
        getUserStats(authUser.id),
        getAlbumsByUser(authUser.id)
      ]);
      
      setStats(userStats);
      setRecentAlbums(albums.slice(0, 5) as RecentAlbum[]);
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getStoragePercentage = () => {
    if (!stats) return 0;
    return Math.min((stats.storageUsed / stats.storageLimit) * 100, 100);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
            <span className="text-lg text-slate-600 dark:text-slate-400">Carregando...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Visão Geral</h1>
          <p className="text-sm text-slate-500 mt-1">Bem-vindo de volta, {userName}!</p>
        </div>
        <Link 
          to="/albums"
          className="flex items-center gap-2 bg-primary text-background-dark px-3 md:px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all flex-shrink-0"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span className="hidden sm:inline">Novo Álbum</span>
          <span className="sm:hidden">Novo</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 md:w-12 h-10 md:h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">auto_stories</span>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalAlbums || 0}</p>
              <p className="text-xs md:text-sm text-slate-500">Álbuns</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 md:w-12 h-10 md:h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">folder</span>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalSections || 0}</p>
              <p className="text-xs md:text-sm text-slate-500">Seções</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 md:w-12 h-10 md:h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400">photo_library</span>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalPhotos || 0}</p>
              <p className="text-xs md:text-sm text-slate-500">Fotos</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 md:w-12 h-10 md:h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">videocam</span>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalVideos || 0}</p>
              <p className="text-xs md:text-sm text-slate-500">Vídeos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Recent Albums */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Álbuns Recentes</h2>
            <Link to="/albums" className="text-sm text-primary font-medium hover:underline">Ver todos</Link>
          </div>
          <div className="p-4 md:p-6">
            {recentAlbums.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2 block">folder_open</span>
                <p className="text-slate-500">Nenhum álbum criado ainda</p>
                <Link 
                  to="/albums" 
                  className="inline-flex items-center gap-2 mt-4 text-primary font-medium hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Criar primeiro álbum
                </Link>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {recentAlbums.map(album => (
                  <Link 
                    key={album.id}
                    to={`/dashboard/${album.id}`}
                    className="flex items-center gap-3 md:gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="w-10 md:w-12 h-10 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {album.cover_image_url ? (
                        <img src={album.cover_image_url} alt={album.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-primary">auto_stories</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{album.title}</p>
                      <p className="text-xs text-slate-500">Atualizado em {formatDate(album.updated_at)}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 flex-shrink-0">chevron_right</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Storage */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Armazenamento</h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-400">Usado</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatBytes(stats?.storageUsed || 0)} / {formatBytes(stats?.storageLimit || 0)}
                </span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${getStoragePercentage()}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">{getStoragePercentage().toFixed(1)}% utilizado</p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Link 
                to="/uploads"
                className="flex items-center gap-3 text-primary font-medium hover:underline"
              >
                <span className="material-symbols-outlined">cloud_upload</span>
                Gerenciar Uploads
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 md:mt-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 md:p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Link 
            to="/albums"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl text-primary">add_photo_alternate</span>
            <span className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 text-center">Criar Álbum</span>
          </Link>
          <Link 
            to="/uploads"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl text-primary">cloud_upload</span>
            <span className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 text-center">Upload</span>
          </Link>
          <Link 
            to="/account"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl text-primary">person</span>
            <span className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 text-center">Minha Conta</span>
          </Link>
          <Link 
            to="/privacy"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl text-primary">shield</span>
            <span className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 text-center">Privacidade</span>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
