import { When } from '@pleat/core'
/* The example card's View Code toggle is a peer checkbox on Tailwind
   (peer-checked:* siblings); StyleX expresses it as marker-conditioned
   sibling styles. Headings get the same treatment for the hover '#' link
   (group-hover:opacity-100). */
export const codeToggleScope = When.marker('code-toggle-scope')
export const headingScope = When.marker('heading-scope')
