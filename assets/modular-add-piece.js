import { Component } from '@theme/component';

/**
 * Dynamic pricing for modular add-a-piece quantities.
 *
 * @extends {Component}
 */
class ModularAddPiece extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.#basePrice = Number(this.dataset.basePrice) || 0;
    this.addEventListener('click', this.#onClick);
    this.querySelectorAll('[data-piece-row]').forEach((row) => this.#syncQtyButtons(row));
    this.#updateTotal();
  }

  /**
   * @param {Element} row
   */
  #syncQtyButtons(row) {
    const input = row.querySelector('[data-qty-input]');
    const decrease = row.querySelector('[data-qty-action="decrease"]');
    if (!(input instanceof HTMLInputElement) || !(decrease instanceof HTMLButtonElement)) return;

    const qty = Number(input.value) || 0;
    decrease.disabled = qty <= 0;
  }

  /** @type {number} */
  #basePrice = 0;

  #onClick = (event) => {
    const button = event.target.closest('[data-qty-action]');
    if (!button) return;

    const row = button.closest('[data-piece-row]');
    const input = row?.querySelector('[data-qty-input]');
    if (!(input instanceof HTMLInputElement)) return;

    const current = Number(input.value) || 0;
    if (button.dataset.qtyAction === 'increase') {
      input.value = String(current + 1);
    } else if (current > 0) {
      input.value = String(current - 1);
    }

    if (row) this.#syncQtyButtons(row);
    this.#updateTotal();
  };

  #updateTotal() {
    let piecesTotal = 0;
    this.querySelectorAll('[data-piece-row]').forEach((row) => {
      const unitPrice = Number(row.getAttribute('data-unit-price')) || 0;
      const input = row.querySelector('[data-qty-input]');
      const qty = input instanceof HTMLInputElement ? Number(input.value) || 0 : 0;
      piecesTotal += unitPrice * qty;
    });

    const total = this.#basePrice + piecesTotal;
    const display = this.querySelector('[data-total-display]');
    if (display) {
      display.textContent = this.#formatMoney(total);
    }

    const productDetails = this.closest('.product-details');
    const productPrice = productDetails?.querySelector('product-price .price');
    if (productPrice instanceof HTMLElement) {
      productPrice.textContent = this.#formatMoney(total);
    }

    const installmentForm = productDetails?.querySelector('form.payment-terms');
    if (installmentForm instanceof HTMLFormElement) {
      installmentForm.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * @returns {Array<{id: number, quantity: number}>}
   */
  getCartLineItems() {
    /** @type {Array<{id: number, quantity: number}>} */
    const items = [];
    this.querySelectorAll('[data-piece-row]').forEach((row) => {
      const variantId = row.getAttribute('data-variant-id');
      const input = row.querySelector('[data-qty-input]');
      const qty = input instanceof HTMLInputElement ? Number(input.value) || 0 : 0;
      if (variantId && qty > 0) {
        items.push({ id: Number(variantId), quantity: qty });
      }
    });
    return items;
  }

  /**
   * @param {number} cents
   */
  #formatMoney(cents) {
    const amount = cents / 100;
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en-CA', {
        style: 'currency',
        currency: this.dataset.currency || 'CAD',
      }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  }
}

if (!customElements.get('modular-add-piece')) {
  customElements.define('modular-add-piece', ModularAddPiece);
}
