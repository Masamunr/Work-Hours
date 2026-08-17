
const TARGET_HOURS = 40;
const INITIAL_DEFAULTS = {
  start: "08:00",
  finish: "17:00",
  lunchMinutes: 60
};
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const STORAGE_KEY = "flexweek-data-v1";
const THEME_KEY = "flexweek-theme";
const DEFAULTS_KEY = "flexweek-defaults";
const LAST_BACKUP_KEY = "flexweek-last-backup";
const BACKUP_VERSION = 1;

const els = {
  weekPicker: document.getElementById("weekPicker"),
  daysContainer: document.getElementById("daysContainer"),
  workedHours: document.getElementById("workedHours"),
  absenceHours: document.getElementById("absenceHours"),
  remainingHours: document.getElementById("remainingHours"),
  statusBanner: document.getElementById("statusBanner"),
  statusTitle: document.getElementById("statusTitle"),
  statusText: document.getElementById("statusText"),
  absenceDialog: document.getElementById("absenceDialog"),
  absenceForm: document.getElementById("absenceForm"),
  absenceDay: document.getElementById("absenceDay"),
  absenceType: document.getElementById("absenceType"),
  absenceDuration: document.getElementById("absenceDuration"),
  absenceCounts: document.getElementById("absenceCounts"),
  absenceNote: document.getElementById("absenceNote"),
  absenceList: document.getElementById("absenceList"),
  historyList: document.getElementById("historyList"),
  defaultStart: document.getElementById("defaultStart"),
  defaultFinish: document.getElementById("defaultFinish"),
  defaultLunch: document.getElementById("defaultLunch"),
  backupBanner: document.getElementById("backupBanner"),
  backupBannerTitle: document.getElementById("backupBannerTitle"),
  backupBannerText: document.getElementById("backupBannerText"),
  lastBackupText: document.getElementById("lastBackupText"),
  restoreFile: document.getElementById("restoreFile"),
  weekOverview: document.getElementById("weekOverview"),
  overviewWeekTitle: document.getElementById("overviewWeekTitle"),
};

let db = loadDb();
let currentWeek = mondayOf(new Date());

function loadDefaults() {
  try {
    return { ...INITIAL_DEFAULTS, ...(JSON.parse(localStorage.getItem(DEFAULTS_KEY)) || {}) };
  } catch {
    return { ...INITIAL_DEFAULTS };
  }
}

function saveDefaults(defaults) {
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults));
}


