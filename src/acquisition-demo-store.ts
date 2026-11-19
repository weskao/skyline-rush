import { demoAcquisitionId } from './acquisition-demo-items.ts';
import { ACQUISITION_KIND, type AcquisitionBatch } from './acquisition-reveal.ts';
import { skinArtwork } from './garage-skin-catalog.ts';
import { findDemoItem } from './wave3-demo-catalog.ts';
import type { DemoOperationScope, ExperienceResult } from './wave3-experience-contract.ts';

export function storeAcquisitionBatch(
  id: string, scope: DemoOperationScope, receipt: Pick<ExperienceResult, 'status' | 'operationId' | 'snapshot'>,
): AcquisitionBatch | undefined {
  if (receipt.status !== 'completed' || !receipt.operationId || !receipt.snapshot.demoInventory.includes(id)) return;
  const item = findDemoItem(id);
  if (!item) return;
  const art = skinArtwork(item.id, '/');
  return {
    id: demoAcquisitionId('store', scope, receipt.operationId),
    items: [{
      id: item.id, name: item.name, kind: ACQUISITION_KIND.EQUIPMENT, status: 'unlocked', scope: 'demo',
      equipmentCategory: item.category, artwork: art ? { src: art.src.slice(1), style: 'icon' } : undefined,
    }],
  };
}
