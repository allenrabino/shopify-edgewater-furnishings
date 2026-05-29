import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';

/**
 * @typedef {object} FabricPickerRefs
 * @property {HTMLInputElement[]} inputs
 * @property {HTMLElement} [carousel]
 * @property {HTMLElement} [viewport]
 * @property {HTMLElement} [track]
 * @property {HTMLButtonElement} [prevNav]
 * @property {HTMLButtonElement} [nextNav]
 */

/**
 * Fabric swatch picker for products without a Fabric variant option.
 * Dispatches fabric:selected so media-gallery can filter slides.
 *
 * @extends {Component<FabricPickerRefs>}
 */
export class FabricPicker extends Component {
  /** @type {number} */
  #currentPage = 0;

  /** @type {number} */
  #pageCount = 1;

  /** @type {number} */
  #perPage = 4;

  connectedCallback() {
    super.connectedCallback();
    this.#perPage = parseInt(this.dataset.visiblePerPage || '4', 10) || 4;
    this.#initCarousel();
    this.addEventListener('change', this.#onChange);

    let checked = this.querySelector('input[type="radio"]:checked');
    if (!(checked instanceof HTMLInputElement)) {
      const first = this.querySelector('input[type="radio"]');
      if (first instanceof HTMLInputElement) {
        first.checked = true;
        checked = first;
      }
    }
    if (checked instanceof HTMLInputElement) {
      this.#dispatchFabricSelected(checked);
      this.#scrollToInput(checked);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.#updateCarousel);
  }

  #initCarousel() {
    const carousel = this.refs.carousel;
    const track = this.refs.track;
    const viewport = this.refs.viewport;

    if (!(carousel instanceof HTMLElement) || !(track instanceof HTMLElement) || !(viewport instanceof HTMLElement)) {
      return;
    }

    const count = parseInt(this.dataset.swatchCount || '0', 10);
    if (count <= this.#perPage || carousel.classList.contains('fabric-picker__carousel--static')) {
      return;
    }

    this.#pageCount = Math.ceil(count / this.#perPage);
    this.refs.prevNav?.addEventListener('click', () => this.#slideBy(-1));
    this.refs.nextNav?.addEventListener('click', () => this.#slideBy(1));
    window.addEventListener('resize', this.#updateCarousel);
    this.#updateCarousel();
  }

  #slideBy = (delta) => {
    const nextPage = Math.min(Math.max(0, this.#currentPage + delta), this.#pageCount - 1);
    if (nextPage === this.#currentPage) return;
    this.#currentPage = nextPage;
    this.#updateCarousel();
  };

  #updateCarousel = () => {
    const track = this.refs.track;
    const viewport = this.refs.viewport;
    const prev = this.refs.prevNav;
    const next = this.refs.nextNav;

    if (!(track instanceof HTMLElement) || !(viewport instanceof HTMLElement)) return;

    const pageWidth = viewport.offsetWidth;
    track.style.transform = `translateX(-${this.#currentPage * pageWidth}px)`;

    const atStart = this.#currentPage <= 0;
    const atEnd = this.#currentPage >= this.#pageCount - 1;

    if (prev instanceof HTMLButtonElement) {
      prev.disabled = atStart;
      prev.hidden = false;
    }
    if (next instanceof HTMLButtonElement) {
      next.disabled = atEnd;
      next.hidden = false;
    }
  };

  /**
   * @param {HTMLInputElement} input
   */
  #scrollToInput(input) {
    const carousel = this.refs.carousel;
    if (!(carousel instanceof HTMLElement) || carousel.classList.contains('fabric-picker__carousel--static')) {
      return;
    }

    const item = input.closest('.fabric-picker__item');
    const items = [...this.querySelectorAll('.fabric-picker__item')];
    const index = items.indexOf(item);
    if (index < 0) return;

    const targetPage = Math.floor(index / this.#perPage);
    if (targetPage !== this.#currentPage) {
      this.#currentPage = targetPage;
      this.#updateCarousel();
    }
  }

  #onChange = (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.#dispatchFabricSelected(event.target);
    this.#scrollToInput(event.target);
  };

  /**
   * @param {HTMLInputElement} input
   */
  #dispatchFabricSelected(input) {
    const fabricKey = input.dataset.fabricKey ?? '';
    const section = this.closest('.shopify-section');

    this.dispatchEvent(
      new CustomEvent(ThemeEvents.fabricSelected, {
        bubbles: true,
        detail: {
          fabricKey,
          sectionId: section?.id,
        },
      })
    );
  }
}

if (!customElements.get('fabric-picker')) {
  customElements.define('fabric-picker', FabricPicker);
}
