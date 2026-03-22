import type { ReactNode, ChangeEvent } from 'react';
import { useRef, useState } from 'react';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number; // in bytes
  children: ReactNode;
  className?: string;
}

export function FileUpload({ 
  onUpload, 
  accept = 'image/*', 
  maxSize = 10 * 1024 * 1024, // 10MB default
  children, 
  className = '' 
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      setError(`Arquivo muito grande. Máximo: ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      await onUpload(file);
    } catch (err) {
      setError('Erro ao fazer upload. Tente novamente.');
    } finally {
      setIsUploading(false);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <div 
        onClick={handleClick}
        className={`relative cursor-pointer ${className}`}
      >
        {children}
        
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
            <div className="flex flex-col items-center gap-2 text-white">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-xs">Enviando...</span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-red-500 text-white text-xs text-center rounded-b-xl">
          {error}
        </div>
      )}
    </>
  );
}

// Preset selector for backgrounds
interface PresetSelectorProps {
  presets: Array<{
    id: string;
    name: string;
    thumbnail_url: string;
    full_url: string;
  }>;
  selectedUrl?: string;
  onSelect: (url: string) => void;
}

export function PresetSelector({ presets, selectedUrl, onSelect }: PresetSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset.full_url)}
          className={`aspect-square rounded-lg border-2 overflow-hidden relative group transition-all ${
            selectedUrl === preset.full_url
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
          }`}
        >
          <img 
            src={preset.thumbnail_url} 
            alt={preset.name}
            className="w-full h-full object-cover"
          />
          {selectedUrl === preset.full_url && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-3xl">check_circle</span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
            <span className="text-white text-xs font-medium">{preset.name}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
