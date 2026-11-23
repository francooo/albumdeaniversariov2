import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { Button, Field, Input } from './ui';
import { createAlbum, PlanLimitError } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { OCCASIONS, type OccasionId } from '../lib/occasions';

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateAlbumModal({ isOpen, onClose }: CreateAlbumModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [date, setDate] = useState('');
  const [occasion, setOccasion] = useState<OccasionId>('aniversario');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(user?.name ? `Álbum de ${user.name}` : '');
    setSubtitle('');
    setDate('');
    setOccasion('aniversario');
    setError(null);
    setLimitReached(false);
  }, [isOpen, user?.name]);

  const selected = OCCASIONS.find(o => o.id === occasion)!;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) {
      setError('Dê um título para o álbum');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const album = await createAlbum({
        user_id: user.id,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        event_date: date || null,
        occasion,
        sections: selected.sections,
        status: 'draft',
      });
      onClose();
      navigate(`/albums/${album.id}`, { state: { justCreated: true } });
    } catch (err) {
      if (err instanceof PlanLimitError) {
        setLimitReached(true);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Não foi possível criar o álbum.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Criar novo álbum"
      description="Escolha uma ocasião para já vir com seções prontas."
      size="lg"
      stickyFooter={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="create-album-form" loading={saving} loadingText="Criando…" disabled={limitReached}>
            Criar e adicionar fotos
          </Button>
        </div>
      }
    >
      <form id="create-album-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Título do álbum" htmlFor="album-title">
          <Input id="album-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} className="bg-cream" autoFocus invalid={!!error && !title.trim()} />
        </Field>
        <Field label="Subtítulo" htmlFor="album-subtitle">
          <Input
            id="album-subtitle"
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            placeholder={selected.defaultSubtitle || 'Uma frase curta sobre o álbum'}
            maxLength={160}
            className="bg-cream"
          />
        </Field>
        <Field label="Data (opcional)" htmlFor="album-date" className="sm:max-w-[250px]">
          <Input id="album-date" type="date" value={date} onChange={e => setDate(e.target.value)} leading={<Calendar className="size-[18px]" />} className="bg-cream" />
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-muted">Ocasião</legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {OCCASIONS.map(o => {
              const active = o.id === occasion;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOccasion(o.id)}
                  aria-pressed={active}
                  className={`min-h-[60px] rounded-[18px] px-4 py-2.5 text-left transition-colors ${
                    active ? 'border-2 border-terra bg-sand' : 'border border-divider bg-cream hover:bg-sand/50'
                  }`}
                >
                  <span className="block text-[15px] font-bold text-ink">{o.label}</span>
                  <span className={`block text-sm ${active ? 'text-terra-text' : 'text-muted'}`}>{o.hint}</span>
                </button>
              );
            })}
            <div className="flex min-h-[60px] items-center gap-3 rounded-[18px] border border-dashed border-divider px-4 py-2.5">
              <Sparkles className="size-5 shrink-0 text-sage" aria-hidden />
              <span className="text-sm text-muted">Você pode mudar as seções depois</span>
            </div>
          </div>
        </fieldset>

        {error && (
          <div role="alert" className="rounded-[18px] bg-terra-soft p-4 text-sm text-terra-text">
            <p className="font-bold">{limitReached ? 'Limite atingido · Faça upgrade' : error}</p>
            {limitReached && (
              <p className="mt-1">
                {error}{' '}
                <Link to="/conta#planos" onClick={onClose} className="font-bold underline">
                  Ver planos
                </Link>
              </p>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
