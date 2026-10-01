# CSS Guidelines for AEM Blocks

> **da.live project convention (differs from upstream adobe/skills):** block CSS is scoped by the **block class** (`.my-block`), not by a `main` prefix, and is written with **native CSS nesting**. See `../../UPSTREAM.md`.

## Block Scoping

**All CSS must be scoped to the block.** Every rule in `blocks/{name}/{name}.css` lives inside a single root rule whose selector is the block class. This prevents style leakage between blocks.

**✅ Good - one root rule, everything nested inside it:**
```css
.my-block {
  padding: 1rem;

  & h2 {
    font-size: var(--heading-font-size-m);
  }
}
```

**❌ Bad - not scoped:**
```css
/* This will affect ALL h2 elements on the page */
h2 {
  font-size: var(--heading-font-size-m);
}

/* This will affect any .item anywhere, including other blocks */
.item {
  padding: 1rem;
}
```

**❌ Bad - `main` prefix:**
```css
/* Do not prefix with main. It adds specificity and verbosity and adds no isolation
   that the block class does not already give. */
main .my-block {
  padding: 1rem;
}
```

**Scoping rules:**
- The only top-level selector in a block stylesheet is `.{block-name}` (plus its `@media`/`@container` wrappers if you choose not to nest them). Nothing else at the top level.
- Every descendant, variant, state, and media rule is nested inside that root.
- Exceptions: `header` and `footer` blocks live outside `<main>` and are scoped with their landmark element as the root (`header { ... }`, `footer { ... }`), as the boilerplate does.
- Global styles (`styles/styles.css`, `lazy-styles.css`) are the only place for unscoped element selectors and custom properties.

**Why the block class alone is enough:** `.my-block a` (0,1,1) outranks the global `a` (0,0,1) and `main img` (0,0,2). Against an equal-specificity global rule such as `a.button` (0,1,1), the block wins because block CSS loads after `styles.css`. If a global rule has higher specificity than you expect, fix or lower the global rule instead of adding a prefix.

**⚠️ Special note on `-wrapper` and `-container` classes:**

The platform automatically adds `.{block-name}-wrapper` and `.{block-name}-container` divs *outside* your block. If they appear at the top level they style the platform's wrappers, not anything in your block. Nested inside your root they only match inside your block, but avoid the names anyway:

```css
/* ❌ Bad - top-level, styles the wrapper OUTSIDE your block */
.my-block-wrapper {
  padding: 2rem;
}

/* ✅ Better - use a name that cannot be confused with the platform's */
.my-block {
  & .inner-wrapper {
    padding: 2rem;
  }
}
```

**Best practice:** Do not use a `-wrapper` or `-container` suffix for classes inside your block.

## Native CSS Nesting

Native nesting is supported by all current browsers (Chrome 120+, Safari 17.2+, Firefox 117+). No build step is needed. Do not add Sass or PostCSS.

**Rules:**
- **Nest at most 3 levels deep** (root, element, state/variant). Flatten anything deeper with a class.
- **Every nested rule starts with `&`.** Attach to the same element with `&.dark`, `&:hover`, `&:focus-visible`, `&[aria-expanded='true']`, `&::before`. Target descendants with `& .item`, `& h2`, `& > li`. Never write a bare nested selector (`.item`, `h2`, `> li`). A bare selector like `a:any-link { }` or `h2 { color: red; }` can be mistaken for a property declaration, which breaks syntax highlighting and color previews in many editors. A leading `&` is unambiguous.
- **Nest media queries inside the rule they modify**, not in a separate block at the bottom.
- **Mobile-first, always.** The declarations in a rule are the mobile styles. Add larger screens only with `min-width` range syntax, `@media (width >= 600px)` then `@media (width >= 900px)`, nested in the rule they change. Never use `max-width`/`width <=` queries and never write desktop styles first and undo them for mobile.
- **Never use `&` as a suffix builder** (`&-title`). It is not valid CSS and does not concatenate like Sass.
- Keep one root rule per file. If you need a second top-level rule, it probably belongs to a different block.

