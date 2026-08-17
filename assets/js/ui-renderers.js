// =========================================================
// MUSA App 2.0 — Dynamic Card & Chart Rendering Logic
// Pure render functions: build HTML strings / DOM, no state.
// =========================================================

export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TYPE_ICON = { sop: "description", wi: "engineering", manual: "menu_book", drawing: "architecture" };
const TYPE_LABEL = { sop: "SOP", wi: "WI", manual: "Manual", drawing: "Drawing" };

export function skeletonCards(n = 6) {
  return Array.from({ length: n })
    .map(() => `<div class="card skeleton" style="height:150px;"></div>`)
    .join("");
}

// ---------------- Stat cards (Dashboard) ----------------
export function statCardHTML({ icon, value, label, trend, trendDir = "flat", accent = "" }) {
  return `
    <div class="card stat-card ${accent}">
      <div class="stat-icon"><span class="material-symbols-rounded">${icon}</span></div>
      <div class="stat-value">${escapeHtml(value)}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
      ${trend ? `<span class="stat-trend ${trendDir}"><span class="material-symbols-rounded" style="font-size:13px">${trendDir === "up" ? "trending_up" : trendDir === "down" ? "trending_down" : "trending_flat"}</span>${escapeHtml(trend)}</span>` : ""}
    </div>`;
}

export function renderDashboardStats(container, stats) {
  container.innerHTML = stats.map(statCardHTML).join("");
}

// ---------------- SVG Gauges ----------------
let gaugeUid = 0;

export function gaugeCardHTML({ value, max, label, unit = "", sub = "", colorFrom = "#38bdf8", colorTo = "#f43f5e" }) {
  gaugeUid += 1;
  const id = `gauge-grad-${gaugeUid}`;
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const offset = c * (1 - pct);
  return `
    <div class="card gauge-card">
      <div class="gauge-svg-wrap">
        <svg viewBox="0 0 120 120">
          <defs>
            <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="${colorFrom}" />
              <stop offset="100%" stop-color="${colorTo}" />
            </linearGradient>
          </defs>
          <circle class="gauge-track" cx="60" cy="60" r="${r}" />
          <circle class="gauge-value-arc" cx="60" cy="60" r="${r}"
            stroke="url(#${id})"
            stroke-dasharray="${c}"
            stroke-dashoffset="${offset}" />
        </svg>
        <div class="gauge-center">
          <span class="gauge-num">${escapeHtml(value)}</span>
          <span class="gauge-unit">${escapeHtml(unit)}</span>
        </div>
      </div>
      <span class="gauge-label">${escapeHtml(label)}</span>
      ${sub ? `<span class="gauge-sub">${escapeHtml(sub)}</span>` : ""}
    </div>`;
}

export function renderGauges(container, gauges) {
  container.innerHTML = gauges.map(gaugeCardHTML).join("");
}

export function renderBarChart(container, points) {
  const max = Math.max(...points.map((p) => p.value), 1);
  container.innerHTML = points
    .map(
      (p) =>
        `<div class="bar" style="height:${Math.max(4, (p.value / max) * 100)}%" title="${escapeHtml(p.label)}: ${escapeHtml(p.value)}"></div>`
    )
    .join("");
}

// ---------------- SOP / Doc cards ----------------
export function docCardHTML(doc) {
  return `
    <div class="card doc-card" data-doc-id="${escapeHtml(doc.id)}" role="button" tabindex="0">
      <div class="doc-card-top">
        <div class="doc-type-icon"><span class="material-symbols-rounded">${TYPE_ICON[doc.type] || "description"}</span></div>
        <span class="tag tag-${doc.type}">${TYPE_LABEL[doc.type] || doc.type}</span>
      </div>
      <div>
        <h3>${escapeHtml(doc.title)}</h3>
        <p class="doc-meta">${escapeHtml(doc.machine || "")} ${doc.machine ? "·" : ""} Diperbarui ${escapeHtml(doc.updated || "-")}</p>
      </div>
      <div class="doc-card-actions">
        <button class="btn btn-tech btn-sm btn-block" type="button"><span class="material-symbols-rounded">visibility</span> Preview</button>
      </div>
    </div>`;
}

export function renderDocGrid(container, docs) {
  if (!docs.length) {
    container.innerHTML = emptyStateHTML("search_off", "Tidak ada dokumen ditemukan.");
    return;
  }
  container.innerHTML = docs.map(docCardHTML).join("");
}

// ---------------- PM cards ----------------
const PM_STATUS_LABEL = { overdue: "Overdue", upcoming: "Upcoming", done: "Selesai" };

export function pmCardHTML(pm) {
  return `
    <div class="card pm-card status-${pm.status}" data-pm-id="${escapeHtml(pm.id)}" role="button" tabindex="0">
      <div class="pm-card-head">
        <h3>${escapeHtml(pm.machine)}</h3>
        <span class="pm-status-badge status-${pm.status}">${PM_STATUS_LABEL[pm.status]}</span>
      </div>
      <div class="pm-meta">
        <span><span class="material-symbols-rounded">build</span>${escapeHtml(pm.task)}</span>
        <span><span class="material-symbols-rounded">event</span>Jatuh tempo: ${escapeHtml(pm.due)}</span>
        <span><span class="material-symbols-rounded">person</span>${escapeHtml(pm.owner || "Belum ditugaskan")}</span>
      </div>
    </div>`;
}

