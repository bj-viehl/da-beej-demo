import { readBlockConfig } from '../../scripts/aem.js';
import {
  CARTS_API, getCart, priceCart, priceLine, setQuantity, summarize,
} from '../../scripts/cart.js';
import {
  createText, fadeInImage, formatPrice, getPageHref,
} from '../../scripts/products.js';

const DEFAULT_PRODUCT_PAGE = '/product-detail';
const DEFAULT_PRODUCTS_PATH = '/products';
const MAX_SKELETONS = 4;

/**
 * Creates a button.
 * @param {string} className the class name
 * @param {string} label the visible text
 * @param {string} accessibleName the accessible name
 * @param {Function} onClick the click handler
 * @returns {HTMLButtonElement} the button
 */
function createButton(className, label, accessibleName, onClick) {
  const button = createText('button', className, label);
  button.type = 'button';
  button.setAttribute('aria-label', accessibleName);
  button.addEventListener('click', onClick);
  return button;
}

/**
 * Creates placeholder rows with the same layout as the real ones. Hidden from assistive technology.
 * @param {number} count the number of rows
 * @returns {Element} the list
 */
function createSkeleton(count) {
  const ul = document.createElement('ul');
  ul.className = 'cart-items cart-skeleton';
  ul.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i += 1) {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.append(createText('span', 'cart-item-media', ''), createText('span', 'cart-skeleton-line', ''));
    ul.append(li);
  }
  return ul;
}

/**
 * Creates the row for one cart line.
 * @param {Object} item the priced line
 * @param {Object} config the block configuration
 * @param {Object} actions the quantity handlers
 * @returns {Element} the list item
 */
function createItem(item, config, actions) {
  const li = document.createElement('li');
  li.className = 'cart-item';
  li.dataset.id = item.id;

  const media = document.createElement('div');
  media.className = 'cart-item-media';
  const img = document.createElement('img');
  img.src = item.thumbnail;
  img.alt = '';
  img.loading = 'lazy';
  fadeInImage(img);
  media.append(img);

  const info = document.createElement('div');
  info.className = 'cart-item-info';

  const title = document.createElement('h2');
  title.className = 'cart-item-title';
  const link = document.createElement('a');
  link.href = getPageHref(config['product-page'], DEFAULT_PRODUCT_PAGE, { id: item.id });
  link.textContent = item.title;
  title.append(link);

  const price = createText('p', 'cart-item-price', `${formatPrice(item.unitPrice)} each`);

  const quantity = document.createElement('div');
  quantity.className = 'cart-item-quantity';
  quantity.setAttribute('role', 'group');
  quantity.setAttribute('aria-label', `Quantity of ${item.title}`);
  const less = createButton('cart-item-step', '−', `Decrease quantity of ${item.title}`, () => actions.change(item, -1));
  less.dataset.action = 'decrease';
  less.disabled = item.quantity <= 1;
  const more = createButton('cart-item-step', '+', `Increase quantity of ${item.title}`, () => actions.change(item, 1));
  more.dataset.action = 'increase';
  quantity.append(less, createText('span', 'cart-item-count', String(item.quantity)), more);

  const remove = createButton('cart-item-remove', 'Remove', `Remove ${item.title} from the cart`, () => actions.remove(item));
  remove.dataset.action = 'remove';
  info.append(title, price, quantity, remove);

  li.append(media, info, createText('p', 'cart-item-total', formatPrice(item.lineTotal)));
  return li;
}

/**
 * Creates the order summary.
 * @param {{subtotal: number, total: number}} totals the totals
 * @returns {Element} the summary
 */
function createSummary({ subtotal, total }) {
  const summary = document.createElement('div');
  summary.className = 'cart-summary';
  summary.append(createText('h2', 'cart-summary-title', 'Order summary'));

  const dl = document.createElement('dl');
  dl.className = 'cart-summary-list';
  [
    ['Subtotal', formatPrice(subtotal)],
    ['Discount', `−${formatPrice(subtotal - total)}`],
    ['Total', formatPrice(total)],
  ].forEach(([name, value]) => {
    const row = document.createElement('div');
    row.className = `cart-summary-row cart-summary-${name.toLowerCase()}`;
    row.append(document.createElement('dt'), document.createElement('dd'));
    row.firstChild.textContent = name;
    row.lastChild.textContent = value;
    dl.append(row);
  });
  summary.append(dl);
  return summary;
}

