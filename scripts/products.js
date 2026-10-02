/* Shared helpers for the product blocks (product-categories, product-list, product-detail). */

export const PRODUCTS_API = 'https://dummyjson.com/products';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * Formats a number as a price.
 * @param {number} value the amount
 * @returns {string} the formatted price
 */
export function formatPrice(value) {
  return currency.format(value);
}

/**
 * Creates an element with a class and text content.
 * @param {string} tag the element name
 * @param {string} className the class name
 * @param {string} text the text content
 * @returns {Element} the element
 */
export function createText(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

/**
 * Gets the products API base URL from the authored `source` setting.
 * @param {Object} config the block configuration
 * @returns {string} the API base URL without a trailing slash
 */
export function getSource(config) {
  const source = typeof config.source === 'string' && config.source ? config.source : PRODUCTS_API;
  return source.replace(/\/$/, '');
}

/**
 * Builds a same-site link to another page with query parameters.
 * Accepts an authored path (/product-list) or a full link; only the path is used,
 * so the same content works on localhost, .aem.page and .aem.live.
 * @param {string} page the authored page path or link
 * @param {string} fallback the path to use when nothing was authored
 * @param {Object} params the query parameters
 * @returns {string} the link
 */
export function getPageHref(page, fallback, params) {
  const target = typeof page === 'string' && page ? page : fallback;
  const url = new URL(target, window.location.origin);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return `${url.pathname}${url.search}`;
}

/**
 * Fetches JSON and throws on a failed request.
 * @param {string|URL} url the URL
 * @returns {Promise<Object>} the parsed JSON
 */
export async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    const error = new Error(`Request failed with status ${resp.status}`);
    error.status = resp.status;
    throw error;
  }
  return resp.json();
}

/**
 * Turns a slug into a readable name (home-decoration -> Home Decoration).
 * @param {string} slug the slug
 * @returns {string} the name
 */
export function slugToName(slug) {
  return slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
