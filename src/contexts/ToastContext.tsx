import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Toast, ToastContainer, type ToastType } from '../components/Toast';

interface ToastItem {
  id: number;
  message: ReactNode;
  type: ToastType;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  show: (message: ReactNode, type?: ToastType, opts?: { duration?: number; action?: ToastItem['action'] }) => void;
  success: (message: ReactNode) => void;
  error: (message: ReactNode, opts?: { action?: ToastItem['action'] }) => void;
  info: (message: ReactNode) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => setItems(list => list.filter(t => t.id !== id)), []);

  const show = useCallback<ToastApi['show']>((message, type = 'info', opts) => {
    const id = nextId.current++;
    setItems(list => [...list.slice(-2), { id, message, type, ...opts }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: m => show(m, 'success'),
      error: (m, opts) => show(m, 'error', { duration: opts?.action ? 7000 : 5000, action: opts?.action }),
      info: m => show(m, 'info'),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer>
        {items.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} duration={t.duration} action={t.action} onClose={() => remove(t.id)} />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
