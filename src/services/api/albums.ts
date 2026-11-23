import { sql } from '../../db/connection';
import { migrationsReady, generateShareToken } from './shares';
import { getPlan, normalizePlan, PLANS } from '../../lib/plans';

export interface Album {
  id: string;
  user_id: string;
  title: string;
  subtitle?: string;
  description?: string;
  cover_image_url?: string;
  cover_thumbnail_url?: string;
  background_image_url?: string;
  custom_background_url?: string;
  theme: string;
  accent_color: string;
  status: string;
  is_public: boolean;
  view_count: number;
  total_photos: number;
  total_videos: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  last_edited_by?: string;
  last_edited_at?: string;
  event_date?: string | null;
  occasion?: string | null;
  layout?: string | null;
  style?: string | null;
}

/** Álbum com dados agregados para listagens (contagem de seções e miniatura de capa). */
export interface AlbumSummary extends Album {
  section_count: number;
  cover_thumb: string | null;
}

export interface CreateAlbumSection {
  title: string;
  icon?: string;
}

export interface CreateAlbumInput {
  user_id: string;
  title: string;
  subtitle?: string;
  description?: string;
  theme?: string;
  accent_color?: string;
  status?: string;
  is_public?: boolean;
  occasion?: string | null;
  event_date?: string | null;
  sections?: CreateAlbumSection[];
}

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

export interface AlbumStats {
  storage_used: number;
  storage_limit: number;
  view_count: number;
  view_growth: number;
  last_edited_at: string;
  last_edited_by: string;
}

export interface BackgroundPreset {
  id: string;
  name: string;
  thumbnail_url: string;
  full_url: string;
  theme: string;
  is_premium: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  plan_type: string;
  storage_used: number;
  storage_limit: number;
}

// Get or create a default user for the application
export async function getOrCreateDefaultUser(): Promise<User> {
  if (!sql) {
    console.error('Database SQL object is null - check DATABASE_URL');
    throw new Error('Database not available - check VITE_DATABASE_URL in .env');
  }
  
  try {
    // Check if we have a default user
    console.log('Checking for existing default user...');
    const defaultUser = await sql`SELECT * FROM users WHERE email = 'default@example.com'`;
    
    if (defaultUser && defaultUser[0]) {
      console.log('Found existing user:', defaultUser[0].id);
      return defaultUser[0] as User;
    }
    
    // Create a default user
    console.log('Creating new default user...');
    const newUser = await sql`
      INSERT INTO users (email, name, plan_type, storage_used, storage_limit)
      VALUES ('default@example.com', 'Usuário Padrão', 'basic', 0, ${PLANS.basic.storageBytes})
      RETURNING *
    `;
    
    console.log('Created new user:', newUser[0]?.id);
    return newUser[0] as User;
  } catch (error) {
    console.error('Error in getOrCreateDefaultUser:', error);
    throw error;
  }
}

// Get album by ID
export async function getAlbumById(albumId: string): Promise<Album | null> {
  if (!sql) throw new Error('Database not available');
  
  const result = await sql`
    SELECT * FROM albums WHERE id = ${albumId}
  `;
  
  return result[0] as Album || null;
}