/**
 * Creates the empty cart message.
 * @param {Object} config the block configuration
 * @returns {Element} the message
 */
function createEmpty(config) {
  const empty = document.createElement('div');
  empty.className = 'cart-message';
  const link = document.createElement('a');
  link.href = getPageHref(config['products-path'], DEFAULT_PRODUCTS_PATH, {});
  link.textContent = 'Browse products';
  empty.append(createText('p', 'cart-message-text', 'Your cart is empty.'), link);
  return empty;
}

/**
 * Content model (configuration block, 2 columns, all rows optional):
 *   source        | the cart API URL (default: DummyJSON, a simulated cart)
 *   product-page  | the product detail page the item titles link to (default: /product-detail)
 *   products-path | the products page the empty cart links to (default: /products)
 * The cart itself is stored in the browser (see scripts/cart.js). The block is ready as soon as
 * the placeholders are in; the lines are looked up afterwards (aria-busy until then).
 * The page provides the H1; items and the summary are H2.
 * @param {Element} block the block
 */
export default function decorate(block) {
  const config = readBlockConfig(block);
  const endpoint = config.source || CARTS_API;
  let priced = [];
  let pendingFocus = null;

  /* announces changes to screen readers */
  const status = createText('p', 'cart-status sr-only', '');
  status.setAttribute('role', 'status');

  const announce = (text) => {
    status.textContent = text;
  };

  /* the list is rebuilt after every change, so put focus back on the control that was used */
  const restoreFocus = () => {
    if (!pendingFocus) return;
    const { id, action } = pendingFocus;
    pendingFocus = null;
    const row = `[data-id="${id}"]`;
    const target = block.querySelector(`${row} [data-action="${action}"]:not(:disabled)`)
      || block.querySelector(`${row} [data-action]:not(:disabled)`)
      || block.querySelector('.cart-item-title a, .cart-message a');
    if (target) target.focus();
  };

  const show = (items) => {
    const lines = getCart();
    const current = lines
      .map((line) => {
        const product = items.find((item) => item.id === line.id);
        return product && priceLine(product, line.quantity);
      })
      .filter(Boolean);
    priced = current;

    if (!current.length) {
      block.replaceChildren(status, createEmpty(config));
      restoreFocus();
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'cart-items';
    // eslint-disable-next-line no-use-before-define
    ul.append(...current.map((item) => createItem(item, config, actions)));
    block.replaceChildren(status, ul, createSummary(summarize(current)));
    restoreFocus();
  };

  const actions = {
    change: (item, delta) => {
      pendingFocus = { id: item.id, action: delta > 0 ? 'increase' : 'decrease' };
      setQuantity(item.id, item.quantity + delta);
      announce(`Quantity of ${item.title} is now ${item.quantity + delta}.`);
    },
    remove: (item) => {
      pendingFocus = { id: item.id, action: 'remove' };
      setQuantity(item.id, 0);
      announce(`${item.title} removed from the cart.`);
    },
  };

  const load = async () => {
    const lines = getCart();
    if (!lines.length) {
      show([]);
      return;
    }
    block.replaceChildren(status, createSkeleton(Math.min(lines.length, MAX_SKELETONS)));
    block.setAttribute('aria-busy', 'true');
    try {
      show((await priceCart(lines, endpoint)).items);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load the cart', error);
      block.replaceChildren(status, createText('p', 'cart-message', 'Your cart is unavailable right now. Please try again later.'));
    } finally {
      block.removeAttribute('aria-busy');
    }
  };

  /* quantity changes only need the data already loaded; new products need a lookup */
  window.addEventListener('cart-change', () => {
    const lines = getCart();
    if (lines.every((line) => priced.some((item) => item.id === line.id))) show(priced);
    else load();
  });

  block.replaceChildren(status);
  load();
}
