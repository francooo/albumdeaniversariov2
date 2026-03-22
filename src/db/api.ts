/**
 * Database API Layer
 * CRUD operations for the Album application
 */

import { sql, isDatabaseAvailable } from './connection';

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  google_id?: string;
  plan_type: 'free' | 'premium' | 'deluxe';
  storage_used: number;
  storage_limit: number;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface Album {
  id: string;
  user_id: string;
  title: string;
  subtitle?: string;
  description?: string;
  cover_image_url?: string;
  background_image_url?: string;
  theme: 'gold' | 'silver' | 'rose-gold' | 'minimal';
  status: 'draft' | 'active' | 'archived';
  is_public: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface Section {
  id: string;
  album_id: string;
  title: string;
  icon: string;
  section_type: 'year' | 'age' | 'category' | 'custom';
  sort_order: number;
  status: 'active' | 'draft' | 'hidden';
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  album_id: string;
  section_id?: string;
  page_number: number;
  title?: string;
  subtitle?: string;
  content?: string;
  quote?: string;
  author_note?: string;
  layout: 'standard' | 'full-bleed' | 'collage' | 'text-only';
  background_color?: string;
  status: string;
  created_at: string;
  updated_at: string;
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

export interface Message {
  id: string;
  album_id: string;
  author_name: string;
  author_email?: string;
  content: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// USERS API
// ============================================================================

export async function createUser(data: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null> {
  if (!isDatabaseAvailable()) return null;
  
  const result = await sql`
    INSERT INTO users (email, name, avatar_url, google_id, plan_type, storage_used, storage_limit, last_login)
    VALUES (${data.email}, ${data.name}, ${data.avatar_url}, ${data.google_id}, ${data.plan_type}, ${data.storage_used}, ${data.storage_limit}, ${data.last_login})
    RETURNING *
  `;
  return result[0] as User;
}

export async function getUserById(id: string): Promise<User | null> {
  if (!isDatabaseAvailable()) return null;
  
  const result = await sql`SELECT * FROM users WHERE id = ${id}`;
  return result[0] as User || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (!isDatabaseAvailable()) return null;
  
  const result = await sql`SELECT * FROM users WHERE email = ${email}`;
  return result[0] as User || null;
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  if (!isDatabaseAvailable()) return null;
  
  const result = await sql`SELECT * FROM users WHERE google_id = ${googleId}`;
  return result[0] as User || null;
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  if (!isDatabaseAvailable()) return null;
  
  // Build dynamic update query using individual field updates
  const { email, name, avatar_url, plan_type, storage_used, storage_limit, last_login } = data;
  
  const result = await sql`
    UPDATE users 
    SET 
      email = COALESCE(${email}, email),
      name = COALESCE(${name}, name),
      avatar_url = COALESCE(${avatar_url}, avatar_url),
      plan_type = COALESCE(${plan_type}, plan_type),
      storage_used = COALESCE(${storage_used}, storage_used),
      storage_limit = COALESCE(${storage_limit}, storage_limit),
      last_login = COALESCE(${last_login}, last_login)
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] as User || null;
}

// ============================================================================
// ALBUMS API
// ============================================================================

export async function createAlbum(data: Omit<Album, 'id' | 'created_at' | 'updated_at' | 'view_count'>): Promise<Album | null> {
  if (!isDatabaseAvailable()) return null;
  
  const result = await sql`
    INSERT INTO albums (user_id, title, subtitle, description, cover_image_url, background_image_url, theme, status, is_public, published_at)
    VALUES (${data.user_id}, ${data.title}, ${data.subtitle}, ${data.description}, ${data.cover_image_url}, ${data.background_image_url}, ${data.theme}, ${data.status}, ${data.is_public}, ${data.published_at})
    RETURNING *
  `;
  return result[0] as Album;
}

export async function getAlbumsByUser(userId: string): Promise<Album[]> {
  if (!isDatabaseAvailable()) return [];
  
  return await sql`SELECT * FROM albums WHERE user_id = ${userId} ORDER BY created_at DESC` as Album[];
}

export async function getAlbumById(id: string): Promise<Album | null> {
  if (!isDatabaseAvailable()) return null;
  
  const result = await sql`SELECT * FROM albums WHERE id = ${id}`;
  return result[0] as Album || null;
}

export async function updateAlbum(id: string, data: Partial<Album>): Promise<Album | null> {
  if (!isDatabaseAvailable()) return null;
  
  const { title, subtitle, description, cover_image_url, background_image_url, theme, status, is_public, published_at } = data;
  
  const result = await sql`
    UPDATE albums 
    SET 
      title = COALESCE(${title}, title),
      subtitle = COALESCE(${subtitle}, subtitle),
      description = COALESCE(${description}, description),
      cover_image_url = COALESCE(${cover_image_url}, cover_image_url),
      background_image_url = COALESCE(${background_image_url}, background_image_url),
      theme = COALESCE(${theme}, theme),
      status = COALESCE(${status}, status),
      is_public = COALESCE(${is_public}, is_public),
      published_at = COALESCE(${published_at}, published_at)
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] as Album || null;
}

export async function deleteAlbum(id: string): Promise<boolean> {
  if (!isDatabaseAvailable()) return false;
  
  await sql`DELETE FROM albums WHERE id = ${id}`;
  return true;
}

export async function incrementAlbumViews(id: string): Promise<void> {
  if (!isDatabaseAvailable()) return;
  
  await sql`UPDATE albums SET view_count = view_count + 1 WHERE id = ${id}`;
}

// ============================================================================
// SECTIONS API
// ============================================================================

export async function createSection(data: Omit<Section, 'id' | 'created_at' | 'updated_at'>): Promise<Section | null> {
  if (!isDatabaseAvailable()) return null;
  
  const result = await sql`
    INSERT INTO sections (album_id, title, icon, section_type, sort_order, status)
    VALUES (${data.album_id}, ${data.title}, ${data.icon}, ${data.section_type}, ${data.sort_order}, ${data.status})
    RETURNING *
  `;
  return result[0] as Section;
}

export async function getSectionsByAlbum(albumId: string): Promise<Section[]> {
  if (!isDatabaseAvailable()) return [];
  
  return await sql`SELECT * FROM sections WHERE album_id = ${albumId} ORDER BY sort_order, created_at` as Section[];
}

export async function updateSection(id: string, data: Partial<Section>): Promise<Section | null> {
  if (!isDatabaseAvailable()) return null;
  
  const { title, icon, section_type, sort_order, status } = data;
  
  const result = await sql`
    UPDATE sections 
    SET 
      title = COALESCE(${title}, title),
      icon = COALESCE(${icon}, icon),
      section_type = COALESCE(${section_type}, section_type),
      sort_order = COALESCE(${sort_order}, sort_order),
      status = COALESCE(${status}, status)
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] as Section || null;
}

export async function deleteSection(id: string): Promise<boolean> {
  if (!isDatabaseAvailable()) return false;
  
  await sql`DELETE FROM sections WHERE id = ${id}`;
  return true;
}

// ============================================================================
// PAGES API
// ============================================================================

export async function createPage(data: Omit<Page, 'id' | 'created_at' | 'updated_at'>): Promise<Page | null> {
  if (!isDatabaseAvailable()) return null;
  
  const result = await sql`
    INSERT INTO pages (album_id, section_id, page_number, title, subtitle, content, quote, author_note, layout, background_color, status)
    VALUES (${data.album_id}, ${data.section_id}, ${data.page_number}, ${data.title}, ${data.subtitle}, ${data.content}, ${data.quote}, ${data.author_note}, ${data.layout}, ${data.background_color}, ${data.status})
    RETURNING *
  `;
  return result[0] as Page;
}

export async function getPagesByAlbum(albumId: string): Promise<Page[]> {
  if (!isDatabaseAvailable()) return [];
  
  return await sql`SELECT * FROM pages WHERE album_id = ${albumId} ORDER BY page_number` as Page[];
}

export async function getPagesBySection(sectionId: string): Promise<Page[]> {
  if (!isDatabaseAvailable()) return [];
  
  return await sql`SELECT * FROM pages WHERE section_id = ${sectionId} ORDER BY page_number` as Page[];
}

export async function updatePage(id: string, data: Partial<Page>): Promise<Page | null> {
  if (!isDatabaseAvailable()) return null;
  
  const { page_number, title, subtitle, content, quote, author_note, layout, background_color, status } = data;
  
  const result = await sql`
    UPDATE pages 
    SET 
      page_number = COALESCE(${page_number}, page_number),
      title = COALESCE(${title}, title),
      subtitle = COALESCE(${subtitle}, subtitle),
      content = COALESCE(${content}, content),
      quote = COALESCE(${quote}, quote),
      author_note = COALESCE(${author_note}, author_note),
      layout = COALESCE(${layout}, layout),
      background_color = COALESCE(${background_color}, background_color),
      status = COALESCE(${status}, status)
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] as Page || null;
}

export async function deletePage(id: string): Promise<boolean> {
  if (!isDatabaseAvailable()) return false;
  
  await sql`DELETE FROM pages WHERE id = ${id}`;
  return true;
}

// ============================================================================
// MEDIA API
// ============================================================================

export async function createMedia(data: Omit<Media, 'id' | 'created_at' | 'updated_at'>): Promise<Media | null> {
  if (!isDatabaseAvailable()) return null;
  
  const result = await sql`
    INSERT INTO media (user_id, album_id, section_id, page_id, file_name, original_url, thumbnail_url, medium_url, file_type, file_size, width, height, duration, caption, alt_text, sort_order, metadata)
    VALUES (${data.user_id}, ${data.album_id}, ${data.section_id}, ${data.page_id}, ${data.file_name}, ${data.original_url}, ${data.thumbnail_url}, ${data.medium_url}, ${data.file_type}, ${data.file_size}, ${data.width}, ${data.height}, ${data.duration}, ${data.caption}, ${data.alt_text}, ${data.sort_order}, ${data.metadata})
    RETURNING *
  `;
  return result[0] as Media;
}

export async function getMediaByUser(userId: string): Promise<Media[]> {
  if (!isDatabaseAvailable()) return [];
  
  return await sql`SELECT * FROM media WHERE user_id = ${userId} ORDER BY created_at DESC` as Media[];
}

export async function getMediaByAlbum(albumId: string): Promise<Media[]> {
  if (!isDatabaseAvailable()) return [];
  
  return await sql`SELECT * FROM media WHERE album_id = ${albumId} ORDER BY sort_order, created_at` as Media[];
}

export async function getMediaByPage(pageId: string): Promise<Media[]> {
  if (!isDatabaseAvailable()) return [];
  
  return await sql`SELECT * FROM media WHERE page_id = ${pageId} ORDER BY sort_order` as Media[];
}

export async function updateMedia(id: string, data: Partial<Media>): Promise<Media | null> {
  if (!isDatabaseAvailable()) return null;
  
  const { album_id, section_id, page_id, caption, alt_text, sort_order } = data;
  
  const result = await sql`
    UPDATE media 
    SET 
      album_id = COALESCE(${album_id}, album_id),
      section_id = COALESCE(${section_id}, section_id),
      page_id = COALESCE(${page_id}, page_id),
      caption = COALESCE(${caption}, caption),
      alt_text = COALESCE(${alt_text}, alt_text),
      sort_order = COALESCE(${sort_order}, sort_order)
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] as Media || null;
}

export async function deleteMedia(id: string): Promise<boolean> {
  if (!isDatabaseAvailable()) return false;
  
  await sql`DELETE FROM media WHERE id = ${id}`;
  return true;
}

// ============================================================================
// MESSAGES API
// ============================================================================

export async function createMessage(data: Omit<Message, 'id' | 'created_at' | 'updated_at' | 'is_approved'>): Promise<Message | null> {
  if (!isDatabaseAvailable()) return null;
  
  const result = await sql`
    INSERT INTO messages (album_id, author_name, author_email, content)
    VALUES (${data.album_id}, ${data.author_name}, ${data.author_email}, ${data.content})
    RETURNING *
  `;
  return result[0] as Message;
}

export async function getMessagesByAlbum(albumId: string, approvedOnly = true): Promise<Message[]> {
  if (!isDatabaseAvailable()) return [];
  
  if (approvedOnly) {
    return await sql`SELECT * FROM messages WHERE album_id = ${albumId} AND is_approved = true ORDER BY created_at DESC` as Message[];
  }
  return await sql`SELECT * FROM messages WHERE album_id = ${albumId} ORDER BY created_at DESC` as Message[];
}

export async function approveMessage(id: string): Promise<Message | null> {
  if (!isDatabaseAvailable()) return null;
  
  const result = await sql`
    UPDATE messages SET is_approved = true WHERE id = ${id} RETURNING *
  `;
  return result[0] as Message || null;
}

export async function deleteMessage(id: string): Promise<boolean> {
  if (!isDatabaseAvailable()) return false;
  
  await sql`DELETE FROM messages WHERE id = ${id}`;
  return true;
}

// ============================================================================
// STATS API
// ============================================================================

export async function getAlbumStats(albumId: string): Promise<{
  totalMedia: number;
  totalImages: number;
  totalVideos: number;
  totalStorage: number;
  totalSections: number;
  totalPages: number;
  totalMessages: number;
}> {
  if (!isDatabaseAvailable()) {
    return {
      totalMedia: 0,
      totalImages: 0,
      totalVideos: 0,
      totalStorage: 0,
      totalSections: 0,
      totalPages: 0,
      totalMessages: 0
    };
  }
  
  const [mediaStats] = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE file_type LIKE 'image/%') as images,
      COUNT(*) FILTER (WHERE file_type LIKE 'video/%') as videos,
      COALESCE(SUM(file_size), 0) as storage
    FROM media WHERE album_id = ${albumId}
  `;
  
  const [sectionCount] = await sql`SELECT COUNT(*) as count FROM sections WHERE album_id = ${albumId}`;
  const [pageCount] = await sql`SELECT COUNT(*) as count FROM pages WHERE album_id = ${albumId}`;
  const [messageCount] = await sql`SELECT COUNT(*) as count FROM messages WHERE album_id = ${albumId}`;
  
  return {
    totalMedia: parseInt(mediaStats.total) || 0,
    totalImages: parseInt(mediaStats.images) || 0,
    totalVideos: parseInt(mediaStats.videos) || 0,
    totalStorage: parseInt(mediaStats.storage) || 0,
    totalSections: parseInt(sectionCount.count) || 0,
    totalPages: parseInt(pageCount.count) || 0,
    totalMessages: parseInt(messageCount.count) || 0
  };
}
