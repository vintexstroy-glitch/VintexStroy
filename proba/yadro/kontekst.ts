/**
 * КОНТЕКСТЪТ НА ПРОХОДА · вместо разпръснати глобални променливи.
 *
 * Всеки от 44-те блока получава ЕДИН обект: страницата (за да действа) и
 * брояча (за да отчита). Никакво друго споделено мутируемо състояние не
 * тече между блоковете — редът им е записан в `_manifest`-а на прохода, не
 * в скрити глобали тук.
 */

import type { Page } from 'playwright-core';
import type { Broyach } from './proverka.ts';

export interface KonteksNaProhoda {
  readonly stranitsa: Page;
  readonly broyach: Broyach;
}
