import { sql } from '../../db/connection';

export interface Section {
  id: string;
  album_id: string;
  title: string;
  description?: string;
  icon: string;
  icon_color: string;
  image_url?: string;
  section_type: 'year' | 'age' | 'category' | 'custom';
  sort_order: number;
  status: 'active' | 'draft' | 'hidden';
  photo_count: number;
  video_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSectionInput {
  album_id: string;
  title: string;
  description?: string;
  icon?: string;
  icon_color?: string;
  image_url?: string;
  section_type: 'year' | 'age' | 'category' | 'custom';
  status?: 'active' | 'draft' | 'hidden';
}

export interface UpdateSectionInput {
  title?: string;
  description?: string;
  icon?: string;
  icon_color?: string;
  image_url?: string;
  section_type?: 'year' | 'age' | 'category' | 'custom';
  status?: 'active' | 'draft' | 'hidden';
  sort_order?: number;
}

// Get sections by album ID with optional type filter
export async function getSectionsByAlbum(
  albumId: string,
  sectionType?: 'year' | 'age' | 'category' | 'custom'
): Promise<Section[]> {
  if (!sql) throw new Error('Database not available');
  
  if (sectionType) {
    const result = await sql`
      SELECT * FROM sections 
      WHERE album_id = ${albumId} AND section_type = ${sectionType}
      ORDER BY sort_order ASC, created_at ASC
    `;
    return result as Section[];
  }
  
  const result = await sql`
    SELECT * FROM sections 
    WHERE album_id = ${albumId}
    ORDER BY sort_order ASC, created_at ASC
  `;
  
  return result as Section[];
}

// Get section by ID
export async function getSectionById(sectionId: string): Promise<Section | null> {
  if (!sql) throw new Error('Database not available');
  
  const result = await sql`
    SELECT * FROM sections WHERE id = ${sectionId}
  `;
  
  return result[0] as Section || null;
}

// Create new section
export async function createSection(input: CreateSectionInput): Promise<Section> {
  if (!sql) throw new Error('Database not available');
  
  // Get next sort order
  const maxOrderResult = await sql`
    SELECT COALESCE(MAX(sort_order), 0) as max_order 
    FROM sections 
    WHERE album_id = ${input.album_id}
  `;
  const nextSortOrder = (maxOrderResult[0] as { max_order: number }).max_order + 1;
  
  // Count photo if image_url is provided
  const photoCount = input.image_url ? 1 : 0;
  
  const result = await sql`
    INSERT INTO sections (
      album_id, title, description, icon, icon_color, 
      image_url, section_type, status, sort_order, photo_count
    ) VALUES (
      ${input.album_id}, 
      ${input.title}, 
      ${input.description || null}, 
      ${input.icon || 'calendar_today'}, 
      ${input.icon_color || '#D4AF37'},
      ${input.image_url || null},
      ${input.section_type}, 
      ${input.status || 'active'},
      ${nextSortOrder},
      ${photoCount}
    )
    RETURNING *
  `;
  
  return result[0] as Section;
}

// Update section
export async function updateSection(
  sectionId: string,
  input: UpdateSectionInput
): Promise<Section> {
  if (!sql) throw new Error('Database not available');
  
  // If image_url is being updated, also update photo_count
  const hasImage = input.image_url !== undefined;
  const photoCount = hasImage ? (input.image_url ? 1 : 0) : null;
  
  const result = await sql`
    UPDATE sections 
    SET 
      title = COALESCE(${input.title ?? null}, title),
      description = COALESCE(${input.description ?? null}, description),
      icon = COALESCE(${input.icon ?? null}, icon),
      icon_color = COALESCE(${input.icon_color ?? null}, icon_color),
      image_url = COALESCE(${input.image_url ?? null}, image_url),
      section_type = COALESCE(${input.section_type ?? null}, section_type),
      status = COALESCE(${input.status ?? null}, status),
      sort_order = COALESCE(${input.sort_order ?? null}, sort_order),
      photo_count = COALESCE(${photoCount}, photo_count),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${sectionId}
    RETURNING *
  `;
  
  return result[0] as Section;
}

// Delete section
export async function deleteSection(sectionId: string): Promise<void> {
  if (!sql) throw new Error('Database not available');
  
  await sql`DELETE FROM sections WHERE id = ${sectionId}`;
}

// Reorder sections
export async function reorderSections(
  albumId: string,
  sectionIds: string[]
): Promise<void> {
  if (!sql) throw new Error('Database not available');
  
  // Update sort_order for each section
  for (let i = 0; i < sectionIds.length; i++) {
    await sql`
      UPDATE sections 
      SET sort_order = ${i}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${sectionIds[i]} AND album_id = ${albumId}
    `;
  }
}

// Update section media counts (call this after adding/removing media)
export async function updateSectionMediaCounts(sectionId: string): Promise<void> {
  if (!sql) throw new Error('Database not available');
  
  await sql`
    UPDATE sections 
    SET 
      photo_count = (
        SELECT COUNT(*) FROM media 
        WHERE section_id = ${sectionId} AND file_type LIKE 'image/%'
      ),
      video_count = (
        SELECT COUNT(*) FROM media 
        WHERE section_id = ${sectionId} AND file_type LIKE 'video/%'
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${sectionId}
  `;
}
