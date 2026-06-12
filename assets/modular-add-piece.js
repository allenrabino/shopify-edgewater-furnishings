import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';
import { formatMoney, resolveProductMoneyFormat } from '@theme/money-formatting';
import { calculateConfigurationTotalCents, syncConfigurationPrice } from '@theme/configuration-price';

/**
 * Dynamic pricing for modular add-a-piece quantities.
 *
 * @extends {Component}
 */
class ModularAddPiece extends Component {
  /** @type {boolean} */
  #wholeDollars = false;

  connectedCallback() {
    super.connectedCallback();
    this.#moneyFormat = this.dataset.moneyFormat || '{{amount}}';
    this.#currency = this.dataset.currency || 'CAD';
    this.#wholeDollars = this.dataset.wholeDollars === 'true';
    this.#basePrice = Number(this.dataset.basePrice) || 0;
    this.#syncBasePriceFromProductPrice();

    this.addEventListener('click', this.#onClick);

    const section = this.closest('.shopify-section');
    section?.addEventListener(ThemeEvents.variantUpdate, this.#onVariantUpdate);

    this.querySelectorAll('[data-piece-row]').forEach((row) => this.#syncQtyButtons(row));
    this.#updateTotal();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const section = this.closest('.shopify-section');
    section?.removeEventListener(ThemeEvents.variantUpdate, this.#onVariantUpdate);
  }

  /** @type {number} */
  #basePrice = 0;

  /** @type {string} */
  #moneyFormat = '{{amount}}';

  /** @type {string} */
  #currency = 'CAD';

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

  #onVariantUpdate = (event) => {
    if (!(event instanceof CustomEvent) || !event.detail?.data?.html) return;

    const productPrice = this.#getProductPriceElement();
    const blockId = productPrice?.dataset.blockId;
    if (!blockId) return;

    const newProductPrice = event.detail.data.html.querySelector(
      `product-price[data-block-id="${blockId}"]`
    );
    const newCents = newProductPrice?.querySelector('[ref="priceContainer"] .price')?.getAttribute('data-price-cents');

    if (newCents == null || newCents === '') return;

    const parsed = Number(newCents);
    if (Number.isNaN(parsed)) return;

    this.#basePrice = parsed;
    this.dataset.basePrice = String(parsed);

    if (productPrice instanceof HTMLElement) {
      productPrice.dataset.variantPriceCents = String(parsed);
    }

    this.#updateTotal();
  };

  #syncBasePriceFromProductPrice() {
    const productPrice = this.#getProductPriceElement();
    const variantCents = productPrice?.dataset.variantPriceCents;
    const centsAttr =
      variantCents ||
      productPrice?.querySelector('[ref="priceContainer"] .price')?.getAttribute('data-price-cents');

    if (centsAttr == null || centsAttr === '') return;

    const parsed = Number(centsAttr);
    if (Number.isNaN(parsed)) return;

    this.#basePrice = parsed;
    this.dataset.basePrice = String(parsed);

    if (productPrice instanceof HTMLElement) {
      productPrice.dataset.variantPriceCents = String(parsed);
    }
  }

  /**
   * @returns {HTMLElement | null}
   */
  #getProductPriceElement() {
    const productDetails = this.closest('.product-details');
    const productPrice = productDetails?.querySelector('product-price');
    return productPrice instanceof HTMLElement ? productPrice : null;
  }

  #updateTotal() {
    const productDetails = this.closest('.product-details');
    const productPrice = this.#getProductPriceElement();
    let total = this.#basePrice;

    if (productPrice instanceof HTMLElement) {
      total = calculateConfigurationTotalCents(this, productPrice);
    } else {
      let piecesTotal = 0;
      this.querySelectorAll('[data-piece-row]').forEach((row) => {
        const unitPrice = Number(row.getAttribute('data-unit-price')) || 0;
        const input = row.querySelector('[data-qty-input]');
        const qty = input instanceof HTMLInputElement ? Number(input.value) || 0 : 0;
        piecesTotal += unitPrice * qty;
      });
      total = this.#basePrice + piecesTotal;
    }

    const display = this.querySelector('[data-total-display]');
    if (display) {
      display.textContent = this.#formatMoney(total);
    }

    syncConfigurationPrice(productDetails);
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
    const moneyFormat = resolveProductMoneyFormat(this.#moneyFormat, this.#wholeDollars);
    return formatMoney(cents, moneyFormat, this.#currency);
  }
}

if (!customElements.get('modular-add-piece')) {
  customElements.define('modular-add-piece', ModularAddPiece);
}
