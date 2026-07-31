import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('og theme data', () => {
  it('is available from a plain JavaScript module that Node can load without TypeScript stripping', async () => {
    const { tagIcons } = await import('../src/data/tag-icons.mjs')

    expect(tagIcons.vue).toMatchObject({
      icon: 'i-simple-icons-vuedotjs',
      color: '#42b883',
      tier: 1,
    })
  })

  it('is loaded by the generator without importing TypeScript at runtime', async () => {
    const generator = await readFile(resolve('scripts/generate-og.mjs'), 'utf8')

    expect(generator).toContain('import(\'../src/data/tag-icons.mjs\')')
    expect(generator).not.toContain('import(\'../src/data/tag-icons.ts\')')
  })
})
