(() => {
  'use strict';

  const { esc, fmtTime, fmtDate } = AcmeUtil;
  const V = AcmeValidate;
  const R = V.rules;

  function mountUsers(el) {
    el.innerHTML = `
      <div class="container">
        <header class="page-head">
          <h1>Gestión de usuarios</h1>
          <p class="muted">Crea, edita y elimina docentes y personal administrativo.</p>
        </header>
        <form class="card form-grid" novalidate>
          <input type="hidden" name="id">
          <label>Número de identificación<input name="identification" inputmode="numeric" required></label>
          <label>Nombre completo<input name="fullName" required></label>
          <label>Email<input type="email" name="email" required></label>
          <label>Teléfono<input type="tel" name="phone" required></label>
          <label>Cargo
            <select name="role" required>
              <option value="">Selecciona…</option>
              <option value="Administrativo">Administrativo</option>
              <option value="Docente">Docente</option>
            </select>
          </label>
          <label>Contraseña<input type="password" name="password" autocomplete="new-password" required></label>
          <p class="error" role="alert" hidden></p>
          <div class="form-actions">
            <button class="btn" type="submit">Crear usuario</button>
            <button class="btn btn-ghost" type="reset">Cancelar</button>
          </div>
        </form>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Identificación</th><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Cargo</th><th>Acciones</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>`;

    const form = el.querySelector('form');
    const error = el.querySelector('.error');
    const submitBtn = el.querySelector('[type=submit]');
    const tbody = el.querySelector('tbody');
    const f = form.elements;

    const items = [
      { el: f.identification, rule: R.digits('El número de identificación', 5, 15) },
      { el: f.fullName, rule: R.minLength('El nombre completo', 3) },
      { el: f.email, rule: R.email('El email') },
      { el: f.phone, rule: R.phone('El teléfono') },
      { el: f.role, rule: R.selected('Selecciona un cargo.') },
      { el: f.password, rule: R.password('La contraseña', 4) }
    ];
    V.live(items);

    const renderTable = () => {
      const list = AcmeDB.users.list();
      tbody.innerHTML = list.length
        ? list.map((u) => `
          <tr>
            <td>${esc(u.identification)}</td><td>${esc(u.fullName)}</td><td>${esc(u.email)}</td>
            <td>${esc(u.phone)}</td><td><span class="chip">${esc(u.role)}</span></td>
            <td><div class="row-actions">
              <button class="btn btn-sm btn-ghost" data-act="edit" data-id="${u.id}">Editar</button>
              <button class="btn btn-sm btn-danger" data-act="del" data-id="${u.id}">Eliminar</button>
            </div></td>
          </tr>`).join('')
        : '<tr><td colspan="6" class="empty">No hay usuarios registrados.</td></tr>';
    };

    const save = () => {
      error.hidden = true;
      if (!V.run(items)) return;
      const data = {
        id: f.id.value || undefined,
        identification: f.identification.value.trim(),
        fullName: f.fullName.value.trim(),
        email: f.email.value.trim(),
        phone: f.phone.value.trim(),
        role: f.role.value,
        password: f.password.value
      };
      try { AcmeDB.users.save(data); }
      catch (err) {
        if (/identificaci/i.test(err.message)) return V.fail(f.identification, err.message);
        if (/correo/i.test(err.message)) return V.fail(f.email, err.message);
        error.textContent = err.message;
        error.hidden = false;
        return;
      }
      form.reset();
      renderTable();
    };

    const edit = (id) => {
      const u = AcmeDB.users.list().find((x) => x.id === id);
      if (!u) return;
      f.id.value = u.id;
      f.identification.value = u.identification;
      f.fullName.value = u.fullName;
      f.email.value = u.email;
      f.phone.value = u.phone;
      f.role.value = u.role;
      f.password.value = u.password;
      V.clearAll(form);
      submitBtn.textContent = 'Actualizar usuario';
      error.hidden = true;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      f.fullName.focus({ preventScroll: true });
    };

    const remove = async (id) => {
      const me = Auth.current();
      if (me && me.id === id) return AcmeUI.alert('No puedes eliminar tu propio usuario mientras tienes la sesión activa.');
      const u = AcmeDB.users.list().find((x) => x.id === id);
      if (!u) return;
      if (await AcmeUI.confirm(`¿Eliminar a "${u.fullName}"? Esta acción no se puede deshacer.`, 'Eliminar usuario', 'Eliminar', true)) {
        AcmeDB.users.remove(id);
        form.reset();
        renderTable();
      }
    };

    form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
    form.addEventListener('reset', () => {
      error.hidden = true;
      submitBtn.textContent = 'Crear usuario';
      V.clearAll(form);
    });
    tbody.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      b.dataset.act === 'edit' ? edit(b.dataset.id) : remove(b.dataset.id);
    });
    renderTable();
  }

  function mountExams(el) {
    let activeId = null;
    let editingQ = null;
    const subjectOptions = Object.entries(AcmeDB.subjects)
      .map(([k, s]) => `<option value="${k}">${esc(s.label)}</option>`).join('');

    el.innerHTML = `
      <div class="container">
        <header class="page-head">
          <h1>Gestión de exámenes</h1>
          <p class="muted">Administra exámenes y su banco de preguntas.</p>
        </header>
        <form class="card form-grid exam-form" novalidate>
          <input type="hidden" name="id">
          <label>Código<input name="code" required></label>
          <label>Título<input name="title" required></label>
          <label>Materia<select name="subject">${subjectOptions}</select></label>
          <label>Tiempo (minutos)<input type="number" name="minutes" min="1" max="600" required></label>
          <label>Porcentaje de aprobación (0-100)<input type="number" name="passPercent" min="0" max="100" required></label>
          <label class="full">Descripción<textarea name="description" rows="2" required></textarea></label>
          <p class="error" role="alert" hidden></p>
          <div class="form-actions">
            <button class="btn" type="submit">Crear examen</button>
            <button class="btn btn-ghost" type="reset">Cancelar</button>
          </div>
        </form>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Código</th><th>Título</th><th>Tiempo</th><th>% aprob.</th><th>Preguntas</th><th>Acciones</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="q-panel" hidden></div>
      </div>`;

    const form = el.querySelector('.exam-form');
    const error = form.querySelector('.error');
    const submitBtn = form.querySelector('[type=submit]');
    const tbody = el.querySelector('tbody');
    const panel = el.querySelector('.q-panel');
    const f = form.elements;

    const items = [
      { el: f.code, rule: R.minLength('El código', 2) },
      { el: f.title, rule: R.minLength('El título', 3) },
      { el: f.minutes, rule: R.integer('El tiempo', 1, 600) },
      { el: f.passPercent, rule: R.number('El porcentaje de aprobación', 0, 100) },
      { el: f.description, rule: R.minLength('La descripción', 5) }
    ];
    V.live(items);

    const renderTable = () => {
      const list = AcmeDB.exams.list();
      tbody.innerHTML = list.length
        ? list.map((x) => `
          <tr>
            <td><span class="subj">${AcmeIcon(x.subject, 18)}</span>${esc(x.code)}</td><td>${esc(x.title)}</td><td>${x.minutes} min</td>
            <td>${x.passPercent}%</td><td>${x.questions.length}</td>
            <td><div class="row-actions">
              <button class="btn btn-sm" data-act="questions" data-id="${x.id}">Preguntas</button>
              <button class="btn btn-sm btn-ghost" data-act="edit" data-id="${x.id}">Editar</button>
              <button class="btn btn-sm btn-danger" data-act="del" data-id="${x.id}">Eliminar</button>
            </div></td>
          </tr>`).join('')
        : '<tr><td colspan="6" class="empty">No hay exámenes registrados.</td></tr>';
    };

    const addAnswerRow = (text = '', checked = false, id = '') => {
      const row = document.createElement('div');
      row.className = 'answer-row';
      if (id) row.dataset.aid = id;
      row.innerHTML = `
        <input type="radio" name="correct" aria-label="Respuesta correcta" ${checked ? 'checked' : ''}>
        <input type="text" class="a-text" placeholder="Descripción de la respuesta" aria-label="Descripción de la respuesta">
        <button class="btn btn-sm btn-ghost" type="button" data-act="rm-answer" aria-label="Quitar respuesta">✕</button>`;
      const input = row.querySelector('.a-text');
      input.value = text;
      panel.querySelector('.answers').appendChild(row);
      V.live([{ el: input, rule: R.required('La descripción de la respuesta') }]);
    };

    const renderQuestions = () => {
      const exam = AcmeDB.exams.get(activeId);
      if (!exam) { panel.hidden = true; return; }
      panel.hidden = false;
      panel.innerHTML = `
        <div class="card">
          <div class="panel-head">
            <h2>Preguntas de «${esc(exam.title)}»</h2>
            <button class="btn btn-ghost btn-sm" type="button" data-act="close-q">Cerrar</button>
          </div>
          ${exam.questions.length ? `<ol class="q-list">${exam.questions.map((q) => `
            <li>
              <div>
                <strong>${esc(q.text)}</strong>
                <ul>${q.answers.map((a) => `<li class="${a.correct ? 'ok' : ''}">${a.correct ? '✓ ' : ''}${esc(a.text)}</li>`).join('')}</ul>
              </div>
              <div class="row-actions">
                <button class="btn btn-sm btn-ghost" type="button" data-act="edit-q" data-id="${q.id}">Editar</button>
                <button class="btn btn-sm btn-danger" type="button" data-act="del-q" data-id="${q.id}">Eliminar</button>
              </div>
            </li>`).join('')}</ol>` : '<p class="empty">Este examen aún no tiene preguntas.</p>'}

          <form class="q-form" novalidate>
            <h3>${editingQ ? 'Editar pregunta' : 'Nueva pregunta'}</h3>
            <label>Enunciado<textarea name="text" rows="2" required></textarea></label>
            <fieldset>
              <legend>Respuestas (marca la correcta)</legend>
              <div class="answers"></div>
              <button class="btn btn-ghost btn-sm" type="button" data-act="add-answer">+ Agregar respuesta</button>
            </fieldset>
            <p class="error" role="alert" hidden></p>
            <div class="form-actions">
              <button class="btn" type="submit">Guardar pregunta</button>
              ${editingQ ? '<button class="btn btn-ghost" type="button" data-act="cancel-q">Cancelar edición</button>' : ''}
            </div>
          </form>
        </div>`;

      const qf = panel.querySelector('.q-form');
      V.live([{ el: qf.elements.text, rule: R.minLength('El enunciado', 3) }]);
      const q = exam.questions.find((x) => x.id === editingQ);
      if (q) {
        qf.elements.text.value = q.text;
        q.answers.forEach((a) => addAnswerRow(a.text, a.correct, a.id));
      } else {
        for (let i = 0; i < 4; i++) addAnswerRow();
      }
    };

    const saveExam = () => {
      error.hidden = true;
      if (!V.run(items)) return;
      const data = {
        id: f.id.value || undefined,
        code: f.code.value.trim(),
        title: f.title.value.trim(),
        subject: f.subject.value,
        minutes: Number(f.minutes.value),
        passPercent: Number(f.passPercent.value),
        description: f.description.value.trim()
      };
      try { AcmeDB.exams.save(data); }
      catch (err) {
        if (/código/i.test(err.message)) return V.fail(f.code, err.message);
        error.textContent = err.message;
        error.hidden = false;
        return;
      }
      form.reset();
      renderTable();
      if (activeId) renderQuestions();
    };

    const editExam = (id) => {
      const x = AcmeDB.exams.get(id);
      if (!x) return;
      f.id.value = x.id; f.code.value = x.code; f.title.value = x.title; f.subject.value = x.subject;
      f.minutes.value = x.minutes; f.passPercent.value = x.passPercent; f.description.value = x.description;
      V.clearAll(form);
      submitBtn.textContent = 'Actualizar examen';
      error.hidden = true;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      f.title.focus({ preventScroll: true });
    };

    const removeExam = async (id) => {
      const x = AcmeDB.exams.get(id);
      if (!x) return;
      if (await AcmeUI.confirm(`¿Eliminar el examen "${x.title}" y todas sus preguntas?`, 'Eliminar examen', 'Eliminar', true)) {
        AcmeDB.exams.remove(id);
        if (activeId === id) { activeId = null; panel.hidden = true; }
        renderTable();
      }
    };

    const saveQuestion = () => {
      const qf = panel.querySelector('.q-form');
      const err = qf.querySelector('.error');
      err.hidden = true;
      const rows = [...qf.querySelectorAll('.answer-row')];
      const qItems = [
        { el: qf.elements.text, rule: R.minLength('El enunciado', 3) },
        ...rows.map((r) => ({ el: r.querySelector('.a-text'), rule: R.required('La descripción de la respuesta') }))
      ];
      if (!V.run(qItems)) return;

      const radios = rows.map((r) => r.querySelector('[type=radio]'));
      if (!radios.some((r) => r.checked)) {
        err.textContent = 'Marca cuál es la respuesta correcta.';
        err.hidden = false;
        radios[0].focus({ preventScroll: true });
        radios[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const payload = {
        id: editingQ || undefined,
        text: qf.elements.text.value,
        answers: rows.map((r) => ({
          id: r.dataset.aid || undefined,
          text: r.querySelector('.a-text').value,
          correct: r.querySelector('[type=radio]').checked
        }))
      };
      try { AcmeDB.exams.saveQuestion(activeId, payload); }
      catch (ex) { err.textContent = ex.message; err.hidden = false; return; }
      editingQ = null;
      renderQuestions();
      renderTable();
    };

    const removeQuestion = async (qId) => {
      if (await AcmeUI.confirm('¿Eliminar esta pregunta?', 'Eliminar pregunta', 'Eliminar', true)) {
        AcmeDB.exams.removeQuestion(activeId, qId);
        if (editingQ === qId) editingQ = null;
        renderQuestions();
        renderTable();
      }
    };

    form.addEventListener('submit', (e) => { e.preventDefault(); saveExam(); });
    form.addEventListener('reset', () => {
      error.hidden = true;
      submitBtn.textContent = 'Crear examen';
      V.clearAll(form);
    });
    tbody.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      if (b.dataset.act === 'edit') editExam(b.dataset.id);
      else if (b.dataset.act === 'del') removeExam(b.dataset.id);
      else {
        activeId = b.dataset.id;
        editingQ = null;
        renderQuestions();
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    panel.addEventListener('submit', (e) => { e.preventDefault(); saveQuestion(); });
    panel.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const err = panel.querySelector('.q-form .error');
      switch (b.dataset.act) {
        case 'close-q': activeId = null; panel.hidden = true; break;
        case 'add-answer': addAnswerRow(); break;
        case 'rm-answer':
          if (panel.querySelectorAll('.answer-row').length <= 2) {
            err.textContent = 'Cada pregunta necesita mínimo 2 respuestas.';
            err.hidden = false;
          } else b.closest('.answer-row').remove();
          break;
        case 'edit-q': editingQ = b.dataset.id; renderQuestions(); break;
        case 'cancel-q': editingQ = null; renderQuestions(); break;
        case 'del-q': removeQuestion(b.dataset.id); break;
      }
    });
    renderTable();
  }

  function mountResults(el) {
    const exams = AcmeDB.exams.list();
    el.innerHTML = `
      <div class="container">
        <header class="page-head">
          <h1>Resultados de estudiantes</h1>
          <p class="muted">Consulta los exámenes presentados y filtra por examen o estudiante.</p>
        </header>
        <div class="card filters">
          <label>Examen
            <select id="f-exam">
              <option value="">Todos los exámenes</option>
              ${exams.map((x) => `<option value="${x.id}">${esc(x.title)}</option>`).join('')}
            </select>
          </label>
          <label>Estudiante (nombre, identificación, curso o correo)
            <input id="f-student" type="search" placeholder="Buscar estudiante…">
          </label>
        </div>
        <div class="stats"></div>
        <div class="table-wrap">
          <table class="wide">
            <thead><tr><th>Identificación</th><th>Estudiante</th><th>Curso</th><th>Correo</th><th>Examen</th><th>Porcentaje</th><th>Estado</th><th>Tiempo</th><th>Fecha</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>`;

    const selExam = el.querySelector('#f-exam');
    const inpStudent = el.querySelector('#f-student');
    const tbody = el.querySelector('tbody');
    const stats = el.querySelector('.stats');

    const render = () => {
      const term = inpStudent.value.trim().toLowerCase();
      const list = AcmeDB.attempts.list()
        .filter((a) => !selExam.value || a.examId === selExam.value)
        .filter((a) => !term || [a.studentName, a.studentId, a.course, a.email]
          .some((v) => String(v ?? '').toLowerCase().includes(term)))
        .sort((a, b) => b.date.localeCompare(a.date));

      const passed = list.filter((a) => a.passed).length;
      const avg = list.length ? Math.round(list.reduce((s, a) => s + a.percent, 0) / list.length * 10) / 10 : 0;
      stats.innerHTML = `
        <div class="stat"><strong>${list.length}</strong><span>Exámenes presentados</span></div>
        <div class="stat"><strong>${passed}</strong><span>Aprobados</span></div>
        <div class="stat"><strong>${list.length - passed}</strong><span>Reprobados</span></div>
        <div class="stat"><strong>${avg}%</strong><span>Promedio</span></div>`;

      tbody.innerHTML = list.length
        ? list.map((a) => `
          <tr>
            <td>${esc(a.studentId)}</td>
            <td>${esc(a.studentName)}</td>
            <td>${esc(a.course || '—')}</td>
            <td>${esc(a.email || a.contact || '—')}</td>
            <td>${esc(a.examTitle)}</td>
            <td><strong>${a.percent}%</strong> <span class="muted">(${a.correct}/${a.total})</span></td>
            <td><span class="status ${a.passed ? 'pass' : 'fail'}">${a.passed ? 'Aprobado' : 'Reprobado'}</span></td>
            <td>${fmtTime(a.seconds)}${a.auto ? ' <span class="muted">(auto)</span>' : ''}</td>
            <td>${fmtDate(a.date)}</td>
          </tr>`).join('')
        : '<tr><td colspan="9" class="empty">No hay resultados para los filtros seleccionados.</td></tr>';
    };

    selExam.addEventListener('change', render);
    inpStudent.addEventListener('input', render);
    render();
  }

  window.Admin = { mountUsers, mountExams, mountResults };
})();