// Create a new album (aplica limite do plano, ocasião com seções prontas e visibilidade padrão do usuário)
export async function createAlbum(input: CreateAlbumInput): Promise<Album> {
  if (!sql) throw new Error('Database not available');
  await migrationsReady();

  const userRows = await sql`
    SELECT plan_type, default_album_visibility,
      (SELECT COUNT(*) FROM albums WHERE user_id = ${input.user_id}) AS album_count
    FROM users WHERE id = ${input.user_id}
  `;
  const userRow = userRows[0] as { plan_type: string; default_album_visibility: string | null; album_count: string } | undefined;
  if (!userRow) throw new Error('Usuário não encontrado');

  const plan = getPlan(userRow.plan_type);
  if (Number(userRow.album_count) >= plan.albumLimit) {
    throw new PlanLimitError(`Você chegou ao máximo de ${plan.albumLimit} álbuns do plano ${plan.name}.`);
  }

  const visibility = userRow.default_album_visibility || 'link';
  const isPublic = input.is_public ?? visibility === 'public';

  const result = await sql`
    INSERT INTO albums (
      user_id, title, subtitle, description,
      theme, accent_color, status, is_public, occasion, event_date, layout, style
    ) VALUES (
      ${input.user_id},
      ${input.title},
      ${input.subtitle || null},
      ${input.description || null},
      ${input.theme || 'creme'},
      ${input.accent_color || '#C67139'},
      ${input.status || 'draft'},
      ${isPublic},
      ${input.occasion || null},
      ${input.event_date || null},
      'two',
      'jardim'
    )
    RETURNING *
  `;
  const album = result[0] as Album;

  const sections = input.sections ?? [];
  for (let i = 0; i < sections.length; i++) {
    await sql`
      INSERT INTO sections (album_id, title, icon, icon_color, section_type, status, sort_order)
      VALUES (${album.id}, ${sections[i].title}, ${sections[i].icon || 'calendar_today'}, '#C67139', 'category', 'active', ${i})
    `;
  }

  // "Quem tem o link" / "Público": já deixa o link de compartilhamento ativo
  if (visibility !== 'private') {
    await generateShareToken(album.id).catch(err => console.warn('Share token not created:', err));
  }

  return album;
}

// Get or create a default album for the current user
// Get albums by user ID
export async function getAlbumsByUser(userId: string): Promise<Album[]> {
  if (!sql) throw new Error('Database not available');
  
  return await sql`SELECT * FROM albums WHERE user_id = ${userId} ORDER BY created_at DESC` as Album[];
}

/** Álbuns do usuário com contagem de seções e miniatura de capa (para Início e Meus álbuns). */
export async function getAlbumSummaries(userId: string): Promise<AlbumSummary[]> {
  if (!sql) throw new Error('Database not available');
  await migrationsReady();
  const rows = await sql`
    SELECT a.*,
      (SELECT COUNT(*) FROM sections s WHERE s.album_id = a.id) AS section_count,
      COALESCE(
        a.cover_thumbnail_url,
        a.cover_image_url,
        (SELECT COALESCE(m.thumbnail_url, m.original_url) FROM media m
          WHERE m.album_id = a.id AND m.file_type LIKE 'image/%'
          ORDER BY m.is_cover DESC NULLS LAST, m.sort_order ASC, m.created_at ASC LIMIT 1),
        (SELECT s.image_url FROM sections s WHERE s.album_id = a.id AND s.image_url IS NOT NULL
          ORDER BY s.sort_order ASC LIMIT 1)
      ) AS cover_thumb
    FROM albums a
    WHERE a.user_id = ${userId}
    ORDER BY COALESCE(a.last_edited_at, a.updated_at, a.created_at) DESC
  `;
  return rows.map(r => ({ ...r, section_count: Number(r.section_count) || 0 })) as AlbumSummary[];
}

/** Quantos álbuns o usuário tem e quantos o plano permite. */
export async function getAlbumQuota(userId: string): Promise<{ used: number; limit: number; plan: ReturnType<typeof normalizePlan> }> {
  if (!sql) throw new Error('Database not available');
  const rows = await sql`
    SELECT plan_type, (SELECT COUNT(*) FROM albums WHERE user_id = ${userId}) AS album_count
    FROM users WHERE id = ${userId}
  `;
  const row = rows[0] as { plan_type: string; album_count: string } | undefined;
  const plan = getPlan(row?.plan_type);
  return { used: Number(row?.album_count) || 0, limit: plan.albumLimit, plan: plan.id };
}

