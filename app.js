(function () {
  "use strict";

  const config = window.PORTAL_CONFIG || {};
  const STORE = config.storagePrefix || "portal_digital_v1";
  const SESSION = STORE + "_session";
  const STAGES = [
    "Relevamiento de base",
    "Modelación en plataforma",
    "Automatización e interoperabilidad",
    "Pruebas en ambiente de testing",
    "Modelado en producción",
    "Instructivo y tutoriales",
    "Transferencia de capacidades",
    "Traslado a hosting institucional",
    "Pruebas en producción",
    "Publicación de acuerdos",
    "Socialización",
    "Disponible para la ciudadanía"
  ];
  const PERMISSIONS = {
    institutions: "Instituciones",
    survey: "Trámites - Estado",
    technical: "Trámites - Técnica",
    events: "Eventos y asistencia",
    calendar: "Calendario",
    documents: "Documentos",
    repository: "Repositorio"
  };
  const DEFAULT_INSTITUTIONS = [
    "CONVIVIENDA", "COPECO", "SIT", "IHADFA", "BANHPROVI", "INPREUNAH",
    "CNBS", "INPREMA", "IHTT", "SEN", "CONSUCOOP", "CONATEL", "IHCINE",
    "SAG", "SECAPPH", "SRECI", "SERNA", "SGJD", "CANATURH / IHT"
  ];

  let state = loadState();
  let session = loadSession();
  let toastTimer = 0;

  function emptyState() {
    return {
      version: 1,
      users: [],
      institutions: DEFAULT_INSTITUTIONS.map((name, index) => ({
        id: uid(),
        name,
        process: index % 3 === 0 ? "Trámite institucional prioritario" : "Proceso por definir",
        stages: STAGES.map((_, stageIndex) => stageIndex < (index % 5) + 3),
        notes: "",
        updatedAt: new Date().toISOString()
      })),
      surveys: [],
      technicalRecords: [],
      events: [],
      attendance: [],
      calendar: [],
      documents: [],
      resources: []
    };
  }

  function normalizeState(data) {
    const base = emptyState();
    Object.keys(base).forEach((key) => {
      if (data[key] === undefined) data[key] = base[key];
    });
    return data;
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE));
      return parsed ? normalizeState(parsed) : emptyState();
    } catch (_) {
      return emptyState();
    }
  }

  function saveState() {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function loadSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION)) || null;
    } catch (_) {
      return null;
    }
  }

  function setSession(value) {
    session = value;
    if (value) sessionStorage.setItem(SESSION, JSON.stringify(value));
    else sessionStorage.removeItem(SESSION);
  }

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function val(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : "";
  }

  function checked(id) {
    const element = document.getElementById(id);
    return Boolean(element && element.checked);
  }

  function currentUser() {
    if (!session) return null;
    return state.users.find((user) => user.id === session.userId) || null;
  }

  function can(permission) {
    const user = currentUser();
    return Boolean(user && (user.role === "admin" || (user.permissions || {})[permission]));
  }

  function go(path) {
    location.hash = path;
  }

  function routeParts() {
    return (location.hash.replace(/^#\/?/, "") || "dashboard").split("/").filter(Boolean);
  }

  function toast(message) {
    const node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2600);
  }

  async function hashPassword(password, salt) {
    const bytes = new TextEncoder().encode(salt + "|" + password);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Date(value + (value.length === 10 ? "T12:00:00" : "")).toLocaleDateString("es-HN", {
      year: "numeric", month: "short", day: "numeric"
    });
  }

  function download(filename, text, type) {
    const blob = new Blob([text], { type: type || "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function layout(content, active) {
    const user = currentUser();
    if (!user) return content;
    const nav = [
      ["dashboard", "Inicio", "#/dashboard"],
      ["institutions", "Instituciones", "#/institutions"],
      ["survey", "Levantamientos", "#/surveys"],
      ["technical", "Fichas técnicas", "#/technical"],
      ["events", "Eventos", "#/events"],
      ["calendar", "Calendario", "#/calendar"],
      ["documents", "Documentos", "#/documents"],
      ["repository", "Repositorio", "#/repository"]
    ].filter((item) => item[0] === "dashboard" || can(item[0]));
    if (user.role === "admin") nav.push(["access", "Accesos", "#/access"]);
    return `
      <div class="shell">
        <header class="topbar">
          <a class="brand" href="#/dashboard">
            <span class="brand-mark">PD</span>
            <span class="brand-copy">
              <strong>${esc(config.appName || "Portal Digital")}</strong>
              <span>${esc(config.organization || "Tu institución")}</span>
            </span>
          </a>
          <div class="user-actions">
            <span class="user-pill">${esc(user.fullName)} · ${user.role === "admin" ? "Administrador" : "Funcionario"}</span>
            <button class="btn ghost small" onclick="App.logout()">Cerrar sesión</button>
          </div>
        </header>
        <nav class="nav">
          ${nav.map((item) => `<a class="${active === item[0] ? "active" : ""}" href="${item[2]}">${item[1]}</a>`).join("")}
        </nav>
        <main class="main">${content}</main>
      </div>`;
  }

  function pageHero(title, description, eyebrow) {
    return `<section class="hero compact">
      <span class="eyebrow">${esc(eyebrow || "Gestión institucional")}</span>
      <h2>${esc(title)}</h2>
      <p>${esc(description)}</p>
    </section>`;
  }

  function render() {
    const parts = routeParts();
    const publicAttendance = parts[0] === "attendance" && parts[1];
    if (publicAttendance) {
      renderPublicAttendance(parts[1]);
      return;
    }
    if (!state.users.length) {
      renderSetup();
      return;
    }
    if (!session || !currentUser()) {
      renderLogin();
      return;
    }
    const route = parts[0];
    const routes = {
      dashboard: renderDashboard,
      institutions: renderInstitutions,
      surveys: renderSurveys,
      survey: () => renderSurveyForm(parts[1]),
      technical: () => renderTechnical(parts[1]),
      events: renderEvents,
      event: () => renderEvent(parts[1]),
      calendar: renderCalendar,
      documents: renderDocuments,
      repository: renderRepository,
      access: renderAccess
    };
    (routes[route] || renderDashboard)();
    window.scrollTo(0, 0);
  }

  function renderSetup() {
    document.getElementById("app").innerHTML = `
      <div class="login-page">
        <section class="login-art">
          <span class="eyebrow">Instalación nueva</span>
          <h1>Tu portal, bajo tu control.</h1>
          <p>Esta copia es independiente. El primer paso crea al administrador local para que puedas revisar todas las funciones.</p>
          <div class="feature-list">
            <span>✓ Usuarios y permisos propios</span>
            <span>✓ Datos separados del sistema original</span>
            <span>✓ Preparado para conectar tu Supabase</span>
          </div>
        </section>
        <section class="login-panel">
          <form class="login-box" onsubmit="App.setup(event)">
            <h2>Crear administrador</h2>
            <p>Usa tus propios datos. Esta configuración se guarda solamente en este navegador.</p>
            <div class="field"><label>Nombre completo</label><input id="setup-name" required autocomplete="name"></div>
            <div class="field"><label>Correo</label><input id="setup-email" required type="email" autocomplete="email"></div>
            <div class="field"><label>Contraseña</label><input id="setup-password" required type="password" minlength="8" autocomplete="new-password"></div>
            <div class="field"><label>Confirmar contraseña</label><input id="setup-confirm" required type="password" minlength="8" autocomplete="new-password"></div>
            <div class="notice">Modo de prueba local. Para producción se conectará a Supabase Auth.</div>
            <div id="setup-error" class="error"></div>
            <button class="btn primary" style="width:100%">Crear portal</button>
          </form>
        </section>
      </div>`;
  }

  async function setup(event) {
    event.preventDefault();
    const name = val("setup-name");
    const email = val("setup-email").toLowerCase();
    const password = val("setup-password");
    const confirm = val("setup-confirm");
    const error = document.getElementById("setup-error");
    if (password !== confirm) {
      error.textContent = "Las contraseñas no coinciden.";
      return;
    }
    const salt = uid();
    const user = {
      id: uid(),
      fullName: name,
      email,
      salt,
      passwordHash: await hashPassword(password, salt),
      role: "admin",
      permissions: Object.fromEntries(Object.keys(PERMISSIONS).map((key) => [key, true])),
      createdAt: new Date().toISOString()
    };
    state.users.push(user);
    saveState();
    setSession({ userId: user.id });
    go("/dashboard");
    render();
  }

  function renderLogin() {
    document.getElementById("app").innerHTML = `
      <div class="login-page">
        <section class="login-art">
          <span class="eyebrow">${esc(config.organization || "Tu institución")}</span>
          <h1>Gestión digital en un solo lugar.</h1>
          <p>Administra instituciones, levantamientos, fichas técnicas, eventos, asistencias, documentos y seguimiento.</p>
        </section>
        <section class="login-panel">
          <form class="login-box" onsubmit="App.login(event)">
            <h2>Iniciar sesión</h2>
            <p>Ingresa con una cuenta creada por el administrador.</p>
            <div class="field"><label>Correo</label><input id="login-email" required type="email" autocomplete="email"></div>
            <div class="field"><label>Contraseña</label><input id="login-password" required type="password" autocomplete="current-password"></div>
            <div id="login-error" class="error"></div>
            <button class="btn primary" style="width:100%">Ingresar</button>
          </form>
        </section>
      </div>`;
  }

  async function login(event) {
    event.preventDefault();
    const email = val("login-email").toLowerCase();
    const password = val("login-password");
    const user = state.users.find((item) => item.email === email);
    if (!user || await hashPassword(password, user.salt) !== user.passwordHash) {
      document.getElementById("login-error").textContent = "Correo o contraseña incorrectos.";
      return;
    }
    setSession({ userId: user.id });
    go("/dashboard");
    render();
  }

  function logout() {
    setSession(null);
    go("/login");
    render();
  }

  function renderDashboard() {
    const operation = state.institutions.filter((item) => progress(item.stages) === 100).length;
    const inProgress = state.institutions.filter((item) => {
      const value = progress(item.stages);
      return value > 0 && value < 100;
    }).length;
    const modules = [
      ["institutions", "Instituciones", "Seguimiento por etapas, progreso y notas.", "#/institutions", "🏛"],
      ["survey", "Trámites - Estado", "Levantamiento del estado actual de los trámites.", "#/surveys", "▤"],
      ["technical", "Trámites - Técnica", "Ficha técnica, requisitos, flujo y racionalización.", "#/technical", "⌕"],
      ["events", "Eventos y asistencia", "Eventos, enlaces públicos, QR y participantes.", "#/events", "▦"],
      ["calendar", "Calendario", "Fechas clave y compromisos de la unidad.", "#/calendar", "□"],
      ["documents", "Documentos", "Registro central de documentos y enlaces.", "#/documents", "▧"],
      ["repository", "Repositorio", "Recursos, carpetas y plataformas externas.", "#/repository", "↗"]
    ].filter((item) => can(item[0]));
    document.getElementById("app").innerHTML = layout(`
      <section class="hero">
        <span class="eyebrow">Plataforma de gestión</span>
        <h1>Digitalización y seguimiento institucional</h1>
        <p>Una réplica independiente, con tus propias cuentas, usuarios y datos.</p>
      </section>
      <div class="grid four" style="margin-top:18px">
        <div class="card stat"><span>Instituciones / trámites</span><strong>${state.institutions.length}</strong></div>
        <div class="card stat"><span>En operación</span><strong>${operation}</strong></div>
        <div class="card stat"><span>En proceso</span><strong>${inProgress}</strong></div>
        <div class="card stat"><span>Eventos registrados</span><strong>${state.events.length}</strong></div>
      </div>
      <div class="section-head"><div><h2>Módulos habilitados</h2><p>El acceso depende del perfil de cada usuario.</p></div></div>
      <div class="grid three">
        ${modules.map((item) => `<a class="card module-card" href="${item[3]}">
          <span class="icon">${item[4]}</span><h3>${item[1]}</h3><p>${item[2]}</p><span class="arrow">Abrir →</span>
        </a>`).join("")}
      </div>`, "dashboard");
  }

  function progress(stages) {
    if (!stages || !stages.length) return 0;
    return Math.round(stages.filter(Boolean).length / stages.length * 100);
  }

  function statusFor(value) {
    if (value === 100) return ["En operación", "green"];
    if (value > 0) return ["En proceso", "amber"];
    return ["No iniciado", "red"];
  }

  function renderInstitutions() {
    if (!can("institutions")) return forbidden();
    const q = val("institution-search").toLowerCase();
    const list = state.institutions.filter((item) =>
      !q || item.name.toLowerCase().includes(q) || item.process.toLowerCase().includes(q)
    );
    document.getElementById("app").innerHTML = layout(`
      ${pageHero("Instituciones", "Avance de digitalización por etapas, checklists y notas de seguimiento.")}
      <div class="toolbar">
        <div class="filters"><input id="institution-search" placeholder="Buscar institución o trámite" value="${esc(q)}" oninput="App.renderInstitutions()"></div>
        ${currentUser().role === "admin" ? `<button class="btn primary" onclick="App.showInstitutionModal()">+ Agregar</button>` : ""}
      </div>
      <div class="card table-wrap">
        <table>
          <thead><tr><th>Institución</th><th>Trámite / proceso</th><th>Estado</th><th>Avance</th><th></th></tr></thead>
          <tbody>
            ${list.map((item) => {
              const pct = progress(item.stages);
              const status = statusFor(pct);
              return `<tr>
                <td><strong>${esc(item.name)}</strong></td>
                <td>${esc(item.process)}</td>
                <td><span class="badge ${status[1]}">${status[0]}</span></td>
                <td><div class="progress"><span style="width:${pct}%"></span></div><small>${pct}%</small></td>
                <td><a class="btn secondary small" href="#/institutions/${item.id}" onclick="event.preventDefault();App.editInstitution('${item.id}')">Gestionar</a></td>
              </tr>`;
            }).join("") || `<tr><td colspan="5"><div class="empty">No se encontraron registros.</div></td></tr>`}
          </tbody>
        </table>
      </div>`, "institutions");
  }

  function showInstitutionModal(id) {
    const item = state.institutions.find((row) => row.id === id);
    showModal(`${item ? "Editar" : "Nueva"} institución`, `
      <div class="form-grid">
        <div class="field"><label>Institución *</label><input id="modal-inst-name" value="${esc(item ? item.name : "")}"></div>
        <div class="field"><label>Trámite / proceso *</label><input id="modal-inst-process" value="${esc(item ? item.process : "")}"></div>
        <div class="field full"><label>Notas</label><textarea id="modal-inst-notes">${esc(item ? item.notes : "")}</textarea></div>
      </div>
      <div class="form-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="App.saveInstitution('${id || ""}')">Guardar</button></div>`);
  }

  function saveInstitution(id) {
    const name = val("modal-inst-name");
    const processName = val("modal-inst-process");
    if (!name || !processName) return toast("Complete institución y proceso.");
    const item = state.institutions.find((row) => row.id === id);
    if (item) {
      item.name = name;
      item.process = processName;
      item.notes = val("modal-inst-notes");
      item.updatedAt = new Date().toISOString();
    } else {
      state.institutions.unshift({
        id: uid(), name, process: processName,
        notes: val("modal-inst-notes"),
        stages: STAGES.map(() => false),
        updatedAt: new Date().toISOString()
      });
    }
    saveState();
    closeModal();
    renderInstitutions();
    toast("Institución guardada.");
  }

  function editInstitution(id) {
    const item = state.institutions.find((row) => row.id === id);
    if (!item) return;
    const pct = progress(item.stages);
    document.getElementById("app").innerHTML = layout(`
      ${pageHero(item.name, item.process, "Seguimiento institucional")}
      <div class="section-head">
        <div><h2>Etapas de digitalización</h2><p>Avance actual: ${pct}%</p></div>
        <button class="btn ghost" onclick="App.renderInstitutions()">← Volver</button>
      </div>
      <div class="grid two">
        <section class="card pad">
          <div class="check-stages">
            ${STAGES.map((stage, index) => `<div class="stage">
              <label for="stage-${index}">${index + 1}. ${esc(stage)}</label>
              <input id="stage-${index}" type="checkbox" ${item.stages[index] ? "checked" : ""} onchange="App.toggleStage('${id}',${index},this.checked)">
            </div>`).join("")}
          </div>
        </section>
        <section class="card pad">
          <div class="field"><label>Notas de seguimiento</label><textarea id="institution-notes" style="min-height:260px">${esc(item.notes)}</textarea></div>
          <div class="form-actions"><button class="btn primary" onclick="App.saveInstitutionNotes('${id}')">Guardar notas</button></div>
        </section>
      </div>`, "institutions");
  }

  function toggleStage(id, index, value) {
    const item = state.institutions.find((row) => row.id === id);
    if (!item) return;
    item.stages[index] = value;
    item.updatedAt = new Date().toISOString();
    saveState();
    editInstitution(id);
  }

  function saveInstitutionNotes(id) {
    const item = state.institutions.find((row) => row.id === id);
    if (!item) return;
    item.notes = val("institution-notes");
    item.updatedAt = new Date().toISOString();
    saveState();
    toast("Notas guardadas.");
  }

  function renderSurveys() {
    if (!can("survey")) return forbidden();
    document.getElementById("app").innerHTML = layout(`
      ${pageHero("Trámites - Estado", "Levantamientos del estado actual de trámites por institución.")}
      <div class="section-head">
        <div><h2>Levantamientos</h2><p>${state.surveys.length} registros</p></div>
        <a class="btn primary" href="#/survey/new">+ Nuevo levantamiento</a>
      </div>
      <div class="card table-wrap">
        ${state.surveys.length ? `<table>
          <thead><tr><th>Institución</th><th>Encargado</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
          <tbody>${state.surveys.map((item) => `<tr>
            <td><strong>${esc(item.institution)}</strong></td><td>${esc(item.manager)}</td>
            <td><span class="badge ${item.status === "Digitalizado y en producción" ? "green" : "amber"}">${esc(item.status)}</span></td>
            <td>${formatDate(item.date)}</td>
            <td><a class="btn secondary small" href="#/survey/${item.id}">Editar</a> <button class="btn danger small" onclick="App.deleteRecord('surveys','${item.id}')">Eliminar</button></td>
          </tr>`).join("")}</tbody>
        </table>` : `<div class="empty"><div class="empty-icon">▤</div>No hay levantamientos registrados.</div>`}
      </div>`, "survey");
  }

  function renderSurveyForm(id) {
    if (!can("survey")) return forbidden();
    const item = state.surveys.find((row) => row.id === id) || {};
    document.getElementById("app").innerHTML = layout(`
      ${pageHero(item.id ? "Editar levantamiento" : "Nuevo levantamiento", "Información institucional, estado de digitalización y necesidades de acompañamiento.")}
      <form class="card form-card" onsubmit="App.saveSurvey(event,'${item.id || ""}')">
        <div class="form-grid">
          <div class="field"><label>Institución *</label><select id="survey-institution" required>
            <option value="">Seleccione</option>${DEFAULT_INSTITUTIONS.map((name) => `<option ${item.institution === name ? "selected" : ""}>${esc(name)}</option>`).join("")}
          </select></div>
          <div class="field"><label>Encargado de área *</label><input id="survey-manager" required value="${esc(item.manager || "")}"></div>
          <div class="field"><label>Correo institucional *</label><input id="survey-email" type="email" required value="${esc(item.email || "")}"></div>
          <div class="field"><label>Celular</label><input id="survey-phone" value="${esc(item.phone || "")}"></div>
          <div class="field"><label>Estado actual *</label><select id="survey-status" required>
            ${["Digitalizado y en producción", "En proceso", "No iniciado", "Otro"].map((value) => `<option ${item.status === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></div>
          <div class="field"><label>¿Migrada a infraestructura institucional?</label><select id="survey-migrated">
            ${["Sí", "No", "En proceso"].map((value) => `<option ${item.migrated === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></div>
          <div class="field"><label>¿Personal técnico capacitado?</label><select id="survey-trained">
            ${["Sí", "No", "Parcialmente"].map((value) => `<option ${item.trained === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></div>
          <div class="field"><label>¿Requiere acompañamiento?</label><select id="survey-support">
            ${["Sí", "No"].map((value) => `<option ${item.support === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></div>
          <div class="field full"><label>Observaciones</label><textarea id="survey-notes">${esc(item.notes || "")}</textarea></div>
        </div>
        <div class="form-actions">
          <a class="btn ghost" href="#/surveys">Cancelar</a>
          ${item.id ? `<button type="button" class="btn secondary" onclick="App.exportRecord('survey','${item.id}')">Exportar JSON</button>` : ""}
          <button class="btn primary">Guardar levantamiento</button>
        </div>
      </form>`, "survey");
  }

  function saveSurvey(event, id) {
    event.preventDefault();
    const record = {
      id: id || uid(),
      institution: val("survey-institution"),
      manager: val("survey-manager"),
      email: val("survey-email"),
      phone: val("survey-phone"),
      status: val("survey-status"),
      migrated: val("survey-migrated"),
      trained: val("survey-trained"),
      support: val("survey-support"),
      notes: val("survey-notes"),
      date: new Date().toISOString().slice(0, 10),
      ownerId: currentUser().id
    };
    const index = state.surveys.findIndex((row) => row.id === id);
    if (index >= 0) state.surveys[index] = record;
    else state.surveys.unshift(record);
    saveState();
    go("/surveys");
    render();
    toast("Levantamiento guardado.");
  }

  function renderTechnical(id) {
    if (!can("technical")) return forbidden();
    if (!id) {
      document.getElementById("app").innerHTML = layout(`
        ${pageHero("Trámites - Técnica", "Fichas técnicas, requisitos, flujo de actividades y racionalización.")}
        <div class="section-head"><div><h2>Fichas técnicas</h2><p>${state.technicalRecords.length} registros</p></div><a class="btn primary" href="#/technical/new">+ Nueva ficha</a></div>
        <div class="card table-wrap">
          ${state.technicalRecords.length ? `<table><thead><tr><th>Institución</th><th>Trámite</th><th>Responsable</th><th>Fecha</th><th></th></tr></thead>
          <tbody>${state.technicalRecords.map((item) => `<tr><td><strong>${esc(item.institution)}</strong></td><td>${esc(item.processName)}</td><td>${esc(item.leader)}</td><td>${formatDate(item.date)}</td><td><a class="btn secondary small" href="#/technical/${item.id}">Editar</a> <button class="btn danger small" onclick="App.deleteRecord('technicalRecords','${item.id}')">Eliminar</button></td></tr>`).join("")}</tbody></table>`
          : `<div class="empty"><div class="empty-icon">⌕</div>No hay fichas técnicas registradas.</div>`}
        </div>`, "technical");
      return;
    }
    const item = state.technicalRecords.find((row) => row.id === id) || {};
    document.getElementById("app").innerHTML = layout(`
      ${pageHero(item.id ? "Editar ficha técnica" : "Nueva ficha técnica", "Información del trámite, fundamento, requisitos, flujo y propuesta racionalizada.")}
      <form class="card form-card" onsubmit="App.saveTechnical(event,'${item.id || ""}')">
        <div class="form-grid">
          <div class="field"><label>Institución *</label><input id="tech-institution" required value="${esc(item.institution || "")}"></div>
          <div class="field"><label>Código del trámite</label><input id="tech-code" value="${esc(item.code || "")}"></div>
          <div class="field full"><label>Nombre del trámite *</label><input id="tech-name" required value="${esc(item.processName || "")}"></div>
          <div class="field"><label>Líder del trámite *</label><input id="tech-leader" required value="${esc(item.leader || "")}"></div>
          <div class="field"><label>Correo del líder</label><input id="tech-email" type="email" value="${esc(item.email || "")}"></div>
          <div class="field full"><label>Objetivo</label><textarea id="tech-objective">${esc(item.objective || "")}</textarea></div>
          <div class="field full"><label>Marco legal</label><textarea id="tech-legal">${esc(item.legal || "")}</textarea></div>
          <div class="field full"><label>Requisitos (uno por línea)</label><textarea id="tech-requirements">${esc((item.requirements || []).join("\n"))}</textarea></div>
          <div class="field full"><label>Flujo actual (una actividad por línea)</label><textarea id="tech-flow">${esc((item.flow || []).join("\n"))}</textarea></div>
          <div class="field full"><label>Propuesta de racionalización</label><textarea id="tech-rationalization">${esc(item.rationalization || "")}</textarea></div>
          <div class="field"><label>Tiempo actual (días)</label><input id="tech-current-days" type="number" min="0" value="${esc(item.currentDays || "")}"></div>
          <div class="field"><label>Tiempo propuesto (días)</label><input id="tech-target-days" type="number" min="0" value="${esc(item.targetDays || "")}"></div>
        </div>
        <div class="form-actions">
          <a class="btn ghost" href="#/technical">Cancelar</a>
          ${item.id ? `<button type="button" class="btn secondary" onclick="App.exportRecord('technical','${item.id}')">Descargar JSON</button><button type="button" class="btn secondary" onclick="window.print()">Imprimir / PDF</button>` : ""}
          <button class="btn primary">Guardar ficha</button>
        </div>
      </form>`, "technical");
  }

  function saveTechnical(event, id) {
    event.preventDefault();
    const lines = (field) => val(field).split("\n").map((line) => line.trim()).filter(Boolean);
    const record = {
      id: id || uid(),
      institution: val("tech-institution"),
      code: val("tech-code"),
      processName: val("tech-name"),
      leader: val("tech-leader"),
      email: val("tech-email"),
      objective: val("tech-objective"),
      legal: val("tech-legal"),
      requirements: lines("tech-requirements"),
      flow: lines("tech-flow"),
      rationalization: val("tech-rationalization"),
      currentDays: val("tech-current-days"),
      targetDays: val("tech-target-days"),
      date: new Date().toISOString().slice(0, 10),
      ownerId: currentUser().id
    };
    const index = state.technicalRecords.findIndex((row) => row.id === id);
    if (index >= 0) state.technicalRecords[index] = record;
    else state.technicalRecords.unshift(record);
    saveState();
    go("/technical");
    render();
    toast("Ficha técnica guardada.");
  }

  function renderEvents() {
    if (!can("events")) return forbidden();
    document.getElementById("app").innerHTML = layout(`
      ${pageHero("Eventos y asistencia", "Cree eventos, comparta un enlace o QR y reciba registros de asistencia.")}
      <div class="section-head"><div><h2>Eventos registrados</h2><p>${state.events.length} eventos</p></div><a class="btn primary" href="#/event/new">+ Nuevo evento</a></div>
      <div class="grid three">
        ${state.events.map((item) => {
          const count = state.attendance.filter((row) => row.eventId === item.id).length;
          return `<article class="card event-card">
            <span class="badge ${item.active ? "green" : "red"}">${item.active ? "Activo" : "Cerrado"}</span>
            <h3>${esc(item.title)}</h3>
            <div class="meta"><span>Fecha: ${formatDate(item.date)}</span><span>${esc(item.modality)}</span><span>${count} asistentes</span></div>
            <a class="btn secondary" href="#/event/${item.id}">Abrir</a>
          </article>`;
        }).join("") || `<div class="card empty" style="grid-column:1/-1"><div class="empty-icon">▦</div>No hay eventos registrados.</div>`}
      </div>`, "events");
  }

  function renderEvent(id) {
    if (!can("events")) return forbidden();
    const item = state.events.find((row) => row.id === id);
    if (!item) {
      document.getElementById("app").innerHTML = layout(`
        ${pageHero("Nuevo evento", "Complete los datos para generar el enlace público de asistencia.")}
        <form class="card form-card" onsubmit="App.saveEvent(event,'')">
          ${eventFields({ active: true })}
          <div class="form-actions"><a class="btn ghost" href="#/events">Cancelar</a><button class="btn primary">Guardar y generar enlace</button></div>
        </form>`, "events");
      return;
    }
    const publicUrl = location.href.split("#")[0] + "#/attendance/" + item.id;
    const qr = "https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=" + encodeURIComponent(publicUrl);
    const attendees = state.attendance.filter((row) => row.eventId === item.id);
    document.getElementById("app").innerHTML = layout(`
      ${pageHero(item.title, `${formatDate(item.date)} · ${item.time || "Sin hora"} · ${item.place || "Sin ubicación"}`, item.active ? "Evento activo" : "Evento cerrado")}
      <div class="grid two" style="margin-top:18px">
        <form class="card form-card" onsubmit="App.saveEvent(event,'${item.id}')">
          ${eventFields(item)}
          <div class="form-actions">
            <a class="btn ghost" href="#/events">Volver</a>
            <button type="button" class="btn ${item.active ? "danger" : "success"}" onclick="App.toggleEvent('${item.id}')">${item.active ? "Cerrar registro" : "Reabrir registro"}</button>
            <button class="btn primary">Guardar cambios</button>
          </div>
        </form>
        <div>
          <section class="card pad">
            <h3 style="margin-top:0;color:var(--navy)">Registro público</h3>
            <div class="qr-box"><img src="${qr}" alt="Código QR del evento"></div>
            <div class="field" style="margin-top:15px"><label>Enlace</label><input id="public-link" readonly value="${esc(publicUrl)}"></div>
            <div class="form-actions" style="justify-content:flex-start">
              <button class="btn secondary" onclick="App.copyPublicLink()">Copiar enlace</button>
              <a class="btn ghost" target="_blank" href="${esc(publicUrl)}">Abrir formulario</a>
            </div>
          </section>
        </div>
      </div>
      <div class="section-head"><div><h2>Asistentes</h2><p>${attendees.length} registros</p></div><button class="btn secondary" onclick="App.exportAttendance('${item.id}')">Exportar CSV</button></div>
      <div class="card table-wrap">
        ${attendees.length ? `<table><thead><tr><th>Nombre</th><th>Correo</th><th>Cargo</th><th>Institución</th><th>Teléfono</th><th>Registro</th><th></th></tr></thead>
        <tbody>${attendees.map((row) => `<tr><td><strong>${esc(row.fullName)}</strong></td><td>${esc(row.email)}</td><td>${esc(row.jobTitle)}</td><td>${esc(row.institution)}</td><td>${esc(row.phone)}</td><td>${formatDate(row.createdAt)}</td><td><button class="btn danger small" onclick="App.deleteAttendance('${row.id}','${item.id}')">Eliminar</button></td></tr>`).join("")}</tbody></table>`
        : `<div class="empty">Todavía no hay asistentes registrados.</div>`}
      </div>`, "events");
  }

  function eventFields(item) {
    return `<div class="form-grid">
      <div class="field full"><label>Título *</label><input id="event-title" required value="${esc(item.title || "")}"></div>
      <div class="field"><label>Fecha *</label><input id="event-date" required type="date" value="${esc(item.date || new Date().toISOString().slice(0, 10))}"></div>
      <div class="field"><label>Hora</label><input id="event-time" type="time" value="${esc(item.time || "")}"></div>
      <div class="field"><label>Modalidad *</label><select id="event-modality">
        ${["Presencial", "Virtual", "Híbrida"].map((value) => `<option ${item.modality === value ? "selected" : ""}>${value}</option>`).join("")}
      </select></div>
      <div class="field"><label>Institución beneficiaria</label><input id="event-institution" value="${esc(item.institution || "")}"></div>
      <div class="field full"><label>Lugar o enlace</label><input id="event-place" value="${esc(item.place || "")}"></div>
      <div class="field full"><label>Descripción</label><textarea id="event-description">${esc(item.description || "")}</textarea></div>
    </div>`;
  }

  function saveEvent(event, id) {
    event.preventDefault();
    const existing = state.events.find((row) => row.id === id);
    const record = {
      id: id || uid(),
      title: val("event-title"),
      date: val("event-date"),
      time: val("event-time"),
      modality: val("event-modality"),
      institution: val("event-institution"),
      place: val("event-place"),
      description: val("event-description"),
      active: existing ? existing.active : true,
      ownerId: currentUser().id,
      createdAt: existing ? existing.createdAt : new Date().toISOString()
    };
    const index = state.events.findIndex((row) => row.id === id);
    if (index >= 0) state.events[index] = record;
    else state.events.unshift(record);
    saveState();
    go("/event/" + record.id);
    render();
    toast("Evento guardado.");
  }

  function toggleEvent(id) {
    const item = state.events.find((row) => row.id === id);
    if (!item) return;
    item.active = !item.active;
    saveState();
    renderEvent(id);
  }

  function renderPublicAttendance(id) {
    const event = state.events.find((item) => item.id === id);
    let body;
    if (!event) {
      body = `<h1>Evento no encontrado</h1><p>El enlace no corresponde a un evento disponible.</p>`;
    } else if (!event.active) {
      body = `<span class="badge red">Registro cerrado</span><h1>${esc(event.title)}</h1><p>El formulario de asistencia ya no está disponible.</p>`;
    } else {
      body = `
        <span class="badge green">Registro abierto</span>
        <h1>${esc(event.title)}</h1>
        <p style="color:var(--muted)">${formatDate(event.date)} · ${esc(event.time || "Sin hora")} · ${esc(event.place || event.modality)}</p>
        <form onsubmit="App.registerAttendance(event,'${event.id}')" style="margin-top:24px">
          <div class="form-grid">
            <div class="field full"><label>Nombre completo *</label><input id="att-name" required></div>
            <div class="field"><label>Correo *</label><input id="att-email" type="email" required></div>
            <div class="field"><label>Teléfono</label><input id="att-phone"></div>
            <div class="field"><label>Cargo</label><input id="att-job"></div>
            <div class="field"><label>Institución</label><input id="att-institution"></div>
          </div>
          <div id="attendance-message" class="error"></div>
          <button class="btn primary" style="width:100%;margin-top:15px">Registrar mi asistencia</button>
        </form>`;
    }
    document.getElementById("app").innerHTML = `<div class="public-wrap"><section class="public-card">${body}</section></div>`;
  }

  function registerAttendance(event, eventId) {
    event.preventDefault();
    const email = val("att-email").toLowerCase();
    const duplicate = state.attendance.some((row) => row.eventId === eventId && row.email.toLowerCase() === email);
    if (duplicate) {
      document.getElementById("attendance-message").textContent = "Este correo ya registró su asistencia.";
      return;
    }
    state.attendance.push({
      id: uid(), eventId,
      fullName: val("att-name"),
      email,
      phone: val("att-phone"),
      jobTitle: val("att-job"),
      institution: val("att-institution"),
      createdAt: new Date().toISOString()
    });
    saveState();
    document.querySelector(".public-card").innerHTML = `<span class="badge green">Registro completado</span><h1>Asistencia registrada</h1><p>Gracias, ${esc(val("att-name"))}. Tu información fue guardada correctamente.</p>`;
  }

  function copyPublicLink() {
    const input = document.getElementById("public-link");
    navigator.clipboard.writeText(input.value).then(() => toast("Enlace copiado."));
  }

  function exportAttendance(eventId) {
    const rows = state.attendance.filter((row) => row.eventId === eventId);
    const quote = (value) => `"${String(value || "").replace(/"/g, '""')}"`;
    const csv = [
      ["Nombre", "Correo", "Cargo", "Institución", "Teléfono", "Fecha"].map(quote).join(","),
      ...rows.map((row) => [row.fullName, row.email, row.jobTitle, row.institution, row.phone, row.createdAt].map(quote).join(","))
    ].join("\r\n");
    download("asistencia.csv", "\ufeff" + csv, "text/csv;charset=utf-8");
  }

  function deleteAttendance(id, eventId) {
    state.attendance = state.attendance.filter((row) => row.id !== id);
    saveState();
    renderEvent(eventId);
  }

  function renderCalendar() {
    if (!can("calendar")) return forbidden();
    const year = Number(new URLSearchParams(location.hash.split("?")[1] || "").get("year")) || new Date().getFullYear();
    const byDate = {};
    state.calendar.forEach((item) => {
      (byDate[item.date] = byDate[item.date] || []).push(item);
    });
    document.getElementById("app").innerHTML = layout(`
      ${pageHero("Calendario " + year, "Eventos, reuniones y fechas clave de la unidad.")}
      <div class="toolbar">
        <div class="filters">
          <a class="btn ghost" href="#/calendar?year=${year - 1}">← ${year - 1}</a>
          <a class="btn ghost" href="#/calendar?year=${year + 1}">${year + 1} →</a>
        </div>
        <button class="btn primary" onclick="App.showCalendarModal()">+ Evento</button>
      </div>
      <div class="calendar-grid">
        ${Array.from({ length: 12 }, (_, month) => monthHtml(year, month, byDate)).join("")}
      </div>
      <div class="section-head"><div><h2>Próximos eventos</h2></div></div>
      <div class="card table-wrap">
        ${state.calendar.length ? `<table><thead><tr><th>Fecha</th><th>Título</th><th>Descripción</th><th></th></tr></thead>
        <tbody>${state.calendar.slice().sort((a, b) => a.date.localeCompare(b.date)).map((item) => `<tr><td>${formatDate(item.date)} ${esc(item.time)}</td><td><strong>${esc(item.title)}</strong></td><td>${esc(item.description)}</td><td><button class="btn danger small" onclick="App.deleteRecord('calendar','${item.id}')">Eliminar</button></td></tr>`).join("")}</tbody></table>`
        : `<div class="empty">No hay eventos en el calendario.</div>`}
      </div>`, "calendar");
  }

  function monthHtml(year, month, byDate) {
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const total = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    let cells = ["L", "M", "X", "J", "V", "S", "D"].map((day) => `<span class="day head">${day}</span>`).join("");
    cells += Array.from({ length: offset }, () => `<span class="day"></span>`).join("");
    for (let day = 1; day <= total; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
      cells += `<button class="day active ${isToday ? "today" : ""} ${byDate[date] ? "has-event" : ""}" title="${esc(byDate[date] ? byDate[date].map((item) => item.title).join(", ") : "Agregar evento")}" onclick="App.showCalendarModal('${date}')">${day}</button>`;
    }
    return `<section class="card month"><h4>${monthNames[month]}</h4><div class="days">${cells}</div></section>`;
  }

  function showCalendarModal(date) {
    showModal("Nuevo evento de calendario", `
      <div class="form-grid">
        <div class="field full"><label>Título *</label><input id="cal-title"></div>
        <div class="field"><label>Fecha *</label><input id="cal-date" type="date" value="${esc(date || new Date().toISOString().slice(0, 10))}"></div>
        <div class="field"><label>Hora</label><input id="cal-time" type="time"></div>
        <div class="field full"><label>Descripción</label><textarea id="cal-description"></textarea></div>
      </div>
      <div class="form-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="App.saveCalendar()">Guardar</button></div>`);
  }

  function saveCalendar() {
    if (!val("cal-title") || !val("cal-date")) return toast("Complete título y fecha.");
    state.calendar.push({
      id: uid(), title: val("cal-title"), date: val("cal-date"),
      time: val("cal-time"), description: val("cal-description")
    });
    saveState();
    closeModal();
    renderCalendar();
  }

  function renderDocuments() {
    if (!can("documents")) return forbidden();
    renderLibrary("documents", "Documentos", "Registro central de documentos y enlaces de la unidad.", [
      ["name", "Nombre"], ["type", "Tipo"], ["author", "Responsable"], ["date", "Fecha"], ["url", "Enlace"]
    ]);
  }

  function renderRepository() {
    if (!can("repository")) return forbidden();
    renderLibrary("resources", "Repositorio", "Enlaces a carpetas, plataformas, normativa y recursos compartidos.", [
      ["name", "Nombre"], ["category", "Categoría"], ["description", "Descripción"], ["url", "Enlace"]
    ]);
  }

  function renderLibrary(kind, title, description, fields) {
    const items = state[kind];
    document.getElementById("app").innerHTML = layout(`
      ${pageHero(title, description)}
      <div class="section-head"><div><h2>${items.length} ${title.toLowerCase()}</h2></div><button class="btn primary" onclick="App.showLibraryModal('${kind}')">+ Agregar</button></div>
      <div class="card table-wrap">
        ${items.length ? `<table><thead><tr>${fields.slice(0, -1).map((field) => `<th>${field[1]}</th>`).join("")}<th></th></tr></thead>
        <tbody>${items.map((item) => `<tr>${fields.slice(0, -1).map((field) => `<td>${field[0] === "name" ? "<strong>" : ""}${esc(item[field[0]])}${field[0] === "name" ? "</strong>" : ""}</td>`).join("")}
        <td>${item.url ? `<a class="btn secondary small" target="_blank" rel="noopener" href="${esc(item.url)}">Abrir</a>` : ""} <button class="btn danger small" onclick="App.deleteRecord('${kind}','${item.id}')">Eliminar</button></td></tr>`).join("")}</tbody></table>`
        : `<div class="empty"><div class="empty-icon">▧</div>No hay registros todavía.</div>`}
      </div>`, kind === "documents" ? "documents" : "repository");
  }

  function showLibraryModal(kind) {
    const isDoc = kind === "documents";
    showModal(isDoc ? "Nuevo documento" : "Nuevo recurso", `
      <div class="form-grid">
        <div class="field full"><label>Nombre *</label><input id="lib-name"></div>
        ${isDoc ? `
          <div class="field"><label>Tipo</label><select id="lib-type"><option>Acta</option><option>Informe</option><option>Instructivo</option><option>Presentación</option><option>Otro</option></select></div>
          <div class="field"><label>Responsable</label><input id="lib-author"></div>
          <div class="field"><label>Fecha</label><input id="lib-date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
        ` : `
          <div class="field"><label>Categoría</label><input id="lib-category" placeholder="Actas, plantillas, normativa..."></div>
          <div class="field full"><label>Descripción</label><textarea id="lib-description"></textarea></div>
        `}
        <div class="field full"><label>Enlace URL</label><input id="lib-url" type="url" placeholder="https://"></div>
      </div>
      <div class="form-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="App.saveLibrary('${kind}')">Guardar</button></div>`);
  }

  function saveLibrary(kind) {
    if (!val("lib-name")) return toast("Ingrese un nombre.");
    const item = { id: uid(), name: val("lib-name"), url: val("lib-url") };
    if (kind === "documents") {
      Object.assign(item, { type: val("lib-type"), author: val("lib-author"), date: val("lib-date") });
    } else {
      Object.assign(item, { category: val("lib-category") || "General", description: val("lib-description") });
    }
    state[kind].unshift(item);
    saveState();
    closeModal();
    kind === "documents" ? renderDocuments() : renderRepository();
  }

  function renderAccess() {
    if (currentUser().role !== "admin") return forbidden();
    document.getElementById("app").innerHTML = layout(`
      ${pageHero("Gestión de accesos", "Cree usuarios y defina los módulos habilitados para cada funcionario.", "Administración")}
      <div class="section-head"><div><h2>Usuarios</h2><p>${state.users.length} cuentas</p></div><button class="btn primary" onclick="App.showUserModal()">+ Nuevo usuario</button></div>
      <div class="card table-wrap">
        <table><thead><tr><th>Usuario</th><th>Rol</th>${Object.values(PERMISSIONS).map((label) => `<th>${esc(label)}</th>`).join("")}<th></th></tr></thead>
        <tbody>${state.users.map((user) => `<tr>
          <td><strong>${esc(user.fullName)}</strong><br><small>${esc(user.email)}</small></td>
          <td><span class="badge ${user.role === "admin" ? "green" : ""}">${user.role}</span></td>
          ${Object.keys(PERMISSIONS).map((key) => `<td><input type="checkbox" ${user.role === "admin" || (user.permissions || {})[key] ? "checked" : ""} ${user.role === "admin" ? "disabled" : ""} onchange="App.setPermission('${user.id}','${key}',this.checked)"></td>`).join("")}
          <td>${user.id !== currentUser().id ? `<button class="btn danger small" onclick="App.deleteUser('${user.id}')">Eliminar</button>` : ""}</td>
        </tr>`).join("")}</tbody></table>
      </div>`, "access");
  }

  function showUserModal() {
    showModal("Nuevo usuario", `
      <div class="form-grid">
        <div class="field"><label>Nombre *</label><input id="user-name"></div>
        <div class="field"><label>Correo *</label><input id="user-email" type="email"></div>
        <div class="field"><label>Contraseña temporal *</label><input id="user-password" type="password" minlength="8"></div>
        <div class="field"><label>Rol</label><select id="user-role"><option value="staff">Funcionario</option><option value="admin">Administrador</option></select></div>
      </div>
      <div class="form-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="App.saveUser()">Crear usuario</button></div>`);
  }

  async function saveUser() {
    const email = val("user-email").toLowerCase();
    const password = val("user-password");
    if (!val("user-name") || !email || password.length < 8) return toast("Complete los datos y use una contraseña de 8 caracteres.");
    if (state.users.some((user) => user.email === email)) return toast("Ese correo ya está registrado.");
    const salt = uid();
    state.users.push({
      id: uid(), fullName: val("user-name"), email, salt,
      passwordHash: await hashPassword(password, salt),
      role: val("user-role"),
      permissions: Object.fromEntries(Object.keys(PERMISSIONS).map((key) => [key, false])),
      createdAt: new Date().toISOString()
    });
    saveState();
    closeModal();
    renderAccess();
    toast("Usuario creado.");
  }

  function setPermission(userId, key, value) {
    const user = state.users.find((item) => item.id === userId);
    if (!user) return;
    user.permissions = user.permissions || {};
    user.permissions[key] = value;
    saveState();
  }

  function deleteUser(userId) {
    if (!confirm("¿Eliminar este usuario?")) return;
    state.users = state.users.filter((user) => user.id !== userId);
    saveState();
    renderAccess();
  }

  function deleteRecord(kind, id) {
    if (!confirm("¿Eliminar este registro?")) return;
    state[kind] = state[kind].filter((item) => item.id !== id);
    saveState();
    const renderers = {
      surveys: renderSurveys,
      technicalRecords: () => renderTechnical(),
      calendar: renderCalendar,
      documents: renderDocuments,
      resources: renderRepository
    };
    if (renderers[kind]) renderers[kind]();
  }

  function exportRecord(kind, id) {
    const source = kind === "survey" ? state.surveys : state.technicalRecords;
    const item = source.find((row) => row.id === id);
    if (item) download(`${kind}-${id}.json`, JSON.stringify(item, null, 2));
  }

  function forbidden() {
    document.getElementById("app").innerHTML = layout(`
      <section class="card empty"><div class="empty-icon">🔒</div><h2>Acceso restringido</h2><p>Tu cuenta no tiene permiso para abrir este módulo.</p><a class="btn primary" href="#/dashboard">Ir al inicio</a></section>`, "");
  }

  function showModal(title, content) {
    const node = document.createElement("div");
    node.id = "modal-root";
    node.className = "modal-backdrop";
    node.innerHTML = `<section class="modal"><h2>${esc(title)}</h2>${content}</section>`;
    node.addEventListener("click", (event) => {
      if (event.target === node) closeModal();
    });
    document.body.appendChild(node);
  }

  function closeModal() {
    const node = document.getElementById("modal-root");
    if (node) node.remove();
  }

  window.App = {
    setup, login, logout,
    renderInstitutions, showInstitutionModal, saveInstitution, editInstitution,
    toggleStage, saveInstitutionNotes,
    saveSurvey, saveTechnical,
    saveEvent, toggleEvent, registerAttendance, copyPublicLink,
    exportAttendance, deleteAttendance,
    showCalendarModal, saveCalendar,
    showLibraryModal, saveLibrary,
    showUserModal, saveUser, setPermission, deleteUser,
    deleteRecord, exportRecord, closeModal
  };

  window.addEventListener("hashchange", render);
  render();
})();
