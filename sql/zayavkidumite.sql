-- ═══════════════════════════════════════════════════════════════════
-- ЗАЯВКИ КЪМ ДУМИТЕ · база dumite.db · диалект: SQLite
-- Таблици: izrecheniya (4050 · зърно = изречение) · sobshteniya (2298 · зърно = цяло съобщение)
-- ═══════════════════════════════════════════════════════════════════

-- ── 1 · ЛАЙТМОТИВИТЕ · какво повтаряш най-много ────────────────────
-- Отговаря на: „кои са нещата, които съм казвал отново и отново"
WITH povtoreni AS (
  SELECT izrechenie, modul, tema, povtoreno,
         MIN(data) AS parvi_pat, MAX(data) AS posleden_pat
  FROM izrecheniya
  WHERE povtoreno > 1
    AND sustoyanie = 'уникално'          -- без празни/дубли/код
    AND dulzhina BETWEEN 20 AND 300      -- смислени изречения, не откъслеци
  GROUP BY izrechenie, modul, tema, povtoreno
)
SELECT povtoreno, modul, tema, parvi_pat, posleden_pat, izrechenie
FROM povtoreni
ORDER BY povtoreno DESC, izrechenie
LIMIT 25;

-- ── 2 · ТЕМА ПО ВРЕМЕ · кога какво е било на дневен ред ────────────
-- Дял на всеки модул по седмица (само същинските теми)
WITH sedmici AS (
  SELECT modul, tema,
         strftime('%Y-W%W', data) AS sedmica,
         COUNT(*) AS broi
  FROM izrecheniya
  WHERE modul NOT IN ('M00','M20','M21','ПРАЗНО')
  GROUP BY modul, tema, sedmica
),
obshto AS (
  SELECT sedmica, SUM(broi) AS vsichko FROM sedmici GROUP BY sedmica
)
SELECT s.sedmica, s.modul, s.tema, s.broi,
       ROUND(100.0 * s.broi / o.vsichko, 1) AS dyal_procent
FROM sedmici s
JOIN obshto o ON o.sedmica = s.sedmica
WHERE s.broi >= 5
ORDER BY s.sedmica, s.broi DESC;

-- ── 3 · КАЧЕСТВО НА РАЗПОЗНАВАНЕТО · къде да се погледне на ръка ───
-- Кои модули стъпват най-много на наследяване (значи най-несигурни)
SELECT modul, tema,
       COUNT(*) AS vsichko,
       SUM(CASE WHEN kak_opredelena = 'пряко разпознаване'      THEN 1 ELSE 0 END) AS pryako,
       SUM(CASE WHEN kak_opredelena = 'обогатен речник'         THEN 1 ELSE 0 END) AS obogaten,
       SUM(CASE WHEN kak_opredelena = 'наследена от разговора'  THEN 1 ELSE 0 END) AS nasledena,
       ROUND(100.0 * SUM(CASE WHEN kak_opredelena = 'наследена от разговора' THEN 1 ELSE 0 END)
             / COUNT(*), 1) AS dyal_nasledeni
FROM izrecheniya
WHERE modul NOT IN ('ПРАЗНО')
GROUP BY modul, tema
HAVING COUNT(*) >= 20
ORDER BY dyal_nasledeni DESC;

-- ── 4 · НАЙ-ГЪСТИТЕ РАЗГОВОРИ · откъде идва най-много същина ───────
-- Разговори, дали най-много същински (нетематични изключени) изречения
WITH po_razgovor AS (
  SELECT razgovor,
         COUNT(*) AS izrecheniya_obshto,
         SUM(CASE WHEN modul NOT IN ('M00','M20','M21','ПРАЗНО') THEN 1 ELSE 0 END) AS sushtinski,
         MIN(data) AS ot, MAX(data) AS do
  FROM izrecheniya
  WHERE razgovor IS NOT NULL
  GROUP BY razgovor
)
SELECT razgovor, ot, do, izrecheniya_obshto, sushtinski,
       ROUND(100.0 * sushtinski / izrecheniya_obshto, 1) AS dyal_sushtina
FROM po_razgovor
WHERE sushtinski > 0
ORDER BY sushtinski DESC
LIMIT 20;

-- ── 5 · ДЪЛГИТЕ ИЗЛОЖЕНИЯ · където си обяснявал най-подробно ───────
-- Цели съобщения (не изречения) — оттам се вадят решенията
SELECT razgovor, data, dulzhina,
       SUBSTR(REPLACE(REPLACE(tekst, CHAR(10), ' '), CHAR(13), ' '), 1, 160) AS nachalo
FROM sobshteniya
WHERE dubul = 0
  AND iztochnik = 'разговор'
  AND dulzhina >= 800
ORDER BY dulzhina DESC
LIMIT 20;

-- ── 6 · СВЕРКА · нищо ли не се губи между двете зърна ──────────────
-- Всяко съобщение трябва да има поне едно изречение в izrecheniya
SELECT COUNT(*) AS sobshteniya_bez_izrechenie
FROM sobshteniya s
WHERE NOT EXISTS (
  SELECT 1 FROM izrecheniya i
  WHERE i.dostovernost = s.dostovernost AND i.data = s.data
);
-- очакван резултат: 0

-- ── 7 · ТЪРСЕНЕ ПО ДУМА · всичко казано по дадена тема ─────────────
-- Смени ':duma' с каквото търсиш (напр. 'гант', 'ддс', 'наем')
SELECT data, modul, tema, dostovernost, izrechenie
FROM izrecheniya
WHERE LOWER(izrechenie) LIKE '%' || LOWER(:duma) || '%'
  AND sustoyanie = 'уникално'
ORDER BY data, razgovor;
