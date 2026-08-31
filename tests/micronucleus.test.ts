// @vitest-environment jsdom

import { expect, test, vi } from "vitest";

import { flashMicronucleus, type FlashProgress } from "../lib/micronucleus";

test("erases, writes, reports progress, and starts a Micronucleus v2 device [AC-6]", async () => {
  const requests: number[] = [];
  const info = new Uint8Array([0x00, 0x80, 0x40, 0x01, 0x00, 0x00, 0x00, 0x00]);
  const fakeDevice = {
    deviceVersionMajor: 2,
    deviceVersionMinor: 6,
    opened: false,
    open: vi.fn(async function (this: { opened: boolean }) { this.opened = true; }),
    close: vi.fn(async function (this: { opened: boolean }) { this.opened = false; }),
    controlTransferIn: vi.fn(async () => ({ data: new DataView(info.buffer), status: "ok" as const })),
    controlTransferOut: vi.fn(async (setup: USBControlTransferParameters) => {
      requests.push(setup.request);
      return { bytesWritten: 0, status: "ok" as const };
    }),
  } as unknown as USBDevice;

  Object.defineProperty(navigator, "usb", {
    configurable: true,
    value: { requestDevice: vi.fn().mockResolvedValue(fakeDevice) },
  });

  const firmware = new Uint8Array(16).fill(0xff);
  firmware[0] = 0x00;
  firmware[1] = 0xc0;
  const progress: FlashProgress[] = [];
  await flashMicronucleus(firmware, (update) => progress.push(update));

  expect(requests).toContain(2);
  expect(requests).toContain(1);
  expect(requests).toContain(3);
  expect(requests.at(-1)).toBe(4);
  expect(progress.at(-1)).toEqual({ phase: "done", percentage: 100, message: "Tu botón quedó configurado." });
});
