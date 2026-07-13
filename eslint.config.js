import antfu from '@antfu/eslint-config'

export default antfu(
  {
    unocss: true,
    formatters: true,
    pnpm: true,
    // Session scratch files (agent task briefs/reports) are not part of the codebase.
    ignores: ['.superpowers/**'],
  },
)
