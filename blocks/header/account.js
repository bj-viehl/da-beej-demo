import {
  getClientId, getUser, renderGoogleButton, signInAsDemoUser, signOut,
} from '../../scripts/auth.js';
import { getCartHref, getCount } from '../../scripts/cart.js';

const PANEL_ID = 'nav-account-panel';

/**
 * Creates a text element.
 * @param {string} tag the element name
 * @param {string} className the class name
 * @param {string} text the text content
 * @returns {Element} the element
 */
function createText(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

/**
 * Creates a button.
 * @param {string} className the class name
 * @param {string} text the label
 * @param {Function} onClick the click handler
 * @returns {HTMLButtonElement} the button
 */
function createButton(className, text, onClick) {
  const button = createText('button', className, text);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

/**
 * Creates an inline SVG icon.
 * @param {string} path the SVG path data
 * @returns {SVGElement} the icon
 */
function createIcon(path) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const shape = document.createElementNS(ns, 'path');
  shape.setAttribute('d', path);
  svg.append(shape);
  return svg;
}

const CART_ICON = 'M3 4h2l2.4 11h10.2L20 7H6.2M9 20h.01M17 20h.01';
const USER_ICON = 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z';

/**
 * Creates the cart link with the item count.
 * @returns {Element} the link
 */
function createCartLink() {
  const link = document.createElement('a');
  link.className = 'nav-cart';
  link.href = getCartHref();
  const count = createText('span', 'nav-cart-count', '0');
  count.setAttribute('aria-hidden', 'true');
  link.append(createIcon(CART_ICON), count);

  const update = () => {
    const items = getCount();
    count.textContent = items;
    count.hidden = items === 0;
    link.setAttribute('aria-label', `Cart, ${items} ${items === 1 ? 'item' : 'items'}`);
  };
  update();
  window.addEventListener('cart-change', update);
  return link;
}

/**
 * Creates the avatar: the profile picture, or the user's initial.
 * @param {Object} user the signed-in user
 * @returns {Element} the avatar
 */
function createAvatar(user) {
  if (user.picture) {
    const img = document.createElement('img');
    img.className = 'nav-account-avatar';
    img.src = user.picture;
    img.alt = '';
    img.referrerPolicy = 'no-referrer'; // Google profile pictures need this
    return img;
  }
  return createText('span', 'nav-account-avatar', (user.name || '?').charAt(0).toUpperCase());
}

/**
 * Fills the panel for a signed-out visitor.
 * @param {Element} panel the panel
 */
function renderSignedOut(panel) {
  panel.replaceChildren(createText('p', 'nav-account-text', 'Sign in to save your cart.'));

  if (getClientId()) {
    const google = document.createElement('div');
    google.className = 'nav-account-google';
    panel.append(google);
    renderGoogleButton(google).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Google sign-in failed to load', error);
      google.replaceWith(createText('p', 'nav-account-text', 'Google sign-in is unavailable right now.'));
    });
  } else {
    panel.append(
      createText('p', 'nav-account-note', 'Demo mode: no Google client ID is configured.'),
      createButton('nav-account-action', 'Continue as demo user', signInAsDemoUser),
    );
  }
}

/**
 * Fills the panel for a signed-in user.
 * @param {Element} panel the panel
 * @param {Object} user the signed-in user
 */
function renderSignedIn(panel, user) {
  panel.replaceChildren(
    createText('p', 'nav-account-name', user.name),
    createText('p', 'nav-account-email', user.email),
    createButton('nav-account-action', 'Sign out', signOut),
  );
}

/**
 * Creates the account control: a button that opens a panel with the sign-in options
 * (signed out) or the profile and sign out (signed in).
 * @returns {Element} the control
 */
function createAccount() {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-account';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-account-button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', PANEL_ID);

  const panel = document.createElement('div');
  panel.className = 'nav-account-panel';
  panel.id = PANEL_ID;
  panel.hidden = true;
  wrapper.append(button, panel);

  const setOpen = (open) => {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };

  const render = () => {
    const user = getUser();
    button.classList.toggle('is-user', !!user);
    if (user) {
      button.replaceChildren(createAvatar(user));
      button.setAttribute('aria-label', `Account menu for ${user.name}`);
      renderSignedIn(panel, user);
    } else {
      /* an icon on small screens; the label stays available to screen readers */
      button.replaceChildren(createIcon(USER_ICON), createText('span', 'nav-account-label sr-only', 'Sign in'));
      button.removeAttribute('aria-label');
      renderSignedOut(panel);
    }
  };

  button.addEventListener('click', () => setOpen(panel.hidden));
  wrapper.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!panel.hidden && !wrapper.contains(event.target)) setOpen(false);
  });
  window.addEventListener('auth-change', () => {
    const wasOpen = !panel.hidden;
    render();
    setOpen(false);
    if (wasOpen) button.focus();
  });

  render();
  return wrapper;
}

/**
 * Adds the cart link and the account control to the nav tools.
 * @param {Element} navTools the nav tools section
 */
export default function decorateAccount(navTools) {
  const user = document.createElement('div');
  user.className = 'nav-user';
  user.append(createCartLink(), createAccount());
  navTools.append(user);
}
