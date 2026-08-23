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
 * Списъкът с файлове се ВПИСВА след `vite build` от `stroezh/pechat-sw.mjs`,
 * защото Vite слага хеш в имената. Долният е за `npm run dev`.
 */

const VERSIYA = '__VERSIYA__';
const KESH = `masterbook-${VERSIYA}`;
const CHERUPKA = __CHERUPKA__;

self.addEventListener('install', (sabitie) => {
  sabitie.waitUntil(caches.open(KESH).then((kesh) => kesh.addAll(CHERUPKA)));
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

  sabitie.respondWith(
    (async () => {
      const otKesha = await caches.match(iskane, { ignoreSearch: true });
      if (otKesha) return otKesha;

      try {
        const otvod = await fetch(iskane);
        // Пази само своето; чуждо няма, но правилото стои и без него.
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
