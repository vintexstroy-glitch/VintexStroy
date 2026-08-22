#!/usr/bin/env python3
"""Пише артбордовете на MasterBook. Данните са ИЗМИСЛЕНИ мостри."""

from build import strana, zapishi

print('Артборди:')

# ─────────────────────────────────────────────────────── ИМОТИ ──────────────
zapishi(
    'Imoti',
    f"""<div class="ekran">
{strana('Имоти')}
  <main class="glavno">
    <header class="shapka">
      <div>
        <h1>Имоти</h1>
        <p>3 портфейла · 8 имота · 13 единици · 11 заети</p>
      </div>
      <div class="desno-gore">
        <button type="button" class="vtorichen">Внеси от таблица</button>
        <button type="button" class="glaven">
          <svg viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
          Нов имот
        </button>
      </div>
    </header>
    <div class="telo">
      <div class="plochki">
        <div class="plochka"><span class="etiket">Единици</span><span class="chislo">13</span><span class="pod">в 8 имота</span></div>
        <div class="plochka"><span class="etiket">Заетост</span><span class="chislo">85%</span><span class="pod">11 заети · 2 свободни</span></div>
        <div class="plochka"><span class="etiket">Месечен наем</span><span class="chislo">21 640,00</span><span class="pod">начислено · лв.</span></div>
        <div class="plochka trevoga"><span class="etiket">Договори до 60 дни</span><span class="chislo">2</span><span class="pod">искат решение</span></div>
      </div>

      <div class="filtri">
        <span class="tarsene"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg>Търси имот, единица или наемател</span>
        <button type="button" class="chip izbran">Всички</button>
        <button type="button" class="chip">Заети</button>
        <button type="button" class="chip">Свободни</button>
        <button type="button" class="chip">Продажби</button>
        <button type="button" class="chip">Ипотекирани</button>
      </div>

      <div class="tablitsa">
        <div class="glava" style="grid-template-columns: minmax(0,2.4fr) 96px minmax(0,1.6fr) 118px 132px 104px">
          <span>Имот и единица</span><span>Площ</span><span>Наемател</span><span class="chislo-red">Наем / мес.</span><span>Договор до</span><span>Състояние</span>
        </div>
        <div class="red" style="grid-template-columns: minmax(0,2.4fr) 96px minmax(0,1.6fr) 118px 132px 104px">
          <span class="kletka"><b>Лозенец · ул. Кръстьо Сарафов</b><span>ап. 3 · ет. 2 · двустаен</span></span>
          <span class="kletka"><span>72,4 м²</span></span>
          <span class="kletka"><b>Стройпласт ЕООД</b><span>от 01.03.2024</span></span>
          <span class="chislo-red">1 150,00</span>
          <span class="kletka"><span>28.02.2027</span></span>
          <span><span class="znachka trevoga">просрочен</span></span>
        </div>
        <div class="red" style="grid-template-columns: minmax(0,2.4fr) 96px minmax(0,1.6fr) 118px 132px 104px">
          <span class="kletka"><b>Лозенец · ул. Кръстьо Сарафов</b><span>ап. 4 · ет. 2 · тристаен</span></span>
          <span class="kletka"><span>96,0 м²</span></span>
          <span class="kletka"><b>Мария Т.</b><span>от 15.09.2025</span></span>
          <span class="chislo-red">1 480,00</span>
          <span class="kletka"><span>14.09.2026</span></span>
          <span><span class="znachka dobre">платен</span></span>
        </div>
        <div class="red" style="grid-template-columns: minmax(0,2.4fr) 96px minmax(0,1.6fr) 118px 132px 104px">
          <span class="kletka"><b>Оборище · ул. Черковна</b><span>магазин · партер</span></span>
          <span class="kletka"><span>58,2 м²</span></span>
          <span class="kletka"><b>Кафе Ъгъла ЕООД</b><span>от 01.10.2023</span></span>
          <span class="chislo-red">2 300,00</span>
          <span class="kletka"><span>12.09.2026 · след 21 дни</span></span>
          <span><span class="znachka trevoga">изтича</span></span>
        </div>
        <div class="red" style="grid-template-columns: minmax(0,2.4fr) 96px minmax(0,1.6fr) 118px 132px 104px">
          <span class="kletka"><b>Младост 4 · бл. 405</b><span>ателие · таван</span></span>
          <span class="kletka"><span>34,8 м²</span></span>
          <span class="kletka"><b>—</b><span>свободно от 01.08</span></span>
          <span class="chislo-red">640,00</span>
          <span class="kletka"><span>—</span></span>
          <span><span class="znachka tiha">свободно</span></span>
        </div>
        <div class="red" style="grid-template-columns: minmax(0,2.4fr) 96px minmax(0,1.6fr) 118px 132px 104px">
          <span class="kletka"><b>Младост 4 · бл. 405</b><span>гараж 12</span></span>
          <span class="kletka"><span>18,0 м²</span></span>
          <span class="kletka"><b>Мария Т.</b><span>от 15.09.2025</span></span>
          <span class="chislo-red">180,00</span>
          <span class="kletka"><span>14.09.2026</span></span>
          <span><span class="znachka dobre">платен</span></span>
        </div>
        <div class="red" style="grid-template-columns: minmax(0,2.4fr) 96px minmax(0,1.6fr) 118px 132px 104px">
          <span class="kletka"><b>Лозенец · нов корпус</b><span>3 единици · в строеж</span></span>
          <span class="kletka"><span>241,0 м²</span></span>
          <span class="kletka"><b>—</b><span>Акт 16 предстои</span></span>
          <span class="chislo-red">—</span>
          <span class="kletka"><span>—</span></span>
          <span><span class="znachka tiha">строеж</span></span>
        </div>
      </div>
    </div>
  </main>
</div>""",
)

