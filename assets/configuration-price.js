import { formatMoney } from '@theme/money-formatting';

/**
 * Keeps product page pricing in sync with the selected variant and Add a Piece quantities.
 *
 * @module configuration-price
 */

/** @type {AbortController | undefined} */
let priceFetchController;

/**
 * @param {HTMLElement | null | undefined} productDetails
 */
export function syncConfigurationPrice(productDetails) {
  if (!(productDetails instanceof HTMLElement)) return;

  const productPrice = productDetails.querySelector('product-price');
  if (!(productPrice instanceof HTMLElement)) return;

  const modular = productDetails.querySelector('modular-add-piece');
  const updateFromAddPiece = productPrice.dataset.updateFromAddPiece !== 'false';
  const variantBaseCents = readVariantBaseCents(productPrice);
  let totalCents = variantBaseCents;
  let hasExtras = false;

  if (modular instanceof HTMLElement && updateFromAddPiece) {
    const piecesTotal = calculatePiecesTotalCents(modular);
    hasExtras = piecesTotal > 0;
    totalCents = variantBaseCents + piecesTotal;

    if (variantBaseCents > 0) {
      modular.dataset.basePrice = String(variantBaseCents);
    }

    const display = modular.querySelector('[data-total-display]');
    if (display instanceof HTMLElement) {
      const moneyFormat = modular.dataset.moneyFormat || productPrice.dataset.moneyFormat || '{{amount}}';
      const currency = modular.dataset.currency || productPrice.dataset.currency || 'CAD';
      display.textContent = formatMoney(totalCents, moneyFormat, currency);
    }
  }

  const wasUsingConfigurationTotal = productPrice.dataset.usingConfigurationTotal === 'true';

  if (hasExtras) {
    applyConfigurationTotal(productDetails, productPrice, totalCents, true);
    productPrice.dataset.usingConfigurationTotal = 'true';
    return;
  }

  productPrice.dataset.usingConfigurationTotal = 'false';

  if (wasUsingConfigurationTotal) {
    const variantId = getCurrentVariantId(productDetails);
    if (variantId) {
      refreshProductPriceForVariant(productDetails, variantId);
      return;
    }
  }

  restoreVariantPriceDisplay(productPrice, variantBaseCents);
  applyFinanceAndSticky(productDetails, productPrice, totalCents);
}

/**
 * @param {HTMLElement} modular
 * @returns {number}
 */
export function calculatePiecesTotalCents(modular) {
  let piecesTotal = 0;
  modular.querySelectorAll('[data-piece-row]').forEach((row) => {
    const unitPrice = Number(row.getAttribute('data-unit-price')) || 0;
    const input = row.querySelector('[data-qty-input]');
    const qty = input instanceof HTMLInputElement ? Number(input.value) || 0 : 0;
    piecesTotal += unitPrice * qty;
  });
  return piecesTotal;
}

/**
 * @param {HTMLElement} modular
 * @param {HTMLElement} productPrice
 * @returns {number}
 */
export function calculateConfigurationTotalCents(modular, productPrice) {
  return readVariantBaseCents(productPrice) + calculatePiecesTotalCents(modular);
}

/**
 * @param {HTMLElement} productDetails
 * @param {string | number} variantId
 */
