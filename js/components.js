(() => {
  'use strict';

  const SVG = {
    general: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    biologia: '<path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14z"/><path d="M5 19L14 10"/>',
    matematicas: '<path d="M5 7h6M8 4v6M13 8h6M5 17h6M13 14l6 6M19 14l-6 6"/>',
    lengua: '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
    fisica: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)"/>',
    student: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v6"/>',
    teacher: '<rect x="3" y="4" width="18" height="11" rx="1.5"/><path d="M8 20h8M12 15v5M7 9h5M7 12h8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };

  window.AcmeIcon = (key, size = 24) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[key] || SVG.general}</svg>`;

  class AcmeModal extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <div class="modal-backdrop" hidden>
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="am-title">
            <h2 id="am-title"></h2>
            <div class="modal-body" id="am-body"></div>
            <p class="error" id="am-err" role="alert" hidden></p>
            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" data-cancel></button>
              <button type="button" class="btn" data-ok></button>
            </div>
          </div>
        </div>`;
      this.backdrop = this.querySelector('.modal-backdrop');
    }

    open({ title, html = '', message = '', okText = 'Aceptar', cancelText = 'Cancelar', showCancel = true, danger = false, validate = null }) {
      return new Promise((resolve) => {
        const previous = document.activeElement;
        const ok = this.querySelector('[data-ok]');
        const cancel = this.querySelector('[data-cancel]');
        const body = this.querySelector('#am-body');
        const err = this.querySelector('#am-err');
        this.querySelector('#am-title').textContent = title;
        body.innerHTML = html || `<p>${AcmeUtil.esc(message)}</p>`;
        err.hidden = true;
        ok.textContent = okText;
        cancel.textContent = cancelText;
        cancel.hidden = !showCancel;
        ok.className = 'btn' + (danger ? ' btn-danger' : '');
        this.backdrop.hidden = false;
        (body.querySelector('input, select, textarea') || ok).focus();

        const done = (value) => {
          this.backdrop.hidden = true;
          document.removeEventListener('keydown', onKey);
          ok.onclick = cancel.onclick = null;
          body.innerHTML = '';
          if (previous && previous.focus) previous.focus();
          resolve(value);
        };
        const onKey = (e) => {
          if (e.key === 'Escape') done(false);
          else if (e.key === 'Enter' && e.target.matches && e.target.matches('input')) { e.preventDefault(); ok.click(); }
        };
        document.addEventListener('keydown', onKey);
        ok.onclick = () => {
          if (validate) {
            const msg = validate(body);
            if (msg) { err.textContent = msg; err.hidden = false; return; }
          }
          done(true);
        };
        cancel.onclick = () => done(false);
      });
    }
  }
  customElements.define('acme-modal', AcmeModal);

  const modal = () => document.querySelector('acme-modal');
  window.AcmeUI = {
    confirm: (message, title = 'Confirmar acción', okText = 'Aceptar', danger = false) =>
      modal().open({ title, message, okText, danger }),
    alert: (message, title = 'Aviso') => modal().open({ title, message, showCancel: false }),
    dialog: (options) => modal().open(options)
  };

  class AcmeNavbar extends HTMLElement {
    connectedCallback() {
      this._refresh = () => this.render();
      document.addEventListener('acme:auth', this._refresh);
      window.addEventListener('hashchange', this._refresh);
      this.render();
    }
    disconnectedCallback() {
      document.removeEventListener('acme:auth', this._refresh);
      window.removeEventListener('hashchange', this._refresh);
    }
    render() {
      const user = AcmeDB.auth.current();
      const here = location.hash.slice(1) || '/';
      const link = (path, label) =>
        `<li><a href="#${path}" ${here === path ? 'aria-current="page"' : ''}>${label}</a></li>`;
      const initial = user ? AcmeUtil.esc(user.fullName.trim().charAt(0).toUpperCase()) : '';

      this.innerHTML = `
        <nav class="navbar" aria-label="Principal">
          <a class="brand" href="#/"><span class="brand-mark">${AcmeIcon('student', 22)}</span><span>Acme <strong>School</strong></span></a>
          <button class="burger" aria-label="Abrir menú" aria-expanded="false">☰</button>
          <ul class="nav-links">
            ${user
              ? `${link('/estudiante', 'Vista estudiante')}
                 ${link('/usuarios', 'Usuarios')}
                 ${link('/examenes', 'Exámenes')}
                 ${link('/resultados', 'Resultados')}
                 <li class="nav-user"><span class="avatar">${initial}</span>${AcmeUtil.esc(user.fullName)}</li>
                 <li><button type="button" data-logout>Cerrar sesión</button></li>`
              : `${link('/', 'Inicio')}
                 ${link('/estudiante', 'Estudiante')}
                 ${link('/login', 'Docente')}`}
          </ul>
        </nav>`;

      const nav = this.querySelector('.navbar');
      const burger = this.querySelector('.burger');
      burger.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        burger.setAttribute('aria-expanded', open);
      });
      const out = this.querySelector('[data-logout]');
      if (out) out.addEventListener('click', () => {
        AcmeDB.auth.logout();
        document.dispatchEvent(new Event('acme:auth'));
        location.hash = '#/';
      });
    }
  }
  customElements.define('acme-navbar', AcmeNavbar);

  class RoleSelector extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <div class="roles">
          <article class="role-card student">
            <div class="role-avatar">${AcmeIcon('student', 44)}</div>
            <h2>Soy Estudiante</h2>
            <p class="muted">Presenta tus exámenes de forma rápida y sencilla.</p>
            <ul class="role-points">
              <li>Acceso público, sin contraseña</li>
              <li>Catálogo de exámenes disponibles</li>
              <li>Resultado inmediato al terminar</li>
            </ul>
            <a class="btn btn-lg" href="#/estudiante">Entrar como estudiante</a>
          </article>
          <article class="role-card teacher">
            <div class="role-avatar">${AcmeIcon('teacher', 44)}</div>
            <h2>Soy Docente / Administrativo</h2>
            <p class="muted">Gestiona usuarios, exámenes y consulta resultados.</p>
            <ul class="role-points">
              <li>Acceso privado con correo y contraseña</li>
              <li>CRUD de usuarios, exámenes y preguntas</li>
              <li>Panel de resultados de estudiantes</li>
            </ul>
            <a class="btn btn-amber btn-lg" href="#/login">Iniciar sesión</a>
          </article>
        </div>`;
    }
  }
  customElements.define('role-selector', RoleSelector);

  class ExamCard extends HTMLElement {
    set exam(value) { this._exam = value; this.render(); }
    get exam() { return this._exam; }
    connectedCallback() { this.render(); }
    render() {
      const e = this._exam;
      if (!e || !this.isConnected) return;
      const esc = AcmeUtil.esc;
      const s = AcmeDB.subjects[e.subject] || AcmeDB.subjects.general;
      this.innerHTML = `
        <article class="exam-card">
          <div class="cover" style="--c1:${s.c1};--c2:${s.c2}">
            <img src="${s.cover}" alt="" loading="lazy" onerror="this.remove()">
            <span class="cover-icon">${AcmeIcon(e.subject, 44)}</span>
            <span class="cover-tag">${esc(s.label)}</span>
          </div>
          <div class="exam-body-card">
            <h3>${esc(e.title)}</h3>
            <p>${esc(e.description)}</p>
            <div class="meta">
              <span class="chip">⏱ ${e.minutes} min</span>
              <span class="chip">✅ Aprueba con ${e.passPercent}%</span>
              <span class="chip">📝 ${e.questions.length} preguntas</span>
            </div>
            <button class="btn" type="button" ${e.questions.length ? '' : 'disabled'}>
              ${e.questions.length ? 'Presentar Examen' : 'Sin preguntas'}
            </button>
          </div>
        </article>`;
      this.querySelector('button').addEventListener('click', () =>
        this.dispatchEvent(new CustomEvent('exam-select', { bubbles: true, detail: { id: e.id } })));
    }
  }
  customElements.define('exam-card', ExamCard);

  class ExamTimer extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; }
          .t { display: flex; align-items: center; gap: .5rem; font: 700 1.9rem/1 ui-monospace, "SF Mono", Consolas, monospace; padding: .55rem 1.1rem; border-radius: 12px; background: #e0eaff; color: #0f294a; transition: background .3s, color .3s; }
          .t small { font: 600 .7rem system-ui, sans-serif; text-transform: uppercase; letter-spacing: .06em; opacity: .7; }
          .t.warn { background: #fee2e2; color: #b91c1c; animation: pulse 1s infinite; }
          @keyframes pulse { 50% { opacity: .65; } }
        </style>
        <div class="t" role="timer" aria-label="Tiempo restante"><small>Tiempo</small><span id="d">00:00</span></div>`;
      this.box = this.shadowRoot.querySelector('.t');
      this.out = this.shadowRoot.querySelector('#d');
      this._id = null;
      this._total = 0;
    }
    start(seconds) {
      this.stop();
      this._total = seconds;
      this._end = Date.now() + seconds * 1000;
      this._tick();
      this._id = setInterval(() => this._tick(), 250);
    }
    stop() { clearInterval(this._id); this._id = null; }
    get remaining() { return Math.max(0, Math.ceil((this._end - Date.now()) / 1000)); }
    get elapsed() { return Math.min(this._total, this._total - this.remaining); }
    _tick() {
      const left = this.remaining;
      this.out.textContent = AcmeUtil.fmtTime(left);
      this.box.classList.toggle('warn', left < 60);
      if (left <= 0) {
        this.stop();
        this.dispatchEvent(new CustomEvent('timeup', { bubbles: true }));
      }
    }
    disconnectedCallback() { this.stop(); }
  }
  customElements.define('exam-timer', ExamTimer);
})();