# ──────────────────────────────────────────────────────── НАЕМ ──────────────
zapishi(
    'Naem',
    f"""<div class="ekran">
{strana('Наеми')}
  <main class="glavno">
    <header class="shapka">
      <div>
        <h1>Лозенец · ап. 3</h1>
        <p>Стройпласт ЕООД · договор от 01.03.2024 до 28.02.2027 · 1 150,00 лв. / мес.</p>
      </div>
      <div class="desno-gore">
        <button type="button" class="vtorichen">Сторно</button>
        <button type="button" class="vtorichen">Виж в Журнала</button>
        <button type="button" class="glaven">
          <svg viewBox="0 0 24 24"><path d="m4 12.5 5 5L20 6.5"></path></svg>
          Приеми плащане
        </button>
      </div>
    </header>
    <div class="telo">
      <div class="plochki">
        <div class="plochka trevoga"><span class="etiket">Дължимо сега</span><span class="chislo">1 150,00</span><span class="pod">просрочено 6 дни</span></div>
        <div class="plochka"><span class="etiket">Депозит</span><span class="chislo">1 150,00</span><span class="pod">държан от 01.03.2024</span></div>
        <div class="plochka"><span class="etiket">Платено 2026</span><span class="chislo">9 200,00</span><span class="pod">8 от 8 вноски</span></div>
        <div class="plochka"><span class="etiket">Средно закъснение</span><span class="chislo">4 дни</span><span class="pod">за последните 12 месеца</span></div>
      </div>

      <div class="dvekoloni">
        <section class="poddyal">
          <div class="dyalglava"><h2>Вземания и погасяване</h2><span>всяко плащане сочи своето вземане</span></div>
          <div class="tablitsa">
            <div class="glava" style="grid-template-columns: 108px minmax(0,1fr) 118px 118px 104px">
              <span>Период</span><span>Основание</span><span class="chislo-red">Начислено</span><span class="chislo-red">Погасено</span><span>Състояние</span>
            </div>
            <div class="red" style="grid-template-columns: 108px minmax(0,1fr) 118px 118px 104px">
              <span class="kletka"><b>Август 2026</b></span>
              <span class="kletka"><span>наем · падеж 16.08</span></span>
              <span class="chislo-red">1 150,00</span>
              <span class="chislo-red duljimo">0,00</span>
              <span><span class="znachka trevoga">просрочено</span></span>
            </div>
            <div class="red" style="grid-template-columns: 108px minmax(0,1fr) 118px 118px 104px">
              <span class="kletka"><b>Юли 2026</b></span>
              <span class="kletka"><span>наем · платен 18.07</span></span>
              <span class="chislo-red">1 150,00</span>
              <span class="chislo-red plateno">1 150,00</span>
              <span><span class="znachka dobre">затворено</span></span>
            </div>
            <div class="red" style="grid-template-columns: 108px minmax(0,1fr) 118px 118px 104px">
              <span class="kletka"><b>Юли 2026</b></span>
              <span class="kletka"><span>ток и вода · префактурирано</span></span>
              <span class="chislo-red">184,60</span>
              <span class="chislo-red plateno">184,60</span>
              <span><span class="znachka dobre">затворено</span></span>
            </div>
            <div class="red" style="grid-template-columns: 108px minmax(0,1fr) 118px 118px 104px">
              <span class="kletka"><b>Юни 2026</b></span>
              <span class="kletka"><span>наем · платен 12.06</span></span>
              <span class="chislo-red">1 150,00</span>
              <span class="chislo-red plateno">1 150,00</span>
              <span><span class="znachka dobre">затворено</span></span>
            </div>
            <div class="red" style="grid-template-columns: 108px minmax(0,1fr) 118px 118px 104px">
              <span class="kletka"><b>Май 2026</b></span>
              <span class="kletka"><span>наем · платен на две части</span></span>
              <span class="chislo-red">1 150,00</span>
              <span class="chislo-red plateno">1 150,00</span>
              <span><span class="znachka dobre">затворено</span></span>
            </div>
          </div>
        </section>

        <aside class="podnavigatsiya">
          <div class="dyalglava"><h2>Договорът</h2></div>
          <dl class="fakti">
            <div><dt>Наемател</dt><dd>Стройпласт ЕООД</dd></div>
            <div><dt>Падеж</dt><dd>16-о число</dd></div>
            <div><dt>Индексация</dt><dd>годишна, по ИПЦ</dd></div>
            <div><dt>Депозит</dt><dd>1 месечен наем</dd></div>
            <div><dt>Комунални</dt><dd>префактурират се</dd></div>
            <div><dt>Прекратяване</dt><dd>2 месеца предизвестие</dd></div>
          </dl>
          <div class="dyalglava" style="margin-top: 6px"><h2>Последни събития</h2></div>
          <div class="lentichka">
            <div class="sabitie"><span class="chas">18.07</span><span class="opis"><b>ПлащанеПрието</b><span>seq 12 204 · 1 150,00</span></span></div>
            <div class="sabitie"><span class="chas">16.07</span><span class="opis"><b>ВземанеНачислено</b><span>seq 12 181 · юли</span></span></div>
            <div class="sabitie"><span class="chas">02.07</span><span class="opis"><b>Сторно</b><span>seq 12 090 · грешен период</span></span></div>
            <div class="sabitie"><span class="chas">01.03</span><span class="opis"><b>НаемДобавен</b><span>seq 8 442 · договор</span></span></div>
          </div>
          <button type="button" class="vtorichen" style="width: 100%">Целият Журнал за този наем</button>
        </aside>
      </div>
    </div>
  </main>
</div>""",
    dop_css=r"""
    .dvekoloni { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 22px; min-height: 0; }
    .poddyal { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    .podnavigatsiya { display: flex; flex-direction: column; gap: 10px; }
    .fakti { margin: 0; border: 1px solid var(--liniya); border-radius: 5px; background: #FFFFFF; overflow: hidden; }
    .fakti > div { display: flex; justify-content: space-between; gap: 12px; padding: 9px 14px; border-bottom: 1px solid #EFE8DD; }
    .fakti > div:last-child { border-bottom: none; }
    .fakti dt { color: var(--mastilo2); font-size: 12.5px; }
    .fakti dd { margin: 0; font-size: 13px; font-weight: 500; text-align: right; }
    .lentichka { border: 1px solid var(--liniya); border-radius: 5px; background: #FFFFFF; padding: 4px 14px; }
    .sabitie { display: flex; gap: 11px; padding: 9px 0; border-bottom: 1px solid #EFE8DD; }
    .sabitie:last-child { border-bottom: none; }
    .sabitie .chas { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: var(--mastilo2); flex-shrink: 0; padding-top: 1px; }
    .sabitie .opis { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .sabitie .opis b { font-weight: 500; font-size: 13px; }
    .sabitie .opis span { font-size: 11.5px; color: var(--mastilo2); font-family: 'IBM Plex Mono', monospace; }
""",
)

