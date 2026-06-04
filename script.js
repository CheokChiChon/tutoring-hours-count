const STORAGE_KEY = "tutoringHours.v1";

const state = {
  students: [],
  sessions: [],
  activeTab: "record",
  statsMonth: monthKey(new Date()),
  selectedStudentKeys: [],
};

const els = {
  currentMonthLabel: document.querySelector("#currentMonthLabel"),
  monthlyHours: document.querySelector("#monthlyHours"),
  monthlyPay: document.querySelector("#monthlyPay"),
  monthlyUnpaid: document.querySelector("#monthlyUnpaid"),
  tabButtons: document.querySelectorAll(".tab-button"),
  panels: document.querySelectorAll(".panel"),
  sessionForm: document.querySelector("#sessionForm"),
  sessionDate: document.querySelector("#sessionDate"),
  sessionStudent: document.querySelector("#sessionStudent"),
  sessionHours: document.querySelector("#sessionHours"),
  sessionPreview: document.querySelector("#sessionPreview"),
  sessionHint: document.querySelector("#sessionHint"),
  sessionList: document.querySelector("#sessionList"),
  sessionEmpty: document.querySelector("#sessionEmpty"),
  sessionCount: document.querySelector("#sessionCount"),
  studentForm: document.querySelector("#studentForm"),
  studentFormTitle: document.querySelector("#studentFormTitle"),
  editingStudentId: document.querySelector("#editingStudentId"),
  studentName: document.querySelector("#studentName"),
  studentRate: document.querySelector("#studentRate"),
  studentSubmitButton: document.querySelector("#studentSubmitButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  studentList: document.querySelector("#studentList"),
  studentEmpty: document.querySelector("#studentEmpty"),
  studentCount: document.querySelector("#studentCount"),
  statsMonth: document.querySelector("#statsMonth"),
  statsList: document.querySelector("#statsList"),
  statsEmpty: document.querySelector("#statsEmpty"),
  statsStudentCount: document.querySelector("#statsStudentCount"),
  selectedStudentsPay: document.querySelector("#selectedStudentsPay"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
};

init();

function init() {
  loadState();
  els.sessionDate.value = todayKey();
  els.statsMonth.value = state.statsMonth;
  bindEvents();
  render();
}

function bindEvents() {
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      renderTabs();
    });
  });

  els.studentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveStudent();
  });

  els.cancelEditButton.addEventListener("click", resetStudentForm);

  els.sessionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSession();
  });

  els.sessionStudent.addEventListener("change", renderSessionPreview);
  els.sessionHours.addEventListener("input", renderSessionPreview);

  els.statsMonth.addEventListener("change", () => {
    state.statsMonth = els.statsMonth.value || monthKey(new Date());
    state.selectedStudentKeys = [];
    renderStats();
    renderSummary();
  });

  els.clearSelectionButton.addEventListener("click", () => {
    state.selectedStudentKeys = [];
    renderStats();
  });
}

function saveStudent() {
  const name = els.studentName.value.trim();
  const rate = Number(els.studentRate.value);
  const editingId = els.editingStudentId.value;

  if (!name || !Number.isFinite(rate) || rate <= 0) {
    return;
  }

  if (editingId) {
    state.students = state.students.map((student) => {
      if (student.id !== editingId) return student;
      return { ...student, name, hourlyRate: roundMoney(rate) };
    });
  } else {
    state.students.push({
      id: createId(),
      name,
      hourlyRate: roundMoney(rate),
      createdAt: new Date().toISOString(),
    });
  }

  persist();
  resetStudentForm();
  render();
}

function saveSession() {
  const student = state.students.find((item) => item.id === els.sessionStudent.value);
  const date = els.sessionDate.value;
  const hours = Number(els.sessionHours.value);

  if (!student || !date || !Number.isFinite(hours) || hours <= 0) {
    return;
  }

  state.sessions.push({
    id: createId(),
    date,
    studentId: student.id,
    studentName: student.name,
    hourlyRate: student.hourlyRate,
    hours: roundHours(hours),
    paid: false,
    createdAt: new Date().toISOString(),
  });

  persist();
  els.sessionHours.value = "";
  render();
}

