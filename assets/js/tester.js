/* M2D Gamepad Tester v19.2c - overshoot visual clean + desktop name reserve */
const statusEl = document.querySelector("#status");
const gamepadNameEl = document.querySelector("#gamepadName");
const mappingEl = document.querySelector("#mapping");
const buttonCountEl = document.querySelector("#buttonCount");
const axisCountEl = document.querySelector("#axisCount");
const vibrationSupportEl = document.querySelector("#vibrationSupport");
const vibrationPanelStatus = document.querySelector("#vibrationPanelStatus");

const lightVibrateBtn = document.querySelector("#lightVibrateBtn");
const heavyVibrateBtn = document.querySelector("#heavyVibrateBtn");
const fullVibrateBtn = document.querySelector("#fullVibrateBtn");
const infiniteVibrateBtn = document.querySelector("#infiniteVibrateBtn");
const stopVibrateBtn = document.querySelector("#stopVibrateBtn");

const gamepadTabs = document.querySelector("#gamepadTabs");
const gamepadSelect = document.querySelector("#gamepadSelect");

const rawButtonsEl = document.querySelector("#rawButtons");
const rawAxesEl = document.querySelector("#rawAxes");

const leftStickDot = document.querySelector("#leftStickDot");
const rightStickDot = document.querySelector("#rightStickDot");
const leftStickValue = document.querySelector("#leftStickValue");
const rightStickValue = document.querySelector("#rightStickValue");

const ltBar = document.querySelector("#ltBar");
const rtBar = document.querySelector("#rtBar");
const ltValue = document.querySelector("#ltValue");
const rtValue = document.querySelector("#rtValue");

const leftStickCanvas = document.querySelector("#leftStickCanvas");
const rightStickCanvas = document.querySelector("#rightStickCanvas");

const modeTabs = document.querySelectorAll(".mode-tab");

const leftStickTestValue = document.querySelector("#leftStickTestValue");
const rightStickTestValue = document.querySelector("#rightStickTestValue");
const leftStickTestInfo = document.querySelector("#leftStickTestInfo");
const rightStickTestInfo = document.querySelector("#rightStickTestInfo");

const leftStickOverlayLabel = document.querySelector("#leftStickOverlayLabel");
const rightStickOverlayLabel = document.querySelector("#rightStickOverlayLabel");
const leftStickOverlayValue = document.querySelector("#leftStickOverlayValue");
const rightStickOverlayValue = document.querySelector("#rightStickOverlayValue");

const resetStickTestBtn = document.querySelector("#resetStickTest");
const clearButtonHistoryBtn = document.querySelector("#clearButtonHistory");

// ===== Gamepad stats to Google Sheet =====
const GAMEPAD_STATS_ENDPOINT = "https://script.google.com/macros/s/AKfycbx3fZUJpHSwSLlNoXwGVYGmwqVYfz9QHqchvQKgJjuB6nEhmI-OQTBVN1eHtttqVu2G/exec";
const GAMEPAD_STATS_TOKEN = "skipping7-metro-floe5-status4";

const GAMEPAD_STATS_STORAGE_KEY = "m2d-reported-gamepads";

const reportedGamepads = new Set(
  JSON.parse(localStorage.getItem(GAMEPAD_STATS_STORAGE_KEY) || "[]")
);

function saveReportedGamepads() {
  localStorage.setItem(
    GAMEPAD_STATS_STORAGE_KEY,
    JSON.stringify([...reportedGamepads])
  );
}

function getBrowserInfo() {
  const ua = navigator.userAgent;

  let browser = "Unknown";
  let os = "Unknown";

  if (ua.includes("Edg/")) {
    browser = "Microsoft Edge";
  } else if (ua.includes("OPR/") || ua.includes("Opera")) {
    browser = "Opera";
  } else if (ua.includes("Firefox/")) {
    browser = "Firefox";
  } else if (ua.includes("Chrome/")) {
    browser = "Chrome";
  } else if (ua.includes("Safari/")) {
    browser = "Safari";
  }

  if (ua.includes("Windows NT 10.0")) {
    os = "Windows 10/11";
  } else if (ua.includes("Windows NT")) {
    os = "Windows";
  } else if (ua.includes("Android")) {
    os = "Android";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS/iPadOS";
  } else if (ua.includes("Mac OS X")) {
    os = "macOS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  }

  return { browser, os };
}

function reportGamepadOnce(pad) {
  if (!pad || !pad.id) return;
  if (!GAMEPAD_STATS_ENDPOINT || GAMEPAD_STATS_ENDPOINT.includes("PASTE_")) return;

  const key = `${pad.id}|${pad.mapping}|${pad.buttons.length}|${pad.axes.length}`;

  if (reportedGamepads.has(key)) {
    return;
  }

  reportedGamepads.add(key);
  saveReportedGamepads();

  const browserInfo = getBrowserInfo();
  fetch(GAMEPAD_STATS_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
body: JSON.stringify({
  token: GAMEPAD_STATS_TOKEN,
  gamepadId: pad.id,
  mapping: pad.mapping || "unknown",
  buttons: pad.buttons.length,
  axes: pad.axes.length,
  vibration: pad.vibrationActuator ? "supported" : "not supported",
  browser: browserInfo.browser,
  os: browserInfo.os,
  page: location.pathname
})
  }).catch(() => {
    // Kalau gagal kirim, tester tetap jalan.
  });
}

let activeGamepadIndex = null;
let lastGamepadSignature = "";
let lastInfoSignature = "";
let stickMode = "off";
let infiniteVibrationTimer = null;
let isPageVisible = !document.hidden;
const seenButtons = new Set();

