/**
 * Rebuilds the hero bug cutouts at a higher pixel density.
 *
 * The source plate only exists at 2560 px wide, so the cast was cut at 600/638 px.
 * At a 1600 px hero frame the ant paints at ~400 CSS px (800 device px on a 2x
 * display), which meant the browser was stretching a 600 px file. Lanczos with a
 * light unsharp pass looks far better than the browser's bilinear upscale.
 *
 * Usage: node scripts/sharpen-cast.mjs
 */
import sharp from "sharp";

const JOBS = [
  ["public/art/jungle/hero-ant.webp", 960],
  ["public/art/jungle/hero-cricket.webp", 1021],
];

for (const [file, width] of JOBS) {
  const before = await sharp(file).metadata();
  const buffer = await sharp(file)
    .resize({ width, kernel: "lanczos3" })
    .sharpen({ sigma: 0.7, m1: 0.5, m2: 1.1 })
    .webp({ quality: 94, alphaQuality: 100, effort: 6 })
    .toBuffer();
  await sharp(buffer).toFile(file);
  const after = await sharp(file).metadata();
  console.log(
    `${file}: ${before.width}x${before.height} -> ${after.width}x${after.height} (${(buffer.length / 1024).toFixed(1)} kB)`,
  );
}
