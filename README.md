# MUSA 2.0 — Musashi Utility & Service Assistant

> **GO FAR BEYOND** — Break Barriers & Go On Adventures! (Musashi 100th Year Vision)

AI-powered maintenance assistant untuk teknisi, engineer, dan operator Musashi. Dibangun ulang total (MUSA App 2.0) berdasarkan PRD *"MUSA App 2.0 — Musashi Utility & Service Assistant"*: dark cyber / Canva-inspired dashboard, avatar **Musashi Man ("Thinking Time Adventurer")** menggantikan MUSA Bot lama, terhubung ke backend Google Apps Script, dan PWA ultra-responsif (mobile, tablet, desktop, offline-first).

---

## ✨ Fitur Utama

- **Dashboard** — statistik OEE/MTBF/MTTR, overdue PM alert banner, utility snapshot, recent activity.
- **SOP Knowledge Base** — grid dokumen SOP/WI/Manual/Drawing dengan live search & filter, preview modal.
- **Intelligent Troubleshooting** — input kode fault → kartu diagnosa step-by-step 1-2-3.
- **PM Schedule** — jadwal preventive maintenance dengan status overdue/upcoming/done + checklist modal.
- **Utility Monitoring Board** — gauge SVG real-time untuk listrik, tekanan kompresor, suhu chiller, OEE, MTBF, MTTR + grafik konsumsi listrik 24 jam.
- **Musashi Man AI Assistant** — widget avatar mengambang dengan state idle/listening/processing/responding, voice interaction (STT via Web Speech API, TTS via SpeechSynthesis), Push-to-Talk, dan chat teks.
- **Command Palette (Ctrl/⌘+K)** — pencarian instan SOP, kode fault, navigasi modul, atau tanya langsung ke Musashi Man.
- **PWA** — installable, offline-first app-shell caching via service worker, ultra-responsive di semua breakpoint.
- **Mode Demo** — tanpa backend terpasang, aplikasi tetap berjalan penuh dengan data contoh sehingga selalu bisa didemokan.

---

## 📁 Struktur Proyek

```
├── index.html                  # Entry point (Canva-style Single Page App)
├── manifest.json                # PWA manifest
├── sw.js                        # Service worker (offline-first app shell caching)
├── icons/                       # App icons (SVG + PNG, termasuk maskable)
├── assets/
│   ├── css/
│   │   ├── main.css             # Variabel, layout, animasi dasar
│   │   ├── components.css       # Card, button, modal, badge, Musashi Man widget, gauge
│   │   └── responsive.css       # Breakpoint mobile / tablet / desktop
│   └── js/
│       ├── app.js               # Controller utama & state management
│       ├── gas-api.js           # Google Apps Script REST client wrapper
│       ├── ai-assistant.js      # Logika Musashi Man + STT/TTS handler
│       └── ui-renderers.js      # Render kartu, gauge, chart dinamis
└── README.md
```

---

## 🔌 Menghubungkan Backend Google Apps Script

1. Buka aplikasi → **Settings**.
2. Masukkan **GAS Web App URL** (hasil deploy Apps Script sebagai Web App, contoh: `https://script.google.com/macros/s/XXXXX/exec`).
3. Klik **Test Koneksi**, lalu **Simpan & Sambungkan**.
4. URL disimpan di `localStorage` perangkat — tidak perlu di-hardcode di kode.

Jika URL kosong, aplikasi otomatis berjalan dalam **Demo Mode** menggunakan data contoh.

### Kontrak API yang Diharapkan

`gas-api.js` memanggil endpoint dengan pola `GET {GAS_URL}?action=<nama_aksi>`. Backend Apps Script (`doGet(e)`) perlu membaca `e.parameter.action` dan mengembalikan JSON via `ContentService`. Aksi yang digunakan:

| Action | Deskripsi | Bentuk data (ringkas) |
| --- | --- | --- |
| `ping` | Cek koneksi | `{ "ok": true }` |
| `getDashboardStats` | Statistik ringkas dashboard | `[{ icon, value, label, trend, trendDir, accent }]` |
| `getSOPDocs` | Daftar dokumen SOP/WI/Manual/Drawing | `[{ id, type, title, machine, updated, url }]` |
| `getPMSchedule` | Jadwal preventive maintenance | `[{ id, machine, task, due, status, owner, checklist:[string] }]` |
| `getUtilityData` | Data gauge utility | `[{ value, max, label, unit, sub, colorFrom, colorTo }]` |
| `getFaultCodes` | Knowledge base troubleshooting | `{ "E-104": { code, title, severity, steps:[{title, detail}], attachment } }` |

Contoh kerangka `doGet` di Apps Script:

```javascript
function doGet(e) {
  const action = e.parameter.action;
  let payload;
  switch (action) {
    case "ping": payload = { ok: true }; break;
    case "getDashboardStats": payload = getDashboardStats_(); break;
    case "getSOPDocs": payload = getSOPDocs_(); break;
    case "getPMSchedule": payload = getPMSchedule_(); break;
    case "getUtilityData": payload = getUtilityData_(); break;
    case "getFaultCodes": payload = getFaultCodes_(); break;
    default: payload = { error: "Unknown action" };
  }
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

`type` pada dokumen SOP mendukung nilai: `sop`, `wi`, `manual`, `drawing`. `status` pada PM mendukung: `overdue`, `upcoming`, `done`. `severity` pada fault code mendukung: `critical`, `warning`, `info`.

Semua respons berhasil otomatis di-cache di `localStorage` (10 menit) sehingga aplikasi tetap bisa menampilkan data terakhir saat offline (offline-first).

---

## 🚀 Deploy ke GitHub Pages

1. Push seluruh isi folder ini ke branch `main` (atau branch default) repo GitHub.
2. Masuk ke **Settings → Pages** pada repo, pilih source branch tersebut (root `/`).
3. Akses aplikasi melalui URL GitHub Pages yang diberikan.
4. Karena ini murni static site (HTML/CSS/JS tanpa build step), tidak diperlukan proses build tambahan.

## 🖥️ Menjalankan Secara Lokal

Karena menggunakan ES Modules (`type="module"`), buka lewat static server (bukan `file://`):

```bash
python3 -m http.server 8080
# lalu buka http://localhost:8080
```

---

## 🎨 Design System

| Token | Nilai | Kegunaan |
| --- | --- | --- |
| `--bg-primary` | `#0f1117` | Background utama (Deep Slate/Charcoal) |
| `--surface-1` / `--surface-2` | `#1e293b` / `#1e1b4b` | Card & surface |
| `--red` / `--red-deep` | `#f43f5e` / `#e11d48` | Aksen Musashi Red |
| `--cyan` / `--cyan-deep` | `#38bdf8` / `#06b6d4` | Aksen Futuristic Cyan |

Font: **Inter**. Ikon: **Material Symbols Rounded**.

---

## 🧭 Filosofi MUSA

Disiplin · Fokus · Reliability · Continuous Improvement · Service Excellence — terinspirasi semangat Musashi Miyamoto dan visi 100 tahun Musashi: **GO FAR BEYOND**.
