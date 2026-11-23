/**
 * Fonte única dos limites de plano (Básico / Premium).
 * Valores do handoff (conta_planos.xml): Básico até 3 álbuns e 5 GB; Premium ilimitado e 20 GB.
 */
export type PlanId = 'basic' | 'premium';

const GB = 1024 ** 3;

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
    storageBytes: 5 * GB,
    proDesigns: false,
    benefits: ['Até 3 álbuns', '5 GB de armazenamento', 'Temas básicos', 'Suporte por e-mail'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceLabel: 'Tudo do Básico e mais',
    albumLimit: Infinity,
    storageBytes: 20 * GB,
    proDesigns: true,
    benefits: ['Álbuns ilimitados', '20 GB de armazenamento', 'Temas exclusivos', 'Suporte prioritário', 'Estilos premium ilimitados'],
  },
};

/** Valores antigos no banco ('free', 'deluxe', nulo) caem no plano equivalente. */
export function normalizePlan(planType?: string | null): PlanId {
  return planType === 'premium' || planType === 'deluxe' ? 'premium' : 'basic';
}

export function getPlan(planType?: string | null): PlanInfo {
  return PLANS[normalizePlan(planType)];
}

/** Limite efetivo: o maior entre o valor salvo e o do plano (corrige usuários antigos gravados com 1 GB). */
export function storageLimitFor(planType?: string | null, stored?: number | string | null): number {
  const planLimit = getPlan(planType).storageBytes;
  const s = Number(stored) || 0;
  return Math.max(planLimit, s);
}

export function canCreateAlbum(planType: string | null | undefined, currentCount: number): boolean {
  return currentCount < getPlan(planType).albumLimit;
}
