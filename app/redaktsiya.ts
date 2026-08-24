/**
 * РЕДАКЦИЯТА В КЛЕТКАТА · вълна 3, стъпка 1 (предложение 11).
 *
 * Най-осезаемата разлика с Excel досега: погледът скачаше ред → форма → ред.
 * Сега двоен клик или F2 отваря поле НА МЯСТОТО на клетката; Enter записва,
 * Escape отказва. Записът НЕ е нов път: минава през СЪЩИТЕ поправки през
 * Вратата, които формите ползват („НаемПоправен", „ИмотПоправен") — сторно
 * + ново, със следа, никакъв презапис (правило 1).
 *
 * КОЯ клетка се отваря, се ОБЯВЯВА, не се гадае (правило 20): клетката носи
 * `data-redakt` с името на редактора си и `data-surovo` със стойността от
 * модела. Редактируеми са само ОТВОРЕНИТЕ еднозначни колони — днес: наемът
 * на реда и площта на имота. Затворена колона (сметка, изведена стойност)
 * изобщо няма белег — правило 23 по конструкция. Клетка с няколко полета
 * (име + телефон + имейл) остава на формата — там ѝ е мястото.
 *
 * ЗАПИСВА ЧОВЕКЪТ, ЯВНО: единствено Enter пише. Клик другаде, Escape,
 * смяна на екрана — отказ. Blur-запис „като в Excel" би значел случаен клик
 * да пише в Журнала — това не се строи нарочно.
 *
 * Причината се пише сама и носи следата: „поправено от таблицата:
 * 500,00 € → 567,89 €" — в историята на реда се чете какво и откъде.
 */

import { otSuma, pishi, pishiVPole } from '../src/yadro/pari.js';
import { kvSmVM2, ploshtVKvSm } from '../src/kalkulator/chetene.js';
import { aktivnataKletka, fokusVPole } from './klaviatura.js';
import { dumiZaGreshka } from './imoti.js';
import type { Konteks } from './main.js';

/** Причината, която влиза в Журнала — чиста, за да има тест. */
export function prichinaZaRedaktsiya(bilo: string, stava: string): string {
  return `поправено от таблицата: ${bilo} → ${stava}`;
}

interface Redaktor {
  /** стойността от модела → текст за писане в полето */
  readonly kamTekst: (surovo: number) => string;
  /** текстът от полето → стойност за модела · отказва С ДУМИ */
  readonly otTekst: (tekst: string) => number;
  /** стойността, изречена за човек — за причината и вестта */
  readonly sDumi: (surovo: number) => string;
  /** записът · през СЪЩАТА поправка, която формата вика */
  readonly zapis: (k: Konteks, id: string, novo: number, prichina: string) => Promise<void>;
}

const REDAKTORI: Record<string, Redaktor> = {
  'naem-suma': {
    kamTekst: pishiVPole,
    otTekst: otSuma,
    sDumi: pishi,
    async zapis(k, id, novo, prichina) {
      const naem = (await k.deystviya.ogledalo()).naemi.get(id);
      if (!naem) throw new Error('Наемът вече не е в Огледалото — презареди екрана.');
      await k.deystviya.popraviNaem(
        {
          naemId: id,
          naemetel: naem.naemetel,
          telefon: naem.telefon,
          imeyl: naem.imeyl,
          naem_st: novo,
          padezhDen: naem.padezhDen,
          ot: naem.ot,
          do: naem.do,
          depozit_st: naem.depozit_st,
          sektor: naem.sektor,
          prichina,
        },
        { opId: `redaktsiya:${crypto.randomUUID()}` },
      );
    },
  },
  'imot-ploshtad': {
    kamTekst: (surovo) => (surovo > 0 ? kvSmVM2(surovo) : ''),
    // празното е „няма площ", не грешка — както във формата
    otTekst: (tekst) => (tekst.trim() === '' ? 0 : ploshtVKvSm(tekst)),
    sDumi: (surovo) => (surovo > 0 ? `${kvSmVM2(surovo)} м²` : 'без площ'),
    async zapis(k, id, novo, prichina) {
      const imot = (await k.deystviya.ogledalo()).imoti.get(id);
      if (!imot) throw new Error('Имотът вече не е в Огледалото — презареди екрана.');
      await k.deystviya.popraviImot(
        {
          imotId: id,
          adres: imot.adres,
          edinitsa: imot.edinitsa,
          ploshtad_kvsm: novo,
          prichina,
        },
        { opId: `redaktsiya:${crypto.randomUUID()}` },
      );
    },
  },
};

