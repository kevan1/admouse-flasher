// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import FirmwareFlasher from "../components/FirmwareFlasher";
import { flashMicronucleus } from "../lib/micronucleus";

vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => <img {...props} />,
}));

vi.mock("../lib/micronucleus", () => ({
  flashMicronucleus: vi.fn(),
}));

const mockedFlash = vi.mocked(flashMicronucleus);
const firmwareFixture = new Uint8Array([
  0x00, 0xc0, 0xff, 0xff,
  0x41, 0x44, 0x4d, 0x21,
  0x01, 0x01, 0x01, 0x01,
]);

function enableWebUsb() {
  Object.defineProperty(navigator, "usb", { configurable: true, value: {} });
}

describe("AdMouse configurator", () => {
  beforeEach(() => {
    Reflect.deleteProperty(navigator, "usb");
    vi.restoreAllMocks();
    mockedFlash.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("renders the brand and configures the single button from the virtual keyboard [AC-1, AC-2, AC-3, AC-4]", async () => {
    enableWebUsb();
    render(<FirmwareFlasher />);

    expect(screen.getByAltText("AdMouse")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "¿Qué querés que haga tu botón?" })).toBeTruthy();
    expect(screen.queryByText("Botón a configurar")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Teclado" }));
    fireEvent.click(screen.getByTitle("Flecha arriba"));

    expect(screen.getByText("Actual: Flecha arriba")).toBeTruthy();
  });

  test("explains when WebUSB is unavailable [AC-7]", async () => {
    render(<FirmwareFlasher />);
    expect(await screen.findByText("Abrí esta página en Chrome o Edge desde una computadora.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Configurar mi botón/ }).hasAttribute("disabled")).toBe(true);
  });

  test("preserves selections after an upload error and permits retry [AC-8]", async () => {
    enableWebUsb();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(firmwareFixture)));
    mockedFlash.mockRejectedValueOnce(new Error("El dispositivo no respondió."));
    render(<FirmwareFlasher />);

    fireEvent.click(screen.getByRole("button", { name: "Teclado" }));
    fireEvent.click(screen.getByTitle("Flecha arriba"));
    fireEvent.click(screen.getByRole("button", { name: /Configurar mi botón/ }));

    expect(await screen.findByText("El dispositivo no respondió.")).toBeTruthy();
    expect(screen.getByText("Actual: Flecha arriba")).toBeTruthy();

    mockedFlash.mockImplementationOnce(async (_firmware, onProgress) => {
      onProgress({ phase: "done", percentage: 100, message: "Tu botón quedó configurado." });
    });
    fireEvent.click(screen.getByRole("button", { name: /Configurar mi botón/ }));
    await waitFor(() => expect(screen.getByText("Tu botón quedó configurado.")).toBeTruthy());
  });
});
