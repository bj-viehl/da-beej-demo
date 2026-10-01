---
name: building-blocks
description: "Use this when implementing code changes in AEM Edge Delivery Services (EDS, Franklin, Helix), whether new or modified blocks, core functionality (scripts.js, styles, delayed.js, etc.), or both. Creates and modifies block folders and decorate functions, updates core scripts, scopes CSS, and wires up delayed loading. For the overall development process use content-driven-development."
license: Apache-2.0
metadata:
  version: "2.0.1-da.1"
---

# Building Blocks

This skill guides you through implementing AEM Edge Delivery blocks following established patterns and best practices. Blocks transform authored content into rich, interactive experiences through JavaScript decoration and CSS styling.

**IMPORTANT: This skill should ONLY be invoked from the content-driven-development skill during Step 5 (Implementation).**

If you are not already following the CDD process, STOP and invoke the **content-driven-development** skill first.

## Related Skills

- **content-driven-development**: MUST be invoked before using this skill to ensure content and content models are ready
- **da-auth**: Obtain a valid Adobe IMS token if test content needs to be pushed to DA before implementation can begin
- **block-collection-and-party**: Use to find similar blocks for patterns
- **testing-blocks**: Automatically invoked during Step 5 for comprehensive testing
- **accessibility-testing**: Run during Step 5 (via testing-blocks) and, for interactive blocks, use its axe + Playwright loop *while* implementing Steps 3-4
- **da-content**: The block's authored HTML comes from DA (div-class form); know what DA actually delivers before decorating

## When to Use This Skill

This skill is invoked automatically by **content-driven-development** during Step 5 (Implementation). It handles:

**Block Development:**
- Creating new block files and structure
- Implementing JavaScript decoration
- Adding CSS styling

**Core Functionality:**
- Scripts.js modifications (decoration, utilities, auto-blocking)
- Global styles (styles.css, lazy-styles.css)
- Delayed functionality (delayed.js)
- Configuration changes

**Combined:**
- Blocks with supporting core changes (utilities, global styles, etc.)

Prerequisites (verified by CDD):
- ✅ Test content exists (in CMS or local drafts)
- ✅ Content model is defined/documented (if applicable)
- ✅ Test content URL is available
- ✅ Dev server is running

## Block Implementation Workflow

Track your progress:
- [ ] Step 1: Find similar blocks for patterns (if new block or major changes)
- [ ] Step 2: Create or modify block structure (files and directories)
- [ ] Step 3: Implement JavaScript decoration (skip if CSS-only)
- [ ] Step 4: Add CSS styling
- [ ] Step 5: Test implementation (invokes testing-blocks skill, includes axe accessibility gate)

**Note:** If your changes require core modifications (utilities in scripts.js, global styles, etc.), make those changes first, test them, then return to this workflow. See "When Modifying Core Files" below.

## Step 1: Find Similar Blocks

**When to use:** Creating new blocks or making major structural modifications

**Skip this step when:** Making minor modifications to existing blocks (CSS tweaks, small decoration changes)

**Quick start:**

1. Search the codebase for similar blocks:
   ```bash
   ls blocks/
   ```

2. Use the **block-collection-and-party** skill to find reference implementations

3. Review patterns from similar blocks:
   - DOM manipulation strategies
   - CSS architecture
   - Variant handling
   - Performance optimizations

## Step 2: Create or Modify Block Structure

### For New Blocks:

1. Create the block directory and files:
   ```bash
   mkdir -p blocks/{block-name}
   touch blocks/{block-name}/{block-name}.js
   touch blocks/{block-name}/{block-name}.css
   ```

2. Basic JavaScript structure:
   ```javascript
   /**
    * decorate the block
    * @param {Element} block the block
    */
   export default async function decorate(block) {
     // Your decoration logic here
   }
   ```

3. Basic CSS structure:
   ```css
   /* One root rule scoped to the block class; everything else is nested inside it */
   .{block-name} {
     /* block styles */
   }
   ```

### For Existing Blocks:

1. Locate the block directory: `blocks/{block-name}/`
2. Review current implementation:
   ```bash
   # View the initial HTML structure from the server
   curl http://localhost:3000/{test-content-path}
   ```
3. Understand existing decoration logic and styles

## Step 3: Implement JavaScript Decoration

**Essential pattern - re-use existing DOM elements:**

```javascript
export default async function decorate(block) {
  // Platform delivers images as <picture> elements with <source> tags
  const picture = block.querySelector('picture');
  const heading = block.querySelector('h2');

  // Create new structure, re-using existing elements
  const figure = document.createElement('figure');
  figure.append(picture);  // Re-uses picture element

  const wrapper = document.createElement('div');
  wrapper.className = 'content-wrapper';
  wrapper.append(heading, figure);

  block.replaceChildren(wrapper);

  // Only check variants when they affect decoration logic
  // CSS-only variants like 'dark', 'wide' don't need JS
  if (block.classList.contains('carousel')) {
    // Carousel variant needs different DOM structure/behavior
    setupCarousel(block);
  }
}
```

### Accessibility requirements for decoration (design these in, do not bolt on)

This is a document-based site: authors control text, links, images, and heading levels in DA. Your decorate function must **preserve** those semantics and **add** what a document cannot express.

