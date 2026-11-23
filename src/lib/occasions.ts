/** Ocasiões do modal "Criar novo álbum" (criar_album.xml) e as seções que cada uma já cria. */
export type OccasionId = 'aniversario' | 'viagem' | 'primeiro_ano' | 'casamento' | 'em_branco';

export interface OccasionSection {
  title: string;
  icon: string;
}

export interface Occasion {
  id: OccasionId;
  label: string;
  hint: string;
  defaultSubtitle: string;
  sections: OccasionSection[];
}

const months = Array.from({ length: 12 }, (_, i) => ({ title: `Mês ${i + 1}`, icon: 'child_care' }));

export const OCCASIONS: Occasion[] = [
  {
    id: 'aniversario',
    label: 'Aniversário',
    hint: 'Preparativos · A festa · Parabéns',
    defaultSubtitle: 'Um dia para lembrar',
    sections: [
      { title: 'Preparativos', icon: 'redeem' },
      { title: 'A festa', icon: 'celebration' },
      { title: 'Parabéns', icon: 'cake' },
    ],
  },
  {
    id: 'viagem',
    label: 'Viagem',
    hint: 'Uma seção por dia',
    defaultSubtitle: 'Dias para não esquecer',
    sections: [{ title: 'Dia 1', icon: 'flight' }],
  },
  {
    id: 'primeiro_ano',
    label: 'Primeiro ano',
    hint: 'Uma seção por mês',
    defaultSubtitle: 'Um ano de descobertas',
    sections: months,
  },
  {
    id: 'casamento',
    label: 'Casamento',
    hint: 'Cerimônia e festa',
    defaultSubtitle: 'O nosso dia',
    sections: [
      { title: 'Cerimônia', icon: 'favorite' },
      { title: 'Festa', icon: 'celebration' },
    ],
  },
  {
    id: 'em_branco',
    label: 'Em branco',
    hint: 'Sem seções prontas',
    defaultSubtitle: '',
    sections: [],
  },
];

export function getOccasion(id?: string | null): Occasion | undefined {
  return OCCASIONS.find(o => o.id === id);
}
