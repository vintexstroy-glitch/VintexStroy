/**
 * Рисува иконите на приложението от `ikona.svg`.
 *
 * Пуска се РЪЧНО и рядко — резултатът се коммитва. Растеризира с Chromium-а,
 * който вече стои заради прохода, за да не влиза нова зависимост само за
 * да превърне един SVG в два PNG (правило 10).
 *
 *   node stroezh/risuvai-ikoni.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const HROM = process.env['HROM'] ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const svg = readFileSync(new URL('./ikona.svg', import.meta.url), 'utf8');

const brauzar = await chromium.launch({ executablePath: HROM });
for (const r of [192, 512]) {
  const stranitsa = await brauzar.newPage({ viewport: { width: r, height: r } });
  await stranitsa.setContent(
    `<style>html,body{margin:0;padding:0}svg{display:block;width:${r}px;height:${r}px}</style>${svg}`,
  );
  const kade = new URL(`../app/public/ikoni/ikona-${r}.png`, import.meta.url);
  writeFileSync(kade, await stranitsa.screenshot({ omitBackground: true }));
  console.log(`  ikona-${r}.png`);
  await stranitsa.close();
}
await brauzar.close();
