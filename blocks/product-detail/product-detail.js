import { readBlockConfig } from '../../scripts/aem.js';
import {
  createText, fetchJson, formatPrice, getChildHref, getPageHref, getSource, slugToName,
} from '../../scripts/products.js';
import { addToCart, getCartHref } from '../../scripts/cart.js';

const DEFAULT_LIST_PATH = '/products';

/**
 * Creates a rating line: a visual "★ 4.2" plus a full sentence for screen readers.
 * @param {number} rating the rating out of 5
 * @param {string} suffix extra screen reader text (e.g. the review count)
 * @returns {Element} the paragraph
 */
function createRating(rating, suffix = '') {
  const p = document.createElement('p');
  p.className = 'product-detail-rating';
  const stars = createText('span', 'product-detail-stars', `★ ${rating.toFixed(1)}`);
  stars.setAttribute('aria-hidden', 'true');
  p.append(stars, createText('span', 'sr-only', `Rated ${rating.toFixed(1)} out of 5${suffix}`));
  return p;
}

/**
 * Creates the image gallery: one large image and thumbnail buttons that switch it.
 * The API has no alt text, so the alt describes the product and the image position.
 * @param {Object} product the product data
 * @returns {Element} the gallery
 */
function createGallery(product) {
  const images = product.images && product.images.length ? product.images : [product.thumbnail];
  const gallery = document.createElement('div');
  gallery.className = 'product-detail-gallery';

  const frame = document.createElement('div');
  frame.className = 'product-detail-frame';
  const main = document.createElement('img');
  /* this is the LCP image of the page */
  main.loading = 'eager';
  main.fetchPriority = 'high';
  frame.append(main);
  gallery.append(frame);

  const buttons = images.map((src, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'product-detail-thumb';
    button.setAttribute('aria-label', `Show image ${index + 1} of ${images.length}`);
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    button.append(img);
    return button;
  });

  const show = (index) => {
    main.src = images[index];
    main.alt = `${product.title}, image ${index + 1} of ${images.length}`;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  };

  if (images.length > 1) {
    const thumbs = document.createElement('div');
    thumbs.className = 'product-detail-thumbs';
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => show(index));
      thumbs.append(button);
    });
    gallery.append(thumbs);
  }

  show(0);
  return gallery;
}

/**
 * Creates the price line, with the original price struck through when discounted.
 * @param {Object} product the product data
 * @returns {Element} the paragraph
 */
function createPrice(product) {
  const p = document.createElement('p');
  p.className = 'product-detail-price';
  const discount = product.discountPercentage || 0;

  if (discount > 0) {
    p.append(
      createText('span', 'product-detail-sale', formatPrice(product.price * (1 - discount / 100))),
      ' ',
      createText('s', 'product-detail-was', formatPrice(product.price)),
      ' ',
      createText('span', 'product-detail-badge', `${Math.round(discount)}% off`),
    );
  } else {
    p.append(createText('span', 'product-detail-sale', formatPrice(product.price)));
  }
  return p;
}

/**
 * Creates the details list (SKU, warranty, shipping, returns).
 * @param {Object} product the product data
 * @returns {Element|null} the list, or null when there is nothing to show
 */
function createSpecs(product) {
  const specs = [
    ['SKU', product.sku],
    ['Warranty', product.warrantyInformation],
    ['Shipping', product.shippingInformation],
    ['Returns', product.returnPolicy],
  ].filter(([, value]) => value);
  if (!specs.length) return null;

  const dl = document.createElement('dl');
  dl.className = 'product-detail-specs';
  specs.forEach(([name, value]) => {
    const row = document.createElement('div');
    row.append(createText('dt', 'product-detail-spec-name', name), createText('dd', 'product-detail-spec-value', value));
    dl.append(row);
  });
  return dl;
}

/**
 * Creates the reviews section.
 * @param {Object[]} reviews the reviews
 * @returns {Element} the section
 */
function createReviews(reviews) {
  const section = document.createElement('div');
  section.className = 'product-detail-reviews';
  section.append(createText('h2', 'product-detail-reviews-title', `Reviews (${reviews.length})`));

  const ul = document.createElement('ul');
  ul.className = 'product-detail-review-list';
  reviews.forEach((review) => {
    const li = document.createElement('li');
    li.className = 'product-detail-review';
    const date = new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    li.append(
      createRating(review.rating),
      createText('p', 'product-detail-review-text', review.comment),
      createText('p', 'product-detail-review-meta', `${review.reviewerName}, ${date}`),
    );
    ul.append(li);
  });
  section.append(ul);
  return section;
}

/**
 * Creates the "Add to cart" button and its (screen reader) confirmation.
 * @param {Object} product the product data
 * @returns {Element} the purchase area
 */
function createPurchase(product) {
  const purchase = document.createElement('div');
  purchase.className = 'product-detail-purchase';

  const button = createText('button', 'product-detail-add', 'Add to cart');
  button.type = 'button';
  button.classList.add('button', 'primary');

  if (product.availabilityStatus === 'Out of Stock') {
    button.disabled = true;
    button.textContent = 'Out of stock';
  }

  /* the live region exists before it has content, so the confirmation is announced */
  const status = createText('p', 'product-detail-added', '');
  status.setAttribute('role', 'status');

  button.addEventListener('click', () => {
    addToCart(product.id);
    const link = document.createElement('a');
    link.href = getCartHref();
    link.textContent = 'View cart';
    status.replaceChildren('Added to your cart. ', link);
  });

  purchase.append(button, status);
  return purchase;
}

