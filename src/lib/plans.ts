/**
 * Fonte única dos limites de plano (Básico / Premium).
 * Básico: até 3 álbuns e 300 MB. Premium: ilimitado e 500 MB (cabe no banco Neon gratuito, de 512 MB no total).
 */
export type PlanId = 'basic' | 'premium';

const MB = 1024 ** 2;

export interface PlanInfo {
  id: PlanId;
  name: string;
  priceLabel: string;
  albumLimit: number; // Infinity = ilimitado
  storageBytes: number;
  proDesigns: boolean;
  benefits: string[];
}

export const PLANS: Record<PlanId, PlanInfo> = {
  basic: {
    id: 'basic',
    name: 'Básico',
    priceLabel: 'Gratuito',
    albumLimit: 3,
    storageBytes: 300 * MB,
    proDesigns: false,
    benefits: ['Até 3 álbuns', '300 MB de armazenamento', 'Temas básicos', 'Suporte por e-mail'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceLabel: 'Tudo do Básico e mais',
    albumLimit: Infinity,
    storageBytes: 500 * MB,
    proDesigns: true,
    benefits: ['Álbuns ilimitados', '500 MB de armazenamento', 'Temas exclusivos', 'Suporte prioritário', 'Estilos premium ilimitados'],
  },
};

/** Valores antigos no banco ('free', 'deluxe', nulo) caem no plano equivalente. */
export function normalizePlan(planType?: string | null): PlanId {
  return planType === 'premium' || planType === 'deluxe' ? 'premium' : 'basic';
}

export function getPlan(planType?: string | null): PlanInfo {
  return PLANS[normalizePlan(planType)];
}

/** Limite efetivo: sempre o do plano (valores antigos gravados no banco, como 1 GB ou 5 GB, são ignorados). */
export function storageLimitFor(planType?: string | null, _stored?: number | string | null): number {
  return getPlan(planType).storageBytes;
}

export function canCreateAlbum(planType: string | null | undefined, currentCount: number): boolean {
  return currentCount < getPlan(planType).albumLimit;
}
