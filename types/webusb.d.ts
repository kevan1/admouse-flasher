type USBTransferStatus = "ok" | "stall" | "babble";

type USBControlTransferParameters = {
  requestType: "standard" | "class" | "vendor";
  recipient: "device" | "interface" | "endpoint" | "other";
  request: number;
  value: number;
  index: number;
};

interface USBInTransferResult { data?: DataView; status: USBTransferStatus; }
interface USBOutTransferResult { bytesWritten: number; status: USBTransferStatus; }
interface USBDevice {
  deviceVersionMajor: number;
  deviceVersionMinor: number;
  opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>;
  controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult>;
}
interface USBDeviceFilter { vendorId?: number; productId?: number; }
interface USB { requestDevice(options: { filters: USBDeviceFilter[] }): Promise<USBDevice>; }
interface Navigator { usb: USB; }
