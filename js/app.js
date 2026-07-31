// =============================================
// APP.JS — Lógica de Agendamento
// =============================================

// Estado global da aplicação
const state = {
  selectedDate: null,
  busySlots: [],       // horários já ocupados no Google Calendar
  loadingCalendar: false,
};

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
  renderCalendar();
  updatePhoneLink();
});

// Atualiza o link do WhatsApp com o número configurado
function updatePhoneLink() {
  const link = document.getElementById("wpp-link");
  if (link) {
    link.href = `https://wa.me/${CONFIG.barbershopPhone}`;
  }
}

// =============================================
// CALENDÁRIO — Navegação de datas
// =============================================

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function renderCalendar() {
  const today = new Date();
  const grid = document.getElementById("calendar-grid");
  const monthLabel = document.getElementById("calendar-month");

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  monthLabel.textContent = new Date(currentYear, currentMonth).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  grid.innerHTML = "";

  // Cabeçalho: Dom Seg Ter Qua Qui Sex Sáb
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  weekDays.forEach((d) => {
    const el = document.createElement("div");
    el.className = "cal-header";
    el.textContent = d;
    grid.appendChild(el);
  });

  // Espaços em branco antes do dia 1
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement("div");
    el.className = "cal-empty";
    grid.appendChild(el);
  }

  // Dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dayOfWeek = date.getDay();
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isTooFar =
      (date - today) / (1000 * 60 * 60 * 24) > CONFIG.maxDaysAhead;
    const isClosed = CONFIG.workingHours[dayOfWeek].length === 0;
    const isSelected =
      state.selectedDate &&
      date.toDateString() === state.selectedDate.toDateString();

    const el = document.createElement("button");
    el.className = "cal-day";
    el.textContent = day;

    if (isPast || isTooFar || isClosed) {
      el.classList.add("cal-disabled");
      el.disabled = true;
      if (isClosed) el.title = "Fechado";
    } else {
      el.classList.add("cal-available");
      if (isSelected) el.classList.add("cal-selected");
      el.addEventListener("click", () => selectDate(date));
    }

    grid.appendChild(el);
  }
}

function prevMonth() {
  const today = new Date();
  if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) return;
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
}

function nextMonth() {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + CONFIG.maxDaysAhead);
  const maxMonth = maxDate.getMonth();
  const maxYear = maxDate.getFullYear();
  if (currentYear > maxYear || (currentYear === maxYear && currentMonth >= maxMonth)) return;
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
}

// =============================================
// SELEÇÃO DE DATA — Busca horários no Google Calendar
// =============================================

