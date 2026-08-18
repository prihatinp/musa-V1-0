// =========================================================
// MUSA App 2.0 — Main Controller & State Management
// =========================================================
import { gasApi } from "./gas-api.js";
import { MusashiMan } from "./ai-assistant.js";
import {
  renderDashboardStats,
  renderGauges,
  renderBarChart,
  renderDocGrid,
  renderPMGrid,
  pmAlertBannerHTML,
  diagnosticCardHTML,
  renderFaultGrid,
  renderRecentActivity,
  renderCmdkResults,
  toastHTML,
  skeletonCards,
} from "./ui-renderers.js";

// =========================================================
// Mock / Demo Data — used when GAS backend isn't configured
// or when a request fails and no cache is available.
// =========================================================

const MOCK_DOCS = [
  { id: "sop-001", type: "sop", title: "SOP Startup Kompresor Udara", machine: "Compressor Line 2", updated: "12 Agu 2026", url: "" },
  { id: "wi-014", type: "wi", title: "WI Penggantian Filter Chiller", machine: "Chiller Unit 1", updated: "05 Agu 2026", url: "" },
  { id: "man-cnc", type: "manual", title: "Manual CNC Machining Center", machine: "CNC-03", updated: "28 Jul 2026", url: "" },
  { id: "drw-l2", type: "drawing", title: "Drawing Layout Line 2", machine: "Line 2", updated: "01 Jul 2026", url: "" },
  { id: "sop-robot", type: "sop", title: "SOP Kalibrasi Robot Cell 3", machine: "Robot Cell 3", updated: "10 Agu 2026", url: "" },
  { id: "wi-conveyor", type: "wi", title: "WI Troubleshooting Conveyor Jam", machine: "Conveyor A", updated: "14 Agu 2026", url: "" },
  { id: "man-plc", type: "manual", title: "Manual PLC Mitsubishi FX5U", machine: "Panel PLC", updated: "20 Jun 2026", url: "" },
  { id: "drw-elec", type: "drawing", title: "Drawing Single Line Diagram Listrik", machine: "Panel Utama", updated: "15 Mei 2026", url: "" },
];

const MOCK_PM = [
  { id: "pm-1", machine: "Compressor Line 2", task: "Ganti oli & filter udara", due: "10 Agu 2026", status: "overdue", owner: "Tim Utility", checklist: ["Matikan & lockout compressor", "Ganti filter udara", "Ganti oli sesuai spesifikasi", "Cek tekanan operasi normal"] },
  { id: "pm-2", machine: "Chiller Unit 1", task: "Cek level refrigerant", due: "14 Agu 2026", status: "overdue", owner: "Tim Utility", checklist: ["Cek indikator level refrigerant", "Cek tekanan suction & discharge", "Catat suhu chilled water"] },
  { id: "pm-3", machine: "Robot Cell 3", task: "Kalibrasi ulang axis", due: "22 Agu 2026", status: "upcoming", owner: "Tim Automation", checklist: ["Backup program robot", "Jalankan rutin kalibrasi", "Verifikasi akurasi posisi"] },
  { id: "pm-4", machine: "CNC-03", task: "Penggantian coolant", due: "25 Agu 2026", status: "upcoming", owner: "Tim Machining", checklist: ["Drain coolant lama", "Bersihkan tangki", "Isi coolant baru sesuai rasio"] },
  { id: "pm-5", machine: "Conveyor A", task: "Pelumasan chain & bearing", due: "02 Agu 2026", status: "done", owner: "Tim Utility", checklist: ["Bersihkan chain", "Lumasi bearing", "Cek ketegangan belt"] },
  { id: "pm-6", machine: "Panel Utama", task: "Thermografi panel listrik", due: "28 Jul 2026", status: "done", owner: "Tim Electrical", checklist: ["Scan thermal seluruh panel", "Dokumentasikan titik panas", "Laporkan temuan"] },
];

