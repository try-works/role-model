export type LintRuleGroupId = 'application' | 'component-authoring' | 'cli'

export type LintRuleSummary = Readonly<{
  id: string
  title: string
  summary: string
}>

export type LintRuleGroup = Readonly<{
  id: LintRuleGroupId
  label: string
  description: string
  rules: ReadonlyArray<LintRuleSummary>
}>

export const LINT_RULE_GROUPS: ReadonlyArray<LintRuleGroup> = [
  {
    id: 'application',
    label: 'Application rules',
    description:
      'Strict rules for app views (crease-default-v1): build UI only from installed Crease components.',
    rules: [
      {
        id: 'no-raw-controls',
        title: 'No raw controls',
        summary:
          'Native buttons, inputs and selects built with h.* instead of the installed control.',
      },
      {
        id: 'no-raw-composition',
        title: 'No raw composition',
        summary:
          'Raw layout, headings, text, links, lists and tables in application views.',
      },
      {
        id: 'no-unapproved-renderer',
        title: 'No unapproved renderer',
        summary:
          'Headless @foldkit/ui views, implementation-only exports and other render libraries.',
      },
      {
        id: 'no-application-styles',
        title: 'No application styles',
        summary:
          'h.Class, h.Style, class helpers, renderer authoring APIs and DOM style mutation in app code.',
      },
      {
        id: 'component-contract',
        title: 'Component contract',
        summary:
          'Visual class overrides, height/size overrides, unknown variants and non-placement layoutStyle.',
      },
      {
        id: 'no-unverifiable-ui',
        title: 'No unverifiable UI',
        summary:
          'UI the type checker cannot verify: computed builders, casts, untyped linting.',
      },
    ],
  },
  {
    id: 'component-authoring',
    label: 'Component-author rules',
    description:
      'Rules for the design-system source itself: keep component styling static, tokenized and inside named variants.',
    rules: [
      {
        id: 'no-component-restyle',
        title: 'No component restyle',
        summary:
          'Appearance passed into a component instead of a named variant.',
      },
      {
        id: 'require-static-class',
        title: 'Require static class',
        summary: 'Class values that lint cannot fully inspect.',
      },
      {
        id: 'no-foldkit-inline-style',
        title: 'No Foldkit inline style',
        summary: 'h.Style inline styles that bypass static styling.',
      },
      {
        id: 'stylex-component-contract',
        title: 'StyleX component contract',
        summary:
          'StyleX components called with styles outside their layout contract.',
      },
      {
        id: 'no-stylex-escape',
        title: 'No StyleX escape',
        summary: 'Raw StyleX APIs outside reviewed adapters.',
      },
      {
        id: 'pleat-prop-limits',
        title: 'Pleat prop limits',
        summary: 'Raw Pleat property values instead of semantic tokens.',
      },
      {
        id: 'prefer-composition-primitives',
        title: 'Prefer composition primitives',
        summary:
          'Hand-written layout instead of the closed Crease composition vocabulary.',
      },
      {
        id: 'no-raw-colors',
        title: 'No raw colors',
        summary:
          'Hard-coded colors instead of theme tokens (shadcn/no-raw-colors).',
      },
      {
        id: 'no-arbitrary-values',
        title: 'No arbitrary values',
        summary:
          'Arbitrary Tailwind values instead of the scale (shadcn/no-arbitrary-values).',
      },
    ],
  },
  {
    id: 'cli',
    label: 'CLI checks',
    description:
      'Project checks run by creaseui-lint: global CSS, theme grammar, coverage and lint scope.',
    rules: [
      {
        id: 'css',
        title: 'Global CSS policy',
        summary:
          'Component styling in global stylesheets, including @layer, @media and nesting.',
      },
      {
        id: 'theme',
        title: 'Theme grammar',
        summary:
          'Invalid theme values and component variables no stylesheet defines.',
      },
      {
        id: 'doctor',
        title: 'Doctor coverage',
        summary:
          'Ignored files, unregistered components and undeclared foundations.',
      },
      {
        id: 'scope',
        title: 'Lint scope baseline',
        summary:
          'Feature changes that loosen ownership records, ignores or lint scripts.',
      },
    ],
  },
]

export const findLintRule = (
  id: string,
): (LintRuleSummary & Readonly<{ group: LintRuleGroup }>) | undefined => {
  for (const group of LINT_RULE_GROUPS) {
    const rule = group.rules.find(candidate => candidate.id === id)
    if (rule !== undefined) return { ...rule, group }
  }
  return undefined
}
