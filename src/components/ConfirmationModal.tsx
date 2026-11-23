import { useState, type FormEvent, type ReactNode } from 'react';
import Modal from './Modal';
import { Button, Field, Input, PasswordInput } from './ui';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmationValue: string) => void;
  title: string;
  message: ReactNode;
  /** 'none' = só confirmar, sem digitar nada */
  confirmType: 'password' | 'text' | 'none';
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
  danger = true,
}: ConfirmationModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (confirmType === 'text' && inputValue.trim().toUpperCase() !== confirmValue.toUpperCase()) {
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
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className={`rounded-[20px] p-4 text-sm leading-relaxed ${danger ? 'bg-terra-soft text-terra-text' : 'bg-sand text-ink'}`}>{message}</div>

        {confirmType !== 'none' && (
          <Field
            label={confirmType === 'password' ? 'Senha atual' : <>Digite <strong className="text-ink">{confirmValue}</strong> para confirmar</>}
            htmlFor="confirm-input"
            error={error}
          >
            {confirmType === 'password' ? (
              <PasswordInput id="confirm-input" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={placeholder || 'Sua senha'} invalid={!!error} autoFocus />
            ) : (
              <Input id="confirm-input" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={placeholder || confirmValue} invalid={!!error} autoComplete="off" autoFocus />
            )}
          </Field>
        )}

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={isLoading} loadingText="Processando…">
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