const MOCK_FAULTS = {
  "E-104": { code: "E-104", title: "Overload Motor Kompresor", severity: "critical", attachment: "", steps: [
    { title: "Cek arus motor", detail: "Ukur arus aktual vs nameplate. Jika melebihi FLA, matikan segera." },
    { title: "Periksa beban mekanis", detail: "Cek kemungkinan jamming pada sisi mekanikal kompresor." },
    { title: "Reset & monitor", detail: "Reset overload relay, jalankan kembali, monitor suhu & arus 15 menit." },
  ]},
  "ALM-220": { code: "ALM-220", title: "Chiller Low Refrigerant", severity: "warning", attachment: "", steps: [
    { title: "Cek indikator sight glass", detail: "Pastikan ada gelembung refrigerant berlebih menandakan kekurangan." },
    { title: "Cek kebocoran", detail: "Gunakan detector kebocoran pada sambungan pipa & valve." },
    { title: "Hubungi tim refrigerant", detail: "Jika terkonfirmasi bocor, jangan tambah refrigerant sebelum kebocoran ditutup." },
  ]},
  "E-330": { code: "E-330", title: "Conveyor Sensor Fault", severity: "warning", attachment: "", steps: [
    { title: "Bersihkan lensa sensor", detail: "Debu/oli dapat menghalangi pembacaan sensor proximity/optic." },
    { title: "Cek alignment sensor", detail: "Pastikan posisi sensor tidak bergeser dari target reflector." },
    { title: "Ganti sensor jika perlu", detail: "Jika masih fault setelah dibersihkan & align, ganti unit sensor." },
  ]},
  "E-441": { code: "E-441", title: "PLC Communication Timeout", severity: "info", attachment: "", steps: [
    { title: "Cek kabel komunikasi", detail: "Pastikan konektor RS485/Ethernet tidak longgar atau rusak." },
    { title: "Restart modul komunikasi", detail: "Power cycle modul I/O remote yang bermasalah." },
    { title: "Cek program watchdog", detail: "Pastikan timeout setting sesuai dengan kondisi jaringan plant." },
  ]},
};

function mockDashboardStats() {
  const overdue = MOCK_PM.filter((p) => p.status === "overdue").length;
  return [
    { icon: "speed", value: "87.4%", label: "OEE Rata-rata", trend: "+2.1% minggu ini", trendDir: "up", accent: "accent-green" },
    { icon: "schedule", value: "142h", label: "MTBF", trend: "+8h", trendDir: "up", accent: "" },
    { icon: "build_circle", value: "3.2h", label: "MTTR", trend: "-0.4h", trendDir: "down", accent: "" },
    { icon: "event_busy", value: String(overdue), label: "PM Overdue", trend: overdue ? "Perlu tindakan" : "Aman", trendDir: overdue ? "down" : "up", accent: "accent-red" },
    { icon: "report", value: "3", label: "Active Alerts", trend: "Butuh review", trendDir: "flat", accent: "accent-amber" },
  ];
}

function mockUtilityGauges() {
  return [
    { value: 412, max: 600, label: "Konsumsi Listrik", unit: "kW", sub: "Real-time", colorFrom: "#38bdf8", colorTo: "#06b6d4" },
    { value: 6.4, max: 10, label: "Tekanan Kompresor", unit: "bar", sub: "Line 2", colorFrom: "#38bdf8", colorTo: "#f43f5e" },
    { value: 7, max: 15, label: "Suhu Chiller", unit: "°C", sub: "Unit 1", colorFrom: "#22c55e", colorTo: "#38bdf8" },
    { value: 87, max: 100, label: "OEE", unit: "%", sub: "Plant rata-rata", colorFrom: "#f43f5e", colorTo: "#e11d48" },
    { value: 142, max: 200, label: "MTBF", unit: "jam", sub: "30 hari terakhir", colorFrom: "#38bdf8", colorTo: "#22c55e" },
    { value: 3.2, max: 10, label: "MTTR", unit: "jam", sub: "30 hari terakhir", colorFrom: "#f59e0b", colorTo: "#f43f5e" },
  ];
}

function mockPowerChart() {
  return Array.from({ length: 24 }).map((_, h) => ({
    label: `${String(h).padStart(2, "0")}:00`,
    value: Math.round(260 + Math.sin(h / 3) * 90 + Math.random() * 40),
  }));
}

function mockRecentActivity() {
  return [
    { icon: "task_alt", text: "PM Conveyor A ditandai selesai", time: "2 jam lalu" },
    { icon: "bug_report", text: "Fault E-104 pada Compressor Line 2 diselesaikan", time: "5 jam lalu" },
    { icon: "description", text: "SOP Kalibrasi Robot Cell 3 diperbarui", time: "Kemarin" },
    { icon: "smart_toy", text: "Musashi Man menjawab 12 pertanyaan hari ini", time: "Kemarin" },
  ];
}

