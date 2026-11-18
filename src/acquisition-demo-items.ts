import type { AcquisitionItem } from './acquisition-reveal.ts';
import type { DemoOperationScope, ExperienceResult, ExperienceSnapshot } from './wave3-experience-contract.ts';
import { demoCurrencyLabel } from './wave3-currency-view.ts';
import { filterWave3PreviewItems } from './garage-wave3-preview-catalog.ts';
import { trophyTier } from './wave3-demo-missions.ts';

type DemoCredit = Pick<ExperienceResult, 'status' | 'deltaDemoPoints' | 'deltaDemoCoins' | 'deltaDemoDiamonds'>;
export function demoAcquisitionItems(receipt: DemoCredit | null): AcquisitionItem[] {
  if (receipt?.status !== 'completed') return [];
  const credits = [
    ['coins', receipt.deltaDemoCoins, 'wallet-coin'],
    ['diamonds', receipt.deltaDemoDiamonds, 'wallet-diamond'],
    ['points', receipt.deltaDemoPoints, 'demo-points'],
  ] as const;
  return credits.flatMap(([id, quantity, art]): AcquisitionItem[] => quantity && quantity > 0 ? [{
    id, quantity, kind: 'currency', status: 'earned', scope: 'demo',
    name: { en: demoCurrencyLabel(id, 'en'), 'zh-TW': demoCurrencyLabel(id, 'zh-TW') },
    artwork: { src: `feature-assets/wave3-demo/raster/${art}@3x.webp`, style: 'icon' },
  }] : []);
}

export const demoAcquisitionId = (source: 'mission' | 'store', scope: DemoOperationScope, operation: string) =>
  JSON.stringify([source, scope.accountId, scope.generation, scope.session, operation]);

export function missionTrophy(id: string, snapshot: Pick<ExperienceSnapshot, 'missions'>): AcquisitionItem | undefined {
  const missions = filterWave3PreviewItems('garage-rewards-and-missions', 'mission');
  if (!snapshot.missions[id]?.claimed || !missions.some(mission => mission.id === id)) return;
  const tier = trophyTier(missions.filter(mission => snapshot.missions[mission.id]?.claimed).length);
  const trophy = filterWave3PreviewItems('garage-rewards-and-missions', 'trophy').find(item => item.id === `trophy-${tier}`);
  if (trophy) return { id: trophy.id, name: trophy.name, kind: 'medal', status: 'earned', scope: 'demo',
    artwork: { src: `feature-assets/garage-rewards-and-missions/raster/${trophy.id}@3x.webp`, style: 'icon' } };
}
