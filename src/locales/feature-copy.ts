// Feature copy catalogs, merged here so the UI catalog takes one spread per locale however
// many features add strings (keys never overlap; tests/i18n.test.js checks locale parity).
import { CUP_RECOVERY_COPY } from './cup-recovery.ts';
import { DISPLAY_SETTINGS_COPY } from './display-settings.ts';
import { RACE_PRESENTATION_COPY } from './race-presentation.ts';
import { ITEM_SETTINGS_COPY } from './item-settings.ts';
import { HAZARD_WARNING_COPY } from './hazard-warnings.ts';

export const FEATURE_COPY = {
  en: { ...DISPLAY_SETTINGS_COPY.en, ...CUP_RECOVERY_COPY.en, ...RACE_PRESENTATION_COPY.en, ...ITEM_SETTINGS_COPY.en, ...HAZARD_WARNING_COPY.en },
  'zh-TW': { ...DISPLAY_SETTINGS_COPY['zh-TW'], ...CUP_RECOVERY_COPY['zh-TW'], ...RACE_PRESENTATION_COPY['zh-TW'], ...ITEM_SETTINGS_COPY['zh-TW'], ...HAZARD_WARNING_COPY['zh-TW'] },
} as const;
