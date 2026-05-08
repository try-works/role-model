# Swiss Design System — Tailwind Configuration

## Tailwind v3 (`tailwind.config.js`)

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,jsx,ts,tsx}'],
  darkMode: 'media', // respects prefers-color-scheme automatically
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'IBM Plex Sans',
          'Hanken Grotesk',
          'Barlow',
          'Host Grotesk',
          'DM Sans',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'IBM Plex Mono',
          'Fira Code',
          'ui-monospace',
          'monospace',
        ],
      },
      maxWidth: {
        prose: '60ch',
        'prose-wide': '72ch',
      },
      lineHeight: {
        'display': '1',
        'heading': '1.15',
      },
      letterSpacing: {
        'display': '-0.02em',
        'label': '0.08em',
      },
    },
  },
  plugins: [],
}
```

---

## Tailwind v4 CSS config (`@theme` block)

Add to your main CSS file:

```css
@import "tailwindcss";

@theme {
  --font-sans: 'IBM Plex Sans', 'Hanken Grotesk', 'Barlow', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', 'Fira Code', ui-monospace, monospace;

  --max-width-prose: 60ch;
  --max-width-prose-wide: 72ch;

  --line-height-display: 1;
  --line-height-heading: 1.15;

  --letter-spacing-display: -0.02em;
  --letter-spacing-label: 0.08em;
}
```

---

## Google Fonts `<link>` tag

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&display=swap" rel="stylesheet">
```

---

## Tailwind CDN Play (no build step)

For prototypes and demos:

```html
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    darkMode: 'media',
    theme: {
      extend: {
        fontFamily: {
          sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
          mono: ['IBM Plex Mono', 'monospace'],
        },
      },
    },
  }
</script>
```

---

## Full global CSS block

Paste after your Tailwind imports:

```css
/* Swiss Design System — global tokens */
:root {
  --font-sans: 'IBM Plex Sans', 'Hanken Grotesk', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  /* Accent — override this per project */
  --accent: #C8102E;
  --accent-60: rgba(200, 16, 46, 0.60);
  --accent-20: rgba(200, 16, 46, 0.20);
  --accent-10: rgba(200, 16, 46, 0.10);
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Swap accent globally: just update this block */
/* 
:root { --accent: #003B8E; }  Cobalt
:root { --accent: #F0B429; }  Golden
:root { --accent: #2D6A4F; }  Forest
*/
```

---

## Switching accent colors

To change the accent for a project, update both the CSS variable and the Tailwind arbitrary values:

```css
:root { --accent: #003B8E; } /* Cobalt */
```

And in your HTML use `bg-[#003B8E]`, `text-[#003B8E]`, `border-[#003B8E]` consistently. Since there is only one accent per project, a global find-replace is safe.
