import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { validateShareToken, getSectionsByAlbum, claimAlbumShare, type Section } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ShareContext {
  valid: boolean;
  album: any | null;
  ownerName: string;
  error?: string;
}

export default function PublicAlbumViewer() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();
  
  const [shareContext, setShareContext] = useState<ShareContext | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [error, setError] = useState<{ type: string; message: string } | null>(null);

  // Check if banner was dismissed
  useEffect(() => {
    const bannerDismissed = sessionStorage.getItem(`banner_dismissed_${token}`);
    if (bannerDismissed) {
      setShowBanner(false);
    }
  }, [token]);

  // Load album data
  useEffect(() => {
    if (token) {
      loadSharedAlbum();
    }
  }, [token]);

  // Auto-claim the album for any logged-in user viewing the public link
  useEffect(() => {
    if (authUser && shareContext?.valid && shareContext.album) {
      claimAlbumShare(token!, authUser.id).catch(console.error);
    }
  }, [authUser, shareContext, token]);

  const loadSharedAlbum = async () => {
    try {
      setIsLoading(true);
      
      // Validate share token
      const context = await validateShareToken(token!);
      setShareContext(context);

      if (!context.valid) {
        if (context.error === 'inactive') {
          setError({ type: 'inactive', message: 'Este link foi desativado pelo proprietário.' });
        } else if (context.error === 'expired') {
          setError({ type: 'expired', message: 'Este link expirou.' });
        } else {
          setError({ type: 'not_found', message: 'Este link não existe ou foi removido.' });
        }
        return;
      }

      // Load sections
      const sectionsData = await getSectionsByAlbum(context.album.id);
      setSections(sectionsData);

    } catch (err) {
      console.error('Error loading shared album:', err);
      setError({ type: 'error', message: 'Não foi possível carregar o álbum. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrev = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem(`banner_dismissed_${token}`, 'true');
  };

  const handleCreateAccount = () => {
    sessionStorage.setItem('pending_album_token', token!);
    navigate('/register');
  };

  const handleLogin = () => {
    sessionStorage.setItem('pending_album_token', token!);
    navigate('/login');
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Carregando álbum...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorConfig = {
      inactive: {
        icon: 'link_off',
        title: 'Link desativado',
        color: 'text-orange-400',
      },
      expired: {
        icon: 'timer_off',
        title: 'Link expirado',
        color: 'text-amber-400',
      },
      not_found: {
        icon: 'search_off',
        title: 'Link não encontrado',
        color: 'text-slate-300',
      },
      error: {
        icon: 'error',
        title: 'Erro ao carregar',
        color: 'text-red-300',
      },
    };
    const cfg = errorConfig[error.type as keyof typeof errorConfig] ?? errorConfig.not_found;

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <span className={`material-symbols-outlined text-7xl ${cfg.color} block mb-4`}>
            {cfg.icon}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{cfg.title}</h1>
          <p className="text-slate-500 mb-6">{error.message}</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Voltar para página inicial
          </Link>
        </div>
      </div>
    );
  }

  if (!shareContext?.valid || !shareContext.album) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">link_off</span>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Link inválido</h1>
          <p className="text-slate-500 mb-6">Este link de compartilhamento não é válido.</p>
          <Link to="/" className="text-primary hover:underline">
            Voltar para página inicial
          </Link>
        </div>
      </div>
    );
  }

  const album = shareContext.album;
  const currentSection = sections[currentSectionIndex];
  const isAuthenticated = !!authUser;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50">
      {/* Signup Banner - Only for anonymous users */}
      {showBanner && !isAuthenticated && (
        <div className="bg-white/90 backdrop-blur-sm border-b border-primary/20 px-4 py-3 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary flex-shrink-0">auto_stories</span>
              <p className="text-sm text-slate-700 truncate">
                <span className="font-medium hidden sm:inline">Álbum compartilhado. </span>
                <span className="hidden sm:inline">Crie uma conta e salve para acessar sempre.</span>
                <span className="sm:hidden font-medium">Salve este álbum</span>
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleCreateAccount}
                className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:brightness-110 transition-all"
              >
                Criar conta
              </button>
              <button
                onClick={handleLogin}
                className="text-primary px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/10 transition-all hidden sm:block"
              >
                Já tenho conta
              </button>
              <button
                onClick={dismissBanner}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                title="Fechar"
              >
                <span className="material-symbols-outlined text-slate-400 text-sm">close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-700 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-medium">Voltar</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="material-symbols-outlined text-primary">visibility</span>
            <span>Modo visualização</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Album Title */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-slate-900 mb-3 md:mb-4">
            {album.title}
          </h1>
          {album.subtitle && (
            <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto italic">{album.subtitle}</p>
          )}
          <p className="text-sm text-slate-400 mt-3 md:mt-4">
            Por {shareContext.ownerName}
          </p>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">folder_open</span>
            <p className="text-slate-500">Este álbum ainda não tem conteúdo.</p>
          </div>
        ) : (
          <>
            {/* Album Viewer */}
            <div className="flex flex-col items-center gap-4 mb-8 md:mb-12">
              {/* Page Content */}
              <div className="w-full max-w-4xl aspect-[4/3] bg-white rounded-xl shadow-2xl overflow-hidden border border-primary/10">
                <div className="w-full h-full flex flex-col p-5 md:p-12">
                  {currentSection ? (
                    <>
                      <div className="flex items-center gap-3 mb-3 md:mb-4">
                        <span 
                          className="material-symbols-outlined text-xl md:text-2xl"
                          style={{ color: currentSection.icon_color }}
                        >
                          {currentSection.icon}
                        </span>
                        <span 
                          className="font-bold text-xs md:text-sm uppercase tracking-wider"
                          style={{ color: currentSection.icon_color }}
                        >
                          {currentSection.section_type === 'year' ? 'Ano' : 
                           currentSection.section_type === 'age' ? 'Idade' : 
                           currentSection.section_type === 'category' ? 'Categoria' : 'Seção'}
                        </span>
                      </div>
                      
                      <h3 className="font-display text-xl md:text-3xl font-bold mb-3 md:mb-6">{currentSection.title}</h3>
                      
                      <div className="flex-1 flex items-center justify-center min-h-0">
                        {currentSection.image_url ? (
                          <img 
                            src={currentSection.image_url} 
                            alt={currentSection.title}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                          />
                        ) : (
                          <div className="w-full max-w-md aspect-[4/3] rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <span className="material-symbols-outlined text-5xl text-primary/40">photo_library</span>
                          </div>
                        )}
                      </div>
                      
                      {currentSection.description && (
                        <p className="text-slate-600 italic text-center mt-3 md:mt-6 text-sm md:text-base">
                          "{currentSection.description}"
                        </p>
                      )}
                      
                      <div className="text-center mt-2 md:mt-4">
                        <span className="text-xs font-bold text-primary/40 tracking-widest">
                          PÁGINA {currentSectionIndex + 1} DE {sections.length}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-slate-400">Página vazia</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Controls - below card */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrev}
                  disabled={currentSectionIndex === 0}
                  className="p-3 rounded-full bg-white shadow-lg border border-primary/20 hover:bg-primary hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-2xl">chevron_left</span>
                </button>

                <div className="flex gap-2">
                  {sections.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSectionIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentSectionIndex 
                          ? 'bg-primary w-6' 
                          : 'bg-primary/30 hover:bg-primary/50 w-2'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  disabled={currentSectionIndex >= sections.length - 1}
                  className="p-3 rounded-full bg-white shadow-lg border border-primary/20 hover:bg-primary hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-2xl">chevron_right</span>
                </button>
              </div>

              <p className="text-center text-sm text-slate-500">
                Seção {currentSectionIndex + 1} de {sections.length}
              </p>
            </div>
          </>
        )}

        {/* Album Info */}
        <section className="mt-16 text-center">
          <div className="p-8 bg-white/50 rounded-xl border border-primary/10 max-w-2xl mx-auto">
            <h4 className="font-display text-xl font-bold mb-2">Sobre este Álbum</h4>
            <p className="text-slate-600 mb-4">
              {album.description || 'Um álbum especial de memórias.'}
            </p>
            <div className="flex justify-center gap-8 text-sm">
              <div>
                <span className="font-bold text-primary">{sections.length}</span>
                <span className="text-slate-500 ml-1">seções</span>
              </div>
              <div>
                <span className="font-bold text-primary">
                  {sections.reduce((sum, s) => sum + (s.photo_count || 0), 0)}
                </span>
                <span className="text-slate-500 ml-1">fotos</span>
              </div>
              <div>
                <span className="font-bold text-primary">
                  {sections.reduce((sum, s) => sum + (s.video_count || 0), 0)}
                </span>
                <span className="text-slate-500 ml-1">vídeos</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 text-center text-sm text-slate-400">
        <p>Álbum compartilhado via Aniversário</p>
      </footer>
    </div>
  );
}