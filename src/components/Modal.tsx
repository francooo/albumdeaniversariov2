import type { ReactNode, MouseEvent } from 'react';
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  stickyFooter?: ReactNode;
}

const sizeClasses = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-[600px]',
};

export default function Modal({ isOpen, onClose, title, description, children, size = 'md', stickyFooter }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // foca o primeiro campo do modal
    requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('[autofocus], input, textarea, select, button:not([data-close])');
      el?.focus();
    });
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-ink/55 sm:items-center sm:p-6"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[92dvh] w-full animate-sheet-in flex-col overflow-hidden rounded-t-[28px] bg-paper sm:max-h-[90vh] sm:animate-pop-in sm:rounded-[32px] ${sizeClasses[size]}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-2 pt-6 sm:px-8 sm:pt-7">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-2xl font-semibold text-ink sm:text-[28px]">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sand hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3 sm:px-8">{children}</div>
        {stickyFooter && <div className="shrink-0 border-t border-divider px-6 py-4 sm:px-8">{stickyFooter}</div>}
      </div>
    </div>
  );
}