function getLastBackup() {
  const value = localStorage.getItem(LAST_BACKUP_KEY);
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function daysSince(timestamp) {
  if (!timestamp) return null;
  return Math.floor((Date.now() - timestamp) / 86400000);
}

function formatDateTime(timestamp) {
  if (!timestamp) return "Never";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function hasMeaningfulRecords() {
  const entries = Object.entries(db.weeks || {});
  if (!entries.length) return false;

  // A created week counts as meaningful if it differs from its default pattern,
  // has absence, or there is more than one saved week.
  if (entries.length > 1) return true;

  const [, week] = entries[0];
  if ((week.absences || []).length) return true;

  const defaults = loadDefaults();
  return (week.days || []).some(day =>
    day.start !== defaults.start ||
    day.finish !== defaults.finish ||
    Number(day.lunchMinutes) !== Number(defaults.lunchMinutes)
  );
}

function makeBackupPayload() {
  return {
    app: "FlexWeek",
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: db,
    defaults: loadDefaults(),
    theme: localStorage.getItem(THEME_KEY) || "light"
  };
}

function downloadBackup() {
  const payload = makeBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `flexweek-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
  renderBackupStatus();
}

function validateBackup(payload) {
  if (!payload || payload.app !== "FlexWeek") {
    throw new Error("This does not appear to be a FlexWeek backup.");
  }
  if (!payload.data || typeof payload.data !== "object" || !payload.data.weeks) {
    throw new Error("The FlexWeek backup is missing week data.");
  }
  if (!payload.defaults || !payload.defaults.start || !payload.defaults.finish) {
    throw new Error("The FlexWeek backup is missing default settings.");
  }
  return true;
}

function restoreFromBackup(payload) {
  validateBackup(payload);
  db = payload.data;
  saveDb();
  saveDefaults({ ...INITIAL_DEFAULTS, ...payload.defaults });
  if (payload.theme === "dark" || payload.theme === "light") {
    localStorage.setItem(THEME_KEY, payload.theme);
    document.documentElement.dataset.theme = payload.theme;
  }
  render();
}

function renderBackupStatus() {
  const last = getLastBackup();
  const age = daysSince(last);

  els.lastBackupText.textContent = formatDateTime(last);
  els.backupBanner.hidden = true;
  els.backupBanner.className = "backup-banner";

  if (!hasMeaningfulRecords()) return;

  if (!last) {
    els.backupBanner.hidden = false;
    els.backupBanner.classList.add("urgent");
    els.backupBannerTitle.textContent = "Your records are not backed up";
    els.backupBannerText.textContent = "Back up now so a browser cleanup or reset cannot wipe your only copy.";
    return;
  }

  if (age >= 30) {
    els.backupBanner.hidden = false;
    els.backupBanner.classList.add("urgent");
    els.backupBannerTitle.textContent = `No backup for ${age} days`;
    els.backupBannerText.textContent = "Your saved records are only on this device. Create a fresh backup now.";
    return;
  }

  if (age >= 15) {
    els.backupBanner.hidden = false;
    els.backupBannerTitle.textContent = "Backup recommended";
    els.backupBannerText.textContent = `Your last backup was ${age} days ago.`;
  }
}


function loadDb() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { weeks: {} };
  } catch {
    return { weeks: {} };
  }
}

function saveDb() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getWeekKey() {
  return isoDate(currentWeek);
}

function makeDefaultWeek() {
  const defaults = loadDefaults();
  return {
    days: DAYS.map(() => ({
      start: defaults.start,
      finish: defaults.finish,
      lunchMinutes: defaults.lunchMinutes,
      enabled: true
    })),
    absences: [],
    updatedAt: Date.now()
  };
}

function weekData() {
  const key = getWeekKey();
  if (!db.weeks[key]) {
    db.weeks[key] = makeDefaultWeek();
    saveDb();
  }
  return db.weeks[key];
}

function timeToMinutes(value) {
  if (!value || !value.includes(":")) return 0;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function workMinutesForDay(day) {
  if (!day.enabled) return 0;
  const start = timeToMinutes(day.start);
  const finish = timeToMinutes(day.finish);
  return Math.max(0, finish - start - Number(day.lunchMinutes || 0));
}

function formatMinutes(minutes) {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, "0")}`;
}

function formatHoursDecimal(hours) {
  return formatMinutes(Math.round(hours * 60));
}

function displayDate(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
}

function fullDisplayDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric"
  }).format(date);
}

function totalsForWeek(week) {
  const worked = week.days.reduce((sum, day) => sum + workMinutesForDay(day), 0);
  const absenceCounted = week.absences
    .filter(a => a.counts)
    .reduce((sum, a) => sum + Number(a.hours) * 60, 0);
  const accounted = worked + absenceCounted;
  return { worked, absenceCounted, accounted, remaining: TARGET_HOURS * 60 - accounted };
}

function renderDays() {
  const week = weekData();
  els.daysContainer.innerHTML = "";

  week.days.forEach((day, index) => {
    const row = document.createElement("div");
    row.className = "day-row";
    const date = addDays(currentWeek, index);

    row.innerHTML = `
      <div class="day-name">
        ${DAYS[index]}
        <span class="day-date">${displayDate(date)}</span>
      </div>
      <label>Start
        <input type="time" data-field="start" data-index="${index}" value="${day.start}">
      </label>
      <label>Finish
        <input type="time" data-field="finish" data-index="${index}" value="${day.finish}">
      </label>
      <label>Lunch (minutes)
        <input type="number" min="0" max="240" step="5" data-field="lunchMinutes" data-index="${index}" value="${day.lunchMinutes}">
      </label>
      <div class="day-total">
        <strong>${formatMinutes(workMinutesForDay(day))}</strong>
        <span>working time</span>
      </div>
    `;
    els.daysContainer.appendChild(row);
  });

  els.daysContainer.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", onDayChange);
  });
}

function onDayChange(event) {
  const index = Number(event.target.dataset.index);
  const field = event.target.dataset.field;
  const week = weekData();
  week.days[index][field] = field === "lunchMinutes" ? Number(event.target.value) : event.target.value;
  week.updatedAt = Date.now();
  saveDb();
  render();
}

