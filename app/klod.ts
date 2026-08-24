/**
 * СВЪРЗВАНЕТО С КЛОД · бутонът, който пуска агента (И94 т.1).
 *
 * Негови думи: „Да се направи пускането с бутона на изкуствен интелект с
 * КЛод и поискване на потвърждение с имейл."
 *
 * ЗАЩО ЧИСТ `fetch`, А НЕ SDK-ът НА ANTHROPIC. Правило 10 пази ГОТОВИЯ
 * ПАКЕТ: нула зависимости. Официалният SDK е зависимост и щеше да влезе в
 * него; освен това в браузър той иска изричното `dangerouslyAllowBrowser`,
 * тоест същия компромис, само че скрит зад библиотека. Затова тук стои
 * едно извикване по HTTP — толкова, колкото Google-вход прави с жетона
 * (ADR-021). Този файл Е свързващата част: **офлайн изданието го няма.**
 *
 * ЧЕСТНО ЗА КЛЮЧА. Ключ за API в браузър се вижда от всеки, който отвори
 * инструментите на разработчика на това устройство. Затова:
 *   · ключът живее МЕСТНО (`localStorage`), никога в Журнала — тайна в
 *     дневник само за добавяне е тайна, изгубена завинаги;
 *   · екранът го КАЗВА, преди да го поиска — не го крие зад „сигурно е";
 *   · без ключ бутонът обяснява, вместо да мълчи.
 *
 * АГЕНТЪТ ПАК НЕ ПИШЕ. Отговорът на Клод става ПРЕДЛОЖЕНИЕ, което чака
 * човешка присъда (правило 18). Тук няма нито един път към Вратата.
 */

import { sglobiProtokol, type Agent } from '../src/domein/agenti.js';

/** Къде живее ключът · само на това устройство. */
const KLYUCH_V_HRANILISHTETO = 'masterbook:klod-klyuch';

const ADRES = 'https://api.anthropic.com/v1/messages';

/**
 * МОДЕЛЪТ · най-способният, защото това са сметки пред собственика.
 *
 * Числата, които агентът предлага, минават през човек — но човек, който
 * гледа предложение, вярва на сметката повече, отколкото на текст. Затова
 * тук не се пести.
 */
const MODEL = 'claude-opus-5';

/** Версията на API-то · закована, за да не се мени поведението тихо. */
const VERSIYA = '2023-06-01';

export class GreshkaKlod extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaKlod';
  }
}

export function imaKlyuch(): boolean {
  try {
    return (localStorage.getItem(KLYUCH_V_HRANILISHTETO) ?? '') !== '';
  } catch {
    return false;
  }
}

export function zapishiKlyuch(klyuch: string): void {
  try {
    localStorage.setItem(KLYUCH_V_HRANILISHTETO, klyuch.trim());
  } catch {
    throw new GreshkaKlod('Хранилището на браузъра не приема запис — частен прозорец?');
  }
}

export function zabraviKlyucha(): void {
  try {
    localStorage.removeItem(KLYUCH_V_HRANILISHTETO);
  } catch {
    /* няма какво да се маха */
  }
}

/** Последните четири знака · за да се познае кой ключ стои, без да се показва. */
export function opashkataNaKlyucha(): string {
  try {
    const k = localStorage.getItem(KLYUCH_V_HRANILISHTETO) ?? '';
    return k === '' ? '' : `…${k.slice(-4)}`;
  } catch {
    return '';
  }
}

export interface OtgovorNaKlod {
  /** какво предлага, с думи */
  readonly kakvo: string;
  /** колко му е струвало · за да се вижда цената, не да се гадае */
  readonly vhodni: number;
  readonly izhodni: number;
}

/**
 * ПУСКА агента с Клод и връща ПРЕДЛОЖЕНИЕТО му.
 *
 * Промптът се СГЛОБЯВА от протокола (`sglobiProtokol`) — един дом
 * (правило 17). Данните, които агентът чете, се подават отвън: този файл
 * не чете Огледалото сам, за да няма втори път към данните покрай обхвата.
 */
export async function pusniSKlod(n: {
  readonly agent: Agent;
  readonly zadacha: string;
  /** данните, които обхватът му позволява — сглобени от викащия */
  readonly danni: string;
}): Promise<OtgovorNaKlod> {
  const klyuch = (() => {
    try {
      return localStorage.getItem(KLYUCH_V_HRANILISHTETO) ?? '';
    } catch {
      return '';
    }
  })();
  if (klyuch === '') {
    throw new GreshkaKlod('Няма ключ за Клод. Сложи го в полето горе — той остава само тук.');
  }

  let otgovor: Response;
  try {
    otgovor = await fetch(ADRES, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': klyuch,
        'anthropic-version': VERSIYA,
        // Без този ред браузърът получава отказ от самото API. Той не
        // прави нищо по-безопасно — само казва „знам, че ключът е тук".
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: sglobiProtokol(n.agent),
        messages: [
          {
            role: 'user',
            content: [
              `ЗАДАЧА: ${n.zadacha}`,
              '',
              'ДАННИТЕ, които виждаш (нищо друго няма):',
              n.danni,
              '',
              'Отговори КРАТКО и на български: какво предлагаш и защо. Числата',
              'са в евро. Ти не записваш нищо — човекът решава.',
            ].join('\n'),
          },
        ],
      }),
    });
  } catch (err) {
    throw new GreshkaKlod(
      `Клод не се вика: ${err instanceof Error ? err.message : String(err)}. ` +
        'Без обхват това не работи — свързващата част иска мрежа.',
    );
  }

  if (!otgovor.ok) {
    const tyalo = await otgovor.text().catch(() => '');
    throw new GreshkaKlod(
      otgovor.status === 401
        ? 'Ключът не се приема (401). Провери го и го запиши наново.'
        : otgovor.status === 429
          ? 'Клод е зает (429). Опитай след малко.'
          : `Клод отказа (${otgovor.status}). ${tyalo.slice(0, 200)}`,
    );
  }

  const danni = (await otgovor.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
    stop_reason?: string;
  };

  // Отказът по безопасност е ЧЕСТЕН отговор, не грешка на мрежата — казва се.
  if (danni.stop_reason === 'refusal') {
    throw new GreshkaKlod('Клод отказа тази задача по свои правила. Предложение няма.');
  }

  const kakvo = (danni.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();

  if (kakvo === '') throw new GreshkaKlod('Клод върна празен отговор — няма какво да се предложи.');

  return {
    kakvo,
    vhodni: danni.usage?.input_tokens ?? 0,
    izhodni: danni.usage?.output_tokens ?? 0,
  };
}
