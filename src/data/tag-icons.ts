import { tagIcons as sharedTagIcons } from './tag-icons.mjs'

export interface TagIconDef {
  /** UnoCSS icon class, any Iconify collection, e.g. 'i-simple-icons-vuedotjs'. */
  icon: string
  /** Chromatic 800 hex color, derived from the source hue for light surfaces. */
  color: string
  /** Chromatic 300 hex color, derived from the same source hue for dark surfaces. */
  colorDark?: string
  /**
   * 1 = brand/tech logo (vue, python, ubuntu…)
   * 2 = domain concept (ai, opensource, hackathon…)
   * 3 = chip-only: icon shows on the tag chip but never at card level (conference, meetup…)
   */
  tier: 1 | 2 | 3
}

export const tagIcons: Record<string, TagIconDef> = sharedTagIcons
