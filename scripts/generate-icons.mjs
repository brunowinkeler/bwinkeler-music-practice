/**
 * Generates the PWA icons from code so the repository carries no binary assets
 * that cannot be reproduced. Run with `npm run icons` after changing the art.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDirectory = resolve(projectRoot, "public", "icons");

const backgroundTop = [39, 92, 69];
const backgroundBottom = [18, 36, 28];
const whiteKeyColor = [246, 247, 245];
const blackKeyColor = [18, 36, 28];
const beamColor = [184, 137, 43];

const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
        let value = index;
        for (let bit = 0; bit < 8; bit += 1) {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }
        table[index] = value >>> 0;
    }
    return table;
})();

function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed), 0);
    return Buffer.concat([length, typed, crc]);
}

function encodePng(size, pixels) {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(size, 0);
    header.writeUInt32BE(size, 4);
    header.writeUInt8(8, 8); // bit depth
    header.writeUInt8(6, 9); // RGBA
    const raw = Buffer.alloc(size * (size * 4 + 1));
    for (let y = 0; y < size; y += 1) {
        const rowStart = y * (size * 4 + 1);
        raw[rowStart] = 0; // no filter
        for (let x = 0; x < size * 4; x += 1) {
            raw[rowStart + 1 + x] = pixels[y * size * 4 + x];
        }
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", header),
        chunk("IDAT", deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

function createCanvas(size) {
    return { size, pixels: new Uint8ClampedArray(size * size * 4) };
}

function blend(canvas, x, y, color, alpha) {
    if (alpha <= 0) {
        return;
    }
    const index = (y * canvas.size + x) * 4;
    const inverse = 1 - alpha;
    canvas.pixels[index] = color[0] * alpha + canvas.pixels[index] * inverse;
    canvas.pixels[index + 1] =
        color[1] * alpha + canvas.pixels[index + 1] * inverse;
    canvas.pixels[index + 2] =
        color[2] * alpha + canvas.pixels[index + 2] * inverse;
    canvas.pixels[index + 3] = Math.max(canvas.pixels[index + 3], alpha * 255);
}

const samplesPerAxis = 3;

function coverage(inside, x, y) {
    let hits = 0;
    for (let sy = 0; sy < samplesPerAxis; sy += 1) {
        for (let sx = 0; sx < samplesPerAxis; sx += 1) {
            const px = x + (sx + 0.5) / samplesPerAxis;
            const py = y + (sy + 0.5) / samplesPerAxis;
            if (inside(px, py)) {
                hits += 1;
            }
        }
    }
    return hits / (samplesPerAxis * samplesPerAxis);
}

function fill(canvas, inside, colorAt) {
    for (let y = 0; y < canvas.size; y += 1) {
        for (let x = 0; x < canvas.size; x += 1) {
            const alpha = coverage(inside, x, y);
            if (alpha > 0) {
                blend(canvas, x, y, colorAt(x, y), alpha);
            }
        }
    }
}

function roundedRect(cx, cy, width, height, radius) {
    return (x, y) => {
        const qx = Math.abs(x - cx) - (width / 2 - radius);
        const qy = Math.abs(y - cy) - (height / 2 - radius);
        const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
        return outside + Math.min(Math.max(qx, qy), 0) - radius <= 0;
    };
}

function lerpColor(from, to, t) {
    return [
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
        from[2] + (to[2] - from[2]) * t,
    ];
}

/** Keyboard seen from above, with a brass beat marker above it. */
function drawIcon(size, { cornerRatio, contentScale }) {
    const canvas = createCanvas(size);
    const radius = size * cornerRatio;

    fill(canvas, roundedRect(size / 2, size / 2, size, size, radius), (_x, y) =>
        lerpColor(backgroundTop, backgroundBottom, y / size),
    );

    const unit = size * contentScale;
    const centerX = size / 2;
    const keyboardHeight = unit * 0.46;
    const keyboardWidth = unit;
    const keyboardCenterY = size / 2 + unit * 0.16;
    const keyRadius = unit * 0.035;

    fill(
        canvas,
        roundedRect(
            centerX,
            keyboardCenterY,
            keyboardWidth,
            keyboardHeight,
            keyRadius,
        ),
        () => whiteKeyColor,
    );

    const whiteKeyCount = 7;
    const whiteKeyWidth = keyboardWidth / whiteKeyCount;
    const left = centerX - keyboardWidth / 2;
    const grooveWidth = Math.max(size * 0.012, 1.5);
    for (let index = 1; index < whiteKeyCount; index += 1) {
        fill(
            canvas,
            roundedRect(
                left + index * whiteKeyWidth,
                keyboardCenterY,
                grooveWidth,
                keyboardHeight,
                0,
            ),
            () => blackKeyColor,
        );
    }

    const blackKeyOffsets = [1, 2, 4, 5, 6];
    const blackKeyWidth = whiteKeyWidth * 0.58;
    const blackKeyHeight = keyboardHeight * 0.6;
    for (const offset of blackKeyOffsets) {
        fill(
            canvas,
            roundedRect(
                left + offset * whiteKeyWidth,
                keyboardCenterY - keyboardHeight / 2 + blackKeyHeight / 2,
                blackKeyWidth,
                blackKeyHeight,
                keyRadius * 0.6,
            ),
            () => blackKeyColor,
        );
    }

    const beatWidth = unit * 0.1;
    const beatHeight = unit * 0.26;
    const beatY = keyboardCenterY - keyboardHeight / 2 - unit * 0.24;
    fill(
        canvas,
        roundedRect(centerX, beatY, beatWidth, beatHeight, beatWidth / 2),
        () => beamColor,
    );

    return encodePng(size, canvas.pixels);
}

const targets = [
    {
        file: "icon-192.png",
        size: 192,
        options: { cornerRatio: 0.22, contentScale: 0.68 },
    },
    {
        file: "icon-512.png",
        size: 512,
        options: { cornerRatio: 0.22, contentScale: 0.68 },
    },
    {
        file: "icon-maskable-512.png",
        size: 512,
        options: { cornerRatio: 0, contentScale: 0.48 },
    },
    {
        file: "apple-touch-icon.png",
        size: 180,
        options: { cornerRatio: 0, contentScale: 0.66 },
    },
];

mkdirSync(iconsDirectory, { recursive: true });
for (const target of targets) {
    const png = drawIcon(target.size, target.options);
    writeFileSync(resolve(iconsDirectory, target.file), png);
    console.log(`wrote public/icons/${target.file} (${png.length} bytes)`);
}