function editStudent(studentId) {
  const student = state.students.find((item) => item.id === studentId);
  if (!student) return;

  state.activeTab = "students";
  els.editingStudentId.value = student.id;
  els.studentName.value = student.name;
  els.studentRate.value = String(student.hourlyRate);
  els.studentFormTitle.textContent = "編輯學生";
  els.studentSubmitButton.textContent = "儲存修改";
  els.cancelEditButton.classList.remove("hidden");
  renderTabs();
  els.studentName.focus();
}

function deleteStudent(studentId) {
  const student = state.students.find((item) => item.id === studentId);
  if (!student) return;

  const confirmed = window.confirm(`刪除「${student.name}」？已存在的補習記錄會保留。`);
  if (!confirmed) return;

  state.students = state.students.filter((item) => item.id !== studentId);
  persist();
  if (els.editingStudentId.value === studentId) {
    resetStudentForm();
  }
  render();
}

function deleteSession(sessionId) {
  const confirmed = window.confirm("刪除這筆補習記錄？");
  if (!confirmed) return;

  state.sessions = state.sessions.filter((item) => item.id !== sessionId);
  persist();
  render();
}

function toggleSessionPaid(sessionId) {
  state.sessions = state.sessions.map((session) => {
    if (session.id !== sessionId) return session;
    return { ...session, paid: !Boolean(session.paid) };
  });

  persist();
  render();
}

function markStudentMonthPaid(studentKey) {
  const row = groupedMonthlyRows(state.statsMonth).find((item) => item.key === studentKey);
  if (!row || row.unpaidCount === 0) return;

  const confirmed = window.confirm(`把「${row.studentName}」${formatMonth(state.statsMonth)}的 ${row.unpaidCount} 筆記錄轉為已收款？`);
  if (!confirmed) return;

  state.sessions = state.sessions.map((session) => {
    if (!session.date.startsWith(state.statsMonth)) return session;
    if (sessionKey(session) !== studentKey) return session;
    return { ...session, paid: true };
  });

  persist();
  render();
}

function resetStudentForm() {
  els.editingStudentId.value = "";
  els.studentName.value = "";
  els.studentRate.value = "";
  els.studentFormTitle.textContent = "新增學生";
  els.studentSubmitButton.textContent = "新增學生";
  els.cancelEditButton.classList.add("hidden");
}

function render() {
  renderTabs();
  renderStudentOptions();
  renderStudents();
  renderSessions();
  renderStats();
  renderSummary();
  renderSessionPreview();
}

function renderTabs() {
  els.tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === state.activeTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  els.panels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === state.activeTab);
  });
}

function renderStudentOptions() {
  const selected = els.sessionStudent.value;
  els.sessionStudent.innerHTML = "";

  if (state.students.length === 0) {
    els.sessionStudent.innerHTML = '<option value="">請先新增學生</option>';
    els.sessionStudent.disabled = true;
    els.sessionForm.querySelector(".primary-button").disabled = true;
    els.sessionHint.textContent = "先建立學生，之後就可以直接選擇。";
    return;
  }

  els.sessionStudent.disabled = false;
  els.sessionForm.querySelector(".primary-button").disabled = false;
  els.sessionHint.textContent = "選擇學生和時數後會自動計算薪金。";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "選擇學生";
  els.sessionStudent.appendChild(placeholder);

  state.students
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"))
    .forEach((student) => {
      const option = document.createElement("option");
      option.value = student.id;
      option.textContent = `${student.name} · ${formatMoney(student.hourlyRate)}/小時`;
      els.sessionStudent.appendChild(option);
    });

  if (state.students.some((student) => student.id === selected)) {
    els.sessionStudent.value = selected;
  }
}

