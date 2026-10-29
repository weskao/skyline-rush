// Feature copy catalogs, merged here so the UI catalog takes one spread per locale however
// many features add strings (keys never overlap; tests/i18n.test.js checks locale parity).
import { CUP_RECOVERY_COPY } from './cup-recovery.ts';
import { RACE_PRESENTATION_COPY } from './race-presentation.ts';

export const FEATURE_COPY = {
  en: { ...CUP_RECOVERY_COPY.en, ...RACE_PRESENTATION_COPY.en },
  'zh-TW': { ...CUP_RECOVERY_COPY['zh-TW'], ...RACE_PRESENTATION_COPY['zh-TW'] },
} as const;
