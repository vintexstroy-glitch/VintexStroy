/**
 * СТЕНАТА · CSP-то и адресите, до които приложението наистина посяга.
 *
 * Одитът на И101 т.4 намери дупка, която НИКОЙ тест не можеше да хване:
 * `app/klod.ts` праща `fetch` към `api.anthropic.com`, а `connect-src` не го
 * изброяваше. Бутонът „Пусни с Клод" беше построен, минаваше всички тестове
 * (те не викат мрежа) и НЕ работеше в истински браузър.
 *
 * Затова тук се сверяват ДВЕ страни една срещу друга: какво иска кодът и какво
 * пуска стената. Разминаването е находка, не мнение.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const HTML = readFileSync('app/index.html', 'utf8');

function csp(): string {
  const m = HTML.match(/Content-Security-Policy" content="([^"]+)"/);
  expect(m, 'CSP-то трябва да съществува').toBeTruthy();
  return m![1]!.replace(/\s+/g, ' ');
}

function pravilo(ime: string): string {
  const m = csp().match(new RegExp(`${ime} ([^;]+)`));
  return m ? m[1]!.trim() : '';
}

/** Всеки външен адрес, до който КОДЪТ посяга · по хост. */
function hostoveVKoda(): string[] {
  const hostove = new Set<string>();
  // И `src`, не само `app`: публичните ключове за подписа се теглят от ЯДРОТО
  // (`zheton.ts`), а стената важи за целия документ, не за една папка.
  const papki: string[] = ['app', 'src', 'src/yadro', 'src/domein', 'src/nositel', 'src/iztochnik'];
  for (const papka of papki) {
    for (const f of readdirSync(papka).filter((x) => x.endsWith('.ts'))) {
      const tekst = readFileSync(`${papka}/${f}`, 'utf8');
      for (const m of tekst.matchAll(/https:\/\/([a-z0-9.-]+)/gi)) hostove.add(m[1]!.toLowerCase());
    }
  }
  return [...hostove].sort();
}

describe('стената · какво НЕ пуска', () => {
  it('няма звезда и няма голо „https:" · отворена изобщо значи свалена', () => {
    expect(csp()).not.toContain('*;');
    expect(csp()).not.toMatch(/https:(?![/])/);
  });

  it('основата е СВОЯ · всичко останало се изброява поименно', () => {
    expect(pravilo('default-src')).toBe("'self'");
    expect(pravilo('object-src')).toBe("'none'");
    expect(pravilo('base-uri')).toBe("'none'");
    expect(pravilo('form-action')).toBe("'none'");
  });

  it('нито едно „unsafe" · нито за скрипт, нито за стил', () => {
    expect(csp()).not.toContain('unsafe-inline');
    expect(csp()).not.toContain('unsafe-eval');
  });
});

describe('стената срещу кода · сверка вход↔изход', () => {
  /**
   * НАЙ-ВАЖНАТА проверка тук. Кодът иска адрес → стената трябва да го пуска.
   * Обратното — стена, която спира собствения ти изход — изглежда като
   * работеща защита и мълчи, докато някой не натисне бутона в истински
   * браузър.
   */
  it('всеки адрес, до който кодът посяга, е ПУСНАТ', () => {
    const pusnati = `${pravilo('connect-src')} ${pravilo('script-src')} ${pravilo('img-src')} ${pravilo('frame-src')}`;
    const nepusnati = hostoveVKoda().filter((h) => !pusnati.includes(h));
    expect(nepusnati).toEqual([]);
  });

  it('и обратното · стената не пуска адрес, който никой не ползва', () => {
    // Излишно отворен адрес е дупка без нужда. Изключение прави само
    // googleusercontent (снимката на профила идва от доставчика, не от нас).
    const IZKLYUCHENIYA = new Set(['lh3.googleusercontent.com']);
    const vKoda = new Set(hostoveVKoda());
    const vStenata = [...csp().matchAll(/https:\/\/([a-z0-9.*-]+)/gi)].map((m) => m[1]!.toLowerCase());
    const izlishni = [...new Set(vStenata)].filter((h) => !vKoda.has(h) && !IZKLYUCHENIYA.has(h));
    expect(izlishni).toEqual([]);
  });

  it('api.anthropic.com е там ПОИМЕННО · находката от И101 т.4', () => {
    expect(pravilo('connect-src')).toContain('https://api.anthropic.com');
  });
});
