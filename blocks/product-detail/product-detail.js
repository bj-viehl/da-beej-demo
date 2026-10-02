import { readBlockConfig } from '../../scripts/aem.js';
import {
  createText, fetchJson, formatPrice, getPageHref, getSource, slugToName,
} from '../../scripts/products.js';

const DEFAULT_LIST_PAGE = '/product-list';

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
  p.append(stars, createText('span', 'product-detail-sr-only', `Rated ${rating.toFixed(1)} out of 5${suffix}`));
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
 * Creates the product information column.
 * @param {Object} product the product data
 * @param {string} listPage the product list page
 * @returns {Element} the column
 */
function createInfo(product, listPage) {
  const info = document.createElement('div');
  info.className = 'product-detail-info';

  const back = document.createElement('a');
  back.className = 'product-detail-back';
  back.href = getPageHref(listPage, DEFAULT_LIST_PAGE, { category: product.category });
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
  if (product.description) info.append(createText('p', 'product-detail-description', product.description));

  const specs = createSpecs(product);
  if (specs) info.append(specs);
  return info;
}

/**
 * Content model (configuration block, 2 columns, all rows optional):
 *   source    | products API base URL (default: DummyJSON)
 *   list-page | the product list page the back link goes to (default: /product-list)
 * The product comes from `?id=` in the page URL. The block renders the page's H1
 * (the product name) itself, so the page must not have an authored H1.
 * @param {Element} block the block
 */
export default async function decorate(block) {
  const config = readBlockConfig(block);
  const id = new URLSearchParams(window.location.search).get('id');
  const listHref = getPageHref(config['list-page'], DEFAULT_LIST_PAGE, {});
  block.replaceChildren();

  const showMessage = (text) => {
    const message = document.createElement('div');
    message.className = 'product-detail-message';
    const link = document.createElement('a');
    link.href = listHref;
    link.textContent = 'Browse all products';
    message.append(createText('h1', 'product-detail-title', text), link);
    block.append(message);
  };

  if (!id) {
    showMessage('No product selected');
    return;
  }

  block.setAttribute('aria-busy', 'true');
  try {
    const product = await fetchJson(`${getSource(config)}/${encodeURIComponent(id)}`);
    document.title = product.title;

    block.append(createGallery(product), createInfo(product, config['list-page']));
    if (product.reviews && product.reviews.length) block.append(createReviews(product.reviews));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load product', error);
    showMessage(error.status === 404 ? 'Product not found' : 'This product is unavailable right now');
  } finally {
    block.removeAttribute('aria-busy');
  }
}