# ─────────────────────────────────────────────────── ПЛАЩАНИЯ ───────────────
zapishi(
    'Plashtaniya',
    f"""<div class="ekran">
{strana('Плащания')}
  <main class="glavno">
    <header class="shapka">
      <div>
        <h1>Плащания</h1>
        <p>приетото се записва веднъж и се погасява срещу конкретно вземане</p>
      </div>
      <div class="desno-gore">
        <button type="button" class="vtorichen">Внеси банково извлечение</button>
        <button type="button" class="glaven">
          <svg viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
          Ново плащане
        </button>
      </div>
    </header>
    <div class="telo">
      <div class="dvekoloni">
        <section class="poddyal">
          <div class="filtri">
            <button type="button" class="chip izbran">Всички</button>
            <button type="button" class="chip">За разнасяне · 3</button>
            <button type="button" class="chip">Погасени</button>
            <button type="button" class="chip">Сторнирани</button>
          </div>
          <div class="tablitsa">
            <div class="glava" style="grid-template-columns: 92px minmax(0,1.7fr) minmax(0,1.3fr) 118px 116px">
              <span>Дата</span><span>Платец и основание</span><span>Срещу</span><span class="chislo-red">Сума</span><span>Състояние</span>
            </div>
            <div class="red" style="grid-template-columns: 92px minmax(0,1.7fr) minmax(0,1.3fr) 118px 116px">
              <span class="kletka"><b>21.08</b></span>
              <span class="kletka"><b>Постъпление по сметка</b><span>основание: „наем август" · без номер</span></span>
              <span class="kletka"><span>не е разнесено</span></span>
              <span class="chislo-red">1 480,00</span>
              <span><span class="znachka trevoga">за разнасяне</span></span>
            </div>
            <div class="red" style="grid-template-columns: 92px minmax(0,1.7fr) minmax(0,1.3fr) 118px 116px">
              <span class="kletka"><b>20.08</b></span>
              <span class="kletka"><b>Кафе Ъгъла ЕООД</b><span>по фактура 2026-0418</span></span>
              <span class="kletka"><span>Оборище · август</span></span>
              <span class="chislo-red plateno">2 300,00</span>
              <span><span class="znachka dobre">погасено</span></span>
            </div>
            <div class="red" style="grid-template-columns: 92px minmax(0,1.7fr) minmax(0,1.3fr) 118px 116px">
              <span class="kletka"><b>18.08</b></span>
              <span class="kletka"><b>Мария Т.</b><span>наем + гараж, едно нареждане</span></span>
              <span class="kletka"><span>2 вземания</span></span>
              <span class="chislo-red plateno">1 660,00</span>
              <span><span class="znachka dobre">погасено</span></span>
            </div>
            <div class="red" style="grid-template-columns: 92px minmax(0,1.7fr) minmax(0,1.3fr) 118px 116px">
              <span class="kletka"><b>16.08</b></span>
              <span class="kletka"><b>Постъпление в брой</b><span>депозит · нов наемател</span></span>
              <span class="kletka"><span>не е разнесено</span></span>
              <span class="chislo-red">640,00</span>
              <span><span class="znachka trevoga">за разнасяне</span></span>
            </div>
            <div class="red" style="grid-template-columns: 92px minmax(0,1.7fr) minmax(0,1.3fr) 118px 116px">
              <span class="kletka"><b>14.08</b></span>
              <span class="kletka"><b>Стройпласт ЕООД</b><span>сторнирано · сгрешен период</span></span>
              <span class="kletka"><span>seq 12 471 → 12 476</span></span>
              <span class="chislo-red">1 150,00</span>
              <span><span class="znachka tiha">сторнирано</span></span>
            </div>
          </div>
        </section>

        <aside class="podnavigatsiya">
          <div class="dyalglava"><h2>Разнеси плащането</h2><span>21.08 · 1 480,00</span></div>
          <div class="karta">
            <p class="obyasnenie">Сумата съвпада с едно отворено вземане. Потвърждаваш ли?</p>
            <label class="predlozhenie izbrano">
              <span class="radio"></span>
              <span class="kletka"><b>Лозенец · ап. 4 · август</b><span>Мария Т. · падеж 15.08 · 1 480,00</span></span>
            </label>
            <label class="predlozhenie">
              <span class="radio"></span>
              <span class="kletka"><b>Разпредели по няколко</b><span>остатъкът остава по сметка</span></span>
            </label>
            <label class="predlozhenie">
              <span class="radio"></span>
              <span class="kletka"><b>Задръж като аванс</b><span>погасява се при следващо начисляване</span></span>
            </label>
            <button type="button" class="glaven" style="width: 100%; justify-content: center">Разнеси</button>
            <p class="drebno">Записва се като едно събитие в Журнала. Поправка = сторно, не изтриване.</p>
          </div>
        </aside>
      </div>
    </div>
  </main>
</div>""",
    dop_css=r"""
    .dvekoloni { display: grid; grid-template-columns: minmax(0, 1fr) 356px; gap: 22px; min-height: 0; }
    .poddyal { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .podnavigatsiya { display: flex; flex-direction: column; gap: 10px; }
    .karta { border: 1px solid var(--liniya); border-radius: 5px; background: #FFFFFF; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .obyasnenie { margin: 0; font-size: 13px; color: var(--mastilo2); }
    .predlozhenie { display: flex; align-items: flex-start; gap: 11px; padding: 11px 12px; border: 1px solid var(--liniya); border-radius: 4px; cursor: pointer; }
    .predlozhenie.izbrano { border-color: var(--aktsent); background: var(--toplo); }
    .radio { width: 15px; height: 15px; border-radius: 50%; border: 1.5px solid #C3B6A6; flex-shrink: 0; margin-top: 2px; }
    .predlozhenie.izbrano .radio { border-color: var(--aktsent); border-width: 4.5px; }
    .drebno { margin: 0; font-size: 11.5px; color: var(--mastilo2); line-height: 1.5; }
""",
)