let lastFrameTime = 0;
let lastControlsRenderTime = 0;

const FRAME_INTERVAL = 1000 / 30;
const CONTROLS_RENDER_INTERVAL = 500;

const rawButtonItems = new Map();
const rawAxisItems = new Map();

let lastEmptyMessage = "";
let lastCircularityPadIndex = null;

const AXIS_VISUAL_EPSILON = 0.003;
const CIRCULARITY_SAMPLE_EPSILON = 0.002;

const lastStickVisual = {
  left: { x: null, y: null },
  right: { x: null, y: null }
};

const lastCircularitySample = {
  left: { x: null, y: null },
  right: { x: null, y: null }
};

const CIRCULARITY_BINS = 32;
const CIRCULARITY_MIN_RADIUS = 0.2;
const CIRCULARITY_ERROR_SAMPLE_MIN_RADIUS = 0.92;
const CIRCULARITY_ERROR_SAMPLE_MAX_RADIUS = 1.15;
const CIRCULARITY_ERROR_SCALE = 1;
const PATH_MIN_DISTANCE = 0.01;
const PATH_MAX_POINTS = 800;

const circularityData = {
  left: createCircularityData(),
  right: createCircularityData()
};

const pathData = {
  left: createPathData(),
  right: createPathData()
};

const standardButtonLabels = [
  "A", "B", "X", "Y",
  "LB", "RB", "LT", "RT",
  "Back", "Start", "LS", "RS",
  "D-Up", "D-Down", "D-Left", "D-Right",
  "Home"
];



function injectButtonLayoutStyles() {
  if (document.querySelector("#buttonLayoutStyles")) return;

  const style = document.createElement("style");
  style.id = "buttonLayoutStyles";
  style.textContent = `
    .ps-icon {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      vertical-align: middle;
    }

    .ps-icon svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .ps-cross { color: #5aa7ff; }
    .ps-circle { color: #ff5f6d; }
    .ps-square { color: #ff72d2; }
    .ps-triangle { color: #5ee48c; }

    .raw-button strong {
      min-height: 1em;
    }
  `;

  document.head.appendChild(style);
}

function psIcon(type) {
  const icons = {
    cross: `
      <span class="ps-icon ps-cross" aria-label="Cross">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6L18 18M18 6L6 18" />
        </svg>
      </span>
    `,
    circle: `
      <span class="ps-icon ps-circle" aria-label="Circle">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
        </svg>
      </span>
    `,
    square: `
      <span class="ps-icon ps-square" aria-label="Square">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="1.5" />
        </svg>
      </span>
    `,
    triangle: `
      <span class="ps-icon ps-triangle" aria-label="Triangle">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5L20 19H4L12 5Z" />
        </svg>
      </span>
    `
  };

  return icons[type] || "";
}

const buttonLayouts = {
  xbox: [
    { text: "A", html: "A" },
    { text: "B", html: "B" },
    { text: "X", html: "X" },
    { text: "Y", html: "Y" },
    { text: "LB", html: "LB" },
    { text: "RB", html: "RB" },
    { text: "LT", html: "LT" },
    { text: "RT", html: "RT" },
    { text: "Back", html: "Back" },
    { text: "Start", html: "Start" },
    { text: "LS", html: "LS" },
    { text: "RS", html: "RS" },
    { text: "D-Up", html: "D-Up" },
    { text: "D-Down", html: "D-Down" },
    { text: "D-Left", html: "D-Left" },
    { text: "D-Right", html: "D-Right" },
    { text: "Home", html: "Home" }
  ],

  playstation: [
    { text: "Cross", html: psIcon("cross") },
    { text: "Circle", html: psIcon("circle") },
    { text: "Square", html: psIcon("square") },
    { text: "Triangle", html: psIcon("triangle") },
    { text: "L1", html: "L1" },
    { text: "R1", html: "R1" },
    { text: "L2", html: "L2" },
    { text: "R2", html: "R2" },
    { text: "Share", html: "Share" },
    { text: "Options", html: "Options" },
    { text: "L3", html: "L3" },
    { text: "R3", html: "R3" },
    { text: "D-Up", html: "D-Up" },
    { text: "D-Down", html: "D-Down" },
    { text: "D-Left", html: "D-Left" },
    { text: "D-Right", html: "D-Right" },
    { text: "PS", html: "PS" }
  ],

  nintendo: [
    { text: "B", html: "B" },
    { text: "A", html: "A" },
    { text: "Y", html: "Y" },
    { text: "X", html: "X" },
    { text: "L", html: "L" },
    { text: "R", html: "R" },
    { text: "ZL", html: "ZL" },
    { text: "ZR", html: "ZR" },
    { text: "-", html: "-" },
    { text: "+", html: "+" },
    { text: "LS", html: "LS" },
    { text: "RS", html: "RS" },
    { text: "D-Up", html: "D-Up" },
    { text: "D-Down", html: "D-Down" },
    { text: "D-Left", html: "D-Left" },
    { text: "D-Right", html: "D-Right" },
    { text: "Home", html: "Home" }
  ]
};

let currentButtonLayoutName = "";

