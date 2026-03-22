import { useState, useEffect } from 'react';
import { generateShareToken, toggleShareLink, getShareStats, getShareLinkStatus } from '../services/api';
import Modal from './Modal';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumId: string;
  albumTitle: string;
}

export default function ShareModal({ isOpen, onClose, albumId, albumTitle }: ShareModalProps) {
  const [shareToken, setShareToken] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ totalViews: 0, uniqueViews: 0, claimedByUsers: 0 });

  const baseUrl = window.location.origin;
  const shareUrl = shareToken ? `${baseUrl}/album/publico/${shareToken}` : '';

  useEffect(() => {
    if (isOpen && albumId) {
      loadShareData();
    }
  }, [isOpen, albumId]);

  const loadShareData = async () => {
    try {
      setIsLoading(true);
      
      // First check if there's an existing share link
      const status = await getShareLinkStatus(albumId);
      
      if (status.token) {
        // Existing link found
        setShareToken(status.token);
        setIsActive(status.isActive);
      } else {
        // No existing link, generate a new one
        const token = await generateShareToken(albumId);
        if (token) {
          setShareToken(token);
          setIsActive(true);
        }
      }
      
      // Load stats
      const shareStats = await getShareStats(albumId);
      setStats(shareStats);
    } catch (error) {
      console.error('Error loading share data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLink = async () => {
    try {
      await toggleShareLink(albumId, !isActive);
      setIsActive(!isActive);
    } catch (error) {
      console.error('Error toggling share link:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyFooter = !isLoading && shareUrl ? (
    <button
      onClick={handleCopyLink}
      className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-primary text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all"
    >
      <span className="material-symbols-outlined text-sm">
        {copied ? 'check' : 'content_copy'}
      </span>
      {copied ? 'Copiado!' : 'Copiar Link'}
    </button>
  ) : undefined;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compartilhar Álbum" stickyFooter={copyFooter}>
      <div className="space-y-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-slate-200 rounded-lg"></div>
            <div className="h-20 bg-slate-200 rounded-lg"></div>
          </div>
        ) : (
          <>
            {/* Link Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Link público de visualização
              </label>
              <input
                type="text"
                value={shareUrl || 'Gerando link...'}
                readOnly
                className={`w-full px-3 py-2 border rounded-lg text-sm min-w-0 ${shareUrl ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 italic'}`}
              />
            </div>

            {/* Toggle Section */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white">Acesso por link</h4>
                <p className="text-sm text-slate-500">
                  {isActive ? 'Link ativo - qualquer pessoa pode visualizar' : 'Link desativado'}
                </p>
              </div>
              <button
                onClick={handleToggleLink}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isActive ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-blue-500">info</span>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 text-sm">
                    Como funciona o compartilhamento
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    Qualquer pessoa com este link pode visualizar o álbum sem precisar ter uma conta. 
                    Quem criar uma conta após receber o link terá acesso somente de visualização — 
                    nunca poderá editar ou alterar seu álbum.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            {(stats.totalViews > 0 || stats.claimedByUsers > 0) && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{stats.totalViews}</p>
                  <p className="text-xs text-slate-500">Visualizações</p>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{stats.uniqueViews}</p>
                  <p className="text-xs text-slate-500">Visualizadores únicos</p>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{stats.claimedByUsers}</p>
                  <p className="text-xs text-slate-500">Salvaram</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}