# ────────────────────────────────────────────── СЧЕТОВОДСТВО ────────────────
zapishi(
    'Schetovodstvo',
    f"""<div class="ekran">
{strana('Счетоводство')}
  <main class="glavno">
    <header class="shapka">
      <div>
        <h1>Счетоводство · ДДС</h1>
        <p>период юли 2026 · два акумулатора: по държава и по сектор · всичко в цели стотинки</p>
      </div>
      <div class="desno-gore">
        <button type="button" class="vtorichen">Замрази периода</button>
        <button type="button" class="glaven">
          <svg viewBox="0 0 24 24"><path d="M12 3v13"></path><path d="m7 11 5 5 5-5"></path><path d="M4 20h16"></path></svg>
          Изнеси декларация
        </button>
      </div>
    </header>
    <div class="telo">
      <div class="plochki">
        <div class="plochka"><span class="etiket">Начислен ДДС</span><span class="chislo">4 328,00</span><span class="pod">по продажби · лв.</span></div>
        <div class="plochka"><span class="etiket">Данъчен кредит</span><span class="chislo">2 221,60</span><span class="pod">по покупки · лв.</span></div>
        <div class="plochka"><span class="etiket">За внасяне</span><span class="chislo">2 106,40</span><span class="pod">срок 14.08 · закъсняло</span></div>
        <div class="plochka"><span class="etiket">Разлика при сверка</span><span class="chislo">0,00</span><span class="pod">записана, макар и нула</span></div>
      </div>

      <div class="dvekoloni">
        <section class="poddyal">
          <div class="dyalglava"><h2>Акумулатори</h2><span>държава × сектор · нищо не се смесва</span></div>
          <div class="tablitsa">
            <div class="glava" style="grid-template-columns: 110px minmax(0,1fr) 74px 122px 122px">
              <span>Държава</span><span>Сектор</span><span>Ставка</span><span class="chislo-red">Основа</span><span class="chislo-red">ДДС</span>
            </div>
            <div class="red" style="grid-template-columns: 110px minmax(0,1fr) 74px 122px 122px">
              <span class="kletka"><b>България</b></span><span class="kletka"><span>наем · жилищен</span></span>
              <span class="kletka"><span>0%</span></span><span class="chislo-red">3 460,00</span><span class="chislo-red">0,00</span>
            </div>
            <div class="red" style="grid-template-columns: 110px minmax(0,1fr) 74px 122px 122px">
              <span class="kletka"><b>България</b></span><span class="kletka"><span>наем · търговски</span></span>
              <span class="kletka"><span>20%</span></span><span class="chislo-red">15 400,00</span><span class="chislo-red">3 080,00</span>
            </div>
            <div class="red" style="grid-template-columns: 110px minmax(0,1fr) 74px 122px 122px">
              <span class="kletka"><b>България</b></span><span class="kletka"><span>строителни услуги</span></span>
              <span class="kletka"><span>20%</span></span><span class="chislo-red">6 240,00</span><span class="chislo-red">1 248,00</span>
            </div>
            <div class="red" style="grid-template-columns: 110px minmax(0,1fr) 74px 122px 122px">
              <span class="kletka"><b>България</b></span><span class="kletka"><span>покупки · материали</span></span>
              <span class="kletka"><span>20%</span></span><span class="chislo-red">-9 480,00</span><span class="chislo-red">-1 896,00</span>
            </div>
            <div class="red" style="grid-template-columns: 110px minmax(0,1fr) 74px 122px 122px">
              <span class="kletka"><b>България</b></span><span class="kletka"><span>покупки · услуги</span></span>
              <span class="kletka"><span>20%</span></span><span class="chislo-red">-1 628,00</span><span class="chislo-red">-325,60</span>
            </div>
            <div class="red sbor" style="grid-template-columns: 110px minmax(0,1fr) 74px 122px 122px">
              <span class="kletka"><b>Общо</b></span><span class="kletka"><span>затваря до стотинка</span></span>
              <span class="kletka"><span>—</span></span><span class="chislo-red">13 992,00</span><span class="chislo-red">2 106,40</span>
            </div>
          </div>
        </section>

        <aside class="podnavigatsiya">
          <div class="dyalglava"><h2>Сверка на периода</h2></div>
          <div class="karta">
            <div class="sverkared"><span>Вход · документи</span><b>184</b></div>
            <div class="sverkared"><span>Изход · записи</span><b>184</b></div>
            <div class="sverkared golyam"><span>Разлика</span><b class="nula">0</b></div>
            <p class="drebno">Разликата се записва дори когато е нула — иначе „няма разлика" не се различава от „не е сверявано".</p>
          </div>
          <div class="karta">
            <span class="znachka dobre"><svg viewBox="0 0 24 24"><path d="m4 12.5 5 5L20 6.5"></path></svg>Периодът може да се замрази</span>
            <p class="drebno">След замразяване нищо в юли не помръдва. Поправка след това е сторно с дата в текущия период.</p>
          </div>
        </aside>
      </div>
    </div>
  </main>
</div>""",
    dop_css=r"""
    .dvekoloni { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 22px; min-height: 0; }
    .poddyal { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    .podnavigatsiya { display: flex; flex-direction: column; gap: 12px; }
    .tablitsa .red.sbor { background: var(--panel); font-weight: 600; }
    .karta { border: 1px solid var(--liniya); border-radius: 5px; background: #FFFFFF; padding: 15px; display: flex; flex-direction: column; gap: 9px; }
    .sverkared { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--mastilo2); }
    .sverkared b { font-variant-numeric: tabular-nums; font-size: 15px; color: var(--mastilo); }
    .sverkared.golyam { border-top: 1px solid var(--liniya); padding-top: 9px; }
    .sverkared.golyam b { font-family: Literata, Georgia, serif; font-size: 22px; }
    .nula { color: var(--zeleno); }
    .drebno { margin: 0; font-size: 11.5px; color: var(--mastilo2); line-height: 1.55; }
""",
)

