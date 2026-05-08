# Design Token Architecture

## Three-Tier Token System (Industry Standard)

Based on USWDS, IBM Carbon, and Shopify Polaris patterns.

### Tier 1: Primitive Tokens (Foundation Layer)
- Raw design values without context
- Examples: `gray-50`, `gray-900`, `spacing-4`, `font-sans`
- Purpose: "The most basic form of tokens, reducing infinite possibilities to a select few"
- Never reference other tokens
- Immutable across themes

### Tier 2: Semantic Tokens (Context Layer)
- Carry meaning about usage
- Examples: `background-primary`, `text-error`, `border-interactive`
- Purpose: Describe function, not appearance
- Reference primitive tokens
- Change between themes (light/dark)

### Tier 3: Component Tokens (Application Layer)
- Specific to UI components
- Examples: `button-height`, `card-padding`, `input-border-radius`
- Reference semantic or primitive tokens
- Enable component-level theming

### Token Hierarchy Benefits
- Single source of truth
- Update one token → cascades everywhere
- Dark mode: Change semantic layer only
- Rebrand: Update primitive layer only

## OKLCH Color Space (Modern Standard)

### Why OKLCH over HSL
- **Perceptually uniform**: Equal lightness steps look equal to human eyes
- **Consistent brightness**: Yellow/cyan don't appear lighter than blue/red
- **Algorithmic palettes**: Generate entire color systems from formulas
- **Better gradients**: Smooth transitions without lightness jumps
- **Accessibility**: Easier to calculate contrast ratios

### Browser Support
- 93%+ (2024) - All modern browsers
- TailwindCSS v4 uses OKLCH by default

### Format: `oklch(L C H)`
- **L**: Lightness (0-1 or 0%-100%)
- **C**: Chroma/saturation (0-0.4)
- **H**: Hue (0-360 degrees)

### HSL vs OKLCH Example
- **HSL**: `hsl(210, 100%, 50%)` - Unpredictable perceived brightness
- **OKLCH**: `oklch(0.55 0.22 264)` - Perceptually consistent

## Token Naming Conventions

Best practices from Smashing Magazine & Design Systems Collective.

### Structure Pattern
```
[category]-[property]-[variant]-[state]
```

### Purpose-Driven Names ✅
- `background-primary` (semantic)
- `text-error` (semantic)
- `button-primary-hover` (component + state)

### Avoid Appearance-Based ❌
- `blue-500` (no context)
- `dark-blue-bg` (ties to visual)
- `header-color-1` (meaningless)

### Color Naming
- **Primitives**: `[family]-[brightness]` → `gray-50` to `gray-900`
- **Semantic**: `[purpose]-[role]` → `background-primary`, `text-on-primary`
- **Component**: `[component]-[property]` → `button-background-primary`

### Key Characteristics
- **Logical**: Consistent patterns team understands
- **Scalable**: Accommodates growth without restructuring
- **Searchable**: Easy filtering in design tools
- **Short**: Balance descriptiveness with brevity

## CSS Variable Configuration

### Three-Tier CSS Variables
```css
:root {
  /* Tier 1: Primitives (immutable) */
  --gray-50: 250 250 250;
  --gray-900: 24 24 27;
  --blue-500: oklch(0.55 0.22 264);

  /* Tier 2: Semantics (theme-aware) */
  --background: var(--gray-50);
  --foreground: var(--gray-900);
  --primary: var(--blue-500);

  /* Tier 3: Components */
  --button-height: 2.5rem;
  --card-padding: 1.5rem;
}

.dark {
  /* Only semantic tokens change */
  --background: var(--gray-900);
  --foreground: var(--gray-50);
}
```

### Color Space Recommendation
- **Modern**: Use OKLCH for perceptual uniformity
- **Legacy support**: Use HSL with fallbacks
- **Avoid**: RGB/HEX for design tokens (not human-readable)

### Token Storage
- Store in JSON for platform-agnostic distribution
- Transform to CSS variables, Swift, XML using Style Dictionary
- Version control tokens separately from component code

## Multi-Theme Support

Support multiple brands/themes:
- Define theme objects with token values
- Inject CSS variables dynamically with JavaScript
- Semantic tokens adapt per theme
- Primitive tokens can vary by brand

## Implementation Checklist

- [ ] Define primitive tokens (colors, spacing, typography)
- [ ] Create semantic tokens that reference primitives
- [ ] Build component tokens for specific UI elements
- [ ] Use OKLCH color space for modern browsers
- [ ] Implement three-tier CSS variable structure
- [ ] Store tokens in JSON for platform-agnostic use
- [ ] Document naming conventions for the team
- [ ] Test dark mode with semantic token switching
- [ ] Validate token cascade (primitive → semantic → component)