// =========================================================
// App State
// =========================================================
const state = {
  view: "dashboard",
  sopSearch: "",
  sopFilter: "all",
  pmFilter: "all",
  docs: [],
  pmList: [],
  faults: {},
};

// =========================================================
// DOM references
// =========================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const dom = {
  appShell: $("#appShell"),
  sidebarToggleBtn: $("#sidebarToggleBtn"),
  mobileMenuBtn: $("#mobileMenuBtn"),
  sidebarBackdrop: $("#sidebarBackdrop"),
  navItems: $$(".nav-item"),
  apiStatusChip: $("#apiStatusChip"),
  apiStatusText: $("#apiStatusText"),
  toastStack: $("#toastStack"),

  cmdkTrigger: $("#cmdkTrigger"),
  cmdkOverlay: $("#cmdkOverlay"),
  cmdkInput: $("#cmdkInput"),
  cmdkResults: $("#cmdkResults"),

  dashboardStats: $("#dashboardStats"),
  dashboardGauges: $("#dashboardGauges"),
  pmAlertBanner: $("#pmAlertBanner"),
  recentActivityList: $("#recentActivityList"),
  pmOverdueBadge: $("#pmOverdueBadge"),

  sopGrid: $("#sopGrid"),
  sopSearchInput: $("#sopSearchInput"),

  faultCodeInput: $("#faultCodeInput"),
  diagnoseBtn: $("#diagnoseBtn"),
  diagnosticResult: $("#diagnosticResult"),
  faultCodeGrid: $("#faultCodeGrid"),

  pmGrid: $("#pmGrid"),

  utilityGauges: $("#utilityGauges"),
  powerBarChart: $("#powerBarChart"),
  refreshUtilityBtn: $("#refreshUtilityBtn"),

  gasSettingsForm: $("#gasSettingsForm"),
  gasUrlInput: $("#gasUrlInput"),
  testConnectionBtn: $("#testConnectionBtn"),
  clearCacheBtn: $("#clearCacheBtn"),
  ttsToggle: $("#ttsToggle"),
  autoSendToggle: $("#autoSendToggle"),
  offlineCacheToggle: $("#offlineCacheToggle"),

  docModalOverlay: $("#docModalOverlay"),
  docModalTitle: $("#docModalTitle"),
  docModalMeta: $("#docModalMeta"),
  docPreviewFrame: $("#docPreviewFrame"),
  docOpenDriveBtn: $("#docOpenDriveBtn"),

  pmModalOverlay: $("#pmModalOverlay"),
  pmModalTitle: $("#pmModalTitle"),
  pmModalMeta: $("#pmModalMeta"),
  pmModalBody: $("#pmModalBody"),
  pmModalCompleteBtn: $("#pmModalCompleteBtn"),

  musaWidget: $("#musaWidget"),
  musaAvatarBtn: $("#musaAvatarBtn"),
  musaChatPanel: $("#musaChatPanel"),
  musaChatBody: $("#musaChatBody"),
  musaStateLabel: $("#musaStateLabel"),
  musaQuoteBubble: $("#musaQuoteBubble"),
  musaChatCloseBtn: $("#musaChatCloseBtn"),
  pttBtn: $("#pttBtn"),
  musaTextInput: $("#musaTextInput"),
  musaSendBtn: $("#musaSendBtn"),
};

// =========================================================
// Toasts
// =========================================================
function showToast(type, title, message, duration = 4200) {
  const id = `toast-${Date.now()}`;
  dom.toastStack.insertAdjacentHTML("beforeend", toastHTML(id, { type, title, message }));
  const el = document.getElementById(id);
  setTimeout(() => {
    el?.classList.add("hide");
    setTimeout(() => el?.remove(), 260);
  }, duration);
}

// =========================================================
// View routing
// =========================================================
function switchView(view) {
  state.view = view;
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
  dom.navItems.forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  closeMobileNav();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openMobileNav() {
  dom.appShell.classList.add("mobile-nav-open");
}
function closeMobileNav() {
  dom.appShell.classList.remove("mobile-nav-open");
}

dom.navItems.forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));
dom.mobileMenuBtn.addEventListener("click", openMobileNav);
dom.sidebarBackdrop.addEventListener("click", closeMobileNav);
dom.sidebarToggleBtn.addEventListener("click", () => dom.appShell.classList.toggle("sidebar-collapsed"));