/**
 * Creates the product information column.
 * @param {Object} product the product data
 * @param {string} listPath the folder the category pages live in
 * @returns {Element} the column
 */
function createInfo(product, listPath) {
  const info = document.createElement('div');
  info.className = 'product-detail-info';

  const back = document.createElement('a');
  back.className = 'product-detail-back';
  back.href = getChildHref(listPath, DEFAULT_LIST_PATH, product.category);
  back.textContent = `Back to ${slugToName(product.category)}`;

  info.append(back, createText('h1', 'product-detail-title', product.title));
  if (product.brand) info.append(createText('p', 'product-detail-brand', product.brand));

  if (typeof product.rating === 'number') {
    const count = product.reviews ? product.reviews.length : 0;
    info.append(createRating(product.rating, count ? `, ${count} reviews` : ''));
  }

  info.append(createPrice(product));
  if (product.availabilityStatus) {
    info.append(createText('p', 'product-detail-availability', product.availabilityStatus));
  }
  info.append(createPurchase(product));
  if (product.description) info.append(createText('p', 'product-detail-description', product.description));

  const specs = createSpecs(product);
  if (specs) info.append(specs);
  return info;
}

/**
 * Creates a placeholder line (size set through CSS custom properties).
 * @param {string} width the width, e.g. '60%'
 * @param {string} height the height, e.g. '1.6rem'
 * @returns {Element} the line
 */
function createSkeletonLine(width, height) {
  const line = document.createElement('span');
  line.className = 'product-detail-skeleton-line';
  line.style.setProperty('--width', width);
  line.style.setProperty('--height', height);
  return line;
}

/**
 * Creates placeholders for the gallery and the info column, in the same grid areas as the
 * real content, so the page does not shift when the product arrives.
 * Hidden from assistive technology.
 * @returns {Element[]} the placeholders
 */
function createSkeleton() {
  const gallery = document.createElement('div');
  gallery.className = 'product-detail-gallery product-detail-skeleton';
  const frame = document.createElement('div');
  frame.className = 'product-detail-frame';
  gallery.append(frame);

  const info = document.createElement('div');
  info.className = 'product-detail-info product-detail-skeleton';
  [
    ['25%', '1.4rem'], // back link
    ['90%', '3.6rem'], ['60%', '3.6rem'], // title
    ['30%', '1.8rem'], // brand
    ['20%', '1.8rem'], // rating
    ['45%', '3.2rem'], // price
    ['25%', '1.8rem'], // availability
    ['100%', '1.8rem'], ['100%', '1.8rem'], ['70%', '1.8rem'], // description
    ['55%', '1.8rem'], ['55%', '1.8rem'], ['55%', '1.8rem'], // details
  ].forEach(([width, height]) => info.append(createSkeletonLine(width, height)));

  return [gallery, info].map((el) => {
    el.setAttribute('aria-hidden', 'true');
    return el;
  });
}

/**
 * Creates the message shown when there is no product to display.
 * @param {string} text the message (the page H1)
 * @param {string} listHref the link to the products page
 * @returns {Element} the message
 */
function createMessage(text, listHref) {
  const message = document.createElement('div');
  message.className = 'product-detail-message';
  const link = document.createElement('a');
  link.href = listHref;
  link.textContent = 'Browse all products';
  message.append(createText('h1', 'product-detail-title', text), link);
  return message;
}

/**
 * Loads the product and swaps it in for the skeleton.
 * @param {Element} block the block
 * @param {Object} config the block configuration
 * @param {string} id the product id
 * @param {Element[]} skeleton the placeholders
 * @param {string} listHref the link to the products page
 */
async function loadProduct(block, config, id, skeleton, listHref) {
  try {
    const product = await fetchJson(`${getSource(config)}/${encodeURIComponent(id)}`);
    document.title = product.title;

    const content = [createGallery(product), createInfo(product, config['list-path'])];
    if (product.reviews && product.reviews.length) content.push(createReviews(product.reviews));
    skeleton.forEach((el) => el.remove());
    block.append(...content);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load product', error);
    skeleton.forEach((el) => el.remove());
    block.append(createMessage(
      error.status === 404 ? 'Product not found' : 'This product is unavailable right now',
      listHref,
    ));
  } finally {
    block.removeAttribute('aria-busy');
  }
}

/**
 * Content model (configuration block, 2 columns, all rows optional):
 *   source    | products API base URL (default: DummyJSON)
 *   list-path | the folder the category pages live in (default: /products); the back link
 *               goes to {list-path}/{category}
 * The product comes from `?id=` in the page URL. The block renders the page's H1
 * (the product name) itself, so the page must not have an authored H1.
 * The block is ready as soon as the skeleton is in place; the product loads afterwards
 * (aria-busy is set until it arrives), so the request never delays the page.
 * @param {Element} block the block
 */
export default function decorate(block) {
  const config = readBlockConfig(block);
  const id = new URLSearchParams(window.location.search).get('id');
  const listHref = getPageHref(config['list-path'], DEFAULT_LIST_PATH, {});

  if (!id) {
    block.replaceChildren(createMessage('No product selected', listHref));
    return;
  }

  const skeleton = createSkeleton();
  block.replaceChildren(...skeleton);
  block.setAttribute('aria-busy', 'true');
  loadProduct(block, config, id, skeleton, listHref);
}
