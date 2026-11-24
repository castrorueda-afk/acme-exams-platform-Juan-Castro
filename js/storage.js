(() => {
  'use strict';

  const KEYS = {
    users: 'acme_users',
    exams: 'acme_exams',
    attempts: 'acme_attempts',
    session: 'acme_session',
    version: 'acme_version'
  };
  const VERSION = '2';

  const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=60`;
  const SUBJECTS = {
    general: { label: 'Cultura General', c1: '#0f294a', c2: '#1d4ed8', cover: photo('photo-1503676260728-1c00da094a0b') },
    biologia: { label: 'Biología', c1: '#065f46', c2: '#10b981', cover: photo('photo-1532187863486-abf9dbad1b69') },
    matematicas: { label: 'Matemáticas', c1: '#4c1d95', c2: '#7c3aed', cover: photo('photo-1635070041078-e363dbe005cb') },
    lengua: { label: 'Lengua Castellana', c1: '#9a3412', c2: '#d97706', cover: photo('photo-1457369804613-52c61a468e7d') },
    fisica: { label: 'Física', c1: '#0c4a6e', c2: '#0ea5e9', cover: photo('photo-1636466497217-26a8cbeaf0aa') }
  };

  const read = (key, fallback = []) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const uid = () => (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = (sec) => {
    const s = Math.max(0, Math.round(sec));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };
  const fmtDate = (iso) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

  const q = (text, options, correct) => ({
    id: uid(),
    text,
    answers: options.map((t, i) => ({ id: uid(), text: t, correct: i === correct }))
  });

  const buildSeed = () => ({
    users: [
      { id: uid(), identification: '1000000001', fullName: 'Administrador Acme', email: 'admin@acme.edu.co', phone: '3001234567', role: 'Administrativo', password: '123456' },
      { id: uid(), identification: '1000000002', fullName: 'Docente Acme', email: 'docente@acme.edu.co', phone: '3109876543', role: 'Docente', password: '123456' }
    ],
    exams: [
      {
        id: uid(), code: 'CG-001', subject: 'general', title: 'Cultura General', minutes: 10, passPercent: 60,
        description: 'Preguntas básicas de geografía, arte y conocimiento del mundo.',
        questions: [
          q('¿Cuál es la capital de Colombia?', ['Medellín', 'Bogotá', 'Cali', 'Barranquilla'], 1),
          q('¿Cuál es el océano más grande del planeta?', ['Atlántico', 'Índico', 'Pacífico', 'Ártico'], 2),
          q('¿Quién pintó La Mona Lisa?', ['Vincent van Gogh', 'Leonardo da Vinci', 'Pablo Picasso', 'Miguel Ángel'], 1),
          q('¿Qué continente tiene más países?', ['Asia', 'Europa', 'África', 'América'], 2),
          q('¿Cuál es el idioma con más hablantes nativos?', ['Inglés', 'Español', 'Mandarín', 'Hindi'], 2)
        ]
      },
      {
        id: uid(), code: 'BIO-101', subject: 'biologia', title: 'Biología', minutes: 10, passPercent: 60,
        description: 'Célula, genética y seres vivos: conceptos fundamentales de la vida.',
        questions: [
          q('¿Qué orgánulo realiza la fotosíntesis?', ['Mitocondria', 'Cloroplasto', 'Ribosoma', 'Núcleo'], 1),
          q('¿Qué molécula almacena la información genética?', ['Glucosa', 'ADN', 'ATP', 'Lípido'], 1),
          q('¿Cuál es la unidad básica de la vida?', ['Átomo', 'Órgano', 'Célula', 'Tejido'], 2),
          q('¿Qué gas absorben las plantas para la fotosíntesis?', ['Oxígeno', 'Nitrógeno', 'Dióxido de carbono', 'Hidrógeno'], 2),
          q('¿Qué caracteriza a los mamíferos?', ['Ponen huevos', 'Tienen glándulas mamarias', 'Respiran por branquias', 'Son de sangre fría'], 1)
        ]
      },
      {
        id: uid(), code: 'MAT-101', subject: 'matematicas', title: 'Matemáticas', minutes: 15, passPercent: 70,
        description: 'Operaciones, porcentajes, álgebra básica y geometría.',
        questions: [
          q('¿Cuánto es 12 × 8?', ['86', '96', '108', '94'], 1),
          q('¿Cuál es la raíz cuadrada de 144?', ['10', '11', '12', '14'], 2),
          q('¿Cuánto es el 25% de 200?', ['25', '50', '75', '100'], 1),
          q('Si 3x + 5 = 20, ¿cuánto vale x?', ['3', '5', '7', '15'], 1),
          q('¿Cuánto suman los ángulos internos de un triángulo?', ['90°', '180°', '270°', '360°'], 1)
        ]
      },
      {
        id: uid(), code: 'LEN-101', subject: 'lengua', title: 'Lengua Castellana', minutes: 10, passPercent: 60,
        description: 'Gramática, ortografía, sinónimos y antónimos del español.',
        questions: [
          q('¿Cuál es un sinónimo de «rápido»?', ['Lento', 'Veloz', 'Pesado', 'Tranquilo'], 1),
          q('¿Cuál de estas palabras es aguda?', ['Árbol', 'Camión', 'Mesa', 'Lápiz'], 1),
          q('¿Cuál de estas palabras es un sustantivo propio?', ['Ciudad', 'Bogotá', 'Río', 'País'], 1),
          q('¿Qué signos se usan para abrir y cerrar una pregunta?', ['¡ !', '¿ ?', '« »', '( )'], 1),
          q('¿Cuál es el antónimo de «generoso»?', ['Amable', 'Tacaño', 'Alegre', 'Valiente'], 1)
        ]
      },
      {
        id: uid(), code: 'FIS-101', subject: 'fisica', title: 'Física', minutes: 15, passPercent: 60,
        description: 'Fuerzas, movimiento, energía y leyes de Newton.',
        questions: [
          q('¿Cuál es la unidad de fuerza en el Sistema Internacional?', ['Joule', 'Newton', 'Watt', 'Pascal'], 1),
          q('¿Cuál es la velocidad aproximada de la luz?', ['300.000 km/s', '3.000 km/s', '30.000 km/s', '150.000 km/s'], 0),
          q('¿Qué enuncia la primera ley de Newton?', ['Inercia', 'Acción y reacción', 'F = m · a', 'Gravitación universal'], 0),
          q('¿Cómo se llama la energía del movimiento?', ['Potencial', 'Cinética', 'Térmica', 'Química'], 1),
          q('¿Cuál es la aceleración de la gravedad en la Tierra?', ['1,6 m/s²', '9,8 m/s²', '15 m/s²', '3,7 m/s²'], 1)
        ]
      }
    ]
  });

  function init() {
    if (read(KEYS.version, null) !== VERSION) {
      const seed = buildSeed();
      write(KEYS.users, seed.users);
      write(KEYS.exams, seed.exams);
      write(KEYS.attempts, []);
      write(KEYS.version, VERSION);
      localStorage.removeItem(KEYS.session);
      return;
    }
    const seed = buildSeed();
    if (localStorage.getItem(KEYS.users) === null) write(KEYS.users, seed.users);
    if (localStorage.getItem(KEYS.exams) === null) write(KEYS.exams, seed.exams);
    if (localStorage.getItem(KEYS.attempts) === null) write(KEYS.attempts, []);
  }

  const users = {
    list: () => read(KEYS.users),
    save(data) {
      const all = read(KEYS.users);
      if (all.some((u) => u.identification === data.identification && u.id !== data.id))
        throw new Error('Ya existe un usuario con ese número de identificación.');
      if (all.some((u) => u.email.toLowerCase() === data.email.toLowerCase() && u.id !== data.id))
        throw new Error('Ya existe un usuario con ese correo electrónico.');
      if (data.id) {
        const i = all.findIndex((u) => u.id === data.id);
        if (i < 0) throw new Error('El usuario no existe.');
        all[i] = { ...all[i], ...data };
      } else {
        all.push({ ...data, id: uid() });
      }
      write(KEYS.users, all);
    },
    remove: (id) => write(KEYS.users, read(KEYS.users).filter((u) => u.id !== id))
  };

  const exams = {
    list: () => read(KEYS.exams),
    get: (id) => read(KEYS.exams).find((e) => e.id === id) || null,
    save(data) {
      const all = read(KEYS.exams);
      if (all.some((e) => e.code.toLowerCase() === data.code.toLowerCase() && e.id !== data.id))
        throw new Error('Ya existe un examen con ese código.');
      const payload = { ...data, subject: SUBJECTS[data.subject] ? data.subject : 'general' };
      if (payload.id) {
        const i = all.findIndex((e) => e.id === payload.id);
        if (i < 0) throw new Error('El examen no existe.');
        all[i] = { ...all[i], ...payload };
      } else {
        all.push({ ...payload, id: uid(), questions: [] });
      }
      write(KEYS.exams, all);
    },
    remove: (id) => write(KEYS.exams, read(KEYS.exams).filter((e) => e.id !== id)),

    saveQuestion(examId, qn) {
      const all = read(KEYS.exams);
      const exam = all.find((e) => e.id === examId);
      if (!exam) throw new Error('El examen no existe.');
      if (!qn.text.trim()) throw new Error('El enunciado es obligatorio.');
      if (qn.answers.length < 2) throw new Error('Cada pregunta necesita mínimo 2 respuestas.');
      if (qn.answers.some((a) => !a.text.trim())) throw new Error('Todas las respuestas deben tener descripción.');
      if (qn.answers.filter((a) => a.correct).length !== 1)
        throw new Error('Debe haber exactamente UNA respuesta correcta.');
      const clean = {
        id: qn.id || uid(),
        text: qn.text.trim(),
        answers: qn.answers.map((a) => ({ id: a.id || uid(), text: a.text.trim(), correct: !!a.correct }))
      };
      const i = exam.questions.findIndex((x) => x.id === clean.id);
      if (i >= 0) exam.questions[i] = clean; else exam.questions.push(clean);
      write(KEYS.exams, all);
    },
    removeQuestion(examId, qId) {
      const all = read(KEYS.exams);
      const exam = all.find((e) => e.id === examId);
      if (exam) exam.questions = exam.questions.filter((x) => x.id !== qId);
      write(KEYS.exams, all);
    }
  };

  const attempts = {
    list: () => read(KEYS.attempts),
    add(a) { const all = read(KEYS.attempts); all.push({ ...a, id: uid() }); write(KEYS.attempts, all); }
  };

  const auth = {
    login(email, password) {
      const u = read(KEYS.users).find(
        (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
      if (!u) return null;
      localStorage.setItem(KEYS.session, u.id);
      return u;
    },
    logout: () => localStorage.removeItem(KEYS.session),
    current() {
      const id = localStorage.getItem(KEYS.session);
      return id ? read(KEYS.users).find((u) => u.id === id) || null : null;
    }
  };

  window.AcmeDB = { init, subjects: SUBJECTS, users, exams, attempts, auth };
  window.AcmeUtil = { esc, uid, fmtTime, fmtDate };
  init();
})();