function detectButtonLayout(pad) {
  const id = (pad?.id || "").toLowerCase();

  // XInput/Xbox menang dulu, karena gamepad bentuk PS bisa saja sedang mode Xbox.
  if (
    id.includes("xbox") ||
    id.includes("xinput") ||
    id.includes("x-input") ||
    id.includes("x360")
  ) {
    return "xbox";
  }

  if (
    id.includes("dualsense") ||
    id.includes("dualshock") ||
    id.includes("sony") ||
    id.includes("playstation") ||
    id.includes("wireless controller")
  ) {
    return "playstation";
  }

  if (
    id.includes("switch") ||
    id.includes("nintendo") ||
    id.includes("pro controller") ||
    id.includes("joy-con") ||
    id.includes("joycon")
  ) {
    return "nintendo";
  }

  return "xbox";
}

function getButtonLabel(index) {
  const labels = buttonLayouts[currentButtonLayoutName] || buttonLayouts.xbox;
  return labels[index] || { text: `B${index}`, html: `B${index}` };
}

function updateButtonLabels(pad) {
  injectButtonLayoutStyles();

  const layoutName = detectButtonLayout(pad);

  if (layoutName === currentButtonLayoutName) return;

  currentButtonLayoutName = layoutName;

  const labels = buttonLayouts[layoutName] || buttonLayouts.xbox;

  labels.forEach((label, index) => {
    const visualButton = document.querySelector(`#btn${index}`);
    if (!visualButton) return;

    visualButton.innerHTML = label.html;
    visualButton.title = label.text;
  });

  rawButtonItems.forEach((item, index) => {
    const label = getButtonLabel(index);
    const labelEl = item.querySelector("strong");

    if (labelEl) {
      labelEl.textContent = label.text;
    }
  });
}


function createCircularityData() {
  return {
    bins: Array(CIRCULARITY_BINS).fill(0),
    samples: 0
  };
}

function createPathData() {
  return {
    points: []
  };
}

function getGamepads() {
  if (!navigator.getGamepads) return [];
  return [...navigator.getGamepads()].filter(Boolean);
}

function getActiveGamepad() {
  const rawGamepads = navigator.getGamepads ? navigator.getGamepads() : [];

  if (activeGamepadIndex !== null && rawGamepads[activeGamepadIndex]) {
    return rawGamepads[activeGamepadIndex];
  }

  const firstGamepad = getGamepads()[0] || null;

  if (firstGamepad) {
    activeGamepadIndex = firstGamepad.index;
  }

  return firstGamepad;
}

function getGamepadSignature(gamepads) {
  return gamepads
    .map((pad) => `${pad.index}:${pad.id}:${pad.buttons.length}:${pad.axes.length}`)
    .join("|");
}

function getInfoSignature(pad) {
  if (!pad) return "";

  return [
    pad.index,
    pad.id,
    pad.mapping || "unknown",
    pad.buttons.length,
    pad.axes.length,
    Boolean(pad.vibrationActuator)
  ].join("|");
}

function renderGamepadControls(force = false) {
  const gamepads = getGamepads();
  const signature = getGamepadSignature(gamepads);

  if (!force && signature === lastGamepadSignature) {
    syncActiveControlState();
    return;
  }

  lastGamepadSignature = signature;

  gamepadTabs.innerHTML = "";
  gamepadSelect.innerHTML = "";

  if (!gamepads.length) {
    activeGamepadIndex = null;

    for (let slot = 0; slot < 4; slot += 1) {
      const tab = document.createElement("button");
      tab.className = "gamepad-tab placeholder-tab";
      tab.type = "button";
      tab.disabled = true;
      tab.textContent = `Gamepad ${slot}`;
      tab.title = "Belum terdeteksi";
      gamepadTabs.appendChild(tab);
    }

    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Belum terdeteksi";
    gamepadSelect.appendChild(option);

    return;
  }

  if (
    activeGamepadIndex === null ||
    !gamepads.some((pad) => pad.index === activeGamepadIndex)
  ) {
    activeGamepadIndex = gamepads[0].index;
  }

  const gamepadMap = new Map(gamepads.map((pad) => [pad.index, pad]));
  const maxVisibleSlots = Math.max(4, ...gamepads.map((pad) => pad.index + 1));

  for (let slot = 0; slot < maxVisibleSlots; slot += 1) {
    const pad = gamepadMap.get(slot);
    const tab = document.createElement("button");

    tab.type = "button";
    tab.dataset.index = String(slot);
    tab.setAttribute("role", "tab");

    if (pad) {
      const name = pad.id && pad.id.trim()
        ? pad.id
        : `Gamepad ${pad.index}`;

      tab.className = "gamepad-tab";
      tab.textContent = `Gamepad ${pad.index}`;
      tab.title = name;

      tab.addEventListener("click", () => {
        switchGamepad(pad.index);
      });
    } else {
      tab.className = "gamepad-tab placeholder-tab";
      tab.disabled = true;
      tab.textContent = `Gamepad ${slot}`;
      tab.title = "Belum terdeteksi";
    }

    gamepadTabs.appendChild(tab);
  }

  gamepads.forEach((pad) => {
    const name = pad.id && pad.id.trim()
      ? pad.id
      : `Gamepad ${pad.index}`;

    const option = document.createElement("option");
    option.value = String(pad.index);
    option.textContent = `Gamepad ${pad.index} — ${name}`;
    gamepadSelect.appendChild(option);
  });

  syncActiveControlState();
}

function syncActiveControlState() {
  document.querySelectorAll(".gamepad-tab").forEach((tab) => {
    tab.classList.toggle(
      "active",
      Number(tab.dataset.index) === activeGamepadIndex
    );
  });

  if (activeGamepadIndex === null) {
    gamepadSelect.value = "";
  } else {
    gamepadSelect.value = String(activeGamepadIndex);
  }
}

