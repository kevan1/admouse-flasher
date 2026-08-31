#!/usr/bin/env bash
set -euo pipefail

readonly DIGISTUMP_INDEX="https://raw.githubusercontent.com/ArminJo/DigistumpArduino/master/package_digistump_index.json"
readonly TRINKET_COMMIT="51f208bc569dd79d7357f16d548ed0c43f4927e8"
readonly PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly BUILD_TMP="$(mktemp -d)"

arduino-cli core update-index --additional-urls "$DIGISTUMP_INDEX"
arduino-cli core install digistump:avr --additional-urls "$DIGISTUMP_INDEX"

curl -L --fail --max-time 30 -s \
  "https://github.com/adafruit/Adafruit-Trinket-USB/archive/${TRINKET_COMMIT}.zip" \
  -o "$BUILD_TMP/trinket.zip"
unzip -q "$BUILD_TMP/trinket.zip" -d "$BUILD_TMP"

arduino-cli compile \
  --fqbn digistump:avr:digispark-tiny \
  --libraries "$BUILD_TMP/Adafruit-Trinket-USB-${TRINKET_COMMIT}" \
  --output-dir "$BUILD_TMP/build" \
  "$PROJECT_DIR/firmware/AdMouseController"

mkdir -p "$PROJECT_DIR/public/firmware"
ARDUINO_DATA_PATH="$(arduino-cli config get directories.data)"
AVR_OBJCOPY="$(find "$ARDUINO_DATA_PATH/packages/arduino/tools/avr-gcc" -type f -name avr-objcopy -print -quit)"
"$AVR_OBJCOPY" -I ihex -O binary \
  "$BUILD_TMP/build/AdMouseController.ino.hex" \
  "$PROJECT_DIR/public/firmware/admouse-controller.bin"

echo "Firmware generated at public/firmware/admouse-controller.bin"