/** Marca o álbum como editado agora (ordena "Continue de onde parou"). */
export async function touchAlbum(albumId: string, userId?: string): Promise<void> {
  if (!sql) return;
  await sql`
    UPDATE albums SET last_edited_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
      last_edited_by = COALESCE(${userId ?? null}, last_edited_by)
    WHERE id = ${albumId}
  `;
}

export async function updateAlbumDetails(
  albumId: string,
  data: { title: string; subtitle: string | null; event_date: string | null },
): Promise<Album> {
  if (!sql) throw new Error('Database not available');
  await migrationsReady();
  const result = await sql`
    UPDATE albums SET
      title = ${data.title},
      subtitle = ${data.subtitle || null},
      event_date = ${data.event_date || null},
      updated_at = CURRENT_TIMESTAMP,
      last_edited_at = CURRENT_TIMESTAMP
    WHERE id = ${albumId}
    RETURNING *
  `;
  return result[0] as Album;
}

export async function publishAlbum(albumId: string): Promise<Album> {
  if (!sql) throw new Error('Database not available');
  const result = await sql`
    UPDATE albums SET status = 'active', published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP, last_edited_at = CURRENT_TIMESTAMP
    WHERE id = ${albumId}
    RETURNING *
  `;
  return result[0] as Album;
}

export async function unpublishAlbum(albumId: string): Promise<Album> {
  if (!sql) throw new Error('Database not available');
  const result = await sql`
    UPDATE albums SET status = 'draft', updated_at = CURRENT_TIMESTAMP, last_edited_at = CURRENT_TIMESTAMP
    WHERE id = ${albumId}
    RETURNING *
  `;
  return result[0] as Album;
}

/** Tema, layout, estilo e capa avulsa (personalizacao.xml). */
export async function updateAlbumDesign(
  albumId: string,
  data: { theme: string; layout: string; style: string; cover_image_url?: string | null; cover_thumbnail_url?: string | null },
): Promise<Album> {
  if (!sql) throw new Error('Database not available');
  await migrationsReady();
  const result = await sql`
    UPDATE albums SET theme = ${data.theme}, layout = ${data.layout}, style = ${data.style},
      cover_image_url = COALESCE(${data.cover_image_url ?? null}, cover_image_url),
      cover_thumbnail_url = COALESCE(${data.cover_thumbnail_url ?? null}, cover_thumbnail_url),
      updated_at = CURRENT_TIMESTAMP, last_edited_at = CURRENT_TIMESTAMP
    WHERE id = ${albumId} RETURNING *
  `;
  if (data.cover_image_url) {
    // Capa avulsa substitui a capa escolhida entre as fotos
    await sql`UPDATE media SET is_cover = false WHERE album_id = ${albumId} AND is_cover = true`;
  }
  return result[0] as Album;
}

/** Exclui o álbum (seções e mídia caem em cascata) e devolve o espaço ao usuário. */
export async function deleteAlbum(albumId: string): Promise<void> {
  if (!sql) throw new Error('Database not available');
  const rows = await sql`
    SELECT a.user_id, COALESCE(SUM(m.file_size), 0) AS bytes
    FROM albums a LEFT JOIN media m ON m.album_id = a.id
    WHERE a.id = ${albumId}
    GROUP BY a.user_id
  `;
  const row = rows[0] as { user_id: string; bytes: string } | undefined;
  if (!row) return;
  await sql`DELETE FROM albums WHERE id = ${albumId}`;
  await sql`UPDATE users SET storage_used = GREATEST(0, storage_used - ${Number(row.bytes)}) WHERE id = ${row.user_id}`;
}