export async function refreshProductPriceForVariant(productDetails, variantId) {
  if (!(productDetails instanceof HTMLElement) || variantId == null || variantId === '') return;

  const productPrice = productDetails.querySelector('product-price');
  if (!(productPrice instanceof HTMLElement)) return;

  const productUrl =
    productDetails.querySelector('variant-picker')?.dataset.productUrl ||
    productDetails.querySelector('product-form-component')?.dataset.productUrl;

  if (!productUrl) return;

  priceFetchController?.abort();
  priceFetchController = new AbortController();

  const url = new URL(productUrl, window.location.origin);
  url.searchParams.set('variant', String(variantId));

  try {
    const response = await fetch(url.toString(), {
      credentials: 'same-origin',
      signal: priceFetchController.signal,
    });
    const responseText = await response.text();
    const html = new DOMParser().parseFromString(responseText, 'text/html');
    updateProductPriceFromHtml(html, productDetails, productPrice, variantId);

    const modular = productDetails.querySelector('modular-add-piece');
    const hasExtras = modular instanceof HTMLElement && calculatePiecesTotalCents(modular) > 0;
    if (hasExtras) {
      syncConfigurationPrice(productDetails);
    } else {
      productPrice.dataset.usingConfigurationTotal = 'false';
      restoreVariantPriceDisplay(productPrice, readVariantBaseCents(productPrice));
      applyFinanceAndSticky(productDetails, productPrice, readVariantBaseCents(productPrice));
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    console.error('[configuration-price] Failed to refresh price for variant:', error);
  }
}

/**
 * @param {Document} html
 * @param {HTMLElement} productDetails
 * @param {HTMLElement} productPrice
 * @param {string | number} variantId
 */
export function updateProductPriceFromHtml(html, productDetails, productPrice, variantId) {
  const blockId = productPrice.dataset.blockId;
  const newProductPrice = html.querySelector(`product-price[data-block-id="${blockId}"]`);
  if (!(newProductPrice instanceof HTMLElement)) return;

  if (newProductPrice.dataset.variantPriceCents) {
    productPrice.dataset.variantPriceCents = newProductPrice.dataset.variantPriceCents;
  }

  const modular = productDetails.querySelector('modular-add-piece');
  if (modular instanceof HTMLElement && newProductPrice.dataset.variantPriceCents) {
    modular.dataset.basePrice = newProductPrice.dataset.variantPriceCents;
  }

  const priceContainer = productPrice.querySelector('[ref="priceContainer"]');
  const newPriceContainer = newProductPrice.querySelector('[ref="priceContainer"]');
  if (priceContainer && newPriceContainer) {
    priceContainer.replaceWith(newPriceContainer.cloneNode(true));
  }

  const financeDisplay = productPrice.querySelector('[data-finance-display]');
  const newFinanceDisplay = newProductPrice.querySelector('[data-finance-display]');
  if (financeDisplay instanceof HTMLElement && newFinanceDisplay instanceof HTMLElement) {
    financeDisplay.textContent = newFinanceDisplay.textContent;
    financeDisplay.hidden = newFinanceDisplay.hidden;
  }

  const variantInput = productDetails.querySelector('product-form-component input[name="id"]');
  const variantJson = html.querySelector('variant-picker script[type="application/json"]')?.textContent;
  if (variantInput instanceof HTMLInputElement) {
    if (variantJson) {
      try {
        const variant = JSON.parse(variantJson);
        if (variant?.id) {
          variantInput.value = String(variant.id);
        }
      } catch {
        variantInput.value = String(variantIdFromHtml(html) ?? variantId ?? variantInput.value);
      }
    } else if (variantId != null) {
      variantInput.value = String(variantId);
    }
  }
}

/**
 * @param {Document} html
 * @returns {string | null}
 */
function variantIdFromHtml(html) {
  const variantJson = html.querySelector('variant-picker script[type="application/json"]')?.textContent;
  if (!variantJson) return null;

  try {
    const variant = JSON.parse(variantJson);
    return variant?.id ? String(variant.id) : null;
  } catch {
    return null;
  }
}

/**
 * @param {HTMLElement} productDetails
 * @returns {string | null}
 */
function getCurrentVariantId(productDetails) {
  const variantInput = productDetails.querySelector('product-form-component input[name="id"]');
  if (variantInput instanceof HTMLInputElement && variantInput.value) {
    return variantInput.value;
  }

  const checkedInput = productDetails.querySelector('variant-picker input:checked');
  if (checkedInput instanceof HTMLInputElement && checkedInput.dataset.variantId) {
    return checkedInput.dataset.variantId;
  }

  return null;
}

/**
 * @param {HTMLElement} productPrice
 * @returns {number}
 */
function readVariantBaseCents(productPrice) {
  const variantCents = Number(productPrice.dataset.variantPriceCents);
  if (!Number.isNaN(variantCents) && variantCents > 0) {
    return variantCents;
  }

  const priceEl = productPrice.querySelector('[ref="priceContainer"] .price');
  const centsAttr = priceEl?.getAttribute('data-price-cents');
  if (centsAttr == null || centsAttr === '') return 0;

  const parsed = Number(centsAttr);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Keep Shopify-rendered variant price (including compare-at) when no add-a-piece extras.
 *
 * @param {HTMLElement} productPrice
 * @param {number} variantBaseCents
 */
function restoreVariantPriceDisplay(productPrice, variantBaseCents) {
  productPrice.querySelectorAll('[ref="priceContainer"] [role="group"]').forEach((group) => {
    if (group instanceof HTMLElement) {
      group.style.removeProperty('display');
    }
  });

  productPrice.querySelectorAll('[ref="priceContainer"] .price').forEach((priceEl) => {
    if (variantBaseCents > 0) {
      priceEl.setAttribute('data-price-cents', String(variantBaseCents));
    }
  });
}

/**
 * @param {HTMLElement} productDetails
 * @param {HTMLElement} productPrice
 * @param {number} totalCents
 * @param {boolean} hideCompareAt
 */
function applyConfigurationTotal(productDetails, productPrice, totalCents, hideCompareAt) {
  const moneyFormat = productPrice.dataset.moneyFormat || '{{amount}}';
  const currency = productPrice.dataset.currency || 'CAD';
  const formatted = formatMoney(totalCents, moneyFormat, currency);

  productPrice.querySelectorAll('[ref="priceContainer"] [role="group"]').forEach((group) => {
    if (!(group instanceof HTMLElement)) return;
    if (hideCompareAt && group.querySelector('.compare-at-price')) {
      group.style.display = 'none';
    } else {
      group.style.removeProperty('display');
    }
  });

  productPrice.querySelectorAll('[ref="priceContainer"] .price').forEach((priceEl) => {
    priceEl.textContent = formatted;
    priceEl.setAttribute('data-price-cents', String(totalCents));
  });

  productPrice.dataset.configurationTotalCents = String(totalCents);
  applyFinanceAndSticky(productDetails, productPrice, totalCents);
}

/**
 * @param {HTMLElement} productDetails
 * @param {HTMLElement} productPrice
 * @param {number} totalCents
 */
function applyFinanceAndSticky(productDetails, productPrice, totalCents) {
  const moneyFormat = productPrice.dataset.moneyFormat || '{{amount}}';
  const currency = productPrice.dataset.currency || 'CAD';
  const formatted = formatMoney(totalCents, moneyFormat, currency);

  applyFinancePricing(productPrice, totalCents, moneyFormat, currency);
  applyStickyPrice(productDetails, formatted, totalCents);

  const installmentForm = productDetails.querySelector('form.payment-terms');
  if (installmentForm instanceof HTMLFormElement) {
    installmentForm.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * @param {HTMLElement} productPrice
 * @param {number} totalCents
 * @param {string} moneyFormat
 * @param {string} currency
 */
function applyFinancePricing(productPrice, totalCents, moneyFormat, currency) {
  if (productPrice.dataset.showFinancePricing !== 'true') return;

  const financeDisplay = productPrice.querySelector('[data-finance-display]');
  if (!(financeDisplay instanceof HTMLElement)) return;

  const months = Math.max(1, Number(productPrice.dataset.financeMonths) || 12);
  const monthlyCents = Math.round(totalCents / months);
  const monthlyFormatted = formatMoney(monthlyCents, moneyFormat, currency);
  const labelTemplate = productPrice.dataset.financeLabel || 'Starting at [amount]/month';
  const amountPlaceholder = /\[amount\]|\{\{\s*amount\s*\}\}/gi;

  financeDisplay.textContent = labelTemplate.replace(amountPlaceholder, monthlyFormatted);
  financeDisplay.hidden = false;
}

/**
 * @param {HTMLElement} productDetails
 * @param {string} formatted
 * @param {number} totalCents
 */
function applyStickyPrice(productDetails, formatted, totalCents) {
  const section = productDetails.closest('.shopify-section');
  const stickyPrice = section?.querySelector('[data-testid="sticky-price-display"] .price');
  if (!(stickyPrice instanceof HTMLElement)) return;

  stickyPrice.textContent = formatted;
  stickyPrice.setAttribute('data-price-cents', String(totalCents));
}

/**
 * @param {CustomEvent} event
 */
export function handleGgSwatchChange(event) {
  if (!(event instanceof CustomEvent)) return;

  const variantId = event.detail?.variantId;
  const productDetails = document.querySelector('.product-details');
  if (!variantId || !(productDetails instanceof HTMLElement)) return;

  refreshProductPriceForVariant(productDetails, variantId);
}

/**
 * Wire GG swatch changes to product price updates.
 */
export function initGgSwatchPriceSync() {
  const bind = (/** @type {HTMLElement} */ ggSwatch) => {
    if (ggSwatch.dataset.ggPriceSyncBound === 'true') return;
    ggSwatch.dataset.ggPriceSyncBound = 'true';
    ggSwatch.addEventListener('gg-swatch-change', handleGgSwatchChange);
  };

  const existing = document.querySelector('gg-swatch');
  if (existing instanceof HTMLElement) {
    bind(existing);
  }

  document.addEventListener(
    'gg-swatch-ready',
    (event) => {
      if (event.target instanceof HTMLElement) {
        bind(event.target);
      }
    },
    true
  );
}
