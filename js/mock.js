// OET Full Mock Test — frontend (mocktest.speakeasy.lat). v1, 25/09/2026.
// Todo el tiempo lo controla el servidor (mock-api): acá solo se muestra la cuenta
// regresiva y, al llegar a cero, se entrega sola la parte. Las respuestas se guardan
// solas cada pocos segundos, así que si se recarga la página no se pierde nada.
(function () {
  const FN = 'https://qqdxmmvhthwcqhgmvyic.supabase.co/functions/v1/mock-api';
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxZHhtbXZodGh3Y3FoZ212eWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MzY3NDQsImV4cCI6MjA5OTAxMjc0NH0.iP5BTeUjw8FnElgQzp9r1-iSR-B9USVMcKGRs-Yh8GA';
  const LET = ['A', 'B', 'C', 'D'];
  const SS = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* sin storage */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch { /* sin storage */ } },
  };

  const S = { token: SS.get('mock_token'), code: SS.get('mock_code'), name: '', skew: 0, run: null, dirty: {}, loops: [], finishing: false };
  const $app = document.getElementById('app');
  const $label = document.getElementById('sectionLabel');
  const $timerBox = document.getElementById('timerBox');
  const $timerVal = document.getElementById('timerValue');
  const $timerCap = document.getElementById('timerCaption');
  const now = () => Date.now() + S.skew;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ------------------------------------------------------------------ utilidades
  function toast(msg, ms = 3000) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), ms);
  }
  function confirmBox(text) {
    return new Promise((resolve) => {
      const m = document.getElementById('modal');
      document.getElementById('modalText').textContent = text;
      m.classList.remove('hidden');
      const done = (v) => { m.classList.add('hidden'); ok.onclick = cancel.onclick = null; resolve(v); };
      const ok = document.getElementById('modalOk'); const cancel = document.getElementById('modalCancel');
      ok.onclick = () => done(true); cancel.onclick = () => done(false);
    });
  }
  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0');
  }
  function clearLoops() { S.loops.forEach(clearInterval); S.loops = []; }
  function setHeader(label, showTimer) { $label.textContent = label || ''; $timerBox.classList.toggle('hidden', !showTimer); }

  async function api(action, extra = {}) {
    const body = { action, token: S.token, ...extra };
    let res;
    // Tiempo máximo de 15 s por llamada y hasta 3 intentos automáticos (25/09/2026).
    for (let i = 0; i < 3; i++) {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 15000);
      try {
        res = await fetch(FN, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON }, body: JSON.stringify(body) });
        clearTimeout(tm);
        if (res.status < 500 || i === 2) break;
      } catch {
        clearTimeout(tm);
        if (i === 2) throw Object.assign(new Error('No pudimos conectar con el servidor. Revisa tu conexión.'), { network: true });
      }
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && data.code === 'SESSION' && S.code && action !== 'login') {
      // Sesión vencida: se vuelve a entrar sola con el código (retoma el mismo intento).
      const l = await api('login', { code: S.code });
      S.token = l.token; SS.set('mock_token', l.token);
      return api(action, extra);
    }
    if (!res.ok) throw Object.assign(new Error(data.error || 'Ocurrió un error. Intenta de nuevo.'), { status: res.status, data });
    return data;
  }

  // ------------------------------------------------------------------ entrada
  async function boot() {
    const urlCode = new URLSearchParams(location.search).get('code');
    if (urlCode) { S.code = urlCode.trim(); SS.set('mock_code', S.code); }
    try {
      if (S.code && (!S.token || urlCode)) {
        const l = await api('login', { code: S.code });
        S.token = l.token; SS.set('mock_token', l.token); S.name = l.student_name;
        return renderHome(l.state);
      }
      if (S.token) {
        const st = await api('state');
        S.name = st.student_name; return renderHome(st.state);
      }
      renderCodeForm();
    } catch (e) {
      renderCodeForm(e.message);
    }
  }

  function renderCodeForm(err) {
    setHeader('OET Full Mock Test', false);
    $app.innerHTML = `<div class="card" style="max-width:460px;margin:30px auto">
      <h1>OET Full Mock Test</h1>
      <p>Ingresa el código de acceso que te dio tu profe.</p>
      <input type="text" id="codeIn" placeholder="OETF-XXXXX" style="width:100%;margin:8px 0 12px" autocomplete="off">
      <button class="btn primary" id="codeBtn" style="width:100%">Entrar</button>
      ${err ? `<p style="color:var(--bad);margin-top:12px">${esc(err)}</p>` : ''}
    </div>`;
    const go = () => { const c = document.getElementById('codeIn').value.trim(); if (!c) return; S.code = c; SS.set('mock_code', c); SS.del('mock_token'); S.token = null; boot(); };
    document.getElementById('codeBtn').onclick = go;
    document.getElementById('codeIn').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  }

  const RULES = {
    listening: ['Duración: unos 30 minutos, en 5 audios seguidos (Part A, B y C).', 'Cada audio suena <b>una sola vez</b> y no se puede pausar ni repetir, como en el examen real.', 'Los tiempos para leer las preguntas ya vienen dentro del audio.', 'Usa audífonos y revisa el volumen antes de empezar.', 'Al terminar el último audio, esta parte se entrega sola.'],
    reading_a: ['Duración: <b>15 minutos exactos</b>.', '4 textos cortos y 20 preguntas.', 'Al acabarse el tiempo, la parte se entrega sola y ya no puedes volver a ella.'],
    reading_bc: ['Duración: <b>45 minutos</b> para las Partes B y C juntas.', 'Part B: 6 textos cortos, una pregunta cada uno. Part C: 2 textos largos, 8 preguntas cada uno.', 'Al acabarse el tiempo, la parte se entrega sola.'],
    writing: ['<b>5 minutos de lectura</b>: puedes leer las notas del caso, pero todavía no puedes escribir.', 'Luego tienes <b>40 minutos</b> para escribir la carta (unas 180–200 palabras).', 'Tu carta se guarda sola mientras escribes. Al acabarse el tiempo, se entrega sola.'],
  };

  function renderHome(state) {
    clearLoops(); S.run = null; S.dirty = {}; window.onbeforeunload = null;
    setHeader('OET Full Mock Test', false);
    if (state.status !== 'in_progress') return renderDone(state);
    const next = state.sections.find((s) => s.section === state.next_section);
    const running = next && next.status === 'running';
    $app.innerHTML = `
      <div class="card">
        <h1>Hola, ${esc(S.name)}</h1>
        <p>Este es tu <b>OET Full Mock Test</b>: Listening, Reading y Writing con los tiempos reales del examen. El Speaking lo haces en clase con tu profe.</p>
        <ul class="steps">
          ${state.sections.map((s) => `<li><span>${esc(s.title)}</span><span class="pill ${s.status === 'done' ? 'done' : s.status === 'running' ? 'run' : ''}">${s.status === 'done' ? 'Terminado' : s.status === 'running' ? 'En curso' : 'Pendiente'}</span></li>`).join('')}
        </ul>
      </div>
      ${next ? `<div class="card">
        <h2>${running ? 'Continuar' : 'Siguiente'}: ${esc(next.title)}</h2>
        <ul class="rules">${(RULES[next.section] || []).map((r) => `<li>${r}</li>`).join('')}</ul>
        ${running ? '<p class="muted">Esta parte ya empezó y el tiempo sigue corriendo.</p>' : '<p class="muted">El tiempo empieza apenas le des clic al botón y no se puede pausar.</p>'}
        <div class="actions"><button class="btn primary" id="goBtn">${running ? 'Continuar' : 'Empezar ' + esc(next.title)}</button></div>
      </div>` : ''}`;
    if (next) document.getElementById('goBtn').onclick = async () => {
      if (!running) {
        const ok = await confirmBox(`¿Lista para empezar ${next.title}? El tiempo no se puede pausar.`);
        if (!ok) return;
      }
      if (next.section === 'listening') unlockAudio();
      startSection(next.section);
    };
  }

  function renderDone(state) {
    setHeader('OET Full Mock Test', false);
    $app.innerHTML = `<div class="card center" style="max-width:620px;margin:30px auto">
      <h1>¡Muy bien, ${esc(S.name)}!</h1>
      ${state.status === 'completed'
        ? '<p>Tu OET Full Mock Test está completo. Tu profe te va a compartir los resultados.</p>'
        : '<p>Terminaste Listening, Reading y Writing. Tus respuestas quedaron guardadas.</p><p>El <b>Speaking</b> lo haces en clase con tu profe. Después te comparten el reporte completo.</p>'}
      <p class="muted small">Ya puedes cerrar esta ventana.</p></div>`;
  }

  // ------------------------------------------------------------------ secciones
  async function startSection(section) {
    $app.innerHTML = '<div class="card center"><p>Cargando…</p></div>';
    let r;
    try { r = await api('start', { section }); } catch (e) {
      toast(e.message, 5000);
      if (e.data && e.data.state) return renderHome(e.data.state);
      return boot();
    }
    S.skew = Date.parse(r.server_now) - Date.now();
    S.run = r; S.dirty = {}; S.finishing = false;
    window.onbeforeunload = () => 'Tu examen está en curso.';
    if (section === 'listening') renderListening(r);
    else if (section === 'reading_a') renderReadingA(r);
    else if (section === 'reading_bc') renderReadingBC(r);
    else if (section === 'writing') renderWriting(r);
    startTimer(r);
    if (section !== 'writing') S.loops.push(setInterval(flush, 8000));
  }

  function startTimer(r) {
    const deadline = Date.parse(r.deadline_at);
    const tick = () => {
      const left = (deadline - now()) / 1000;
      $timerVal.textContent = fmt(left);
      $timerBox.classList.toggle('warn', left < 300);
      if (left <= 0) finish(true);
    };
    $timerCap.textContent = 'Tiempo restante';
    tick(); S.loops.push(setInterval(tick, 1000));
  }

  function prefill(saved) {
    for (const a of saved || []) {
      document.querySelectorAll(`[data-q="${a.number}"]`).forEach((el) => {
        if (el.type === 'radio') el.checked = el.value === a.answer; else el.value = a.answer;
      });
    }
  }
  function bindInputs(root) {
    root.querySelectorAll('[data-q]').forEach((el) => {
      const ev = el.type === 'radio' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(ev, () => { S.dirty[el.dataset.q] = el.value; });
    });
  }
  function allAnswers() {
    const out = {};
    document.querySelectorAll('[data-q]').forEach((el) => {
      if (el.type === 'radio') { if (el.checked) out[el.dataset.q] = el.value; }
      else out[el.dataset.q] = el.value;
    });
    return Object.entries(out).map(([n, v]) => ({ number: Number(n), answer: v }));
  }
  async function flush() {
    if (!S.run || S.finishing) return;
    const keys = Object.keys(S.dirty);
    if (!keys.length) return;
    const answers = keys.map((n) => ({ number: Number(n), answer: S.dirty[n] }));
    S.dirty = {};
    try { await api('save', { section: S.run.section, answers }); markSaved(); }
    catch (e) {
      if (e.data && e.data.closed) return finish(true);
      answers.forEach((a) => { if (!(a.number in S.dirty)) S.dirty[a.number] = a.answer; });
    }
  }
  function markSaved() { const el = document.getElementById('saveInfo'); if (el) el.textContent = 'Guardado ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }

  async function finish(auto) {
    if (!S.run || S.finishing) return;
    const section = S.run.section;
    if (!auto) {
      const ok = await confirmBox('¿Seguro que quieres entregar esta parte? Después ya no puedes volver a ella.');
      if (!ok) return;
    }
    S.finishing = true; clearLoops(); stopAudio();
    $timerBox.classList.add('hidden');
    const payload = section === 'writing' ? { text: (document.getElementById('letter') || {}).value || '' } : { answers: allAnswers() };
    $app.innerHTML = `<div class="card center"><p>${auto ? 'Se acabó el tiempo. ' : ''}Entregando tus respuestas…</p></div>`;
    for (let i = 0; i < 4; i++) {
      try {
        const r = await api('finish', { section, ...payload });
        window.onbeforeunload = null;
        if (auto) toast('Se acabó el tiempo: la parte se entregó sola.', 4000);
        return renderHome(r.state);
      } catch (e) {
        if (e.status === 409 && section === 'listening') { await new Promise((r) => setTimeout(r, 6000)); continue; }
        if (e.network) { await new Promise((r) => setTimeout(r, 3000)); continue; }
        break;
      }
    }
    window.onbeforeunload = null;
    boot();
  }

  // ------------------------------------------------------------------ LISTENING
  const audio = new Audio();
  audio.preload = 'auto';
  let curTrack = null; let loadingTrack = null; let audioRetryAt = 0;
  function unlockAudio() {
    try { audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='; audio.play().catch(() => {}); } catch { /* nada */ }
  }
  function stopAudio() { try { audio.pause(); } catch { /* nada */ } curTrack = null; }

  function listeningPartHtml(part) {
    if (part.part === 'A') {
      const notes = part.notes.map((n) => {
        const t = esc(n.text).replace(/\((\d+)\) ______/g, (_, q) => `<span class="qnum">(${q})</span><input type="text" data-q="${q}" autocomplete="off" spellcheck="false">`);
        return `<div class="row"><div class="h">${esc(n.heading)}</div><div class="t">${t}</div></div>`;
      }).join('');
      return `<p class="muted">${esc(part.intro)}</p><h3>${esc(part.heading)}</h3><div class="notes">${notes}</div>`;
    }
    const intro = part.intro ? `<p class="muted">${esc(part.intro)}</p>` : '<p class="muted">You will hear six short extracts. For questions 25 to 30, choose the answer (A, B or C) which fits best according to what you hear.</p>';
    return intro + part.questions.map((q) => mcqHtml(q, q.context)).join('');
  }
  function mcqHtml(q, ctx) {
    return `<div class="mcq">${ctx ? `<div class="ctx"><span class="qnum">${q.number}.</span> ${esc(ctx)}</div>` : ''}
      <div class="stem">${ctx ? '' : `<span class="qnum">${q.number}.</span> `}${q.stem}</div>
      ${q.options.map((o, i) => `<label><input type="radio" name="q${q.number}" value="${LET[i]}" data-q="${q.number}"><span class="let">${LET[i]}</span><span>${esc(o)}</span></label>`).join('')}</div>`;
  }

  function renderListening(r) {
    setHeader('Listening', true);
    const parts = r.content.parts; // mismo orden que los tracks 1..5
    const tracks = r.tracks;
    const started = Date.parse(r.started_at);
    const total = tracks.length ? tracks[tracks.length - 1].starts_at_offset + tracks[tracks.length - 1].duration : 0;
    const answers = {}; (r.saved_answers || []).forEach((a) => { answers[a.number] = a.answer; });
    $app.innerHTML = `
      <div class="player"><b id="trkLabel">…</b><div class="bar"><i id="trkBar"></i></div><span id="trkTime" class="small muted"></span></div>
      <button class="btn primary hidden" id="resumeBtn" style="margin-bottom:12px">Toca aquí para continuar el audio</button>
      <div class="card" id="partBox"></div>
      <div class="actions"><span id="saveInfo" class="save"></span></div>`;
    const $box = document.getElementById('partBox');
    let shownIdx = -1;
    const resumeBtn = document.getElementById('resumeBtn');
    let pendingTrack = null;
    // Si el navegador bloqueó el autoplay: el clic (gesto del usuario) retoma el audio
    // en el punto donde debería ir, como si nunca se hubiera detenido.
    resumeBtn.onclick = () => {
      if (!pendingTrack) { resumeBtn.classList.add('hidden'); return; }
      const el = (now() - started) / 1000 - pendingTrack.starts_at_offset;
      try { audio.currentTime = Math.max(0, Math.min(el, pendingTrack.duration - 0.5)); } catch { /* nada */ }
      audio.play().then(() => { resumeBtn.classList.add('hidden'); pendingTrack = null; }).catch(() => toast('Revisa que el navegador permita reproducir audio.'));
    };

    const keepAnswers = () => { document.querySelectorAll('#partBox [data-q]').forEach((el) => { if (el.type !== 'radio' || el.checked) answers[el.dataset.q] = el.value; }); };
    const show = (idx) => {
      keepAnswers(); flush();
      shownIdx = idx; const p = parts[idx];
      const title = p.part === 'A' ? `Part A · Extract ${p.extract} (Questions ${p.qrange[0]}–${p.qrange[1]})` : p.part === 'B' ? 'Part B (Questions 25–30)' : `Part C · Extract ${p.extract} (Questions ${p.qrange[0]}–${p.qrange[1]})`;
      $box.innerHTML = `<div class="band">${title}</div>` + listeningPartHtml(p);
      bindInputs($box);
      prefill(Object.entries(answers).map(([n, a]) => ({ number: n, answer: a })));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    async function playTrack(t, elapsedInTrack) {
      if (loadingTrack === t.track_no || Date.now() < audioRetryAt) return;
      loadingTrack = t.track_no;
      try {
        const a = await api('audio', { track_no: t.track_no });
        if (a.ended) { curTrack = t.track_no; return; }
        audio.src = a.url;
        audio.onloadedmetadata = () => {
          const el = (now() - started) / 1000 - t.starts_at_offset;
          try { audio.currentTime = Math.max(0, Math.min(el, t.duration - 0.5)); } catch { /* nada */ }
        };
        curTrack = t.track_no;
        await audio.play().catch(() => { pendingTrack = t; resumeBtn.classList.remove('hidden'); });
      } catch (e) {
        toast(e.message, 4000); curTrack = null; audioRetryAt = Date.now() + 5000;
      } finally { loadingTrack = null; }
    }

    const loop = () => {
      const el = (now() - started) / 1000;
      if (el >= total + 2) { finish(true); return; }
      let idx = tracks.findIndex((t) => el < t.starts_at_offset + t.duration);
      if (idx < 0) idx = tracks.length - 1;
      const t = tracks[idx];
      if (idx !== shownIdx) show(idx);
      if (pendingTrack && pendingTrack.track_no !== tracks[idx].track_no) { pendingTrack = null; resumeBtn.classList.add('hidden'); }
      const inTrack = el - t.starts_at_offset;
      document.getElementById('trkLabel').textContent = `Audio ${t.track_no} de ${tracks.length} · ${t.label}`;
      document.getElementById('trkBar').style.width = Math.max(0, Math.min(100, (inTrack / t.duration) * 100)) + '%';
      document.getElementById('trkTime').textContent = inTrack < 0 ? 'empieza en ' + fmt(-inTrack) : fmt(inTrack) + ' / ' + fmt(t.duration);
      if (inTrack >= -1 && inTrack < t.duration - 1 && curTrack !== t.track_no && !pendingTrack) playTrack(t, inTrack);
    };
    // Evita que se pause con las teclas de medios.
    audio.onpause = () => { if (curTrack && !S.finishing && audio.currentTime < (audio.duration || 1e9) - 1) audio.play().catch(() => { pendingTrack = tracks.find((x) => x.track_no === curTrack) || null; resumeBtn.classList.remove('hidden'); }); };
    loop(); S.loops.push(setInterval(loop, 500));
  }

  // ------------------------------------------------------------------ READING A
  function renderReadingA(r) {
    setHeader('Reading · Part A', true);
    const c = r.content;
    const qs = `
      <div class="band">Questions 1–7</div>
      <p class="small muted">For each question, 1–7, decide which text (A, B, C or D) the information comes from. You may use any letter more than once.</p>
      <p class="small"><b>In which text can you find information about…</b></p>
      ${c.matching.map((q) => `<div class="qline"><span class="qnum">${q.number}</span><span class="qtext">${esc(q.text)}</span><select data-q="${q.number}"><option value="">–</option>${LET.map((l) => `<option value="${l}">${l}</option>`).join('')}</select></div>`).join('')}
      <div class="band">Questions 8–14</div>
      <p class="small muted">Answer each of the questions, 8–14, with a word or short phrase from one of the texts. Each answer may include words, numbers or both.</p>
      ${c.short.map((q) => `<div class="qline"><span class="qnum">${q.number}</span><span class="qtext">${esc(q.text)}</span><input type="text" data-q="${q.number}" autocomplete="off" spellcheck="false"></div>`).join('')}
      <div class="band">Questions 15–20</div>
      <p class="small muted">Complete each of the sentences, 15–20, with a word or short phrase from one of the texts. Each answer may include words, numbers or both.</p>
      ${c.completion.map((q) => `<div class="qline"><span class="qnum">${q.number}</span><span class="qtext">${esc(q.text).replace('______', `<input type="text" data-q="${q.number}" autocomplete="off" spellcheck="false" style="width:170px">`)}</span></div>`).join('')}`;
    $app.innerHTML = `
      <div class="split">
        <div class="pane"><h2>${esc(c.topic)}</h2><div class="tabs" id="tabs">${c.texts.map((t, i) => `<button class="tab ${i ? '' : 'on'}" data-i="${i}">${esc(t.label)}</button>`).join('')}</div><div id="textBox"></div></div>
        <div class="pane">${qs}<div class="actions"><span id="saveInfo" class="save"></span><button class="btn primary" id="doneBtn">Entregar Part A</button></div></div>
      </div>`;
    const showText = (i) => {
      document.querySelectorAll('#tabs .tab').forEach((b) => b.classList.toggle('on', Number(b.dataset.i) === i));
      document.getElementById('textBox').innerHTML = `<h3>${esc(c.texts[i].label)}: ${esc(c.texts[i].title)}</h3>${c.texts[i].html}`;
    };
    document.querySelectorAll('#tabs .tab').forEach((b) => (b.onclick = () => showText(Number(b.dataset.i))));
    showText(0); bindInputs($app); prefill(r.saved_answers);
    document.getElementById('doneBtn').onclick = () => finish(false);
  }

  // ------------------------------------------------------------------ READING B+C
  function renderReadingBC(r) {
    setHeader('Reading · Parts B & C', true);
    const c = r.content;
    const views = [{ key: 'B', label: 'Part B' }, ...c.part_c.map((t, i) => ({ key: 'C' + i, label: 'Part C · Text ' + (i + 1) }))];
    $app.innerHTML = `
      <div class="tabs" id="tabs">${views.map((v, i) => `<button class="tab ${i ? '' : 'on'}" data-k="${v.key}">${esc(v.label)}</button>`).join('')}</div>
      <div id="viewB"></div>${c.part_c.map((_, i) => `<div id="viewC${i}" class="hidden"></div>`).join('')}
      <div class="actions"><span id="saveInfo" class="save"></span><button class="btn primary" id="doneBtn">Entregar Reading</button></div>`;
    document.getElementById('viewB').innerHTML = `<div class="card"><div class="band">Part B · Questions 1–6</div>
      <p class="small muted">In each of questions 1–6, there is an extract from a text found in a healthcare workplace. Choose the answer (A, B or C) which you think fits best according to the text.</p>
      ${c.part_b.map((q) => `<div class="extract"><h4>${esc(q.title)}</h4><p>${esc(q.text)}</p>${mcqHtml(q)}</div>`).join('')}</div>`;
    c.part_c.forEach((t, i) => {
      document.getElementById('viewC' + i).innerHTML = `<div class="split">
        <div class="pane"><h2>${esc(t.title)}</h2>${t.paragraphs.map((p, k) => `<p class="para"><span class="pn">${k + 1}</span>${p}</p>`).join('')}</div>
        <div class="pane"><div class="band">Questions ${t.questions[0].number}–${t.questions[t.questions.length - 1].number}</div>
        <p class="small muted">Choose the answer (A, B, C or D) which you think fits best according to the text.</p>${t.questions.map((q) => mcqHtml(q)).join('')}</div></div>`;
    });
    document.querySelectorAll('#tabs .tab').forEach((b) => (b.onclick = () => {
      document.querySelectorAll('#tabs .tab').forEach((x) => x.classList.toggle('on', x === b));
      document.getElementById('viewB').classList.toggle('hidden', b.dataset.k !== 'B');
      c.part_c.forEach((_, i) => document.getElementById('viewC' + i).classList.toggle('hidden', b.dataset.k !== 'C' + i));
      window.scrollTo({ top: 0 });
    }));
    bindInputs($app); prefill(r.saved_answers);
    document.getElementById('doneBtn').onclick = () => finish(false);
  }

  // ------------------------------------------------------------------ WRITING
  function renderWriting(r) {
    setHeader('Writing', true);
    const c = r.content;
    const readingEnds = Date.parse(r.started_at) + (c.reading_seconds || 300) * 1000;
    $app.innerHTML = `
      <div class="split">
        <div class="pane notesbox"><h2>Case notes</h2>${c.notes_html}<div class="band">Writing task</div>${c.task_html}</div>
        <div class="pane">
          <div id="lockMsg" class="lock"></div>
          <textarea id="letter" class="letter" spellcheck="false" placeholder="Write your letter here…" disabled></textarea>
          <div class="wc"><span id="wc">0</span> words · <span id="saveInfo" class="save"></span></div>
          <div class="actions"><button class="btn primary" id="doneBtn" disabled>Entregar carta</button></div>
        </div>
      </div>`;
    const $t = document.getElementById('letter');
    const $lock = document.getElementById('lockMsg');
    const $done = document.getElementById('doneBtn');
    $t.value = r.draft_text || '';
    let dirty = false; let unlocked = false;
    const count = () => { document.getElementById('wc').textContent = ($t.value.trim().match(/\S+/g) || []).length; };
    count();
    $t.addEventListener('input', () => { dirty = true; count(); });
    $t.addEventListener('paste', (e) => e.preventDefault());
    const lockTick = () => {
      const left = (readingEnds - now()) / 1000;
      if (left > 0) { $lock.textContent = `Reading time: ${fmt(left)}. You can read the case notes, but you cannot write yet.`; }
      else if (!unlocked) { unlocked = true; $lock.classList.add('hidden'); $t.disabled = false; $done.disabled = false; $t.focus(); toast('Ya puedes empezar a escribir.'); }
    };
    lockTick(); S.loops.push(setInterval(lockTick, 1000));
    S.loops.push(setInterval(async () => {
      if (!dirty || !unlocked || S.finishing) return;
      dirty = false;
      try { await api('save', { section: 'writing', text: $t.value }); markSaved(); }
      catch (e) { if (e.data && e.data.closed) finish(true); else dirty = true; }
    }, 10000));
    $done.onclick = () => finish(false);
  }

  boot();
})();
