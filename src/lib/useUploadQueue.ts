import { useCallback, useEffect, useRef, useState } from 'react';
import { compressImage, validateImageFile } from './imageCompress';
import { uploadPhoto, type Media } from '../services/api';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  id: string;
  file: File;
  sectionId: string;
  status: UploadStatus;
  error?: string;
  previewUrl: string;
}

interface Options {
  userId?: string;
  albumId?: string;
  onUploaded: (media: Media) => void;
  onStorageFull: (message: string) => void;
}

/** Fila sequencial de envio: comprime no navegador e envia ao armazenamento, uma foto por vez. */
export function useUploadQueue({ userId, albumId, onUploaded, onStorageFull }: Options) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const running = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const callbacks = useRef({ onUploaded, onStorageFull });
  callbacks.current = { onUploaded, onStorageFull };

  const patch = (id: string, data: Partial<UploadItem>) => setItems(list => list.map(i => (i.id === id ? { ...i, ...data } : i)));

  const run = useCallback(async () => {
    if (running.current || !userId || !albumId) return;
    running.current = true;
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const next = itemsRef.current.find(i => i.status === 'queued');
        if (!next) break;
        patch(next.id, { status: 'uploading' });
        itemsRef.current = itemsRef.current.map(i => (i.id === next.id ? { ...i, status: 'uploading' } : i));
        try {
          const image = await compressImage(next.file);
          const media = await uploadPhoto({ albumId, sectionId: next.sectionId, fileName: next.file.name, image });
          patch(next.id, { status: 'done' });
          itemsRef.current = itemsRef.current.map(i => (i.id === next.id ? { ...i, status: 'done' } : i));
          callbacks.current.onUploaded(media);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Falha no envio';
          const storageFull = /armazenamento/i.test(message);
          // espaço acabou: cancela o resto da fila
          setItems(list =>
            list.map(i =>
              i.id === next.id ? { ...i, status: 'error', error: storageFull ? 'Sem espaço' : message } : storageFull && i.status === 'queued' ? { ...i, status: 'error', error: 'Cancelado' } : i,
            ),
          );
          itemsRef.current = itemsRef.current.map(i =>
            i.id === next.id || (storageFull && i.status === 'queued') ? { ...i, status: 'error' } : i,
          );
          if (storageFull) callbacks.current.onStorageFull(message);
        }
      }
    } finally {
      running.current = false;
    }
  }, [userId, albumId]);

  const add = useCallback(
    (files: File[], sectionId: string): string[] => {
      const errors: string[] = [];
      const accepted: UploadItem[] = [];
      for (const file of files) {
        const err = validateImageFile(file);
        if (err) {
          errors.push(err);
          continue;
        }
        accepted.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          sectionId,
          status: 'queued',
          previewUrl: URL.createObjectURL(file),
        });
      }
      if (accepted.length) {
        // limpa os concluídos da rodada anterior
        setItems(list => {
          const keep = list.filter(i => i.status === 'queued' || i.status === 'uploading');
          list.filter(i => !keep.includes(i)).forEach(i => URL.revokeObjectURL(i.previewUrl));
          const next = [...keep, ...accepted];
          itemsRef.current = next;
          return next;
        });
        queueMicrotask(run);
      }
      return errors;
    },
    [run],
  );

  const clear = useCallback(() => {
    setItems(list => {
      list.forEach(i => URL.revokeObjectURL(i.previewUrl));
      itemsRef.current = [];
      return [];
    });
  }, []);

  useEffect(() => () => itemsRef.current.forEach(i => URL.revokeObjectURL(i.previewUrl)), []);

  const total = items.length;
  const done = items.filter(i => i.status === 'done').length;
  const failed = items.filter(i => i.status === 'error').length;
  const active = items.some(i => i.status === 'queued' || i.status === 'uploading');

  return { items, add, clear, total, done, failed, active };
}
