/**
 * FAQ accordion: keep one item open at a time and sync URL hash for deep links.
 */
class EdgewaterFaq extends HTMLElement {
  /** @type {AbortController | null} */
  #controller = null;

  connectedCallback() {
    this.#controller = new AbortController();
    const { signal } = this.#controller;

    this.#openFromHash();

    this.querySelectorAll('.edgewater-faq__item').forEach((details) => {
      details.addEventListener('toggle', () => this.#handleToggle(details), { signal });
    });

    window.addEventListener('hashchange', () => this.#openFromHash(), { signal });
  }

  disconnectedCallback() {
    this.#controller?.abort();
    this.#controller = null;
  }

  /** @param {HTMLDetailsElement} details */
  #handleToggle(details) {
    if (!details.open) return;

    this.querySelectorAll('.edgewater-faq__item[open]').forEach((openItem) => {
      if (openItem !== details) openItem.open = false;
    });

    if (details.id) {
      history.replaceState(null, '', `#${details.id}`);
    }
  }

  #openFromHash() {
    const id = window.location.hash.replace('#', '');
    if (!id) return;

    const target = this.querySelector(`#${CSS.escape(id)}`);
    if (!(target instanceof HTMLDetailsElement)) return;

    this.querySelectorAll('.edgewater-faq__item[open]').forEach((item) => {
      item.open = false;
    });

    target.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

if (!customElements.get('edgewater-faq')) {
  customElements.define('edgewater-faq', EdgewaterFaq);
}
