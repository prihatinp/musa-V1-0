// =========================================================
// MUSA App 2.0 — Musashi Man AI Assistant Widget
// State machine (idle/listening/processing/responding),
// Web Speech STT/TTS handling, Push-to-Talk, chat bubbles.
// =========================================================

const IDLE_QUOTES = [
  "Going Far Beyond limits...",
  "Discipline. Focus. Reliability.",
  "Break barriers, go on adventures.",
  "Siap membantu kapan pun dibutuhkan.",
];

const THINKING_QUOTES = ["Going Far Beyond limits...", "Menganalisa data...", "Menyusun rekomendasi terbaik..."];

export class MusashiMan {
  /**
   * @param {object} dom - element references
   * @param {(text: string) => Promise<{reply: string, action?: {type:string, payload?:any}}>} onQuery
   */
  constructor(dom, onQuery) {
    this.dom = dom;
    this.onQuery = onQuery;
    this.state = "idle";
    this.ttsEnabled = true;
    this.autoSend = true;
    this.recognition = null;
    this._initSpeechRecognition();
    this._bindEvents();
    this._idleQuoteTimer = null;
    this._startIdleQuoteLoop();
    this.setState("idle");
  }

  // ---------------- Public setters ----------------
  setTtsEnabled(v) {
    this.ttsEnabled = v;
  }
  setAutoSend(v) {
    this.autoSend = v;
  }

  // ---------------- State machine ----------------
  setState(state) {
    this.state = state;
    this.dom.widget.dataset.state = state;
    const labels = { idle: "Idle", listening: "Listening…", processing: "Thinking…", responding: "Responding" };
    this.dom.stateLabel.textContent = labels[state] || state;
  }

  showQuote(text) {
    this.dom.quoteBubble.textContent = text;
    this.dom.quoteBubble.classList.add("show");
    clearTimeout(this._quoteHideTimer);
    this._quoteHideTimer = setTimeout(() => this.dom.quoteBubble.classList.remove("show"), 3200);
  }

  _startIdleQuoteLoop() {
    clearInterval(this._idleQuoteTimer);
    this._idleQuoteTimer = setInterval(() => {
      if (this.state === "idle" && !this.dom.chatPanel.classList.contains("open")) {
        const q = IDLE_QUOTES[Math.floor(Math.random() * IDLE_QUOTES.length)];
        this.showQuote(q);
      }
    }, 14000);
  }

  // ---------------- Chat panel ----------------
  openChat() {
    this.dom.chatPanel.classList.add("open");
    if (!this.dom.chatBody.dataset.greeted) {
      this.addBotBubble("Halo Teknisi! Saya Musashi Man. Tanyakan SOP, kode fault, atau jadwal PM — saya siap membantu Go Far Beyond. 🔥");
      this.dom.chatBody.dataset.greeted = "1";
    }
    setTimeout(() => this.dom.textInput.focus(), 150);
  }

  closeChat() {
    this.dom.chatPanel.classList.remove("open");
  }

  toggleChat() {
    this.dom.chatPanel.classList.contains("open") ? this.closeChat() : this.openChat();
  }

  addUserBubble(text) {
    const el = document.createElement("div");
    el.className = "musa-bubble user";
    el.textContent = text;
    this.dom.chatBody.appendChild(el);
    this._scrollToBottom();
  }

  addBotBubble(text) {
    const el = document.createElement("div");
    el.className = "musa-bubble bot";
    el.innerHTML = `<span class="bot-text"></span><button class="play-voice-btn" type="button"><span class="material-symbols-rounded">play_circle</span>Play Voice</button>`;
    this.dom.chatBody.appendChild(el);
    this._scrollToBottom();
    this._typeText(el.querySelector(".bot-text"), text);
    el.querySelector(".play-voice-btn").addEventListener("click", () => this.speak(text));
    return el;
  }

  showTyping() {
    const el = document.createElement("div");
    el.className = "musa-typing";
    el.id = "musaTypingIndicator";
    el.innerHTML = "<span></span><span></span><span></span>";
    this.dom.chatBody.appendChild(el);
    this._scrollToBottom();
  }

  hideTyping() {
    document.getElementById("musaTypingIndicator")?.remove();
  }

  _typeText(el, text) {
    let i = 0;
    const step = () => {
      el.textContent = text.slice(0, i);
      i += Math.max(1, Math.round(text.length / 60));
      if (i <= text.length) {
        requestAnimationFrame(() => setTimeout(step, 12));
      } else {
        el.textContent = text;
      }
    };
    step();
  }

  _scrollToBottom() {
    this.dom.chatBody.scrollTop = this.dom.chatBody.scrollHeight;
  }

  // ---------------- Message handling ----------------
  async handleMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.openChat();
    this.addUserBubble(trimmed);
    this.dom.textInput.value = "";
    this.setState("processing");
    this.showQuote(THINKING_QUOTES[Math.floor(Math.random() * THINKING_QUOTES.length)]);
    this.showTyping();

    let result;
    try {
      result = await this.onQuery(trimmed);
    } catch {
      result = { reply: "Maaf, terjadi kendala saat memproses permintaan. Coba lagi ya." };
    }

    await new Promise((r) => setTimeout(r, 450));
    this.hideTyping();
    this.setState("responding");
    this.addBotBubble(result.reply);
    if (this.ttsEnabled) this.speak(result.reply);

    setTimeout(() => {
      if (this.state === "responding") this.setState("idle");
    }, 2200);
  }

  // ---------------- Text-to-Speech ----------------
  speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.pitch = 1.0;
    utter.lang = "id-ID";
    window.speechSynthesis.speak(utter);
  }

  // ---------------- Speech-to-Text ----------------
  _initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.sttSupported = false;
      return;
    }
    this.sttSupported = true;
    this.recognition = new SR();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = "id-ID";

    this.recognition.onstart = () => this.setState("listening");
    this.recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      this.dom.textInput.value = transcript;
      if (this.autoSend) this.handleMessage(transcript);
    };
    this.recognition.onerror = () => {
      this.setState("idle");
      this.dom.onSttError?.();
    };
    this.recognition.onend = () => {
      if (this.state === "listening") this.setState("idle");
      this.dom.pttBtn.classList.remove("recording");
    };
  }

  startListening() {
    if (!this.sttSupported) {
      this.dom.onSttUnsupported?.();
      return;
    }
    this.openChat();
    try {
      this.recognition.start();
      this.dom.pttBtn.classList.add("recording");
    } catch {
      /* already started */
    }
  }

  stopListening() {
    if (this.sttSupported && this.state === "listening") {
      this.recognition.stop();
    }
    this.dom.pttBtn.classList.remove("recording");
  }

  // ---------------- DOM bindings ----------------
  _bindEvents() {
    this.dom.avatarBtn.addEventListener("click", () => this.toggleChat());
    this.dom.closeBtn.addEventListener("click", () => this.closeChat());

    this.dom.sendBtn.addEventListener("click", () => this.handleMessage(this.dom.textInput.value));
    this.dom.textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.handleMessage(this.dom.textInput.value);
    });

    const ptt = this.dom.pttBtn;
    const start = (e) => {
      e.preventDefault();
      this.startListening();
    };
    const stop = () => this.stopListening();
    ptt.addEventListener("mousedown", start);
    ptt.addEventListener("touchstart", start, { passive: false });
    ptt.addEventListener("mouseup", stop);
    ptt.addEventListener("mouseleave", stop);
    ptt.addEventListener("touchend", stop);
  }
}
