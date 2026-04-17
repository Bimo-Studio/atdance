/**
 * One-shot / maintenance: rewrite `public/graphics/*.png` so chroma magenta becomes alpha.
 * Run: `pnpm graphics:chroma`
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { isMagentaChromaKeyRgb } from '../src/util/magentaChromaKey.ts';

const GRAPHICS_DIR = path.resolve(import.meta.dirname, '../public/graphics');

async function chromaKeyFile(filePath: string): Promise<void> {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) {
    throw new Error(`Expected RGBA after ensureAlpha: ${filePath} (${info.channels} ch)`);
  }
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (isMagentaChromaKeyRgb(r, g, b)) {
      data[i + 3] = 0;
    }
  }
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(filePath);
}

async function main(): Promise<void> {
  const names = await readdir(GRAPHICS_DIR);
  const pngs = names.filter((n) => n.endsWith('.png'));
  for (const name of pngs) {
    await chromaKeyFile(path.join(GRAPHICS_DIR, name));
  }
  console.log(`graphics:chroma — updated ${pngs.length} PNG(s) in public/graphics`);
}

await main();
