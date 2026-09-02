/**
 * ЛЕПНЕНЕТО ПАДА · НАВСЯКЪДЕ (И127 т.2 · резен 91 · ADR-148).
 *
 * Негова дума, 01.09: „Хедъра който се лепи от различните таблици ГО ИМА НА
 * МЕСТА. Махни го НАВСЯКЪДЕ."
 *
 * ═══ ЗАЩО МАШИНА, А НЕ ДИСЦИПЛИНА ═══
 *
 * Точно това вече е падало веднъж: ADR-133 (резен 76) свали `position: sticky`
 * от главата на таблицата — и остави ДВЕ места, всяко със свой довод. „На
 * места" е неговата дума за резултата от такива доводи. Затова прагът тук е
 * НУЛА и се брои от САМИЯ ЛИСТ: правило, което разчита някой да не върне един
 * ред, е дисциплина; редът, който се брои, е машина (ADR-056).
 *
 * Проходът мери ДРУГОТО — какво браузърът наистина смята на живо (§121).
 * Двете заедно ловят и двата пътя: върнат ред в листа и лепнене, дошло
 * отнякъде другаде.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const LISTAT = readFileSync('app/stil.css', 'utf8');

/** Всяко обявяване на `position: sticky`, с реда си · за да се КАЖЕ къде е. */
function lepnatite(): readonly string[] {
  return LISTAT.split('\n')
    .map((red, i) => ({ red: red.trim(), nomer: i + 1 }))
    .filter(({ red }) => /position\s*:\s*sticky/.test(red) && !red.startsWith('/*'))
    .map(({ red, nomer }) => `stil.css:${nomer} · ${red}`);
}

describe('нищо не лепне · праг НУЛА', () => {
  it('нито един ред в листа не обявява position: sticky', () => {
    const namereni = lepnatite();
    expect(namereni, `лепнати: ${namereni.join(' | ')}`).toEqual([]);
  });

  it('и мярката НЕ е сляпа · тя намира лепнене, когато има такова', () => {
    // Тавтологията се лови тук: проверка, която не може да падне, минава за
    // проверка. Същият израз върху съчинен лист трябва да даде находка.
    const izmislen = '.nesto {\n  position: sticky; top: 0;\n}\n';
    const kato = izmislen
      .split('\n')
      .filter((r) => /position\s*:\s*sticky/.test(r.trim()));
    expect(kato.length).toBe(1);
  });
});
