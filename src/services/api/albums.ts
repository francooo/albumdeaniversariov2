import { sql } from '../../db/connection';

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
      VALUES ('default@example.com', 'Usuário Padrão', 'basic', 0, 1073741824)
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

// Create a new album
export async function createAlbum(input: CreateAlbumInput): Promise<Album> {
  if (!sql) throw new Error('Database not available');
  
  const result = await sql`
    INSERT INTO albums (
      user_id, title, subtitle, description, 
      theme, accent_color, status, is_public
    ) VALUES (
      ${input.user_id}, 
      ${input.title}, 
      ${input.subtitle || null}, 
      ${input.description || null},
      ${input.theme || 'gold'},
      ${input.accent_color || '#D4AF37'},
      ${input.status || 'draft'},
      ${input.is_public || false}
    )
    RETURNING *
  `;
  
  return result[0] as Album;
}

// Get or create a default album for the current user
// Get albums by user ID
export async function getAlbumsByUser(userId: string): Promise<Album[]> {
  if (!sql) throw new Error('Database not available');
  
  return await sql`SELECT * FROM albums WHERE user_id = ${userId} ORDER BY created_at DESC` as Album[];
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
        VALUES ('default@example.com', 'Default User', 'basic', 0, 1073741824)
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
