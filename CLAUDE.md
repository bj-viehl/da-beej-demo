# da-beej-demo

AEM Edge Delivery Services site authored in **da.live** (document-based authoring). Code-only repo; content lives in DA.

## Workflow

Any block, style, or script change follows the `content-driven-development` skill (`.claude/skills/`). Do not write code before test content exists in DA (previewed) or as a local draft.

**A change is not done until:**
1. `npm run lint` passes (see note on pre-existing errors below)
2. `npm run test:a11y` passes with zero axe violations at mobile/tablet/desktop for the block, plus one un-scoped page run (see `accessibility-testing` skill)
3. Keyboard/focus behavior was checked for interactive blocks
4. Authoring-side problems (missing alt text, heading levels, link text) are reported as DA content fixes, never papered over in JS or by disabling axe rules

## JS convention

- Each block is `blocks/{name}/{name}.js` with `export default function decorate(block)` (async only if it awaits). Re-use authored elements; name rows/cells by role with `{block}-{role}` classes (`hero-media`, `hero-content`) via `block.children`; document the content model in the JSDoc.
- Do not autoblock what authors can author as a block. `scripts.js` has no autoblocks (the hero is an authored block).

## CSS convention

- Block CSS has **one top-level rule, the block class** (`.cards { ... }`), with everything nested inside it using native CSS nesting. `header`/`footer` blocks use their landmark element as the root.
- **No `main` prefix** on block selectors.
- Nest at most 3 levels. **Every nested selector starts with `&`**: `& .item`, `& h2`, `&.dark`, `&:hover` (bare nested selectors break editor syntax highlighting).
- Mobile-first: base declarations are mobile; larger screens use nested `min-width` range queries only (`@media (width >= 900px)`), never `max-width`.
- Details and examples: `.claude/skills/building-blocks/references/css-guidelines.md`. Existing boilerplate blocks predate this and are not yet converted.

## Commands

| | |
|---|---|
| `aem up --no-open --html-folder drafts` | dev server, proxies `.aem.page` preview; drafts at `drafts/tmp/*.plain.html` |
| `npm run test:install` | one-time Chromium download for Playwright |
| `A11Y_URLS=/path A11Y_BLOCK=cards npm run test:a11y` | axe + keyboard scan, scoped to a block |
| `BASE_URL=https://branch--da-beej-demo--bj-viehl.aem.page npm run test:a11y` | scan a remote preview |

## Notes

- DA content is only visible locally after it has been **previewed**.
- `.claude/skills/UPSTREAM.md` records where skills came from and what was changed locally.
- Known lint errors outside this skills work: `scripts/sidekick.js` (`NX_ORIGIN` not exported from scripts.js); vendored `plugins/experimentation/tests/` (unresolved `monocart-coverage-reports`, and `@playwright/test` flagged as a devDependency now that it is installed).