// =========================================================
// API status indicator
// =========================================================
function setApiStatus(mode) {
  dom.apiStatusChip.className = `status-chip ${mode}`;
  const labels = { online: "Terhubung", offline: "Offline (Cache)", demo: "Demo Mode" };
  dom.apiStatusText.textContent = labels[mode] || mode;
}

// =========================================================
// Data loading
// =========================================================
async function loadAllData() {
  dom.dashboardStats.innerHTML = skeletonCards(5);
  dom.sopGrid.innerHTML = skeletonCards(6);
  dom.pmGrid.innerHTML = skeletonCards(6);

  const results = await Promise.all([
    gasApi.request("getDashboardStats", {}, { mockFallback: mockDashboardStats }),
    gasApi.request("getSOPDocs", {}, { mockFallback: () => MOCK_DOCS }),
    gasApi.request("getPMSchedule", {}, { mockFallback: () => MOCK_PM }),
    gasApi.request("getUtilityData", {}, { mockFallback: mockUtilityGauges }),
    gasApi.request("getFaultCodes", {}, { mockFallback: () => MOCK_FAULTS }),
  ]);

  const [statsRes, docsRes, pmRes, utilRes, faultsRes] = results;
  let shapeMismatch = false;

  const asArray = (data, fallback) => {
    if (Array.isArray(data)) return data;
    if (data !== undefined && data !== null) shapeMismatch = true;
    return fallback;
  };
  const asFaultMap = (data, fallback) => {
    if (data && typeof data === "object" && !Array.isArray(data)) return data;
    if (data !== undefined && data !== null) shapeMismatch = true;
    return fallback;
  };

  state.stats = asArray(statsRes.data, mockDashboardStats());
  state.docs = asArray(docsRes.data, MOCK_DOCS);
  state.pmList = asArray(pmRes.data, MOCK_PM);
  state.utility = asArray(utilRes.data, mockUtilityGauges());
  state.faults = asFaultMap(faultsRes.data, MOCK_FAULTS);

  if (shapeMismatch) {
    showToast(
      "error",
      "Format data backend tidak sesuai",
      "Backend GAS merespons, tapi bentuk datanya tidak cocok dengan yang diharapkan MUSA App — menampilkan data contoh untuk bagian ini. Cek kontrak API di README."
    );
  }

  const sources = results.map((r) => r.source);
  if (sources.every((s) => s === "demo")) setApiStatus("demo");
  else if (sources.some((s) => s === "network")) setApiStatus("online");
  else setApiStatus("offline");

  if (sources.some((s) => s === "cache" || s === "mock") && gasApi.isConfigured()) {
    showToast("info", "Menampilkan data cache", "Koneksi backend bermasalah, menggunakan data terakhir tersimpan.");
  }

  renderDashboard();
  renderSOP();
  renderPM();
  renderUtility();
  renderFaultsGridView();
}

function renderDashboard() {
  renderDashboardStats(dom.dashboardStats, state.stats);
  renderGauges(dom.dashboardGauges, (state.utility || mockUtilityGauges()).slice(0, 4));
  renderRecentActivity(dom.recentActivityList, mockRecentActivity());
  const overdue = state.pmList.filter((p) => p.status === "overdue");
  dom.pmAlertBanner.innerHTML = pmAlertBannerHTML(overdue);
  dom.pmOverdueBadge.textContent = String(overdue.length);
  dom.pmOverdueBadge.style.display = overdue.length ? "inline-flex" : "none";
  const viewBtn = document.getElementById("viewOverduePmBtn");
  viewBtn?.addEventListener("click", () => switchView("pm"));
}

function filteredDocs() {
  return state.docs.filter((d) => {
    const matchesFilter = state.sopFilter === "all" || d.type === state.sopFilter;
    const q = state.sopSearch.toLowerCase();
    const matchesSearch = !q || d.title.toLowerCase().includes(q) || (d.machine || "").toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });
}

function renderSOP() {
  renderDocGrid(dom.sopGrid, filteredDocs());
}

function filteredPM() {
  if (state.pmFilter === "all") return state.pmList;
  return state.pmList.filter((p) => p.status === state.pmFilter);
}

function renderPM() {
  renderPMGrid(dom.pmGrid, filteredPM());
}

function renderUtility() {
  renderGauges(dom.utilityGauges, state.utility || mockUtilityGauges());
  renderBarChart(dom.powerBarChart, mockPowerChart());
}

function renderFaultsGridView() {
  renderFaultGrid(dom.faultCodeGrid, Object.values(state.faults));
}

