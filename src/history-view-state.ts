import { reactive } from 'vue';

interface HistoryRun {
  fields: string[];
  best: boolean;
  bestLabel: string;
  detail: string;
}
interface TrendPoint { x: number; y: number; title: string }
interface HistoryView {
  careerSummary: string;
  historyEmpty: boolean;
  trendVisible: boolean;
  trendLabel: string;
  trendPolyPoints: string;
  trendCircles: TrendPoint[];
  historyRuns: HistoryRun[];
}
export const historyView = reactive<HistoryView>({
  careerSummary: '', historyEmpty: false, trendVisible: false,
  trendLabel: '', trendPolyPoints: '', trendCircles: [], historyRuns: [],
});
export function updateHistoryView(changes: Partial<HistoryView>): void {
  Object.assign(historyView, changes);
}
