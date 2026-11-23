import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import Modal from './Modal';
import type { Section } from '../services/api';
import { Button, Field, Input, Textarea } from './ui';
import { SECTION_ICONS } from '../lib/icons';

export interface SectionFormData {
  title: string;
  description?: string;
  icon: string;
  section_type: 'year' | 'age' | 'category' | 'custom';
  status: 'active' | 'draft';
}

interface SectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SectionFormData) => void | Promise<void>;
  section?: Section | null;
  saving?: boolean;
}

export function SectionModal({ isOpen, onClose, onSave, section, saving }: SectionModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('calendar_today');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(section?.title ?? '');
    setDescription(section?.description ?? '');
    setIcon(section?.icon ?? 'calendar_today');
    setError(null);
  }, [section, isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Dê um nome para a seção');
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      section_type: section?.section_type ?? 'category',
      status: section?.status === 'draft' ? 'draft' : 'active',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={section ? 'Editar seção' : 'Nova seção'}
      description="Seções viram capítulos no livro."
      size="md"
      stickyFooter={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="section-modal-form" loading={saving}>
            {section ? 'Salvar seção' : 'Criar seção'}
          </Button>
        </div>
      }
    >
      <form id="section-modal-form" onSubmit={handleSubmit} className="space-y-5">
        <Field label="Nome da seção" htmlFor="section-title" error={error}>
          <Input id="section-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: A festa" invalid={!!error} maxLength={120} autoFocus />
        </Field>

        <Field label="Texto de abertura (opcional)" htmlFor="section-desc" hint="Aparece na página de abertura do capítulo.">
          <Textarea id="section-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Um pouco sobre esse momento…" maxLength={400} />
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-muted">Ícone</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {SECTION_ICONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setIcon(value)}
                aria-pressed={icon === value}
                className={`flex flex-col items-center gap-1 rounded-[16px] px-1 py-2.5 text-xs transition-colors ${
                  icon === value ? 'bg-sand text-ink ring-2 ring-terra' : 'bg-cream text-muted hover:bg-sand/70 hover:text-ink'
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
