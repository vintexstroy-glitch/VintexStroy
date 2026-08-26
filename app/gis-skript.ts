/**
 * СКРИПТЪТ НА GOOGLE · ЕДИН дом за тегленето (правило 17).
 *
 * Две места го искат — входът (самоличност) и Драйвът (пренасяне) — и това е
 * ЕДНО и също теглене на ЕДИН и същ адрес. Написано два пъти, то беше две
 * места, на които може да се разминат: обходът за чистота го хвана като
 * дублирано още в деня, в който вторият се появи.
 *
 * ПРАВИЛО 10 НЕ ПАДА. Скриптът не се пакетира, не влиза в джоба и не се тегли
 * при тръгване — само когато човек натисне бутон. Офлайн изданието не носи
 * нито един от трите файла, които го викат.
 */

const ADRES = 'https://accounts.google.com/gsi/client';

/**
 * Тегли скрипта · само веднъж, и чака ГОТОВНОСТТА, не самото събитие.
 *
 * `gotov` е предикат, а не флаг: същият скрипт носи две различни части
 * (`accounts.id` за входа, `accounts.oauth2` за Драйва) и втората може да се
 * появи, докато първата вече я има. Чакане по „заредил ли се е файлът" би
 * увиснало завинаги при втория викащ — файлът е зареден отдавна и „load" няма
 * да се обади пак.
 */
export async function osiguriSkriptaNaGoogle(
  gotov: () => boolean,
  nyamaObhvat: (tekst: string) => Error,
): Promise<void> {
  if (gotov()) return;
  await new Promise<void>((dobre, zle) => {
    const veche = document.querySelector<HTMLScriptElement>(`script[src="${ADRES}"]`);
    if (veche && gotov()) {
      dobre();
      return;
    }
    const skript = veche ?? document.createElement('script');
    skript.addEventListener('load', () => dobre());
    skript.addEventListener('error', () =>
      zle(
        nyamaObhvat(
          'Google не се обажда — няма обхват или мрежата го спира. ' +
            'Това пипа само онова, което иска мрежа; всичко останало работи и без нея.',
        ),
      ),
    );
    if (!veche) {
      skript.src = ADRES;
      skript.async = true;
      document.head.append(skript);
    }
  });
  if (!gotov()) {
    throw nyamaObhvat('Скриптът на Google се зареди, но не предлага онова, което трябва.');
  }
}
