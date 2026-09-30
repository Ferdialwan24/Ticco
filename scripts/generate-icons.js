const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size, bgR, bgG, bgB, fgR, fgG, fgB) {
  // Width and height
  const width = size;
  const height = size;

  // Raw uncompressed scanlines: each row starts with filter byte 0, then RGBA bytes
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Distance from center for rounded corner / circle mask
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Simple icon drawing: 'T' glyph inside circle/rounded rect
      let isForeground = false;

      // Check if inside "T"
      const tTop = size * 0.28;
      const tBottom = size * 0.72;
      const tStemLeft = size * 0.44;
      const tStemRight = size * 0.56;
      const tBarTop = size * 0.28;
      const tBarBottom = size * 0.40;
      const tBarLeft = size * 0.26;
      const tBarRight = size * 0.74;

      if (y >= tBarTop && y <= tBarBottom && x >= tBarLeft && x <= tBarRight) {
        isForeground = true;
      } else if (y >= tTop && y <= tBottom && x >= tStemLeft && x <= tStemRight) {
        isForeground = true;
      }

      // Check boundary
      const cornerRadius = size * 0.22;
      const rx = Math.max(Math.abs(x - center) - (center - cornerRadius), 0);
      const ry = Math.max(Math.abs(y - center) - (center - cornerRadius), 0);
      const outsideCorner = Math.sqrt(rx * rx + ry * ry) > cornerRadius;

      if (outsideCorner) {
        // Transparent
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      } else if (isForeground) {
        // White foreground
        rawData[pixelOffset] = fgR;
        rawData[pixelOffset + 1] = fgG;
        rawData[pixelOffset + 2] = fgB;
        rawData[pixelOffset + 3] = 255;
      } else {
        // Emerald background gradient
        const factor = (y / height) * 0.3;
        rawData[pixelOffset] = Math.max(0, Math.floor(bgR * (1 - factor)));
        rawData[pixelOffset + 1] = Math.max(0, Math.floor(bgG * (1 - factor)));
        rawData[pixelOffset + 2] = Math.max(0, Math.floor(bgB * (1 - factor)));
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG structure
  function crc32(buf) {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    let crc = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const body = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate 192x192 and 512x512
const png192 = createPNG(192, 5, 150, 105, 255, 255, 255);
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), png192);

const png512 = createPNG(512, 5, 150, 105, 255, 255, 255);
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), png512);

console.log('Icons generated successfully in public/icons');
