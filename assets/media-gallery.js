import { Component } from '@theme/component';
import { ThemeEvents, VariantUpdateEvent, ZoomMediaSelectedEvent } from '@theme/events';

/**
 * A custom element that renders a media gallery.
 *
 * @typedef {object} Refs
 * @property {import('./zoom-dialog').ZoomDialog} [zoomDialogComponent] - The zoom dialog component.
 * @property {import('./slideshow').Slideshow} [slideshow] - The slideshow component.
 * @property {HTMLElement[]} [media] - The media elements.
 *
 * @extends Component<Refs>
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
    const slides = /** @type {HTMLElement[]} */ (Array.from(this.querySelectorAll('slideshow-slide[data-fabric-key]')));
    if (!slides.length) return;

    let firstVisibleIndex = -1;

    slides.forEach((slide, index) => {
      const slideFabric = slide.dataset.fabricKey ?? '';
      const isShared = slideFabric === '';
      const isMatch = slideFabric === fabricKey;
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
      const thumbFabric = thumb.dataset.thumbnailFabricKey ?? '';
      const visible = thumbFabric === '' || thumbFabric === fabricKey;
      thumb.toggleAttribute('hidden', !visible);
    });

    if (firstVisibleIndex >= 0) {
      this.slideshow?.select(firstVisibleIndex, undefined, { animate: false });
    }
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
