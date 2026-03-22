import { useState, useEffect, type DragEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  getAlbumDashboard, 
  getSectionsByAlbum, 
  createSection, 
  updateSection, 
  deleteSection,
  reorderSections,
  getBackgroundPresets,
  updateAlbumPersonalization,
  getAlbumById,
  getUserStats,
  type Section,
  type BackgroundPreset,
  type Album
} from '../services/api';
import { ShareModal, AppLayout } from '../components';
import { 
  SectionModal, 
  Toast, 
  FileUpload, 
  PresetSelector,
  TableRowSkeleton,
  CardSkeleton 
} from '../components';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { albumId: routeAlbumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  
  const [album, setAlbum] = useState<Album | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [presets, setPresets] = useState<BackgroundPreset[]>([]);
  const [activeTab, setActiveTab] = useState<'year' | 'age' | 'category'>('year');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [draggedSection, setDraggedSection] = useState<Section | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [stats, setStats] = useState({
    storage_used: 0,
    storage_limit: 1073741824,
    view_count: 0,
    view_growth: 12,
    last_edited_at: new Date().toISOString(),
    last_edited_by: ''
  });

  const albumId = routeAlbumId || '';

  useEffect(() => {
    if (albumId) {
      loadData();
    } else {
      navigate('/albums');
    }
  }, [albumId, activeTab]);

  const loadData = async () => {
    if (!albumId) return;
    
    try {
      setIsLoading(true);
      
      const dashboardData = await getAlbumDashboard(albumId);
      if (dashboardData) {
        setAlbum(dashboardData.album);
        const newStats = { ...dashboardData.stats };
        
        if (authUser?.id) {
          const userStats = await getUserStats(authUser.id);
          newStats.storage_used = userStats.storageUsed;
          newStats.storage_limit = userStats.storageLimit;
          newStats.last_edited_by = authUser.name || authUser.email || 'Você';
        }
        
        setStats(newStats);
      }
      
      const sectionsData = await getSectionsByAlbum(albumId, activeTab);
      setSections(sectionsData);
      
      const presetsData = await getBackgroundPresets();
      setPresets(presetsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateSection = () => {
    setEditingSection(null);
    setIsModalOpen(true);
  };

  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setIsModalOpen(true);
  };

  const handleSaveSection = async (data: {
    title: string;
    description?: string;
    icon: string;
    image_url?: string;
    section_type: 'year' | 'age' | 'category' | 'custom';
    status: 'active' | 'draft';
  }) => {
    if (!albumId) {
      showToast('Álbum não inicializado. Aguarde...', 'error');
      return;
    }
    
    try {
      if (editingSection) {
        await updateSection(editingSection.id, data);
        showToast('Seção atualizada com sucesso!', 'success');
      } else {
        await createSection({
          album_id: albumId,
          ...data
        });
        showToast('Seção criada com sucesso!', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving section:', error);
      showToast('Erro ao salvar seção', 'error');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta seção?')) return;
    
    try {
      await deleteSection(sectionId);
      showToast('Seção excluída com sucesso!', 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting section:', error);
      showToast('Erro ao excluir seção', 'error');
    }
  };

  const handleDragStart = (section: Section) => {
    setDraggedSection(section);
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedSection || !albumId) return;
    
    const currentIndex = sections.findIndex(s => s.id === draggedSection.id);
    if (currentIndex === dropIndex) return;
    
    const newSections = [...sections];
    newSections.splice(currentIndex, 1);
    newSections.splice(dropIndex, 0, draggedSection);
    
    setSections(newSections);
    
    try {
      const sectionIds = newSections.map(s => s.id);
      await reorderSections(albumId, sectionIds);
      showToast('Ordem das seções atualizada!', 'success');
    } catch (error) {
      console.error('Error reordering sections:', error);
      showToast('Erro ao reordenar seções', 'error');
      loadData();
    }
    
    setDraggedSection(null);
  };

  const handleSaveChanges = async () => {
    if (!album || !albumId) {
      showToast('Álbum não inicializado. Aguarde...', 'error');
      return;
    }
    
    try {
      await updateAlbumPersonalization(albumId, {
        cover_image_url: album.cover_image_url,
        background_image_url: album.background_image_url,
        theme: album.theme
      });
      showToast('Alterações salvas com sucesso!', 'success');
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast('Erro ao salvar alterações', 'error');
    }
  };

  const handleCoverUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    setAlbum(prev => prev ? { ...prev, cover_image_url: url } : null);
    showToast('Capa atualizada!', 'success');
  };

  const handleBackgroundUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    setAlbum(prev => prev ? { ...prev, custom_background_url: url, background_image_url: url } : null);
    showToast('Fundo atualizado!', 'success');
  };

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(1) + ' GB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AppLayout>
      {/* Dashboard Header (inside AppLayout content area) */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-display font-bold truncate">Personalização</h2>
          <p className="text-xs md:text-sm text-slate-500">Configure como suas memórias são organizadas.</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="p-2 md:px-4 md:py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors flex items-center gap-1 md:gap-2"
          >
            <span className="material-symbols-outlined text-sm">share</span>
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
          <Link
            to={`/viewer/${albumId}`}
            className="p-2 md:px-4 md:py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 md:gap-2"
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
            <span className="hidden sm:inline">Visualizar</span>
          </Link>
          <button 
            onClick={handleSaveChanges}
            disabled={!albumId || isLoading}
            className="px-3 md:px-6 py-2 rounded-lg bg-primary text-background-dark text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Salvar</span>
            <span className="sm:hidden">
              <span className="material-symbols-outlined text-sm">save</span>
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-6 md:space-y-8">
            {/* Background Customization Card */}
            <section className="bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold">Capa e Fundos</h3>
                <p className="text-sm text-slate-500">Escolha as imagens principais do seu álbum digital.</p>
              </div>
              
              <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-sm font-semibold">Imagem de Capa</p>
                  <FileUpload onUpload={handleCoverUpload} className="aspect-video rounded-xl overflow-hidden">
                    <div className="relative group w-full h-full border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                      {album?.cover_image_url ? (
                        <img 
                          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" 
                          alt="Cover" 
                          src={album.cover_image_url}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
                      )}
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-primary">add_a_photo</span>
                        <p className="text-xs font-medium">Clique para trocar a capa</p>
                      </div>
                    </div>
                  </FileUpload>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm font-semibold">Fundo das Seções</p>
                  <PresetSelector 
                    presets={presets}
                    selectedUrl={album?.background_image_url}
                    onSelect={(url) => setAlbum(prev => prev ? { ...prev, background_image_url: url } : null)}
                  />
                  <FileUpload onUpload={handleBackgroundUpload}>
                    <button className="w-full py-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
                      <span className="material-symbols-outlined text-sm">upload_file</span> Carregar Textura Própria
                    </button>
                  </FileUpload>
                </div>
              </div>
            </section>

            {/* Album Sections Management */}
            <section className="bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold">Estrutura do Álbum</h3>
                    <p className="text-sm text-slate-500 hidden sm:block">Organize fotos por anos ou fases da vida.</p>
                  </div>
                  <button 
                    onClick={handleCreateSection}
                    disabled={!albumId || isLoading}
                    className="flex items-center gap-2 bg-slate-900 dark:bg-primary text-white dark:text-background-dark px-3 md:px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span className="hidden sm:inline">Nova Seção</span>
                    <span className="sm:hidden">Nova</span>
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 mb-4 md:mb-6">
                  {(['year', 'age', 'category'] as const).map((tab) => (
                    <button
                      key={tab}
                      className={`px-4 md:px-6 py-3 border-b-2 text-sm font-bold transition-colors ${
                        activeTab === tab 
                          ? 'border-primary text-slate-900 dark:text-white' 
                          : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'year' ? 'Anos' : tab === 'age' ? 'Idades' : 'Categorias'}
                    </button>
                  ))}
                </div>

                {/* Table - scrollable on mobile */}
                <div className="overflow-x-auto -mx-4 md:mx-0 rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                        <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase tracking-wider">Nome da Seção</th>
                        <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase tracking-wider hidden sm:table-cell">Mídias</th>
                        <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase tracking-wider hidden md:table-cell">Data</th>
                        <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase tracking-wider text-center">Status</th>
                        <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {isLoading ? (
                        <>
                          <TableRowSkeleton />
                          <TableRowSkeleton />
                          <TableRowSkeleton />
                          <TableRowSkeleton />
                        </>
                      ) : sections.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                            <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 block">folder_open</span>
                            <p>Nenhuma seção encontrada</p>
                            <p className="text-sm">Clique em "Nova Seção" para começar</p>
                          </td>
                        </tr>
                      ) : (
                        sections.map((section, index) => (
                          <tr 
                            key={section.id} 
                            draggable
                            onDragStart={() => handleDragStart(section)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-move ${
                              dragOverIndex === index ? 'bg-primary/10 dark:bg-primary/20 border-t-2 border-primary' : ''
                            } ${draggedSection?.id === section.id ? 'opacity-50' : ''}`}
                          >
                            <td className="px-4 md:px-6 py-4">
                              <div className="flex items-center gap-2 md:gap-3">
                                <span className="material-symbols-outlined text-slate-400 cursor-grab hidden sm:inline">drag_indicator</span>
                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                  <span className="material-symbols-outlined text-lg">{section.icon}</span>
                                </div>
                                <span className="text-sm font-bold truncate max-w-[120px] md:max-w-none">{section.title}</span>
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4 hidden sm:table-cell">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="material-symbols-outlined text-sm">image</span> {section.photo_count}
                                <span className="material-symbols-outlined text-sm ml-2">videocam</span> {section.video_count}
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4 text-sm text-slate-500 hidden md:table-cell">{formatDate(section.created_at)}</td>
                            <td className="px-4 md:px-6 py-4 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                section.status === 'active' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-primary/20 text-primary dark:bg-primary/10'
                              }`}>
                                {section.status === 'active' ? 'Ativo' : 'Rascunho'}
                              </span>
                            </td>
                            <td className="px-4 md:px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 md:gap-2">
                                <button 
                                  onClick={() => handleEditSection(section)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-primary transition-colors"
                                >
                                  <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button 
                                  onClick={() => handleDeleteSection(section.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Quick Stats & Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {isLoading ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                <>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 md:p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="material-symbols-outlined text-primary">storage</span>
                      <h4 className="font-bold text-sm">Armazenamento</h4>
                    </div>
                    <div className="w-full bg-primary/10 h-2 rounded-full mb-2">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (stats.storage_used / stats.storage_limit) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                      {formatStorage(stats.storage_used)} de {formatStorage(stats.storage_limit)} usados
                    </p>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-5 md:p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="material-symbols-outlined text-primary">visibility</span>
                      <h4 className="font-bold text-sm">Visualizações</h4>
                    </div>
                    <p className="text-2xl font-display font-bold">{stats.view_count.toLocaleString()}</p>
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">trending_up</span> +{stats.view_growth}% este mês
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-5 md:p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="material-symbols-outlined text-primary">history</span>
                      <h4 className="font-bold text-sm">Última Edição</h4>
                    </div>
                    <p className="text-sm font-medium">{formatDateTime(stats.last_edited_at)}</p>
                    <p className="text-xs text-slate-500">Por {stats.last_edited_by}</p>
                  </div>
                </>
              )}
            </div>

          <SectionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveSection}
            section={editingSection}
            defaultType={activeTab}
          />

          {album && (
            <ShareModal
              isOpen={isShareModalOpen}
              onClose={() => setIsShareModalOpen(false)}
              albumId={album.id}
              albumTitle={album.title}
            />
          )}

          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}

      </div>
      <footer className="mt-8 text-center border-t border-slate-100 dark:border-slate-800 pt-6">
        <p className="text-xs text-slate-400">© 2024 Memórias de Luxo Digital. Todos os direitos reservados.</p>
      </footer>
    </AppLayout>
  );
}