function autoSwitchGamepadByButtonPress() {
  const gamepads = getGamepads();

  for (const pad of gamepads) {
    if (pad.index === activeGamepadIndex) continue;

    // Pindah tab hanya saat tombol Select/Back ditekan.
    // Pada standard mapping Gamepad API, Select/Back biasanya index 8.
    const selectButton = pad.buttons[8];
    const selectPressed = Boolean(selectButton && (selectButton.pressed || selectButton.value > 0.5));

    if (!selectPressed) continue;

    activeGamepadIndex = pad.index;
    resetStickTest();
    syncActiveControlState();
    return;
  }
}

function updateGamepadTabActivity() {
  const gamepads = getGamepads();

  document.querySelectorAll(".gamepad-tab.input-active").forEach((tab) => {
    tab.classList.remove("input-active");
  });

  gamepads.forEach((pad) => {
    const hasPressedButton = pad.buttons.some((button) => {
      return button.pressed || button.value > 0.5;
    });

    if (!hasPressedButton) return;

    const tab = document.querySelector(`.gamepad-tab[data-index="${pad.index}"]`);
    if (!tab) return;

    tab.classList.add("input-active");
  });
}

function switchGamepad(index) {
  stopInfiniteVibration(true);
  lastInfoSignature = "";
  activeGamepadIndex = Number(index);
  resetStickTest();
  syncActiveControlState();
}

function setEmptyState(message = "Menunggu gamepad...") {
  lastInfoSignature = "";
  statusEl.textContent = message;
  gamepadNameEl.textContent = "Belum terdeteksi";
  gamepadNameEl.title = "";
  mappingEl.textContent = "-";
  buttonCountEl.textContent = "-";
  axisCountEl.textContent = "-";
  vibrationSupportEl.textContent = "-";
  vibrationPanelStatus.textContent = "-";

  rawButtonsEl.innerHTML = "";
  rawAxesEl.innerHTML = "";
  rawButtonItems.clear();
  rawAxisItems.clear();

  setVibrationControls(false);

  updateStick(leftStickDot, 0, 0);
  updateStick(rightStickDot, 0, 0);

  leftStickValue.textContent = "X: 0.00 / Y: 0.00";
  rightStickValue.textContent = "X: 0.00 / Y: 0.00";

  updateTrigger(ltBar, ltValue, 0);
  updateTrigger(rtBar, rtValue, 0);

  document.querySelectorAll(".pad-button").forEach((button) => {
    button.classList.remove("active");
  });

  lastStickVisual.left.x = null;
  lastStickVisual.left.y = null;
  lastStickVisual.right.x = null;
  lastStickVisual.right.y = null;
  resetCircularitySampleCache();

  renderStickTest();
}

function updateInfo(pad) {
  const signature = getInfoSignature(pad);

  if (signature === lastInfoSignature) {
    return;
  }

  lastInfoSignature = signature;

  setTextIfChanged(statusEl, "Gamepad terdeteksi");

  const gamepadName = pad.id && pad.id.trim()
    ? pad.id
    : "Gamepad terdeteksi tanpa nama";

  setTextIfChanged(gamepadNameEl, gamepadName);
  gamepadNameEl.title = gamepadName;

  setTextIfChanged(mappingEl, pad.mapping || "unknown");
  setTextIfChanged(buttonCountEl, String(pad.buttons.length));
  setTextIfChanged(axisCountEl, String(pad.axes.length));

  const hasVibration = Boolean(pad.vibrationActuator);
  const vibrationText = hasVibration ? "supported" : "not supported";

  setTextIfChanged(vibrationSupportEl, vibrationText);
  setTextIfChanged(vibrationPanelStatus, vibrationText);

  setVibrationControls(hasVibration);
  updateButtonLabels(pad);
  reportGamepadOnce(pad);
}

function setVibrationControls(enabled) {
  lightVibrateBtn.disabled = !enabled;
  heavyVibrateBtn.disabled = !enabled;
  fullVibrateBtn.disabled = !enabled;
  infiniteVibrateBtn.disabled = !enabled;
  stopVibrateBtn.disabled = !enabled;
}

function updateVisualButtons(pad) {
  pad.buttons.forEach((button, index) => {
    const visualButton = document.querySelector(`#btn${index}`);
    if (!visualButton) return;

    const isActive = button.pressed || button.value > 0.5;

    if (isActive) {
      seenButtons.add(index);
    }

    visualButton.classList.toggle("active", isActive);
    visualButton.classList.toggle("seen", seenButtons.has(index));
  });
}

