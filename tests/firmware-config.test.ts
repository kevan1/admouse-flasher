import assert from "node:assert/strict";
import test from "node:test";

import {
  CONFIG_MARKER,
  patchFirmwareConfiguration,
} from "../lib/firmware-config";
import type { ActionId } from "../lib/actions";

function fixture(): Uint8Array {
  return new Uint8Array([
    0x00,
    0x11,
    ...CONFIG_MARKER,
    0x01,
    0x01,
    0x01,
    0x00,
    0xee,
  ]);
}

test("patches the single action byte and writes its checksum [AC-5]", () => {
  const original = fixture();
  const patched = patchFirmwareConfiguration(original, 0x10);

  assert.deepEqual(
    Array.from(patched.slice(8, 10)),
    [0x10, 0x10],
  );
  assert.deepEqual(Array.from(original.slice(8, 10)), [0x01, 0x00]);
});

test("rejects firmware without the AdMouse configuration marker [AC-5]", () => {
  assert.throws(
    () => patchFirmwareConfiguration(new Uint8Array([1, 2, 3]), 1),
    /configuration block was not found/i,
  );
});

test("rejects an action outside the firmware action table [AC-5]", () => {
  assert.throws(
    () => patchFirmwareConfiguration(fixture(), 0xff as ActionId),
    /unsupported action/i,
  );
});
