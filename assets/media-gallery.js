import { Component } from '@theme/component';
import { SlideshowSelectEvent, ThemeEvents, VariantUpdateEvent, ZoomMediaSelectedEvent } from '@theme/events';

/**
 * A custom element that renders a media gallery.
 *
 * @typedef {object} Refs
 * @property {import('./zoom-dialog').ZoomDialog} [zoomDialogComponent] - The zoom dialog component.
 * @property {import('./slideshow').Slideshow} [slideshow] - The slideshow component.
 * @property {HTMLElement[]} [media] - The media elements.
 *
 * @extends {Component<Refs>}
 */
export class MediaGallery extends Component {
  connectedCallback() {
    super.connectedCallback();

    const { signal } = this.#controller;
    const target = this.closest('.shopify-section, dialog');

    target?.addEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate, { signal });
    target?.addEventListener(ThemeEvents.fabricSelected, this.#handleFabricSelected, { signal });
    this.refs.zoomDialogComponent?.addEventListener(ThemeEvents.zoomMediaSelected, this.#handleZoomMediaSelected, {
      signal,
    });

    if (this.dataset.adaptSlideHeight === 'true') {
      this.addEventListener(SlideshowSelectEvent.eventName, this.#syncActiveSlideHeight, { signal });
      this.#setupAdaptHeightSync(signal);
    }

    if (this.dataset.fabricFilter === 'off') return;

    const defaultFabric = this.dataset.defaultFabric;
    if (defaultFabric) {
      this.#applyFabricFilter(defaultFabric);
    }
  }

  #controller = new AbortController();

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#controller.abort();
  }

  /**
   * @param {AbortSignal} signal
   */
  #setupAdaptHeightSync(signal) {
    const run = () => {
      requestAnimationFrame(() => this.#syncActiveSlideHeight());
    };

    run();

    window.addEventListener('resize', run, { signal });

    this.querySelectorAll('img').forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', run, { signal });
    });
  }

  #syncActiveSlideHeight = () => {
    if (this.dataset.adaptSlideHeight !== 'true') return;

    const slideshow = this.refs.slideshow;
    const container = slideshow?.refs?.slideshowContainer;
    const activeSlide = slideshow?.querySelector('slideshow-slide[aria-hidden="false"]:not([hidden])');

    if (!(container instanceof HTMLElement) || !(activeSlide instanceof HTMLElement)) return;

    const image = activeSlide.querySelector('img.product-media__image');
    const slideWidth = activeSlide.clientWidth || container.clientWidth;
    const maxHeight = this.#getProductMediaMaxHeight();

    container.style.height = 'auto';

    let height = activeSlide.scrollHeight;

    if (image instanceof HTMLImageElement && image.naturalWidth > 0 && slideWidth > 0) {
      height = Math.ceil(slideWidth * (image.naturalHeight / image.naturalWidth));
    }

    if (maxHeight > 0) {
      height = Math.min(height, maxHeight);
    }

    if (height <= 0) return;

    container.style.height = `${height}px`;

    const thumbnailControls = this.querySelector(
      'slideshow-controls[thumbnails]:is([pagination-position="right"], [pagination-position="left"])'
    );
    if (thumbnailControls instanceof HTMLElement) {
      thumbnailControls.style.maxHeight = `${height}px`;
    }
  };

  /**
   * @returns {number}
   */
  #getProductMediaMaxHeight() {
    const value = getComputedStyle(this).getPropertyValue('--product-media-max-height').trim();
    if (!value) return 480;

    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.height = value;
    document.body.appendChild(probe);
    const height = probe.getBoundingClientRect().height;
    probe.remove();

    return Math.ceil(height) || 480;
  };

  /**
   * Handles a variant update event by replacing the current media gallery with a new one.
   *
   * @param {VariantUpdateEvent} event - The variant update event.
   */
  #handleVariantUpdate = (event) => {
    const source = event.detail.data.html;

    if (!source) return;
    const newMediaGallery = source.querySelector('media-gallery');

    if (!newMediaGallery) return;

    this.replaceWith(newMediaGallery);
  };

  /**
   * @param {CustomEvent} event
   */
  #handleFabricSelected = (event) => {
    if (this.dataset.fabricFilter === 'off') return;

    const fabricKey = event.detail?.fabricKey;
    if (typeof fabricKey !== 'string') return;
    this.#applyFabricFilter(fabricKey);
  };

  /**
   * Shows media slides matching the fabric key; shared slides (no key) stay visible.
   *
   * @param {string} fabricKey
   */
  #applyFabricFilter(fabricKey) {
    const normalizedKey = fabricKey.toLowerCase().trim();
    const slides = /** @type {HTMLElement[]} */ (Array.from(this.querySelectorAll('slideshow-slide[data-fabric-key]')));
    if (!slides.length) return;

    let firstVisibleIndex = -1;

    slides.forEach((slide, index) => {
      const slideFabric = (slide.dataset.fabricKey ?? '').toLowerCase().trim();
      const isShared = slideFabric === '';
      const isMatch = slideFabric === normalizedKey;
      const visible = isShared || isMatch;

      slide.toggleAttribute('hidden', !visible);
      slide.setAttribute('aria-hidden', String(!visible));

      if (visible && firstVisibleIndex === -1) {
        firstVisibleIndex = index;
      }
    });

    const thumbnails = this.querySelectorAll('[data-thumbnail-fabric-key]');
    thumbnails.forEach((thumb) => {
      if (!(thumb instanceof HTMLElement)) return;
      const thumbFabric = (thumb.dataset.thumbnailFabricKey ?? '').toLowerCase().trim();
      const visible = thumbFabric === '' || thumbFabric === normalizedKey;
      thumb.toggleAttribute('hidden', !visible);
    });

    if (firstVisibleIndex >= 0) {
      this.slideshow?.select(firstVisibleIndex, undefined, { animate: false });
    }

    this.#syncActiveSlideHeight();
  };

  /**
   * Handles the 'zoom-media:selected' event.
   * @param {ZoomMediaSelectedEvent} event - The zoom-media:selected event.
   */
  #handleZoomMediaSelected = async (event) => {
    this.slideshow?.select(event.detail.index, undefined, { animate: false });
  };

  /**
   * Zooms the media gallery.
   *
   * @param {number} index - The index of the media to zoom.
   * @param {PointerEvent} event - The pointer event.
   */
  zoom(index, event) {
    this.refs.zoomDialogComponent?.open(index, event);
  }

  /**
   * Preloads an image.
   * @param {number} index - The index of the media to preload.
   */
  preloadImage(index) {
    const zoomDialogMedia = this.refs.zoomDialogComponent?.refs.media[index];
    if (!zoomDialogMedia) return;

    this.refs.zoomDialogComponent?.loadHighResolutionImage(zoomDialogMedia);
  }

  get slideshow() {
    return this.refs.slideshow;
  }

  get media() {
    return this.refs.media;
  }

  get presentation() {
    return this.dataset.presentation;
  }
}

if (!customElements.get('media-gallery')) {
  customElements.define('media-gallery', MediaGallery);
}
