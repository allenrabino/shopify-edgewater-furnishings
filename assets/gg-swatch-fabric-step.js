/**
 * Keeps GG Variant Images swatches visible under the fabric step header while
 * hiding the theme's native fabric grid (including after variant picker morphs).
 */
(function () {
  const ROOT_CLASS = 'has-gg-swatches';

  /**
   * @returns {HTMLElement | null}
   */
  function getProductInformation() {
    return document.querySelector('.product-information');
  }

  /**
   * @returns {HTMLElement | null}
   */
  function getVariantPicker() {
    return document.querySelector('.product-details variant-picker');
  }

  /**
   * @returns {HTMLElement | null}
   */
  function getGgSwatch() {
    return document.querySelector('gg-swatch');
  }

  function markGgSwatchContext() {
    const productInformation = getProductInformation();
    const ggSwatch = getGgSwatch();

    if (productInformation instanceof HTMLElement && ggSwatch instanceof HTMLElement) {
      productInformation.classList.add(ROOT_CLASS);
    }
  }

  function hideNativeFabricPanel() {
    document
      .querySelectorAll(
        '.variant-picker__fabric-disclosure .variant-option--fabric-grid, .variant-picker__fabric-disclosure fieldset[data-fabric-option]'
      )
      .forEach((element) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.style.display !== 'none') {
          element.style.setProperty('display', 'none', 'important');
        }
        if (element.getAttribute('aria-hidden') !== 'true') {
          element.setAttribute('aria-hidden', 'true');
        }
      });
  }

  /**
   * Keep gg-swatch as a sibling of variant-picker so variant picker morphs do not destroy it.
   */
  function ensureGgSwatchPosition() {
    const variantPicker = getVariantPicker();
    const ggSwatch = getGgSwatch();

    if (!(variantPicker instanceof HTMLElement) || !(ggSwatch instanceof HTMLElement)) return;

    if (ggSwatch.previousElementSibling !== variantPicker) {
      variantPicker.insertAdjacentElement('afterend', ggSwatch);
    }

    ggSwatch.style.display = 'block';
  }

  function syncFabricStep() {
    markGgSwatchContext();
    hideNativeFabricPanel();
    ensureGgSwatchPosition();
  }

  function init() {
    syncFabricStep();

    const ggSwatch = getGgSwatch();
    if (ggSwatch) {
      ggSwatch.addEventListener('gg-swatch-ready', syncFabricStep);
      ggSwatch.addEventListener('gg-swatch-change', () => {
        requestAnimationFrame(syncFabricStep);
        setTimeout(syncFabricStep, 0);
        setTimeout(syncFabricStep, 100);
      });
    }

    document.addEventListener('variant:update', () => {
      requestAnimationFrame(syncFabricStep);
      setTimeout(syncFabricStep, 0);
      setTimeout(syncFabricStep, 100);
    });

    document.addEventListener('variant:change', syncFabricStep, true);
    document.addEventListener('variant:changed', syncFabricStep, true);

    const productInformation = getProductInformation();
    if (!productInformation) return;

    const observer = new MutationObserver(() => {
      syncFabricStep();
    });

    observer.observe(productInformation, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