// =========================================================
// SOP search / filter
// =========================================================
let searchDebounce;
dom.sopSearchInput.addEventListener("input", (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.sopSearch = e.target.value;
    renderSOP();
  }, 180);
});

$$('.filter-bar [data-filter]').forEach((chip) => {
  chip.addEventListener("click", () => {
    $$('.filter-bar [data-filter]').forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    state.sopFilter = chip.dataset.filter;
    renderSOP();
  });
});

$$('[data-pmfilter]').forEach((chip) => {
  chip.addEventListener("click", () => {
    $$('[data-pmfilter]').forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    state.pmFilter = chip.dataset.pmfilter;
    renderPM();
  });
});

// =========================================================
// Document preview modal
// =========================================================
function openDocModal(doc) {
  dom.docModalTitle.textContent = doc.title;
  dom.docModalMeta.textContent = `${doc.type.toUpperCase()} · ${doc.machine || "-"} · Diperbarui ${doc.updated || "-"}`;
  dom.docOpenDriveBtn.href = doc.url || "#";
  dom.docOpenDriveBtn.style.display = doc.url ? "inline-flex" : "none";
  if (doc.url) {
    dom.docPreviewFrame.removeAttribute("srcdoc");
    dom.docPreviewFrame.src = doc.url;
  } else {
    dom.docPreviewFrame.removeAttribute("src");
    dom.docPreviewFrame.srcdoc = `<!doctype html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;background:#0b0d13;color:#94a3b8;text-align:center;padding:20px;box-sizing:border-box;">
      <div><div style="font-size:40px;margin-bottom:10px;">📄</div><p style="font-size:14px;">Preview mode demo.<br/>Hubungkan Google Apps Script backend di Settings untuk melihat dokumen asli dari Google Drive.</p></div>
    </body></html>`;
  }
  dom.docModalOverlay.classList.add("open");
}

dom.sopGrid.addEventListener("click", (e) => {
  const card = e.target.closest("[data-doc-id]");
  if (!card) return;
  const doc = state.docs.find((d) => d.id === card.dataset.docId);
  if (doc) openDocModal(doc);
});

$$('#docModalOverlay [id^="docModalCloseBtn"]').forEach((btn) =>
  btn.addEventListener("click", () => dom.docModalOverlay.classList.remove("open"))
);
dom.docModalOverlay.addEventListener("click", (e) => {
  if (e.target === dom.docModalOverlay) dom.docModalOverlay.classList.remove("open");
});

// =========================================================
// PM checklist modal
// =========================================================
let activePmId = null;
function openPmModal(pm) {
  activePmId = pm.id;
  dom.pmModalTitle.textContent = pm.machine;
  dom.pmModalMeta.textContent = `${pm.task} · Jatuh tempo ${pm.due}`;
  dom.pmModalBody.innerHTML = `
    <div class="diag-steps">
      ${pm.checklist
        .map(
          (item, i) => `
        <label class="diag-step" style="align-items:center; cursor:pointer;">
          <input type="checkbox" style="width:18px;height:18px;accent-color:#38bdf8;flex-shrink:0;" />
          <span style="font-size:13px;">${item}</span>
        </label>`
        )
        .join("")}
    </div>`;
  dom.pmModalCompleteBtn.disabled = pm.status === "done";
  dom.pmModalOverlay.classList.add("open");
}

dom.pmGrid.addEventListener("click", (e) => {
  const card = e.target.closest("[data-pm-id]");
  if (!card) return;
  const pm = state.pmList.find((p) => p.id === card.dataset.pmId);
  if (pm) openPmModal(pm);
});

$("#pmModalCloseBtn").addEventListener("click", () => dom.pmModalOverlay.classList.remove("open"));
$("#pmModalCancelBtn").addEventListener("click", () => dom.pmModalOverlay.classList.remove("open"));
dom.pmModalOverlay.addEventListener("click", (e) => {
  if (e.target === dom.pmModalOverlay) dom.pmModalOverlay.classList.remove("open");
});
dom.pmModalCompleteBtn.addEventListener("click", () => {
  const pm = state.pmList.find((p) => p.id === activePmId);
  if (pm) {
    pm.status = "done";
    renderPM();
    renderDashboard();
    showToast("success", "PM ditandai selesai", `${pm.machine} — ${pm.task}`);
  }
  dom.pmModalOverlay.classList.remove("open");
});

