/** Temas, layouts e estilos do livro (personalizacao.xml). */

export type ThemeId = 'creme' | 'pessego' | 'salvia' | 'ceu' | 'noite' | 'terracota';
export type LayoutId = 'one' | 'two' | 'collage';
export type StyleId = 'jardim' | 'festa' | 'polaroid' | 'cinema';

export interface BookTheme {
  id: ThemeId;
  label: string;
  swatch: string;
  page: string;
  text: string;
  muted: string;
  title: string;
  line: string;
  pro: boolean;
}

export const THEMES: BookTheme[] = [
  { id: 'creme', label: 'Creme', swatch: '#FFF9F0', page: '#FFF9F0', text: '#201E1D', muted: '#6B6156', title: '#8F5129', line: '#C67139', pro: false },
  { id: 'pessego', label: 'Pêssego', swatch: '#E8C4A8', page: '#FBEFE4', text: '#201E1D', muted: '#6B6156', title: '#8F5129', line: '#D49A72', pro: false },
  { id: 'salvia', label: 'Sálvia', swatch: '#A9B892', page: '#F7F1E4', text: '#201E1D', muted: '#6B6156', title: '#8F5129', line: '#7A8A5E', pro: false },
  { id: 'ceu', label: 'Céu', swatch: '#B7CBD6', page: '#F5F3EC', text: '#201E1D', muted: '#5F6466', title: '#4A5F6B', line: '#8FA9B6', pro: false },
  { id: 'noite', label: 'Noite', swatch: '#2A2A28', page: '#2A2A28', text: '#F5EAD8', muted: '#CBBFAE', title: '#E8C4A8', line: '#C67139', pro: true },
  { id: 'terracota', label: 'Terracota', swatch: '#C67139', page: '#F3DCC9', text: '#201E1D', muted: '#6B4E3A', title: '#8F5129', line: '#C67139', pro: true },
];

export const LAYOUTS: { id: LayoutId; label: string; perPage: number }[] = [
  { id: 'one', label: 'Uma foto', perPage: 1 },
  { id: 'two', label: 'Duas fotos', perPage: 2 },
  { id: 'collage', label: 'Colagem', perPage: 3 },
];

export const STYLES: { id: StyleId; label: string; pro: boolean }[] = [
  { id: 'jardim', label: 'Jardim', pro: false },
  { id: 'festa', label: 'Festa', pro: false },
  { id: 'polaroid', label: 'Polaroid', pro: false },
  { id: 'cinema', label: 'Cinema', pro: true },
];

export function getTheme(id?: string | null): BookTheme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}

export function getLayout(id?: string | null) {
  return LAYOUTS.find(l => l.id === id) ?? LAYOUTS[1];
}

export function getStyle(id?: string | null) {
  return STYLES.find(s => s.id === id) ?? STYLES[0];
}

/** Cor de fundo para capas sem foto (cards de álbum). */
export function themeSwatch(id?: string | null) {
  return getTheme(id).swatch;
}
