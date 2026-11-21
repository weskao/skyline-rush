import { demoAcquisitionId } from './acquisition-demo-items.ts';
import { ACQUISITION_KIND, type AcquisitionBatch } from './acquisition-reveal.ts';
import { skinArtwork } from './garage-skin-catalog.ts';
import { findDemoItem } from './wave3-demo-catalog.ts';
import { sameDemoScope } from './wave3-experience-contract.ts';
import type { DemoOperationScope, ExperienceResult, Wave3ExperiencePort } from './wave3-experience-contract.ts';

export function storeAcquisitionBatch(
  id: string, scope: DemoOperationScope, receipt: Pick<ExperienceResult, 'status' | 'operationId' | 'snapshot'>,
  port: Pick<Wave3ExperiencePort, 'equipPreview' | 'getOperationScope' | 'getSnapshot'>,
): AcquisitionBatch | undefined {
  if (receipt.status !== 'completed' || !receipt.operationId || !receipt.snapshot.demoInventory.includes(id)) return;
  const item = findDemoItem(id);
  if (!item) return;
  const art = skinArtwork(item.id, '/');
  return {
    id: demoAcquisitionId('store', scope, receipt.operationId),
    items: [{
      id: item.id, name: item.name, kind: ACQUISITION_KIND.EQUIPMENT, status: 'unlocked', scope: 'demo',
      action: {
        kind: 'equip',
        isApplied: () => sameDemoScope(scope, port.getOperationScope()) && port.getSnapshot().equippedPreview === id,
        async apply() {
          const result = await port.equipPreview(id, scope);
          return (result.status === 'completed' || result.status === 'duplicate')
            && sameDemoScope(scope, port.getOperationScope()) && result.snapshot.equippedPreview === id;
        },
      },
      equipmentCategory: item.category, artwork: art ? { src: art.src.slice(1), style: 'icon' } : undefined,
    }],
  };
}
