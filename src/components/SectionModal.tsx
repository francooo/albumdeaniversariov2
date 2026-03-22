import type { FormEvent, ChangeEvent } from 'react';
import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import type { Section } from '../services/api';

interface SectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    icon: string;
    image_url?: string;
    section_type: 'year' | 'age' | 'category' | 'custom';
    status: 'active' | 'draft';
  }) => void;
  section?: Section | null;
  defaultType?: 'year' | 'age' | 'category';
}

const ICONS = [
  { value: 'calendar_today', label: 'Calendário' },
  { value: 'child_care', label: 'Bebê' },
  { value: 'celebration', label: 'Festa' },
  { value: 'flight', label: 'Viagem' },
  { value: 'school', label: 'Escola' },
  { value: 'favorite', label: 'Coração' },
  { value: 'photo_camera', label: 'Câmera' },
  { value: 'star', label: 'Estrela' },
  { value: 'home', label: 'Casa' },
  { value: 'pets', label: 'Animal' },
];

export function SectionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  section, 
  defaultType = 'year' 
}: SectionModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('calendar_today');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sectionType, setSectionType] = useState<'year' | 'age' | 'category' | 'custom'>(defaultType);
  const [status, setStatus] = useState<'active' | 'draft'>('active');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (section) {
      setTitle(section.title);
      setDescription(section.description || '');
      setIcon(section.icon);
      setImageUrl(section.image_url || '');
      setImagePreview(section.image_url || null);
      setSectionType(section.section_type);
      setStatus(section.status as 'active' | 'draft');
    } else {
      setTitle('');
      setDescription('');
      setIcon('calendar_today');
      setImageUrl('');
      setImagePreview(null);
      setSectionType(defaultType);
      setStatus('active');
    }
    setErrors({});
  }, [section, isOpen, defaultType]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a preview URL for the image
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setImageUrl(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'O nome da seção é obrigatório';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      image_url: imageUrl || undefined,
      section_type: sectionType,
      status
    });
  };

  const typeLabels = {
    year: 'Ano',
    age: 'Idade',
    category: 'Categoria',
    custom: 'Personalizado'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={section ? 'Editar Seção' : 'Nova Seção'}
      size="md"
      stickyFooter={
        <div className="flex gap-3 p-4 md:p-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="section-modal-form"
            className="flex-1 px-4 py-3 rounded-lg bg-primary text-background-dark text-sm font-bold hover:brightness-110 transition-all"
          >
            {section ? 'Salvar Alterações' : 'Criar Seção'}
          </button>
        </div>
      }
    >
      <form id="section-modal-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Nome da Seção <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: 2023: O Ano das Viagens"
            className={`w-full px-3 py-2 rounded-lg border ${
              errors.title 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                : 'border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-primary/20'
            } bg-white dark:bg-slate-800 outline-none focus:ring-2 transition-all`}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-500">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Descrição
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional da seção..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Imagem da Seção
          </label>
          <div className="space-y-3">
            {imagePreview ? (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full max-h-64 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
              >
                <span className="material-symbols-outlined text-3xl text-slate-400">add_photo_alternate</span>
                <p className="mt-2 text-sm text-slate-500">Clique para adicionar uma imagem</p>
                <p className="text-xs text-slate-400">PNG, JPG até 5MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Icon Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Ícone
          </label>
          <div className="grid grid-cols-5 gap-2">
            {ICONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setIcon(item.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                  icon === item.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.value}</span>
                <span className="text-[10px]">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Tipo de Organização
          </label>
          <select
            value={sectionType}
            onChange={(e) => setSectionType(e.target.value as typeof sectionType)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="year">Ano</option>
            <option value="age">Idade</option>
            <option value="category">Categoria</option>
            <option value="custom">Personalizado</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Define como esta seção será organizada nas abas do dashboard
          </p>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Status
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStatus('active')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                status === 'active'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'border-slate-200 dark:border-slate-700 hover:border-green-300'
              }`}
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Ativo
            </button>
            <button
              type="button"
              onClick={() => setStatus('draft')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                status === 'draft'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-700 hover:border-amber-300'
              }`}
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Rascunho
            </button>
          </div>
        </div>

      </form>
    </Modal>
  );
}
