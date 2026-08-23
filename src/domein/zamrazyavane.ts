/**
 * ЗАМРАЗЯВАНЕТО · подадена справка заключва месеца.
 *
 * Правилото от Смятача (П2.3), досега неподкрепено с код: „замразен период
 * не помръдва". Ключът е СПРАВКАТА — подадеш ли ДДС за февруари, февруари
 * спира да приема събития с данъчен ефект. Иначе утрешната поправка тихо
 * разминава Журнала с това, което държавата вече е получила.
 *
 * Заключването пази ТРИТЕ данъчни събития: вземане, плащане, разход — и
 * сторната им. Наем се добавя и прекратява свободно (ефектът му е в бъдещи
 * начисления); справката се сторнира свободно (сторното Е отключването).
 *
 * Единственият страничен вход е „сверената промяна" — актуализацията от
 * таблица, която сама си носи сторно + ново + следа кой файл я е донесъл.
 */

import type { Ogledalo } from '../ogledalo/ogledalo.js';
import type { Sabitie } from '../yadro/index.js';

export class GreshkaZamrazen extends Error {
  readonly period: string;

  constructor(period: string, oshte = '') {
    super(
      `Периодът ${period} е заключен от подадена ДДС-справка.${oshte} ` +
        'Поправка = сверена промяна от таблица или сторно на справката — и двете оставят следа.',
    );
    this.name = 'GreshkaZamrazen';
    this.period = period;
  }
}

/** Заключен ли е периодът — има ли жива (несторнирана) справка. */
export function eZamrazen(o: Ogledalo, period: string): boolean {
  return o.spravki.has(period);
}

/** Проверява и хвърля. `svereno` е страничният вход на актуализацията. */
export function proveriZamrazen(o: Ogledalo, period: string, svereno = false): void {
  if (!svereno && eZamrazen(o, period)) throw new GreshkaZamrazen(period);
}

/**
 * Периодът, който едно СЪБИТИЕ засяга — за да пази замразяването и сторната.
 * Празен низ = събитието няма данъчен период и не се заключва.
 */
export function periodNaSabitie(s: Sabitie): string {
  const p = s.payload as Record<string, unknown>;
  switch (s.type) {
    case 'ВземанеНачислено':
      return String(p['period'] ?? '');
    case 'ПлащанеПрието':
    case 'РазходЗаписан':
      return String(p['data'] ?? '').slice(0, 7);
    default:
      // Справката и ДДС-плащането нарочно НЕ са тук: сторното на справката
      // е отключването, а ДДС се плаща по природа след заключването.
      return '';
  }
}
