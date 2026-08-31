const MICRONUCLEUS_VENDOR_ID = 0x16d0;
const MICRONUCLEUS_PRODUCT_ID = 0x0753;
const MAX_BOOTLOADER_MAJOR = 2;

type MicronucleusDevice = {
  usb: USBDevice;
  major: number;
  minor: number;
  flashSize: number;
  pageSize: number;
  pages: number;
  bootloaderStart: number;
  writeDelay: number;
  eraseDelay: number;
};

export type FlashProgress = {
  phase: "idle" | "connecting" | "erasing" | "writing" | "starting" | "done" | "error";
  percentage: number;
  message: string;
};

type PreparedUSBDevice = USBDevice & {
  configuration: {
    interfaces: Array<{
      interfaceNumber: number;
      claimed: boolean;
    }>;
  } | null;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function ensureTransfer(status: USBTransferStatus, operation: string) {
  if (status !== "ok") throw new Error(`${operation} falló (${status}).`);
}

async function prepareDevice(usb: USBDevice) {
  const device = usb as PreparedUSBDevice;
  if (!device.opened) await device.open();
  if (!device.configuration) await device.selectConfiguration(1);

  const usbInterface = device.configuration?.interfaces[0];
  if (usbInterface && !usbInterface.claimed) {
    await device.claimInterface(usbInterface.interfaceNumber);
  }
}

async function readDeviceInfo(usb: USBDevice): Promise<MicronucleusDevice> {
  await prepareDevice(usb);
  const major = usb.deviceVersionMajor;
  const minor = usb.deviceVersionMinor;
  if (major > MAX_BOOTLOADER_MAJOR) {
    throw new Error(`La versión Micronucleus ${major}.${minor} todavía no es compatible.`);
  }

  let result;
  try {
    result = await usb.controlTransferIn(
      { requestType: "vendor", recipient: "device", request: 0, value: 0, index: 0 },
      major >= 2 ? 8 : 4,
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "SecurityError") {
      throw new Error(
        "Chromium bloqueó la transferencia USB. Abrí esta página en Google Chrome o Microsoft Edge fuera del navegador integrado, cerrá Arduino IDE y volvé a conectar el botón en modo flash.",
      );
    }
    throw error;
  }
  ensureTransfer(result.status, "La lectura del dispositivo");
  if (!result.data || result.data.byteLength < 4) throw new Error("El botón no respondió como un dispositivo Micronucleus.");

  const data = new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
  const flashSize = (data[0] << 8) | data[1];
  const pageSize = data[2];
  const pages = Math.ceil(flashSize / pageSize);
  const writeDelay = (data[3] & 0x7f) + (major >= 2 ? 2 : 0);
  const eraseDelay = (data[3] & 0x80) !== 0 ? (writeDelay * pages) / 4 : writeDelay * pages;
  return { usb, major, minor, flashSize, pageSize, pages, bootloaderStart: pages * pageSize, writeDelay, eraseDelay };
}

function patchResetVector(firmware: Uint8Array, device: MicronucleusDevice): Uint8Array {
  if (firmware.length > device.flashSize) throw new Error("El firmware es demasiado grande para este ATtiny85.");
  const program = new Uint8Array(device.bootloaderStart).fill(0xff);
  program.set(firmware);
  if (device.major < 2) return program;

  const firstWord = program[0] | (program[1] << 8);
  const secondWord = program[2] | (program[3] << 8);
  let userReset: number;
  if (firstWord === 0x940c) userReset = secondWord;
  else if ((firstWord & 0xf000) === 0xc000) userReset = (firstWord & 0x0fff) + 1;
  else throw new Error("El firmware no contiene un vector de inicio AVR válido.");

  if (device.bootloaderStart > 0x2000) {
    program[0] = 0x0c;
    program[1] = 0x94;
    program[2] = device.bootloaderStart & 0xff;
    program[3] = (device.bootloaderStart >> 8) & 0xff;
  } else {
    const jump = 0xc000 | ((device.bootloaderStart / 2 - 1) & 0x0fff);
    program[0] = jump & 0xff;
    program[1] = (jump >> 8) & 0xff;
  }

  const userResetAddress = device.bootloaderStart - 4;
  if (userResetAddress > 0x2000) {
    program[userResetAddress] = 0x0c;
    program[userResetAddress + 1] = 0x94;
    program[userResetAddress + 2] = userReset & 0xff;
    program[userResetAddress + 3] = (userReset >> 8) & 0xff;
  } else {
    const jump = 0xc000 | ((userReset - userResetAddress / 2 - 1) & 0x0fff);
    program[userResetAddress] = jump & 0xff;
    program[userResetAddress + 1] = (jump >> 8) & 0xff;
  }
  return program;
}

async function erase(device: MicronucleusDevice) {
  try {
    const result = await device.usb.controlTransferOut({ requestType: "vendor", recipient: "device", request: 2, value: 0, index: 0 });
    ensureTransfer(result.status, "El borrado");
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "NetworkError")) throw error;
  }
  await sleep(Math.max(device.eraseDelay, 500));
}

