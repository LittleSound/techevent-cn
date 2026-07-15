import type { TagIconDef } from '~/data/tag-icons'
import type { NormalizedEvent } from '~/types'
import { tagIcons } from '~/data/tag-icons'

export interface EventTheme {
  /** Up to 3 matched defs, primary first (tier ascending, then tag order). */
  icons: TagIconDef[]
  /** Same as icons[0]; drives the accent color, watermark, and calendar bar. */
  primary: TagIconDef
}

/**
 * Derive an event's visual identity from its tags. Tier-3 (chip-only) defs
 * never reach card level; grouped tags sharing one def dedupe. Returns
 * undefined when nothing matches so callers fall back to the default styling.
 */
export function resolveEventTheme(event: NormalizedEvent): EventTheme | undefined {
  const defs: TagIconDef[] = []
  for (const tag of event.tags) {
    const def = tagIcons[tag]
    if (!def || def.tier === 3 || defs.includes(def))
      continue
    defs.push(def)
  }
  // Stable sort: tier wins, original tag order breaks ties.
  const icons = defs.sort((a, b) => a.tier - b.tier).slice(0, 3)
  return icons.length ? { icons, primary: icons[0] } : undefined
}

/** Chip-level lookup: any tier, undefined when the tag is not in the table. */
export function tagIconFor(tag: string): TagIconDef | undefined {
  return tagIcons[tag]
}
