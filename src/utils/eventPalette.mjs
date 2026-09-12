import { baseChromaByHue, chromaticPaletteFrom } from '@proj-airi/chromatic'
import { clampChroma, formatHex, oklch } from 'culori'

/**
 * Map a source color's OKLCH hue to readable light/dark Chromatic shades.
 * Cap chroma at the source value to keep gray and muted icons neutral.
 * Invalid colors fall back to grayscale; gamut mapping preserves hue in sRGB.
 * @param {string} source Source brand or concept color.
 * @returns {{ color: string, colorDark: string }} Hex colors for light/dark surfaces.
 */
export function eventPalette(source) {
  const original = oklch(source)
  const hue = original?.h ?? 0
  const chroma = Math.min(original?.c ?? 0, baseChromaByHue(hue))
  const palette = chromaticPaletteFrom(hue, chroma)
  return {
    color: formatHex(clampChroma(palette.shadeBy(800).color, 'oklch')),
    colorDark: formatHex(clampChroma(palette.shadeBy(300).color, 'oklch')),
  }
}
