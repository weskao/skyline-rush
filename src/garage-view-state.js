import { reactive } from 'vue';

// Event-driven presentation only; live race and WebGL state never enter Vue.
export const garageView = reactive({
  selected: 'pearl',
  status: '',
  equipDisabled: true,
  equipLabel: '',
});

export function updateGarageView(fields) {
  Object.assign(garageView, fields);
}