async function selectDate(date) {
  state.selectedDate = date;
  renderCalendar();

  const section = document.getElementById("slots-section");
  const slotsGrid = document.getElementById("slots-grid");
  const dateLabel = document.getElementById("selected-date-label");

  dateLabel.textContent = date.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  section.classList.remove("hidden");
  slotsGrid.innerHTML = '<div class="slots-loading"><div class="spinner"></div><span>Verificando horários...</span></div>';

  // Scroll suave até os horários
  setTimeout(() => section.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

  // Busca eventos do Google Calendar
  await fetchBusySlots(date);
  renderSlots(date);
}

// =============================================
// GOOGLE CALENDAR — Leitura de eventos (somente leitura)
// =============================================

async function fetchBusySlots(date) {
  state.busySlots = [];

  if (
    CONFIG.googleApiKey === "SUA_CHAVE_DE_API_AQUI" ||
    CONFIG.calendarId === "SEU_CALENDARIO_ID@gmail.com"
  ) {
    console.warn("[Barbearia] Configure googleApiKey e calendarId em js/config.js.");
    return;
  }

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CONFIG.calendarId)}/events`
  );
  url.searchParams.set("key", CONFIG.googleApiKey);
  url.searchParams.set("timeMin", start.toISOString());
  url.searchParams.set("timeMax", end.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("fields", "items(start,end,status)");

  try {
    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const err = await resp.json();
      console.error("[Calendar API]", err.error?.message || resp.status);
      return;
    }
    const data = await resp.json();

    if (!data.items || data.items.length === 0) {
      console.warn(
        "[Calendar API] Nenhum evento retornado. Verifique se a agenda está compartilhada publicamente:\n" +
        "Google Calendar → ⋮ ao lado da agenda → Configurações → Permissões de acesso → " +
        "marque 'Disponibilizar ao público'"
      );
    }

    state.busySlots = (data.items || [])
      .filter((e) => e.status !== "cancelled")
      .map((e) => {
        // dateTime vem em ISO com fuso (ex: "2025-08-05T10:00:00-03:00")
        // date vem sem hora (eventos de dia inteiro)
        const s = new Date(e.start.dateTime || e.start.date + "T00:00:00");
        const en = new Date(e.end.dateTime   || e.end.date   + "T23:59:59");
        console.log(`[Calendar] Evento: ${s.toLocaleTimeString()} – ${en.toLocaleTimeString()}`);
        return { start: s, end: en };
      });

    console.log(`[Calendar] ${state.busySlots.length} evento(s) carregado(s) para ${date.toLocaleDateString()}`);
  } catch (err) {
    console.error("[Calendar API] Erro de rede:", err);
  }
}

// =============================================
// SLOTS — Geração e renderização de horários
// =============================================

function generateSlots(date) {
  const dayOfWeek = date.getDay();
  const ranges = CONFIG.workingHours[dayOfWeek];
  const slots = [];

  ranges.forEach(([startH, endH]) => {
    let current = startH * 60; // minutos desde meia-noite
    const end = endH * 60;
    while (current <= end) { // <= para incluir o último horário (ex: 20h → 20h–20h30)
      const h = Math.floor(current / 60);
      const m = current % 60;
      slots.push({ hour: h, minute: m });
      current += CONFIG.slotDuration;
    }
  });

  return slots;
}

function isSlotBusy(date, hour, minute) {
  const slotStart = new Date(date);
  slotStart.setHours(hour, minute, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + CONFIG.slotDuration * 60 * 1000);

  const busy = state.busySlots.some((b) => slotStart < b.end && slotEnd > b.start);

  console.log(
    `[isSlotBusy] ${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}` +
    ` → slotStart=${slotStart.toISOString()} | ocupado=${busy}` +
    (state.busySlots.length
      ? ` | eventos: ${state.busySlots.map(b => b.start.toLocaleTimeString() + "–" + b.end.toLocaleTimeString()).join(", ")}`
      : " | nenhum evento")
  );

  return busy;
}

function renderSlots(date) {
  const slotsGrid = document.getElementById("slots-grid");
  const slots = generateSlots(date);
  slotsGrid.innerHTML = "";

  if (slots.length === 0) {
    slotsGrid.innerHTML = '<p class="no-slots">Sem horários disponíveis neste dia.</p>';
    return;
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  slots.forEach(({ hour, minute }) => {
    const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    // Verifica se o horário já passou (só relevante no dia de hoje)
    const slotDateTime = new Date(date);
    slotDateTime.setHours(hour, minute, 0, 0);
    const isPast = isToday && slotDateTime <= now;

    const busy = isPast || isSlotBusy(date, hour, minute);

    const btn = document.createElement("button");
    btn.textContent = label;
    btn.disabled = busy;

    if (isPast) {
      btn.className = "slot slot-past";
      btn.setAttribute("aria-label", `${label} - Horário passado`);
      btn.title = "Horário já passou";
    } else if (busy) {
      btn.className = "slot slot-busy";
      btn.setAttribute("aria-label", `${label} - Ocupado`);
      btn.title = "Horário já reservado";
    } else {
      btn.className = "slot slot-free";
      btn.setAttribute("aria-label", `${label} - Disponível`);
      btn.addEventListener("click", () => openBookingModal(date, hour, minute));
    }

    slotsGrid.appendChild(btn);
  });
}

// =============================================
// MODAL DE AGENDAMENTO
// =============================================

let pendingSlot = null;

function openBookingModal(date, hour, minute) {
  pendingSlot = { date, hour, minute };

  const timeLabel = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const dateLabel = date.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });

  document.getElementById("modal-datetime").textContent = `${dateLabel} às ${timeLabel}`;
  document.getElementById("client-name").value = "";
  document.getElementById("modal-feedback").textContent = "";
  document.getElementById("modal-overlay").classList.remove("hidden");
  document.getElementById("modal-overlay").classList.add("visible");
  setTimeout(() => document.getElementById("client-name").focus(), 100);
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("visible");
  setTimeout(() => document.getElementById("modal-overlay").classList.add("hidden"), 300);
  pendingSlot = null;
}

// Fechar com ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// Fechar clicando fora
document.getElementById("modal-overlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// =============================================
// CONFIRMAÇÃO — Envia via WhatsApp
// =============================================

async function confirmBooking() {
  const nameInput = document.getElementById("client-name");
  const feedback = document.getElementById("modal-feedback");
  const btn = document.getElementById("btn-confirm");
  const name = nameInput.value.trim();

  if (!name) {
    feedback.textContent = "Por favor, informe seu nome.";
    feedback.className = "feedback-error";
    nameInput.focus();
    return;
  }

  if (!pendingSlot) return;

  // Salva os dados ANTES de qualquer closeModal (que zera pendingSlot)
  const { date, hour, minute } = pendingSlot;
  const timeLabel = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const dateLabel = date.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  btn.disabled = true;
  btn.textContent = "Aguarde...";
  feedback.textContent = "";

  const success = await createCalendarEvent(name, date, hour, minute);

  btn.disabled = false;
  btn.textContent = "Confirmar";

  if (success === "conflict") {
    feedback.textContent = "⚠️ Este horário acabou de ser ocupado. Escolha outro horário.";
    feedback.className = "feedback-error";
    await fetchBusySlots(date);
    renderSlots(date);
    return;
  }

  const msg = encodeURIComponent(
    `Olá! Gostaria de confirmar meu agendamento:\n\n` +
    `👤 Nome: ${name}\n` +
    `📅 Data: ${dateLabel}\n` +
    `🕐 Horário: ${timeLabel}\n\n` +
    `Agendado pelo site. ✅`
  );
  const wppUrl = `https://wa.me/${CONFIG.barbershopPhone}?text=${msg}`;

  if (success === true || success === "unconfirmed") {
    // "unconfirmed" = evento enviado ao Apps Script mas API demorou a refletir.
    // O evento foi criado — mostra sucesso e atualiza os slots localmente.
    closeModal(); // só chama closeModal após salvar date/hour/minute acima
    showSuccessScreen(name, dateLabel, timeLabel, wppUrl);
    renderSlots(date); // slots já atualizados dentro de createCalendarEvent
  } else {
    feedback.textContent =
      "Não foi possível confirmar. Tente novamente ou entre em contato pelo WhatsApp.";
    feedback.className = "feedback-error";
  }
}

