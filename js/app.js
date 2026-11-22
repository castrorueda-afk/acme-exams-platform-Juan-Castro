(() => {
  'use strict';

  const view = document.getElementById('view');

  const HERO_INTERVAL = 3000;
  const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=70`;
  const HERO_IMAGES = [
    photo('photo-1523050854058-8df90110c9f1'),
    photo('photo-1522202176988-66273c2fd55f'),
    photo('photo-1509062522246-3755977927d7'),
    photo('photo-1427504494785-3a9ca7044f45')
  ];

  let heroTimer = null;
  const stopHero = () => { clearInterval(heroTimer); heroTimer = null; };

  const welcome = (el) => {
    el.innerHTML = `
      <section class="hero hero-carousel" aria-roledescription="carrusel" aria-label="Imágenes de Acme School">
        <div class="hero-slides" aria-hidden="true">
          ${HERO_IMAGES.map((url) => `<div class="hero-slide" style="background-image:url('${url}')"></div>`).join('')}
        </div>
        <div class="hero-inner">
          <span class="eyebrow">Acme School · Plataforma de exámenes</span>
          <h1>Evalúa, aprende y crece con Acme School</h1>
          <p>Una plataforma institucional para presentar exámenes en línea con resultados inmediatos y seguimiento académico para docentes.</p>
        </div>
        <div class="hero-dots">
          ${HERO_IMAGES.map((_, i) => `<button class="hero-dot" type="button" aria-label="Ir a la imagen ${i + 1}"></button>`).join('')}
        </div>
      </section>
      <div class="container"><role-selector></role-selector></div>`;
  };

  const startHero = (el) => {
    const hero = el.querySelector('.hero-carousel');
    const slides = [...el.querySelectorAll('.hero-slide')];
    const dots = [...el.querySelectorAll('.hero-dot')];
    const usable = slides.map(() => true);
    let current = 0;

    const show = (i) => {
      current = i;
      slides.forEach((s, k) => s.classList.toggle('active', k === i));
      dots.forEach((d, k) => {
        d.classList.toggle('active', k === i);
        d.setAttribute('aria-current', String(k === i));
      });
    };

    const next = () => {
      for (let step = 1; step <= slides.length; step++) {
        const i = (current + step) % slides.length;
        if (usable[i]) { show(i); return; }
      }
    };

    const restart = () => {
      stopHero();
      heroTimer = setInterval(() => {
        if (!hero.isConnected) stopHero();
        else next();
      }, HERO_INTERVAL);
    };

    HERO_IMAGES.forEach((url, i) => {
      const probe = new Image();
      probe.onerror = () => {
        usable[i] = false;
        dots[i].hidden = true;
        if (current === i) next();
      };
      probe.src = url;
    });

    dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); restart(); }));
    show(0);
    restart();
  };

  const routes = {
    '/':            { mount: (el) => { welcome(el); startHero(el); }, private: false },
    '/estudiante':  { mount: (el) => Student.mount(el), private: false },
    '/login':       { mount: (el) => Auth.renderLogin(el), private: false },
    '/usuarios':    { mount: (el) => Admin.mountUsers(el), private: true },
    '/examenes':    { mount: (el) => Admin.mountExams(el), private: true },
    '/resultados':  { mount: (el) => Admin.mountResults(el), private: true }
  };

  function router() {
    stopHero();
    const path = location.hash.slice(1) || '/';
    const route = routes[path];
    const user = Auth.current();

    if (!route) { location.hash = '#/'; return; }
    if (route.private && !user) { location.hash = '#/login'; return; }
    if (path === '/login' && user) { location.hash = '#/usuarios'; return; }

    view.replaceChildren();
    route.mount(view);
    window.scrollTo({ top: 0 });
    view.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', router);
  document.addEventListener('acme:auth', () => {
    const path = location.hash.slice(1) || '/';
    if (routes[path] && routes[path].private && !Auth.current()) router();
  });

  router();
})();