# ─────────────────────────────────────────────────────── ЖУРНАЛ ─────────────
zapishi(
    'Zhurnal',
    f"""<div class="ekran">
{strana('Журналът')}
  <main class="glavno">
    <header class="shapka">
      <div>
        <h1>Журналът</h1>
        <p>единствената истина · само добавяне · всяко звено сочи предишното</p>
      </div>
      <div class="desno-gore">
        <button type="button" class="opasen">Спирателен кран</button>
        <button type="button" class="vtorichen">Изнеси период</button>
        <button type="button" class="glaven">
          <svg viewBox="0 0 24 24"><path d="m4 12.5 5 5L20 6.5"></path></svg>
          Провери веригата
        </button>
      </div>
    </header>
    <div class="telo">
      <div class="plochki">
        <div class="plochka"><span class="etiket">Събития</span><span class="chislo">12 480</span><span class="pod">seq 1 → 12 480</span></div>
        <div class="plochka"><span class="etiket">Веригата</span><span class="chislo" style="color: var(--zeleno)">цяла</span><span class="pod">проверена днес 09:12</span></div>
        <div class="plochka"><span class="etiket">Сторно записи</span><span class="chislo">34</span><span class="pod">0 изтрити · нищо не се трие</span></div>
        <div class="plochka"><span class="etiket">Наематели</span><span class="chislo">3</span><span class="pod">всеки със своя редица</span></div>
      </div>

      <div class="filtri">
        <span class="tarsene"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg>Търси по seq, opId, същност или хеш</span>
        <button type="button" class="chip izbran">Всички</button>
        <button type="button" class="chip">Пари</button>
        <button type="button" class="chip">Договори</button>
        <button type="button" class="chip">Сторно</button>
        <button type="button" class="chip">Проверки</button>
      </div>

      <div class="tablitsa">
        <div class="glava" style="grid-template-columns: 74px 118px minmax(0,1.2fr) minmax(0,1.3fr) 118px minmax(0,1fr)">
          <span>seq</span><span>Час</span><span>Тип</span><span>Същност</span><span class="chislo-red">Сума</span><span>Хеш</span>
        </div>
        <div class="red" style="grid-template-columns: 74px 118px minmax(0,1.2fr) minmax(0,1.3fr) 118px minmax(0,1fr)">
          <span class="seq">12 480</span><span class="kletka"><span class="mono">22.08 11:42</span></span>
          <span class="kletka"><b>ПлащанеПрието</b></span><span class="kletka"><span class="mono">naem N-114</span></span>
          <span class="chislo-red plateno">1 250,00</span><span class="kletka"><span class="mono">a7f3…c2</span></span>
        </div>
        <div class="red" style="grid-template-columns: 74px 118px minmax(0,1.2fr) minmax(0,1.3fr) 118px minmax(0,1fr)">
          <span class="seq">12 479</span><span class="kletka"><span class="mono">22.08 10:18</span></span>
          <span class="kletka"><b>Сторно</b><span>погасява 12 471</span></span><span class="kletka"><span class="mono">plashtane P-908</span></span>
          <span class="chislo-red duljimo">-1 150,00</span><span class="kletka"><span class="mono">5c19…8b</span></span>
        </div>
        <div class="red" style="grid-template-columns: 74px 118px minmax(0,1.2fr) minmax(0,1.3fr) 118px minmax(0,1fr)">
          <span class="seq">12 478</span><span class="kletka"><span class="mono">22.08 09:55</span></span>
          <span class="kletka"><b>РазходЗаписан</b></span><span class="kletka"><span class="mono">proekt L-02</span></span>
          <span class="chislo-red">4 890,00</span><span class="kletka"><span class="mono">e044…17</span></span>
        </div>
        <div class="red" style="grid-template-columns: 74px 118px minmax(0,1.2fr) minmax(0,1.3fr) 118px minmax(0,1fr)">
          <span class="seq">12 477</span><span class="kletka"><span class="mono">22.08 09:31</span></span>
          <span class="kletka"><b>ЗадачаПреместена</b><span>+3 дни</span></span><span class="kletka"><span class="mono">zadacha Z-41</span></span>
          <span class="chislo-red">—</span><span class="kletka"><span class="mono">b8d2…9f</span></span>
        </div>
        <div class="red" style="grid-template-columns: 74px 118px minmax(0,1.2fr) minmax(0,1.3fr) 118px minmax(0,1fr)">
          <span class="seq">12 476</span><span class="kletka"><span class="mono">22.08 09:12</span></span>
          <span class="kletka"><b>ВеригаПроверена</b></span><span class="kletka"><span class="mono">naematel vintexstroy</span></span>
          <span class="chislo-red">—</span><span class="kletka"><span class="mono">3f7a…40</span></span>
        </div>
      </div>

      <div class="dolu">
        <div class="karta">
          <div class="dyalglava"><h2>Едно звено, отблизо</h2><span>seq 12 479 · Сторно</span></div>
          <pre class="kod">{{
  seq:      12479
  opId:     "8f2c1a44-…-b310"
  ts:       "2026-08-22T10:18:04Z"
  наемател: "vintexstroy"
  actor:    "vintexstroy@gmail.com"
  type:     "Сторно"
  същност:  {{ вид: "plashtane", id: "P-908" }}
  payload:  {{ погасява_seq: 12471, сума_st: -115000 }}
  prevHash: "e044…17"
  hash:     "5c19…8b"
}}</pre>
        </div>
        <div class="karta">
          <div class="dyalglava"><h2>Ако нещо се счупи</h2></div>
          <ol class="pravila">
            <li><b>Журналът не се пипа.</b> Никакво поправяне на място.</li>
            <li>Дърпаш <b>спирателния кран</b> — записът спира, четенето остава.</li>
            <li>Пускаш <b>проверка на веригата</b> — тя казва на кой seq се къса.</li>
            <li>Поправката е <b>ново събитие</b> (сторно), не презапис.</li>
            <li>Накрая: <b>сверка вход↔изход</b>, разликата се записва.</li>
          </ol>
        </div>
      </div>
    </div>
  </main>
</div>""",
    dop_css=r"""
    .opasen { background: transparent; border: 1px solid #D8A78C; border-radius: 4px; padding: 9px 14px; font-family: inherit; font-size: 13px; color: var(--aktsent); cursor: pointer; }
    .opasen:hover { background: var(--toplo); }
    .mono { font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
    .seq { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; color: var(--mastilo2); font-variant-numeric: tabular-nums; }
    .dolu { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; }
    .karta { border: 1px solid var(--liniya); border-radius: 5px; background: #FFFFFF; padding: 15px 17px; display: flex; flex-direction: column; gap: 10px; }
    .kod { margin: 0; font-family: 'IBM Plex Mono', monospace; font-size: 11px; line-height: 1.5; color: var(--mastilo); background: var(--panel); border-radius: 4px; padding: 12px 14px; overflow-x: auto; }
    .pravila { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 7px; font-size: 13px; line-height: 1.5; color: var(--mastilo2); }
    .pravila b { color: var(--mastilo); font-weight: 500; }
""",
)