// =============================================
// GOOGLE CALENDAR — CRIAÇÃO DE EVENTO
// Estratégia: GET + no-cors para contornar CORS do Apps Script.
// Como não conseguimos ler a resposta (opaque), confirmamos
// relendo o Calendar após a criação e verificando se o evento
// realmente apareceu. Só mostra sucesso se confirmado.
// =============================================

async function createCalendarEvent(clientName, date, hour, minute) {
  if (!CONFIG.appsScriptUrl || CONFIG.appsScriptUrl === "URL_DO_SEU_APPS_SCRIPT") {
    console.error("[Barbearia] Apps Script URL não configurada.");
    return false;
  }

  const startDateTime = new Date(date);
  startDateTime.setHours(hour, minute, 0, 0);
  const endDateTime = new Date(startDateTime.getTime() + CONFIG.slotDuration * 60 * 1000);

  // -------------------------------------------------------
  // PASSO 1 — Re-lê o Calendar agora para ter estado fresco
  // -------------------------------------------------------
  await fetchBusySlots(date);

  if (isSlotBusy(date, hour, minute)) {
    console.warn("[Barbearia] Conflito detectado antes de criar.");
    return "conflict";
  }

  // -------------------------------------------------------
  // PASSO 2 — Conta quantos eventos existem ANTES da criação
  // para comparar depois e confirmar que um novo foi criado
  // -------------------------------------------------------
  const countBefore = state.busySlots.length;

  // -------------------------------------------------------
  // PASSO 3 — Envia via GET + no-cors (sem preflight)
  // -------------------------------------------------------
  const url = new URL(CONFIG.appsScriptUrl);
  url.searchParams.set("action", "create");
  url.searchParams.set("clientName", clientName);
  url.searchParams.set("start", startDateTime.toISOString());
  url.searchParams.set("end", endDateTime.toISOString());

  try {
    await fetch(url.toString(), {
      method: "GET",
      mode: "no-cors",
    });
  } catch (err) {
    console.error("[Apps Script] Erro de rede:", err);
    return false;
  }

  // -------------------------------------------------------
  // PASSO 4 — Tenta confirmar relendo o Calendar (até 3x)
  // O Google Calendar pode demorar 1-3s para refletir
  // -------------------------------------------------------
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    await new Promise((r) => setTimeout(r, 1500));
    await fetchBusySlots(date);

    if (isSlotBusy(date, hour, minute)) {
      // Evento confirmado no Calendar ✅
      return true;
    }

    console.log(`[Barbearia] Aguardando confirmação... tentativa ${tentativa}/3`);
  }

  // -------------------------------------------------------
  // PASSO 5 — Após 3 tentativas, não apareceu no Calendar.
  // Pode ser latência alta do Google ou o Apps Script falhou.
  // Adiciona localmente para não bloquear o usuário, mas
  // retorna "unconfirmed" para mostrar aviso adequado.
  // -------------------------------------------------------
  console.warn("[Barbearia] Evento não confirmado após 3 tentativas. Adicionando localmente.");
  state.busySlots.push({ start: startDateTime, end: endDateTime });
  return "unconfirmed";
}

// =============================================
// TELA DE SUCESSO
// =============================================

function showSuccessScreen(name, dateLabel, timeLabel, wppUrl) {
  const overlay = document.getElementById("success-overlay");
  document.getElementById("success-name").textContent = name;
  document.getElementById("success-date").textContent = dateLabel;
  document.getElementById("success-time").textContent = timeLabel;
  document.getElementById("success-wpp-link").href = wppUrl;

  const icon = document.getElementById("success-icon");
  const heading = document.getElementById("success-heading");
  const subtitle = document.getElementById("success-subtitle");
  icon.textContent = "✅";
  heading.textContent = "Agendado!";
  subtitle.textContent = "Seu horário foi reservado com sucesso.";

  overlay.classList.remove("hidden");
  overlay.classList.add("visible");
}

function closeSuccess() {
  const overlay = document.getElementById("success-overlay");
  overlay.classList.remove("visible");
  setTimeout(() => overlay.classList.add("hidden"), 300);
}
