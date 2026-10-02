import { readBlockConfig, toClassName } from '../../scripts/aem.js';
import {
  createText, fetchJson, getChildHref, getSource, slugToName,
} from '../../scripts/products.js';

const DEFAULT_PATH = '/products';

/**
 * Reads a list setting, written as comma separated text, one entry per paragraph,
 * or a bulleted list. (readBlockConfig would join list items without a separator.)
 * @param {Element} block the block
 * @param {string} key the setting name
 * @returns {string[]} the entries
 */
function readList(block, key) {
  const row = [...block.children].find((r) => toClassName(r.children[0]?.textContent) === key);
  const cell = row && row.children[1];
  if (!cell) return [];

  const parts = [...cell.querySelectorAll('li, p')].map((node) => node.textContent);
  return (parts.length ? parts : [cell.textContent])
    .flatMap((text) => text.split(','))
    .map((text) => text.trim())
    .filter(Boolean);
}

/**
 * Normalizes API categories to { slug, name }. The API returns objects; older versions
 * return plain strings.
 * @param {Array} categories the API response
 * @returns {Object[]} the categories
 */
function normalize(categories) {
  return categories.map((category) => (typeof category === 'string'
    ? { slug: category, name: slugToName(category) }
    : { slug: category.slug, name: category.name }));
}

/**
 * Applies the authored `categories` list: keeps only those, in the authored order.
 * Entries match either the slug (home-decoration) or the name (Home Decoration).
 * @param {Object[]} categories the API categories
 * @param {string[]} wanted the authored entries
 * @returns {Object[]} the selected categories
 */
function select(categories, wanted) {
  if (!wanted.length) return categories;

  return wanted.map((entry) => {
    const key = toClassName(entry);
    const match = categories.find((c) => [c.slug, c.name].some((v) => toClassName(v) === key));
    // eslint-disable-next-line no-console
    if (!match) console.warn(`product-categories: unknown category "${entry}"`);
    return match;
  }).filter(Boolean);
}

/**
 * Adds the thumbnail of the first product in a category to its tile.
 * The tile is already on the page, so a slow or failed request only leaves the image area empty.
 * The image is decorative (alt="") because the tile text names the category.
 * @param {string} source the products API base URL
 * @param {string} slug the category slug
 * @param {Element} media the tile's image area
 */
async function addImage(source, slug, media) {
  try {
    const url = new URL(`${source}/category/${encodeURIComponent(slug)}`, window.location.href);
    url.searchParams.set('limit', 1);
    url.searchParams.set('select', 'thumbnail');
    const json = await fetchJson(url);
    const [first] = json.products || json.data || [];
    if (!first || !first.thumbnail) return;

    const img = document.createElement('img');
    img.src = first.thumbnail;
    img.alt = '';
    img.loading = 'lazy';
    media.append(img);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`product-categories: no image for "${slug}"`, error);
  }
}

/**
 * Content model (configuration block, 2 columns, all rows optional):
 *   source     | products API base URL (default: DummyJSON)
 *   path       | the folder the category pages live in (default: /products)
 *   categories | which categories to show, in this order, as comma separated names or
 *              | slugs (default: all categories from the API)
 * Each tile links to `{path}/{slug}`, for example /products/laptops, and shows the image of the
 * first product in that category. The category pages are authored in DA; a tile for a category
 * without a page leads to a 404. Place an H2 above the block.
 * @param {Element} block the block
 */
export default async function decorate(block) {
  const config = readBlockConfig(block);
  const wanted = readList(block, 'categories');
  block.replaceChildren();
  block.setAttribute('aria-busy', 'true');

  try {
    const source = getSource(config);
    const response = await fetchJson(`${source}/categories`);
    const categories = Array.isArray(response) ? select(normalize(response), wanted) : [];
    if (!categories.length) {
      block.append(createText('p', 'product-categories-message', 'No categories found.'));
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'product-categories-items';
    const tiles = categories.map(({ slug, name }) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'product-categories-link';
      link.href = getChildHref(config.path, DEFAULT_PATH, slug);

      const media = document.createElement('span');
      media.className = 'product-categories-media';
      link.append(media, createText('span', 'product-categories-name', name));
      li.append(link);
      ul.append(li);
      return { slug, media };
    });
    block.append(ul);

    /* not awaited: the images fill in as they arrive */
    tiles.forEach(({ slug, media }) => addImage(source, slug, media));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load categories', error);
    block.append(createText('p', 'product-categories-message', 'Categories are unavailable right now. Please try again later.'));
  } finally {
    block.removeAttribute('aria-busy');
  }
}