- **Keep authored elements.** Move existing `h2`, `a`, `picture > img` nodes (see re-use pattern above). Never rebuild a link or heading from `textContent`; that discards alt text, `title`, and heading level.
- **Never hard-code heading levels** that depend on position. Keep what the author wrote, and document the expected level in the content model.
- **Never invent alt text** in JS. If an `img` has no `alt`, leave it and let accessibility-testing report it as a content fix in DA. Decorative imagery: empty `alt=""` authored in DA, or CSS background.
- **Use native elements first**: `<button>` for actions, `<a href>` for navigation, `<details>/<summary>` for disclosure. Do not put `click` handlers on `div`s.
- **Widgets follow the ARIA APG pattern** (tabs, accordion, carousel, modal, menu): roles, `aria-selected`/`aria-expanded`/`aria-controls`, roving `tabindex`, arrow/Home/End/Esc keys, focus moves into a dialog on open and back to the trigger on close. Set state via attributes, not just classes, so assistive tech and CSS share one source of truth.
- **Unique IDs.** Blocks repeat on a page; generate IDs with a counter or `crypto.randomUUID()` slice, never a fixed string.
- **Accessible names** for icon-only buttons and carousels (`aria-label`, `aria-roledescription`), and `aria-live="polite"` for dynamic updates.
- **Respect `prefers-reduced-motion`** for any animation, autoplay, or smooth scroll.
- **Do not break the no-JS / pre-decoration state** more than necessary: LCP content should be readable before `decorate()` completes.

**For complete JavaScript guidelines including:**
- Advanced DOM manipulation patterns
- Fetching data and loading modules
- Performance optimization techniques
- Helper functions from aem.js
- Code style and linting rules

**Read [references/js-guidelines.md](references/js-guidelines.md)**

## Step 4: Add CSS Styling

**Essential patterns - scoped to the block class, nested, responsive, using custom properties:**

```css
/* One root rule named for the block. No `main` prefix. Nest everything inside it. */
.my-block {
  /* Use CSS custom properties for consistency */
  background-color: var(--background-color);
  color: var(--text-color);
  font-family: var(--body-font-family);
  max-width: var(--max-content-width);

  /* Mobile-first styles (default) */
  padding: 1rem;
  flex-direction: column;

  h2 {
    font-family: var(--heading-font-family);
    font-size: var(--heading-font-size-m);
  }

  .item {
    display: flex;
    gap: 1rem;
  }

  /* Variants and states use & - most variants are CSS-only */
  &.dark {
    background-color: var(--dark-color);
    color: var(--clr-white);
  }

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

Nesting rules: at most 3 levels, `&` for variants/states/pseudo-elements, media queries nested in the rule they change, one root rule per file (`header` and `footer` blocks use their landmark element as the root).

**For complete CSS guidelines including:**
- Block scoping and native nesting rules
- All available CSS custom properties
- Modern CSS features (grid, logical properties, etc.)
- Performance optimization
- Naming conventions
- Common patterns and anti-patterns

**Read [references/css-guidelines.md](references/css-guidelines.md)**

**Note on iterative validation:** While building, you can test changes in your browser as you go (load test content URL, check console, verify layout and functionality). For fast a11y feedback while iterating, scope axe to the block on one viewport: `A11Y_URLS=/your/test/page A11Y_BLOCK=my-block npx playwright test test/a11y --project=mobile`. For comprehensive testing guidance including browser testing techniques, responsive testing, and validation approaches, see the testing-blocks skill invoked in Step 5.

## Step 5: Test Implementation

**After implementation is complete, invoke the testing-blocks skill.**

The testing-blocks skill will guide you through:
- Browser testing (functionality, responsive behavior across viewports)
- Linting and fixing issues
- **Accessibility testing with axe-core + Playwright (mandatory, via the accessibility-testing skill)**
- Writing unit tests for logic-heavy utilities (if needed)
- Screenshot capture for validation
- Performance validation

**Provide the testing-blocks skill with:**
- Block name being tested
- Whether the block is interactive (determines how deep the manual keyboard/ARIA checks go)
- Test content URL(s) (from step 4 of CDD process)
- Any variants that need testing
- Screenshots of existing implementation/design/mockup to verify against
- Acceptance criteria to verify (from step 2 of CDD process)

**After testing is complete, return to CDD workflow.**

---

## When Modifying Core Files

If your changes require modifying core files (scripts.js, styles.css, delayed.js), follow these principles:

**Common core files:**
- **scripts.js** - Decoration utilities, auto-blocking logic, page loading
- **styles.css** - Global styles (eager), CSS custom properties
- **lazy-styles.css** - Global styles (lazy loaded)
- **delayed.js** - Marketing, analytics, third-party integrations

**Key principles:**

1. **Make core changes first** (before block changes that depend on them)
2. **Test core changes independently** with existing content before using in blocks
3. **Consider impact** - core changes can affect multiple blocks/pages
4. **Test thoroughly** - verify no regressions in existing functionality
5. **Keep it minimal** - only add what's necessary
6. **Document with code comments** - most core changes don't need separate docs

**Testing core changes:**
- Test with existing content URLs that use affected functionality
- For auto-blocking: test pages that should/shouldn't trigger it
- For global styles: test across multiple blocks and pages
- Check console for errors
- Verify responsive behavior

**For detailed patterns:**
- JavaScript: See [references/js-guidelines.md](references/js-guidelines.md)
- CSS: See [references/css-guidelines.md](references/css-guidelines.md)

---

## Reference Materials

- [references/js-guidelines.md](references/js-guidelines.md) - Complete JavaScript patterns and best practices
- [references/css-guidelines.md](references/css-guidelines.md) - Complete CSS patterns and best practices