function renderSummary() {
  const t = totalsForWeek(weekData());
  els.workedHours.textContent = formatMinutes(t.worked);
  els.absenceHours.textContent = formatMinutes(t.absenceCounted);
  els.remainingHours.textContent = formatMinutes(t.remaining);

  els.statusBanner.className = "status-banner";

  if (t.accounted > TARGET_HOURS * 60) {
    const over = t.accounted - TARGET_HOURS * 60;
    els.statusBanner.classList.add("danger");
    els.statusTitle.textContent = `Weekly allowance exceeded by ${formatMinutes(over)}`;
    els.statusText.textContent = `You have ${formatMinutes(t.worked)} worked plus ${formatMinutes(t.absenceCounted)} counted absence.`;
  } else if (t.accounted === TARGET_HOURS * 60) {
    els.statusBanner.classList.add("good");
    els.statusTitle.textContent = "Weekly allowance reached";
    els.statusText.textContent = `Exactly 40:00 hours are accounted for this week.`;
  } else if (t.remaining <= 2 * 60) {
    els.statusBanner.classList.add("warn");
    els.statusTitle.textContent = `${formatMinutes(t.remaining)} remaining`;
    els.statusText.textContent = "You are close to your 40-hour weekly allowance.";
  } else {
    els.statusTitle.textContent = `${formatMinutes(t.remaining)} remaining`;
    els.statusText.textContent = `Worked ${formatMinutes(t.worked)} with ${formatMinutes(t.absenceCounted)} counted absence.`;
  }
}

function renderAbsences() {
  const week = weekData();
  els.absenceList.innerHTML = "";

  if (!week.absences.length) {
    els.absenceList.innerHTML = `<div class="empty-state">No absence logged for this week.</div>`;
    return;
  }

  week.absences.forEach((a, index) => {
    const item = document.createElement("div");
    item.className = "absence-item";
    const date = addDays(currentWeek, a.dayIndex);
    item.innerHTML = `
      <div>
        <strong>${a.type} · ${formatHoursDecimal(a.hours)}</strong>
        <div class="absence-meta">
          ${DAYS[a.dayIndex]}, ${displayDate(date)}
          · ${a.counts ? "counts toward 40 hours" : "does not count toward 40 hours"}
          ${a.note ? ` · ${escapeHtml(a.note)}` : ""}
        </div>
      </div>
      <button class="danger-btn" type="button" data-remove-absence="${index}">Remove</button>
    `;
    els.absenceList.appendChild(item);
  });

  els.absenceList.querySelectorAll("[data-remove-absence]").forEach(button => {
    button.addEventListener("click", () => {
      week.absences.splice(Number(button.dataset.removeAbsence), 1);
      week.updatedAt = Date.now();
      saveDb();
      render();
    });
  });
}

