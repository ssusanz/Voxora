#!/usr/bin/env bash
# Compile docs/latex/voxora-architecture.tex and export Figure 1–3 as PNGs (page1=deploy, page2=technical, page3=iterations)
# (high-DPI rasters for Premiere / ffmpeg). Optionally writes SVG if pdftocairo exists.
#
# Usage:
#   ./scripts/export-architecture-figures.sh
# Env:
#   ARCH_EXPORT_DPI  raster DPI (default 200)
#   ARCH_EXPORT_SVG  set to 0 to skip SVG even when pdftocairo is installed (default: try SVG)
#
# Output:
#   docs/latex/voxora-architecture.pdf (3 pages, vector TikZ)
#   docs/latex/exports/arch-figure-1.png … arch-figure-3.png (from PDF pages 1--3; higher DPI for video / raster print)
#   docs/latex/exports/arch-figure-1.svg … (when pdftocairo available and not skipped)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LATEX_DIR="$ROOT/docs/latex"
PDF="$LATEX_DIR/voxora-architecture.pdf"
OUT="$LATEX_DIR/exports"
DPI="${ARCH_EXPORT_DPI:-200}"
WANT_SVG="${ARCH_EXPORT_SVG:-1}"

mkdir -p "$OUT"

echo "==> pdflatex $PDF"
(cd "$LATEX_DIR" && pdflatex -interaction=nonstopmode voxora-architecture.tex >/dev/null)

if [[ ! -f "$PDF" ]]; then
  echo "error: missing $PDF" >&2
  exit 1
fi

TMP_PREFIX="$OUT/.arch-ppm-tmp"
rm -f "$TMP_PREFIX"-*.png 2>/dev/null || true

echo "==> PNG (pdftoppm, ${DPI} DPI, pages 1–3)"
pdftoppm -png -r "$DPI" -f 1 -l 3 "$PDF" "$TMP_PREFIX"

for i in 1 2 3; do
  ii=$(printf '%02d' "$i")
  src=""
  if [[ -f "$TMP_PREFIX-${ii}.png" ]]; then
    src="$TMP_PREFIX-${ii}.png"
  elif [[ -f "$TMP_PREFIX-${i}.png" ]]; then
    src="$TMP_PREFIX-${i}.png"
  fi
  if [[ -z "$src" || ! -f "$src" ]]; then
    echo "error: missing ${TMP_PREFIX}-${ii}.png or ${TMP_PREFIX}-${i}.png (pdftoppm naming differs?)" >&2
    ls -la "$OUT" >&2 || true
    exit 1
  fi
  mv -f "$src" "$OUT/arch-figure-${i}.png"
done

echo "==> Wrote $OUT/arch-figure-{1,2,3}.png"
ls -la "$PDF"

if [[ "$WANT_SVG" == "0" ]]; then
  echo "==> Skip SVG (ARCH_EXPORT_SVG=0)"
  ls -la "$OUT"/arch-figure-*.png
  exit 0
fi

if command -v pdftocairo >/dev/null 2>&1; then
  echo "==> SVG (pdftocairo — some builds omit “.svg”; normalize to arch-figure-N.svg)"
  for i in 1 2 3; do
    tmp="$OUT/.arch-svg-$i"
    rm -f "$tmp" "$OUT/arch-figure-${i}.svg"
    pdftocairo -svg -f "$i" -l "$i" "$PDF" "$tmp"
    if [[ -f "$tmp" ]]; then
      mv -f "$tmp" "$OUT/arch-figure-${i}.svg"
    elif [[ -f "${tmp}.svg" ]]; then
      mv -f "${tmp}.svg" "$OUT/arch-figure-${i}.svg"
    else
      echo "warning: pdftocairo did not write $tmp for page $i" >&2
    fi
  done
  ls -la "$OUT"/arch-figure-1.png "$OUT"/arch-figure-1.svg 2>/dev/null || ls -la "$OUT"/arch-figure-*.png
else
  echo "note: pdftocairo not in PATH — install poppler (e.g. brew install poppler) for SVG export."
  ls -la "$OUT"/arch-figure-*.png
fi
