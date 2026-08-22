#!/usr/bin/env python3
"""Сглобява .dc.html артбордовете на MasterBook от общ стилов слой.

Артбордовете са самостоятелни файлове — този скрипт само пести повторение.
Ако редактираш артборд директно, пренеси промяната и тук.
"""

import pathlib

TUK = pathlib.Path(__file__).parent

SHRIFTOVE = (
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
    'family=Literata:opsz,wght@7..72,400;7..72,600&'
    'family=IBM+Plex+Sans:wght@400;500;600&'
    'family=IBM+Plex+Mono:wght@400;500&display=swap">'
)

OBSHT_CSS = r"""
    body { margin: 0; }
    a { color: #B25E38; text-decoration: none; }
    a:hover { color: #8E4526; }
    .ekran {
      --hartiya: #FBF8F3;
      --panel: #F4EFE7;
      --mastilo: #2A2521;
      --mastilo2: #6E645B;
      --liniya: #E3DACE;
      --aktsent: #B25E38;
      --zeleno: #2E7D5E;
      --toplo: #F6E7DE;
      --red: 14px;
      width: 1440px; height: 900px; display: flex;
      background: var(--hartiya); color: var(--mastilo);
      font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 14px;
      overflow: hidden;
    }
    .strana { width: 232px; flex-shrink: 0; background: var(--panel); border-right: 1px solid var(--liniya); display: flex; flex-direction: column; }
    .marka { padding: 24px 20px 20px; display: flex; flex-direction: column; gap: 2px; }
    .marka b { font-family: Literata, Georgia, serif; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
    .marka span { font-size: 11px; color: var(--mastilo2); letter-spacing: 0.08em; text-transform: uppercase; }
    .nav { display: flex; flex-direction: column; gap: 1px; padding: 4px 12px; }
    .nav a { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 4px; color: var(--mastilo); font-size: 13.5px; }
    .nav a:hover { background: #EAE2D6; color: var(--mastilo); }
    .nav a.tuk { background: var(--mastilo); color: var(--hartiya); }
    .nav a.tuk svg { stroke: var(--hartiya); }
    .nav svg { width: 17px; height: 17px; stroke: var(--mastilo2); fill: none; stroke-width: 1.6; flex-shrink: 0; }
    .navdyal { padding: 14px 22px 6px; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #A2968A; }
    .veriga { margin-top: auto; padding: 14px 20px 18px; border-top: 1px solid var(--liniya); display: flex; flex-direction: column; gap: 5px; }
    .veriga .redche { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--mastilo2); }
    .tochka { width: 7px; height: 7px; border-radius: 50%; background: var(--zeleno); flex-shrink: 0; }
    .glavno { flex-grow: 1; display: flex; flex-direction: column; min-width: 0; }
    .shapka { display: flex; align-items: flex-end; justify-content: space-between; padding: 26px 32px 18px; border-bottom: 1px solid var(--liniya); }
    .shapka h1 { font-family: Literata, Georgia, serif; font-size: 26px; font-weight: 600; margin: 0 0 3px; letter-spacing: -0.015em; }
    .shapka p { margin: 0; font-size: 13px; color: var(--mastilo2); }
    .desno-gore { display: flex; align-items: center; gap: 10px; }
    .glaven { display: flex; align-items: center; gap: 7px; background: var(--aktsent); color: #FFF9F4; border: none; border-radius: 4px; padding: 9px 16px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .glaven svg { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 1.8; }
    .vtorichen { background: transparent; border: 1px solid var(--liniya); border-radius: 4px; padding: 9px 14px; font-family: inherit; font-size: 13px; color: var(--mastilo); cursor: pointer; }
    .vtorichen:hover { background: var(--panel); }
    .telo { flex-grow: 1; padding: 22px 32px 0; display: flex; flex-direction: column; gap: 18px; min-height: 0; overflow: hidden; }
    .dyalglava { display: flex; align-items: baseline; justify-content: space-between; }
    .dyalglava h2 { font-family: Literata, Georgia, serif; font-size: 15.5px; font-weight: 600; margin: 0; }
    .dyalglava span { font-size: 12px; color: var(--mastilo2); }
    .plochki { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .plochka { background: #FFFFFF; border: 1px solid var(--liniya); border-radius: 5px; padding: 14px 16px 15px; display: flex; flex-direction: column; gap: 6px; }
    .plochka .etiket { font-size: 11.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mastilo2); }
    .plochka .chislo { font-family: Literata, Georgia, serif; font-size: 27px; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; line-height: 1.05; }
    .plochka .pod { font-size: 12px; color: var(--mastilo2); }
    .plochka.trevoga { border-color: #E0B49E; background: var(--toplo); }
    .plochka.trevoga .chislo { color: var(--aktsent); }
    .tablitsa { border: 1px solid var(--liniya); border-radius: 5px; background: #FFFFFF; overflow: hidden; }
    .tablitsa .glava, .tablitsa .red { display: grid; align-items: center; gap: 16px; padding: var(--red) 18px; }
    .tablitsa .glava { background: var(--panel); border-bottom: 1px solid var(--liniya); font-size: 11.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mastilo2); padding-top: 10px; padding-bottom: 10px; }
    .tablitsa .red { border-bottom: 1px solid #EFE8DD; }
    .tablitsa .red:last-child { border-bottom: none; }
    .tablitsa .red:hover { background: #FDFBF7; }
    .kletka { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .kletka b { font-weight: 500; font-size: 13.5px; }
    .kletka span { font-size: 12px; color: var(--mastilo2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chislo-red { font-variant-numeric: tabular-nums; font-size: 14px; font-weight: 500; text-align: right; }
    .chislo-red.duljimo { color: var(--aktsent); }
    .chislo-red.plateno { color: var(--zeleno); }
    .znachka { display: inline-flex; align-items: center; gap: 5px; border-radius: 3px; padding: 3px 8px; font-size: 11.5px; font-weight: 500; white-space: nowrap; }
    .znachka svg { width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2; }
    .znachka.dobre { background: #E6F0EA; color: var(--zeleno); }
    .znachka.trevoga { background: var(--toplo); color: var(--aktsent); }
    .znachka.tiha { background: var(--panel); color: var(--mastilo2); }
    .filtri { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .chip { border: 1px solid var(--liniya); border-radius: 999px; padding: 6px 13px; font-size: 12.5px; color: var(--mastilo2); background: transparent; font-family: inherit; cursor: pointer; }
    .chip.izbran { background: var(--mastilo); border-color: var(--mastilo); color: var(--hartiya); }
    .tarsene { flex-grow: 1; min-width: 160px; display: flex; align-items: center; gap: 8px; border: 1px solid var(--liniya); border-radius: 4px; padding: 7px 12px; background: #FFFFFF; color: #A2968A; font-size: 13px; }
    .tarsene svg { width: 15px; height: 15px; stroke: #A2968A; fill: none; stroke-width: 1.7; }
"""


