import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getAlbumById, getSectionsByAlbum, type Album, type Section } from '../services/api';
import ShareModal from '../components/ShareModal';

export default function Viewer() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<Album | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (albumId) {
      loadData();
    }
  }, [albumId]);

  const loadData = async () => {
    if (!albumId) return;
    
    try {
      setIsLoading(true);
      const [albumData, sectionsData] = await Promise.all([
        getAlbumById(albumId),
        getSectionsByAlbum(albumId)
      ]);
      
      setAlbum(albumData);
      setSections(sectionsData);
    } catch (error) {
      console.error('Error loading album:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const currentSection = sections[currentSectionIndex];

  if (isLoading) {
    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-primary animate-pulse">auto_stories</span>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Carregando álbum...</p>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500">error</span>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Álbum não encontrado</p>
          <button 
            onClick={() => navigate('/albums')}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg"
          >
            Voltar para Álbuns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 min-h-screen relative">
      {album.background_image_url && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: `url(${album.background_image_url})` }}
        />
      )}
      
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between border-b border-primary/20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-sm px-4 md:px-10 py-3 md:py-4 sticky top-0 z-50 gap-3">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className="size-8 text-primary flex-shrink-0">
            <span className="material-symbols-outlined text-3xl md:text-4xl">auto_stories</span>
          </div>
          <h2 className="font-display text-base md:text-xl font-bold leading-tight tracking-tight truncate">{album.title}</h2>
        </div>
        <nav className="hidden md:flex flex-1 justify-center gap-12">
          <Link to="/albums" className="hover:text-primary transition-colors text-sm font-medium">Meus Álbuns</Link>
          <span className="text-sm font-medium border-b-2 border-primary">Visualizando</span>
        </nav>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center justify-center rounded-xl min-h-[44px] min-w-[44px] md:h-10 md:w-auto md:px-4 bg-primary/10 hover:bg-primary/20 text-slate-900 dark:text-slate-100 transition-colors md:gap-2"
            title="Compartilhar"
          >
            <span className="material-symbols-outlined text-sm">share</span>
            <span className="hidden md:inline text-sm font-medium">Compartilhar</span>
          </button>
          <Link 
            to={`/dashboard/${albumId}`} 
            className="flex items-center justify-center rounded-xl min-h-[44px] min-w-[44px] md:h-10 md:w-auto md:px-4 bg-primary/10 hover:bg-primary/20 text-slate-900 dark:text-slate-100 transition-colors md:gap-2"
            title="Editar"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            <span className="hidden md:inline text-sm font-medium">Editar</span>
          </Link>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 py-6 md:py-8 relative z-10">
        {/* Breadcrumbs - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2 mb-8 opacity-70">
          <Link to="/albums" className="text-sm font-medium hover:text-primary">Meus Álbuns</Link>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-sm font-medium text-primary">{album.title}</span>
        </div>

        {/* Title Section */}
        <div className="mb-8 md:mb-12 text-center">
          <h1 className="font-display text-3xl md:text-5xl font-black mb-3 md:mb-4 tracking-tighter">{album.title}</h1>
          {album.subtitle && (
            <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-2xl mx-auto italic">{album.subtitle}</p>
          )}
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-primary">folder_open</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Nenhuma seção ainda
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Este álbum ainda não tem seções. Adicione seções no painel de controle para visualizá-las aqui.
            </p>
            <Link
              to={`/dashboard/${albumId}`}
              className="inline-flex items-center gap-2 bg-primary text-background-dark px-6 py-3 rounded-lg font-bold hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined">add</span>
              Adicionar Seções
            </Link>
          </div>
        ) : (
          <>
            {/* Flipbook Container */}
            <div className="flex flex-col items-center gap-4">
              {/* Page Card */}
              <div className="w-full max-w-4xl aspect-[4/3] bg-white dark:bg-slate-900 rounded-xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden border border-primary/10 relative">
                <div className="w-full h-full flex flex-col relative bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
                  {currentSection ? (
                    <>
                      <div className="px-6 md:px-12 pt-6 md:pt-10 pb-3 md:pb-4 shrink-0">
                        <div className="flex items-center gap-3 mb-2 md:mb-3">
                          <span 
                            className="material-symbols-outlined text-xl md:text-2xl" 
                            style={{ color: currentSection.icon_color }}
                          >
                            {currentSection.icon}
                          </span>
                          <span 
                            className="font-display font-bold text-sm md:text-lg block uppercase tracking-[0.2em]"
                            style={{ color: currentSection.icon_color }}
                          >
                            {currentSection.section_type === 'year' ? 'Ano' : 
                             currentSection.section_type === 'age' ? 'Idade' : 
                             currentSection.section_type === 'category' ? 'Categoria' : 'Seção'}
                          </span>
                        </div>
                        <h3 className="font-display text-xl md:text-3xl font-bold leading-tight">{currentSection.title}</h3>
                      </div>
                      
                      <div className="flex-1 px-6 md:px-12 py-2 md:py-4 flex items-center justify-center min-h-0 overflow-hidden">
                        {currentSection.image_url ? (
                          <div className="h-full flex items-center justify-center">
                            <img 
                              src={currentSection.image_url} 
                              alt={currentSection.title}
                              className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-lg border-2 md:border-4 border-white dark:border-slate-700"
                            />
                          </div>
                        ) : (
                          <div className="w-full max-w-md h-full max-h-[300px] rounded-lg overflow-hidden shadow-lg border-2 md:border-4 border-white dark:border-slate-700 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <div className="text-center">
                              <span className="material-symbols-outlined text-5xl text-primary/40">photo_library</span>
                              <p className="text-sm text-slate-500 mt-2">{currentSection.photo_count} fotos</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="px-6 md:px-12 pb-4 md:pb-10 pt-2 md:pt-4 shrink-0">
                        {currentSection.description && (
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-display italic text-center mb-3 md:mb-4 text-sm md:text-base">
                            "{currentSection.description}"
                          </p>
                        )}
                        <div className="flex justify-center text-xs font-bold text-primary/40 tracking-widest">
                          PÁGINA {currentSectionIndex + 1} DE {sections.length}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-slate-400">Página vazia</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Controls - below card on all sizes */}
              <div className="flex items-center gap-4 mt-2">
                <button 
                  onClick={handlePrevious}
                  disabled={currentSectionIndex === 0}
                  className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-primary/20 hover:bg-primary hover:text-white transition-all transform hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-inherit disabled:hover:scale-100"
                >
                  <span className="material-symbols-outlined text-2xl md:text-3xl">chevron_left</span>
                </button>

                {/* Page Dots */}
                <div className="flex items-center gap-2">
                  {sections.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSectionIndex(index)}
                      className={`rounded-full transition-all ${
                        index === currentSectionIndex 
                          ? 'w-6 md:w-8 h-2 bg-primary shadow-[0_0_10px_rgba(244,192,37,0.5)]' 
                          : 'w-2 h-2 bg-primary/30 hover:bg-primary/50'
                      }`}
                    />
                  ))}
                </div>

                <button 
                  onClick={handleNext}
                  disabled={currentSectionIndex >= sections.length - 1}
                  className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-primary/20 hover:bg-primary hover:text-white transition-all transform hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-inherit disabled:hover:scale-100"
                >
                  <span className="material-symbols-outlined text-2xl md:text-3xl">chevron_right</span>
                </button>
              </div>

              <p className="text-sm text-slate-500">
                Seção {currentSectionIndex + 1} de {sections.length}
              </p>
            </div>
          </>
        )}

        {/* Album Info */}
        <section className="mt-16 md:mt-24 text-center">
          <div className="p-6 md:p-8 bg-primary/5 rounded-xl border border-primary/10 max-w-2xl mx-auto">
            <h4 className="font-display text-xl font-bold mb-2">Sobre este Álbum</h4>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {album.description || 'Um álbum especial de memórias.'}
            </p>
            <div className="flex justify-center gap-6 md:gap-8 text-sm">
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

      <footer className="mt-16 md:mt-32 bg-primary/5 border-t border-primary/10 py-8 md:py-12 px-4 md:px-10 relative z-10">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-3xl text-primary">auto_stories</span>
            <span className="font-display font-bold text-base md:text-lg">{album.title} © {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowShareModal(true)}
              className="size-10 rounded-full border border-primary/20 flex items-center justify-center hover:bg-primary hover:text-white transition-all"
              title="Compartilhar álbum"
            >
              <span className="material-symbols-outlined">share</span>
            </button>
            <button className="size-10 rounded-full border border-primary/20 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
              <span className="material-symbols-outlined">favorite</span>
            </button>
          </div>
        </div>
      </footer>

      {albumId && album && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          albumId={albumId}
          albumTitle={album.title}
        />
      )}
    </div>
  );
}
