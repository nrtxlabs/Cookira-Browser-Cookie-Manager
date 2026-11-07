import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function renderCookiraIconRgba(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const center = (size - 1) / 2;
  const maxCorner = size * 0.2;
  const innerMargin = size * 0.08;
  const cookieRadius = size * 0.31;
  const biteX = center + size * 0.21;
  const biteY = center - size * 0.21;
  const biteRadius = size * 0.14;

  const chips = [
    [-0.12, -0.06, 0.055],
    [-0.08, 0.14, 0.055],
    [0.09, 0.11, 0.05],
    [0.01, -0.17, 0.045],
  ];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4;
      const dxEdge = Math.max(0, Math.abs(x - center) - (size / 2 - maxCorner));
      const dyEdge = Math.max(0, Math.abs(y - center) - (size / 2 - maxCorner));
      const cornerDist = Math.hypot(dxEdge, dyEdge);

      if (cornerDist > maxCorner) {
        pixels[idx + 3] = 0;
        continue;
      }

      const isBorder =
        x < innerMargin ||
        x > size - 1 - innerMargin ||
        y < innerMargin ||
        y > size - 1 - innerMargin ||
        cornerDist > maxCorner - Math.max(1, size * 0.055);

      const distCookie = Math.hypot(x - center, y - center);
      const distBite = Math.hypot(x - biteX, y - biteY);
      const inCookie = distCookie <= cookieRadius && distBite > biteRadius;
      const onCookieRim =
        inCookie && (distCookie >= cookieRadius - Math.max(1.2, size * 0.055) || distBite <= biteRadius + Math.max(1.2, size * 0.045));

      let inChip = false;
      for (const [cx, cy, cr] of chips) {
        if (Math.hypot(x - (center + cx * size), y - (center + cy * size)) <= cr * size) {
          inChip = true;
          break;
        }
      }

      if (isBorder) {
        // Neon cyan frame (#22d3ee)
        pixels[idx] = 34;
        pixels[idx + 1] = 211;
        pixels[idx + 2] = 238;
        pixels[idx + 3] = 255;
      } else if (onCookieRim || inChip) {
        // Bright cyan/emerald terminal accent (#22d3ee / #34d399)
        pixels[idx] = inChip ? 52 : 34;
        pixels[idx + 1] = 211;
        pixels[idx + 2] = inChip ? 153 : 238;
        pixels[idx + 3] = 255;
      } else if (inCookie) {
        // Dark cyan core (#0e293b)
        pixels[idx] = 14;
        pixels[idx + 1] = 41;
        pixels[idx + 2] = 59;
        pixels[idx + 3] = 255;
      } else {
        // Deep terminal obsidian (#050811)
        pixels[idx] = 5;
        pixels[idx + 1] = 8;
        pixels[idx + 2] = 17;
        pixels[idx + 3] = 255;
      }
    }
  }
  return pixels;
}

function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter type None
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function generateExtensionIcons(outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    const rgba = renderCookiraIconRgba(size);
    const png = encodePng(size, rgba);
    fs.writeFileSync(path.join(outputDir, `cookira-${size}.png`), png);
  }
}
