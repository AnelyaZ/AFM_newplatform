#!/bin/bash
# Скрипт для скачивания всех PDF материалов со старой платформы АФМ
# https://arm.ser.afm.gov.kz/static/

BASE_URL="https://arm.ser.afm.gov.kz/static"
OUT_DIR="$(dirname "$0")/../backend/uploads/old-platform"

mkdir -p "$OUT_DIR/methods"
mkdir -p "$OUT_DIR/norms"
mkdir -p "$OUT_DIR/samples"
mkdir -p "$OUT_DIR/algorithms"
mkdir -p "$OUT_DIR/other"

echo "=== Скачивание PDF с arm.ser.afm.gov.kz ==="
echo "Папка: $OUT_DIR"
echo ""

# Нормативно-правовые документы (norm)
NORMS=(
  norm1.37a9a366.pdf
  norm2.d3ecd7f3.pdf
  norm3.a0a3cc7a.pdf
  norm4.6ab03320.pdf
  norm5.d09ece07.pdf
)

echo "--- Нормативные документы ---"
for f in "${NORMS[@]}"; do
  echo "  Скачиваю $f ..."
  curl -sS -o "$OUT_DIR/norms/$f" "$BASE_URL/$f" && echo "    OK" || echo "    ОШИБКА"
done

# Методики (met)
METHODS=(
  met1.b86333e7.pdf
  met2.93348a19.pdf
  met3.0aa8b1c2.pdf
  met4.ec748601.pdf
  met5.9fb48ce4.pdf
  met6.0e245b18.pdf
  met7.95428149.pdf
  met11.c9f5f135.pdf
  met22kaz.2af5029f.pdf
  met22rus.7f0129a6.pdf
  met189_190_1rus.ba596979.pdf
  met189_190_1kaz.2550d228.pdf
  met214rus.2a0600e5.pdf
  met214kaz.b7e5eee9.pdf
  met214pril1rus.2c8a722c.pdf
  met214pril1kaz.0352c3dc.pdf
  met214pril2rus.10dacb21.pdf
  met214pril2kaz.07ab80a2.pdf
  met216_methodology.1904e9cf.pdf
  met217rus.b7f17863.pdf
  met217Kaz.4d9502c1.pdf
  met231rus.fc9a1ff9.pdf
  met231kaz.40af1cdc.pdf
  met234_236rus.aa2adecf.pdf
  met234_236kaz.3a0bbd99.pdf
  met286rus.a175cc5a.pdf
  met286kaz.27bd4244.pdf
  met307.886bae32.pdf
  met_eag_podft.74df9f41.pdf
  MetPfr.fe3b897f.pdf
  MetPfrKaz.d9c068d4.pdf
  meta2.d0c0e783.pdf
)

echo ""
echo "--- Методики ---"
for f in "${METHODS[@]}"; do
  echo "  Скачиваю $f ..."
  curl -sS -o "$OUT_DIR/methods/$f" "$BASE_URL/$f" && echo "    OK" || echo "    ОШИБКА"
done

# Образцы уголовно-процессуальных документов (obrpros)
SAMPLES=(
  obrPros.416f58bf.pdf
  obrpros1.c48248c4.pdf
  obrpros2.5c112111.pdf
  obrpros3.605938f0.pdf
  obrpros4.aeb1a42f.pdf
  obrpros5.cec5edcd.pdf
  obrpros6.3c9dc2d2.pdf
  obrpros7.f44fbb68.pdf
  obrpros8.f387cb15.pdf
  obrpros9.09c58ae9.pdf
  obrpros10.bc1ae081.pdf
  obrpros11.61d51380.pdf
  obrpros12.b0b8a5b9.pdf
  obrpros13.75ac401c.pdf
  obrpros14.9773fe0b.pdf
  obrpros15.0c6c17d1.pdf
  obrpros16.24d01967.pdf
  obrpros17.c51fac23.pdf
  obrpros18.40f261f7.pdf
  obrpros19.8369d920.pdf
)

echo ""
echo "--- Образцы документов ---"
for f in "${SAMPLES[@]}"; do
  echo "  Скачиваю $f ..."
  curl -sS -o "$OUT_DIR/samples/$f" "$BASE_URL/$f" && echo "    OK" || echo "    ОШИБКА"
done

# Алгоритмы (alg)
ALGOS=(
  algobsh.89e4cd41.pdf
  algoigroRus.b5bc6097.pdf
  algoigroKaz.a1d639ba.pdf
  algg.9711d002.pdf
  alg307.adb14850.pdf
  alcasi.ebbb863e.pdf
)

echo ""
echo "--- Алгоритмы ---"
for f in "${ALGOS[@]}"; do
  echo "  Скачиваю $f ..."
  curl -sS -o "$OUT_DIR/algorithms/$f" "$BASE_URL/$f" && echo "    OK" || echo "    ОШИБКА"
done

# Прочие файлы
OTHER=(
  pril286rus.7c928439.pdf
  pril286kaz.dcb9e052.pdf
  diff.63987624.pdf
  soglasie-na-ispolzovaniya-is.6fe9a1cb.pdf
  pravila-dostupa.c59d0e9b.pdf
)

echo ""
echo "--- Прочие ---"
for f in "${OTHER[@]}"; do
  echo "  Скачиваю $f ..."
  curl -sS -o "$OUT_DIR/other/$f" "$BASE_URL/$f" && echo "    OK" || echo "    ОШИБКА"
done

TOTAL=$(find "$OUT_DIR" -name "*.pdf" | wc -l)
echo ""
echo "=== Готово! Скачано файлов: $TOTAL ==="
echo "Файлы в: $OUT_DIR"
