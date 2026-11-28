import { enc, http } from './http';

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
  section_type: 'year' | 'age' | 'category' | 'custom';
  status?: 'active' | 'draft' | 'hidden';
}

export interface UpdateSectionInput {
  title?: string;
  description?: string;
  icon?: string;
  icon_color?: string;
  /** Só aceita '' (remove a imagem antiga gravada na seção). */
  image_url?: string;
  status?: 'active' | 'draft' | 'hidden';
  sort_order?: number;
}

export function getSectionsByAlbum(albumId: string): Promise<Section[]> {
  return http.get<Section[]>(`/albums/${enc(albumId)}/sections`);
}

export function createSection(input: CreateSectionInput): Promise<Section> {
  const { album_id, ...body } = input;
  return http.post<Section>(`/albums/${enc(album_id)}/sections`, body);
}

export function updateSection(sectionId: string, input: UpdateSectionInput): Promise<Section> {
  return http.patch<Section>(`/sections/${enc(sectionId)}`, input);
}

/** Exclui a seção e as fotos dela. */
export function deleteSection(sectionId: string): Promise<void> {
  return http.del(`/sections/${enc(sectionId)}`);
}

export function reorderSections(albumId: string, sectionIds: string[]): Promise<void> {
  return http.put(`/albums/${enc(albumId)}/sections/order`, { ids: sectionIds });
}
