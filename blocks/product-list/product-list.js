import { readBlockConfig } from '../../scripts/aem.js';
import {
  createText, fadeInImage, fetchJson, formatPrice, getPageHref, getSource,
} from '../../scripts/products.js';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;
const MAX_SKELETONS = 12;
const MAX_STAGGER = 8;
const DEFAULT_PAGE = '/product-detail';
const DEFAULT_BACK = '/products';
const FIELDS = 'id,title,price,thumbnail,brand,rating';

/**
 * Creates the link back to the products page.
 * @param {string} back the authored path of the products page
 * @returns {Element} the link
 */
function createBackLink(back) {
  const link = document.createElement('a');
  link.className = 'product-list-back';
  link.href = getPageHref(back, DEFAULT_BACK, {});

  const arrow = createText('span', 'product-list-back-arrow', '←');
  arrow.setAttribute('aria-hidden', 'true');
  link.append(arrow, ' Back to products');
  return link;
}

/**
 * Gets the number of products to request.
 * @param {*} limit the authored limit
 * @returns {number} the limit, between 1 and the maximum
 */
function getLimit(limit) {
  const requested = Number.parseInt(limit, 10) || DEFAULT_LIMIT;
  return Math.min(Math.max(requested, 1), MAX_LIMIT);
}

/**
 * Builds the request URL.
 * @param {string} source the products API base URL
 * @param {string} category the category slug (optional)
 * @param {*} limit the authored limit
 * @returns {URL} the URL to fetch
 */
function getRequestUrl(source, category, limit) {
  const base = category ? `${source}/category/${encodeURIComponent(category)}` : source;
  const url = new URL(base, window.location.href);
  url.searchParams.set('limit', getLimit(limit));
  url.searchParams.set('select', FIELDS);
  return url;
}

/**
 * Creates placeholder cards, with the same layout as the real ones, so the page does not
 * shift when the products arrive. Hidden from assistive technology.
 * @param {number} count the number of placeholders
 * @returns {Element} the list
 */
function createSkeleton(count) {
  const ul = document.createElement('ul');
  ul.className = 'product-list-items product-list-skeleton';
  ul.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < count; i += 1) {
    const li = document.createElement('li');
    li.className = 'product-list-card';

    const media = document.createElement('div');
    media.className = 'product-list-media';

    const body = document.createElement('div');
    body.className = 'product-list-body';
    ['title', 'brand', 'rating', 'price'].forEach((part) => {
      body.append(createText('span', `product-list-skeleton-line product-list-skeleton-${part}`, ''));
    });

    li.append(media, body);
    ul.append(li);
  }
  return ul;
}

/**
 * Creates the card for one product.
 * The whole card is clickable through the title link, so the image is decorative (alt="").
 * @param {Object} product the product data
 * @param {string} page the product detail page
 * @param {number} index the position, used to stagger the entrance animation
 * @returns {Element} the list item
 */
function createCard(product, page, index) {
  const li = document.createElement('li');
  li.className = 'product-list-card';
  li.style.setProperty('--index', Math.min(index, MAX_STAGGER));

  const media = document.createElement('div');
  media.className = 'product-list-media';
  const img = document.createElement('img');
  img.src = product.thumbnail;
  img.alt = '';
  img.loading = 'lazy';
  fadeInImage(img);
  media.append(img);

  const body = document.createElement('div');
  body.className = 'product-list-body';

  /* h3: the page is expected to provide the h1 and a section h2 above the list */
  const title = document.createElement('h3');
  title.className = 'product-list-title';
  const link = document.createElement('a');
  link.href = getPageHref(page, DEFAULT_PAGE, { id: product.id });
  link.textContent = product.title;
  title.append(link);
  body.append(title);

  if (product.brand) body.append(createText('p', 'product-list-brand', product.brand));

  if (typeof product.rating === 'number') {
    const rating = document.createElement('p');
    rating.className = 'product-list-rating';
    const stars = createText('span', 'product-list-stars', `★ ${product.rating.toFixed(1)}`);
    stars.setAttribute('aria-hidden', 'true');
    rating.append(stars, createText('span', 'product-list-sr-only', `Rated ${product.rating.toFixed(1)} out of 5`));
    body.append(rating);
  }

  if (typeof product.price === 'number') {
    body.append(createText('p', 'product-list-price', formatPrice(product.price)));
  }

  li.append(media, body);
  return li;
}

/**
 * Loads the products and swaps them in for the skeleton.
 * @param {Element} block the block
 * @param {Object} config the block configuration
 * @param {Element} skeleton the placeholder list
 */
async function loadProducts(block, config, skeleton) {
  try {
    const json = await fetchJson(getRequestUrl(getSource(config), config.category, config.limit));
    const products = json.products || json.data || [];

    if (!products.length) {
      skeleton.replaceWith(createText('p', 'product-list-message', 'No products found.'));
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'product-list-items';
    ul.append(...products.map((product, index) => createCard(product, config.page, index)));
    skeleton.replaceWith(ul);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load products', error);
    skeleton.replaceWith(createText('p', 'product-list-message', 'Products are unavailable right now. Please try again later.'));
  } finally {
    block.removeAttribute('aria-busy');
  }
}

/**
 * Content model (configuration block, 2 columns, all rows optional):
 *   source   | products API base URL (default: DummyJSON)
 *   category | only show this category slug (e.g. laptops); empty shows all products
 *   limit    | number of products to show (default 12, max 100)
 *   page     | the product detail page the cards link to (default: /product-detail)
 *   back     | the products page the "Back to products" link goes to (default: /products)
 * The author provides the H2 above the block (cards are H3).
 * The block is ready as soon as the skeleton is in place; the products load afterwards
 * (aria-busy is set until they arrive), so the request never delays the page.
 * @param {Element} block the block
 */
export default function decorate(block) {
  const config = readBlockConfig(block);
  const skeleton = createSkeleton(Math.min(getLimit(config.limit), MAX_SKELETONS));

  block.replaceChildren(createBackLink(config.back), skeleton);
  block.setAttribute('aria-busy', 'true');
  loadProducts(block, config, skeleton);
}
