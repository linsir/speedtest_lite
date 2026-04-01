(function () {
  "use strict";

  const root = document.getElementById("app-render");
  if (!root) return;

  const SERVER_NAME = "本地服务器 / Local Server";
  const SPEED_STOPS = [0, 10, 25, 50, 100, 200, 400, 600, 800, 1000];
  const NEEDLE_ANGLE_STOPS = [-122, -101, -77, -51, -27, -6, 18, 44, 71, 99];
  const GAUGE_MAX_BANDWIDTH = 1000;
  const SPEED_HISTORY_KEY = "speedtest_lite_history_v1";
  const SPEED_HISTORY_LIMIT = 5;

  const icons = {
    speed: '<svg viewBox="0 0 24 24" class="svg-icon"><path d="M12 3a10 10 0 1 0 10 10A10 10 0 0 0 12 3zm6.7 11h-5.2l-3.2 3.2a1 1 0 0 1-1.4-1.4l3.5-3.5a1 1 0 0 1 .7-.3h5.6a1 1 0 0 1 0 2z"/></svg>',
    back: '<svg viewBox="100 0 800 768" class="svg-icon icon-back" preserveAspectRatio="none"><path d="M413 2A448 448 0 0 0 55 237a443 443 0 0 0-42 324 432 432 0 0 0 120 207l62-61-10-12a366 366 0 0 1 20-507 365 365 0 0 1 277-95 360 360 0 0 1 234 602l-10 12 31 30 32 31a447 447 0 0 0 42-587A452 452 0 0 0 413 2z M511 330 384 441l-24 21 34 35 38 40 5 5 61-69a135237 135237 0 0 1 161-186c1-1-43-48-44-48l-104 91z"></path></svg>',
    pingTest: '<svg viewBox="0 0 768 768" class="svg-icon icon-ping-test"><path d="M249 33c-11 3-22 11-28 22l-50 140-49 139-1 4H81c-43 0-46 0-56 6-10 5-20 16-23 26-2 7-2 21 0 28 5 14 18 26 34 30 8 3 121 3 129 1 13-4 24-13 29-24a2557 2557 0 0 0 55-153l45 227c51 251 47 233 57 244 22 23 60 17 74-11l50-182 47-176 26 44 29 51c4 6 11 12 20 16l6 2 63 1 67-1c13-4 25-13 30-24 12-26-1-55-28-65l-49-2h-45l-40-71-47-84c-9-17-13-22-19-27-9-7-15-9-28-9-12 0-13 1-19 4-9 4-19 13-22 21l-39 141-36 136c-1 1-20-95-43-212-48-236-44-220-54-231a46 46 0 0 0-45-11z"></path></svg>',
    ping: '<svg viewBox="0 0 24 24" class="svg-icon"><path d="M2 18h2a8 8 0 0 1 16 0h2a10 10 0 0 0-20 0zm4 0h2a4 4 0 0 1 8 0h2a6 6 0 0 0-12 0zm5-9h2v7h-2z"/></svg>',
    down: '<svg viewBox="0 0 24 24" class="svg-icon"><path d="M11 3h2v12l4-4 1.4 1.4L12 19l-6.4-6.6L7 11l4 4V3z"/></svg>',
    up: '<svg viewBox="0 0 24 24" class="svg-icon"><path d="M11 21h2V9l4 4 1.4-1.4L12 5l-6.4 6.6L7 13l4-4v12z"/></svg>',
    close: '<svg viewBox="0 0 24 24" class="svg-icon"><path d="m6 6 12 12-1.4 1.4L4.6 7.4 6 6zm12 0L6 18l-1.4-1.4 12-12L18 6z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" class="svg-icon"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm6.9 9h-3.2a15.5 15.5 0 0 0-1.5-5A8 8 0 0 1 18.9 11zM12 4c.9 1.2 1.9 3.5 2.1 7H9.9c.2-3.5 1.2-5.8 2.1-7zM4.1 13h3.2a15.5 15.5 0 0 0 1.5 5A8 8 0 0 1 4.1 13zM7.3 11H4.1a8 8 0 0 1 4.7-5 15.5 15.5 0 0 0-1.5 5zm4.7 9c-.9-1.2-1.9-3.5-2.1-7h4.2c-.2 3.5-1.2 5.8-2.1 7zm2.2-2a15.5 15.5 0 0 0 1.5-5h3.2a8 8 0 0 1-4.7 5z"/></svg>',
    needle: '<svg viewBox="0 0 40 240"><defs><linearGradient id="needleGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f8ffff"/><stop offset="100%" stop-color="#8e9ba8"/></linearGradient></defs><path d="M18 8h4l6 145-8 78-8-78L18 8z"/></svg>'
  };

  function fmt(value, decimals) {
    const n = Number(value);
    if (!Number.isFinite(n)) return (0).toFixed(decimals);
    return n.toFixed(decimals);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function speedToRate(mbps) {
    const value = clamp(Number(mbps) || 0, 0, GAUGE_MAX_BANDWIDTH);
    for (let i = 0; i < SPEED_STOPS.length - 1; i += 1) {
      const left = SPEED_STOPS[i];
      const right = SPEED_STOPS[i + 1];
      if (value <= right) {
        const span = right - left || 1;
        return ((i + (value - left) / span) / (SPEED_STOPS.length - 1)) * 100;
      }
    }
    return 100;
  }

  function speedToNeedleAngle(mbps) {
    const value = clamp(Number(mbps) || 0, 0, GAUGE_MAX_BANDWIDTH);
    for (let i = 0; i < SPEED_STOPS.length - 1; i += 1) {
      const left = SPEED_STOPS[i];
      const right = SPEED_STOPS[i + 1];
      if (value <= right) {
        const span = right - left || 1;
        const ratio = (value - left) / span;
        const from = NEEDLE_ANGLE_STOPS[i];
        const to = NEEDLE_ANGLE_STOPS[i + 1];
        return from + (to - from) * ratio;
      }
    }
    return NEEDLE_ANGLE_STOPS[NEEDLE_ANGLE_STOPS.length - 1];
  }

  function angleToProgressPercent(angle) {
    const minAngle = NEEDLE_ANGLE_STOPS[0];
    const maxAngle = NEEDLE_ANGLE_STOPS[NEEDLE_ANGLE_STOPS.length - 1];
    const safeAngle = clamp(Number(angle) || minAngle, minAngle, maxAngle);
    return ((safeAngle - minAngle) / (maxAngle - minAngle)) * 100;
  }

  function formatHistoryTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  function buildLayout() {
    return [
      '<header class="main-header">',
      '  <div class="container main-header_container flex align-center justify-between">',
      '    <div class="main-header_logo flex align-center">',
      `      <span class="main-header_icon">${icons.speed}</span>`,
      '      <span class="main-header_text">Speed Test</span>',
      '    </div>',
      '    <nav class="main-header_nav flex spacing-medium">',
      `      <button class="main-header_button" data-view="test">${icons.speed}<span>Speed Test</span></button>`,
      `      <button class="main-header_button" data-view="ping">${icons.pingTest}<span>Ping Test</span></button>`,
      '    </nav>',
      '  </div>',
      '</header>',
      '<main class="main-content">',
      '  <div class="container">',
      '    <section class="stage-test test--opened">',
      '      <div class="test-main relative">',
      '        <div class="test-engine relative test-engine_open" id="test-engine"></div>',
      '        <div class="test-controls flex justify-center">',
      '          <button class="speed-stop-button" id="speed-stop">Stop</button>',
      '        </div>',
      '      </div>',
      '      <div class="test-results" id="speed-results">',
      `        <button class="test-results_close-button" id="speed-reset">${icons.close}</button>`,
      '        <div class="test-results_data flex">',
      '          <div class="test-results_item test-results_download">',
      `            <div class="test-results_header flex align-center spacing-small">${icons.down}<span>Download</span></div>`,
      '            <div class="test-results_speed speed-number" id="speed-dl">0.0</div>',
      '            <div class="test-results_graph"><svg class="graph" viewBox="0 0 200 56" preserveAspectRatio="none"><polygon class="chart" id="speed-dl-area"></polygon><polyline class="line" id="speed-dl-line"></polyline></svg></div>',
      '          </div>',
      '          <div class="test-results_item test-results_upload">',
      `            <div class="test-results_header flex align-center spacing-small">${icons.up}<span>Upload</span></div>`,
      '            <div class="test-results_speed speed-number" id="speed-ul">0.0</div>',
      '            <div class="test-results_graph"><svg class="graph" viewBox="0 0 200 56" preserveAspectRatio="none"><polygon class="chart" id="speed-ul-area"></polygon><polyline class="line" id="speed-ul-line"></polyline></svg></div>',
      '          </div>',
      '        </div>',
      '        <div class="flex justify-between" style="margin-top:0.8rem;">',
      '          <div><span class="text-holder">Ping</span> <span class="speed-number" id="speed-ping">0.0</span> ms</div>',
      '          <div><span class="text-holder">Jitter</span> <span class="speed-number" id="speed-jitter">0.0</span> ms</div>',
      '        </div>',
      '      </div>',
      '      <div class="test-footer">',
      '        <div class="test-footer_item flex align-center">',
      `          <div class="test-footer_icon flex center">${icons.globe}</div>`,
      '          <div class="test-footer_content">',
      '            <div class="test-footer_title" id="server-name"></div>',
      '            <div class="test-footer_description text-holder" id="server-ip"></div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <section class="speed-history" id="speed-history">',
      '        <div class="speed-history_header flex align-center justify-between">',
      '          <div class="speed-history_title">最近 5 次测速峰值 (Mbps)</div>',
      '          <button class="speed-history_clear" id="speed-history-clear">清空历史</button>',
      '        </div>',
      '        <ul class="speed-history_list" id="speed-history-list"></ul>',
      '      </section>',
      '    </section>',
      '',
      '    <section class="stage-ping">',
      '      <div class="stage-options flex align-center">',
      '        <button class="start-button" id="ping-start">Start</button>',
      '        <div class="stage-options_margin">',
      '          <div class="stage-options_name">Target</div>',
      '          <div class="text-holder" id="ping-target">/backend/ws (WebSocket)</div>',
      '        </div>',
      '      </div>',
      '      <div class="ping-results" id="ping-results"></div>',
      '      <div class="ping-graph">',
      '        <div class="ping-graph_inner relative">',
      '          <div class="ping-graph_items flex" id="ping-bars"></div>',
      '          <svg class="ping-graph_line" viewBox="0 0 640 140" preserveAspectRatio="none"><polyline id="ping-line"></polyline></svg>',
      '        </div>',
      '      </div>',
      '    </section>',
      '',
      '  </div>',
      '</main>'
    ].join("\n");
  }

  class Gauge {
    constructor(container, mode) {
      this.container = container;
      this.mode = mode || "download";
      this.circumference = 289;
      this.render();
      this.setMode(this.mode);
      this.setValue(0);
    }

    render() {
      this.container.innerHTML = [
        `<div class="gauge gauge_${this.mode}">`,
        '  <div class="gauge_icon">',
        '    <svg viewBox="0 0 100 100">',
        '      <circle class="gauge_circle gauge_background" r="42.4" cx="50" cy="50"></circle>',
        '      <circle class="gauge_circle gauge_loading-background" r="42.8" cx="50" cy="50"></circle>',
        '      <circle class="gauge_circle gauge_stroke-left" r="46" cx="50" cy="50"></circle>',
        '      <circle class="gauge_circle gauge_stroke-right" r="46" cx="50" cy="50"></circle>',
        '      <circle class="gauge_circle gauge_stroke-speed" r="46" cx="50" cy="50"></circle>',
        '    </svg>',
        '  </div>',
        '  <div class="gauge_increments">',
        SPEED_STOPS.map((s, i) => `<div class="gauge_increment increment--${i}">${s}</div>`).join(""),
        '  </div>',
        '  <div class="gauge_inner">',
        `    <div class="gauge_needle">${icons.needle}</div>`,
        '    <div class="gauge_state">',
        `      <div class="gauge_cap">MAX ${GAUGE_MAX_BANDWIDTH} Mbps</div>`,
        '      <div class="gauge_speed-number speed-number">0.0</div>',
        `      <div class="gauge_speed-unit flex center">${icons.down}<span>Mbps</span></div>`,
        '    </div>',
        '  </div>',
        '</div>'
      ].join("\n");
      this.root = this.container.firstElementChild;
      this.needle = this.root.querySelector(".gauge_needle");
      this.stroke = this.root.querySelector(".gauge_stroke-speed");
      this.number = this.root.querySelector(".gauge_speed-number");
      this.unit = this.root.querySelector(".gauge_speed-unit");
    }

    setMode(mode) {
      this.mode = mode;
      this.root.classList.toggle("gauge_download", mode === "download");
      this.root.classList.toggle("gauge_upload", mode === "upload");
      this.unit.innerHTML = `${mode === "upload" ? icons.up : icons.down}<span>Mbps</span>`;
    }

    setValue(speed) {
      const angle = speedToNeedleAngle(speed);
      const progress = angleToProgressPercent(angle);
      const dashOffset = this.circumference - (this.circumference * progress) / 100;
      this.stroke.style.strokeDasharray = `${this.circumference}`;
      this.stroke.style.strokeDashoffset = String(dashOffset);
      this.needle.style.transform = `rotate(${angle}deg)`;
      this.number.textContent = fmt(speed, 1);

      const maxTickIndex = SPEED_STOPS.length - 1;
      const rate = speedToRate(speed);
      const active = Math.max(0, Math.min(maxTickIndex, Math.round((rate / 100) * maxTickIndex)));
      this.root.querySelectorAll(".gauge_increment").forEach((tick, index) => {
        tick.classList.toggle("active", index <= active);
      });
    }
  }

  function drawMiniGraph(areaEl, lineEl, values) {
    const max = Math.max(1, ...values);
    const width = 200;
    const height = 56;
    const points = values
      .map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * width;
        const y = height - (clamp(v / max, 0, 1) * (height - 8) + 4);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    lineEl.setAttribute("points", points);
    areaEl.setAttribute("points", `0,56 ${points} 200,56`);
  }

  class SpeedStage {
    constructor() {
      this.engine = document.getElementById("test-engine");
      this.results = document.getElementById("speed-results");
      this.dlEl = document.getElementById("speed-dl");
      this.ulEl = document.getElementById("speed-ul");
      this.pingEl = document.getElementById("speed-ping");
      this.jitterEl = document.getElementById("speed-jitter");
      this.gauge = new Gauge(this.engine, "download");
      this.stageEl = document.querySelector(".stage-test");
      this.stopBtn = document.getElementById("speed-stop");
      this.historyList = document.getElementById("speed-history-list");
      this.historyClearBtn = document.getElementById("speed-history-clear");
      this.dlHistory = [];
      this.ulHistory = [];
      this.maxDl = 0;
      this.maxUl = 0;
      this.history = this.loadHistory();
      this.running = false;
      this.setupUi();
      this.reset();
      this.renderHistory();
      this.updateFooter();
    }

    setupUi() {
      const button = document.createElement("button");
      button.className = "engine-button";
      button.innerHTML = '<div class="engine-button_background"></div><div class="engine-button_border"></div><div class="engine-button_animated-border"></div><div class="engine-button_text">GO!</div>';
      button.addEventListener("click", () => {
        if (this.running) {
          this.stop(true);
        } else {
          this.start();
        }
      });
      this.engine.appendChild(button);
      this.button = button;
      this.buttonText = button.querySelector(".engine-button_text");
      this.stopBtn.addEventListener("click", () => this.stop(true));
      this.historyClearBtn.addEventListener("click", () => this.clearHistory());

      document.getElementById("speed-reset").addEventListener("click", () => this.reset());
    }

    loadHistory() {
      try {
        const raw = localStorage.getItem(SPEED_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.slice(0, SPEED_HISTORY_LIMIT);
      } catch (err) {
        return [];
      }
    }

    persistHistory() {
      try {
        localStorage.setItem(SPEED_HISTORY_KEY, JSON.stringify(this.history.slice(0, SPEED_HISTORY_LIMIT)));
      } catch (err) {
        // Ignore storage quota/privacy mode errors.
      }
    }

    clearHistory() {
      this.history = [];
      try {
        localStorage.removeItem(SPEED_HISTORY_KEY);
      } catch (err) {
        // Ignore storage access issues.
      }
      this.renderHistory();
    }

    saveRunHistory() {
      if (this.maxDl <= 0 && this.maxUl <= 0) return;
      this.history.unshift({
        at: Date.now(),
        downloadMax: Number(fmt(this.maxDl, 2)),
        uploadMax: Number(fmt(this.maxUl, 2))
      });
      this.history = this.history.slice(0, SPEED_HISTORY_LIMIT);
      this.persistHistory();
      this.renderHistory();
    }

    renderHistory() {
      if (!this.history.length) {
        this.historyList.innerHTML = '<li class="speed-history_empty text-holder">暂无测速记录</li>';
        return;
      }
      this.historyList.innerHTML = this.history
        .map((item, index) => {
          const time = formatHistoryTime(item.at);
          return `<li class="speed-history_item"><span class="speed-history_index">#${index + 1}</span><span class="speed-history_time">${time}</span><span class="speed-history_value">↓ ${fmt(item.downloadMax, 2)} / ↑ ${fmt(item.uploadMax, 2)} Mbps</span></li>`;
        })
        .join("");
    }

    createTester(order) {
      const s = new Speedtest();
      s.setParameter("url_dl", "/backend/garbage");
      s.setParameter("url_ul", "/backend/empty");
      s.setParameter("url_ping", "/backend/empty");
      s.setParameter("url_getIp", "/backend/get_ip");
      s.setParameter("getIp_ispInfo", false);
      s.setParameter("telemetry_level", "0");
      s.setParameter("test_order", order || "IP_D_U");
      return s;
    }

    start() {
      this.running = true;
      this.dlHistory = [];
      this.ulHistory = [];
      this.maxDl = 0;
      this.maxUl = 0;
      this.stageEl.classList.add("test--started", "test--opened");
      this.stageEl.classList.remove("test--upload");
      this.stageEl.classList.add("test--download");
      this.button.classList.add("unseen");
      this.engine.classList.add("test-engine_load");
      this.engine.classList.remove("test-engine_close");
      this.button.classList.remove("engine-button_again");
      this.tester = this.createTester("IP_D_U");

      this.tester.onupdate = (data) => {
        const state = Number(data.testState);
        if (state === 1) {
          this.gauge.setMode("download");
          this.stageEl.classList.add("test--download");
          this.stageEl.classList.remove("test--upload");
          const dl = Number(data.dlStatus) || 0;
          this.maxDl = Math.max(this.maxDl, dl);
          this.gauge.setValue(dl);
          this.dlEl.textContent = fmt(dl, 1);
          this.dlHistory.push(dl);
          if (this.dlHistory.length > 60) this.dlHistory.shift();
          drawMiniGraph(document.getElementById("speed-dl-area"), document.getElementById("speed-dl-line"), this.dlHistory);
        } else if (state === 3) {
          this.gauge.setMode("upload");
          this.stageEl.classList.remove("test--download");
          this.stageEl.classList.add("test--upload");
          const ul = Number(data.ulStatus) || 0;
          this.maxUl = Math.max(this.maxUl, ul);
          this.gauge.setValue(ul);
          this.ulEl.textContent = fmt(ul, 1);
          this.ulHistory.push(ul);
          if (this.ulHistory.length > 60) this.ulHistory.shift();
          drawMiniGraph(document.getElementById("speed-ul-area"), document.getElementById("speed-ul-line"), this.ulHistory);
        }
        this.pingEl.textContent = fmt(data.pingStatus || 0, 1);
        this.jitterEl.textContent = fmt(data.jitterStatus || 0, 1);
      };

      this.tester.onend = () => {
        this.saveRunHistory();
        this.running = false;
        this.stageEl.classList.remove("test--started");
        this.engine.classList.remove("test-engine_load");
        this.button.classList.remove("unseen");
        this.button.classList.add("engine-button_again");
        this.buttonText.textContent = "Start";
      };

      this.tester.start();
    }

    stop(abortNow) {
      if (abortNow && this.tester) this.tester.abort();
      this.running = false;
      this.stageEl.classList.remove("test--started");
      this.engine.classList.remove("test-engine_load");
      this.button.classList.remove("unseen");
      this.button.classList.add("engine-button_again");
      this.buttonText.textContent = "Start";
    }

    reset() {
      this.stop(true);
      this.maxDl = 0;
      this.maxUl = 0;
      this.gauge.setMode("download");
      this.gauge.setValue(0);
      this.dlEl.textContent = "0.0";
      this.ulEl.textContent = "0.0";
      this.pingEl.textContent = "0.0";
      this.jitterEl.textContent = "0.0";
      drawMiniGraph(document.getElementById("speed-dl-area"), document.getElementById("speed-dl-line"), [0]);
      drawMiniGraph(document.getElementById("speed-ul-area"), document.getElementById("speed-ul-line"), [0]);
    }

    async updateFooter() {
      document.getElementById("server-name").textContent = SERVER_NAME;
      const ipEl = document.getElementById("server-ip");
      ipEl.innerHTML = '<span class="test-footer_skeleton-text">Loading</span>';
      try {
        const res = await fetch(`/backend/get_ip?r=${Math.random()}`);
        const data = await res.json();
        const ip = data.ip || data.processedString || "-";
        ipEl.textContent = `IP: ${ip}`;
      } catch (err) {
        ipEl.textContent = "IP: unavailable";
      }
    }
  }

  class PingStage {
    constructor() {
      this.startBtn = document.getElementById("ping-start");
      this.resultsRoot = document.getElementById("ping-results");
      this.line = document.getElementById("ping-line");
      this.bars = document.getElementById("ping-bars");
      this.graphInner = document.querySelector(".ping-graph_inner");
      this.testDurationMs = 30 * 1000;
      this.sampleIntervalMs = 1000;
      this.testDurationSeconds = Math.round(this.testDurationMs / 1000);
      this.maxSamples = Math.max(1, Math.ceil(this.testDurationMs / this.sampleIntervalMs));
      this.running = false;
      this.runId = 0;
      this.history = [];
      this.hoverValues = [];
      this.axisMax = 10;
      this.activeSocket = null;
      this.activeFetchController = null;
      this.pendingDelayTimer = null;
      this.setupGraphOverlay();
      this.prepareBars();
      this.startBtn.addEventListener("click", () => (this.running ? this.stop() : this.start()));
    }

    isActiveRun(runId) {
      return this.running && this.runId === runId;
    }

    throwIfStopped(runId) {
      if (!this.isActiveRun(runId)) throw new Error("ping aborted");
    }

    waitForNextSample(delayMs, runId) {
      return new Promise((resolve, reject) => {
        this.throwIfStopped(runId);
        this.pendingDelayTimer = window.setTimeout(() => {
          this.pendingDelayTimer = null;
          if (!this.isActiveRun(runId)) {
            reject(new Error("ping aborted"));
            return;
          }
          resolve();
        }, delayMs);
      });
    }

    cleanupPendingWork() {
      if (this.pendingDelayTimer !== null) {
        window.clearTimeout(this.pendingDelayTimer);
        this.pendingDelayTimer = null;
      }
      if (this.activeFetchController) {
        this.activeFetchController.abort();
        this.activeFetchController = null;
      }
      if (this.activeSocket) {
        this.activeSocket.close();
        this.activeSocket = null;
      }
    }

    finish() {
      this.running = false;
      this.startBtn.textContent = "Start";
      this.startBtn.parentElement.classList.remove("is-running");
    }

    setupGraphOverlay() {
      this.axisEl = document.createElement("div");
      this.axisEl.className = "ping-graph_axis";
      this.axisEl.innerHTML = '<span class="ping-graph_axis-label ping-graph_axis-top">10 ms</span><span class="ping-graph_axis-label ping-graph_axis-mid">5 ms</span><span class="ping-graph_axis-label ping-graph_axis-bottom">0 ms</span>';
      this.graphInner.appendChild(this.axisEl);

      this.tooltipEl = document.createElement("div");
      this.tooltipEl.className = "ping-graph_tooltip hidden";
      this.tooltipEl.innerHTML = '<div class="ping-graph_tooltip-index" id="ping-tooltip-index"></div><div id="ping-tooltip-value">0.00 ms</div>';
      this.graphInner.appendChild(this.tooltipEl);
    }

    updateAxis(maxValue) {
      this.axisMax = Math.max(10, Math.ceil(maxValue));
      const mid = this.axisMax / 2;
      this.axisEl.querySelector(".ping-graph_axis-top").textContent = `${fmt(this.axisMax, 0)} ms`;
      this.axisEl.querySelector(".ping-graph_axis-mid").textContent = `${fmt(mid, 0)} ms`;
      this.axisEl.querySelector(".ping-graph_axis-bottom").textContent = "0 ms";
    }

    showTooltip(index) {
      const value = this.hoverValues[index];
      if (!Number.isFinite(value)) {
        this.tooltipEl.classList.add("hidden");
        return;
      }
      this.tooltipEl.classList.remove("hidden");
      const leftPct = this.maxSamples <= 1 ? 0 : (index / (this.maxSamples - 1)) * 100;
      this.tooltipEl.style.left = `${leftPct}%`;
      this.tooltipEl.querySelector("#ping-tooltip-index").textContent = `t=${this.getSampleSecond(index)}s`;
      this.tooltipEl.querySelector("#ping-tooltip-value").textContent = `${fmt(value, 2)} ms`;
    }

    getSampleSecond(index) {
      if (this.maxSamples <= 1) return 0;
      return Math.round((index / (this.maxSamples - 1)) * this.testDurationSeconds);
    }

    prepareBars() {
      this.bars.innerHTML = "";
      const markerStepSeconds = this.testDurationSeconds <= 30 ? 5 : 10;
      let nextMarker = 0;
      for (let i = 0; i < this.maxSamples; i += 1) {
        const el = document.createElement("div");
        el.dataset.index = String(i);
        const second = this.getSampleSecond(i);
        const isLast = i === this.maxSamples - 1;
        if (second >= nextMarker || isLast) {
          el.setAttribute("a", "1");
          el.setAttribute("index", String(second));
          nextMarker += markerStepSeconds;
        }
        this.bars.appendChild(el);
      }

      this.bars.addEventListener("mousemove", (event) => {
        const bar = event.target.closest("div[data-index]");
        if (!bar || !this.bars.contains(bar)) return;
        this.showTooltip(Number(bar.dataset.index));
      });
      this.bars.addEventListener("mouseleave", () => this.tooltipEl.classList.add("hidden"));

      this.drawLine();
    }

    drawLine() {
      const values = this.history.slice(-this.maxSamples);
      this.hoverValues = values.slice();
      if (values.length === 0) {
        this.line.setAttribute("points", "");
        this.updateAxis(10);
        return;
      }
      const pointsCount = Math.max(2, this.maxSamples);
      const max = Math.max(10, ...values);
      this.updateAxis(max);
      const pts = values
        .map((v, i) => {
          const x = (i / (pointsCount - 1)) * 640;
          const y = 140 - (clamp(v / max, 0, 1) * 126 + 7);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
      this.line.setAttribute("points", pts);
    }

    stats(values) {
      if (!values.length) return { min: 0, max: 0, avg: 0, jitter: 0 };
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      let jitter = 0;
      for (let i = 1; i < values.length; i += 1) jitter += Math.abs(values[i] - values[i - 1]);
      jitter = values.length > 1 ? jitter / (values.length - 1) : 0;
      return { min, max, avg, jitter };
    }

    applySample(value) {
      this.history.push(value);
      if (this.history.length > this.maxSamples) this.history = this.history.slice(-this.maxSamples);
      this.drawLine();
    }

    async pingWithWebSocket(samples, onSample, runId) {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/backend/ws`);
      this.activeSocket = ws;
      await new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => reject(new Error("ws open timeout")), 3000);
        ws.onopen = () => {
          settled = true;
          clearTimeout(timer);
          resolve();
        };
        ws.onerror = () => {
          settled = true;
          clearTimeout(timer);
          reject(new Error("ws open failed"));
        };
        ws.onclose = () => {
          if (!settled) {
            clearTimeout(timer);
            reject(new Error("ping aborted"));
          }
        };
      });
      const values = [];
      for (let i = 0; i < samples; i += 1) {
        this.throwIfStopped(runId);
        const value = await new Promise((resolve, reject) => {
          let settled = false;
          const mark = performance.now();
          const timeout = setTimeout(() => reject(new Error("ws timeout")), 3500);
          const handleClose = () => {
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              reject(new Error("ping aborted"));
            }
          };
          ws.addEventListener(
            "message",
            () => {
              if (settled) return;
              settled = true;
              clearTimeout(timeout);
              ws.removeEventListener("close", handleClose);
              resolve(performance.now() - mark);
            },
            { once: true }
          );
          ws.addEventListener("close", handleClose, { once: true });
          if (!this.isActiveRun(runId)) {
            handleClose();
            return;
          }
          ws.send(`PING-${i}`);
        });
        values.push(value);
        if (onSample) onSample(value);
        await this.waitForNextSample(Math.max(15, this.sampleIntervalMs - value), runId);
      }
      if (this.activeSocket === ws) this.activeSocket = null;
      ws.close();
      return values;
    }

    async pingWithXhr(samples, onSample, runId) {
      const values = [];
      for (let i = 0; i < samples; i += 1) {
        this.throwIfStopped(runId);
        try {
          const t0 = performance.now();
          this.activeFetchController = new AbortController();
          const res = await fetch(`/backend/empty?r=${Math.random()}`, { method: "HEAD", cache: "no-store", signal: this.activeFetchController.signal });
          const t1 = performance.now();
          this.activeFetchController = null;
          const raw = t1 - t0;
          const st = res.headers.get("server-timing") || "";
          const match = /dur=([\d.]+)/i.exec(st);
          const serverDur = match ? Number(match[1]) : 0;
          const value = Math.max(0.1, raw - serverDur);
          values.push(value);
          if (onSample) onSample(value);
          await this.waitForNextSample(Math.max(15, this.sampleIntervalMs - value), runId);
        } catch (err) {
          if (err && err.name === "AbortError") throw new Error("ping aborted");
          if (!this.isActiveRun(runId)) throw new Error("ping aborted");
          // Skip failed probes and keep collecting subsequent samples.
        } finally {
          this.activeFetchController = null;
        }
      }
      if (!values.length) throw new Error("xhr ping failed");
      return values;
    }

    pushResult(stats, protocol) {
      const card = document.createElement("div");
      card.className = "ping-result relative";
      card.innerHTML = [
        `<button class="ping-result_close-button">${icons.close}</button>`,
        '<div class="ping-result_meta">',
        `  <div class="ping-result_server-meta">${SERVER_NAME}</div>`,
        `  <div><span class="ping-result_protocol">${protocol}</span></div>`,
        '</div>',
        '<div class="grow-1">',
        `  <div class="ping-result_time">Min: <b>${fmt(stats.min, 2)} ms</b></div>`,
        `  <div class="ping-result_time">Avg: <b>${fmt(stats.avg, 2)} ms</b></div>`,
        `  <div class="ping-result_time">Max: <b>${fmt(stats.max, 2)} ms</b></div>`,
        `  <div class="ping-result_time">Jitter: <b>${fmt(stats.jitter, 2)} ms</b></div>`,
        '</div>'
      ].join("\n");
      card.querySelector(".ping-result_close-button").addEventListener("click", () => {
        card.classList.add("close");
        window.setTimeout(() => card.remove(), 300);
      });
      this.resultsRoot.prepend(card);
      while (this.resultsRoot.children.length > 6) this.resultsRoot.lastElementChild.remove();
    }

    async start() {
      const runId = ++this.runId;
      this.running = true;
      this.startBtn.textContent = "Stop";
      this.startBtn.parentElement.classList.add("is-running");
      const samples = this.maxSamples;
      let values;
      let protocol;
      try {
        try {
          values = await this.pingWithWebSocket(samples, (value) => this.applySample(value), runId);
          protocol = "WebSocket";
          document.getElementById("ping-target").textContent = "/backend/ws (WebSocket)";
        } catch (err) {
          if (err && err.message === "ping aborted") throw err;
          values = await this.pingWithXhr(samples, (value) => this.applySample(value), runId);
          protocol = "XHR";
          document.getElementById("ping-target").textContent = "/backend/empty (XHR fallback)";
        }
        this.pushResult(this.stats(values), protocol);
      } catch (err) {
        if (err && err.message === "ping aborted") return;
        document.getElementById("ping-target").textContent = "Ping failed (request timeout)";
        this.pushResult({ min: 0, avg: 0, max: 0, jitter: 0 }, "Failed");
      } finally {
        if (this.runId === runId) this.finish();
      }
    }

    stop() {
      this.running = false;
      this.runId += 1;
      this.cleanupPendingWork();
      this.finish();
    }
  }

  function initViewSwitch() {
    document.querySelectorAll(".main-header_button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");
        document.body.classList.remove("view-test", "view-ping");
        document.body.classList.add(`view-${view}`);
      });
    });
  }

  root.innerHTML = buildLayout();
  if (!("ontouchstart" in window)) document.body.classList.add("desktop");
  document.body.classList.add("ready", "view-test");

  initViewSwitch();
  new SpeedStage();
  new PingStage();
})();