# ───────────────────────────────────────────────────────── ГАНТ ─────────────
zapishi(
    'Gant',
    f"""<div class="ekran">
{strana('Проекти и Гант')}
  <main class="glavno">
    <header class="shapka">
      <div>
        <h1>Лозенец · нов корпус</h1>
        <p>Гантът е таблица с оцветени клетки, не диаграма · критичният път е с етикет, не само с цвят</p>
      </div>
      <div class="desno-gore">
        <button type="button" class="vtorichen">Ден</button>
        <button type="button" class="vtorichen" style="background: var(--panel)">Седмица</button>
        <button type="button" class="vtorichen">Месец</button>
        <button type="button" class="glaven">
          <svg viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
          Задача
        </button>
      </div>
    </header>
    <div class="telo">
      <div class="legenda">
        <span class="klyuch"><span class="proba zavursheno"></span>завършено</span>
        <span class="klyuch"><span class="proba teche"></span>тече</span>
        <span class="klyuch"><span class="proba kritichno"></span>критичен път · Slack 0</span>
        <span class="klyuch"><span class="proba luft"></span>луфт</span>
        <span class="klyuch"><span class="proba predstoi"></span>предстои</span>
        <span style="margin-left: auto; font-size: 12px; color: var(--mastilo2)">седмици 32 → 43 · 2026</span>
      </div>

      <div class="gant">
        <div class="gred glava">
          <span class="zadacha">Задача</span>
          <span class="mera">Ресурс</span>
          <span class="sedm">32</span><span class="sedm">33</span><span class="sedm">34</span><span class="sedm">35</span>
          <span class="sedm">36</span><span class="sedm">37</span><span class="sedm">38</span><span class="sedm">39</span>
          <span class="sedm">40</span><span class="sedm">41</span><span class="sedm">42</span><span class="sedm">43</span>
        </div>
        <div class="gred">
          <span class="zadacha"><b>Груб строеж</b></span><span class="mera">бригада А</span>
          <span class="kl zavursheno">✓</span><span class="kl zavursheno"></span><span class="kl zavursheno"></span><span class="kl"></span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
        </div>
        <div class="gred">
          <span class="zadacha"><b>Покрив</b></span><span class="mera">подизпълнител</span>
          <span class="kl"></span><span class="kl zavursheno">✓</span><span class="kl zavursheno"></span><span class="kl teche"></span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
        </div>
        <div class="gred">
          <span class="zadacha"><b>Инсталации</b></span><span class="mera">бригада Б</span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl kritichno">кр.</span>
          <span class="kl kritichno"></span><span class="kl kritichno"></span><span class="kl"></span><span class="kl"></span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
        </div>
        <div class="gred">
          <span class="zadacha"><b>Мазилки</b></span><span class="mera">бригада А</span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
          <span class="kl"></span><span class="kl predstoi"></span><span class="kl predstoi"></span><span class="kl luft"></span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
        </div>
        <div class="gred">
          <span class="zadacha"><b>Дограма</b></span><span class="mera">доставчик</span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
          <span class="kl"></span><span class="kl"></span><span class="kl predstoi"></span><span class="kl predstoi"></span>
          <span class="kl luft"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
        </div>
        <div class="gred">
          <span class="zadacha"><b>Акт 16</b></span><span class="mera">общината</span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
          <span class="kl kritichno">кр.</span><span class="kl kritichno"></span><span class="kl"></span><span class="kl"></span>
        </div>
        <div class="gred">
          <span class="zadacha"><b>Предаване</b></span><span class="mera">—</span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
          <span class="kl"></span><span class="kl"></span><span class="kl"></span><span class="kl"></span>
          <span class="kl"></span><span class="kl"></span><span class="kl predstoi"></span><span class="kl predstoi"></span>
        </div>
      </div>

      <div class="dolu">
        <div class="karta">
          <div class="dyalglava"><h2>Натоварване · бригада А</h2><span>над 100% е червено, не „почти"</span></div>
          <div class="tovar">
            <span class="stalb"><span class="pryut" style="height: 34px"></span><span class="etiketche">32</span></span>
            <span class="stalb"><span class="pryut" style="height: 42px"></span><span class="etiketche">33</span></span>
            <span class="stalb"><span class="pryut" style="height: 40px"></span><span class="etiketche">34</span></span>
            <span class="stalb"><span class="pryut nad" style="height: 62px"></span><span class="etiketche">35</span></span>
            <span class="stalb"><span class="pryut nad" style="height: 58px"></span><span class="etiketche">36</span></span>
            <span class="stalb"><span class="pryut" style="height: 44px"></span><span class="etiketche">37</span></span>
            <span class="stalb"><span class="pryut" style="height: 30px"></span><span class="etiketche">38</span></span>
            <span class="stalb"><span class="pryut" style="height: 26px"></span><span class="etiketche">39</span></span>
          </div>
          <p class="drebno">Седмици 35–36: 130% и 118%. Мазилките могат да се изтеглят с една седмица — имат луфт.</p>
        </div>
        <div class="karta">
          <div class="dyalglava"><h2>Критичен път</h2><span>Slack 0 · всяко забавяне бута края</span></div>
          <ol class="pravila">
            <li><b>Инсталации</b> · седм. 35–37 · бригада Б</li>
            <li><b>Акт 16</b> · седм. 40–41 · общината · <span style="color: var(--aktsent)">+3 дни от вчера</span></li>
            <li><b>Предаване</b> · седм. 42–43</li>
          </ol>
          <p class="drebno">Цикли се засичат преди изчислението — кръгова зависимост не се смята, а се показва.</p>
        </div>
      </div>
    </div>
  </main>
</div>""",
    dop_css=r"""
    .legenda { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .klyuch { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--mastilo2); }
    .proba { width: 15px; height: 15px; border-radius: 3px; flex-shrink: 0; }
    .proba.zavursheno { background: #CFE0D6; }
    .proba.teche { background: var(--zeleno); }
    .proba.kritichno { background: var(--aktsent); }
    .proba.luft { background: repeating-linear-gradient(135deg, #E8DCCD, #E8DCCD 3px, #FBF8F3 3px, #FBF8F3 6px); border: 1px solid var(--liniya); }
    .proba.predstoi { background: #DCD2C4; }
    .gant { border: 1px solid var(--liniya); border-radius: 5px; background: #FFFFFF; overflow: hidden; }
    .gred { display: grid; grid-template-columns: minmax(0, 210px) 128px repeat(12, minmax(0, 1fr)); align-items: stretch; border-bottom: 1px solid #EFE8DD; }
    .gred:last-child { border-bottom: none; }
    .gred.glava { background: var(--panel); font-size: 11.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mastilo2); }
    .gred .zadacha { padding: 10px 16px; display: flex; align-items: center; }
    .gred .zadacha b { font-weight: 500; font-size: 13.5px; }
    .gred .mera { padding: 10px 12px; display: flex; align-items: center; font-size: 12.5px; color: var(--mastilo2); border-right: 1px solid var(--liniya); }
    .gred .sedm { padding: 10px 0; text-align: center; font-variant-numeric: tabular-nums; }
    .kl { margin: 4px 2px; border-radius: 3px; min-height: 24px; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 600; color: #FFF9F4; }
    .kl.zavursheno { background: #CFE0D6; color: var(--zeleno); }
    .kl.teche { background: var(--zeleno); }
    .kl.kritichno { background: var(--aktsent); }
    .kl.luft { background: repeating-linear-gradient(135deg, #E8DCCD, #E8DCCD 3px, #FFFFFF 3px, #FFFFFF 6px); }
    .kl.predstoi { background: #DCD2C4; }
    .dolu { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; }
    .karta { border: 1px solid var(--liniya); border-radius: 5px; background: #FFFFFF; padding: 15px 17px; display: flex; flex-direction: column; gap: 11px; }
    .tovar { display: flex; align-items: flex-end; gap: 9px; height: 72px; }
    .tovar .stalb { flex-grow: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .tovar .pryut { width: 100%; background: #DFCFC2; border-radius: 3px 3px 0 0; }
    .tovar .pryut.nad { background: var(--aktsent); }
    .tovar .etiketche { font-size: 10.5px; color: var(--mastilo2); }
    .pravila { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; line-height: 1.5; color: var(--mastilo2); }
    .pravila b { color: var(--mastilo); font-weight: 500; }
    .drebno { margin: 0; font-size: 11.5px; color: var(--mastilo2); line-height: 1.55; }
""",
)