function setTextIfChanged(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

function setEmptyStateOnce(message = "Menunggu gamepad...") {
  if (lastEmptyMessage === message) return;

  lastEmptyMessage = message;
  setEmptyState(message);
}

function resetRuntimeStateForActiveGamepad() {
  lastEmptyMessage = "";
}

function hasMeaningfulStickChange(last, x, y, epsilon) {
  if (last.x === null || last.y === null) return true;

  return Math.hypot(x - last.x, y - last.y) > epsilon;
}

function rememberStickPosition(last, x, y) {
  last.x = x;
  last.y = y;
}

function ensureRawButtonItem(index, label) {
  if (rawButtonItems.has(index)) {
    return rawButtonItems.get(index);
  }

  const item = document.createElement("div");
  item.className = "raw-button";
  item.innerHTML = `
    <strong>${label}</strong>
    <span>0.00</span>
  `;

  rawButtonsEl.appendChild(item);
  rawButtonItems.set(index, item);

  return item;
}

function ensureRawAxisItem(index) {
  if (rawAxisItems.has(index)) {
    return rawAxisItems.get(index);
  }

  const item = document.createElement("div");
  item.className = "raw-axis";
  item.innerHTML = `
    <strong>Axis ${index}</strong>
    <span>0.0000</span>
  `;

  rawAxesEl.appendChild(item);
  rawAxisItems.set(index, item);

  return item;
}

function trimRawItems(map, count) {
  for (const [index, item] of map) {
    if (index >= count) {
      item.remove();
      map.delete(index);
    }
  }
}

function updateRawButtons(pad) {
  pad.buttons.forEach((button, index) => {
    const label = getButtonLabel(index);
    const item = ensureRawButtonItem(index, label.text);
    const labelEl = item.querySelector("strong");
    const valueEl = item.querySelector("span");

    if (labelEl && labelEl.textContent !== label.text) {
      labelEl.textContent = label.text;
    }

    const isActive = button.pressed || button.value > 0.5;

    if (isActive) {
      seenButtons.add(index);
    }

    item.classList.toggle("active", isActive);
    item.classList.toggle("seen", seenButtons.has(index));

    setTextIfChanged(valueEl, button.value.toFixed(2));
  });

  trimRawItems(rawButtonItems, pad.buttons.length);
}

function updateRawAxes(pad) {
  pad.axes.forEach((value, index) => {
    const item = ensureRawAxisItem(index);
    const valueEl = item.querySelector("span");

    setTextIfChanged(valueEl, value.toFixed(4));
  });

  trimRawItems(rawAxisItems, pad.axes.length);
}

function updateAxes(pad) {
  const lx = pad.axes[0] || 0;
  const ly = pad.axes[1] || 0;
  const rx = pad.axes[2] || 0;
  const ry = pad.axes[3] || 0;

  if (hasMeaningfulStickChange(lastStickVisual.left, lx, ly, AXIS_VISUAL_EPSILON)) {
    updateStick(leftStickDot, lx, ly);
    rememberStickPosition(lastStickVisual.left, lx, ly);
  }

  if (hasMeaningfulStickChange(lastStickVisual.right, rx, ry, AXIS_VISUAL_EPSILON)) {
    updateStick(rightStickDot, rx, ry);
    rememberStickPosition(lastStickVisual.right, rx, ry);
  }

  setTextIfChanged(leftStickValue, `X: ${lx.toFixed(2)} / Y: ${ly.toFixed(2)}`);
  setTextIfChanged(rightStickValue, `X: ${rx.toFixed(2)} / Y: ${ry.toFixed(2)}`);

  updateRawAxes(pad);

  // Circularity disampling di loop ringan sebelum throttle UI.
  // Path tetap disampling di loop UI 30 FPS agar jumlah titik tidak cepat membengkak.
  if (stickMode !== "circularity") {
    updateStickTestData("left", lx, ly);
    updateStickTestData("right", rx, ry);
  }

  if (stickMode !== "off") {
    renderStickTest();
  }
}

function updateStick(dotEl, x, y) {
  const zone = dotEl.parentElement;
  const size = zone.clientWidth || 168;
  const center = size / 2;

  // Pusat dot boleh sampai tepi lingkaran.
  // Dot akan overlap keluar, tapi tetap terlihat penuh karena stick-zone overflow visible.
  const radius = center;

  const clampedX = Math.max(-1, Math.min(1, x));
  const clampedY = Math.max(-1, Math.min(1, y));

  dotEl.style.left = `${center + clampedX * radius}px`;
  dotEl.style.top = `${center + clampedY * radius}px`;
}

function updateTriggers(pad) {
  const lt = pad.buttons[6]?.value || 0;
  const rt = pad.buttons[7]?.value || 0;

  updateTrigger(ltBar, ltValue, lt);
  updateTrigger(rtBar, rtValue, rt);
}

function updateTrigger(barEl, valueEl, value) {
  const safeValue = Math.max(0, Math.min(1, value));
  const percent = Math.round(safeValue * 100);
  const widthText = `${percent}%`;

  if (barEl.style.width !== widthText) {
    barEl.style.width = widthText;
  }

  setTextIfChanged(valueEl, safeValue.toFixed(2));
}

function updateStickTestData(side, x, y) {
  if (stickMode === "off") return;

  if (stickMode === "circularity") {
    updateCircularity(side, x, y);
    return;
  }

  if (stickMode === "path") {
    updatePath(side, x, y);
  }
}

function updateCircularity(side, x, y) {
  const radius = Math.hypot(x, y);

  if (radius <= CIRCULARITY_MIN_RADIUS) return;

  const step = (Math.PI * 2) / CIRCULARITY_BINS;
  let angle = Math.atan2(y, x);

  if (angle < 0) {
    angle += Math.PI * 2;
  }

  // HT-style angle bucket:
  // angle dibulatkan ke kelipatan PI/16, bukan floor per sektor.
  const bin = Math.round(angle / step) % CIRCULARITY_BINS;

  const data = circularityData[side];

  // Simpan radius maksimum per arah/bin.
  data.bins[bin] = Math.max(data.bins[bin], radius);
  data.samples += 1;
}

function updatePath(side, x, y) {
  const data = pathData[side];

  const point = {
    x: Math.max(-1, Math.min(1, x)),
    y: Math.max(-1, Math.min(1, y))
  };

  const last = data.points[data.points.length - 1];

  if (last) {
    const distance = Math.hypot(point.x - last.x, point.y - last.y);

    if (distance < PATH_MIN_DISTANCE) {
      return;
    }
  }

  data.points.push(point);

  if (data.points.length > PATH_MAX_POINTS) {
    data.points.shift();
  }
}

function calculateCircularity(data) {
  const filledBins = data.bins.filter((value) => value > 0);
  const coverage = (filledBins.length / CIRCULARITY_BINS) * 100;

  // Tetap tahan hasil sampai putaran hampir penuh.
  // Formula error-nya mengikuti HT; gate ini hanya untuk UX tampilan.
  if (filledBins.length < CIRCULARITY_BINS * 0.75) {
    return null;
  }

  const average = filledBins.reduce((sum, value) => sum + value, 0) / filledBins.length;
  const min = Math.min(...filledBins);
  const max = Math.max(...filledBins);

  if (average === 0) return null;

  // HT-style circularity error:
  // RMS dari deviasi radius maksimum per angle-bin terhadap radius ideal 1.000.
  const squaredErrors = filledBins.map((value) => Math.pow(1 - value, 2));

  const error =
    Math.sqrt(
      squaredErrors.reduce((sum, value) => sum + value, 0) /
      squaredErrors.length
    ) * 100;

  return {
    error,
    coverage,
    min,
    max,
    average
  };
}

function renderStickTest() {
  document.body.classList.toggle("stick-mode-circularity", stickMode === "circularity");
  document.body.classList.toggle("stick-mode-path", stickMode === "path");

  clearCanvas(leftStickCanvas);
  clearCanvas(rightStickCanvas);

  if (stickMode === "off") {
    leftStickTestValue.textContent = "Off";
    rightStickTestValue.textContent = "Off";
    leftStickTestInfo.textContent = "Stick test: Off";
    rightStickTestInfo.textContent = "Stick test: Off";

    leftStickOverlayLabel.textContent = "STICK";
    rightStickOverlayLabel.textContent = "STICK";
    leftStickOverlayValue.textContent = "-";
    rightStickOverlayValue.textContent = "-";
    return;
  }

  if (stickMode === "circularity") {
    renderCircularitySide(
      "left",
      leftStickTestValue,
      leftStickTestInfo,
      leftStickOverlayLabel,
      leftStickOverlayValue
    );

    renderCircularitySide(
      "right",
      rightStickTestValue,
      rightStickTestInfo,
      rightStickOverlayLabel,
      rightStickOverlayValue
    );

    drawCircularityFill(leftStickCanvas, circularityData.left);
    drawCircularityFill(rightStickCanvas, circularityData.right);
    return;
  }

  if (stickMode === "path") {
    renderPathSide(
      "left",
      leftStickTestValue,
      leftStickTestInfo,
      leftStickOverlayLabel,
      leftStickOverlayValue
    );

    renderPathSide(
      "right",
      rightStickTestValue,
      rightStickTestInfo,
      rightStickOverlayLabel,
      rightStickOverlayValue
    );

    drawPath(leftStickCanvas, pathData.left);
    drawPath(rightStickCanvas, pathData.right);
  }
}

function renderCircularitySide(side, valueEl, infoEl, overlayLabelEl, overlayValueEl) {
  const data = circularityData[side];
  const result = calculateCircularity(data);

  overlayLabelEl.textContent = "Avg Error";

  if (!result) {
    valueEl.textContent = "-";
    const filledBins = data.bins.filter((value) => value > 0).length;
    const coverage = (filledBins / CIRCULARITY_BINS) * 100;
    infoEl.textContent = `Cov ${coverage.toFixed(0)}% | putar 360°`;

    // Jangan tampilkan teks di dalam stick sebelum hasil valid.
    overlayLabelEl.textContent = "";
    overlayValueEl.textContent = "";
    return;
  }

  const errorText = `${result.error.toFixed(1)}%`;

  valueEl.textContent = errorText;
  infoEl.textContent = `Cov ${result.coverage.toFixed(0)}% | ${result.min.toFixed(3)}-${result.max.toFixed(3)}`;
  overlayValueEl.textContent = errorText;
}

function renderPathSide(side, valueEl, infoEl, overlayLabelEl, overlayValueEl) {
  const data = pathData[side];

  valueEl.textContent = "Path";
  infoEl.textContent = `${data.points.length} titik | reset untuk hapus`;

  overlayLabelEl.textContent = "PATH";
  overlayValueEl.textContent = `${data.points.length}`;
}

function clearCanvas(canvas) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.clearRect(0, 0, width, height);
}

