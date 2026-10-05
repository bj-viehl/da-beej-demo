/*
 * Demo shopping cart.
 *
 * The cart (product ids and quantities) lives in localStorage, one cart per signed-in user plus
 * a guest cart. The DummyJSON cart API only simulates a cart (nothing is stored), so it is
 * used to look up the lines (title, price, discount, image) in one request.
 */
import { getMetadata } from './aem.js';
import { getUser } from './auth.js';

export const CARTS_API = 'https://dummyjson.com/carts/add';
const GUEST = 'guest';
const DEFAULT_CART_PAGE = '/cart';
const MAX_QUANTITY = 99;

/**
 * Gets the path of the cart page (the `cart-page` metadata, default /cart).
 * @returns {string} the path
 */
export function getCartHref() {
  return new URL(getMetadata('cart-page') || DEFAULT_CART_PAGE, window.location.origin).pathname;
}

/**
 * Gets the storage key for the current cart (per user, or the guest cart).
 * @param {string} [owner] the user id; defaults to the signed-in user
 * @returns {string} the key
 */
function storageKey(owner) {
  const user = getUser();
  return `demo-cart:${owner || (user && user.id) || GUEST}`;
}

/**
 * Reads a cart.
 * @param {string} [owner] the user id; defaults to the signed-in user
 * @returns {{id: number, quantity: number}[]} the lines
 */
export function getCart(owner) {
  try {
    const lines = JSON.parse(localStorage.getItem(storageKey(owner)));
    return Array.isArray(lines) ? lines : [];
  } catch (e) {
    return [];
  }
}

/**
 * Saves a cart and tells the page through a `cart-change` event.
 * @param {{id: number, quantity: number}[]} lines the lines
 * @param {string} [owner] the user id; defaults to the signed-in user
 */
function saveCart(lines, owner) {
  try {
    localStorage.setItem(storageKey(owner), JSON.stringify(lines));
  } catch (e) {
    // storage unavailable (private window): the cart is lost on reload
  }
  window.dispatchEvent(new CustomEvent('cart-change'));
}

/**
 * Gets the number of items in the cart.
 * @returns {number} the total quantity
 */
export function getCount() {
  return getCart().reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Adds a product to the cart.
 * @param {number|string} id the product id
 * @param {number} [quantity] how many to add
 */
export function addToCart(id, quantity = 1) {
  const productId = Number(id);
  const lines = getCart();
  const line = lines.find((l) => l.id === productId);
  if (line) line.quantity = Math.min(line.quantity + quantity, MAX_QUANTITY);
  else lines.push({ id: productId, quantity });
  saveCart(lines);
}

/**
 * Sets the quantity of a line; zero (or less) removes it.
 * @param {number|string} id the product id
 * @param {number} quantity the new quantity
 */
export function setQuantity(id, quantity) {
  const productId = Number(id);
  const lines = getCart()
    .map((l) => (l.id === productId ? { ...l, quantity: Math.min(quantity, MAX_QUANTITY) } : l))
    .filter((l) => l.quantity > 0);
  saveCart(lines);
}

/**
 * Moves the guest cart into a user's cart (when someone signs in).
 * @param {string} userId the user id
 */
export function mergeGuestCart(userId) {
  const guest = getCart(GUEST);
  if (!guest.length) return;

  const lines = getCart(userId);
  guest.forEach(({ id, quantity }) => {
    const line = lines.find((l) => l.id === id);
    if (line) line.quantity = Math.min(line.quantity + quantity, MAX_QUANTITY);
    else lines.push({ id, quantity });
  });
  saveCart(lines, userId);
  saveCart([], GUEST);
}

/**
 * Prices one cart line from the product's unit price and discount, so the amounts match the
 * product page (the DummyJSON cart API rounds its own discounted amounts to whole dollars).
 * @param {Object} product the product data from the cart API
 * @param {number} quantity the quantity
 * @returns {Object} the product with `quantity`, `unitPrice`, `listTotal` and `lineTotal`
 */
export function priceLine(product, quantity) {
  const unitPrice = product.price * (1 - (product.discountPercentage || 0) / 100);
  return {
    ...product,
    quantity,
    unitPrice,
    listTotal: product.price * quantity,
    lineTotal: unitPrice * quantity,
  };
}

/**
 * Adds up priced lines.
 * @param {Object[]} items the priced lines
 * @returns {{subtotal: number, total: number}} the list price total and the discounted total
 */
export function summarize(items) {
  return {
    subtotal: items.reduce((sum, item) => sum + item.listTotal, 0),
    total: items.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}

/**
 * Looks up the cart lines with the (simulated) DummyJSON cart API. Products the API does not
 * know are left out of the result.
 * @param {{id: number, quantity: number}[]} lines the cart lines
 * @param {string} [endpoint] the cart API URL
 * @returns {Promise<{items: Object[], subtotal: number, total: number}>} the priced lines
 */
export async function priceCart(lines, endpoint = CARTS_API) {
  if (!lines.length) return { items: [], subtotal: 0, total: 0 };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 1, products: lines }),
  });
  if (!resp.ok) throw new Error(`Cart request failed with status ${resp.status}`);
  const { products } = await resp.json();

  const items = products.map((product) => {
    const line = lines.find((l) => l.id === product.id);
    return priceLine(product, line ? line.quantity : product.quantity);
  });
  return { items, ...summarize(items) };
}

/* keep the carts in step with sign-in and with other tabs */
window.addEventListener('auth-change', (event) => {
  if (event.detail) mergeGuestCart(event.detail.id);
  window.dispatchEvent(new CustomEvent('cart-change'));
});
window.addEventListener('storage', (event) => {
  if (event.key && event.key.startsWith('demo-cart:')) window.dispatchEvent(new CustomEvent('cart-change'));
});