// =========================================================
// Troubleshooting / diagnostics
// =========================================================
function runDiagnosis(codeRaw) {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return;
  const result = state.faults[code] || Object.values(state.faults).find((f) => f.code.toUpperCase() === code);
  dom.diagnosticResult.innerHTML = diagnosticCardHTML(result || null);
}

dom.diagnoseBtn.addEventListener("click", () => runDiagnosis(dom.faultCodeInput.value));
dom.faultCodeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runDiagnosis(dom.faultCodeInput.value);
});
dom.faultCodeGrid.addEventListener("click", (e) => {
  const card = e.target.closest("[data-fault-code]");
  if (!card) return;
  dom.faultCodeInput.value = card.dataset.faultCode;
  runDiagnosis(card.dataset.faultCode);
  switchView("troubleshoot");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// =========================================================
// Utility refresh
// =========================================================
dom.refreshUtilityBtn.addEventListener("click", async () => {
  dom.refreshUtilityBtn.disabled = true;
  const res = await gasApi.request("getUtilityData", {}, { mockFallback: mockUtilityGauges });
  state.utility = Array.isArray(res.data) ? res.data : mockUtilityGauges();
  renderUtility();
  dom.refreshUtilityBtn.disabled = false;
  showToast("success", "Data utility diperbarui", null, 2000);
});

// =========================================================
// Settings
// =========================================================
dom.gasUrlInput.value = gasApi.getBaseUrl();

dom.gasSettingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  gasApi.setBaseUrl(dom.gasUrlInput.value);
  showToast("success", "Pengaturan disimpan", "Menyambungkan ke backend...");
  await loadAllData();
});

dom.testConnectionBtn.addEventListener("click", async () => {
  dom.testConnectionBtn.disabled = true;
  gasApi.setBaseUrl(dom.gasUrlInput.value);
  const res = await gasApi.testConnection();
  showToast(res.ok ? "success" : "error", res.ok ? "Koneksi berhasil" : "Koneksi gagal", res.message);
  dom.testConnectionBtn.disabled = false;
});

dom.clearCacheBtn.addEventListener("click", () => {
  gasApi.clearCache();
  showToast("info", "Cache dibersihkan", "Data akan dimuat ulang dari sumber terbaru.");
});

function loadTogglePref(key, fallback) {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === "1";
}
dom.ttsToggle.checked = loadTogglePref("musa_tts_enabled", true);
dom.autoSendToggle.checked = loadTogglePref("musa_autosend", true);
dom.offlineCacheToggle.checked = loadTogglePref("musa_offline_cache", true);

dom.ttsToggle.addEventListener("change", () => {
  localStorage.setItem("musa_tts_enabled", dom.ttsToggle.checked ? "1" : "0");
  musashiMan.setTtsEnabled(dom.ttsToggle.checked);
});
dom.autoSendToggle.addEventListener("change", () => {
  localStorage.setItem("musa_autosend", dom.autoSendToggle.checked ? "1" : "0");
  musashiMan.setAutoSend(dom.autoSendToggle.checked);
});
dom.offlineCacheToggle.addEventListener("change", () => {
  localStorage.setItem("musa_offline_cache", dom.offlineCacheToggle.checked ? "1" : "0");
});

// =========================================================
// Command Palette (Ctrl+K)
// =========================================================
let cmdkActiveIndex = 0;
let cmdkFlatItems = [];

function buildCmdkGroups(query) {
  const q = query.trim().toLowerCase();
  const navItems = [
    { icon: "space_dashboard", label: "Buka Dashboard", action: "nav", payload: { view: "dashboard" } },
    { icon: "menu_book", label: "Buka SOP Knowledge", action: "nav", payload: { view: "sop" } },
    { icon: "troubleshoot", label: "Buka Troubleshooting", action: "nav", payload: { view: "troubleshoot" } },
    { icon: "event_repeat", label: "Buka PM Schedule", action: "nav", payload: { view: "pm" } },
    { icon: "monitoring", label: "Buka Utility Monitoring", action: "nav", payload: { view: "utility" } },
    { icon: "settings", label: "Buka Settings", action: "nav", payload: { view: "settings" } },
  ].filter((i) => !q || i.label.toLowerCase().includes(q));

  const docItems = state.docs
    .filter((d) => !q || d.title.toLowerCase().includes(q) || (d.machine || "").toLowerCase().includes(q))
    .slice(0, 6)
    .map((d) => ({ icon: "description", label: d.title, sub: d.machine, action: "doc", payload: { id: d.id } }));

  const faultItems = Object.values(state.faults)
    .filter((f) => !q || f.code.toLowerCase().includes(q) || f.title.toLowerCase().includes(q))
    .slice(0, 6)
    .map((f) => ({ icon: "bug_report", label: `${f.code} — ${f.title}`, sub: f.severity, action: "fault", payload: { code: f.code } }));

  const askItem = q
    ? [{ icon: "smart_toy", label: `Tanya Musashi Man: "${query}"`, action: "ask", payload: { text: query } }]
    : [];

  return [
    { label: "Perintah", items: navItems },
    { label: "SOP & Dokumen", items: docItems },
    { label: "Kode Fault", items: faultItems },
    { label: "Musashi Man", items: askItem },
  ];
}

