import { useEffect, useState, type ReactNode } from 'react';
import { CircleCheck, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: ReactNode;
  type?: ToastType;
  duration?: number;
  action?: { label: string; onClick: () => void };
  onClose: () => void;
}

const icons = { success: CircleCheck, error: CircleAlert, info: Info, warning: TriangleAlert };
const tones: Record<ToastType, string> = {
  success: 'bg-sage-soft text-ink',
  error: 'bg-terra-soft text-ink',
  info: 'bg-paper text-ink border border-divider',
  warning: 'bg-terra-soft text-ink',
};
const iconTones: Record<ToastType, string> = {
  success: 'text-sage-text',
  error: 'text-terra-text',
  info: 'text-muted',
  warning: 'text-terra-text',
};

export function Toast({ message, type = 'info', duration = 3500, action, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const enter = setTimeout(() => setIsVisible(true), 10);
    const close = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 250);
    }, duration);
    return () => {
      clearTimeout(enter);
      clearTimeout(close);
    };
  }, [duration, onClose]);

  const Icon = icons[type];

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[20px] px-4 py-3 transition-all duration-200 ${tones[type]} ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <Icon className={`size-5 shrink-0 ${iconTones[type]}`} aria-hidden />
      <span className="flex-1 text-sm font-semibold">{message}</span>
      {action && (
        <button type="button" onClick={action.onClick} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-bold text-terra-text hover:bg-paper/60">
          {action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 250);
        }}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-paper/60"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
      {children}
    </div>
  );
}
