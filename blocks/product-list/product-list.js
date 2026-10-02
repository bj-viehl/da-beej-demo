import { readBlockConfig } from '../../scripts/aem.js';
import {
  createText, fetchJson, formatPrice, getPageHref, getSource,
} from '../../scripts/products.js';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;
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
 * Builds the request URL.
 * @param {string} source the products API base URL
 * @param {string} category the category slug (optional)
 * @param {*} limit the authored limit
 * @returns {URL} the URL to fetch
 */
function getRequestUrl(source, category, limit) {
  const base = category ? `${source}/category/${encodeURIComponent(category)}` : source;
  const requested = Number.parseInt(limit, 10) || DEFAULT_LIMIT;

  const url = new URL(base, window.location.href);
  url.searchParams.set('limit', Math.min(Math.max(requested, 1), MAX_LIMIT));
  url.searchParams.set('select', FIELDS);
  return url;
}

/**
 * Creates the card for one product.
 * The whole card is clickable through the title link, so the image is decorative (alt="").
 * @param {Object} product the product data
 * @param {string} page the product detail page
 * @returns {Element} the list item
 */
function createCard(product, page) {
  const li = document.createElement('li');
  li.className = 'product-list-card';

  const media = document.createElement('div');
  media.className = 'product-list-media';
  const img = document.createElement('img');
  img.src = product.thumbnail;
  img.alt = '';
  img.loading = 'lazy';
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
 * Content model (configuration block, 2 columns, all rows optional):
 *   source   | products API base URL (default: DummyJSON)
 *   category | only show this category slug (e.g. laptops); empty shows all products
 *   limit    | number of products to show (default 12, max 100)
 *   page     | the product detail page the cards link to (default: /product-detail)
 *   back     | the products page the "Back to products" link goes to (default: /products)
 * The author provides the H2 above the block (cards are H3).
 * @param {Element} block the block
 */
export default async function decorate(block) {
  const config = readBlockConfig(block);

  block.replaceChildren(createBackLink(config.back));
  block.setAttribute('aria-busy', 'true');

  try {
    const json = await fetchJson(getRequestUrl(getSource(config), config.category, config.limit));
    const products = json.products || json.data || [];

    if (!products.length) {
      block.append(createText('p', 'product-list-message', 'No products found.'));
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'product-list-items';
    ul.append(...products.map((product) => createCard(product, config.page)));
    block.append(ul);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load products', error);
    block.append(createText('p', 'product-list-message', 'Products are unavailable right now. Please try again later.'));
  } finally {
    block.removeAttribute('aria-busy');
  }
}
