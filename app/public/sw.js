/**
 * ДЖОБЪТ · служебният работник, който прави приложението офлайн продукт.
 *
 * Той е онова, което липсваше на план 1 от ADR-006 („Офлайн Личен"). Журналът
 * винаги е живял в устройството; липсваше само самата страница да се отваря
 * без мрежа.
 *
 * Правилата тук са три, и всяко е взето заради Журнала:
 *
 *   1. КЕШ-ПЪРВО, без изключение. Приложението няма нито една заявка навън —
 *      всичко, което иска, е собствената му черупка. Няма какво да се пуска
 *      към мрежата „за по-свежо".
 *
 *   2. НИКАКВО АВТОМАТИЧНО ПРЕЗАРЕЖДАНЕ. Няма `skipWaiting()`. Новата версия
 *      чака всички раздели да се затворят — точно поведението, което
 *      собственикът поиска с думите „да работи локално, докато не се
 *      ъпдейтне". Страница, която се сменя под ръцете на човек, въвеждащ
 *      плащане, е по-опасна от стара страница.
 *
 *   3. СТАРИТЕ КЕШОВЕ СЕ ТРИЯТ при активиране. Два кеша значи две версии на
 *      черупката — и после въпрос коя е вярната.
 *
 *   4. АЗБУКИТЕ СЕ ПАЗЯТ ПО ПАКЕТ. Всички стоят в пакета, но джобът пази
 *      предварително само онези от избрания при сваляне регион
 *      (`?azbuki=evropa`). Останалите се теглят при нужда, ако има мрежа.
 *      Иначе телефонът би дърпал 441 KB букви, от които ползва 204.
 *
 * Списъците се ВПИСВАТ след `vite build` от `stroezh/pechat-sw.mjs`, защото
 * Vite слага хеш в имената.
 */

const VERSIYA = '__VERSIYA__';
const CHERUPKA = __CHERUPKA__;
/** пакет → неговите шрифтови файлове */
const AZBUKI = __AZBUKI__;

/** Пакетът идва от адреса, с който работникът е регистриран. */
const PAKET = new URL(self.location.href).searchParams.get('azbuki') ?? 'bg';
const KESH = `masterbook-${VERSIYA}-${PAKET}`;

self.addEventListener('install', (sabitie) => {
  const shrifty = AZBUKI[PAKET] ?? AZBUKI['bg'] ?? [];
  sabitie.waitUntil(
    caches.open(KESH).then((kesh) => kesh.addAll([...CHERUPKA, ...shrifty])),
  );
  // Нарочно БЕЗ skipWaiting() — виж правило 2 горе.
});

self.addEventListener('activate', (sabitie) => {
  sabitie.waitUntil(
    (async () => {
      for (const ime of await caches.keys()) {
        if (ime.startsWith('masterbook-') && ime !== KESH) await caches.delete(ime);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (sabitie) => {
  const iskane = sabitie.request;
  if (iskane.method !== 'GET') return;

  // ЧУЖДОТО НЕ МИНАВА ПРЕЗ ДЖОБА · нито се пази, нито се подменя.
  //
  // Джобът е за НАШИТЕ файлове. Входът с Google (скриптът, самото влизане и
  // публичните ключове за подписа) е чужд адрес: минеше ли оттук, при липса на
  // мрежа щеше да получи нашия отговор „Офлайн, и това го няма в джоба" —
  // тоест влизането щеше да пада с НАША грешка вместо с истинската причина.
  //
  // Излизането рано връща заявката на браузъра непокътната.
  if (new URL(iskane.url).origin !== self.location.origin) return;

  sabitie.respondWith(
    (async () => {
      const otKesha = await caches.match(iskane, { ignoreSearch: true });
      if (otKesha) return otKesha;

      try {
        const otvod = await fetch(iskane);
        // Дотук стигат само свои заявки (чуждото излезе горе), но проверката
        // остава: тя пази правилото, а не случая.
        if (otvod.ok && new URL(iskane.url).origin === self.location.origin) {
          const kesh = await caches.open(KESH);
          await kesh.put(iskane, otvod.clone());
        }
        return otvod;
      } catch {
        // Офлайн и няма го в кеша: за навигация връщаме черупката, за да не
        // се появи страницата на браузъра „няма мрежа" върху работещ Журнал.
        if (iskane.mode === 'navigate') {
          const cherupka = await caches.match('./index.html');
          if (cherupka) return cherupka;
        }
        throw new Error('Офлайн, и това го няма в джоба.');
      }
    })(),
  );
});