```css
.my-block {
  display: flex;
  flex-direction: column;
  padding: 1rem;

  /* element */
  & .item {
    padding: 1rem;

    /* state on a nested element */
    &:hover {
      background-color: var(--light-color);
    }
  }

  & .item-title {
    font-family: var(--heading-font-family);
    font-size: var(--heading-font-size-s);
  }

  /* variants */
  &.dark {
    background-color: var(--dark-color);
    color: var(--clr-white);
  }

  &.wide .item {
    padding: 2rem;
  }

  /* breakpoints, mobile-first, nested in the rule they change */
  @media (width >= 600px) {
    padding: 2rem;
  }

  @media (width >= 900px) {
    flex-direction: row;
    padding: 4rem;
  }
}
```

**Gotchas:**
- Declarations that come *after* a nested rule still apply to the parent, but keep all declarations first, then nested rules, for readability.
- The nested `@media` wraps the **parent's** declarations. It needs no selector when it only changes the root. For a child, nest the media query inside the child (`& .item { @media (width >= 900px) { ... } }`).
- Nested rules add the parent's specificity: `.my-block .item:hover` (0,3,0). Do not stack more levels just to win a fight. Fix the cause.
- Search tools cannot find a nested selector by its full text (`.my-block .item`). Search for the class name alone.

## Naming Conventions

Use descriptive kebab-case class names for elements within your block:

```css
.my-block {
  /* block styles */

  & .item {
    /* item styles */
  }

  & .item-title {
    /* item title styles */
  }

  /* Modifier/variant (class added by the author via the block's variant cell) */
  &.dark {
    /* dark variant styles */
  }

  &.wide .item {
    /* item styles in wide variant */
  }
}
```

**Key points:**
- Use lowercase with hyphens for class names (kebab-case)
- Choose descriptive, semantic names
- Avoid generic names like `.container`, `.wrapper` - be specific to your block

## CSS Custom Properties (Variables)

Leverage CSS custom properties defined in `styles/styles.css` for consistency:

**Colors:**
```css
.my-block {
  background-color: var(--background-color);
  color: var(--text-color);

  & a:any-link {
    color: var(--link-color);

    &:hover {
      color: var(--link-hover-color);
    }
  }
}
```

**Typography:**
```css
.my-block {
  & h2 {
    font-family: var(--heading-font-family);
    font-size: var(--heading-font-size-m);
  }

  & p {
    font-family: var(--body-font-family);
    font-size: var(--body-font-size-m);
  }
}
```

**Layout:**
```css
.my-block {
  max-width: var(--max-content-width);
  padding-inline: var(--inline-section-padding);
}
```

**Available custom properties:**
- Colors: `--clr-*`, `--link-color`, `--background-color`, `--text-color`, etc.
- Fonts: `--body-font-family`, `--heading-font-family`, `--fixed-font-family`
- Font sizes: `--heading-font-size-*`, `--body-font-size-*`
- Layout: `--max-content-width`, `--inline-section-padding`

See `styles/styles.css` for the complete list.

## Mobile-First Responsive Design

Write styles mobile-first, then add nested media queries for larger screens:

```css
.my-block {
  /* Mobile styles (default) */
  padding: 1rem;
  flex-direction: column;

  /* Tablet and up */
  @media (width >= 600px) {
    padding: 2rem;
  }

  /* Desktop and up */
  @media (width >= 900px) {
    flex-direction: row;
    padding: 4rem;
  }
}
```

**Standard breakpoints:**
- Mobile: default (no query; this is what the base declarations are for)
- Tablet: `@media (width >= 600px)`
- Desktop: `@media (width >= 900px)`

**Modern syntax:**
- Use range syntax: `(width >= 600px)` instead of `(min-width: 600px)`
- Use logical properties where appropriate

## Modern CSS Features

Use modern CSS features for better maintainability and performance:

**Logical properties:**
```css
/* Use logical properties for internationalization */
.my-block {
  padding-inline: 1rem; /* left/right in LTR, right/left in RTL */
  padding-block: 2rem; /* top/bottom */
  margin-inline-start: 1rem; /* left in LTR */
  border-inline-start: 2px solid black;
}
```

**Modern layout:**
```css
/* Flexbox */
.my-block {
  display: flex;
  gap: 1rem; /* Better than margin hacks */
  flex-wrap: wrap;
}

/* Grid */
.my-block {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}
```

