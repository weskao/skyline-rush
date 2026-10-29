import { reactive } from 'vue';

interface HomeStatusView {
  dailyRoute: string;
  dailyBest: string;
  dailyStartDisabled: boolean;
  medalCount: string;
  medalLabel: string;
  hasMedals: boolean;
}

// Start-screen status shares the same single-owner Vue pattern as HistoryPanel.
export const homeStatusView = reactive<HomeStatusView>({
  dailyRoute: '', dailyBest: '', dailyStartDisabled: true,
  medalCount: '0/4', medalLabel: '', hasMedals: false,
});

export function updateHomeStatusView(changes: Partial<HomeStatusView>): void {
  Object.assign(homeStatusView, changes);
}
