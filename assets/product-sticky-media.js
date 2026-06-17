import { isDesktopBreakpoint, mediaQueryLarge, throttle } from '@theme/utilities';

/** @type {WeakMap<HTMLElement, () => void>} */
const cleanupBySection = new WeakMap();

/**
 * Match the media column height to the details column so sticky media
 * stays visible while scrolling and bottom-aligns with product info at the end.
 *
 * @param {HTMLElement} section
 */
function initProductStickyMedia(section) {
  cleanupBySection.get(section)?.();

  const mediaWrapper = section.querySelector('.product-information__media');
  const details = section.querySelector('.product-details');

  if (!(mediaWrapper instanceof HTMLElement) || !(details instanceof HTMLElement)) {
    return;
  }

  /** @type {ResizeObserver | undefined} */
  let resizeObserver;

  const syncHeights = () => {
    section.classList.remove('product-information--media-unstick');

    if (!isDesktopBreakpoint()) {
      mediaWrapper.style.minHeight = '';
      return;
    }

    mediaWrapper.style.minHeight = `${details.offsetHeight}px`;
  };

  const throttledSync = throttle(syncHeights, 16);

  mediaQueryLarge.addEventListener('change', syncHeights);

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(throttledSync);
    resizeObserver.observe(details);
    resizeObserver.observe(mediaWrapper);
  }

  window.addEventListener('resize', throttledSync, { passive: true });
  syncHeights();

  const cleanup = () => {
    mediaQueryLarge.removeEventListener('change', syncHeights);
    window.removeEventListener('resize', throttledSync);
    resizeObserver?.disconnect();
    mediaWrapper.style.minHeight = '';
    section.classList.remove('product-information--media-unstick');
  };

  cleanupBySection.set(section, cleanup);
}

/**
 * @param {ParentNode} [scope]
 */
function initAllProductStickyMedia(scope = document) {
  scope.querySelectorAll('[data-sticky-media]').forEach((section) => {
    if (section instanceof HTMLElement) {
      initProductStickyMedia(section);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initAllProductStickyMedia(), { once: true });
} else {
  initAllProductStickyMedia();
}

document.addEventListener('shopify:section:load', (event) => {
  if (event.target instanceof HTMLElement) {
    initAllProductStickyMedia(event.target);
  }
});