**Modern color syntax:**
```css
.my-block {
  background-color: rgb(0 0 0 / 20%); /* Modern RGB with alpha */
  color: hsl(200 50% 50%); /* HSL syntax */
}
```

## Keep Specificity Low

Avoid overly specific selectors. Nesting makes it easy to write deep chains by accident.

**✅ Good - low specificity:**
```css
.my-block {
  & .item {
    padding: 1rem;
  }

  & .item-title {
    font-size: 1.5rem;
  }
}
```

**❌ Bad - high specificity:**
```css
.my-block {
  & div div div.item {
    padding: 1rem;
  }

  & > div > h2.item-title {
    font-size: 1.5rem;
  }
}
```

**Best practices:**
- Use classes, not tag names when possible
- Avoid ID selectors
- Keep selector chains short (2-3 levels max), including levels added by nesting
- Do not nest deeper than necessary

## Handling Variants

Use the variant class alongside the block class with `&`:

```css
.my-block {
  /* Base block */
  background-color: var(--background-color);
  color: var(--text-color);

  /* Dark variant */
  &.dark {
    background-color: var(--dark-color);
    color: var(--clr-white);
  }

  /* Wide variant */
  &.wide {
    max-width: 100%;
  }

  /* Combining variants */
  &.dark.wide {
    /* Styles for both dark and wide */
  }
}
```

Test every variant for contrast and focus visibility (see accessibility-testing).

## Performance Considerations

**Minimize reflows and repaints:**
```css
.my-block .item {
  /* Prefer transforms over position changes */
  transform: translateX(10px); /* Better performance */

  /* Avoid this: */
  /* left: 10px; Triggers reflow */
}
```

**Use will-change sparingly:**
```css
/* Only for elements that will definitely animate */
.my-block .animated-item {
  will-change: transform;
}
```

**Avoid expensive properties on large elements:**
```css
/* Be careful with these on large areas: */
/* box-shadow, border-radius, opacity, filters */
```

## Code Style

**Formatting:**
- Use 2-space indentation, one extra level per nesting level
- One selector per line for multiple selectors
- Opening brace on same line as selector
- One property per line
- Space after colon in property declarations
- No space before colon
- End all declarations with semicolon
- Declarations first, then a blank line, then nested rules

**Example:**
```css
.my-block,
.my-block .item {
  display: flex;
  padding: 1rem;
  gap: 1rem;
}
```

**Order of properties** (recommended):
1. Layout (display, position, top, left, etc.)
2. Box model (width, height, margin, padding, border)
3. Visual (background, color, font, etc.)
4. Animation/transform

## Common Patterns

### Reset list styles
```css
.my-block {
  & ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
}
```

### Center content
```css
.my-block {
  max-width: var(--max-content-width);
  margin-inline: auto;
}
```

### Aspect ratio containers
```css
.my-block {
  & .video-container {
    aspect-ratio: 16 / 9;
  }
}
```

### Truncate text
```css
.my-block {
  & .truncated {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
```

### Visible focus
```css
.my-block {
  & a,
  & button {
    &:focus-visible {
      outline: 2px solid currentcolor;
      outline-offset: 2px;
    }
  }
}
```

### Reduced motion
```css
.my-block {
  & .item {
    @media (prefers-reduced-motion: no-preference) {
      transition: transform 0.2s;
    }
  }
}
```

## Anti-Patterns to Avoid

**❌ Don't use !important:**
```css
/* Avoid this */
.my-block {
  color: red !important;
}

/* Fix specificity issues properly instead */
```

**❌ Don't prefix with `main`:**
```css
/* Bad */
main .my-block { }

/* Good */
.my-block { }
```

**❌ Don't put more than one top-level rule in a block stylesheet:**
```css
/* Bad - second top-level rule styles something outside the block */
.my-block {
  /* ... */
}

header {
  background: red;
}
```

**❌ Don't hardcode values when variables exist:**
```css
/* Bad */
.my-block {
  font-family: 'Lato', sans-serif;
  color: #666;
}

/* Good */
.my-block {
  font-family: var(--body-font-family);
  color: var(--text-color);
}
```

**❌ Don't use absolute positioning for layout:**
```css
/* Prefer flexbox or grid for layout */
/* Use absolute positioning only for visual effects */
```
