import AxeBuilder from '@axe-core/playwright';

// WCAG 2.2 AA is the target; best-practice catches EDS-relevant extras (landmarks, headings).
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/**
 * Wait until EDS has finished decorating (sections/blocks get data-*-status="loaded").
 * @param {import('@playwright/test').Page} page
 * @param {string} [blockName] limit the wait to one block
 */
export async function waitForDecoration(page, blockName) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction((name) => {
    const scope = name ? [...document.querySelectorAll(`.${name}`)] : [...document.querySelectorAll('[data-block-status], [data-section-status]')];
    return scope.length > 0 && scope.every((el) => {
      const status = el.dataset.blockStatus || el.dataset.sectionStatus;
      return status === 'loaded';
    });
  }, blockName, { timeout: 15_000 });
  // header/footer load asynchronously after main
  await page.waitForLoadState('networkidle');
}

/**
 * Run axe against the page (or one block) and return violations.
 * @param {import('@playwright/test').Page} page
 * @param {object} [opts]
 * @param {string} [opts.block] block name to scope the scan to (e.g. "cards")
 * @param {string[]} [opts.exclude] extra selectors to exclude
 * @param {string[]} [opts.disableRules] axe rule ids to disable (document why in the spec)
 */
export async function scan(page, { block, exclude = [], disableRules = [] } = {}) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (block) builder = builder.include(`.${block}`);
  exclude.forEach((selector) => { builder = builder.exclude(selector); });
  if (disableRules.length) builder = builder.disableRules(disableRules);
  const { violations } = await builder.analyze();
  return violations;
}

/** Compact, actionable violation summary for test output and agent consumption. */
export function format(violations) {
  return violations.map((v) => [
    `[${v.impact}] ${v.id}: ${v.help}`,
    `  ${v.helpUrl}`,
    ...v.nodes.slice(0, 5).map((n) => `  - ${n.target.join(' ')}\n    ${n.failureSummary.split('\n').slice(1).join(' ')}`),
  ].join('\n')).join('\n\n');
}
