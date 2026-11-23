import { useState, useEffect, useCallback } from 'react';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import { generateShareToken, toggleShareLink, getShareStats, getShareLinkStatus } from '../services/api';
import Modal from './Modal';
import { Button, Toggle } from './ui';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumId: string;
  albumTitle: string;
}

export default function ShareModal({ isOpen, onClose, albumId, albumTitle }: ShareModalProps) {
  const [shareToken, setShareToken] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ totalViews: 0, uniqueViews: 0, claimedByUsers: 0 });

  const shareUrl = shareToken ? `${window.location.origin}/album/publico/${shareToken}` : '';

  const loadShareData = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = await getShareLinkStatus(albumId);
      if (status.token) {
        setShareToken(status.token);
        setIsActive(status.isActive);
      } else {
        const token = await generateShareToken(albumId);
        if (token) {
          setShareToken(token);
          setIsActive(true);
        }
      }
      setStats(await getShareStats(albumId));
    } catch (error) {
      console.error('Error loading share data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    if (isOpen && albumId) loadShareData();
  }, [isOpen, albumId, loadShareData]);

  const handleToggleLink = async (next: boolean) => {
    setIsActive(next);
    try {
      await toggleShareLink(albumId, next);
    } catch (error) {
      console.error('Error toggling share link:', error);
      setIsActive(!next);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compartilhar álbum"
      description={albumTitle}
      stickyFooter={
        !isLoading && shareUrl ? (
          <Button fullWidth onClick={handleCopyLink} disabled={!isActive} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>
            {copied ? 'Link copiado' : 'Copiar link'}
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-4" aria-busy>
          <div className="h-12 animate-pulse rounded-field bg-sand" />
          <div className="h-20 animate-pulse rounded-[22px] bg-sand" />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="share-url" className="mb-1.5 block text-sm font-semibold text-muted">
              Link do álbum
            </label>
            <input
              id="share-url"
              readOnly
              value={shareUrl || 'Gerando link…'}
              onFocus={e => e.currentTarget.select()}
              className={`h-12 w-full min-w-0 truncate rounded-field border border-divider bg-cream px-4 text-sm ${isActive ? 'text-ink' : 'text-muted line-through'}`}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-[22px] bg-sand p-4">
            <div>
              <p className="font-bold text-ink">Acesso por link</p>
              <p className="text-sm text-muted">{isActive ? 'Quem tem o link consegue abrir o álbum.' : 'O link está desligado.'}</p>
            </div>
            <Toggle checked={isActive} onChange={handleToggleLink} label="Acesso por link" />
          </div>

          <div className="flex gap-3 rounded-[22px] bg-sage-soft p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sage-text" aria-hidden />
            <p className="text-sm text-ink">
              Quem abrir pelo link só consegue ver. Ninguém além de você pode editar ou alterar o álbum.
            </p>
          </div>

          {(stats.totalViews > 0 || stats.claimedByUsers > 0) && (
            <dl className="grid grid-cols-3 gap-3">
              {[
                ['Visualizações', stats.totalViews],
                ['Pessoas', stats.uniqueViews],
                ['Salvaram', stats.claimedByUsers],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[18px] bg-cream p-3 text-center">
                  <dd className="font-display text-2xl font-semibold text-ink">{value}</dd>
                  <dt className="text-xs text-muted">{label}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </Modal>
  );
}
