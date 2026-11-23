import { sql } from '../../db/connection';
import { migrationsReady } from './shares';
import { storageLimitFor } from '../../lib/plans';

// Check if user has enough storage
export async function checkStorageAvailability(
  userId: string, 
  fileSize: number
): Promise<{ available: boolean; used: number; limit: number; remaining: number }> {
  if (!sql) throw new Error('Database not available');
  
  const userResult = await sql`
    SELECT storage_used, storage_limit, plan_type 
    FROM users 
    WHERE id = ${userId}
  `;
  
  if (!userResult[0]) {
    throw new Error('User not found');
  }
  
  const user = userResult[0] as { storage_used: number; storage_limit: number; plan_type: string };
  const used = Number(user.storage_used) || 0;
  const limit = storageLimitFor(user.plan_type, user.storage_limit);
  const remaining = limit - used;
  
  return {
    available: remaining >= fileSize,
    used,
    limit,
    remaining
  };
}

export interface Media {
  id: string;
  user_id: string;
  album_id?: string;
  section_id?: string;
  page_id?: string;
  file_name: string;
  original_url: string;
  thumbnail_url?: string;
  medium_url?: string;
  file_type: string;
  file_size: number;
  width?: number;
  height?: number;
  duration?: number;
  caption?: string;
  alt_text?: string;
  sort_order: number;
  metadata?: Record<string, any>;
  is_cover?: boolean;
  created_at: string;
  updated_at: string;
}

/** Versão leve para grades (sem a imagem em tamanho original). */
export type MediaThumb = Pick<Media, 'id' | 'album_id' | 'section_id' | 'file_name' | 'thumbnail_url' | 'file_type' | 'file_size' | 'width' | 'height' | 'caption' | 'sort_order' | 'is_cover' | 'created_at'>;

export interface UploadMediaInput {
  user_id: string;
  album_id?: string;
  section_id?: string;
  file_name: string;
  original_url: string;
  thumbnail_url?: string;
  medium_url?: string;
  file_type: string;
  file_size: number;
  width?: number;
  height?: number;
  duration?: number;
  caption?: string;
}

// Upload new media
export async function uploadMedia(input: UploadMediaInput): Promise<Media> {
  if (!sql) throw new Error('Database not available');
  
  // Check storage availability
  const storageCheck = await checkStorageAvailability(input.user_id, input.file_size);
  
  if (!storageCheck.available) {
    const usedMB = (storageCheck.used / 1048576).toFixed(1);
    const limitMB = (storageCheck.limit / 1048576).toFixed(0);
    const fileMB = (input.file_size / 1048576).toFixed(1);
    throw new Error(
      `Limite de armazenamento excedido. ` +
      `Você usou ${usedMB} MB de ${limitMB} MB. ` +
      `O arquivo tem ${fileMB} MB. ` +
      `Faça upgrade para o plano Premium para mais espaço.`
    );
  }
  
  await migrationsReady();
  const result = await sql`
    INSERT INTO media (
      user_id, album_id, section_id, file_name, original_url,
      thumbnail_url, medium_url, file_type, file_size,
      width, height, duration, caption, sort_order
    ) VALUES (
      ${input.user_id}, ${input.album_id || null}, ${input.section_id || null},
      ${input.file_name}, ${input.original_url}, ${input.thumbnail_url || null},
      ${input.medium_url || null}, ${input.file_type}, ${input.file_size},
      ${input.width || null}, ${input.height || null}, ${input.duration || null},
      ${input.caption || null},
      (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM media WHERE section_id IS NOT DISTINCT FROM ${input.section_id || null} AND album_id IS NOT DISTINCT FROM ${input.album_id || null})
    )
    RETURNING *
  `;

  if (input.album_id) {
    await sql`UPDATE albums SET last_edited_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ${input.album_id}`;
  }
  
  // Update user storage
  await sql`
    UPDATE users 
    SET storage_used = storage_used + ${input.file_size}
    WHERE id = ${input.user_id}
  `;
  
  // Update album totals
  if (input.album_id) {
    if (input.file_type.startsWith('image/')) {
      await sql`
        UPDATE albums SET total_photos = total_photos + 1 WHERE id = ${input.album_id}
      `;
    } else if (input.file_type.startsWith('video/')) {
      await sql`
        UPDATE albums SET total_videos = total_videos + 1 WHERE id = ${input.album_id}
      `;
    }
  }
  
  // Update section counts
  if (input.section_id) {
    if (input.file_type.startsWith('image/')) {
      await sql`
        UPDATE sections 
        SET photo_count = photo_count + 1
        WHERE id = ${input.section_id}
      `;
    } else if (input.file_type.startsWith('video/')) {
      await sql`
        UPDATE sections 
        SET video_count = video_count + 1
        WHERE id = ${input.section_id}
      `;
    }
  }
  
  return result[0] as Media;
}

// Get media by section
export async function getMediaBySection(sectionId: string): Promise<Media[]> {
  if (!sql) throw new Error('Database not available');
  
  const result = await sql`
    SELECT * FROM media 
    WHERE section_id = ${sectionId}
    ORDER BY sort_order ASC, created_at ASC
  `;
  
  return result as Media[];
}