export function renderPMGrid(container, list) {
  if (!list.length) {
    container.innerHTML = emptyStateHTML("task_alt", "Tidak ada jadwal PM pada filter ini.");
    return;
  }
  container.innerHTML = list.map(pmCardHTML).join("");
}

export function pmAlertBannerHTML(overdueList) {
  if (!overdueList.length) return "";
  return `
    <div class="alert-banner">
      <div class="alert-icon"><span class="material-symbols-rounded">warning</span></div>
      <div>
        <h3>${overdueList.length} Jadwal PM Overdue</h3>
        <p>Segera tindak lanjuti sebelum berdampak pada OEE &amp; reliability mesin.</p>
      </div>
      <button class="btn btn-primary" id="viewOverduePmBtn" type="button">Lihat Jadwal</button>
    </div>`;
}

// ---------------- Troubleshooting / diagnostic ----------------
export function diagnosticCardHTML(result) {
  if (!result) {
    return `
      <div class="card empty-state">
        <span class="material-symbols-rounded">search_off</span>
        <p>Kode fault tidak ditemukan di knowledge base. Coba istilah lain atau tanyakan langsung ke Musashi Man.</p>
      </div>`;
  }
  const steps = result.steps
    .map(
      (s, i) => `
      <div class="diag-step">
        <div class="diag-step-num">${i + 1}</div>
        <div>
          <h4>${escapeHtml(s.title)}</h4>
          <p>${escapeHtml(s.detail)}</p>
        </div>
      </div>`
    )
    .join("");
  return `
    <div class="card" style="margin-bottom:22px;">
      <span class="diag-severity ${result.severity}">
        <span class="material-symbols-rounded" style="font-size:14px">${result.severity === "critical" ? "error" : result.severity === "warning" ? "warning" : "info"}</span>
        ${escapeHtml(result.code)} &middot; ${escapeHtml(result.title)}
      </span>
      <div class="diag-steps">${steps}</div>
      ${result.attachment ? `<a class="btn btn-ghost btn-sm" style="margin-top:14px" href="${escapeHtml(result.attachment)}" target="_blank" rel="noopener"><span class="material-symbols-rounded">attach_file</span> Lampiran terkait</a>` : ""}
    </div>`;
}

export function faultChipCardHTML(fault) {
  return `
    <div class="card doc-card" data-fault-code="${escapeHtml(fault.code)}" role="button" tabindex="0" style="cursor:pointer">
      <div class="doc-card-top">
        <div class="doc-type-icon" style="background:var(--grad-brand); color:#fff;"><span class="material-symbols-rounded">bolt</span></div>
        <span class="diag-severity ${fault.severity}" style="margin:0">${fault.severity}</span>
      </div>
      <div>
        <h3>${escapeHtml(fault.code)}</h3>
        <p class="doc-meta">${escapeHtml(fault.title)}</p>
      </div>
    </div>`;
}

export function renderFaultGrid(container, faults) {
  container.innerHTML = faults.map(faultChipCardHTML).join("");
}

// ---------------- Recent activity ----------------
export function renderRecentActivity(container, items) {
  if (!items.length) {
    container.innerHTML = emptyStateHTML("inbox", "Belum ada aktivitas terbaru.");
    return;
  }
  container.innerHTML = items
    .map(
      (a) => `
      <div style="display:flex; gap:12px; padding:12px 0; border-bottom:1px solid var(--border-soft);">
        <div class="doc-type-icon" style="width:36px;height:36px;flex-shrink:0;"><span class="material-symbols-rounded" style="font-size:18px">${a.icon}</span></div>
        <div style="min-width:0;">
          <p style="font-size:13.5px; font-weight:600;">${escapeHtml(a.text)}</p>
          <p style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">${escapeHtml(a.time)}</p>
        </div>
      </div>`
    )
    .join("");
}

// ---------------- Command palette ----------------
export function cmdkItemHTML(item, active) {
  return `
    <div class="cmdk-item ${active ? "active" : ""}" data-cmdk-action="${escapeHtml(item.action)}" data-cmdk-payload='${escapeHtml(JSON.stringify(item.payload || {}))}'>
      <span class="material-symbols-rounded">${item.icon}</span>
      <span>${escapeHtml(item.label)}</span>
      ${item.sub ? `<span class="cmdk-item-sub">${escapeHtml(item.sub)}</span>` : ""}
    </div>`;
}

export function renderCmdkResults(container, groups, activeIndex) {
  let flatIndex = 0;
  let html = "";
  groups.forEach((group) => {
    if (!group.items.length) return;
    html += `<div class="cmdk-group-label">${escapeHtml(group.label)}</div>`;
    group.items.forEach((item) => {
      html += cmdkItemHTML(item, flatIndex === activeIndex);
      flatIndex += 1;
    });
  });
  container.innerHTML = html || `<div class="cmdk-empty">Tidak ada hasil. Coba kata kunci lain.</div>`;
}

export function emptyStateHTML(icon, text) {
  return `<div class="empty-state"><span class="material-symbols-rounded">${icon}</span><p>${escapeHtml(text)}</p></div>`;
}

// ---------------- Toasts ----------------
export function toastHTML(id, { type = "info", title, message }) {
  const icon = type === "success" ? "check_circle" : type === "error" ? "error" : "info";
  return `
    <div class="toast ${type}" id="${id}">
      <span class="material-symbols-rounded">${icon}</span>
      <div class="toast-msg"><strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ""}</div>
    </div>`;
}
