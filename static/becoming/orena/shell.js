/* Orena visual system — shell behaviour.
 *
 * Three small jobs, none of which belong in a screen module: the phone
 * drawer, the desktop rail collapse, and the generic disclosure used by the
 * panels that fold on a narrow viewport.
 */

import { t } from '../domain/i18n.js';

const COLLAPSE_KEY = 'orena.sidebar.collapsed.v1';

/* The header shows the destination, not the verb: the rail already says
   "Write", so the page says "Writing". */
const TITLE_KEYS = {
  home: 'title.home',
  write: 'title.write',
  review: 'title.review',
  read: 'title.read',
  listen: 'title.listen',
  speak: 'title.speak',
  library: 'title.library',
  grammar: 'title.grammar',
  journey: 'title.journey',
  profile: 'title.profile',
  onboarding: 'title.onboarding',
};

function shell() {
  return document.getElementById('app');
}

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(value) {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0');
  } catch {
    /* A browser refusing storage is not a reason to refuse the interaction. */
  }
}

export function closeDrawer() {
  shell()?.setAttribute('data-drawer', 'closed');
  document.getElementById('drawerToggle')?.setAttribute('aria-expanded', 'false');
}

function openDrawer() {
  shell()?.setAttribute('data-drawer', 'open');
  document.getElementById('drawerToggle')?.setAttribute('aria-expanded', 'true');
}

function toggleCollapsed() {
  const node = shell();
  if (!node) return;
  const next = node.getAttribute('data-sidebar') !== 'collapsed';
  node.setAttribute('data-sidebar', next ? 'collapsed' : 'expanded');
  writeCollapsed(next);
  syncCollapseLabel();
}

function syncCollapseLabel() {
  const button = document.getElementById('sidebarCollapse');
  if (!button) return;
  const collapsed = shell()?.getAttribute('data-sidebar') === 'collapsed';
  const label = collapsed ? t('chrome.expand') : t('chrome.collapse');
  const text = button.querySelector('[data-collapse-label]');
  if (text) text.textContent = label;
  button.setAttribute('aria-label', label);
  button.title = label;
}

/* Disclosure sections.
 *
 * The toggle is a real button with aria-expanded and the body is a real
 * element, so the section is operable from the keyboard and announced
 * correctly. CSS decides at which widths the closed state actually hides
 * anything, which is why `data-open` is set even when it has no visual effect
 * at the current width. */
export function installDisclosures(root = document) {
  root.querySelectorAll('.o-disclosure').forEach((section) => {
    const toggle = section.querySelector('.o-disclosure__toggle');
    if (!toggle || toggle.dataset.oBound === '1') return;
    toggle.dataset.oBound = '1';

    if (!section.hasAttribute('data-open')) section.setAttribute('data-open', 'true');
    toggle.setAttribute('aria-expanded', section.getAttribute('data-open') === 'true' ? 'true' : 'false');

    toggle.addEventListener('click', () => {
      const open = section.getAttribute('data-open') !== 'true';
      section.setAttribute('data-open', open ? 'true' : 'false');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
}

export function syncOrenaChrome(route) {
  const name = t(TITLE_KEYS[route] || 'title.home');
  const title = document.getElementById('pageTitle');
  if (title) title.textContent = name;
  const heading = document.getElementById('pageHeading');
  if (heading) heading.textContent = name;
  syncCollapseLabel();
  closeDrawer();
}

export function installOrenaShell() {
  const node = shell();
  if (!node) return;

  node.setAttribute('data-sidebar', readCollapsed() ? 'collapsed' : 'expanded');
  node.setAttribute('data-drawer', 'closed');

  document.getElementById('drawerToggle')?.addEventListener('click', () => {
    if (node.getAttribute('data-drawer') === 'open') closeDrawer();
    else openDrawer();
  });

  document.getElementById('shellScrim')?.addEventListener('click', closeDrawer);
  document.getElementById('sidebarCollapse')?.addEventListener('click', toggleCollapsed);

  /* Following a destination is the end of the drawer's job. */
  node.querySelector('.o-sidebar')?.addEventListener('click', (event) => {
    if (event.target.closest('a[data-route]')) closeDrawer();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && node.getAttribute('data-drawer') === 'open') closeDrawer();
  });

  /* Returning to the desktop layout must not leave an invisible open drawer
     trapping clicks behind the scrim. */
  window.matchMedia('(min-width:1024px)').addEventListener('change', (event) => {
    if (event.matches) closeDrawer();
  });

  syncCollapseLabel();
}
