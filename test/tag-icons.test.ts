import { describe, expect, it } from 'vitest'
import { tagIcons } from '~/data/tag-icons'

/**
 * Every icon in the mapping table must resolve against an installed
 * @iconify-json collection — guards against typos in icon names, which
 * would otherwise silently render as an empty box.
 */
const collections = ['simple-icons', 'carbon', 'mdi'] as const

async function loadIconNames(): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  for (const c of collections) {
    const data = await import(`@iconify-json/${c}/icons.json`)
    map.set(c, new Set([
      ...Object.keys(data.icons ?? {}),
      ...Object.keys(data.aliases ?? {}),
    ]))
  }
  return map
}

describe('tagIcons table', () => {
  it('every icon class resolves in an installed collection', async () => {
    const names = await loadIconNames()
    const failures: string[] = []
    for (const [tag, def] of Object.entries(tagIcons)) {
      const match = collections.find(c => def.icon.startsWith(`i-${c}-`))
      const icon = match ? def.icon.slice(`i-${match}-`.length) : ''
      if (!match || !names.get(match)!.has(icon))
        failures.push(`${tag}: ${def.icon}`)
    }
    expect(failures).toEqual([])
  })

  it('every color is a hex value', () => {
    for (const def of Object.values(tagIcons)) {
      expect(def.color).toMatch(/^#[0-9a-f]{6}$/i)
      if (def.colorDark)
        expect(def.colorDark).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