export async function getOrCreateDefaultAlbum(userId?: string): Promise<Album | null> {
  if (!sql) throw new Error('Database not available');
  
  // If no userId provided, we need to create a temporary user first
  let actualUserId = userId;
  
  if (!actualUserId) {
    // Check if we have a default user
    const defaultUser = await sql`SELECT id FROM users WHERE email = 'default@example.com'`;
    
    if (defaultUser[0]) {
      actualUserId = (defaultUser[0] as { id: string }).id;
    } else {
      // Create a default user
      const newUser = await sql`
        INSERT INTO users (email, name, plan_type, storage_used, storage_limit)
        VALUES ('default@example.com', 'Default User', 'basic', 0, ${PLANS.basic.storageBytes})
        RETURNING id
      `;
      actualUserId = (newUser[0] as { id: string }).id;
    }
  }
  
  // Check if user already has an album
  const existingAlbum = await sql`
    SELECT * FROM albums WHERE user_id = ${actualUserId} LIMIT 1
  `;
  
  if (existingAlbum[0]) {
    return existingAlbum[0] as Album;
  }
  
  // Create a default album
  const newAlbum = await sql`
    INSERT INTO albums (
      user_id, title, subtitle, description,
      theme, accent_color, status, is_public
    ) VALUES (
      ${actualUserId},
      'Meu Álbum de Aniversário',
      'Um álbum especial para guardar memórias',
      'Álbum criado automaticamente',
      'gold',
      '#D4AF37',
      'active',
      false
    )
    RETURNING *
  `;
  
  return newAlbum[0] as Album;
}

// Get album dashboard data with stats
export async function getAlbumDashboard(albumId: string): Promise<{
  album: Album;
  stats: AlbumStats;
} | null> {
  if (!sql) throw new Error('Database not available');
  
  const albumResult = await sql`
    SELECT a.*, u.name as editor_name, u.storage_used, u.storage_limit
    FROM albums a
    LEFT JOIN users u ON a.last_edited_by = u.id
    WHERE a.id = ${albumId}
  `;
  
  if (!albumResult[0]) return null;
  
  const album = albumResult[0] as Album & { editor_name: string; storage_used: number; storage_limit: number };
  
  // Calculate view growth (mock calculation - in production, compare with previous month)
  const viewGrowth = 12; // +12% este mês
  
  const stats: AlbumStats = {
    storage_used: album.storage_used,
    storage_limit: album.storage_limit,
    view_count: album.view_count,
    view_growth: viewGrowth,
    last_edited_at: album.last_edited_at || album.updated_at,
    last_edited_by: album.editor_name || 'Unknown'
  };
  
  return { album, stats };
}

// Update album personalization (cover, background, theme)
export async function updateAlbumPersonalization(
  albumId: string,
  data: {
    cover_image_url?: string;
    cover_thumbnail_url?: string;
    background_image_url?: string;
    custom_background_url?: string;
    theme?: string;
    accent_color?: string;
  }
): Promise<Album> {
  if (!sql) throw new Error('Database not available');
  
  // Build dynamic query using tagged template literals properly
  const result = await sql`
    UPDATE albums 
    SET 
      cover_image_url = COALESCE(${data.cover_image_url ?? null}, cover_image_url),
      cover_thumbnail_url = COALESCE(${data.cover_thumbnail_url ?? null}, cover_thumbnail_url),
      background_image_url = COALESCE(${data.background_image_url ?? null}, background_image_url),
      custom_background_url = COALESCE(${data.custom_background_url ?? null}, custom_background_url),
      theme = COALESCE(${data.theme ?? null}, theme),
      accent_color = COALESCE(${data.accent_color ?? null}, accent_color),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${albumId}
    RETURNING *
  `;
  
  return result[0] as Album;
}

// Get background presets
export async function getBackgroundPresets(): Promise<BackgroundPreset[]> {
  if (!sql) throw new Error('Database not available');
  
  const result = await sql`
    SELECT * FROM background_presets 
    ORDER BY sort_order ASC, created_at ASC
  `;
  
  return result as BackgroundPreset[];
}

// Increment album view count
export async function incrementViewCount(albumId: string): Promise<void> {
  if (!sql) throw new Error('Database not available');
  
  await sql`
    UPDATE albums 
    SET view_count = view_count + 1 
    WHERE id = ${albumId}
  `;
}
