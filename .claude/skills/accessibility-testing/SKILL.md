---
name: accessibility-testing
description: "Use this when building or changing an EDS block, styles, or scripts on this da.live (Document Authoring) project and you need to verify accessibility. Runs axe-core through Playwright (npm run test:a11y) against DA-authored test content at mobile, tablet, and desktop viewports, checks keyboard and focus behavior, inspects the ARIA snapshot, and tells you whether each fix belongs in block code, global CSS, or the DA document. Invoked from testing-blocks Step 2 and code-review."
license: Apache-2.0
metadata:
  version: "1.0.0"
---

# Accessibility Testing (axe-core + Playwright, DA-aware)

Automated a11y gate for blocks built against **da.live** content. Project-local skill, not from upstream adobe/skills. It fills the gap left by `testing-blocks`, which only takes an accessibility snapshot and never asserts anything.

**Automated checks catch roughly a third of WCAG issues.** A passing axe run is necessary, not sufficient. Always also do the manual checks in Step 4.

## Related Skills

- **testing-blocks**: invokes this skill in Step 2 (browser validation)
- **building-blocks**: a11y requirements to design in (Step 3 and 4) so this gate passes first time
- **accessibility-fix**: page-level remediation of already-published pages; use it for audits, use this skill during development
- **da-content** / **da-auth**: rules and auth for getting test content into DA
- **code-review**: requires this skill's output as evidence

## Tooling in this repo

| File | Purpose |
|---|---|
| `playwright.config.js` | 3 viewport projects (mobile 375, tablet 768, desktop 1200); starts `aem up --html-folder drafts` if nothing is on :3000 |
| `test/a11y/axe.js` | `scan()`, `waitForDecoration()`, `format()` helpers, WCAG 2.0/2.1/2.2 A+AA + best-practice tags |
| `test/a11y/a11y.spec.js` | axe scan + keyboard/focus-indicator walk per URL |
| `test/a11y/pages.json` | default DA pages to scan |

First-time setup: `npm install && npm run test:install` (downloads Chromium).

## Step 1: Get a URL to test

Follow CDD Step 4. For DA the URL is one of:

- **DA-authored page via the dev server** (preferred): `http://localhost:3000/{da-path}`. `aem up` proxies the `.aem.page` preview, so the author must have **previewed** the page in DA (or you pushed and previewed via the da-content/da-auth skills). Saving in DA without preview is invisible here.
- **Local draft**: `drafts/tmp/{name}.plain.html`, served at `http://localhost:3000/drafts/tmp/{name}` (the config already passes `--html-folder drafts`). Use the div-class block format from `da-content/references/html-content.md` so the draft matches what DA will produce.
- **Branch preview**: `BASE_URL=https://{branch}--{repo}--{owner}.aem.page` (config skips the local server).

Cover **every variant** and the states a block can be in (empty optional cells, long text, with/without image) as separate pages or sections. axe only sees what is on the page.

## Step 2: Run axe

```bash
# one block on one page, all three viewports
A11Y_URLS=/drafts/tmp/cards A11Y_BLOCK=cards npm run test:a11y

# several pages
A11Y_URLS=/,/products/widget npm run test:a11y

# one viewport while iterating
A11Y_URLS=/drafts/tmp/cards A11Y_BLOCK=cards npx playwright test test/a11y --project=mobile
```

`A11Y_BLOCK` scopes the scan to `.{block}` so pre-existing issues elsewhere on the page do not hide or pollute results. Before handing off, **also run once without `A11Y_BLOCK`** so header, footer, and cross-block problems (landmarks, heading order, duplicate IDs) surface.

`waitForDecoration()` waits for `data-block-status="loaded"`. A scan taken before decoration tests the undecorated markup and will pass or fail for the wrong reasons.

Output is a compact list (impact, rule, selector, why). Full JSON is attached to the Playwright report: `npx playwright show-report`.

## Step 3: Triage each violation to the right layer

DA is document-based, so the fix is not always code. Decide *where* before editing anything:

