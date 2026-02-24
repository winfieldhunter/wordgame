/**
 * Generate icon-192.png and icon-512.png for PWA / home screen install.
 * Run: node scripts/generate-icons.mjs (or npm run generate-icons)
 * Requires: npm install sharp --save-dev
 */

import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");

const themeBlue = "#2563eb";
const sizes = [192, 512];

async function main() {
  await mkdir(publicDir, { recursive: true });
  // NW logo: blue rounded square, N in white and W in soft white (matches Near/Word two-tone).
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${themeBlue}" rx="96"/>
      <text x="166" y="328" font-family="system-ui, -apple-system, sans-serif" font-size="220" font-weight="800" fill="white" text-anchor="middle">N</text>
      <text x="346" y="328" font-family="system-ui, -apple-system, sans-serif" font-size="220" font-weight="800" fill="rgba(255,255,255,0.9)" text-anchor="middle">W</text>
    </svg>
  `;
  const buffer = Buffer.from(svg);
  for (const size of sizes) {
    const png = await sharp(buffer).resize(size, size).png().toBuffer();
    await writeFile(join(publicDir, `icon-${size}.png`), png);
    console.log(`Wrote public/icon-${size}.png`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