# ────────────────────────────────────────────────────── ТЕЛЕФОН ─────────────
zapishi(
    'Telefon',
    """<div class="telefon">
  <header class="tshapka">
    <div class="tmarka">
      <b>Лозенец · ап. 3</b>
      <span>Стройпласт ЕООД</span>
    </div>
    <span class="znachka trevoga">просрочен 6 дни</span>
  </header>

  <div class="ttelo">
    <div class="tkarta glavna">
      <span class="tetiket">Дължимо</span>
      <span class="tchislo">1 150,00</span>
      <span class="tpod">падеж 16.08.2026 · лв.</span>
    </div>

    <span class="tdyal">Приеми плащане</span>

    <div class="tkarta">
      <label class="tpole">
        <span class="tetiket">Сума</span>
        <span class="tvhod">1 150,00</span>
      </label>
      <div class="tbrz">
        <button type="button" class="chip izbran">цялото</button>
        <button type="button" class="chip">половин</button>
        <button type="button" class="chip">друга</button>
      </div>
      <label class="tpole">
        <span class="tetiket">Начин</span>
        <span class="tvhod">банка · по сметка</span>
      </label>
      <label class="tpole">
        <span class="tetiket">Дата</span>
        <span class="tvhod">22.08.2026 · днес</span>
      </label>
    </div>

    <p class="tdrebno">Записва се веднага на телефона. Ако няма мрежа, тръгва щом има — <b>СЕГА</b> изпраща на ръка.</p>
  </div>

  <footer class="tpodnozhie">
    <button type="button" class="tvtorichen">СЕГА</button>
    <button type="button" class="tglaven">Приеми 1 150,00</button>
  </footer>
</div>""",
    dop_css=r"""
    .telefon {
      --hartiya: #FBF8F3; --panel: #F4EFE7; --mastilo: #2A2521; --mastilo2: #6E645B;
      --liniya: #E3DACE; --aktsent: #B25E38; --zeleno: #2E7D5E; --toplo: #F6E7DE;
      width: 390px; height: 844px; display: flex; flex-direction: column;
      background: var(--hartiya); color: var(--mastilo);
      font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 15px; overflow: hidden;
    }
    .tshapka { padding: 22px 20px 16px; border-bottom: 1px solid var(--liniya); display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .tmarka { display: flex; flex-direction: column; gap: 3px; }
    .tmarka b { font-family: Literata, Georgia, serif; font-size: 21px; font-weight: 600; letter-spacing: -0.015em; }
    .tmarka span { font-size: 13.5px; color: var(--mastilo2); }
    .ttelo { flex-grow: 1; padding: 18px 20px; display: flex; flex-direction: column; gap: 16px; overflow: hidden; }
    .tkarta { border: 1px solid var(--liniya); border-radius: 8px; background: #FFFFFF; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
    .tkarta.glavna { background: var(--toplo); border-color: #E0B49E; gap: 5px; }
    .tetiket { font-size: 11.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mastilo2); }
    .tchislo { font-family: Literata, Georgia, serif; font-size: 40px; font-weight: 600; letter-spacing: -0.025em; color: var(--aktsent); font-variant-numeric: tabular-nums; line-height: 1.05; }
    .tpod { font-size: 13px; color: var(--mastilo2); }
    .tdyal { font-family: Literata, Georgia, serif; font-size: 16px; font-weight: 600; }
    .tpole { display: flex; flex-direction: column; gap: 6px; }
    .tvhod { border: 1px solid var(--liniya); border-radius: 6px; padding: 13px 14px; font-size: 16px; min-height: 48px; display: flex; align-items: center; font-variant-numeric: tabular-nums; }
    .tbrz { display: flex; gap: 8px; }
    .tbrz .chip { min-height: 44px; display: flex; align-items: center; border: 1px solid var(--liniya); border-radius: 999px; padding: 0 16px; font-size: 14px; color: var(--mastilo2); background: transparent; font-family: inherit; }
    .tbrz .chip.izbran { background: var(--mastilo); border-color: var(--mastilo); color: var(--hartiya); }
    .tdrebno { margin: 0; font-size: 13px; color: var(--mastilo2); line-height: 1.55; }
    .tdrebno b { color: var(--mastilo); }
    .tpodnozhie { padding: 14px 20px 26px; border-top: 1px solid var(--liniya); display: flex; gap: 10px; background: var(--panel); }
    .tvtorichen { min-height: 52px; padding: 0 20px; border: 1px solid var(--liniya); border-radius: 8px; background: transparent; font-family: inherit; font-size: 15px; font-weight: 600; letter-spacing: 0.04em; color: var(--mastilo); }
    .tglaven { flex-grow: 1; min-height: 52px; border: none; border-radius: 8px; background: var(--aktsent); color: #FFF9F4; font-family: inherit; font-size: 15.5px; font-weight: 600; }
    .znachka { display: inline-flex; align-items: center; border-radius: 4px; padding: 5px 10px; font-size: 13px; font-weight: 500; }
    .znachka.trevoga { background: var(--toplo); color: var(--aktsent); }
""",
    script="""<script data-dc-script data-props='{"$preview":{"width":390,"height":844}}'>
class Component extends DCLogic {}
</script>""",
)

