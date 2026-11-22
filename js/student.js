(() => {
  'use strict';

  const { esc, fmtTime } = AcmeUtil;

  function mount(el) {
    let state = { view: 'catalog', exam: null, student: null, result: null };
    let finished = false;
    let startedAt = 0;

    const render = () => ({ catalog, exam: takeExam, result: showResult }[state.view])();

    function catalog() {
      el.innerHTML = `
        <section class="hero hero-sm">
          <div class="hero-inner">
            <span class="eyebrow">Zona de estudiantes</span>
            <h1>Exámenes disponibles</h1>
            <p>Elige tu examen, identifícate y demuestra lo que sabes. No necesitas contraseña.</p>
          </div>
        </section>
        <div class="container"><div class="cards"></div></div>`;
      const grid = el.querySelector('.cards');
      const exams = AcmeDB.exams.list();
      if (!exams.length) grid.innerHTML = '<p class="card empty">Aún no hay exámenes disponibles.</p>';
      exams.forEach((x) => {
        const card = document.createElement('exam-card');
        card.exam = x;
        grid.appendChild(card);
      });
      grid.addEventListener('exam-select', (e) => begin(e.detail.id));
      window.scrollTo({ top: 0 });
    }

    async function begin(id) {
      const exam = AcmeDB.exams.get(id);
      if (!exam) return;
      const R = AcmeValidate.rules;
      const items = [];
      let data = null;

      const pending = AcmeUI.dialog({
        title: 'Identificación del estudiante',
        okText: 'Comenzar examen',
        html: `
          <p class="muted">«${esc(exam.title)}» · ${exam.minutes} minutos. El tiempo inicia al pulsar «Comenzar examen». Todos los campos son obligatorios.</p>
          <label>Número de identificación
            <input id="st-id" inputmode="numeric" autocomplete="off" required placeholder="Solo números, mínimo 5 dígitos">
          </label>
          <label>Nombre completo
            <input id="st-name" autocomplete="name" required placeholder="Nombres y apellidos">
          </label>
          <label>Curso / Grado
            <input id="st-course" autocomplete="off" required placeholder="Ej: 10-A">
          </label>
          <label>Correo electrónico
            <input id="st-email" type="email" autocomplete="email" required placeholder="usuario@dominio.com">
          </label>`,
        validate: (body) => {
          if (!AcmeValidate.run(items)) return 'Revisa los campos marcados en rojo.';
          data = {
            id: body.querySelector('#st-id').value.trim(),
            name: body.querySelector('#st-name').value.trim(),
            course: body.querySelector('#st-course').value.trim(),
            email: body.querySelector('#st-email').value.trim()
          };
          return '';
        }
      });

      const body = document.querySelector('#am-body');
      items.push(
        { el: body.querySelector('#st-id'), rule: R.digits('El número de identificación', 5, 15) },
        { el: body.querySelector('#st-name'), rule: R.minLength('El nombre completo', 3) },
        { el: body.querySelector('#st-course'), rule: R.minLength('El curso o grado', 2) },
        { el: body.querySelector('#st-email'), rule: R.email('El correo electrónico') }
      );
      AcmeValidate.live(items);

      if (!(await pending)) return;
      state = { view: 'exam', exam, student: data, result: null };
      render();
    }

    function takeExam() {
      const { exam, student } = state;
      finished = false;
      el.innerHTML = `
        <div class="container">
          <header class="exam-head">
            <div>
              <h1>${esc(exam.title)}</h1>
              <p>${exam.questions.length} preguntas · Para aprobar: ${exam.passPercent}%</p>
              <p>Estudiante: <strong>${esc(student.name)}</strong> · ID ${esc(student.id)} · ${esc(student.course)}</p>
            </div>
            <exam-timer></exam-timer>
          </header>
          <form class="exam-body" novalidate>
            <ol>${exam.questions.map((q) => `
              <li class="question card">
                <fieldset>
                  <legend>${esc(q.text)}</legend>
                  ${q.answers.map((a) => `
                    <label class="option">
                      <input type="radio" name="q_${q.id}" value="${a.id}"> <span>${esc(a.text)}</span>
                    </label>`).join('')}
                </fieldset>
              </li>`).join('')}
            </ol>
            <button class="btn btn-amber btn-lg" type="submit">Terminar Examen</button>
          </form>
        </div>`;

      const timer = el.querySelector('exam-timer');
      const form = el.querySelector('form');
      timer.addEventListener('timeup', () => finish(form, timer, true));
      form.addEventListener('submit', (e) => { e.preventDefault(); finish(form, timer, false); });
      startedAt = Date.now();
      timer.start(exam.minutes * 60);
      window.scrollTo({ top: 0 });
    }

    async function finish(form, timer, auto) {
      if (finished) return;
      const { exam, student } = state;
      const answers = {};
      exam.questions.forEach((q) => {
        const sel = form.querySelector(`input[name="q_${q.id}"]:checked`);
        if (sel) answers[q.id] = sel.value;
      });

      if (!auto) {
        const missing = exam.questions.length - Object.keys(answers).length;
        const message = missing > 0
          ? `Tienes ${missing} pregunta(s) sin responder. ¿Deseas terminar el examen de todas formas?`
          : '¿Deseas terminar y enviar tu examen?';
        if (!(await AcmeUI.confirm(message, 'Terminar examen', 'Terminar'))) return;
      }
      if (finished) return;
      finished = true;
      timer.stop();

      const total = exam.questions.length;
      const correct = exam.questions.filter((q) => q.answers.find((a) => a.correct)?.id === answers[q.id]).length;
      const percent = Math.round((correct / total) * 1000) / 10;
      const seconds = auto ? exam.minutes * 60 : Math.min(exam.minutes * 60, Math.round((Date.now() - startedAt) / 1000));
      const result = {
        examId: exam.id, examCode: exam.code, examTitle: exam.title,
        studentId: student.id, studentName: student.name, course: student.course, email: student.email,
        correct, total, percent, passPercent: exam.passPercent,
        passed: percent >= exam.passPercent, seconds, auto, answers,
        date: new Date().toISOString()
      };
      AcmeDB.attempts.add(result);
      state.result = result;
      state.view = 'result';
      render();
    }

    function showResult() {
      const r = state.result;
      el.innerHTML = `
        <div class="container">
          <section class="card result">
            <span class="eyebrow">Resultado del examen</span>
            <h1>${esc(r.examTitle)}</h1>
            <p class="muted">${esc(r.studentName)} · ID ${esc(r.studentId)} · ${esc(r.course)}</p>
            ${r.auto ? '<p class="error">El tiempo se agotó y el examen se envió automáticamente.</p>' : ''}
            <div class="score">${r.percent}%</div>
            <div class="badge ${r.passed ? 'pass' : 'fail'}" role="status">${r.passed ? '✔ APROBÓ' : '✖ NO APROBÓ'}</div>
            <div class="result-grid">
              <div><strong>${r.correct} / ${r.total}</strong><span>Aciertos</span></div>
              <div><strong>${r.passPercent}%</strong><span>Mínimo para aprobar</span></div>
              <div><strong>${fmtTime(r.seconds)}</strong><span>Tiempo empleado</span></div>
            </div>
            <p class="muted">Tu resultado quedó registrado.</p>
            <button class="btn btn-lg" type="button" data-home>Volver al catálogo</button>
          </section>
        </div>`;
      el.querySelector('[data-home]').addEventListener('click', () => {
        state = { view: 'catalog', exam: null, student: null, result: null };
        render();
      });
      window.scrollTo({ top: 0 });
    }

    render();
  }

  window.Student = { mount };
})();