function renderStudents() {
  els.studentList.innerHTML = "";
  els.studentCount.textContent = `${state.students.length} 位`;
  els.studentEmpty.classList.toggle("hidden", state.students.length > 0);

  state.students
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"))
    .forEach((student) => {
      const item = document.createElement("li");
      item.className = "list-item";
      item.innerHTML = `
        <div class="item-main">
          <div>
            <div class="item-title">${escapeHtml(student.name)}</div>
            <div class="item-meta">${formatMoney(student.hourlyRate)} / 小時</div>
          </div>
          <div class="item-money">${studentSessionCount(student.id)} 筆</div>
        </div>
        <div class="item-actions">
          <button class="small-button" type="button" data-action="edit-student" data-id="${student.id}">編輯</button>
          <button class="danger-button" type="button" data-action="delete-student" data-id="${student.id}">刪除</button>
        </div>
      `;
      els.studentList.appendChild(item);
    });

  bindListActions(els.studentList);
}

function renderSessions() {
  const sessions = state.sessions.slice().sort((a, b) => {
    if (a.date === b.date) return b.createdAt.localeCompare(a.createdAt);
    return b.date.localeCompare(a.date);
  });

  els.sessionList.innerHTML = "";
  els.sessionCount.textContent = `${sessions.length} 筆`;
  els.sessionEmpty.classList.toggle("hidden", sessions.length > 0);

  sessions.forEach((session) => {
    const isPaid = Boolean(session.paid);
    const item = document.createElement("li");
    item.className = "list-item";
    item.innerHTML = `
      <div class="item-main">
        <div>
          <div class="item-title">${escapeHtml(session.studentName)}</div>
          <div class="item-meta">${formatDate(session.date)} · ${formatHours(session.hours)} 小時 · ${formatMoney(session.hourlyRate)}/小時</div>
          <div class="status-badge ${isPaid ? "paid" : "unpaid"}">${isPaid ? "已收款" : "未收款"}</div>
        </div>
        <div class="item-money">${formatMoney(session.hours * session.hourlyRate)}</div>
      </div>
      <div class="item-actions">
        <button class="small-button" type="button" data-action="toggle-session-paid" data-id="${session.id}">${isPaid ? "轉成未收" : "轉成已收"}</button>
        <button class="danger-button" type="button" data-action="delete-session" data-id="${session.id}">刪除</button>
      </div>
    `;
    els.sessionList.appendChild(item);
  });

  bindListActions(els.sessionList);
}

function renderStats() {
  const rows = groupedMonthlyRows(state.statsMonth);
  const validKeys = new Set(rows.map((row) => row.key));
  state.selectedStudentKeys = state.selectedStudentKeys.filter((key) => validKeys.has(key));
  const selectedPay = rows
    .filter((row) => state.selectedStudentKeys.includes(row.key))
    .reduce((sum, row) => sum + row.pay, 0);

  els.statsList.innerHTML = "";
  els.statsStudentCount.textContent = `${rows.length} 位`;
  els.statsEmpty.classList.toggle("hidden", rows.length > 0);
  els.selectedStudentsPay.textContent = formatMoney(selectedPay);
  els.clearSelectionButton.disabled = state.selectedStudentKeys.length === 0;

  rows.forEach((row) => {
    const checked = state.selectedStudentKeys.includes(row.key) ? "checked" : "";
    const paidLabel = row.unpaidCount > 0 ? `未收 ${formatMoney(row.unpaidPay)}` : "全部已收";
    const item = document.createElement("li");
    item.className = "list-item";
    item.innerHTML = `
      <div class="item-main">
        <label class="check-row">
          <input type="checkbox" data-action="toggle-student-selection" data-id="${row.key}" ${checked}>
          <span>
            <span class="item-title">${escapeHtml(row.studentName)}</span>
            <span class="item-meta">${formatHours(row.hours)} 小時 · ${row.count} 筆記錄 · ${paidLabel}</span>
          </span>
        </label>
        <div>
          <div class="item-money">${formatMoney(row.pay)}</div>
          <div class="item-meta">${formatMoney(row.paidPay)} 已收</div>
        </div>
      </div>
      <div class="item-actions">
        <button class="small-button" type="button" data-action="mark-student-month-paid" data-id="${row.key}" ${row.unpaidCount === 0 ? "disabled" : ""}>本月轉已收</button>
      </div>
    `;
    els.statsList.appendChild(item);
  });

  bindListActions(els.statsList);
}