| Symptom | Layer | Fix |
|---|---|---|
| `image-alt`, empty link text, "click here", vague link names | **DA document** | Author fixes alt text / link text in da.live, then re-preview. Do not hard-code alt text in block JS. If authors routinely omit it, make the block's content model make it obvious (see content-modeling) |
| `heading-order`, multiple `h1`, skipped levels | **DA document** first; **block JS** if the block emits its own headings | Block must not pick a heading level that depends on where it sits. Preserve the authored heading element when decorating |
| `color-contrast` | **CSS**: block CSS for block-specific, `styles/styles.css` tokens if a global custom property fails | Fix the token, never one-off hex values. Check every variant (`dark`, etc.) and hover/focus/disabled states |
| `button-name`, `aria-*`, `role`, `label` | **Block JS** | Add in `decorate()` |
| `region`, `landmark-*`, `document-title`, `html-has-lang` | **Site**: `scripts/scripts.js`, `head.html`, page metadata | `html-has-lang`: set `document.documentElement.lang` in scripts.js. `document-title`: author sets `Title` in page metadata |
| Keyboard trap, no focus style, no visible focus | **CSS / block JS** | See Step 4 |
| Only reproduces on the live header/footer | **Fragments** (`nav`, `footer` docs in DA) | Fix in those DA documents or `blocks/header`, `blocks/footer` |

A violation that is truly an authoring issue but which the block can make harder to commit (e.g. a card image with no alt) should still be reported to the user as **content to fix in DA**, with the exact page and block instance. Do not silence the rule.

**Never** `disableRules` or `exclude` to get green unless it is a documented false positive. If you do, put the rule id, the reason, and a link in a comment next to it and call it out in the PR.

## Step 4: Manual and semantic checks axe cannot do

Run these for any block with interaction (accordion, tabs, carousel, modal, nav, form, search, video, embed) and spot-check for static blocks.

1. **Keyboard walk.** The spec tabs through up to 40 stops and asserts each is visible and has an outline or box-shadow. You must still confirm *order* matches visual order, `Enter`/`Space` activates buttons, `Esc` closes overlays and returns focus to the trigger, arrow keys follow the ARIA APG pattern for tabs/menus/accordions, and focus is trapped in modals and released on close.
2. **ARIA snapshot.** Assert structure, not just absence of errors:
   ```js
   await expect(page.locator('.tabs')).toMatchAriaSnapshot(`
     - tablist:
       - tab "Overview" [selected]
       - tab "Specs"
     - tabpanel "Overview"
   `);
   ```
   Or print it while developing: `console.log(await page.locator('.tabs').ariaSnapshot())`. (`page.accessibility.snapshot()` was removed from Playwright; do not use it.)
3. **Reflow / zoom.** At the 375px project there must be no horizontal scroll (WCAG 1.4.10). Also check 200% zoom on desktop.
4. **Reduced motion.** Anything that animates or auto-advances must respect `prefers-reduced-motion`. Test with `page.emulateMedia({ reducedMotion: 'reduce' })`.
5. **Target size.** Interactive targets should be at least 24x24 CSS px (WCAG 2.2 SC 2.5.8); aim for 44px on touch.
6. **Forced colors / dark scheme** if the project styles either.

## Step 5: Report

Return to `testing-blocks` with:

- URLs scanned, viewports, whether `A11Y_BLOCK` scoping was used **and** a full-page run was done
- Pass/fail per viewport, and any rules disabled with justification
- Violations fixed, and the layer each was fixed in
- **Content issues for the author** (page, block instance, what to change in DA)
- Manual checks performed (Step 4) and their outcome. State plainly any you did not do.

## Verifying the harness itself

If results look too clean, sanity-check the tooling: serve a draft with an `<img>` lacking `alt`, an empty `<button>`, and low-contrast text, and confirm the spec fails with `image-alt`, `button-name`, and `color-contrast`. Delete the draft afterwards.

## Troubleshooting

| Problem | Cause / fix |
|---|---|
| `Timed out waiting ... from config.webServer` | Port 3000 busy with a non-`aem` process, or `aem` CLI cannot start. Run `npx aem up --html-folder drafts` manually and read the output |
| `waitForFunction` timeout in `waitForDecoration` | Block JS threw during decoration (check console) or the selector has no matches: wrong `A11Y_BLOCK`, or the page was not previewed in DA |
| Page 404 on localhost, exists in DA | Not previewed. Preview in DA (or via the admin API) and retry |
| Flaky contrast results | Web fonts / lazy CSS still loading. Ensure `waitForDecoration` ran; do not add fixed sleeps |
| Passes locally, fails on branch preview | Different content (DA preview is stale) or cookie/consent banner from `delayed.js`. Scan the same URL in both |
