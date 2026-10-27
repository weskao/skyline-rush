import { test } from 'node:test';
import assert from 'node:assert/strict';
import { garageView, updateGarageView } from '../src/garage-view-state.ts';

test('garage reactive state moves focus and status together, without game-frame updates', () => {
  updateGarageView({ selected: 'pearl', status: 'Pearl equipped', equipDisabled: true, equipLabel: 'Equipped' });
  assert.equal(garageView.selected, 'pearl');
  assert.equal(garageView.equipDisabled, true);
  updateGarageView({ selected: 'ruby', status: 'Ruby available', equipDisabled: false, equipLabel: 'Equip Ruby' });
  assert.deepEqual({ selected: garageView.selected, status: garageView.status, equipDisabled: garageView.equipDisabled, equipLabel: garageView.equipLabel },
    { selected: 'ruby', status: 'Ruby available', equipDisabled: false, equipLabel: 'Equip Ruby' });
});