function renderSummary() {
  const month = state.statsMonth || monthKey(new Date());
  const sessions = state.sessions.filter((session) => session.date.startsWith(month));
  const totalHours = sessions.reduce((sum, session) => sum + session.hours, 0);
  const totalPay = sessions.reduce((sum, session) => sum + session.hours * session.hourlyRate, 0);
  const unpaidPay = sessions
    .filter((session) => !Boolean(session.paid))
    .reduce((sum, session) => sum + session.hours * session.hourlyRate, 0);

  els.currentMonthLabel.textContent = formatMonth(month);
  els.monthlyHours.textContent = `${formatHours(totalHours)} 小時`;
  els.monthlyPay.textContent = formatMoney(totalPay);
  els.monthlyUnpaid.textContent = formatMoney(unpaidPay);
}

function renderSessionPreview() {
  const student = state.students.find((item) => item.id === els.sessionStudent.value);
  const hours = Number(els.sessionHours.value);
  const pay = student && Number.isFinite(hours) ? student.hourlyRate * hours : 0;
  els.sessionPreview.textContent = formatMoney(pay);
}

function bindListActions(list) {
  list.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      if (button.dataset.action === "edit-student") editStudent(id);
      if (button.dataset.action === "delete-student") deleteStudent(id);
      if (button.dataset.action === "delete-session") deleteSession(id);
      if (button.dataset.action === "toggle-session-paid") toggleSessionPaid(id);
      if (button.dataset.action === "mark-student-month-paid") markStudentMonthPaid(id);
    });
  });

  list.querySelectorAll("input[data-action='toggle-student-selection']").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.selectedStudentKeys = Array.from(new Set([...state.selectedStudentKeys, checkbox.dataset.id]));
      } else {
        state.selectedStudentKeys = state.selectedStudentKeys.filter((key) => key !== checkbox.dataset.id);
      }
      renderStats();
    });
  });
}

function groupedMonthlyRows(month) {
  const groups = new Map();

  state.sessions
    .filter((session) => session.date.startsWith(month))
    .forEach((session) => {
      const key = sessionKey(session);
      const pay = session.hours * session.hourlyRate;
      const existing = groups.get(key) || {
        key,
        studentName: session.studentName,
        hours: 0,
        pay: 0,
        paidPay: 0,
        unpaidPay: 0,
        unpaidCount: 0,
        count: 0,
      };

      existing.hours += session.hours;
      existing.pay += pay;
      if (Boolean(session.paid)) {
        existing.paidPay += pay;
      } else {
        existing.unpaidPay += pay;
        existing.unpaidCount += 1;
      }
      existing.count += 1;
      groups.set(key, existing);
    });

  return Array.from(groups.values()).sort((a, b) => b.pay - a.pay);
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);
    state.students = Array.isArray(saved.students) ? saved.students : [];
    state.sessions = Array.isArray(saved.sessions)
      ? saved.sessions.map((session) => ({ ...session, paid: Boolean(session.paid) }))
      : [];
    state.statsMonth = saved.statsMonth || state.statsMonth;
    state.selectedStudentKeys = Array.isArray(saved.selectedStudentKeys) ? saved.selectedStudentKeys : [];
  } catch {
    state.students = [];
    state.sessions = [];
  }
}

function persist() {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      students: state.students,
      sessions: state.sessions,
      statsMonth: state.statsMonth,
      selectedStudentKeys: state.selectedStudentKeys,
    })
  );
}

function sessionKey(session) {
  return session.studentId || `name:${session.studentName}`;
}

function studentSessionCount(studentId) {
  return state.sessions.filter((session) => session.studentId === studentId).length;
}

function createId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayKey() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function monthKey(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 7);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-Hant-MO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatMonth(value) {
  return new Intl.DateTimeFormat("zh-Hant-MO", {
    year: "numeric",
    month: "long",
  }).format(new Date(`${value}-01T00:00:00`));
}

function formatMoney(value) {
  return new Intl.NumberFormat("zh-Hant-MO", {
    style: "currency",
    currency: "MOP",
    minimumFractionDigits: 2,
  }).format(roundMoney(value));
}

function formatHours(value) {
  return roundHours(value).toLocaleString("zh-Hant-MO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function roundHours(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
