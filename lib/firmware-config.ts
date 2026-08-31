import { SUPPORTED_ACTION_IDS, type ActionId } from "./actions";

export const CONFIG_MARKER = new Uint8Array([0x41, 0x44, 0x4d, 0x21]);
const CONFIG_VERSION = 1;
const ACTION_COUNT = 1;

function findMarker(image: Uint8Array): number {
  let foundAt = -1;
  for (let offset = 0; offset <= image.length - CONFIG_MARKER.length; offset += 1) {
    const matches = CONFIG_MARKER.every((byte, index) => image[offset + index] === byte);
    if (!matches) continue;
    if (foundAt !== -1) throw new Error("More than one AdMouse configuration block was found.");
    foundAt = offset;
  }
  if (foundAt === -1) throw new Error("The AdMouse configuration block was not found in this firmware.");
  return foundAt;
}

export function patchFirmwareConfiguration(
  image: Uint8Array,
  action: ActionId,
): Uint8Array {
  const markerOffset = findMarker(image);
  const metadataOffset = markerOffset + CONFIG_MARKER.length;
  const actionsOffset = metadataOffset + 2;
  const checksumOffset = actionsOffset + ACTION_COUNT;

  if (checksumOffset >= image.length) throw new Error("The AdMouse configuration block is incomplete.");
  if (image[metadataOffset] !== CONFIG_VERSION) throw new Error("Unsupported AdMouse firmware format.");
  if (image[metadataOffset + 1] !== ACTION_COUNT) throw new Error("The firmware has an invalid action count.");

  if (!SUPPORTED_ACTION_IDS.has(action)) throw new Error(`Unsupported action ${action}.`);

  const patched = image.slice();
  patched[actionsOffset] = action;
  patched[checksumOffset] = action;

  const writtenChecksum = patched
    .slice(actionsOffset, checksumOffset)
    .reduce((sum, byte) => (sum + byte) & 0xff, 0);
  if (writtenChecksum !== patched[checksumOffset]) throw new Error("Firmware configuration checksum failed.");
  return patched;
}
