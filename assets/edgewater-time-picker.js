/**
 * Edgewater custom time picker for showroom booking forms.
 */
class EdgewaterTimePicker {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.display = root.querySelector('[data-time-display]');
    this.hidden = root.querySelector('[data-time-value]');
    this.menu = root.querySelector('[data-time-menu]');
    this.trigger = root.querySelector('[data-time-trigger]');
    this.options = [...root.querySelectorAll('[data-time-option]')];
    this.isOpen = false;

    this.bindEvents();
  }

  bindEvents() {
    this.trigger?.addEventListener('click', () => this.toggle());
    this.display?.addEventListener('click', () => this.open());
    this.display?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.open();
      }
    });

    this.options.forEach((option) => {
      option.addEventListener('click', () => {
        const value = option.dataset.timeOption || option.textContent?.trim() || '';
        this.select(value);
      });
    });

    document.addEventListener('click', (event) => {
      if (!this.isOpen) return;
      if (!(event.target instanceof Node) || !this.root.contains(event.target)) {
        this.close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.menu?.removeAttribute('hidden');
    this.trigger?.setAttribute('aria-expanded', 'true');
  }

  close() {
    this.isOpen = false;
    this.menu?.setAttribute('hidden', '');
    this.trigger?.setAttribute('aria-expanded', 'false');
  }

  /** @param {string} value */
  select(value) {
    if (this.display) this.display.value = value;
    if (this.hidden) this.hidden.value = value;

    this.options.forEach((option) => {
      const optionValue = option.dataset.timeOption || option.textContent?.trim() || '';
      option.classList.toggle('edgewater-time-picker__option--selected', optionValue === value);
      option.setAttribute('aria-selected', optionValue === value ? 'true' : 'false');
    });

    this.close();
  }
}

function initEdgewaterTimePickers(scope = document) {
  scope.querySelectorAll('[data-edgewater-time-picker]').forEach((root) => {
    if (!(root instanceof HTMLElement) || root.dataset.timePickerInit === 'true') return;
    root.dataset.timePickerInit = 'true';
    new EdgewaterTimePicker(root);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initEdgewaterTimePickers(), { once: true });
} else {
  initEdgewaterTimePickers();
}

document.addEventListener('shopify:section:load', (event) => {
  if (event.target instanceof HTMLElement) {
    initEdgewaterTimePickers(event.target);
  }
});
