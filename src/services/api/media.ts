import { sql } from '../../db/connection';

// Storage limits in bytes
const STORAGE_LIMITS = {
  basic: 1073741824,    // 1GB
  premium: 5368709120   // 5GB
};

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
  const limit = Number(user.storage_limit) || STORAGE_LIMITS.basic;
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
  created_at: string;
  updated_at: string;
}

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
  
  const result = await sql`
    INSERT INTO media (
      user_id, album_id, section_id, file_name, original_url,
      thumbnail_url, medium_url, file_type, file_size,
      width, height, duration, caption
    ) VALUES (
      ${input.user_id}, ${input.album_id || null}, ${input.section_id || null},
      ${input.file_name}, ${input.original_url}, ${input.thumbnail_url || null},
      ${input.medium_url || null}, ${input.file_type}, ${input.file_size},
      ${input.width || null}, ${input.height || null}, ${input.duration || null},
      ${input.caption || null}
    )
    RETURNING *
  `;
  
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
