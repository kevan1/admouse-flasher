#include <avr/pgmspace.h>
#include <TrinketHidCombo.h>

enum Action : uint8_t {
  ACTION_NONE = 0, MOUSE_LEFT = 1, MOUSE_RIGHT = 2, MOUSE_MIDDLE = 3, MOUSE_DOUBLE = 4,
  KEY_ENTER = 16, KEY_SPACE = 17, KEY_TAB = 18, KEY_ESCAPE = 19, KEY_BACKSPACE = 20,
  KEY_UP = 21, KEY_DOWN = 22, KEY_LEFT = 23, KEY_RIGHT = 24, KEY_COPY = 25, KEY_PASTE = 26,
};

const uint8_t buttonPin = 0;
bool previousState = HIGH;
unsigned long changedAt = 0;
const unsigned long debounceMs = 50;

// The web app locates ADM!, validates version/count, and patches the actions and checksum.
const uint8_t firmwareConfiguration[] PROGMEM __attribute__((used, section(".admouse_config"))) = {
  0x41, 0x44, 0x4d, 0x21, 0x01, 0x01,
  MOUSE_LEFT,
  MOUSE_LEFT,
};

void serviceUsb(unsigned long durationMs) {
  const unsigned long startedAt = millis();
  while (millis() - startedAt < durationMs) { TrinketHidCombo.poll(); delay(1); }
}

void mouseClick(uint8_t mask) {
  TrinketHidCombo.mouseMove(0, 0, mask);
  serviceUsb(45);
  TrinketHidCombo.mouseMove(0, 0, 0);
}

void keyboardPress(uint8_t modifier, uint8_t keycode) {
  TrinketHidCombo.pressKey(modifier, keycode);
  serviceUsb(45);
  TrinketHidCombo.pressKey(0, 0);
}

void performAction(uint8_t action) {
  switch (action) {
    case MOUSE_LEFT: mouseClick(MOUSEBTN_LEFT_MASK); break;
    case MOUSE_RIGHT: mouseClick(MOUSEBTN_RIGHT_MASK); break;
    case MOUSE_MIDDLE: mouseClick(MOUSEBTN_MIDDLE_MASK); break;
    case MOUSE_DOUBLE: mouseClick(MOUSEBTN_LEFT_MASK); serviceUsb(90); mouseClick(MOUSEBTN_LEFT_MASK); break;
    case KEY_ENTER: keyboardPress(0, KEYCODE_ENTER); break;
    case KEY_SPACE: keyboardPress(0, KEYCODE_SPACE); break;
    case KEY_TAB: keyboardPress(0, KEYCODE_TAB); break;
    case KEY_ESCAPE: keyboardPress(0, KEYCODE_ESC); break;
    case KEY_BACKSPACE: keyboardPress(0, KEYCODE_BACKSPACE); break;
    case KEY_UP: keyboardPress(0, KEYCODE_ARROW_UP); break;
    case KEY_DOWN: keyboardPress(0, KEYCODE_ARROW_DOWN); break;
    case KEY_LEFT: keyboardPress(0, KEYCODE_ARROW_LEFT); break;
    case KEY_RIGHT: keyboardPress(0, KEYCODE_ARROW_RIGHT); break;
    case KEY_COPY: keyboardPress(KEYCODE_MOD_LEFT_CONTROL, KEYCODE_C); break;
    case KEY_PASTE: keyboardPress(KEYCODE_MOD_LEFT_CONTROL, KEYCODE_V); break;
    default: break;
  }
}

bool configurationIsValid() {
  return pgm_read_byte(&firmwareConfiguration[6]) == pgm_read_byte(&firmwareConfiguration[7]);
}

void setup() {
  TrinketHidCombo.begin();
  pinMode(buttonPin, INPUT_PULLUP);
}

void loop() {
  TrinketHidCombo.poll();
  const bool currentState = digitalRead(buttonPin);
  if (configurationIsValid() && previousState == HIGH && currentState == LOW && millis() - changedAt > debounceMs) {
    performAction(pgm_read_byte(&firmwareConfiguration[6]));
    changedAt = millis();
  }
  previousState = currentState;
  delay(1);
}