/** За тестовете · четенето и писането на всеки редактор поотделно. */
export function redaktorZa(klyuch: string): Pick<Redaktor, 'kamTekst' | 'otTekst' | 'sDumi'> | null {
  return REDAKTORI[klyuch] ?? null;
}

let konteks: Konteks | null = null;
let prerisuvayEkrana: (() => Promise<void>) | null = null;
let zakacheno = false;

export function zakachiRedaktsiya(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  konteks = k;
  prerisuvayEkrana = prerisuvay;
  if (zakacheno) return;
  zakacheno = true;

  // Двойният клик — на мишката; F2 — на клавиатурната карта: и двата отварят
  // САМО клетка, която сама е обявила, че е редактируема.
  koren.addEventListener('dblclick', (e) => {
    const kletka = (e.target as HTMLElement).closest<HTMLElement>('[data-redakt]');
    if (kletka) otvori(kletka);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'F2' || fokusVPole()) return;
    const kletka = aktivnataKletka();
    if (kletka?.dataset['redakt']) {
      e.preventDefault();
      otvori(kletka);
    }
  });
}

function otvori(kletka: HTMLElement): void {
  if (!konteks || !prerisuvayEkrana || kletka.querySelector('input')) return;
  const beleg = kletka.dataset['redakt']!;
  const tochka = beleg.indexOf('·');
  const redaktor = REDAKTORI[beleg.slice(0, tochka)];
  const id = beleg.slice(tochka + 1);
  const surovo = Number(kletka.dataset['surovo']);
  if (!redaktor || !Number.isFinite(surovo)) return;
  const k = konteks;
  const prerisuvay = prerisuvayEkrana;

  const staroto = [...kletka.childNodes];
  const pole = document.createElement('input');
  pole.className = 'kletka-redaktor';
  pole.setAttribute('translate', 'no');
  pole.value = redaktor.kamTekst(surovo);
  kletka.replaceChildren(pole);
  pole.focus();
  pole.select(); // цялата стойност — писането направо я заменя, като в Excel

  let zatvoreno = false;
  const otkazhi = () => {
    if (zatvoreno) return;
    zatvoreno = true;
    kletka.replaceChildren(...staroto);
  };

  // клик другаде = отказ · записва човекът, с Enter — не случайният поглед
  pole.addEventListener('blur', otkazhi);
  pole.addEventListener('keydown', async (e) => {
    e.stopPropagation(); // Escape затваря РЕДАКТОРА — не менюта и селекции
    if (e.key === 'Escape') {
      otkazhi();
      return;
    }
    if (e.key !== 'Enter') return;
    let novo: number;
    try {
      novo = redaktor.otTekst(pole.value);
    } catch (greshka) {
      // отказът е с думи и полето ОСТАВА отворено — човекът поправя, не гадае
      pole.classList.add('zle');
      pole.title = dumiZaGreshka(greshka);
      return;
    }
    if (novo === surovo) {
      // нищо не се е сменило — нищо не влиза в Журнала (правило 20)
      otkazhi();
      return;
    }
    zatvoreno = true; // прерисуването след записа не бива да „отказва"
    try {
      await redaktor.zapis(
        k,
        id,
        novo,
        prichinaZaRedaktsiya(redaktor.sDumi(surovo), redaktor.sDumi(novo)),
      );
      k.vest(
        'dobre',
        `Поправено: ${redaktor.sDumi(surovo)} → ${redaktor.sDumi(novo)}. Старото остава в Журнала.`,
      );
    } catch (greshka) {
      k.vest('zle', dumiZaGreshka(greshka));
    }
    await prerisuvay();
  });
}
