/*
 * Demo sign-in with Google Identity Services.
 *
 * DEMO ONLY: the Google ID token is decoded in the browser to read the profile, and nothing
 * verifies it on a server. That is enough to show who is signed in and to keep a cart per
 * user, but it is not real security. A production site would send the token to a backend that
 * verifies it (or use a session cookie from a real identity provider).
 *
 * The Google client ID comes from page metadata (`google-client-id`, for example through the
 * bulk metadata sheet). Without one, a "demo user" sign-in is offered so the flow still works.
 */
import { getMetadata, loadScript } from './aem.js';

const STORAGE_KEY = 'demo-user';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

export const DEMO_USER = {
  id: 'demo-user',
  name: 'Demo Shopper',
  email: 'demo@example.com',
  picture: '',
};

/**
 * Gets the Google OAuth client ID from page metadata.
 * @returns {string} the client ID, or an empty string when none is configured
 */
export function getClientId() {
  return getMetadata('google-client-id');
}

/**
 * Gets the signed-in user.
 * @returns {{id: string, name: string, email: string, picture: string}|null} the user, if any
 */
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    return null;
  }
}

/**
 * Stores the user (or clears it) and tells the page through an `auth-change` event.
 * @param {Object|null} user the user, or null to sign out
 */
function setUser(user) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // storage unavailable (private window): the user is simply not remembered
  }
  window.dispatchEvent(new CustomEvent('auth-change', { detail: user }));
}

/**
 * Decodes the profile from a Google ID token (a JWT). The payload is base64url JSON.
 * @param {string} credential the ID token
 * @returns {Object} the profile
 */
function decodeCredential(credential) {
  const payload = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const claims = JSON.parse(new TextDecoder().decode(bytes));
  return {
    id: claims.sub,
    name: claims.name || claims.email,
    email: claims.email,
    picture: claims.picture || '',
  };
}

/**
 * Renders the Google sign-in button into a container.
 * @param {Element} container where the button goes
 */
export async function renderGoogleButton(container) {
  await loadScript(GSI_SRC, { async: '', defer: '' });
  window.google.accounts.id.initialize({
    client_id: getClientId(),
    callback: ({ credential }) => setUser(decodeCredential(credential)),
  });
  window.google.accounts.id.renderButton(container, {
    type: 'standard', theme: 'outline', size: 'large', text: 'signin_with',
  });
}

/**
 * Signs in as the built-in demo user (used when no Google client ID is configured).
 */
export function signInAsDemoUser() {
  setUser(DEMO_USER);
}

/**
 * Signs out.
 */
export function signOut() {
  if (window.google && window.google.accounts) window.google.accounts.id.disableAutoSelect();
  setUser(null);
}

/* keep other tabs in step */
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    window.dispatchEvent(new CustomEvent('auth-change', { detail: getUser() }));
  }
});
