import { useState, type FormEvent } from 'react';
import Modal from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmationValue: string) => void;
  title: string;
  message: string;
  confirmType: 'password' | 'text';
  confirmValue?: string;
  confirmLabel?: string;
  placeholder?: string;
  isLoading?: boolean;
  danger?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmType,
  confirmValue = 'EXCLUIR',
  confirmLabel = 'Confirmar',
  placeholder,
  isLoading = false,
  danger = true
}: ConfirmationModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (confirmType === 'text' && inputValue !== confirmValue) {
      setError(`Digite "${confirmValue}" para confirmar`);
      return;
    }

    if (confirmType === 'password' && !inputValue.trim()) {
      setError('Digite sua senha para confirmar');
      return;
    }

    onConfirm(inputValue);
    setInputValue('');
  };

  const handleClose = () => {
    setInputValue('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={`p-4 rounded-lg ${danger ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
          <p className={`text-sm ${danger ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
            {message}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {confirmType === 'password' ? 'Senha atual' : `Digite "${confirmValue}"`}
          </label>
          <input
            type={confirmType === 'password' ? 'password' : 'text'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder || (confirmType === 'password' ? 'Sua senha' : confirmValue)}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all disabled:opacity-50 ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-primary text-background-dark hover:brightness-110'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Processando...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
