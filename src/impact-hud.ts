import { setHiddenIfChanged, setTextIfChanged } from './hud-dom.ts';
import { t } from './i18n.ts';

interface Hit { time: number; kind: string; speedLost: number }
interface ContactFeedback { impact?: Hit | null; shieldBlock?: { time: number }; cooldown: number }

export function createImpactHud(report: HTMLElement, refreshPlacement: () => void) {
  const title = report.querySelector<HTMLElement>('#impact-title')!;
  const loss = report.querySelector<HTMLElement>('#impact-loss')!;
  const detail = report.querySelector<HTMLElement>('#impact-detail')!;
  const impactIcon = report.querySelector<HTMLElement>('#impact-brake-icon')!;
  const protectionIcon = report.querySelector<HTMLElement>('#impact-protection-icon')!;
  return (car: ContactFeedback, elapsed: number, racing: boolean): void => {
    const impact = car.impact;
    const shield = car.shieldBlock;
    const shielded = !!shield && shield.time > (impact?.time ?? -Infinity);
    const age = elapsed - ((shielded ? shield.time : impact?.time) ?? -Infinity);
    const hit = !shielded && !!impact && age <= 0.95;
    const kind = !racing ? '' : hit ? 'hit' : car.cooldown > 0 && age < 1.5 ? shielded ? 'shielded' : 'recovery' : '';
    const changed = report.dataset.contact !== kind;
    setHiddenIfChanged(report, !kind);
    if (!kind) {
      if (changed) { report.dataset.contact = ''; refreshPlacement(); }
      return;
    }
    if (changed) report.dataset.contact = kind;
    setHiddenIfChanged(detail, !hit);
    setHiddenIfChanged(impactIcon, !hit);
    setHiddenIfChanged(protectionIcon, hit);
    setTextIfChanged(title, t(hit ? impact.kind === 'barrier' ? 'hud.barrier' : 'hud.vehicle'
      : shielded ? 'impact.shielded' : 'impact.protection'));
    if (hit) setTextIfChanged(loss, String(Math.round(impact.speedLost * 3.6)));
    if (changed) refreshPlacement();
  };
}