function renderHistory() {
  const entries = Object.entries(db.weeks)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 20);

  els.historyList.innerHTML = "";

  if (!entries.length) {
    els.historyList.innerHTML = `<div class="empty-state">Your saved weeks will appear here.</div>`;
    return;
  }

  entries.forEach(([key, week]) => {
    const t = totalsForWeek(week);
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong>Week commencing ${fullDisplayDate(parseLocalDate(key))}</strong>
        <div class="history-meta">
          Worked ${formatMinutes(t.worked)}
          · Counted absence ${formatMinutes(t.absenceCounted)}
          · Accounted ${formatMinutes(t.accounted)}
        </div>
      </div>
      <button class="secondary-btn" type="button" data-open-week="${key}">Open</button>
    `;
    els.historyList.appendChild(item);
  });

  els.historyList.querySelectorAll("[data-open-week]").forEach(button => {
    button.addEventListener("click", () => {
      currentWeek = parseLocalDate(button.dataset.openWeek);
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function populateAbsenceDays() {
  els.absenceDay.innerHTML = DAYS.map((day, index) =>
    `<option value="${index}">${day} · ${displayDate(addDays(currentWeek, index))}</option>`
  ).join("");
}

function renderDefaults() {
  const defaults = loadDefaults();
  els.defaultStart.value = defaults.start;
  els.defaultFinish.value = defaults.finish;
  els.defaultLunch.value = defaults.lunchMinutes;
}


function renderWeekOverview() {
  const week = weekData();
  els.overviewWeekTitle.textContent = `Week commencing ${fullDisplayDate(currentWeek)}`;
  els.weekOverview.innerHTML = "";

  week.days.forEach((day, index) => {
    const card = document.createElement("article");
    card.className = "overview-day";
    const date = addDays(currentWeek, index);
    const worked = workMinutesForDay(day);

    const absenceForDay = week.absences
      .filter(a => Number(a.dayIndex) === index)
      .reduce((sum, a) => sum + Number(a.hours) * 60, 0);

    card.innerHTML = `
      <div class="overview-day-top">
        <strong>${DAYS[index].slice(0,3)}</strong>
        <span>${displayDate(date)}</span>
      </div>
      <div class="overview-hours">${day.start}–${day.finish}</div>
      <div class="overview-meta">
        <span>${day.lunchMinutes}m lunch</span>
        <strong>${formatMinutes(worked)}</strong>
      </div>
      ${absenceForDay > 0 ? `<div class="overview-absence">Absence ${formatMinutes(absenceForDay)}</div>` : ""}
    `;
    els.weekOverview.appendChild(card);
  });
}


function render() {
  els.weekPicker.value = getWeekKey();
  renderDefaults();
  renderWeekOverview();
  renderDays();
  renderSummary();
  renderAbsences();
  renderHistory();
  populateAbsenceDays();
  renderBackupStatus();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.getElementById("saveDefaults").addEventListener("click", () => {
  const start = els.defaultStart.value || INITIAL_DEFAULTS.start;
  const finish = els.defaultFinish.value || INITIAL_DEFAULTS.finish;
  const lunchMinutes = Math.max(0, Number(els.defaultLunch.value || 0));

  if (timeToMinutes(finish) <= timeToMinutes(start)) {
    alert("Default finish time must be later than the default start time.");
    return;
  }

  saveDefaults({ start, finish, lunchMinutes });
  alert("Defaults saved. They will be used for new weeks.");
});


document.getElementById("backupNow").addEventListener("click", downloadBackup);
document.getElementById("backupNowBanner").addEventListener("click", downloadBackup);

document.getElementById("restoreBackup").addEventListener("click", () => {
  els.restoreFile.value = "";
  els.restoreFile.click();
});

els.restoreFile.addEventListener("change", async () => {
  const file = els.restoreFile.files && els.restoreFile.files[0];
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    validateBackup(payload);

    const existingRecords = hasMeaningfulRecords();
    if (existingRecords) {
      const proceed = confirm(
        "Restore this backup? Your current FlexWeek records will be replaced by the contents of the backup file."
      );
      if (!proceed) return;
    }

    restoreFromBackup(payload);
    alert("FlexWeek backup restored successfully.");
  } catch (error) {
    alert(error && error.message ? error.message : "The backup could not be restored.");
  } finally {
    els.restoreFile.value = "";
  }
});

document.getElementById("prevWeek").addEventListener("click", () => {
  currentWeek = addDays(currentWeek, -7);
  render();
});

document.getElementById("nextWeek").addEventListener("click", () => {
  currentWeek = addDays(currentWeek, 7);
  render();
});

els.weekPicker.addEventListener("change", () => {
  if (!els.weekPicker.value) return;
  currentWeek = mondayOf(parseLocalDate(els.weekPicker.value));
  render();
});

document.getElementById("addAbsence").addEventListener("click", () => {
  populateAbsenceDays();
  els.absenceDuration.value = 8;
  els.absenceCounts.checked = true;
  els.absenceNote.value = "";
  els.absenceDialog.showModal();
});

document.getElementById("cancelAbsence").addEventListener("click", () => {
  els.absenceDialog.close();
});

els.absenceForm.addEventListener("submit", event => {
  event.preventDefault();
  const week = weekData();
  week.absences.push({
    dayIndex: Number(els.absenceDay.value),
    type: els.absenceType.value,
    hours: Number(els.absenceDuration.value),
    counts: els.absenceCounts.checked,
    note: els.absenceNote.value.trim()
  });
  week.updatedAt = Date.now();
  saveDb();
  els.absenceDialog.close();
  render();
});

document.getElementById("copyPrevious").addEventListener("click", () => {
  const previousKey = isoDate(addDays(currentWeek, -7));
  const previous = db.weeks[previousKey];

  if (!previous) {
    alert("There is no saved previous week to copy.");
    return;
  }

  const copied = JSON.parse(JSON.stringify(previous));
  copied.absences = [];
  copied.updatedAt = Date.now();
  db.weeks[getWeekKey()] = copied;
  saveDb();
  render();
});

document.getElementById("resetWeek").addEventListener("click", () => {
  if (!confirm("Reset this week to your current default working times?")) return;
  db.weeks[getWeekKey()] = makeDefaultWeek();
  saveDb();
  render();
});

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "dark") {
  document.documentElement.dataset.theme = "dark";
}

document.getElementById("themeToggle").addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme === "dark";
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  localStorage.setItem(THEME_KEY, dark ? "light" : "dark");
});

render();