# ─────────────────────────────────────────────────────── СКИЦИ ──────────────
SKITSA_CSS = r"""
    .skitsa {
      width: 880px; height: 560px; box-sizing: border-box; padding: 26px 28px;
      background: #FFFDF9; color: #2A2521;
      font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 13px;
      display: flex; flex-direction: column; gap: 16px; overflow: hidden;
    }
    .sglava { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; border-bottom: 2px solid #2A2521; padding-bottom: 10px; }
    .sglava h2 { font-family: Literata, Georgia, serif; font-size: 20px; font-weight: 600; margin: 0; }
    .sglava p { margin: 0; font-size: 12.5px; color: #6E645B; max-width: 460px; text-align: right; }
    .skutiya { border: 1.5px dashed #B8AB9C; border-radius: 4px; background: #FFFFFF; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
    .skutiya.plutna { border-style: solid; border-color: #2A2521; }
    .setiket { font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #8A7E71; }
    .sivo { background: #E8E1D6; border-radius: 3px; }
    .stekst { height: 9px; }
    .kompromis { margin: auto 0 0; font-size: 12px; color: #6E645B; border-top: 1px solid #E3DACE; padding-top: 10px; line-height: 1.5; }
    .kompromis b { color: #2A2521; font-weight: 500; }
"""

zapishi(
    'SkitsaA',
    """<div class="skitsa">
  <div class="sglava">
    <h2>Посока А · Дневникът отпред</h2>
    <p>Журналът е първият екран. Всичко останало е изглед към него. За човек, който вярва само на записа.</p>
  </div>
  <div style="display: grid; grid-template-columns: minmax(0,1fr) 200px; gap: 14px; flex-grow: 1; min-height: 0">
    <div class="skutiya plutna">
      <span class="setiket">Лентата на събитията</span>
      <div style="display: flex; flex-direction: column; gap: 7px">
        <span class="sivo stekst" style="width: 92%"></span>
        <span class="sivo stekst" style="width: 78%"></span>
        <span class="sivo stekst" style="width: 86%"></span>
        <span class="sivo stekst" style="width: 64%; background: #E4CBBB"></span>
        <span class="sivo stekst" style="width: 81%"></span>
        <span class="sivo stekst" style="width: 73%"></span>
        <span class="sivo stekst" style="width: 88%"></span>
      </div>
      <span class="setiket" style="margin-top: 6px">Филтри: пари · договори · сторно</span>
      <div style="display: flex; gap: 6px">
        <span class="sivo" style="width: 62px; height: 22px; border-radius: 999px"></span>
        <span class="sivo" style="width: 78px; height: 22px; border-radius: 999px"></span>
        <span class="sivo" style="width: 54px; height: 22px; border-radius: 999px"></span>
      </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 12px">
      <div class="skutiya"><span class="setiket">Веригата</span><span class="sivo" style="height: 44px"></span></div>
      <div class="skutiya"><span class="setiket">Дължимо днес</span><span class="sivo" style="height: 30px"></span></div>
      <div class="skutiya" style="flex-grow: 1"><span class="setiket">Бързи действия</span><span class="sivo" style="height: 26px"></span><span class="sivo" style="height: 26px"></span></div>
    </div>
  </div>
  <p class="kompromis"><b>За:</b> нищо не се крие; проверимо е по всяко време. <b>Против:</b> иска дисциплина от читателя — сурови събития, преди да си видял парите.</p>
</div>""",
    dop_css=SKITSA_CSS,
    script="""<script data-dc-script data-props='{"$preview":{"width":880,"height":560}}'>
class Component extends DCLogic {}
</script>""",
)

zapishi(
    'SkitsaB',
    """<div class="skitsa">
  <div class="sglava">
    <h2>Посока Б · Днешният списък</h2>
    <p>Един екран, един въпрос: какво иска действие днес. Журналът е долу, под линия — виждаш го, когато го потърсиш.</p>
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px; flex-grow: 1; min-height: 0">
    <div style="display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px">
      <div class="skutiya" style="gap: 6px"><span class="setiket">Днес</span><span class="sivo" style="height: 24px"></span></div>
      <div class="skutiya" style="gap: 6px; border-color: #C98A68"><span class="setiket">Просрочено</span><span class="sivo" style="height: 24px; background: #E4CBBB"></span></div>
      <div class="skutiya" style="gap: 6px"><span class="setiket">Събрано</span><span class="sivo" style="height: 24px"></span></div>
      <div class="skutiya" style="gap: 6px"><span class="setiket">Заетост</span><span class="sivo" style="height: 24px"></span></div>
    </div>
    <div class="skutiya plutna" style="flex-grow: 1">
      <span class="setiket">Иска действие · всеки ред има бутон</span>
      <div style="display: flex; flex-direction: column; gap: 9px">
        <span style="display: flex; align-items: center; gap: 10px"><span class="sivo stekst" style="flex-grow: 1"></span><span class="sivo" style="width: 96px; height: 24px; border-radius: 4px; background: #D9C6B7"></span></span>
        <span style="display: flex; align-items: center; gap: 10px"><span class="sivo stekst" style="flex-grow: 1"></span><span class="sivo" style="width: 96px; height: 24px; border-radius: 4px"></span></span>
        <span style="display: flex; align-items: center; gap: 10px"><span class="sivo stekst" style="flex-grow: 1"></span><span class="sivo" style="width: 96px; height: 24px; border-radius: 4px"></span></span>
        <span style="display: flex; align-items: center; gap: 10px"><span class="sivo stekst" style="flex-grow: 1"></span><span class="sivo" style="width: 96px; height: 24px; border-radius: 4px"></span></span>
      </div>
    </div>
    <div class="skutiya" style="flex-direction: row; align-items: center; gap: 12px">
      <span class="setiket" style="margin: 0">Журналът днес</span>
      <span class="sivo stekst" style="flex-grow: 1"></span>
    </div>
  </div>
  <p class="kompromis"><b>За:</b> отваряш и знаеш какво да правиш; най-краткият път от въпрос до действие. <b>Против:</b> истината е на едно кликване разстояние, а не пред очите.</p>
</div>""",
    dop_css=SKITSA_CSS,
    script="""<script data-dc-script data-props='{"$preview":{"width":880,"height":560}}'>
class Component extends DCLogic {}
</script>""",
)

print('Готово.')
