(() => {
  'use strict';

  const login = (email, password) => AcmeDB.auth.login(email, password);
  const logout = () => {
    AcmeDB.auth.logout();
    document.dispatchEvent(new Event('acme:auth'));
  };
  const current = () => AcmeDB.auth.current();

  function renderLogin(el) {
    const demo = AcmeDB.users.list().slice(0, 2);
    el.innerHTML = `
      <div class="container">
        <section class="card auth-card">
          <h1>Acceso Docente / Administrativo</h1>
          <p class="muted">Ingresa con tu correo institucional y contraseña.</p>
          <form novalidate>
            <label>Correo electrónico
              <input type="email" name="email" autocomplete="username" required placeholder="usuario@dominio.com">
            </label>
            <label>Contraseña
              <input type="password" name="password" autocomplete="current-password" required>
            </label>
            <p class="error" role="alert" hidden></p>
            <button class="btn btn-lg" type="submit">Ingresar</button>
          </form>
          <p class="demo-note"><strong>Cuentas de prueba:</strong>
            ${demo.map((u) => `<br><code>${AcmeUtil.esc(u.email)}</code> / <code>${AcmeUtil.esc(u.password)}</code> (${AcmeUtil.esc(u.role)})`).join('')}
          </p>
        </section>
      </div>`;

    const form = el.querySelector('form');
    const error = el.querySelector('.error');
    const { email, password } = form.elements;
    const R = AcmeValidate.rules;
    const items = [
      { el: email, rule: R.email('El correo electrónico') },
      { el: password, rule: R.password('La contraseña', 4) }
    ];
    AcmeValidate.live(items);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      error.hidden = true;
      if (!AcmeValidate.run(items)) return;

      if (!login(email.value, password.value)) {
        error.textContent = 'Credenciales incorrectas. Inténtalo de nuevo.';
        error.hidden = false;
        AcmeValidate.mark(password, 'Correo o contraseña incorrectos.');
        AcmeValidate.fail(email, 'Revisa que tu correo esté bien escrito.');
        return;
      }
      document.dispatchEvent(new Event('acme:auth'));
      location.hash = '#/usuarios';
    });
  }

  window.Auth = { login, logout, current, renderLogin };
})();
