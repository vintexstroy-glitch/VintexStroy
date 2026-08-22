#!/bin/bash
# ОГЛЕДАЛАТА · сверява уменията в хранилището срещу копията им в claude.ai
# и ги опакова за качване.
#
# Каноничното е ТУК, в хранилището. В claude.ai стои огледало — за да работят
# уменията и в чатовете извън Клод Код, и за да се виждат в падащото меню.
# Огледалото НЕ се редактира на място. Разлика → каноничното печели.
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

[ "$rezhim" = "sveri" ] && {
  [ ${#izostanali[@]} -eq 0 ] && echo "" && echo "Огледалата са сверени. Разликата е нула — и това се записва."
  exit 0
}

zaopakovane=("${izostanali[@]}")
[ "$rezhim" = "vsichki" ] && { zaopakovane=(); for p in */; do [ -f "${p%/}/SKILL.md" ] && zaopakovane+=("${p%/}"); done; }
[ ${#zaopakovane[@]} -eq 0 ] && { echo ""; echo "Няма какво да се опакова."; exit 0; }

echo ""
for ime in "${zaopakovane[@]}"; do
  rm -f "$IZHOD/$ime.zip"
  zip -rq "$IZHOD/$ime.zip" "$ime" -x '*.DS_Store' && echo "  → $IZHOD/$ime.zip"
done
