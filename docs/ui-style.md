# UI styling conventions

Inspect existing components before introducing styles. Prefer the current UnoCSS utilities and shortcuts over new colors, type sizes, or spacing values.

- Standard cards: use `card` from `uno.config.ts` (white / gray-900).
- Secondary information panels (including saving/sharing): use the location panel’s transparent background, gray-200 / gray-800 border, and rounded-lg.
- Action panels: use `action-panel`, based on the original contribution panel (teal-50/60 / teal-950/25, p-5, rounded-xl).
- Action-panel headings: text-base, font-700. Supporting copy: text-sm, mt-1, op70. Metadata: text-xs, op60. Inherit the App text color (gray-700 / gray-200).
- Primary actions: use `action-button`, based on ContributionMenu (text-sm, px-3, py-2, rounded-md, teal-600 with teal-700 hover).
- Secondary actions: retain EventShareButtons styling (text-sm, px-3, py-1.5, rounded-md and the existing light/dark borders). Do not override child buttons with custom font sizes, padding, or colors.
- Keep brand colors and icons in the existing event theme system.

Check desktop and mobile in both themes. Compare computed panel backgrounds, borders, padding, typography, and button sizes with an existing reference component; screenshots alone are insufficient to catch subtle drift.
