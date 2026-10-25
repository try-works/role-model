# StyleX CSS fallbacks

StyleX is the default for this boundary. A CSS Module is allowed only when the
StyleX compiler cannot express a required browser behavior.

Put the module in this directory and add it to `manifest.json` with a specific
reason. `npm run lint:stylex-governance` rejects undeclared imports, missing
files, vague reasons, unsafe overlay portals, and unjustified suppressions.