function getCanvasMetrics(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return {
    ctx: canvas.getContext("2d"),
    width,
    height,
    dpr,
    centerX: width / 2,
    centerY: height / 2,
    radius: Math.min(width, height) / 2
  };
}


function getStickCanvasPlotMetrics(canvas) {
  const metrics = getCanvasMetrics(canvas);
  const zone = canvas.closest(".stick-zone") || canvas.parentElement;
  const zoneRect = zone ? zone.getBoundingClientRect() : canvas.getBoundingClientRect();

  const idealRadius =
    Math.min(zoneRect.width, zoneRect.height) * metrics.dpr / 2;

  // Canvas v19.2 dibuat lebih besar via CSS, jadi data radius > 1.000
  // bisa tergambar keluar dari lingkaran ideal tanpa mengecilkan lingkaran.
  const plotRadius =
    Math.min(metrics.width, metrics.height) / 2 - 2 * metrics.dpr;

  return {
    ...metrics,
    idealRadius,
    plotRadius: Math.max(idealRadius, plotRadius)
  };
}

function drawCircularityFill(canvas, data) {
  if (!canvas) return;

  const {
    ctx,
    width,
    height,
    dpr,
    centerX,
    centerY,
    idealRadius,
    plotRadius
  } = getStickCanvasPlotMetrics(canvas);

  const filledBins = data.bins.filter((value) => value > 0);

  ctx.clearRect(0, 0, width, height);

  if (!filledBins.length) return;

  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();

  const fillColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent-soft")
    .trim();

  const step = (Math.PI * 2) / data.bins.length;

  ctx.save();

  // v19.2: circularity memakai canvas kotak yang lebih besar.
  // Lingkaran ideal tetap radius 1.000, sementara radius > 1.000
  // boleh keluar menuju area kotak di sekelilingnya.
  ctx.beginPath();
  ctx.arc(centerX, centerY, idealRadius, 0, Math.PI * 2);
  ctx.fillStyle = colorMixFallback(fillColor, 0.22);
  ctx.fill();

  // Coverage aktual per sektor, tanpa normalisasi ke max radius.
  ctx.globalAlpha = 1;

  data.bins.forEach((radiusValue, index) => {
    if (radiusValue <= 0) return;

    const startAngle = index * step - step * 0.55;
    const endAngle = index * step + step * 0.55;
    const sectorRadius = Math.min(radiusValue * idealRadius, plotRadius);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, sectorRadius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  });

  // Area overshoot di luar radius ideal diberi warna lebih tegas.
  data.bins.forEach((radiusValue, index) => {
    if (radiusValue <= 1) return;

    const startAngle = index * step - step * 0.55;
    const endAngle = index * step + step * 0.55;
    const outerRadius = Math.min(radiusValue * idealRadius, plotRadius);

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
    ctx.arc(centerX, centerY, idealRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.30;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Outline actual range supaya bentuk square-ish terlihat saat diagonal overshoot.
  ctx.beginPath();

  let started = false;

  data.bins.forEach((radiusValue, index) => {
    if (radiusValue <= 0) return;

    const angle = index * step;
    const pointRadius = Math.min(radiusValue * idealRadius, plotRadius);
    const x = centerX + Math.cos(angle) * pointRadius;
    const y = centerY + Math.sin(angle) * pointRadius;

    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  });

  if (started) {
    ctx.closePath();
    ctx.globalAlpha = 0.96;
    ctx.lineWidth = 1.6 * dpr;
    ctx.strokeStyle = accentColor;
    ctx.stroke();
  }

  // Garis ideal radius 1.000 tetap di atas fill.
  ctx.globalAlpha = 0.64;
  ctx.lineWidth = 1.1 * dpr;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(centerX, centerY, idealRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function colorMixFallback(color, alpha) {
  if (color.startsWith("rgba")) {
    return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
  }

  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }

  return color;
}

function drawPath(canvas, data) {
  if (!canvas) return;

  const {
    ctx,
    width,
    height,
    dpr,
    centerX,
    centerY,
    idealRadius,
    plotRadius
  } = getStickCanvasPlotMetrics(canvas);

  ctx.clearRect(0, 0, width, height);

  if (!data.points.length) return;

  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();

  ctx.save();

  // Referensi radius ideal 1.000.
  ctx.globalAlpha = 0.24;
  ctx.lineWidth = 1 * dpr;
  ctx.strokeStyle = accentColor;
  ctx.beginPath();
  ctx.arc(centerX, centerY, idealRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2 * dpr;
  ctx.strokeStyle = accentColor;
  ctx.globalAlpha = 0.86;
  ctx.beginPath();

  data.points.forEach((point, index) => {
    const x = centerX + point.x * idealRadius;
    const y = centerY + point.y * idealRadius;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = accentColor;

  data.points.forEach((point) => {
    const x = centerX + point.x * idealRadius;
    const y = centerY + point.y * idealRadius;

    ctx.beginPath();
    ctx.arc(x, y, 1.8 * dpr, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function resetCircularitySampleCache() {
  lastCircularitySample.left.x = null;
  lastCircularitySample.left.y = null;
  lastCircularitySample.right.x = null;
  lastCircularitySample.right.y = null;
}

function setStickMode(mode) {
  stickMode = mode;

  modeTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.stickMode === mode);
  });

  resetStickTest();
  renderStickTest();
}

function resetStickTest() {
  circularityData.left = createCircularityData();
  circularityData.right = createCircularityData();
  pathData.left = createPathData();
  pathData.right = createPathData();

  resetCircularitySampleCache();
  renderStickTest();
}

function clearButtonHistory() {
  seenButtons.clear();

  document.querySelectorAll(".pad-button.seen, .raw-button.seen").forEach((item) => {
    item.classList.remove("seen");
  });
}

function sampleCircularityData(pad) {
  if (!pad || stickMode !== "circularity") return;

  if (lastCircularityPadIndex !== pad.index) {
    lastCircularityPadIndex = pad.index;
    lastCircularitySample.left.x = null;
    lastCircularitySample.left.y = null;
    lastCircularitySample.right.x = null;
    lastCircularitySample.right.y = null;
  }

  const lx = pad.axes[0] || 0;
  const ly = pad.axes[1] || 0;
  const rx = pad.axes[2] || 0;
  const ry = pad.axes[3] || 0;

  if (hasMeaningfulStickChange(lastCircularitySample.left, lx, ly, CIRCULARITY_SAMPLE_EPSILON)) {
    updateCircularity("left", lx, ly);
    rememberStickPosition(lastCircularitySample.left, lx, ly);
  }

  if (hasMeaningfulStickChange(lastCircularitySample.right, rx, ry, CIRCULARITY_SAMPLE_EPSILON)) {
    updateCircularity("right", rx, ry);
    rememberStickPosition(lastCircularitySample.right, rx, ry);
  }
}

function update(timestamp = 0) {
  requestAnimationFrame(update);

  // Saat tab/background tidak aktif, hentikan semua kerja tester.
  if (!isPageVisible) {
    return;
  }

  const pad = getActiveGamepad();

  // Sampling circularity ringan tetap mengikuti requestAnimationFrame.
  // Yang berat seperti DOM, raw input, dan canvas tetap dibatasi FRAME_INTERVAL.
  sampleCircularityData(pad);

  if (timestamp - lastFrameTime < FRAME_INTERVAL) {
    return;
  }

  lastFrameTime = timestamp;

  const gamepads = getGamepads();

  if (timestamp - lastControlsRenderTime > CONTROLS_RENDER_INTERVAL) {
    renderGamepadControls();
    lastControlsRenderTime = timestamp;
  }

  // Fitur ini hanya perlu diproses saat ada lebih dari 1 gamepad.
  if (gamepads.length > 1) {
    updateGamepadTabActivity();
    autoSwitchGamepadByButtonPress();
  }

  if (!pad) {
    setEmptyStateOnce();
    return;
  }

  resetRuntimeStateForActiveGamepad();
  updateInfo(pad);
  updateVisualButtons(pad);
  updateRawButtons(pad);
  updateAxes(pad);
  updateTriggers(pad);
}

async function runVibration(durationSeconds = 1, strong = 1.0, weak = 0.8) {
  const pad = getActiveGamepad();

  if (!pad) {
    alert("Gamepad belum terdeteksi.");
    return;
  }

  if (!pad.vibrationActuator) {
    alert("Browser atau gamepad ini tidak mendukung vibration test.");
    return;
  }

  const durationMs = Math.round(
    Math.max(0.1, Math.min(10, Number(durationSeconds) || 1)) * 1000
  );

  try {
    await pad.vibrationActuator.playEffect("dual-rumble", {
      duration: durationMs,
      strongMagnitude: Math.max(0, Math.min(1, strong)),
      weakMagnitude: Math.max(0, Math.min(1, weak))
    });
  } catch (error) {
    console.error(error);
    alert("Gagal menjalankan tes getar.");
  }
}

function setInfiniteVibrationActive(active) {
  infiniteVibrateBtn.classList.toggle("active", active);
  infiniteVibrateBtn.textContent = active ? "Infinite On" : "Infinite";
}

function startInfiniteVibration(strong = 1.0, weak = 1.0) {
  stopInfiniteVibration(false);

  setInfiniteVibrationActive(true);

  const pulse = () => {
    runVibration(1.0, strong, weak);
  };

  pulse();
  infiniteVibrationTimer = window.setInterval(pulse, 850);
}

function stopInfiniteVibration(stopMotor = true) {
  if (infiniteVibrationTimer !== null) {
    window.clearInterval(infiniteVibrationTimer);
    infiniteVibrationTimer = null;
  }

  setInfiniteVibrationActive(false);

  if (stopMotor) {
    stopVibration();
  }
}

async function stopVibration() {
  const pad = getActiveGamepad();

  if (!pad || !pad.vibrationActuator) {
    return;
  }

  try {
    await pad.vibrationActuator.playEffect("dual-rumble", {
      duration: 1,
      strongMagnitude: 0,
      weakMagnitude: 0
    });
  } catch (error) {
    console.error(error);
  }
}

gamepadSelect.addEventListener("change", () => {
  if (gamepadSelect.value === "") return;
  switchGamepad(Number(gamepadSelect.value));
});

modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setStickMode(tab.dataset.stickMode);
  });
});

resetStickTestBtn.addEventListener("click", resetStickTest);
clearButtonHistoryBtn.addEventListener("click", clearButtonHistory);

lightVibrateBtn.addEventListener("click", () => {
  stopInfiniteVibration(false);
  runVibration(1.0, 0.15, 0.35);
});

heavyVibrateBtn.addEventListener("click", () => {
  stopInfiniteVibration(false);
  runVibration(1.0, 0.85, 0.15);
});

fullVibrateBtn.addEventListener("click", () => {
  stopInfiniteVibration(false);
  runVibration(1.0, 1.0, 1.0);
});

infiniteVibrateBtn.addEventListener("click", () => {
  if (infiniteVibrationTimer !== null) {
    stopInfiniteVibration(true);
    return;
  }

  startInfiniteVibration(1.0, 1.0);
});

stopVibrateBtn.addEventListener("click", () => {
  stopInfiniteVibration(true);
});

window.addEventListener("gamepadconnected", (event) => {
  lastInfoSignature = "";
  activeGamepadIndex = event.gamepad.index;
  renderGamepadControls(true);
  statusEl.textContent = "Gamepad terhubung";
});

window.addEventListener("gamepaddisconnected", (event) => {
  lastInfoSignature = "";
  if (activeGamepadIndex === event.gamepad.index) {
    stopInfiniteVibration(true);
    activeGamepadIndex = null;
  }

  renderGamepadControls(true);
  setEmptyState("Gamepad terputus");
});

document.addEventListener("visibilitychange", () => {
  isPageVisible = !document.hidden;

  if (document.hidden) {
    stopInfiniteVibration(true);
    return;
  }

  // Saat tab aktif lagi, render ulang kontrol dan reset timer supaya update tidak terasa telat.
  lastFrameTime = 0;
  lastControlsRenderTime = 0;
  renderGamepadControls(true);
});

window.addEventListener("pagehide", () => {
  isPageVisible = false;
  stopInfiniteVibration(true);
});

setEmptyState();
renderGamepadControls(true);
setStickMode("off");
update();