def strana(aktiven: str) -> str:
    punktove = [
        ('dyal', 'Всеки ден'),
        ('Табло', '<rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect>'),
        ('Имоти', '<path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"></path><path d="M9.5 21v-6.5h5V21"></path>'),
        ('Наеми', '<path d="M4 5h16v14H4z"></path><path d="M4 9.5h16"></path><path d="M9 19V9.5"></path>'),
        ('Плащания', '<rect x="2.5" y="6" width="19" height="12" rx="1.5"></rect><path d="M2.5 10h19"></path><path d="M6 14.5h4"></path>'),
        ('dyal', 'Пари'),
        ('Счетоводство', '<path d="M5 3h14v18l-3.5-2-3.5 2-3.5-2L5 21z"></path><path d="M9 8h6"></path><path d="M9 12h6"></path>'),
        ('Разходи', '<path d="M4 19V5"></path><path d="M4 19h16"></path><path d="m8 14 3.5-4 3 2.5L20 7"></path>'),
        ('Кредити', '<path d="M12 3v18"></path><path d="M17 7.5c0-2-2.2-3-5-3s-5 .9-5 2.8 2.2 2.6 5 3.2 5 1.2 5 3.2-2.2 2.8-5 2.8-5-1-5-3"></path>'),
        ('dyal', 'Строеж'),
        ('Проекти и Гант', '<rect x="3" y="5" width="10" height="4" rx="1"></rect><rect x="7" y="11" width="12" height="4" rx="1"></rect><rect x="5" y="17" width="8" height="4" rx="1"></rect>'),
        ('Документи', '<path d="M6 3h8l5 5v13H6z"></path><path d="M14 3v5h5"></path>'),
        ('dyal', 'Истината'),
        ('Журналът', '<circle cx="7" cy="6" r="2.5"></circle><circle cx="7" cy="18" r="2.5"></circle><path d="M7 8.5v7"></path><path d="M9.5 6H20"></path><path d="M9.5 18H20"></path><path d="M13 12h7"></path>'),
    ]
    redove = []
    for ime, sadarzhanie in punktove:
        if ime == 'dyal':
            redove.append(f'      <div class="navdyal">{sadarzhanie}</div>')
        else:
            klas = ' class="tuk"' if ime == aktiven else ''
            redove.append(
                f'      <a href="#"{klas}><svg viewBox="0 0 24 24">{sadarzhanie}</svg>{ime}</a>'
            )
    nav = '\n'.join(redove)
    return f"""  <aside class="strana">
    <div class="marka">
      <b>VintexStroy</b>
      <span>MasterBook</span>
    </div>
    <nav class="nav">
{nav}
    </nav>
    <div class="veriga">
      <div class="redche"><span class="tochka"></span>Веригата е цяла</div>
      <div class="redche">12 480 събития · проверена 09:12</div>
    </div>
  </aside>"""


def zapishi(ime: str, telo: str, dop_css: str = '', script: str = '') -> None:
    css = OBSHT_CSS + dop_css
    file = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  {SHRIFTOVE}
  <style>{css}  </style>
</helmet>
{telo}
</x-dc>
{script}
</body>
</html>
"""
    (TUK / f'{ime}.dc.html').write_text(file, encoding='utf-8')
    print(f'  {ime}.dc.html')
