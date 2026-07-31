import { tagIcons as sharedTagIcons } from './tag-icons.mjs'

export interface TagIconDef {
  /** UnoCSS icon class, any Iconify collection, e.g. 'i-simple-icons-vuedotjs'. */
  icon: string
  /** Brand/theme color (hex). Pick a darkened variant when the brand color fails contrast on white. */
  color: string
  /** Optional dark-mode override for colors that fail contrast on dark backgrounds. */
  colorDark?: string
  /**
   * 1 = brand/tech logo (vue, python, ubuntu…)
   * 2 = domain concept (ai, opensource, hackathon…)
   * 3 = chip-only: icon shows on the tag chip but never at card level (conference, meetup…)
   */
  tier: 1 | 2 | 3
}

export const tagIcons: Record<string, TagIconDef> = sharedTagIcons
