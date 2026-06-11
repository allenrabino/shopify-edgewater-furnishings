/**
 * Edgewater custom date picker for showroom booking forms.
 */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDisplayDate(date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatSubmitDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

class EdgewaterDatePicker {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.display = root.querySelector('[data-date-display]');
    this.hidden = root.querySelector('[data-date-value]');
    this.calendar = root.querySelector('[data-date-calendar]');
    this.monthLabel = root.querySelector('[data-date-month]');
    this.grid = root.querySelector('[data-date-grid]');
    this.trigger = root.querySelector('[data-date-trigger]');
    this.clearButton = root.querySelector('[data-date-clear]');
    this.todayButton = root.querySelector('[data-date-today]');
    this.prevButton = root.querySelector('[data-date-prev]');
    this.nextButton = root.querySelector('[data-date-next]');

    this.minDate = startOfDay(new Date());
    this.viewDate = new Date(this.minDate);
    this.selectedDate = null;
    this.isOpen = false;

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.trigger?.addEventListener('click', () => this.toggle());
    this.display?.addEventListener('click', () => this.open());
    this.display?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.open();
      }
    });

    this.prevButton?.addEventListener('click', () => this.changeMonth(-1));
    this.nextButton?.addEventListener('click', () => this.changeMonth(1));
    this.clearButton?.addEventListener('click', () => this.clear());
    this.todayButton?.addEventListener('click', () => this.selectToday());

    document.addEventListener('click', (event) => {
      if (!this.isOpen) return;
      if (!(event.target instanceof Node) || !this.root.contains(event.target)) {
        this.close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.calendar?.removeAttribute('hidden');
    this.trigger?.setAttribute('aria-expanded', 'true');
    this.render();
  }

  close() {
    this.isOpen = false;
    this.calendar?.setAttribute('hidden', '');
    this.trigger?.setAttribute('aria-expanded', 'false');
  }

  changeMonth(offset) {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + offset, 1);
    this.render();
  }

  clear() {
    this.selectedDate = null;
    if (this.display) this.display.value = '';
    if (this.hidden) this.hidden.value = '';
    this.render();
    this.close();
  }

  selectToday() {
    this.selectDate(startOfDay(new Date()));
  }

  /** @param {Date} date */
  selectDate(date) {
    if (date < this.minDate) return;

    this.selectedDate = date;
    this.viewDate = new Date(date.getFullYear(), date.getMonth(), 1);

    if (this.display) this.display.value = formatDisplayDate(date);
    if (this.hidden) this.hidden.value = formatSubmitDate(date);

    this.render();
    this.close();
  }

  render() {
    if (!this.grid || !this.monthLabel) return;

    this.monthLabel.textContent = `${MONTHS[this.viewDate.getMonth()]} ${this.viewDate.getFullYear()}`;
    this.grid.innerHTML = '';

    const firstOfMonth = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 0).getDate();
    const today = startOfDay(new Date());

    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    for (let index = 0; index < totalCells; index += 1) {
      const dayNumber = index - startOffset + 1;
      const cellDate =
        dayNumber < 1 || dayNumber > daysInMonth
          ? null
          : new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), dayNumber);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'edgewater-date-picker__day';

      if (!cellDate) {
        button.classList.add('edgewater-date-picker__day--empty');
        button.disabled = true;
        button.tabIndex = -1;
        button.textContent = '';
      } else {
        const normalized = startOfDay(cellDate);
        button.textContent = String(cellDate.getDate());
        button.dataset.date = formatSubmitDate(normalized);

        if (normalized < this.minDate) {
          button.disabled = true;
          button.classList.add('edgewater-date-picker__day--disabled');
        }

        if (isSameDay(normalized, today)) {
          button.classList.add('edgewater-date-picker__day--today');
        }

        if (this.selectedDate && isSameDay(normalized, this.selectedDate)) {
          button.classList.add('edgewater-date-picker__day--selected');
          button.setAttribute('aria-pressed', 'true');
        }

        button.addEventListener('click', () => this.selectDate(normalized));
      }

      this.grid.appendChild(button);
    }
  }
}

function initEdgewaterDatePickers(scope = document) {
  scope.querySelectorAll('[data-edgewater-date-picker]').forEach((root) => {
    if (!(root instanceof HTMLElement) || root.dataset.datePickerInit === 'true') return;
    root.dataset.datePickerInit = 'true';
    new EdgewaterDatePicker(root);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initEdgewaterDatePickers(), { once: true });
} else {
  initEdgewaterDatePickers();
}

document.addEventListener('shopify:section:load', (event) => {
  if (event.target instanceof HTMLElement) {
    initEdgewaterDatePickers(event.target);
  }
});
