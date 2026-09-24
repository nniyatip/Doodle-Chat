/**
 * One-off asset script: turns the 526 KB "Body BG.png" from the challenge assets into a
 * small, seamless WebP tile (src/assets/bg-pattern.webp, ~12 KB).
 *
 * The source image is a repeating doodle pattern. Instead of guessing the tile size, the
 * script finds the smallest horizontal/vertical shift at which the image repeats exactly,
 * crops a single tile and exports it as WebP. The source is high resolution, so CSS
 * displays the tile at half its pixel size to stay crisp on retina screens.
 *
 * `sharp` is intentionally not a project dependency (it ships native binaries). Run with:
 *
 *   npm install --no-save sharp
 *   node scripts/optimize-bg.js "<path to>/Body BG.png"
 */
import { statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIN_TILE_SIZE = 16
const SAMPLE_STRIDE = 4

const [, , sourceArg] = process.argv

if (!sourceArg) {
  console.error('Usage: node scripts/optimize-bg.js "<path to Body BG.png>"')
  process.exit(1)
}

let sharp
try {
  ;({ default: sharp } = await import('sharp'))
} catch (error) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error
  console.error('sharp is not installed. Run: npm install --no-save sharp')
  process.exit(1)
}

const source = resolve(sourceArg)
const output = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/assets/bg-pattern.webp',
)

const { data, info } = await sharp(source)
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true })
const { width, height } = info
const pixel = (x, y) => data[y * width + x]

/** Sum of absolute pixel differences between the image and itself shifted along an axis. */
const shiftDiff = (axis, shift, stride) => {
  const [length, other] = axis === 'x' ? [width, height] : [height, width]
  let diff = 0
  for (let o = 0; o < other; o += stride) {
    for (let i = 0; i + shift < length; i += stride) {
      diff +=
        axis === 'x'
          ? Math.abs(pixel(i, o) - pixel(i + shift, o))
          : Math.abs(pixel(o, i) - pixel(o, i + shift))
    }
  }
  return diff
}

/**
 * Returns the smallest shift at which the image repeats exactly. Candidates are screened on
 * a sparse pixel grid for speed, then confirmed on every pixel. The upper bound leaves at
 * least 20% of the image overlapping so a match is meaningful.
 */
const findPeriod = (axis) => {
  const length = axis === 'x' ? width : height
  for (let shift = MIN_TILE_SIZE; shift <= length * 0.8; shift++) {
    if (shiftDiff(axis, shift, SAMPLE_STRIDE) === 0 && shiftDiff(axis, shift, 1) === 0) {
      return shift
    }
  }
  throw new Error(
    `No exact repeat found along the ${axis} axis; is "${source}" a seamless pattern?`,
  )
}

const periodX = findPeriod('x')
const periodY = findPeriod('y')
console.log(`Source ${width}x${height}px, repeat period ${periodX}x${periodY}px`)

await sharp(source)
  .extract({ left: 0, top: 0, width: periodX, height: periodY })
  .webp({ quality: 70, effort: 6 })
  .toFile(output)

console.log(
  `Wrote ${output} (${statSync(output).size} bytes, from ${statSync(source).size} bytes).`,
)
console.log(`CSS: background-size: ${periodX / 2}px ${periodY / 2}px;`)
