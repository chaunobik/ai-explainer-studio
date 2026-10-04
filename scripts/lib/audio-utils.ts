import crypto from "node:crypto";
import fs from "node:fs";

export function sha256(filePath: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

export function wavDurationSeconds(filePath: string): number {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error(`Not a RIFF WAV file: ${filePath}`);
  }

  let offset = 12;
  let sampleRate = 0;
  let byteRate = 0;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const declared = buffer.readUInt32LE(offset + 4);
    const actualRemaining = Math.max(0, buffer.length - (offset + 8));
    const size = Math.min(declared, actualRemaining);

    if (id === "fmt " && size >= 16) {
      sampleRate = buffer.readUInt32LE(offset + 12);
      byteRate = buffer.readUInt32LE(offset + 16);
    }
    if (id === "data") {
      dataOffset = offset + 8;
      dataSize =
        declared === 0xffffffff || declared > actualRemaining
          ? actualRemaining
          : declared;
      break;
    }
    offset += 8 + size + (size % 2);
  }

  if (dataOffset < 0 || byteRate <= 0 || sampleRate <= 0) {
    throw new Error(`Unable to determine WAV duration: ${filePath}`);
  }

  return dataSize / byteRate;
}
