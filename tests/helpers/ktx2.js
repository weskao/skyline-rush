// KTX 2.0 header fields the asset manifests pin: spec 3.1 (header) and 3.10 (basic data format descriptor).
export const KTX2_MAGIC = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);
const TRANSFER = { 1: 'linear', 2: 'srgb' };

export function ktx2(buffer) {
  const dfd = buffer.readUInt32LE(48);
  return {
    magic: buffer.subarray(0, 12), vkFormat: buffer.readUInt32LE(12), width: buffer.readUInt32LE(20), height: buffer.readUInt32LE(24),
    levels: buffer.readUInt32LE(40), supercompression: buffer.readUInt32LE(44),
    colorModel: buffer.readUInt8(dfd + 12), transfer: TRANSFER[buffer.readUInt8(dfd + 14)],
  };
}
