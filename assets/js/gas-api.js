// =========================================================
// MUSA App 2.0 — Google Apps Script REST Client Wrapper
// Asynchronous fetch with auto-retry, response caching,
// offline fallback, and demo-mode mock fallback.
// =========================================================

const LS_URL_KEY = "musa_gas_url";
const LS_CACHE_PREFIX = "musa_cache_";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes freshness before "stale" flag

class GasApiClient {
  constructor() {
    this.baseUrl = localStorage.getItem(LS_URL_KEY) || "";
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  setBaseUrl(url) {
    this.baseUrl = (url || "").trim();
    if (this.baseUrl) {
      localStorage.setItem(LS_URL_KEY, this.baseUrl);
    } else {
      localStorage.removeItem(LS_URL_KEY);
    }
  }

  isConfigured() {
    return Boolean(this.baseUrl);
  }

  _cacheKey(action, params) {
    return `${LS_CACHE_PREFIX}${action}_${JSON.stringify(params || {})}`;
  }

  _readCache(action, params) {
    try {
      const raw = localStorage.getItem(this._cacheKey(action, params));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const age = Date.now() - parsed.ts;
      return { data: parsed.data, stale: age > CACHE_TTL_MS };
    } catch {
      return null;
    }
  }

  _writeCache(action, params, data) {
    try {
      localStorage.setItem(
        this._cacheKey(action, params),
        JSON.stringify({ ts: Date.now(), data })
      );
    } catch {
      /* storage full or unavailable — non-fatal */
    }
  }

  clearCache() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(LS_CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  }

  async _fetchOnce(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: "GET", signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Request data from the GAS web app.
   * @param {string} action - e.g. "getDashboardStats"
   * @param {object} params - extra query params
   * @param {object} opts - { retries, timeout, mockFallback: () => data }
   */
  async request(action, params = {}, opts = {}) {
    const { retries = 2, timeout = 9000, mockFallback = null } = opts;

    if (!this.isConfigured()) {
      const cached = this._readCache(action, params);
      if (cached) return { data: cached.data, source: "cache", stale: cached.stale };
      return { data: mockFallback ? mockFallback() : null, source: "demo" };
    }

    const qs = new URLSearchParams({ action, ...params }).toString();
    const url = `${this.baseUrl}${this.baseUrl.includes("?") ? "&" : "?"}${qs}`;

    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const json = await this._fetchOnce(url, timeout);
        this._writeCache(action, params, json);
        return { data: json, source: "network" };
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
      }
    }

    const cached = this._readCache(action, params);
    if (cached) return { data: cached.data, source: "cache", stale: true, error: lastErr };
    if (mockFallback) return { data: mockFallback(), source: "mock", error: lastErr };
    throw lastErr || new Error("GAS request failed");
  }

  /**
   * Ask the GAS backend's Gemini Flash-Lite powered aiChat_ action.
   * Uses text/plain content-type to avoid a CORS preflight against the
   * Apps Script Web App (which doesn't handle OPTIONS requests).
   * Returns null (never throws) so callers can fall back to local logic.
   */
  async chat(message, context = {}) {
    if (!this.isConfigured()) return null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "aiChat", message, context }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json && json.reply ? json : null;
    } catch {
      return null;
    }
  }

  async testConnection() {
    if (!this.isConfigured()) return { ok: false, message: "URL belum diatur (mode demo aktif)." };
    try {
      const json = await this._fetchOnce(
        `${this.baseUrl}${this.baseUrl.includes("?") ? "&" : "?"}action=ping`,
        7000
      );
      return { ok: true, message: "Koneksi berhasil.", data: json };
    } catch (err) {
      return { ok: false, message: err.message || "Koneksi gagal." };
    }
  }
}

export const gasApi = new GasApiClient();
