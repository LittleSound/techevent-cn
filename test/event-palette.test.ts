import { interpolate, oklch, wcagContrast } from 'culori'
import { describe, expect, it } from 'vitest'
import { tagIcons } from '~/data/tag-icons'
import { tagIconSources } from '~/data/tag-icons.mjs'
import { eventPalette } from '~/utils/eventPalette.mjs'

describe('event palette readability', () => {
  it('keeps every tag readable on light and dark card surfaces', () => {
    for (const [tag, def] of Object.entries(tagIcons)) {
      expect(wcagContrast(def.color, '#ffffff'), `${tag} on light cards`).toBeGreaterThanOrEqual(4.5)
      const dark = def.colorDark ?? def.color
      expect(wcagContrast(dark, '#111827'), `${tag} on dark cards`).toBeGreaterThanOrEqual(4.5)
      // Include the strongest decorative glow and selected calendar bars.
      expect(wcagContrast(def.color, interpolate(['#ffffff', def.color])(0.18)), `${tag} over light glow`).toBeGreaterThanOrEqual(4.5)
      expect(wcagContrast(dark, interpolate(['#111827', dark])(0.18)), `${tag} over dark glow`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('source hue mapping', () => {
  it('preserves chromatic hues in both themes after sRGB gamut mapping', () => {
    for (const source of Object.values(tagIconSources)) {
      const original = oklch(source.color)!
      if (original.c < 0.02)
        continue
      const palette = eventPalette(source.color)
      for (const color of [palette.color, palette.colorDark]) {
        const mapped = oklch(color)!
        const distance = Math.abs(((mapped.h! - original.h! + 540) % 360) - 180)
        expect(distance, source.color).toBeLessThan(2)
      }
    }
  })

  it('keeps grayscale sources and invalid fallback achromatic', () => {
    for (const source of ['#555555', '#ffffff', '#000000', 'invalid']) {
      for (const color of Object.values(eventPalette(source)))
        expect(oklch(color)!.c).toBeLessThan(0.001)
    }
  })

  it('preserves shared aliases without mutating source brand colors', () => {
    expect(tagIcons.python).toBe(tagIcons.pycon)
    expect(tagIcons.ai).toBe(tagIcons.llm)
    expect(tagIconSources.huawei.color).toBe('#cf0a2c')
    expect(tagIcons.huawei.color).not.toBe(tagIconSources.huawei.color)
  })
})
