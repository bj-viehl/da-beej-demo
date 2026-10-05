# Skill provenance

Skills in this directory are vendored from [adobe/skills](https://github.com/adobe/skills) (Apache-2.0) and adapted for a **da.live / document-based authoring** project.

- Upstream commit: `e68296b` (2026-09-27)
- Sources: `plugins/aem/edge-delivery-services/skills/*` and `plugins/aem/edge-delivery-services-content-ops/skills/accessibility-fix`
- Removed on import: per-skill `.releaserc.json`, `CHANGELOG.md`, `package.json` (semantic-release plumbing), `.cache/`
- Not imported (Universal Editor, or import/migration pipelines not needed yet): `ue-component-model`, `figma-to-content`, `snowflake`, `slicc-handoff`, `page-import`, `scrape-webpage`, `generate-import-html`, `identify-page-structure`, `page-decomposition`, `preview-import`

## Local changes (version suffix `-da.N`)

| Skill | Change |
|---|---|
| `accessibility-testing` | **New.** axe-core + Playwright gate, keyboard/ARIA checks, triage to DA document vs block JS vs CSS vs site config |
| `testing-blocks` | Mandatory Step 2b (accessibility-testing); replaced removed `page.accessibility.snapshot()` with `ariaSnapshot()`; DA preview notes; `npm test` = Playwright, unit tests use `test:unit` |
| `building-blocks` | Accessibility requirements for JS decoration and CSS; a11y inputs to testing step. **CSS convention changed:** scope with the block class (no `main` prefix), native CSS nesting with `&` on every nested selector, mobile-first, and a three-layer **design token system** (primitives and semantics in `styles/tokens.css`, block tokens at the top of the block's root rule, breakpoints and variants change token values); `references/css-guidelines.md` rewritten |
| `building-blocks` (JS) | `js-guidelines.md`: name rows/cells by role (`{block}-{role}`), document content model in JSDoc, do not autoblock what authors can author |
| `content-driven-development` | a11y acceptance criteria, content-model guidance for authors, DA preview note, axe in lint/test step, PR template section |
| `code-review` | a11y evidence required; authored-semantics check; CSS checks enforce single `.block` root, nesting rules, and flag the `main` prefix; also require `&` on every nested selector, `min-width`-only mobile-first queries, and the design token rules (no raw colors, no undefined tokens, block tokens first) |

## Updating from upstream

```bash
git clone --depth 1 https://github.com/adobe/skills /tmp/adobe-skills
diff -ru /tmp/adobe-skills/plugins/aem/edge-delivery-services/skills/building-blocks .claude/skills/building-blocks
```

Re-apply the local changes above on top of upstream; do not overwrite the `-da.N` skills blindly. Update the commit hash here.
