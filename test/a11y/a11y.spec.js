import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { scan, format, waitForDecoration } from './axe.js';

// A11Y_URLS=/drafts/foo,/products   -> paths (or full URLs) to scan
// A11Y_BLOCK=cards                  -> scope the scan to one block
const { pages } = JSON.parse(readFileSync('test/a11y/pages.json', 'utf8'));
const urls = process.env.A11Y_URLS ? process.env.A11Y_URLS.split(',').map((u) => u.trim()) : pages;
const block = process.env.A11Y_BLOCK || undefined;

for (const url of urls) {
  test.describe(`axe: ${url}${block ? ` [${block}]` : ''}`, () => {
    test('has no WCAG 2.2 AA violations', async ({ page }, testInfo) => {
      await page.goto(url);
      await waitForDecoration(page, block);

      const violations = await scan(page, { block });
      await testInfo.attach('axe-violations', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
      expect(violations.length, `\n${format(violations)}\n`).toBe(0);
    });

    test('has a usable keyboard path', async ({ page }) => {
      await page.goto(url);
      await waitForDecoration(page, block);

      // Every Tab stop must show a visible focus indicator and never be hidden/zero-size.
      const stops = [];
      for (let i = 0; i < 40; i += 1) {
        await page.keyboard.press('Tab');
        const info = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const hasOutline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
          const hasShadow = cs.boxShadow !== 'none';
          return {
            el: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : ''}`,
            visible: r.width > 0 && r.height > 0,
            focusStyle: hasOutline || hasShadow,
          };
        });
        if (!info || stops.includes(info.el)) break;
        stops.push(info.el);
        expect.soft(info.visible, `${info.el} is focusable but has no size`).toBe(true);
        expect.soft(info.focusStyle, `${info.el} has no visible focus indicator`).toBe(true);
      }
    });
  });
}
