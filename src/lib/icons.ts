import {
  Calendar,
  Baby,
  PartyPopper,
  Plane,
  GraduationCap,
  Heart,
  Camera,
  Star,
  House,
  PawPrint,
  Cake,
  Gift,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

/**
 * Os ícones de seção ficam salvos no banco com nomes do Material Symbols
 * (ex.: 'calendar_today'). Mantemos esses nomes como chave e trocamos só o desenho.
 */
export const SECTION_ICONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'calendar_today', label: 'Calendário', Icon: Calendar },
  { value: 'child_care', label: 'Bebê', Icon: Baby },
  { value: 'celebration', label: 'Festa', Icon: PartyPopper },
  { value: 'cake', label: 'Bolo', Icon: Cake },
  { value: 'flight', label: 'Viagem', Icon: Plane },
  { value: 'school', label: 'Escola', Icon: GraduationCap },
  { value: 'favorite', label: 'Coração', Icon: Heart },
  { value: 'photo_camera', label: 'Câmera', Icon: Camera },
  { value: 'star', label: 'Estrela', Icon: Star },
  { value: 'home', label: 'Casa', Icon: House },
  { value: 'pets', label: 'Animal', Icon: PawPrint },
  { value: 'redeem', label: 'Presente', Icon: Gift },
];

const MAP = new Map(SECTION_ICONS.map(i => [i.value, i.Icon]));

export function sectionIcon(name?: string | null): LucideIcon {
  return (name && MAP.get(name)) || BookOpen;
}
