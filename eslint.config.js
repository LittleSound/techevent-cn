import antfu from '@antfu/eslint-config'

export default antfu(
  {
    unocss: true,
    formatters: true,
    pnpm: true,
    // Session scratch files (agent task briefs/reports) are not part of the codebase.
    ignores: ['.superpowers/**'],
  },
  {
    // Disable UnoCSS rules for code blocks inside markdown files. Their worker
    // resolves the Uno config relative to the linted file, but the virtual
    // filename of a fenced block (`file.md\0_0.vue` on Windows) defeats its
    // POSIX-only path handling, so it import()s the .md itself and crashes
    // ESLint with ERR_UNKNOWN_FILE_EXTENSION. Class-order linting has no value
    // in doc snippets anyway. See LittleSound/techevent-cn#11.
    files: ['**/*.md/**'],
    rules: {
      'unocss/order': 'off',
      'unocss/order-attributify': 'off',
    },
  },
)