// Delete media
export async function deleteMedia(mediaId: string): Promise<void> {
  if (!sql) throw new Error('Database not available');
  
  const mediaResult = await sql`SELECT * FROM media WHERE id = ${mediaId}`;
  
  if (mediaResult[0]) {
    const m = mediaResult[0] as Media;
    
    // Restore user storage
    await sql`
      UPDATE users 
      SET storage_used = GREATEST(0, storage_used - ${m.file_size})
      WHERE id = ${m.user_id}
    `;
    
    // Update album totals
    if (m.album_id) {
      if (m.file_type.startsWith('image/')) {
        await sql`
          UPDATE albums 
          SET total_photos = GREATEST(0, total_photos - 1) 
          WHERE id = ${m.album_id}
        `;
      } else if (m.file_type.startsWith('video/')) {
        await sql`
          UPDATE albums 
          SET total_videos = GREATEST(0, total_videos - 1) 
          WHERE id = ${m.album_id}
        `;
      }
    }
    
    // Update section counts
    if (m.section_id) {
      if (m.file_type.startsWith('image/')) {
        await sql`
          UPDATE sections 
          SET photo_count = GREATEST(0, photo_count - 1)
          WHERE id = ${m.section_id}
        `;
      } else if (m.file_type.startsWith('video/')) {
        await sql`
          UPDATE sections 
          SET video_count = GREATEST(0, video_count - 1)
          WHERE id = ${m.section_id}
        `;
      }
    }
    
    // Delete the media record
    await sql`DELETE FROM media WHERE id = ${mediaId}`;
  }
}

/** Miniaturas de todas as fotos do álbum (para grades e contagens por seção). */
export async function getMediaThumbsByAlbum(albumId: string): Promise<MediaThumb[]> {
  if (!sql) throw new Error('Database not available');
  await migrationsReady();
  const result = await sql`
    SELECT id, album_id, section_id, file_name, COALESCE(thumbnail_url, original_url) AS thumbnail_url,
      file_type, file_size, width, height, caption, sort_order, is_cover, created_at
    FROM media
    WHERE album_id = ${albumId}
    ORDER BY sort_order ASC, created_at ASC
  `;
  return result as MediaThumb[];
}

/** Todas as mídias do álbum em tamanho original (para o livro). */
export async function getMediaByAlbum(albumId: string): Promise<Media[]> {
  if (!sql) throw new Error('Database not available');
  await migrationsReady();
  const result = await sql`
    SELECT * FROM media
    WHERE album_id = ${albumId}
    ORDER BY sort_order ASC, created_at ASC
  `;
  return result as Media[];
}

/** Legenda e/ou troca de seção. Ao mover, a foto vai para o fim da seção de destino. */
export async function updateMedia(mediaId: string, data: { caption?: string | null; section_id?: string }): Promise<void> {
  if (!sql) throw new Error('Database not available');
  if (data.caption !== undefined) {
    await sql`UPDATE media SET caption = ${data.caption || null}, updated_at = CURRENT_TIMESTAMP WHERE id = ${mediaId}`;
  }
  if (data.section_id) {
    const prev = await sql`SELECT section_id, album_id FROM media WHERE id = ${mediaId}`;
    const old = prev[0] as { section_id: string | null; album_id: string } | undefined;
    if (!old || old.section_id === data.section_id) return;
    await sql`
      UPDATE media SET
        section_id = ${data.section_id},
        sort_order = (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM media WHERE section_id = ${data.section_id}),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${mediaId}
    `;
    for (const sid of [old.section_id, data.section_id]) {
      if (!sid) continue;
      await sql`
        UPDATE sections SET
          photo_count = (SELECT COUNT(*) FROM media WHERE section_id = ${sid} AND file_type LIKE 'image/%'),
          video_count = (SELECT COUNT(*) FROM media WHERE section_id = ${sid} AND file_type LIKE 'video/%')
        WHERE id = ${sid}
      `;
    }
  }
}

export async function reorderMedia(mediaIds: string[]): Promise<void> {
  if (!sql) throw new Error('Database not available');
  for (let i = 0; i < mediaIds.length; i++) {
    await sql`UPDATE media SET sort_order = ${i} WHERE id = ${mediaIds[i]}`;
  }
}

/** Define uma foto do álbum como capa (limpa a capa avulsa enviada na personalização). */
export async function setCoverMedia(albumId: string, mediaId: string): Promise<void> {
  if (!sql) throw new Error('Database not available');
  await migrationsReady();
  await sql`UPDATE media SET is_cover = (id = ${mediaId}) WHERE album_id = ${albumId}`;
  await sql`
    UPDATE albums SET cover_image_url = NULL, cover_thumbnail_url = NULL,
      updated_at = CURRENT_TIMESTAMP, last_edited_at = CURRENT_TIMESTAMP
    WHERE id = ${albumId}
  `;
}
