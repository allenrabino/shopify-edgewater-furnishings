import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';

/**
 * @typedef {object} FabricPickerRefs
 * @property {HTMLInputElement[]} inputs
 */

/**
 * Fabric swatch picker for products without a Fabric variant option.
 * Dispatches fabric:selected so media-gallery can filter slides.
 *
 * @extends {Component<FabricPickerRefs>}
 */
export class FabricPicker extends Component {
  connectedCallback() {
    super.connectedCallback();
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
    }
  }

  #onChange = (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.#dispatchFabricSelected(event.target);
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
