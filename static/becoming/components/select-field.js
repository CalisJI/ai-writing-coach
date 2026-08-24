/* A listbox that replaces the browser's native select popup.
 *
 * Every dropdown in the product was a bare <select>, so the menu that opened
 * was drawn by the operating system: its own type, its own colours, its own
 * corner radius, in the middle of a product with a defined visual language.
 * The visual reference draws these as a pill on a raised surface, and that is
 * not something a native popup can be made to look like.
 *
 * This is progressive enhancement, not a replacement. The <select> stays in
 * the DOM and stays the source of truth: it is what gets read, what gets set,
 * and what emits `change`. Every existing handler in the app keeps working
 * untouched, and if this module fails to load the native control is still
 * there and still usable.
 *
 * Keyboard behaviour follows the ARIA listbox pattern: Enter, Space, ArrowUp
 * and ArrowDown open; arrows and Home/End move; Enter or Space commit; Escape
 * closes without committing; typing jumps to a matching option. Focus stays on
 * the button throughout and the active option is announced through
 * aria-activedescendant, which is what lets one visible focus ring do the job.
 */

let idCounter = 0;
let openField = null;

function nextId() {
  idCounter += 1;
  return `orena-select-${idCounter}`;
}

function optionsOf(select) {
  return [...select.options].filter(option => !option.disabled);
}

function closeOpenField(returnFocus = false) {
  if (!openField) return;
  const field = openField;
  openField = null;
  field.wrapper.classList.remove('is-open');
  field.button.setAttribute('aria-expanded', 'false');
  field.panel.hidden = true;
  field.button.removeAttribute('aria-activedescendant');
  if (returnFocus) field.button.focus();
}

document.addEventListener('pointerdown', event => {
  if (openField && !openField.wrapper.contains(event.target)) closeOpenField();
}, true);

window.addEventListener('blur', () => closeOpenField());

export function enhanceSelect(select) {
  if (!(select instanceof HTMLSelectElement)) return null;
  if (select.dataset.orenaSelect === 'on') return null;
  // A multi-select is a different control with different semantics; leave it
  // to the browser rather than half-supporting it.
  if (select.multiple || select.size > 1) return null;
  select.dataset.orenaSelect = 'on';

  const id = nextId();
  const wrapper = document.createElement('div');
  wrapper.className = 'orena-select';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'orena-select-button';
  button.id = `${id}-button`;
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');

  const value = document.createElement('span');
  value.className = 'orena-select-value';

  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('viewBox', '0 0 12 12');
  chevron.setAttribute('aria-hidden', 'true');
  chevron.classList.add('orena-select-chevron');
  const chevronPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  chevronPath.setAttribute('d', 'M2.5 4.75 6 8.25 9.5 4.75');
  chevron.appendChild(chevronPath);

  button.append(value, chevron);

  const panel = document.createElement('div');
  panel.className = 'orena-select-panel';
  panel.id = `${id}-panel`;
  panel.hidden = true;
  panel.setAttribute('role', 'listbox');

  const field = { select, wrapper, button, panel, activeIndex: -1 };

  /* The button borrows whatever names the select already had, so the enhanced
     control announces exactly what the native one did. */
  const label = select.getAttribute('aria-label');
  if (label) button.setAttribute('aria-label', label);
  const labelledBy = select.getAttribute('aria-labelledby');
  if (labelledBy) button.setAttribute('aria-labelledby', labelledBy);
  const labelEl = select.id ? document.querySelector(`label[for="${CSS.escape(select.id)}"]`) : null;
  if (labelEl && !label && !labelledBy) {
    if (!labelEl.id) labelEl.id = `${id}-label`;
    button.setAttribute('aria-labelledby', labelEl.id);
  }
  panel.setAttribute('aria-label', label || labelEl?.textContent?.trim() || 'Options');

  function renderOptions() {
    panel.textContent = '';
    optionsOf(select).forEach((option, index) => {
      const item = document.createElement('div');
      item.className = 'orena-select-option';
      item.id = `${id}-option-${index}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option.selected));
      item.dataset.value = option.value;
      item.textContent = option.textContent;
      item.addEventListener('click', () => commit(index));
      item.addEventListener('pointermove', () => setActive(index, false));
      panel.appendChild(item);
    });
  }

  function items() {
    return [...panel.querySelectorAll('.orena-select-option')];
  }

  function syncButton() {
    const selected = select.options[select.selectedIndex];
    value.textContent = selected ? selected.textContent : '';
    button.disabled = select.disabled;
    wrapper.classList.toggle('is-disabled', select.disabled);
  }

  function setActive(index, scroll = true) {
    const list = items();
    if (!list.length) return;
    const clamped = Math.max(0, Math.min(index, list.length - 1));
    field.activeIndex = clamped;
    list.forEach((item, i) => item.classList.toggle('is-active', i === clamped));
    button.setAttribute('aria-activedescendant', list[clamped].id);
    if (scroll) list[clamped].scrollIntoView({ block: 'nearest' });
  }

  function open() {
    if (select.disabled || openField === field) return;
    closeOpenField();
    renderOptions();
    panel.hidden = false;
    wrapper.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    openField = field;
    // Open onto the current value, not the top of the list.
    setActive(Math.max(0, optionsOf(select).findIndex(option => option.selected)));
    placePanel();
  }

  function placePanel() {
    // Flip above the button when there is not room below, so the list is never
    // cut off by the bottom of the window.
    const box = button.getBoundingClientRect();
    const needed = Math.min(panel.scrollHeight, 280);
    wrapper.classList.toggle('opens-up', box.bottom + needed + 12 > window.innerHeight && box.top > needed);
  }

  function commit(index) {
    const option = optionsOf(select)[index];
    if (!option) return;
    const changed = select.value !== option.value;
    select.value = option.value;
    syncButton();
    closeOpenField(true);
    // The select stays the source of truth, so everything already listening to
    // it keeps working without knowing this control exists.
    if (changed) select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  button.addEventListener('click', () => {
    if (openField === field) closeOpenField(true);
    else open();
  });

  button.addEventListener('keydown', event => {
    const isOpen = openField === field;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (isOpen) setActive(field.activeIndex + 1); else open();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) setActive(field.activeIndex - 1); else open();
        break;
      case 'Home':
        if (isOpen) { event.preventDefault(); setActive(0); }
        break;
      case 'End':
        if (isOpen) { event.preventDefault(); setActive(items().length - 1); }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen) commit(field.activeIndex); else open();
        break;
      case 'Escape':
        if (isOpen) { event.preventDefault(); closeOpenField(true); }
        break;
      case 'Tab':
        closeOpenField();
        break;
      default:
        // Type-ahead: jump to the first option starting with the key pressed.
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          const needle = event.key.toLowerCase();
          const list = optionsOf(select);
          const found = list.findIndex(option => option.textContent.trim().toLowerCase().startsWith(needle));
          if (found >= 0) { if (!isOpen) open(); setActive(found); }
        }
    }
  });

  // If anything else sets the value programmatically, the button follows.
  select.addEventListener('change', syncButton);

  field.sync = syncButton;
  // Replacing <option>s in code fires no event, so anything that rewrites the
  // list has to say so. Without this the button keeps whatever text was there
  // when it was enhanced -- "Loading…", in the header's case.
  select.orenaSelectField = field;

  select.parentNode.insertBefore(wrapper, select);
  wrapper.append(button, panel, select);
  syncButton();
  return field;
}

export function syncSelectField(select) {
  select?.orenaSelectField?.sync?.();
}

export function installSelectEnhancements(root = document) {
  root.querySelectorAll('select:not([data-orena-select])').forEach(enhanceSelect);
}