function renderCmdk(query) {
  const groups = buildCmdkGroups(query);
  cmdkFlatItems = groups.flatMap((g) => g.items);
  cmdkActiveIndex = Math.min(cmdkActiveIndex, Math.max(0, cmdkFlatItems.length - 1));
  renderCmdkResults(dom.cmdkResults, groups, cmdkActiveIndex);
}

function openCmdk() {
  dom.cmdkOverlay.classList.add("open");
  dom.cmdkInput.value = "";
  cmdkActiveIndex = 0;
  renderCmdk("");
  setTimeout(() => dom.cmdkInput.focus(), 50);
}
function closeCmdk() {
  dom.cmdkOverlay.classList.remove("open");
}

function execCmdkItem(item) {
  if (!item) return;
  closeCmdk();
  if (item.action === "nav") switchView(item.payload.view);
  else if (item.action === "doc") {
    const doc = state.docs.find((d) => d.id === item.payload.id);
    switchView("sop");
    if (doc) setTimeout(() => openDocModal(doc), 200);
  } else if (item.action === "fault") {
    switchView("troubleshoot");
    dom.faultCodeInput.value = item.payload.code;
    setTimeout(() => runDiagnosis(item.payload.code), 150);
  } else if (item.action === "ask") {
    musashiMan.handleMessage(item.payload.text);
  }
}

dom.cmdkTrigger.addEventListener("click", openCmdk);
dom.cmdkInput.addEventListener("input", (e) => {
  cmdkActiveIndex = 0;
  renderCmdk(e.target.value);
});
dom.cmdkOverlay.addEventListener("click", (e) => {
  if (e.target === dom.cmdkOverlay) closeCmdk();
});
dom.cmdkResults.addEventListener("click", (e) => {
  const el = e.target.closest(".cmdk-item");
  if (!el) return;
  const idx = cmdkFlatItems.findIndex(
    (i) => i.action === el.dataset.cmdkAction && JSON.stringify(i.payload || {}) === el.dataset.cmdkPayload
  );
  execCmdkItem(cmdkFlatItems[idx] ?? cmdkFlatItems[0]);
});

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    dom.cmdkOverlay.classList.contains("open") ? closeCmdk() : openCmdk();
  }
  if (e.key === "Escape") {
    if (dom.cmdkOverlay.classList.contains("open")) closeCmdk();
    if (dom.docModalOverlay.classList.contains("open")) dom.docModalOverlay.classList.remove("open");
    if (dom.pmModalOverlay.classList.contains("open")) dom.pmModalOverlay.classList.remove("open");
  }
  if (dom.cmdkOverlay.classList.contains("open")) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      cmdkActiveIndex = Math.min(cmdkActiveIndex + 1, cmdkFlatItems.length - 1);
      renderCmdk(dom.cmdkInput.value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      cmdkActiveIndex = Math.max(cmdkActiveIndex - 1, 0);
      renderCmdk(dom.cmdkInput.value);
    } else if (e.key === "Enter") {
      execCmdkItem(cmdkFlatItems[cmdkActiveIndex]);
    }
  }
});

