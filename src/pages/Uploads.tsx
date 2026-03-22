import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { AppLayout } from '../components';
import { getAlbumsByUser, getSectionsByAlbum } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Upload {
  id: string;
  name: string;
  size: number;
  type: 'image' | 'video';
  url: string;
  albumName: string;
  sectionName: string;
  uploadedAt: string;
}

interface Album {
  id: string;
  title: string;
}

interface Section {
  id: string;
  title: string;
  album_id: string;
}

export default function Uploads() {
  const { user: authUser } = useAuth();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authUser) loadData();
  }, [authUser]);

  useEffect(() => {
    if (selectedAlbum) {
      loadSections(selectedAlbum);
    } else {
      setSections([]);
      setSelectedSection('');
    }
  }, [selectedAlbum]);

  const loadData = async () => {
    if (!authUser) return;
    try {
      const userAlbums = await getAlbumsByUser(authUser.id);
      setAlbums(userAlbums as Album[]);
      setUploads([]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSections = async (albumId: string) => {
    try {
      const albumSections = await getSectionsByAlbum(albumId);
      setSections(albumSections as Section[]);
    } catch (error) {
      console.error('Error loading sections:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!selectedAlbum || !selectedSection) {
      alert('Selecione um álbum e uma seção primeiro');
      return;
    }

    handleUpload(files);
  };

  const handleUpload = async (files: FileList) => {
    setIsUploading(true);
    setUploadProgress(0);

    const album = albums.find(a => a.id === selectedAlbum);
    const section = sections.find(s => s.id === selectedSection);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Simulate upload progress
      for (let p = 0; p <= 100; p += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setUploadProgress(p);
      }

      // Create upload record
      const newUpload: Upload = {
        id: `upload-${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        url: URL.createObjectURL(file),
        albumName: album?.title || '',
        sectionName: section?.title || '',
        uploadedAt: new Date().toISOString()
      };

      setUploads(prev => [newUpload, ...prev]);
    }

    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (uploadId: string) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Uploads</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie suas fotos e vídeos</p>
      </div>

      <div>
        {/* Upload Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Fazer Upload</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Álbum</label>
              <select
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Selecione um álbum</option>
                {albums.map(album => (
                  <option key={album.id} value={album.id}>{album.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Seção</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={!selectedAlbum}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="">Selecione uma seção</option>
                {sections.map(section => (
                  <option key={section.id} value={section.id}>{section.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedAlbum && selectedSection
                    ? 'bg-primary text-background-dark hover:brightness-110'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined">cloud_upload</span>
                Selecionar Arquivos
              </label>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-400">Enviando...</span>
                <span className="font-medium text-slate-900 dark:text-white">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Drop Zone */}
          <div 
            className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (selectedAlbum && selectedSection && e.dataTransfer.files.length > 0) {
                handleUpload(e.dataTransfer.files);
              }
            }}
          >
            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">cloud_upload</span>
            <p className="text-slate-500 dark:text-slate-400">
              Arraste arquivos aqui ou clique no botão acima
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Formatos aceitos: JPG, PNG, GIF, MP4, MOV (máx. 50MB por arquivo)
            </p>
          </div>
        </div>

        {/* Uploads List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Arquivos Enviados ({uploads.length})
            </h2>
          </div>
          
          <div className="p-6">
            {uploads.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-4">cloud_off</span>
                <p className="text-slate-500 dark:text-slate-400 mb-2">Nenhum arquivo enviado ainda</p>
                <p className="text-sm text-slate-400">Selecione um álbum e seção para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {uploads.map(upload => (
                  <div 
                    key={upload.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0">
                      {upload.type === 'image' ? (
                        <img src={upload.url} alt={upload.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-2xl text-slate-400">videocam</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{upload.name}</p>
                      <p className="text-sm text-slate-500">
                        {formatBytes(upload.size)} • {upload.albumName} / {upload.sectionName}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(upload.uploadedAt)}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(upload.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
