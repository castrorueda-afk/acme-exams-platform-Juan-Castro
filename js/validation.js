(() => {
  'use strict';

  let seq = 0;
  const text = (v) => String(v ?? '').trim();

  const hint = (el) => {
    if (!el._acmeHint) {
      const small = document.createElement('small');
      small.className = 'field-msg';
      small.id = 'field-msg-' + (++seq);
      small.setAttribute('aria-live', 'polite');
      small.hidden = true;
      el.insertAdjacentElement('afterend', small);
      el._acmeHint = small;
    }
    return el._acmeHint;
  };

  function mark(el, message) {
    const small = hint(el);
    const invalid = !!message;
    el.classList.toggle('is-invalid', invalid);
    el.classList.toggle('is-valid', !invalid);
    el.setAttribute('aria-invalid', String(invalid));
    small.textContent = message || '';
    small.hidden = !invalid;
    if (invalid) el.setAttribute('aria-describedby', small.id);
    else el.removeAttribute('aria-describedby');
    return !invalid;
  }

  function flag(el) {
    const small = hint(el);
    el.classList.remove('is-valid');
    el.classList.add('is-invalid');
    el.setAttribute('aria-invalid', 'true');
    small.hidden = true;
  }

  function clear(el) {
    el.classList.remove('is-valid', 'is-invalid');
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
    if (el._acmeHint) {
      el._acmeHint.textContent = '';
      el._acmeHint.hidden = true;
    }
  }

  const clearAll = (scope) => scope.querySelectorAll('.is-valid, .is-invalid').forEach(clear);

  const goTo = (el) => {
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const fail = (el, message) => {
    mark(el, message);
    goTo(el);
  };

  const check = (item) => mark(item.el, item.rule(item.el.value, item.el) || '');

  function live(items) {
    items.forEach((item) => {
      const evt = item.el.tagName === 'SELECT' ? 'change' : 'input';
      item.el.addEventListener(evt, () => check(item));
      item.el.addEventListener('blur', () => check(item));
    });
  }

  function run(items) {
    let first = null;
    items.forEach((item) => {
      if (!check(item) && !first) first = item.el;
    });
    if (first) goTo(first);
    return !first;
  }

  const rules = {
    required: (label) => (v) => (text(v) ? '' : `${label} es obligatorio.`),

    minLength: (label, n) => (v) => {
      const t = text(v);
      if (!t) return `${label} es obligatorio.`;
      return t.length >= n ? '' : `${label} debe tener al menos ${n} caracteres.`;
    },

    digits: (label, min, max = 15) => (v) => {
      const t = text(v);
      if (!t) return `${label} es obligatorio.`;
      if (!/^\d+$/.test(t)) return `${label} solo debe contener números, sin puntos ni espacios.`;
      if (t.length < min) return `${label} debe tener mínimo ${min} dígitos.`;
      return t.length > max ? `${label} no puede superar ${max} dígitos.` : '';
    },

    email: (label) => (v) => {
      const t = text(v);
      if (!t) return `${label} es obligatorio.`;
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)
        ? ''
        : 'Escribe un correo válido, por ejemplo usuario@dominio.com.';
    },

    phone: (label) => (v) => {
      const t = text(v);
      if (!t) return `${label} es obligatorio.`;
      return /^[0-9+\s-]{7,15}$/.test(t)
        ? ''
        : `${label} debe tener entre 7 y 15 caracteres (números, +, espacios o guiones).`;
    },

    password: (label, min) => (v) => {
      if (!v) return `${label} es obligatoria.`;
      return v.length >= min ? '' : `${label} debe tener al menos ${min} caracteres.`;
    },

    integer: (label, min, max) => (v) => {
      const t = text(v);
      if (!t) return `${label} es obligatorio.`;
      if (!/^-?\d+$/.test(t)) return `${label} debe ser un número entero.`;
      const n = Number(t);
      return n >= min && n <= max ? '' : `${label} debe estar entre ${min} y ${max}.`;
    },

    number: (label, min, max) => (v) => {
      const t = text(v);
      if (!t) return `${label} es obligatorio.`;
      const n = Number(t);
      if (!Number.isFinite(n)) return `${label} debe ser un número.`;
      return n >= min && n <= max ? '' : `${label} debe estar entre ${min} y ${max}.`;
    },

    selected: (message) => (v) => (v ? '' : message)
  };

  window.AcmeValidate = { rules, mark, flag, clear, clearAll, fail, run, live };
})();
