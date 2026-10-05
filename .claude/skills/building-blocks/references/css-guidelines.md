# CSS Guidelines for AEM Blocks

> **da.live project convention (differs from upstream adobe/skills):** block CSS is scoped by the **block class** (`.my-block`), not by a `main` prefix; it is written with **native CSS nesting**, **mobile-first**, and **design tokens** (no raw values in properties). See `../../UPSTREAM.md`.

> **Placeholder values in examples:** the examples below that show raw numbers (`padding: 1rem`, `gap: 2rem`) illustrate selector structure, nesting and media queries only. In real block CSS every such value is a design token; see [Design Tokens](#design-tokens) for how, and the `Good`/`Bad` pairs there.

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

## Design Tokens

Blocks never state raw design values (colors, spacing, radii, shadows, durations, font sizes) in their property declarations. Every value is a token. There are three layers:

| Layer | Where it lives | Examples | Rule |
|---|---|---|---|
| **Primitives** | `styles/tokens.css` | `--size-16`, `--border-color`, `--brand-primary-color` | Raw scale values. Everything else is built on them. |
| **Semantics** | `styles/tokens.css` | `--text-color`, `--border`, `--border-radius-card`, `--block-gutter`, `--focus-outline`, `--shadow-raised`, `--animation-fade-in-up` | Named by role, not by value; site-wide meaning. |
| **Block tokens** | top of the block's root rule | `--cards-gap`, `--hero-padding-block` | What this block lets vary. They reference a semantic token, or a primitive when no semantic one fits. |

**Read `styles/tokens.css` before writing block CSS and reuse what is there.** If the project has no tokens from a design system (no Figma tokens), create them: a primitive for a new scale step, a semantic token for a role, a block token for anything specific to one block.

**✅ Good - block tokens first, properties use them, breakpoints and variants change the tokens:**
```css
.promo {
  /* block tokens: the only place this block states a value */
  --promo-columns: 1fr;
  --promo-gap: var(--block-gap);
  --promo-padding: var(--size-16);
  --promo-border: var(--border);
  --promo-radius: var(--border-radius-card);
  --promo-background: var(--light-color);

  display: grid;
  grid-template-columns: var(--promo-columns);
  gap: var(--promo-gap);

  & .promo-item {
    padding: var(--promo-padding);
    border: var(--promo-border);
    border-radius: var(--promo-radius);
    background-color: var(--promo-background);
  }

  /* responsive: change the token, not the property */
  @media (width >= 600px) {
    --promo-columns: repeat(2, 1fr);
  }

  @media (width >= 900px) {
    --promo-columns: repeat(3, 1fr);
  }

  /* variants: change tokens, do not redeclare properties */
  &.dark {
    --promo-background: var(--dark-color);
  }
}
```

**❌ Bad - raw values, and the property is redeclared at every breakpoint:**
```css
.promo {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  & .promo-item {
    padding: 16px;
    border: 1px solid #dadada;
    border-radius: 24px;
  }

  @media (width >= 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

**Rules:**
1. **Declare block tokens first**, at the top of the block's root rule (`header`/`footer` blocks use their landmark as the root). Name them `--{block}-{role}` in kebab-case (`--product-list-gap`).
2. **Reference, do not restate.** A block token points at a semantic token if one has the right meaning, otherwise at a primitive (`var(--size-16)`). A raw value is allowed only when no token exists and the value is specific to this block (for example a 5.2rem toggle width); it lives in the block token, never inline in a property.
3. **What needs a token:** colors, backgrounds, borders, radii, shadows, spacing (padding, margin, gap), sizes that vary, font sizes, transition and animation values, and anything that changes per breakpoint or variant. **What does not:** structural keywords and mechanics (`display`, `position`, flex/grid keywords, `0`, `auto`, `100%`, `inset: 0`), relative typographic units (`em`, `ch`), and decorative icon geometry (arrows, play triangles, hamburger bars). For text that only assistive technology needs, add the global `.sr-only` class in the JS; do not copy the visually-hidden rules into a block.
4. **Responsive and variants change token values.** Set the token inside a nested `@media` (mobile-first) or inside `&.variant`; the property keeps using `var(--token)`. Put the media query in the rule that consumes the token when one element changes, on the root when many do.
5. **Block tokens never reference another block's tokens.** They reference semantic or primitive tokens only.
6. **Typography:** use the semantic font-size tokens (`--body-font-size`, `--small-font-size`, `--h1-font-size` to `--h6-font-size`). They already change per breakpoint, so do not add media queries for font size. Card-sized text is a block token pointing at a size primitive (`--card-title-size: var(--size-20)`), because the heading tokens scale up to very large sizes on desktop.
7. **Missing token?** Used by two or more blocks, or has a site-wide meaning: add a semantic token to `styles/tokens.css` (and a primitive if the scale lacks the step). Used by one block: add a block token. Do not invent a token name without declaring it: `npm run lint` runs `lint:tokens`, which fails on any custom property that is used but never declared.
8. **Raw colors are lint errors in blocks** (`npm run lint:css`): no hex, `rgb()`, `hsl()` or named colors in a property declaration. A color value belongs in `tokens.css` or in a block token declaration. `currentcolor` and `transparent` are fine.
9. **Animation:** keyframes cannot be nested, so they live in `styles/styles.css`. Blocks use the `--animation-*` tokens (`animation: var(--animation-fade-in-up)`), and gate them in `@media (prefers-reduced-motion: no-preference)`.
10. **The one allowed second top-level rule** is the wrapper opt-out for a full-bleed block (for example `.hero-container .hero-wrapper { max-width: unset; padding: 0; }`), written with no raw values.
11. **Do not use removed or legacy tokens** (`--clr-*`, `--body-font-size-xs`, `--body-font-size-s`, `--body-font-size-m`, `--heading-font-size-*`). `lint:tokens` catches these.

**Token groups in `styles/tokens.css`** (open the file for the current names and values):
- **Colors:** `--background-color`, `--light-color`, `--dark-color`, `--text-color`, `--link-color`, `--brand-*`, `--border-color`, `--overlay-color`, `--error-color`, `--gradient`, `--skeleton-*`
- **Fonts and sizes:** `--body-font-family`, `--heading-font-family`, `--brand-font-family`; `--size-*` primitives; `--body-font-size`, `--small-font-size`, `--h1-font-size` to `--h6-font-size`
- **Spacing and layout:** `--block-gap`, `--block-gutter`, `--section-padding-block`, `--text-margin`, `--max-content-width`, `--touch-target`
- **Borders and shadows:** `--border`, `--border-width`, `--border-width-thick`, `--border-radius*` (per component: `-card`, `-button`, `-input`, `-modal`, `-accordion`, `-media`), `--shadow-raised`, `--focus-outline`, `--focus-outline-offset`
- **Motion:** `--transition-speed`, `--transition-speed-fast`, `--transition-ease`, `--transition-type-*`, `--animation-*`, `--animation-stagger`
- **Buttons:** `--button-*`

## Mobile-First Responsive Design

Write styles mobile-first, then add nested media queries for larger screens. When a value changes with the screen size, the media query changes the **token**, and the property keeps using it:

```css
.my-block {
  /* block tokens: mobile values (default) */
  --my-block-padding: var(--size-16);
  --my-block-direction: column;

  padding: var(--my-block-padding);
  flex-direction: var(--my-block-direction);

  /* Tablet and up */
  @media (width >= 600px) {
    --my-block-padding: var(--size-24);
  }

  /* Desktop and up */
  @media (width >= 900px) {
    --my-block-direction: row;
    --my-block-padding: var(--size-48);
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

Use the variant class alongside the block class with `&`, and let it **change tokens** (not redeclare properties):

```css
.my-block {
  /* Base block */
  --my-block-background: var(--background-color);
  --my-block-color: var(--text-color);
  --my-block-max-width: var(--max-content-width);

  background-color: var(--my-block-background);
  color: var(--my-block-color);
  max-width: var(--my-block-max-width);

  /* Dark variant */
  &.dark {
    --my-block-background: var(--dark-color);
    --my-block-color: var(--background-color);
  }

  /* Wide variant */
  &.wide {
    --my-block-max-width: 100%;
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
      outline: var(--focus-outline);
      outline-offset: var(--focus-outline-offset);
    }
  }
}
```

### Visually hidden text (screen readers only)
Use the global `.sr-only` utility from `styles/styles.css`; never re-create it in a block stylesheet.
```javascript
// in decorate(): the star icon is decorative, the sentence is what assistive technology reads
const label = document.createElement('span');
label.className = 'sr-only';
label.textContent = 'Rated 4.5 out of 5';
```
A live region for announcements is the same class plus `role="status"` (create it empty first, then change its text). To show the text at a larger size, override only the properties you need to undo (`position`, `width`, `height`, `margin`, `overflow`, `clip-path`) in the block under a `min-width` query.

### Reduced motion
```css
.my-block {
  & .item {
    @media (prefers-reduced-motion: no-preference) {
      transition: var(--transition-type-transform) var(--transition-speed-fast) var(--transition-ease);
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

**❌ Don't hardcode design values; use tokens:**
```css
/* Bad: raw color, spacing, radius and duration (the color is also a lint error) */
.my-block {
  font-family: 'Lato', sans-serif;
  color: #666;
  padding: 16px;
  border-radius: 24px;
  transition: background-color 0.2s;
}

/* Good: block tokens that reference semantic tokens, used by the properties */
.my-block {
  --my-block-color: var(--dark-color);
  --my-block-padding: var(--size-16);
  --my-block-radius: var(--border-radius-card);

  font-family: var(--body-font-family);
  color: var(--my-block-color);
  padding: var(--my-block-padding);
  border-radius: var(--my-block-radius);
  transition: var(--transition-type-bg) var(--transition-speed-fast) var(--transition-ease);
}
```

**❌ Don't redeclare a property at every breakpoint or variant; change the token:**
```css
/* Bad */
.my-block { gap: 16px; }
@media (width >= 900px) { .my-block { gap: 32px; } }

/* Good */
.my-block {
  --my-block-gap: var(--size-16);

  gap: var(--my-block-gap);

  @media (width >= 900px) {
    --my-block-gap: var(--size-32);
  }
}
```

**❌ Don't use a token that is not declared** (a typo, or a removed one such as `--body-font-size-s`). The declaration becomes invalid and the value silently falls back; `npm run lint` (`lint:tokens`) fails on it.

**❌ Don't use absolute positioning for layout:**
```css
/* Prefer flexbox or grid for layout */
/* Use absolute positioning only for visual effects */
```
