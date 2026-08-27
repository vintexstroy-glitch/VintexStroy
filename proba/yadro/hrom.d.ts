/**
 * Типове за `stroezh/hrom.mjs` · единственият `.mjs` внесен от `.ts` тук.
 *
 * Домът на самата логика е `stroezh/hrom.mjs` (правило 17 — един факт, един
 * дом); това е само обявата на формата ѝ пред typecheck-а, не втора логика.
 */
declare module '*.mjs' {
  const chromium: import('playwright-core').BrowserType;
  function nameriHroma(): string;
  export { chromium, nameriHroma };
}
