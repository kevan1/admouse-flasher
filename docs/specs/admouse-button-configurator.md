# AdMouse Button Configurator

## Problem

AdMouse users need a guided, accessible way to assign keyboard or mouse actions
to a single-button ATtiny85 controller and install the configured firmware from a
Chromium browser. The current ESP32-oriented upload form does not support the
Micronucleus bootloader used by the supplied `DigiMouse` firmware.

## Decisions

- Target the supplied Digispark-compatible ATtiny85 controller.
- Configure its single physical button connected to pin 0.
- Offer common mouse clicks and keyboard keys through a visual picker.
- Patch a small, uniquely marked configuration block in a precompiled firmware
  image; compilation never happens in the browser.
- Upload with the Micronucleus v1/v2 vendor protocol through WebUSB.
- Keep the whole flow client-side. No user selection or firmware is uploaded to
  an AdMouse server.
- Require desktop Chromium and HTTPS (localhost is accepted for development).

## Acceptance Criteria

- [AC-1] The page uses AdMouse branding and Spanish user-facing copy.
- [AC-2] A user configures the single physical input P0 without choosing a button number.
- [AC-3] A user can choose mouse or keyboard mode through a visual mouse/keyboard.
- [AC-4] The selected actions are summarized before flashing.
- [AC-5] The firmware patcher validates the marker, format version, action count, and
  checksum before returning a configured image.
- [AC-6] The browser requests a Micronucleus USB device, erases writable flash, writes
  the configured firmware with progress, and starts the application.
- [AC-7] Unsupported browsers and insecure contexts receive a clear explanation.
- [AC-8] Errors do not discard the user's current configuration and can be retried.

## Non-goals

- ESP32 flashing in this product-specific screen.
- Firmware compilation in the browser.
- Arbitrary macros or text injection.
- Mobile browser support.
- Bootloader installation or recovery over ISP.

## Verification

- Unit tests cover successful configuration patching, missing markers, invalid
  actions, and checksum generation.
- Typecheck and production build complete successfully.
- A hardware smoke test confirms detection, erase, write, restart, and the single
  configured actions on a Micronucleus ATtiny85 device.