async function writePage(device: MicronucleusDevice, address: number, page: Uint8Array) {
  if (device.major === 1) {
    const result = await device.usb.controlTransferOut(
      { requestType: "vendor", recipient: "device", request: 1, value: page.length, index: address },
      page,
    );
    ensureTransfer(result.status, "La escritura de una página");
    return;
  }

  const startResult = await device.usb.controlTransferOut({
    requestType: "vendor", recipient: "device", request: 1, value: page.length, index: address,
  });
  ensureTransfer(startResult.status, "El inicio de una página");
  for (let offset = 0; offset < page.length; offset += 4) {
    const firstWord = page[offset] | (page[offset + 1] << 8);
    const secondWord = page[offset + 2] | (page[offset + 3] << 8);
    const result = await device.usb.controlTransferOut({
      requestType: "vendor", recipient: "device", request: 3, value: firstWord, index: secondWord,
    });
    ensureTransfer(result.status, "La transferencia del firmware");
  }
}

export async function flashMicronucleus(
  firmware: Uint8Array,
  onProgress: (progress: FlashProgress) => void,
) {
  if (!("usb" in navigator)) throw new Error("Este navegador no admite WebUSB. Usá Chrome o Edge.");
  onProgress({ phase: "connecting", percentage: 3, message: "Elegí el dispositivo Micronucleus en Chrome." });
  const usb = await navigator.usb.requestDevice({
    filters: [{ vendorId: MICRONUCLEUS_VENDOR_ID, productId: MICRONUCLEUS_PRODUCT_ID }],
  });
  const device = await readDeviceInfo(usb);
  const program = patchResetVector(firmware, device);

  onProgress({ phase: "erasing", percentage: 8, message: "Preparando la memoria del botón..." });
  await erase(device);
  for (let address = 0; address < device.bootloaderStart; address += device.pageSize) {
    const page = program.slice(address, address + device.pageSize);
    const mustWrite = page.some((byte) => byte !== 0xff) || address >= device.bootloaderStart - device.pageSize;
    if (mustWrite) {
      await writePage(device, address, page);
      await sleep(device.writeDelay);
    }
    const percentage = 10 + Math.round(((address + device.pageSize) / device.bootloaderStart) * 86);
    onProgress({ phase: "writing", percentage, message: `Grabando configuración... ${Math.min(100, percentage)}%` });
  }

  onProgress({ phase: "starting", percentage: 98, message: "Iniciando el botón..." });
  const startResult = await device.usb.controlTransferOut({ requestType: "vendor", recipient: "device", request: 4, value: 0, index: 0 });
  ensureTransfer(startResult.status, "El inicio del firmware");
  if (device.usb.opened) await device.usb.close();
  onProgress({ phase: "done", percentage: 100, message: "Tu botón quedó configurado." });
}
