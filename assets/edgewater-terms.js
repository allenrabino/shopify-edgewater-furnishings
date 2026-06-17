/**
 * Terms page: language toggle, table of contents, accordion deep links, back to top.
 */
class EdgewaterTerms extends HTMLElement {
  /** @type {AbortController | null} */
  #controller = null;

  /** @type {string} */
  #activeLanguage = 'en';

  connectedCallback() {
    this.#controller = new AbortController();
    const { signal } = this.#controller;

    this.#activeLanguage = this.dataset.defaultLanguage || 'en';

    if (this.querySelector('.edgewater-terms__content--legacy')) {
      this.#upgradeLegacyContent();
    }

    this.#setLanguage(this.#activeLanguage, false);
    this.#buildToc();
    this.#openFromHash();

    this.querySelectorAll('.edgewater-terms__lang-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const lang = button.dataset.language;
        if (lang) this.#setLanguage(lang, true);
      }, { signal });
    });

    this.querySelectorAll('.edgewater-terms__item').forEach((details) => {
      details.addEventListener('toggle', () => this.#handleToggle(details), { signal });
    });

    const backTop = this.querySelector('[data-back-top]');
    backTop?.addEventListener('click', () => {
      this.querySelector('.edgewater-terms__header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, { signal });

    window.addEventListener('hashchange', () => this.#openFromHash(), { signal });
    window.addEventListener('scroll', () => this.#updateBackTop(), { signal, passive: true });
    this.#updateBackTop();
  }

  disconnectedCallback() {
    this.#controller?.abort();
    this.#controller = null;
  }

  /** @param {string} language @param {boolean} updateHash */
  #setLanguage(language, updateHash) {
    this.#activeLanguage = language;

    this.querySelectorAll('[data-language-panel]').forEach((panel) => {
      const isActive = panel.dataset.languagePanel === language;
      panel.hidden = !isActive;
    });

    this.querySelectorAll('.edgewater-terms__lang-btn').forEach((button) => {
      const isActive = button.dataset.language === language;
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.classList.toggle('is-active', isActive);
    });

    this.#buildToc();

    if (updateHash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  #buildToc() {
    const toc = this.querySelector('[data-toc]');
    if (!(toc instanceof HTMLElement)) return;

    toc.innerHTML = '';

    const panel = this.querySelector(`[data-language-panel="${this.#activeLanguage}"]`);
    if (!panel) return;

    panel.querySelectorAll('.edgewater-terms__item').forEach((details) => {
      if (!(details instanceof HTMLDetailsElement)) return;

      const number = details.dataset.sectionNumber || '';
      const title = details.querySelector('.edgewater-terms__section-title')?.textContent?.trim() || '';
      const id = details.id;
      if (!id || !title) return;

      const link = document.createElement('a');
      link.className = 'edgewater-terms__toc-link';
      link.href = `#${id}`;
      link.textContent = `${number}. ${title}`;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        this.#openSection(details);
      });

      toc.appendChild(link);
    });
  }

  /** @param {HTMLDetailsElement} details */
  #openSection(details) {
    const language = details.dataset.language;
    if (language && language !== this.#activeLanguage) {
      this.#setLanguage(language, false);
    }

    this.querySelectorAll('.edgewater-terms__item[open]').forEach((item) => {
      item.open = false;
    });

    details.open = true;

    if (details.id) {
      history.replaceState(null, '', `#${details.id}`);
    }

    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.#setActiveTocLink(details.id);
  }

  /** @param {HTMLDetailsElement} details */
  #handleToggle(details) {
    if (!details.open) return;

    this.querySelectorAll('.edgewater-terms__item[open]').forEach((openItem) => {
      if (openItem !== details) openItem.open = false;
    });

    if (details.id) {
      history.replaceState(null, '', `#${details.id}`);
      this.#setActiveTocLink(details.id);
    }
  }

  /** @param {string} id */
  #setActiveTocLink(id) {
    this.querySelectorAll('.edgewater-terms__toc-link').forEach((link) => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
    });
  }

  #openFromHash() {
    const id = window.location.hash.replace('#', '');
    if (!id) return;

    const target = this.querySelector(`#${CSS.escape(id)}`);
    if (!(target instanceof HTMLDetailsElement)) return;

    this.#openSection(target);
  }

  #updateBackTop() {
    const backTop = this.querySelector('[data-back-top]');
    if (!(backTop instanceof HTMLElement)) return;

    backTop.hidden = window.scrollY < 480;
  }

  #upgradeLegacyContent() {
    const legacy = this.querySelector('.edgewater-terms__content--legacy');
    if (!(legacy instanceof HTMLElement)) return;

    const layout = document.createElement('div');
    layout.className = 'edgewater-terms__layout';

    const tocWrap = document.createElement('aside');
    tocWrap.className = 'edgewater-terms__toc-wrap';
    tocWrap.setAttribute('aria-label', 'Table of contents');
    tocWrap.innerHTML = `
      <div class="edgewater-terms__toc-card">
        <p class="edgewater-terms__toc-heading">On this page</p>
        <nav class="edgewater-terms__toc" data-toc></nav>
      </div>
    `;

    const panels = document.createElement('div');
    panels.className = 'edgewater-terms__panels';

    legacy.querySelectorAll('.edgewater-terms__language').forEach((languageBlock) => {
      const language = languageBlock.classList.contains('edgewater-terms__language--fr') ? 'fr' : 'en';
      const panel = document.createElement('div');
      panel.className = 'edgewater-terms__panel';
      panel.dataset.languagePanel = language;
      panel.setAttribute('role', 'tabpanel');
      panel.hidden = true;

      const intro = document.createElement('div');
      intro.className = 'edgewater-terms__panel-intro';

      languageBlock.querySelectorAll(':scope > h2, :scope > p, :scope > .edgewater-terms__notice').forEach((node) => {
        intro.appendChild(node.cloneNode(true));
      });

      const sections = document.createElement('div');
      sections.className = 'edgewater-terms__sections';

      languageBlock.querySelectorAll('.edgewater-terms__section').forEach((section) => {
        const heading = section.querySelector('.edgewater-terms__section-heading');
        if (!heading) return;

        const headingText = heading.textContent?.trim() || '';
        const match = headingText.match(/^(\d+)\.\s*(.+)$/);
        const number = match?.[1] || '';
        const title = match?.[2] || headingText;
        const id = `terms-${language}-${number}`;

        const accordion = document.createElement('accordion-custom');
        accordion.className = 'edgewater-terms__accordion accordion--caret';

        const details = document.createElement('details');
        details.className = 'details edgewater-terms__item';
        details.id = id;
        details.dataset.language = language;
        details.dataset.sectionNumber = number;

        const summary = document.createElement('summary');
        summary.className = 'details__header edgewater-terms__summary';
        summary.innerHTML = `
          <span class="edgewater-terms__summary-label">
            <span class="edgewater-terms__section-num">${number}.</span>
            <span class="edgewater-terms__section-title">${title}</span>
          </span>
          <span class="svg-wrapper icon-caret icon-animated" aria-hidden="true"></span>
        `;

        const body = document.createElement('div');
        body.className = 'details-content edgewater-terms__body rte';
        section.querySelectorAll('p').forEach((paragraph) => {
          body.appendChild(paragraph.cloneNode(true));
        });

        details.append(summary, body);
        accordion.appendChild(details);
        sections.appendChild(accordion);
      });

      panel.append(intro, sections);
      panels.appendChild(panel);
    });

    layout.append(tocWrap, panels);
    legacy.replaceChildren(layout);

    const langSwitch = document.createElement('div');
    langSwitch.className = 'edgewater-terms__lang-switch';
    langSwitch.setAttribute('role', 'tablist');
    langSwitch.setAttribute('aria-label', 'Document language');
    langSwitch.innerHTML = `
      <button type="button" class="edgewater-terms__lang-btn" role="tab" data-language="en">English</button>
      <button type="button" class="edgewater-terms__lang-btn" role="tab" data-language="fr">Francais</button>
    `;

    const inner = this.querySelector('.edgewater-terms__inner');
    const header = inner?.querySelector('.edgewater-terms__header');
    if (inner && header) {
      header.insertAdjacentElement('afterend', langSwitch);
    } else if (inner) {
      inner.prepend(langSwitch);
    }

    const backTop = document.createElement('button');
    backTop.type = 'button';
    backTop.className = 'edgewater-terms__back-top';
    backTop.dataset.backTop = '';
    backTop.hidden = true;
    backTop.textContent = 'Back to top';
    inner?.appendChild(backTop);
  }
}

if (!customElements.get('edgewater-terms')) {
  customElements.define('edgewater-terms', EdgewaterTerms);
}
