# TailwindCSS Reference Guide

Complete reference for TailwindCSS utilities and patterns within the UI design system.

## Table of Contents
- [Layout Utilities](#layout-utilities)
- [Spacing](#spacing)
- [Typography](#typography)
- [Colors & Backgrounds](#colors--backgrounds)
- [Responsive Design](#responsive-design)
- [Dark Mode](#dark-mode)
- [Custom Theme Configuration](#custom-theme-configuration)

## Layout Utilities

### Display
```html
<div class="block">Block element</div>
<div class="inline-block">Inline block</div>
<div class="flex">Flexbox container</div>
<div class="inline-flex">Inline flex</div>
<div class="grid">Grid container</div>
<div class="hidden">Hidden element</div>
```

### Flexbox
```html
<!-- Alignment -->
<div class="flex items-center justify-between">
<div class="flex items-start justify-center">
<div class="flex items-end justify-around">

<!-- Direction -->
<div class="flex flex-col">Vertical stack</div>
<div class="flex flex-row">Horizontal row</div>
<div class="flex flex-row-reverse">Reverse row</div>

<!-- Wrap -->
<div class="flex flex-wrap">Wrapping flex</div>
<div class="flex flex-nowrap">No wrap</div>

<!-- Gap -->
<div class="flex gap-4">16px gap</div>
<div class="flex gap-x-6 gap-y-4">Different X/Y gaps</div>
```

### Grid
```html
<!-- Basic grid -->
<div class="grid grid-cols-3 gap-4">3 equal columns</div>
<div class="grid grid-cols-2 md:grid-cols-4">Responsive columns</div>

<!-- Custom grid template -->
<div class="grid grid-cols-[1fr_500px_2fr]">Fixed + flexible</div>

<!-- Auto-fill/fit -->
<div class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
  Responsive auto-fill
</div>
```

### Positioning
```html
<div class="relative">Relative positioning</div>
<div class="absolute top-0 right-0">Absolute</div>
<div class="fixed bottom-4 right-4">Fixed position</div>
<div class="sticky top-0">Sticky header</div>
```

## Spacing

### Padding
```html
<div class="p-4">All sides: 16px</div>
<div class="px-6 py-3">Horizontal: 24px, Vertical: 12px</div>
<div class="pt-8">Top: 32px</div>
<div class="pr-2">Right: 8px</div>
<div class="pb-4">Bottom: 16px</div>
<div class="pl-6">Left: 24px</div>
```

### Margin
```html
<div class="m-4">All sides: 16px</div>
<div class="mx-auto">Center horizontally</div>
<div class="my-8">Vertical: 32px</div>
<div class="-mt-4">Negative top margin</div>
<div class="-ml-2">Negative left margin</div>
```

### Spacing Scale
- `0`: 0px
- `px`: 1px
- `0.5`: 2px (0.125rem)
- `1`: 4px (0.25rem)
- `2`: 8px (0.5rem)
- `3`: 12px (0.75rem)
- `4`: 16px (1rem)
- `6`: 24px (1.5rem)
- `8`: 32px (2rem)
- `12`: 48px (3rem)
- `16`: 64px (4rem)
- `24`: 96px (6rem)

## Typography

### Font Size
```html
<p class="text-xs">12px - Extra small</p>
<p class="text-sm">14px - Small</p>
<p class="text-base">16px - Base</p>
<p class="text-lg">18px - Large</p>
<p class="text-xl">20px - Extra large</p>
<p class="text-2xl">24px - 2XL</p>
<p class="text-3xl">30px - 3XL</p>
<p class="text-4xl">36px - 4XL</p>
<p class="text-5xl">48px - 5XL</p>
```

### Font Weight
```html
<p class="font-thin">100 - Thin</p>
<p class="font-light">300 - Light</p>
<p class="font-normal">400 - Normal</p>
<p class="font-medium">500 - Medium</p>
<p class="font-semibold">600 - Semibold</p>
<p class="font-bold">700 - Bold</p>
<p class="font-extrabold">800 - Extra bold</p>
```

### Line Height
```html
<p class="leading-none">1 - No line height</p>
<p class="leading-tight">1.25 - Tight</p>
<p class="leading-normal">1.5 - Normal</p>
<p class="leading-relaxed">1.75 - Relaxed</p>
<p class="leading-loose">2 - Loose</p>

<!-- Combined with font size -->
<h1 class="text-4xl/tight">Font size 4xl with tight line height</h1>
```

### Text Alignment
```html
<p class="text-left">Left aligned</p>
<p class="text-center">Center aligned</p>
<p class="text-right">Right aligned</p>
<p class="text-justify">Justified</p>
```

### Text Truncation
```html
<p class="truncate">Truncate with ellipsis on one line</p>
<p class="line-clamp-3">Truncate after 3 lines</p>
<p class="overflow-ellipsis">Ellipsis overflow</p>
```

## Colors & Backgrounds

### Color Scale (50-950)
Each color has 11 shades:
- `50`: Lightest
- `100-400`: Light variations
- `500`: Base color (default)
- `600-800`: Dark variations
- `950`: Darkest

### Text Colors
```html
<p class="text-gray-900">Dark gray text</p>
<p class="text-blue-600">Blue text</p>
<p class="text-red-500">Red text</p>
<a class="text-blue-500 hover:text-blue-700">Link with hover</a>
```

### Background Colors
```html
<div class="bg-white">White background</div>
<div class="bg-gray-100">Light gray</div>
<div class="bg-blue-500">Blue background</div>
<div class="bg-gradient-to-r from-blue-500 to-purple-600">Gradient</div>
```

### Opacity Modifiers
```html
<div class="bg-black/75">75% opacity</div>
<div class="text-blue-500/30">30% opacity text</div>
<div class="bg-purple-500/[0.87]">87% opacity (arbitrary)</div>
```

## Responsive Design

### Breakpoints
- `sm`: 640px and up (mobile landscape, small tablets)
- `md`: 768px and up (tablets)
- `lg`: 1024px and up (laptops, small desktops)
- `xl`: 1280px and up (desktops)
- `2xl`: 1536px and up (large desktops)

### Mobile-First Examples
```html
<!-- Responsive columns: 1 on mobile, 2 on tablet, 4 on desktop -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

<!-- Responsive text sizes -->
<h1 class="text-2xl md:text-4xl lg:text-6xl">Responsive heading</h1>

<!-- Hide/show at breakpoints -->
<div class="hidden lg:block">Desktop only</div>
<div class="block lg:hidden">Mobile only</div>

<!-- Responsive padding -->
<div class="p-4 md:p-6 lg:p-8">Responsive padding</div>
```

### Max-Width Queries
```html
<!-- Apply below 768px -->
<div class="flex max-md:hidden">Hidden on mobile</div>

<!-- Between breakpoints (only tablets) -->
<div class="hidden md:block lg:hidden">Tablet only</div>
```

### Container Queries
```html
<div class="@container">
  <div class="@md:grid-cols-2 @lg:grid-cols-3">
    Responds to parent width, not viewport
  </div>
</div>
```

## Dark Mode

### Setup
```html
<!-- Add dark mode class to html element -->
<html class="dark">
```

### Dark Mode Utilities
```html
<!-- Colors -->
<div class="bg-white dark:bg-gray-900">Background</div>
<p class="text-gray-900 dark:text-white">Text</p>

<!-- Borders -->
<div class="border-gray-200 dark:border-gray-700">Border</div>

<!-- Complete card example -->
<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
  <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Title</h2>
  <p class="text-gray-600 dark:text-gray-300">Description</p>
</div>
```

### Dark Mode Toggle
```javascript
// Toggle dark mode
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark')
  localStorage.setItem('theme', isDark ? 'dark' : 'light')
}

// Initialize on page load
if (localStorage.theme === 'dark' ||
    (!('theme' in localStorage) &&
     window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark')
}
```

## Custom Theme Configuration

### CSS Variables Approach
```css
@layer base {
  :root {
    /* Custom colors */
    --color-brand-50: oklch(0.97 0.02 264);
    --color-brand-500: oklch(0.55 0.22 264);
    --color-brand-900: oklch(0.25 0.15 264);

    /* Custom fonts */
    --font-display: "Satoshi", "Inter", sans-serif;

    /* Custom spacing */
    --spacing-navbar: 4.5rem;

    /* Custom breakpoints */
    --breakpoint-3xl: 120rem;
  }
}
```

### Tailwind Config Extend
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'hsl(var(--color-brand-50))',
          500: 'hsl(var(--color-brand-500))',
          900: 'hsl(var(--color-brand-900))',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
      },
      spacing: {
        navbar: 'var(--spacing-navbar)',
      },
      screens: {
        '3xl': '120rem',
      },
    },
  },
}
```

## Interactive States

### Hover
```html
<button class="bg-blue-500 hover:bg-blue-700">Hover color change</button>
<a class="text-blue-600 hover:underline">Hover underline</a>
<div class="scale-100 hover:scale-105">Hover scale</div>
```

### Focus
```html
<input class="border focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
<button class="focus:outline-none focus:ring-4 focus:ring-blue-300">Focus ring</button>
```

### Active
```html
<button class="bg-blue-500 active:bg-blue-800">Active state</button>
```

### Disabled
```html
<button class="disabled:opacity-50 disabled:cursor-not-allowed" disabled>
  Disabled button
</button>
```

### Group Hover (Parent State)
```html
<div class="group hover:bg-gray-100">
  <p class="group-hover:text-blue-600">Changes on parent hover</p>
  <img class="group-hover:opacity-50" src="..." />
</div>
```

### Peer State (Sibling State)
```html
<input type="checkbox" class="peer" id="terms" />
<label for="terms" class="peer-checked:text-blue-600">
  I accept terms (changes when checkbox checked)
</label>
```

## Best Practices

1. **Mobile-First**: Start with mobile styles, use breakpoints to scale up
2. **Design Tokens**: Use consistent spacing/color scale, avoid arbitrary values
3. **Class Ordering**: Layout → Spacing → Typography → Colors
4. **Avoid Dynamic Classes**: `text-${color}-500` won't work, Tailwind needs full class names
5. **Use cn() Helper**: Merge classes intelligently with `twMerge(clsx(...))`
6. **Extract Repeated Patterns**: Use `@apply` or component abstraction for repeated utilities

## Common Patterns

### Centered Content
```html
<!-- Horizontal center -->
<div class="flex justify-center">Content</div>
<div class="mx-auto w-fit">Content</div>

<!-- Vertical and horizontal center -->
<div class="flex items-center justify-center h-screen">Centered</div>
```

### Full-Width with Max Width
```html
<div class="container mx-auto px-4 max-w-7xl">
  Contained content with padding
</div>
```

### Aspect Ratios
```html
<div class="aspect-square">Square (1:1)</div>
<div class="aspect-video">Video (16:9)</div>
<div class="aspect-[4/3]">Custom ratio</div>
```

### Smooth Scrolling
```html
<html class="scroll-smooth">
  <a href="#section">Smooth scroll to section</a>
</html>
```

---

For official documentation: https://tailwindcss.com/docs
