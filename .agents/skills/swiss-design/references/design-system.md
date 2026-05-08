# Swiss Design System — Full Token Reference

## CSS Custom Properties

Add to your global CSS (works with or without Tailwind):

```css
:root {
  /* Typography */
  --font-sans: 'IBM Plex Sans', 'Hanken Grotesk', 'Barlow', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', 'Fira Code', monospace;

  /* Stone palette — light mode */
  --color-bg:           #fafaf9;  /* stone-50 */
  --color-surface:      #f5f5f4;  /* stone-100 */
  --color-surface-2:    #e7e5e4;  /* stone-200 */
  --color-border:       #e7e5e4;  /* stone-200 */
  --color-border-light: #f5f5f4;  /* stone-100 */
  --color-text:         #1c1917;  /* stone-900 */
  --color-text-2:       rgba(28, 25, 23, 0.70);
  --color-text-3:       rgba(28, 25, 23, 0.40);
  --color-text-4:       rgba(28, 25, 23, 0.20);

  /* Accent — default Swiss red (override per project) */
  --color-accent:       #C8102E;
  --color-accent-60:    rgba(200, 16, 46, 0.60);
  --color-accent-20:    rgba(200, 16, 46, 0.20);
  --color-accent-10:    rgba(200, 16, 46, 0.10);

  /* Spacing base */
  --space-unit: 8px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:           #0c0a09;  /* stone-950 */
    --color-surface:      #1c1917;  /* stone-900 */
    --color-surface-2:    #292524;  /* stone-800 */
    --color-border:       #292524;  /* stone-800 */
    --color-border-light: #1c1917;  /* stone-900 */
    --color-text:         #fafaf9;  /* stone-50 */
    --color-text-2:       rgba(250, 250, 249, 0.70);
    --color-text-3:       rgba(250, 250, 249, 0.40);
    --color-text-4:       rgba(250, 250, 249, 0.20);
  }
}
```

---

## Stone Palette — Complete Scale

| Scale | Light hex | Dark role | Tailwind class |
| ----- | --------- | --------- | -------------- |
| stone-50 | `#fafaf9` | — | Page bg (light) |
| stone-100 | `#f5f5f4` | — | Surface (light) |
| stone-200 | `#e7e5e4` | — | Border, subtle surface |
| stone-300 | `#d6d3d1` | — | Disabled elements |
| stone-400 | `#a8a29e` | — | Placeholder icons |
| stone-500 | `#78716c` | — | (avoid — use opacity instead) |
| stone-600 | `#57534e` | — | (avoid — use opacity instead) |
| stone-700 | `#44403c` | — | (avoid — use opacity instead) |
| stone-800 | `#292524` | Border (dark) | |
| stone-900 | `#1c1917` | Surface (dark) | Primary text (light) |
| stone-950 | `#0c0a09` | Page bg (dark) | |

**Rule:** Only use stone-50, 100, 200 for backgrounds/borders in light mode. Only use stone-800, 900, 950 for backgrounds/borders in dark mode. For text, use stone-900 with opacity modifiers — never mid-scale stone values.

---

## Accent Color System

### Choosing an accent

Pick one per project. The accent should appear in at most 10–15% of the visual surface.

| Name | Hex | When to use |
| ---- | --- | ----------- |
| Swiss Red | `#C8102E` | Default. Bold, assertive. Good for CTAs, error states, structural accents. |
| Cobalt | `#003B8E` | Corporate, technical, trustworthy. Good for data products, enterprise. |
| Golden | `#F0B429` | Warm, editorial. Good for cultural, food, arts projects. |
| Forest | `#2D6A4F` | Natural, calm. Good for health, sustainability, outdoor. |

### Accent opacity usage

```
bg-[#C8102E]      → Primary: buttons, active states, key graphics
bg-[#C8102E]/60   → Hover states, secondary badges
bg-[#C8102E]/20   → Section backgrounds, card tints, tag backgrounds
bg-[#C8102E]/10   → Very subtle tints, hover backgrounds on nav items

text-[#C8102E]    → Accent text, links, active nav items
text-[#C8102E]/60 → Softer accent labels
```

### Never do this

```
❌  bg-red-500          (wrong hue, Tailwind red ≠ Swiss red)
❌  bg-[#C8102E] text-[#003B8E]  (two accents — pick one)
❌  bg-[#C8102E]/5      (too subtle to register)
```

---

## Typography — Full Specification

### Font loading

