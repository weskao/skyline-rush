import { reactive } from 'vue';

interface HistoryRun {
  fields: string[];
  best: boolean;
  bestLabel: string;
  detail: string;
}
interface TrendPoint { x: number; y: number; title: string }
interface HistoryModeRow {
  mode: string;
  personalBest: boolean;
  ghost: boolean;
  text: string;
}
interface HistoryView {
  challengeMedals: Array<{ id: string; name: string; detail: string; awarded: boolean; status: string }>;
  challengeMedalCount: string;
  challengeMedalPeaks: string;
  modeHistoryEmpty: boolean;
  modeRuns: HistoryModeRow[];
  dailyStatus: string;
  dailyStartDisabled: boolean;
  dailyBoard: string[];
  medalAwards: Record<string, string | null>;
  medalNotAwarded: string;
  achievementStatus: string;
  careerSummary: string;
  historyEmpty: boolean;
  trendVisible: boolean;
  trendLabel: string;
  trendPolyPoints: string;
  trendCircles: TrendPoint[];
  historyRuns: HistoryRun[];
}
export const historyView = reactive<HistoryView>({
  challengeMedals: [], challengeMedalCount: '', challengeMedalPeaks: '',
  modeHistoryEmpty: true, modeRuns: [],
  dailyStatus: 'No daily challenge is available yet.', dailyStartDisabled: true,
  dailyBoard: ['No challenge runs recorded yet.'],
  medalAwards: {}, medalNotAwarded: 'Not awarded', achievementStatus: 'Your awarded medals will appear here when available.',
  careerSummary: '', historyEmpty: true, trendVisible: false,
  trendLabel: '', trendPolyPoints: '', trendCircles: [], historyRuns: [],
});
export function updateHistoryView(changes: Partial<HistoryView>): void {
  Object.assign(historyView, changes);
}