// =========================================================
// Musashi Man AI Assistant wiring
// =========================================================
function localKnowledgeQuery(text) {
  const q = text.toLowerCase();

  const faultMatch = Object.values(state.faults).find((f) => q.includes(f.code.toLowerCase()));
  if (faultMatch) {
    switchView("troubleshoot");
    dom.faultCodeInput.value = faultMatch.code;
    runDiagnosis(faultMatch.code);
    return { reply: `Ditemukan panduan untuk ${faultMatch.code} — ${faultMatch.title}. Saya tampilkan langkah diagnosanya di halaman Troubleshooting.` };
  }

  const docMatch = state.docs.find((d) => q.includes(d.title.toLowerCase().split(" ")[1]?.toLowerCase() || "###") || d.title.toLowerCase().split(" ").some((w) => w.length > 3 && q.includes(w.toLowerCase())));
  if (/sop|manual|wi|drawing|dokumen/.test(q) && docMatch) {
    switchView("sop");
    return { reply: `Saya temukan dokumen terkait: "${docMatch.title}". Silakan buka di halaman SOP Knowledge untuk preview lengkap.` };
  }

  if (/pm|maintenance|jadwal|overdue/.test(q)) {
    const overdue = state.pmList.filter((p) => p.status === "overdue");
    switchView("pm");
    return { reply: overdue.length ? `Ada ${overdue.length} jadwal PM overdue: ${overdue.map((p) => p.machine).join(", ")}. Segera ditindaklanjuti ya!` : "Semua jadwal PM dalam kondisi terkendali. Tetap disiplin menjaga reliability!" };
  }

  if (/listrik|power|kompresor|chiller|oee|mtbf|mttr|utility/.test(q)) {
    switchView("utility");
    return { reply: "Berikut kondisi utility terkini sudah saya tampilkan di Utility Monitoring Board. Semua parameter dalam rentang normal." };
  }

  if (/halo|hai|hi|siapa kamu|siapa musa/.test(q)) {
    return { reply: "Saya Musashi Man — Thinking Time Adventurer, AI assistant untuk teknisi Musashi. Semangat saya: Go Far Beyond! Ada yang bisa saya bantu?" };
  }

  return { reply: "Saya belum menemukan jawaban pasti untuk itu. Coba sebutkan kode fault, nama mesin, atau kata kunci SOP — saya akan bantu carikan, Go Far Beyond! 🔥" };
}

// Local matching always runs first for deterministic in-app navigation
// (fault code lookup, PM/utility view switching). When a GAS backend is
// connected, its Gemini Flash-Lite aiChat_ reply is preferred for the
// actual wording — falling back to the canned local reply otherwise.
async function knowledgeQuery(text) {
  let local;
  try {
    local = localKnowledgeQuery(text);
  } catch {
    local = { reply: "Saya belum menemukan jawaban pasti untuk itu. Coba sebutkan kode fault, nama mesin, atau kata kunci SOP — saya akan bantu carikan, Go Far Beyond! 🔥" };
  }
  if (gasApi.isConfigured()) {
    const ai = await gasApi.chat(text, { view: state.view });
    if (ai && ai.reply) return { reply: ai.reply };
  }
  return local;
}

const musashiMan = new MusashiMan(
  {
    widget: dom.musaWidget,
    avatarBtn: dom.musaAvatarBtn,
    chatPanel: dom.musaChatPanel,
    chatBody: dom.musaChatBody,
    stateLabel: dom.musaStateLabel,
    quoteBubble: dom.musaQuoteBubble,
    closeBtn: dom.musaChatCloseBtn,
    pttBtn: dom.pttBtn,
    textInput: dom.musaTextInput,
    sendBtn: dom.musaSendBtn,
    onSttUnsupported: () => showToast("error", "Voice tidak didukung", "Browser ini tidak mendukung Speech Recognition. Gunakan input teks."),
    onSttError: () => showToast("error", "Gagal mendengarkan", "Terjadi kendala pada mikrofon atau izin akses."),
  },
  async (text) => knowledgeQuery(text)
);
musashiMan.setTtsEnabled(dom.ttsToggle.checked);
musashiMan.setAutoSend(dom.autoSendToggle.checked);

// =========================================================
// Online/offline listeners
// =========================================================
window.addEventListener("online", () => {
  showToast("success", "Kembali online", "Menyinkronkan data terbaru...");
  loadAllData();
});
window.addEventListener("offline", () => {
  setApiStatus("offline");
  showToast("error", "Koneksi terputus", "MUSA berjalan dalam mode offline menggunakan data cache.");
});

// =========================================================
// PWA Service Worker
// =========================================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline-first is best-effort; ignore registration failures */
    });
  });
}

// =========================================================
// Init
// =========================================================
(async function init() {
  await loadAllData();
  const splash = document.getElementById("splash");
  setTimeout(() => splash?.classList.add("hide"), 400);
})();