```html
<!-- In <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type scale

| Level | Size | Weight | Leading | Tracking | Max width |
| ----- | ---- | ------ | ------- | -------- | --------- |
| Display | 72–96px / `text-7xl`–`text-8xl` | 300 light | `leading-none` | `tracking-tight` | none |
| H1 | 48px / `text-5xl` | 300 light | `leading-tight` | `tracking-tight` | none |
| H2 | 36px / `text-4xl` | 300 light | `leading-snug` | `tracking-tight` | none |
| H3 | 24px / `text-2xl` | 400 normal | `leading-snug` | normal | none |
| H4 | 18px / `text-lg` | 500 medium | `leading-snug` | normal | none |
| Body | 16px / `text-base` | 400 normal | `leading-relaxed` | normal | `max-w-[60ch]` |
| Small | 14px / `text-sm` | 400 normal | `leading-relaxed` | normal | `max-w-[60ch]` |
| Caption | 12px / `text-xs` | 400 normal | `leading-normal` | `tracking-widest` | none |
| Mono | 14px / `text-sm font-mono` | 400 normal | `leading-relaxed` | normal | `max-w-[60ch]` |
| Label | 11px / `text-[11px]` | 500 medium | `leading-none` | `tracking-widest` | none |

### Hierarchy with opacity

```html
<!-- Primary: full opacity -->
<p class="text-stone-900 dark:text-stone-50">Main content</p>

<!-- Secondary: 70% -->
<p class="text-stone-900/70 dark:text-stone-50/70">Supporting text</p>

<!-- Tertiary: 40% -->
<span class="text-stone-900/40 dark:text-stone-50/40">Caption or metadata</span>

<!-- Disabled / placeholder: 20% -->
<span class="text-stone-900/20 dark:text-stone-50/20">Placeholder</span>
```

---

## Grid & Layout

### 12-column grid

```html
<div class="max-w-6xl mx-auto px-8">
  <div class="grid grid-cols-12 gap-8">
    <!-- Full width -->
    <div class="col-span-12">...</div>
    
    <!-- Two-thirds + one-third -->
    <div class="col-span-12 md:col-span-8">...</div>
    <div class="col-span-12 md:col-span-4">...</div>
    
    <!-- Half + half -->
    <div class="col-span-12 md:col-span-6">...</div>
    <div class="col-span-12 md:col-span-6">...</div>
    
    <!-- Thirds -->
    <div class="col-span-12 md:col-span-4">...</div>
    <div class="col-span-12 md:col-span-4">...</div>
    <div class="col-span-12 md:col-span-4">...</div>
  </div>
</div>
```

### Swiss asymmetric layout (sidebar + content)

```html
<div class="grid grid-cols-12 gap-8">
  <!-- Narrow label column, rotated 90° -->
  <div class="col-span-1 flex items-start">
    <span class="text-xs tracking-widest uppercase text-stone-900/40 dark:text-stone-50/40 -rotate-90 origin-left mt-16 whitespace-nowrap">Section label</span>
  </div>
  <!-- Wide content column -->
  <div class="col-span-11">...</div>
</div>
```

### Section spacing

```html
<section class="py-24 border-t border-stone-200 dark:border-stone-800">
  <div class="max-w-6xl mx-auto px-8">
    ...
  </div>
</section>
```

---

## Geometric Decoration

The Swiss style uses simple geometric forms as structural decoration — not ornamentation.

```html
<!-- Bold rule line above a heading -->
<div class="w-8 h-0.5 bg-stone-900 dark:bg-stone-50 mb-8"></div>

<!-- Accent rule -->
<div class="w-8 h-0.5 bg-[#C8102E] mb-8"></div>

<!-- Large background numeral -->
<div class="absolute top-0 right-0 text-[20rem] font-light leading-none text-stone-900/5 dark:text-stone-50/5 select-none pointer-events-none">01</div>

<!-- Hairline grid overlay (decorative) -->
<div class="border-l border-stone-200 dark:border-stone-800 h-full"></div>
```

---

## Dark Mode Implementation

Tailwind `media` strategy — no class toggling needed, respects system preference:

```js
// tailwind.config.js
module.exports = {
  darkMode: 'media',
  // ...
}
```

For manual toggle (class strategy):

```js
darkMode: 'class',
// Toggle: document.documentElement.classList.toggle('dark')
// Persist: localStorage.setItem('theme', 'dark')
```

All component examples in this system use paired `dark:` classes. Never omit the dark variant.
