import { readBlockConfig } from '../../scripts/aem.js';
import {
  createText, fetchJson, getChildHref, getSource, slugToName,
} from '../../scripts/products.js';

const DEFAULT_PATH = '/products';

/**
 * Content model (configuration block, 2 columns, all rows optional):
 *   source | products API base URL (default: DummyJSON)
 *   path   | the folder the category pages live in (default: /products)
 * Each tile links to `{path}/{slug}`, for example /products/beauty. The category pages are
 * authored in DA; a tile for a category without a page leads to a 404. Place an H2 above the block.
 * @param {Element} block the block
 */
export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.replaceChildren();
  block.setAttribute('aria-busy', 'true');

  try {
    const categories = await fetchJson(`${getSource(config)}/categories`);
    if (!Array.isArray(categories) || !categories.length) {
      block.append(createText('p', 'product-categories-message', 'No categories found.'));
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'product-categories-items';
    categories.forEach((category) => {
      /* the API returns objects ({ slug, name }); older versions return plain strings */
      const slug = typeof category === 'string' ? category : category.slug;
      const name = typeof category === 'string' ? slugToName(category) : category.name;

      const li = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'product-categories-link';
      link.href = getChildHref(config.path, DEFAULT_PATH, slug);
      link.textContent = name;
      li.append(link);
      ul.append(li);
    });
    block.append(ul);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load categories', error);
    block.append(createText('p', 'product-categories-message', 'Categories are unavailable right now. Please try again later.'));
  } finally {
    block.removeAttribute('aria-busy');
  }
}
