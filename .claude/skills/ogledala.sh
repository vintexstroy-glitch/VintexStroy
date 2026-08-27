#!/bin/bash
# ОГЛЕДАЛАТА · сверява уменията в хранилището срещу МЕСТНИЯ им кеш
# и ги опакова за качване.
#
# Каноничното е ТУК, в хранилището. В claude.ai стои огледало — за да работят
# уменията и в чатовете извън Клод Код, и за да се виждат в падащото меню.
# Огледалото НЕ се редактира на място. Разлика → каноничното печели.
#
# ДОКЪДЕ СТИГА И КЪДЕ СПИРА · честно, защото името лъже иначе:
# сравнява се с `$HOME/.claude/skills/synced` — това е КЕШЪТ на средата, не
# самото claude.ai. Тоест обходът вижда „каквото е било качено оттук", а НЕ
# качване или триене, направено от човек направо в claude.ai. „✓ сверено"
# значи „местният кеш съвпада", не „в claude.ai стои същото".
#
# Платено на 26.08: един коммит обяви огледалото на `refresh` за изостанало,
# то беше качено ръчно, и оттам нататък обходът връщаше „✓ сверено" — вярно за
# кеша, безполезно като отговор на въпроса „качено ли е". Обход, който лъже, е
# по-скъп от липсващ (ADR-051).
#
#   ./ogledala.sh          сверява и казва кое е изостанало
#   ./ogledala.sh opakovai опакова изостаналите в zip за качване
#   ./ogledala.sh vsichki  опакова ВСИЧКИ, независимо дали са изостанали

set -uo pipefail
cd "$(dirname "$0")"

SINHRONIZIRANI="${HOME}/.claude/skills/synced"
IZHOD="${IZHOD:-/tmp}"
rezhim="${1:-sveri}"

izostanali=()
for papka in */; do
  ime="${papka%/}"
  [ -f "$ime/SKILL.md" ] || continue

  ogledalo="$SINHRONIZIRANI/$ime"
  if [ ! -d "$ogledalo" ]; then
    echo "  ✗ $ime · НЯМА го в claude.ai"
    izostanali+=("$ime")
  elif diff -rq "$ogledalo" "$ime" > /dev/null 2>&1; then
    echo "  ✓ $ime · сверено"
  else
    echo "  ✗ $ime · ИЗОСТАНАЛО в claude.ai"
    izostanali+=("$ime")
  fi
done

# Правило 7: разликата се ЗАПИСВА, дори когато е нула — затова и двата изхода
# си имат затварящ ред. И правило „обход, който не може да се спъне, е надпис":
# `sveri` връща НЕНУЛА при изостанали, за да може CI да се препъне в тях.
if [ "$rezhim" = "sveri" ]; then
  echo ""
  if [ ${#izostanali[@]} -eq 0 ]; then
    echo "Огледалата са сверени. Разликата е нула — и това се записва."
    exit 0
  fi
  echo "Изостанали: ${#izostanali[@]} — ${izostanali[*]}"
  echo "Опаковай ги с: $0 opakovai"
  echo "После, в claude.ai: ПЪРВО изтрий старото, чак после качи новото."
  exit 1
fi

zaopakovane=("${izostanali[@]}")
[ "$rezhim" = "vsichki" ] && { zaopakovane=(); for p in */; do [ -f "${p%/}/SKILL.md" ] && zaopakovane+=("${p%/}"); done; }
[ ${#zaopakovane[@]} -eq 0 ] && { echo ""; echo "Няма какво да се опакова."; exit 0; }

echo ""
for ime in "${zaopakovane[@]}"; do
  rm -f "$IZHOD/$ime.zip"
  zip -rq "$IZHOD/$ime.zip" "$ime" -x '*.DS_Store' && echo "  → $IZHOD/$ime.zip"
done
