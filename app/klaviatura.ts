/**
 * КЛАВИАТУРНАТА КАРТА · движението на Excel върху таблиците.
 *
 * По това счетоводителят познава „истински Excel" срещу „уеб форма": ръцете
 * не посягат към мишката. Картата е неговата (И58 · ADR-022 · вълна 2):
 *
 *   клик           избира клетка
 *   стрелки        местят селекцията
 *   Enter          надолу (как се въвежда колона от числа)
 *   Tab            надясно · Shift+Tab обратно
 *   Ctrl+стрелка   до РЪБА на таблицата — първият/последният ред или колона
 *   Home / End     началото / краят на реда
 *   Escape         маха селекцията
 *
 * ГРАНИЦАТА: когато фокусът е в поле, изборник или бутон, картата МЪЛЧИ —
 * формите са си форми и стрелките там местят курсора в текста, не клетки.
 *
 * Селекцията е ЕКРАННА и умира с прерисуването — тя не е състояние, което
 * се помни, а поглед, който се движи. Редакция в клетката още няма (вълна 3);
 * днес картата е за ГЛЕДАНЕ и за жестовете, които идват върху селекция:
 * сборовете в статус-лентата и груповите действия стъпват точно тук.
 */

const ZNAK = 'kletka-izbrana';

interface Izbrana {
  readonly tablitsa: HTMLElement;
  red: number;
  kolona: number;
}

let izbrana: Izbrana | null = null;

/** Редовете с данни на една таблица — главата не е ред за селекция. */
function redoveNa(tablitsa: HTMLElement): HTMLElement[] {
  return [...tablitsa.querySelectorAll<HTMLElement>('.red')];
}

/** Клетките на един ред · преките деца; бутоните в края също са „клетка". */
function kletkiNa(red: HTMLElement): HTMLElement[] {
  return [...red.children] as HTMLElement[];
}

function mahniZnaka(): void {
  document.querySelector(`.${ZNAK}`)?.classList.remove(ZNAK);
}

/** Слага знака и докарва клетката в очите — както Excel държи активната видима. */
function pokazhi(): void {
  mahniZnaka();
  if (!izbrana) return;
  const red = redoveNa(izbrana.tablitsa)[izbrana.red];
  if (!red) {
    izbrana = null;
    return;
  }
  const kletki = kletkiNa(red);
  izbrana.kolona = Math.min(izbrana.kolona, kletki.length - 1);
  const kletka = kletki[izbrana.kolona];
  if (!kletka) return;
  kletka.classList.add(ZNAK);
  kletka.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** Пишещ ли е фокусът · там картата мълчи и формата си работи. */
function fokusVPole(): boolean {
  const e = document.activeElement;
  return (
    e instanceof HTMLInputElement ||
    e instanceof HTMLTextAreaElement ||
    e instanceof HTMLSelectElement ||
    (e instanceof HTMLElement && e.isContentEditable)
  );
}

let zakacheno = false;

export function zakachiKlaviatura(koren: HTMLElement): void {
  if (zakacheno) return;
  zakacheno = true;

  // Кликът избира · делегирано, за да живее през всички прерисувания.
  koren.addEventListener('click', (e) => {
    const kletka = (e.target as HTMLElement).closest<HTMLElement>('.red > *');
    if (!kletka || (e.target as HTMLElement).closest('button, a, input, select')) return;
    const red = kletka.parentElement as HTMLElement;
    const tablitsa = red.closest<HTMLElement>('.tablitsa');
    if (!tablitsa) return;
    izbrana = {
      tablitsa,
      red: redoveNa(tablitsa).indexOf(red),
      kolona: kletkiNa(red).indexOf(kletka),
    };
    pokazhi();
  });

  document.addEventListener('keydown', (e) => {
    if (!izbrana || fokusVPole()) return;
    if (!izbrana.tablitsa.isConnected) {
      // Прерисуването е сменило екрана под селекцията — тя си отива тихо.
      izbrana = null;
      return;
    }

    const redove = redoveNa(izbrana.tablitsa);
    const kletki = kletkiNa(redove[izbrana.red] ?? redove[0]!);
    const posledenRed = redove.length - 1;
    const poslednaKolona = kletki.length - 1;

    // Ctrl+стрелка скача до ръба — движението на Excel през блока данни.
    const doRaba = e.ctrlKey || e.metaKey;

    let hvanato = true;
    switch (e.key) {
      case 'ArrowDown':
        izbrana.red = doRaba ? posledenRed : Math.min(izbrana.red + 1, posledenRed);
        break;
      case 'ArrowUp':
        izbrana.red = doRaba ? 0 : Math.max(izbrana.red - 1, 0);
        break;
      case 'ArrowRight':
        izbrana.kolona = doRaba ? poslednaKolona : Math.min(izbrana.kolona + 1, poslednaKolona);
        break;
      case 'ArrowLeft':
        izbrana.kolona = doRaba ? 0 : Math.max(izbrana.kolona - 1, 0);
        break;
      case 'Enter':
        izbrana.red = Math.min(izbrana.red + 1, posledenRed);
        break;
      case 'Tab':
        if (e.shiftKey) {
          if (izbrana.kolona > 0) izbrana.kolona -= 1;
          else if (izbrana.red > 0) {
            izbrana.red -= 1;
            izbrana.kolona = poslednaKolona;
          }
        } else if (izbrana.kolona < poslednaKolona) izbrana.kolona += 1;
        else if (izbrana.red < posledenRed) {
          // Краят на реда прелива в началото на следващия — както в Excel.
          izbrana.red += 1;
          izbrana.kolona = 0;
        }
        break;
      case 'Home':
        izbrana.kolona = 0;
        if (doRaba) izbrana.red = 0;
        break;
      case 'End':
        izbrana.kolona = poslednaKolona;
        if (doRaba) izbrana.red = posledenRed;
        break;
      case 'Escape':
        izbrana = null;
        mahniZnaka();
        return;
      default:
        hvanato = false;
    }
    if (!hvanato) return;
    e.preventDefault(); // иначе стрелките скролват страницата под селекцията
    pokazhi();
  });
}
