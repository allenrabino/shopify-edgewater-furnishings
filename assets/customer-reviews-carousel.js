/**
 * Customer reviews carousel: endless one-card auto-flow with seamless looping.
 */
function initCustomerReviewsFlow(slideshow) {
  if (!(slideshow instanceof HTMLElement) || slideshow.dataset.flowInit === 'true') return;

  const scroller = slideshow.querySelector('slideshow-slides');
  const prev = slideshow.querySelector('.slideshow-control--previous');
  const next = slideshow.querySelector('.slideshow-control--next');

  if (!scroller) return;

  const originalSlides = [...scroller.querySelectorAll('slideshow-slide')].filter(
    (slide) => slide.dataset.clone !== 'true'
  );

  if (originalSlides.length === 0) return;

  slideshow.dataset.flowInit = 'true';

  originalSlides.forEach((slide) => {
    const clone = slide.cloneNode(true);
    clone.dataset.clone = 'true';
    clone.setAttribute('aria-hidden', 'true');
    scroller.appendChild(clone);
  });

  let loopWidth = 0;
  let isAnimating = false;

  const measureLoop = () => {
    loopWidth = scroller.scrollWidth / 2;
  };

  const getStep = () => {
    const slide = originalSlides[0];
    if (!slide) return 0;

    const styles = getComputedStyle(scroller);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;

    return slide.getBoundingClientRect().width + gap;
  };

  const normalizeScroll = (instant = true) => {
    if (!loopWidth) return;

    if (scroller.scrollLeft >= loopWidth - 1) {
      scroller.scrollTo({
        left: scroller.scrollLeft - loopWidth,
        behavior: instant ? 'auto' : 'smooth',
      });
    } else if (scroller.scrollLeft < 0) {
      scroller.scrollTo({
        left: scroller.scrollLeft + loopWidth,
        behavior: instant ? 'auto' : 'smooth',
      });
    }
  };

  const waitForScrollEnd = () =>
    new Promise((resolve) => {
      if ('onscrollend' in scroller) {
        const onScrollEnd = () => {
          scroller.removeEventListener('scrollend', onScrollEnd);
          resolve();
        };
        scroller.addEventListener('scrollend', onScrollEnd, { once: true });
        return;
      }

      let lastLeft = scroller.scrollLeft;
      let frames = 0;

      const poll = () => {
        frames += 1;
        if (scroller.scrollLeft === lastLeft || frames > 90) {
          resolve();
          return;
        }

        lastLeft = scroller.scrollLeft;
        requestAnimationFrame(poll);
      };

      requestAnimationFrame(poll);
    });

  const scrollFlow = async (direction) => {
    const step = getStep();
    if (!step || isAnimating) return;

    isAnimating = true;

    if (direction < 0 && scroller.scrollLeft <= step) {
      scroller.scrollLeft += loopWidth;
    }

    scroller.scrollBy({ left: direction * step, behavior: 'smooth' });
    await waitForScrollEnd();
    normalizeScroll(true);
    isAnimating = false;
  };

  const onPrev = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    scrollFlow(-1);
  };

  const onNext = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    scrollFlow(1);
  };

  prev?.addEventListener('click', onPrev, true);
  next?.addEventListener('click', onNext, true);

  const intervalMs = Number.parseInt(slideshow.dataset.autoplayInterval || '5000', 10) || 5000;
  let timer;

  const stopAutoplay = () => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  const startAutoplay = () => {
    if (slideshow.dataset.autoplay !== 'true') return;

    stopAutoplay();
    timer = setInterval(() => {
      if (slideshow.matches(':hover') || document.hidden || isAnimating) return;
      scrollFlow(1);
    }, intervalMs);
  };

  slideshow.addEventListener('mouseenter', stopAutoplay);
  slideshow.addEventListener('mouseleave', startAutoplay);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  measureLoop();
  window.addEventListener('resize', measureLoop);
  scroller.addEventListener(
    'scroll',
    () => {
      if (!isAnimating) normalizeScroll(true);
    },
    { passive: true }
  );

  startAutoplay();
}

function initAllCustomerReviewsFlow() {
  document.querySelectorAll('.customer-reviews-carousel').forEach(initCustomerReviewsFlow);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAllCustomerReviewsFlow, { once: true });
} else {
  initAllCustomerReviewsFlow();
}

document.addEventListener('shopify:section:load', initAllCustomerReviewsFlow);
