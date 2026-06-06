/* M2D Gamepad Tester v20s - 06/06/2026 */
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
const toggleAdvancedVibrateBtn = document.querySelector("#toggleAdvancedVibrateBtn");
const vibrationAdvancedPanel = document.querySelector("#vibrationAdvancedPanel");
const leftMotorSlider = document.querySelector("#leftMotorSlider");
const rightMotorSlider = document.querySelector("#rightMotorSlider");
const leftMotorValue = document.querySelector("#leftMotorValue");
const rightMotorValue = document.querySelector("#rightMotorValue");
const leftMotorTestBtn = document.querySelector("#leftMotorTestBtn");
const rightMotorTestBtn = document.querySelector("#rightMotorTestBtn");
const triggerRumbleToggle = document.querySelector("#triggerRumbleToggle");

const gamepadTabs = document.querySelector("#gamepadTabs");
const gamepadSelect = document.querySelector("#gamepadSelect");

const rawButtonsEl = document.querySelector("#rawButtons");
const rawAxesEl = document.querySelector("#rawAxes");

const leftStickDot = document.querySelector("#leftStickDot");
const rightStickDot = document.querySelector("#rightStickDot");
const leftStickZone = leftStickDot?.closest(".stick-zone") || leftStickDot?.parentElement;
const rightStickZone = rightStickDot?.closest(".stick-zone") || rightStickDot?.parentElement;
const leftStickValue = document.querySelector("#leftStickValue");
const rightStickValue = document.querySelector("#rightStickValue");
const leftStickDrift = createDriftReadout(leftStickValue);
const rightStickDrift = createDriftReadout(rightStickValue);

const ltBar = document.querySelector("#ltBar");
const rtBar = document.querySelector("#rtBar");
const ltValue = document.querySelector("#ltValue");
const rtValue = document.querySelector("#rtValue");

const leftStickCanvas = document.querySelector("#leftStickCanvas");
const rightStickCanvas = document.querySelector("#rightStickCanvas");

const getModeTabs = () => document.querySelectorAll(".mode-tab");

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

if (clearButtonHistoryBtn) {
  clearButtonHistoryBtn.textContent = "Bersihkan";
  clearButtonHistoryBtn.title = "Bersihkan riwayat tombol yang pernah ditekan";
}

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
const TRIGGER_RUMBLE_INTERVAL = 1000 / 12;
const TRIGGER_RUMBLE_DURATION = 140;
const TRIGGER_RUMBLE_CHANGE_EPSILON = 0.04;
const TRIGGER_RUMBLE_STOP_EPSILON = 0.03;
const SINGLE_MOTOR_INTERVAL = 850;

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
const CIRCULARITY_RENDER_BINS = 48;
const CIRCULARITY_RADIUS_TRAIL_LIFETIME = 520;
const CIRCULARITY_RADIUS_TRAIL_MAX_POINTS = 7;
const CIRCULARITY_RADIUS_TRAIL_MIN_DISTANCE = 0.22;
const CIRCULARITY_RADIUS_TRAIL_MIN_ANGLE = 0.05;
const CIRCULARITY_MIN_RADIUS = 0.2;
const CIRCULARITY_ERROR_SAMPLE_MIN_RADIUS = 0.92;
const CIRCULARITY_EDGE_TRACE_MIN_RADIUS = 0.92;
const CIRCULARITY_ERROR_SAMPLE_MAX_RADIUS = 1.15;
const CIRCULARITY_ERROR_SCALE = 1;
const PATH_MIN_DISTANCE = 0.01;
const PATH_MAX_POINTS = 800;

const STICK_TRAIL_MAX_POINTS = 18;
const STICK_TRAIL_LIFETIME = 520;
const STICK_TRAIL_DEADZONE = 0.05;
const STICK_TRAIL_MIN_DISTANCE = 0.018;
const DRIFT_STATUS_UPDATE_RADIUS = 0.12;
const DRIFT_STATUS_STABLE_EPSILON = 0.004;
const DRIFT_STATUS_STABLE_TIME = 500;
const DRIFT_TEST_DURATION = 3000;
const DRIFT_TEST_SAMPLE_INTERVAL = 1000 / 30;

let driftTestState = "idle";
let driftTestStartedAt = 0;
let lastDriftSampleTime = 0;
let driftTestResult = null;

const driftTestData = {
  left: createDriftTestData(),
  right: createDriftTestData()
};

const triggerRumbleState = {
  active: false,
  lastUpdate: 0,
  strong: 0,
  weak: 0
};

const singleMotorRumbleState = {
  side: null,
  timer: null
};

const stickTrailData = {
  left: createStickTrailData(),
  right: createStickTrailData()
};


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

ensureDriftModeTab();



function ensureDriftModeTab() {
  const tabsContainer = document.querySelector(".mode-tabs");

  if (!tabsContainer || tabsContainer.querySelector('[data-mode="drift"]')) {
    return;
  }

  const driftTab = document.createElement("button");
  driftTab.className = "mode-tab";
  driftTab.type = "button";
  driftTab.dataset.stickMode = "drift";
  driftTab.textContent = "Drift";
  driftTab.title = "Tes drift stick saat tidak disentuh";

  tabsContainer.appendChild(driftTab);
}

function updateModeTabLabels() {
  const circularityTab = document.querySelector('[data-stick-mode="circularity"]');

  if (!circularityTab) {
    return;
  }

  circularityTab.textContent = window.matchMedia("(max-width: 620px)").matches
    ? "Circle"
    : "Circularity";
}

updateModeTabLabels();
window.addEventListener("resize", updateModeTabLabels);

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
    samples: 0,
    radiusTrail: [],
    sweepBeam: {
      lastAngle: null,
      lastDistance: 0,
      lastUpdate: 0,
      direction: 1,
      activeAngle: null,
      activeDistance: 0,
      activeAt: 0,
      speed: 0
    }
  };
}

function createPathData() {
  return {
    points: []
  };
}

function createStickTrailData() {
  return {
    points: []
  };
}

function createDriftTestData() {
  return {
    samples: 0,
    totalRadius: 0,
    maxRadius: 0
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
      tab.textContent = `Gamepad ${slot + 1}`;
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
        : `Gamepad ${pad.index + 1}`;

      tab.className = "gamepad-tab";
      tab.textContent = `Gamepad ${pad.index + 1}`;
      tab.title = name;

      tab.addEventListener("click", () => {
        switchGamepad(pad.index);
      });
    } else {
      tab.className = "gamepad-tab placeholder-tab";
      tab.disabled = true;
      tab.textContent = `Gamepad ${slot + 1}`;
      tab.title = "Belum terdeteksi";
    }

    gamepadTabs.appendChild(tab);
  }

  gamepads.forEach((pad) => {
    const name = pad.id && pad.id.trim()
      ? pad.id
      : `Gamepad ${pad.index + 1}`;

    const option = document.createElement("option");
    option.value = String(pad.index);
    option.textContent = `Gamepad ${pad.index + 1} — ${name}`;
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
  stopTriggerRumble(true);
  stopSingleMotorRumble(true);
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
  leftStickZone?.classList.remove("stick-pressed");
  rightStickZone?.classList.remove("stick-pressed");

  leftStickValue.textContent = "X: 0.00 / Y: 0.00";
  rightStickValue.textContent = "X: 0.00 / Y: 0.00";
  resetStickReadoutsForEmptyState();

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
  resetStickTrail();

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

  const mappingText = pad.mapping === "standard" ? "Standar" : "Nonstandar";
  setTextIfChanged(mappingEl, mappingText);
  setTextIfChanged(buttonCountEl, String(pad.buttons.length));
  setTextIfChanged(axisCountEl, String(pad.axes.length));

  const hasVibration = Boolean(pad.vibrationActuator);
  // Kartu status dibuat ringkas agar layout tidak turun.
  const vibrationMetaText = hasVibration ? "Didukung" : "Tidak";
  // Panel getar punya ruang lebih lega, jadi keterangannya dibuat lebih jelas.
  const vibrationPanelText = hasVibration ? "Didukung" : "Tidak didukung";

  setTextIfChanged(vibrationSupportEl, vibrationMetaText);
  setTextIfChanged(vibrationPanelStatus, vibrationPanelText);

  setVibrationControls(hasVibration);
  updateButtonLabels(pad);
  reportGamepadOnce(pad);
}

function setVibrationControls(enabled) {
  lightVibrateBtn.disabled = !enabled;
  heavyVibrateBtn.disabled = !enabled;
  fullVibrateBtn.disabled = !enabled;
  infiniteVibrateBtn.disabled = !enabled;
  toggleAdvancedVibrateBtn.disabled = !enabled;
  leftMotorSlider.disabled = !enabled;
  rightMotorSlider.disabled = !enabled;
  leftMotorTestBtn.disabled = !enabled;
  rightMotorTestBtn.disabled = !enabled;
  triggerRumbleToggle.disabled = !enabled;

  if (!enabled) {
    triggerRumbleToggle.checked = false;
    stopTriggerRumble(false);
    stopSingleMotorRumble(false);
  }
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

function updateStickPressState(pad) {
  const leftPressed = Boolean(
    pad?.buttons[10] && (pad.buttons[10].pressed || pad.buttons[10].value > 0.5)
  );
  const rightPressed = Boolean(
    pad?.buttons[11] && (pad.buttons[11].pressed || pad.buttons[11].value > 0.5)
  );

  leftStickZone?.classList.toggle("stick-pressed", leftPressed);
  rightStickZone?.classList.toggle("stick-pressed", rightPressed);
}

function setTextIfChanged(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

function setEmptyStateOnce(message = "Menunggu gamepad...") {
  const emptySignature = `${message}|${stickMode}`;

  if (lastEmptyMessage === emptySignature) return;

  lastEmptyMessage = emptySignature;
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

function createDriftReadout(anchorEl) {
  if (!anchorEl) return null;

  const existing = anchorEl.parentElement?.querySelector(".drift-readout");

  if (existing) {
    return existing;
  }

  const element = document.createElement("small");
  element.className = "drift-readout normal";
  element.textContent = "Drift: 0.0% · Normal";

  anchorEl.insertAdjacentElement("afterend", element);

  return element;
}

function getDriftStatus(driftPercent) {
  if (driftPercent <= 3) {
    return {
      label: "Normal",
      className: "normal"
    };
  }

  if (driftPercent <= 7) {
    return {
      label: "Sedang",
      className: "medium"
    };
  }

  return {
    label: "Tinggi",
    className: "high"
  };
}

function updateDriftReadout(element, x, y) {
  if (!element) return;

  if (stickMode === "drift") {
    return;
  }

  const offsetPercent = Math.hypot(x, y) * 100;

  element.classList.remove("normal", "medium", "high");
  element.classList.add("pending");
  setTextIfChanged(element, `Offset: ${offsetPercent.toFixed(1)}%`);
}

function resetStickReadoutsForEmptyState() {
  [leftStickDrift, rightStickDrift].forEach((element) => {
    if (!element) return;

    element.classList.remove("normal", "medium", "high");
    element.classList.add("pending");

    if (stickMode === "drift") {
      setTextIfChanged(element, "Drift: menunggu gamepad");
      return;
    }

    setTextIfChanged(element, "Offset: 0.0%");
  });
}

function resetDriftTest() {
  driftTestState = "idle";
  driftTestStartedAt = 0;
  lastDriftSampleTime = 0;
  driftTestResult = null;
  driftTestData.left = createDriftTestData();
  driftTestData.right = createDriftTestData();
  clearDriftZoneClasses();
}

function startDriftTest() {
  if (!getActiveGamepad()) {
    return;
  }

  driftTestState = "running";
  driftTestStartedAt = performance.now();
  lastDriftSampleTime = 0;
  driftTestResult = null;
  driftTestData.left = createDriftTestData();
  driftTestData.right = createDriftTestData();
  renderStickTest();
}

function sampleDriftTestSide(side, x, y) {
  const data = driftTestData[side];
  const radius = Math.hypot(x, y);

  data.samples += 1;
  data.totalRadius += radius;
  data.maxRadius = Math.max(data.maxRadius, radius);
}

function getDriftTestSideResult(side) {
  const data = driftTestData[side];

  if (!data.samples) {
    return {
      averagePercent: 0,
      maxPercent: 0,
      status: getDriftStatus(0)
    };
  }

  const averagePercent = (data.totalRadius / data.samples) * 100;
  const maxPercent = data.maxRadius * 100;

  return {
    averagePercent,
    maxPercent,
    status: getDriftStatus(averagePercent)
  };
}

function finishDriftTest() {
  driftTestState = "done";
  driftTestResult = {
    left: getDriftTestSideResult("left"),
    right: getDriftTestSideResult("right")
  };

  renderStickTest();
}

function updateDriftMode(lx, ly, rx, ry) {
  if (driftTestState !== "running") return;

  const now = performance.now();

  if (now - lastDriftSampleTime >= DRIFT_TEST_SAMPLE_INTERVAL) {
    sampleDriftTestSide("left", lx, ly);
    sampleDriftTestSide("right", rx, ry);
    lastDriftSampleTime = now;
  }

  if (now - driftTestStartedAt >= DRIFT_TEST_DURATION) {
    finishDriftTest();
    return;
  }

  renderStickTest();
}

function formatDriftTestResult(result) {
  return `${result.averagePercent.toFixed(1)}% · ${result.status.label}`;
}

function applyDriftResultClass(element, status) {
  if (!element) return;

  element.classList.remove("normal", "medium", "high", "pending");
  element.classList.add(status.className);
}

function clearDriftZoneClasses() {
  [leftStickZone, rightStickZone].forEach((zone) => {
    zone?.classList.remove("drift-result-normal", "drift-result-medium", "drift-result-high");
  });
}

function applyDriftZoneClass(zone, status) {
  if (!zone || !status) return;

  zone.classList.remove("drift-result-normal", "drift-result-medium", "drift-result-high");
  zone.classList.add(`drift-result-${status.className}`);
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
  updateDriftReadout(leftStickDrift, lx, ly);
  updateDriftReadout(rightStickDrift, rx, ry);

  updateRawAxes(pad);

  if (stickMode === "off") {
    updateStickTrail("left", lx, ly, leftStickCanvas);
    updateStickTrail("right", rx, ry, rightStickCanvas);
    return;
  }

  if (stickMode === "drift") {
    updateDriftMode(lx, ly, rx, ry);

    // Saat gamepad baru terdeteksi setelah tab Drift sudah aktif,
    // refresh tombol Mulai Tes Drift agar tidak tertinggal disabled.
    if (driftTestState !== "running") {
      renderStickTest();
    }

    return;
  }

  // Circularity disampling di loop ringan sebelum throttle UI.
  // Path tetap disampling di loop UI 30 FPS agar jumlah titik tidak cepat membengkak.
  if (stickMode !== "circularity") {
    updateStickTestData("left", lx, ly);
    updateStickTestData("right", rx, ry);
  }

  renderStickTest();
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
  const radius = Math.hypot(point.x, point.y);

  // Setelah reset, jangan langsung tambahkan titik netral agar status benar-benar kosong.
  if (!last && radius < PATH_MIN_DISTANCE) {
    return;
  }

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

function resetStickTrail() {
  stickTrailData.left.points = [];
  stickTrailData.right.points = [];
  clearCanvas(leftStickCanvas);
  clearCanvas(rightStickCanvas);
}

function updateStickTrail(side, x, y, canvas) {
  const data = stickTrailData[side];
  const now = performance.now();
  const radius = Math.hypot(x, y);

  data.points = data.points.filter((point) => now - point.time <= STICK_TRAIL_LIFETIME);

  if (radius >= STICK_TRAIL_DEADZONE) {
    const last = data.points[data.points.length - 1];
    const shouldAdd = !last ||
      Math.hypot(x - last.x, y - last.y) >= STICK_TRAIL_MIN_DISTANCE;

    if (shouldAdd) {
      data.points.push({ x, y, time: now });
    }

    while (data.points.length > STICK_TRAIL_MAX_POINTS) {
      data.points.shift();
    }
  }

  drawStickTrail(canvas, data, now);
}

function drawStickTrail(canvas, data, now = performance.now()) {
  if (!canvas) return;

  const {
    ctx,
    width,
    height,
    dpr,
    centerX,
    centerY,
    radius
  } = getCanvasMetrics(canvas);

  ctx.clearRect(0, 0, width, height);

  if (!data.points.length) return;

  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();

  const visiblePoints = data.points
    .map((point) => {
      const age = now - point.time;
      const life = Math.max(0, 1 - age / STICK_TRAIL_LIFETIME);

      return {
        ...point,
        life,
        xPos: centerX + Math.max(-1, Math.min(1, point.x)) * radius,
        yPos: centerY + Math.max(-1, Math.min(1, point.y)) * radius
      };
    })
    .filter((point) => point.life > 0);

  data.points = data.points.filter((point) => now - point.time <= STICK_TRAIL_LIFETIME);

  if (visiblePoints.length < 2) return;

  ctx.save();
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.strokeStyle = accentColor;

  // v19.4b: clean meteor trail.
  // Semua trail memakai warna accent biru.
  // Titik/glow terpisah dihapus; ujung segmen dibuat butt agar tidak tampak seperti titik putih.
  for (let i = 1; i < visiblePoints.length; i += 1) {
    const previous = visiblePoints[i - 1];
    const current = visiblePoints[i];

    const positionRatio = i / (visiblePoints.length - 1);
    const ageFade = current.life;
    const strength = positionRatio * ageFade;

    const lineWidth = (0.9 + strength * 10.5) * dpr;
    const alpha = Math.min(0.64, 0.06 + strength * 0.58);

    ctx.globalAlpha = alpha;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(previous.xPos, previous.yPos);
    ctx.lineTo(current.xPos, current.yPos);
    ctx.stroke();
  }

  // Kepala trail tetap biru, tapi dibuat sebagai sapuan pendek, bukan titik/glow.
  const head = visiblePoints[visiblePoints.length - 1];
  const beforeHead = visiblePoints[visiblePoints.length - 2];

  ctx.globalAlpha = Math.min(0.68, head.life * 0.68);
  ctx.lineCap = "round";
  ctx.lineWidth = 9.5 * dpr;
  ctx.beginPath();
  ctx.moveTo(beforeHead.xPos, beforeHead.yPos);
  ctx.lineTo(head.xPos, head.yPos);
  ctx.stroke();

  ctx.restore();
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
  document.body.classList.toggle("stick-mode-drift", stickMode === "drift");

  clearCanvas(leftStickCanvas);
  clearCanvas(rightStickCanvas);

  if (!getActiveGamepad()) {
    resetStickReadoutsForEmptyState();
  }

  resetStickTestBtn.hidden = false;
  resetStickTestBtn.disabled = false;

  if (stickMode !== "drift") {
    resetStickTestBtn.textContent = "Reset";
  }

  if (stickMode === "off") {
    resetStickTestBtn.textContent = "Nonaktif";
    resetStickTestBtn.disabled = true;

    leftStickTestValue.textContent = "Off";
    rightStickTestValue.textContent = "Off";
    leftStickTestInfo.textContent = "Mode: Off";
    rightStickTestInfo.textContent = "Mode: Off";

    leftStickOverlayLabel.textContent = "STICK";
    rightStickOverlayLabel.textContent = "STICK";
    leftStickOverlayValue.textContent = "-";
    rightStickOverlayValue.textContent = "-";
    return;
  }

  if (stickMode === "drift") {
    leftStickOverlayLabel.textContent = "";
    rightStickOverlayLabel.textContent = "";
    leftStickOverlayValue.textContent = "";
    rightStickOverlayValue.textContent = "";

    if (driftTestState === "running") {
      clearDriftZoneClasses();
      const elapsed = performance.now() - driftTestStartedAt;
      const remaining = Math.max(0, Math.ceil((DRIFT_TEST_DURATION - elapsed) / 1000));

      leftStickTestValue.textContent = "Drift";
      rightStickTestValue.textContent = "Drift";
      leftStickTestInfo.textContent = `Memindai... ${remaining}s`;
      rightStickTestInfo.textContent = `Memindai... ${remaining}s`;

      setTextIfChanged(leftStickDrift, "Drift: memindai");
      setTextIfChanged(rightStickDrift, "Drift: memindai");

      leftStickDrift?.classList.remove("normal", "medium", "high");
      rightStickDrift?.classList.remove("normal", "medium", "high");
      leftStickDrift?.classList.add("pending");
      rightStickDrift?.classList.add("pending");

      resetStickTestBtn.textContent = "Memindai...";
      resetStickTestBtn.disabled = true;

      drawDriftDeadzoneGuide(leftStickCanvas);
      drawDriftDeadzoneGuide(rightStickCanvas);
      return;
    }

    if (driftTestState === "done" && driftTestResult) {
      leftStickTestValue.textContent = "Drift";
      rightStickTestValue.textContent = "Drift";
      leftStickTestInfo.textContent = `Avg ${driftTestResult.left.averagePercent.toFixed(1)}% | Max ${driftTestResult.left.maxPercent.toFixed(1)}%`;
      rightStickTestInfo.textContent = `Avg ${driftTestResult.right.averagePercent.toFixed(1)}% | Max ${driftTestResult.right.maxPercent.toFixed(1)}%`;

      setTextIfChanged(leftStickDrift, `Drift: ${formatDriftTestResult(driftTestResult.left)}`);
      setTextIfChanged(rightStickDrift, `Drift: ${formatDriftTestResult(driftTestResult.right)}`);

      applyDriftResultClass(leftStickDrift, driftTestResult.left.status);
      applyDriftResultClass(rightStickDrift, driftTestResult.right.status);
      applyDriftZoneClass(leftStickZone, driftTestResult.left.status);
      applyDriftZoneClass(rightStickZone, driftTestResult.right.status);

      resetStickTestBtn.textContent = "Ulangi";

      drawDriftDeadzoneGuide(leftStickCanvas);
      drawDriftDeadzoneGuide(rightStickCanvas);
      return;
    }

    clearDriftZoneClasses();

    const hasGamepad = Boolean(getActiveGamepad());

    leftStickTestValue.textContent = "Drift";
    rightStickTestValue.textContent = "Drift";
    leftStickTestInfo.textContent = hasGamepad
      ? "Lepaskan stick, lalu tekan Mulai"
      : "Hubungkan gamepad dulu";
    rightStickTestInfo.textContent = hasGamepad
      ? "Lepaskan stick, lalu tekan Mulai"
      : "Hubungkan gamepad dulu";

    setTextIfChanged(leftStickDrift, hasGamepad ? "Drift: siap" : "Drift: menunggu gamepad");
    setTextIfChanged(rightStickDrift, hasGamepad ? "Drift: siap" : "Drift: menunggu gamepad");

    leftStickDrift?.classList.remove("normal", "medium", "high");
    rightStickDrift?.classList.remove("normal", "medium", "high");
    leftStickDrift?.classList.add("pending");
    rightStickDrift?.classList.add("pending");

    resetStickTestBtn.textContent = "Mulai";
    resetStickTestBtn.disabled = !hasGamepad;

    drawDriftDeadzoneGuide(leftStickCanvas);
    drawDriftDeadzoneGuide(rightStickCanvas);
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

    drawCircularityFill(leftStickCanvas, circularityData.left, lastStickVisual.left);
    drawCircularityFill(rightStickCanvas, circularityData.right, lastStickVisual.right);
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
    infoEl.textContent = `Cov ${coverage.toFixed(0)}% | Putar pelan 360°`;

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
  const pointCount = data.points.length;

  valueEl.textContent = "Path";
  infoEl.textContent = pointCount
    ? `${pointCount} titik | Reset untuk hapus`
    : "0 titik | Gerakkan stick";

  overlayLabelEl.textContent = "PATH";
  overlayValueEl.textContent = `${pointCount}`;
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

function getCircularityFilledSegments(bins) {
  const segments = [];
  let currentSegment = [];

  bins.forEach((value, index) => {
    if (value > 0) {
      currentSegment.push(index);
      return;
    }

    if (currentSegment.length) {
      segments.push(currentSegment);
      currentSegment = [];
    }
  });

  if (currentSegment.length) {
    segments.push(currentSegment);
  }

  if (segments.length > 1) {
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    const startsAtZero = firstSegment[0] === 0;
    const endsAtLastBin = lastSegment[lastSegment.length - 1] === bins.length - 1;

    if (startsAtZero && endsAtLastBin) {
      segments[0] = [...lastSegment, ...firstSegment];
      segments.pop();
    }
  }

  return segments;
}

function createContinuousAngles(segment, step) {
  const angles = [];
  let turnOffset = 0;
  let previousIndex = segment[0];

  segment.forEach((index, position) => {
    if (position > 0 && index < previousIndex) {
      turnOffset += Math.PI * 2;
    }

    angles.push(index * step + turnOffset);
    previousIndex = index;
  });

  return angles;
}

function getCircularitySegmentsByRadius(bins, minRadius) {
  const segments = [];
  let currentSegment = [];

  bins.forEach((value, index) => {
    if (value >= minRadius) {
      currentSegment.push(index);
      return;
    }

    if (currentSegment.length) {
      segments.push(currentSegment);
      currentSegment = [];
    }
  });

  if (currentSegment.length) {
    segments.push(currentSegment);
  }

  if (segments.length > 1) {
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    const startsAtZero = firstSegment[0] === 0;
    const endsAtLastBin = lastSegment[lastSegment.length - 1] === bins.length - 1;

    if (startsAtZero && endsAtLastBin) {
      segments[0] = [...lastSegment, ...firstSegment];
      segments.pop();
    }
  }

  return segments;
}

function createCircularityRenderBins(sourceBins) {
  if (sourceBins.length >= CIRCULARITY_RENDER_BINS) {
    return [...sourceBins];
  }

  const renderBins = [];
  const sourceLength = sourceBins.length;

  for (let index = 0; index < CIRCULARITY_RENDER_BINS; index++) {
    const sourcePosition = (index / CIRCULARITY_RENDER_BINS) * sourceLength;
    const leftIndex = Math.floor(sourcePosition) % sourceLength;
    const rightIndex = (leftIndex + 1) % sourceLength;
    const mix = sourcePosition - Math.floor(sourcePosition);
    const leftValue = sourceBins[leftIndex] || 0;
    const rightValue = sourceBins[rightIndex] || 0;

    // Visual boleh dibuat lebih halus, tapi jangan membuat coverage palsu
    // di celah yang belum pernah disentuh. Jika salah satu sisi kosong,
    // nilai render tetap mengikuti bin yang benar-benar terisi.
    if (leftValue > 0 && rightValue > 0) {
      renderBins.push(leftValue + (rightValue - leftValue) * mix);
    } else if (mix < 0.5) {
      renderBins.push(leftValue);
    } else {
      renderBins.push(rightValue);
    }
  }

  return renderBins;
}

function drawCircularityEnvelopeFill(ctx, bins, metrics, fillColor) {
  const { centerX, centerY, idealRadius, plotRadius } = metrics;
  const step = (Math.PI * 2) / bins.length;
  const segments = getCircularityFilledSegments(bins);

  ctx.save();
  ctx.fillStyle = fillColor;

  segments.forEach((segment) => {
    if (!segment.length) return;

    const isFullShape = segment.length === bins.length;
    const angles = createContinuousAngles(segment, step);
    const firstIndex = segment[0];
    const lastIndex = segment[segment.length - 1];
    const startAngle = angles[0] - step * 0.55;
    const endAngle = angles[angles.length - 1] + step * 0.55;
    const startRadius = Math.min(bins[firstIndex] * idealRadius, plotRadius);
    const endRadius = Math.min(bins[lastIndex] * idealRadius, plotRadius);

    ctx.beginPath();

    if (isFullShape) {
      const startX = centerX + Math.cos(angles[0]) * startRadius;
      const startY = centerY + Math.sin(angles[0]) * startRadius;
      ctx.moveTo(startX, startY);
    } else {
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(startAngle) * startRadius,
        centerY + Math.sin(startAngle) * startRadius
      );
    }

    segment.forEach((index, pointIndex) => {
      const radius = Math.min(bins[index] * idealRadius, plotRadius);
      const angle = angles[pointIndex];
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
    });

    if (!isFullShape) {
      ctx.lineTo(
        centerX + Math.cos(endAngle) * endRadius,
        centerY + Math.sin(endAngle) * endRadius
      );
      ctx.lineTo(centerX, centerY);
    }

    ctx.closePath();
    ctx.fill();
  });

  ctx.restore();
}


function getCircularityOvershootTickColor(radiusValue, colors) {
  if (radiusValue >= 1.05) return colors[3];
  if (radiusValue >= 1.035) return colors[2];
  if (radiusValue >= 1.02) return colors[1];
  return colors[0];
}

function drawCircularityOvershootTicks(
  ctx,
  bins,
  metrics,
  colors,
  alpha,
  baseWidth,
  offset,
  threshold,
  trackColor,
  trackAlpha,
  trackWidth
) {
  const { centerX, centerY, idealRadius, dpr } = metrics;
  const step = (Math.PI * 2) / bins.length;
  const tickRadius = idealRadius + offset * dpr;
  const tickBaseArc = step * 0.38;
  const hasOvershoot = bins.some((radiusValue) => radiusValue > threshold);

  ctx.save();
  ctx.lineCap = "round";

  // v20s: jalur luar khusus overshoot.
  // Track tipis ini membuat marker terasa sebagai layer informasi,
  // bukan serpihan yang menempel di tepi fill.
  if (hasOvershoot) {
    ctx.globalAlpha = trackAlpha;
    ctx.lineWidth = trackWidth * dpr;
    ctx.strokeStyle = trackColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, tickRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  bins.forEach((radiusValue, index) => {
    if (radiusValue <= threshold) return;

    const overshootAmount = Math.min(1, Math.max(0, (radiusValue - threshold) / 0.055));
    const angle = index * step;
    const arcHalf = tickBaseArc * (0.82 + overshootAmount * 0.42);
    const startAngle = angle - arcHalf;
    const endAngle = angle + arcHalf;

    ctx.globalAlpha = alpha * (0.68 + overshootAmount * 0.32);
    ctx.lineWidth = (baseWidth + overshootAmount * 0.50) * dpr;
    ctx.strokeStyle = getCircularityOvershootTickColor(radiusValue, colors);
    ctx.beginPath();
    ctx.arc(centerX, centerY, tickRadius, startAngle, endAngle);
    ctx.stroke();
  });

  ctx.restore();
}

function drawCircularityOvershootFill(ctx, bins, metrics, overshootColor) {
  const { centerX, centerY, idealRadius, plotRadius } = metrics;
  const step = (Math.PI * 2) / bins.length;
  const segments = getCircularitySegmentsByRadius(bins, 1.001);

  ctx.save();
  ctx.fillStyle = overshootColor;
  ctx.globalAlpha = 1;

  segments.forEach((segment) => {
    if (!segment.length) return;

    const angles = createContinuousAngles(segment, step);
    const firstIndex = segment[0];
    const lastIndex = segment[segment.length - 1];
    const startAngle = angles[0] - step * 0.55;
    const endAngle = angles[angles.length - 1] + step * 0.55;
    const startRadius = Math.min(bins[firstIndex] * idealRadius, plotRadius);
    const endRadius = Math.min(bins[lastIndex] * idealRadius, plotRadius);

    ctx.beginPath();
    ctx.moveTo(
      centerX + Math.cos(startAngle) * startRadius,
      centerY + Math.sin(startAngle) * startRadius
    );

    segment.forEach((index, pointIndex) => {
      const radius = Math.min(bins[index] * idealRadius, plotRadius);
      const angle = angles[pointIndex];
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
    });

    ctx.lineTo(
      centerX + Math.cos(endAngle) * endRadius,
      centerY + Math.sin(endAngle) * endRadius
    );
    ctx.lineTo(
      centerX + Math.cos(endAngle) * idealRadius,
      centerY + Math.sin(endAngle) * idealRadius
    );

    [...segment].reverse().forEach((index, reverseIndex) => {
      const originalIndex = segment.length - 1 - reverseIndex;
      const angle = angles[originalIndex];
      ctx.lineTo(
        centerX + Math.cos(angle) * idealRadius,
        centerY + Math.sin(angle) * idealRadius
      );
    });

    ctx.lineTo(
      centerX + Math.cos(startAngle) * idealRadius,
      centerY + Math.sin(startAngle) * idealRadius
    );
    ctx.closePath();
    ctx.fill();
  });

  ctx.restore();
}

function drawCircularitySonarRings(ctx, metrics, sonarRingColor, ringWidth = 1.1, dashLength = 4) {
  const { centerX, centerY, idealRadius, dpr } = metrics;
  const ringRadii = [0.28, 0.52, 0.76];

  ctx.save();
  ctx.strokeStyle = sonarRingColor;
  ctx.globalAlpha = 1;
  ctx.lineWidth = ringWidth * dpr;
  ctx.setLineDash(dashLength > 0 ? [dashLength * dpr, dashLength * 1.5 * dpr] : []);

  ringRadii.forEach((scale) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, idealRadius * scale, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.restore();
}


function getAngleDistance(a, b) {
  const diff = Math.abs(a - b) % (Math.PI * 2);
  return Math.min(diff, Math.PI * 2 - diff);
}


function getSignedAngleDelta(fromAngle, toAngle) {
  let delta = toAngle - fromAngle;

  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }

  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }

  return delta;
}

function updateCircularitySweepBeamState(
  data,
  currentStick,
  minRadius = 0.90,
  angleThreshold = 0.018
) {
  const currentX = Math.max(-1, Math.min(1, currentStick.x || 0));
  const currentY = Math.max(-1, Math.min(1, currentStick.y || 0));
  const distance = Math.hypot(currentX, currentY);
  const angle = Math.atan2(currentY, currentX);
  const now = performance.now();

  if (!data.sweepBeam) {
    data.sweepBeam = {
      lastAngle: null,
      lastDistance: 0,
      lastUpdate: 0,
      direction: 1,
      activeAngle: null,
      activeDistance: 0,
      activeAt: 0,
      speed: 0
    };
  }

  const beam = data.sweepBeam;

  if (distance < minRadius) {
    beam.lastAngle = null;
    beam.lastDistance = distance;
    beam.lastUpdate = now;

    return {
      x: currentX,
      y: currentY,
      distance,
      beamAngle: beam.activeAngle,
      beamDistance: beam.activeDistance,
      beamAge: now - beam.activeAt,
      direction: beam.direction,
      speed: beam.speed
    };
  }

  if (beam.lastAngle !== null) {
    const angleDelta = getSignedAngleDelta(beam.lastAngle, angle);
    const distanceDelta = Math.abs(distance - beam.lastDistance);
    const timeDelta = beam.lastUpdate ? Math.max(16, now - beam.lastUpdate) : 16;
    const isAngularSweep = Math.abs(angleDelta) >= angleThreshold;

    if (isAngularSweep) {
      beam.direction = angleDelta > 0 ? 1 : -1;
      beam.activeAngle = angle;
      beam.activeDistance = distance;
      beam.activeAt = now;
      beam.speed = Math.min(1, Math.max(0.2, Math.abs(angleDelta) / timeDelta * 850 + distanceDelta / timeDelta * 55));
    }
  }

  beam.lastAngle = angle;
  beam.lastDistance = distance;
  beam.lastUpdate = now;

  return {
    x: currentX,
    y: currentY,
    distance,
    beamAngle: beam.activeAngle,
    beamDistance: beam.activeDistance,
    beamAge: now - beam.activeAt,
    direction: beam.direction,
    speed: beam.speed
  };
}

function drawCircularityCssLikeSweepBeam(
  ctx,
  metrics,
  beamState,
  beamColor,
  beamEdgeColor,
  beamAlpha = 0.74,
  beamAngle = 0.76,
  minRadius = 0.90,
  fadeMs = 260,
  slices = 12
) {
  if (!beamState || beamState.beamAngle === null || beamState.beamDistance < minRadius) return;

  const age = Math.max(0, beamState.beamAge || 0);
  const fade = Math.max(0, 1 - age / Math.max(140, fadeMs));

  if (fade <= 0) return;

  const { centerX, centerY, idealRadius, plotRadius, dpr } = metrics;
  const radius = Math.min(Math.max(beamState.beamDistance * idealRadius, idealRadius * minRadius), idealRadius);
  const direction = beamState.direction || 1;
  const speed = Math.min(1, Math.max(0, beamState.speed || 0));
  const spread = Math.max(0.20, beamAngle) * (0.94 + speed * 0.12);
  const leadingAngle = beamState.beamAngle;
  const safeSlices = Math.max(6, Math.min(18, Math.round(slices)));
  const sliceAngle = spread / safeSlices;

  ctx.save();

  // Simulasi gradient diagonal/arah-sapuan ala CSS sweep:
  // irisan dekat leading edge lebih terang, belakang cepat memudar.
  for (let i = 0; i < safeSlices; i += 1) {
    const t0 = i / safeSlices;
    const t1 = (i + 1) / safeSlices;
    const startAngle = leadingAngle - direction * spread * t1;
    const endAngle = leadingAngle - direction * spread * t0;
    const localFade = Math.pow(1 - t0, 1.18);
    const innerRadius = radius * (0.05 + 0.04 * t0);

    if (localFade <= 0.015) continue;

    ctx.globalAlpha = beamAlpha * fade * localFade;
    ctx.fillStyle = colorMixFallback(beamColor, 0.48 * localFade);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, direction < 0);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, direction >= 0);
    ctx.closePath();
    ctx.fill();
  }

  // Leading edge tipis agar arah sapuan terbaca, tanpa membuat sektor terlihat seperti kertas.
  ctx.globalAlpha = Math.min(1, (beamAlpha + 0.16) * fade);
  ctx.strokeStyle = colorMixFallback(beamEdgeColor, 0.62);
  ctx.lineWidth = (1.05 + speed * 0.22) * dpr;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(
    centerX + Math.cos(leadingAngle) * radius,
    centerY + Math.sin(leadingAngle) * radius
  );
  ctx.stroke();

  // Rim arc sangat tipis untuk memberi rasa sweep, bukan blok solid.
  ctx.globalAlpha = Math.min(1, (beamAlpha + 0.04) * fade);
  ctx.strokeStyle = colorMixFallback(beamEdgeColor, 0.34);
  ctx.lineWidth = 0.8 * dpr;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, leadingAngle - direction * spread, leadingAngle, direction < 0);
  ctx.stroke();

  ctx.restore();
}

function updateCircularityRadiusTrail(data, currentStick) {
  if (!data.radiusTrail) {
    data.radiusTrail = [];
  }

  const now = performance.now();
  const currentX = Math.max(-1, Math.min(1, currentStick.x || 0));
  const currentY = Math.max(-1, Math.min(1, currentStick.y || 0));
  const distance = Math.hypot(currentX, currentY);

  data.radiusTrail = data.radiusTrail.filter(
    (point) => now - point.t <= CIRCULARITY_RADIUS_TRAIL_LIFETIME
  );

  if (distance < CIRCULARITY_RADIUS_TRAIL_MIN_DISTANCE) {
    return { x: currentX, y: currentY, distance };
  }

  const angle = Math.atan2(currentY, currentX);
  const lastPoint = data.radiusTrail[data.radiusTrail.length - 1];
  const shouldAdd =
    !lastPoint ||
    getAngleDistance(angle, lastPoint.angle) >= CIRCULARITY_RADIUS_TRAIL_MIN_ANGLE ||
    now - lastPoint.t > 90;

  if (shouldAdd) {
    data.radiusTrail.push({ x: currentX, y: currentY, angle, t: now });
  }

  while (data.radiusTrail.length > CIRCULARITY_RADIUS_TRAIL_MAX_POINTS) {
    data.radiusTrail.shift();
  }

  return { x: currentX, y: currentY, distance };
}

function drawCircularityRadiusTrail(ctx, metrics, data, trailColor, maxAlpha = 0.22) {
  if (!data.radiusTrail?.length) return;

  const { centerX, centerY, idealRadius, dpr } = metrics;
  const now = performance.now();

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = trailColor;

  data.radiusTrail.forEach((point) => {
    const age = Math.max(0, now - point.t);
    const fade = Math.max(0, 1 - age / CIRCULARITY_RADIUS_TRAIL_LIFETIME);

    if (fade <= 0) return;

    ctx.globalAlpha = fade * maxAlpha;
    ctx.lineWidth = (2.8 - fade * 0.7) * dpr;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + point.x * idealRadius,
      centerY + point.y * idealRadius
    );
    ctx.stroke();
  });

  ctx.restore();
}


function getCssNumber(rootStyle, name, fallback) {
  const value = Number.parseFloat(rootStyle.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

function drawCircularityFill(canvas, data, currentStick = { x: 0, y: 0 }) {
  if (!canvas) return;

  const metrics = getStickCanvasPlotMetrics(canvas);
  const {
    ctx,
    width,
    height,
    dpr,
    centerX,
    centerY,
    idealRadius
  } = metrics;

  const filledBins = data.bins.filter((value) => value > 0);

  ctx.clearRect(0, 0, width, height);

  const rootStyle = getComputedStyle(document.documentElement);
  const accentColor = rootStyle
    .getPropertyValue("--accent")
    .trim();

  const fillColor = rootStyle
    .getPropertyValue("--circularity-fill")
    .trim() || rootStyle
    .getPropertyValue("--accent-soft")
    .trim();

  const overshootColor = rootStyle
    .getPropertyValue("--circularity-overshoot")
    .trim() || "rgba(255, 207, 51, 0.48)";

  const overshootTickColors = [
    rootStyle.getPropertyValue("--circularity-overshoot-tick-1").trim() || "rgba(249, 168, 212, 0.78)",
    rootStyle.getPropertyValue("--circularity-overshoot-tick-2").trim() || "rgba(251, 113, 133, 0.82)",
    rootStyle.getPropertyValue("--circularity-overshoot-tick-3").trim() || "rgba(249, 115, 22, 0.86)",
    rootStyle.getPropertyValue("--circularity-overshoot-tick-4").trim() || "rgba(217, 70, 239, 0.86)"
  ];

  const sonarRingColor = rootStyle
    .getPropertyValue("--circularity-sonar-ring")
    .trim() || accentColor;

  const radiusTrailColor = rootStyle
    .getPropertyValue("--circularity-radius-trail")
    .trim() || accentColor;

  const radiusLineColor = rootStyle
    .getPropertyValue("--circularity-radius-line")
    .trim() || accentColor;

  const radiusLineUnderColor = rootStyle
    .getPropertyValue("--circularity-radius-line-under")
    .trim() || accentColor;

  const sweepBeamColor = rootStyle
    .getPropertyValue("--circularity-sweep-beam")
    .trim() || accentColor;

  const sweepBeamEdgeColor = rootStyle
    .getPropertyValue("--circularity-sweep-beam-edge")
    .trim() || accentColor;

  const sonarRingWidth = getCssNumber(rootStyle, "--circularity-sonar-ring-width", 1.1);
  const sonarRingDash = getCssNumber(rootStyle, "--circularity-sonar-ring-dash", 4);
  const radiusTrailAlpha = getCssNumber(rootStyle, "--circularity-radius-trail-alpha", 0.22);
  const radiusLineAlpha = getCssNumber(rootStyle, "--circularity-radius-line-alpha", 0.82);
  const radiusLineUnderAlpha = getCssNumber(rootStyle, "--circularity-radius-line-under-alpha", 0.22);
  const sweepBeamAlpha = getCssNumber(rootStyle, "--circularity-sweep-beam-alpha", 0.74);
  const sweepBeamAngle = getCssNumber(rootStyle, "--circularity-sweep-beam-angle", 0.76);
  const sweepBeamMinRadius = getCssNumber(rootStyle, "--circularity-sweep-beam-min-radius", 0.90);
  const sweepBeamAngleThreshold = getCssNumber(rootStyle, "--circularity-sweep-beam-angle-threshold", 0.018);
  const sweepBeamFade = getCssNumber(rootStyle, "--circularity-sweep-beam-fade", 260);
  const sweepBeamSlices = getCssNumber(rootStyle, "--circularity-sweep-beam-slices", 12);
  const overshootTrackColor = rootStyle
    .getPropertyValue("--circularity-overshoot-track")
    .trim() || "rgba(125, 211, 252, 0.20)";
  const overshootTrackAlpha = getCssNumber(rootStyle, "--circularity-overshoot-track-alpha", 0.72);
  const overshootTrackWidth = getCssNumber(rootStyle, "--circularity-overshoot-track-width", 1.05);
  const overshootTickAlpha = getCssNumber(rootStyle, "--circularity-overshoot-tick-alpha", 0.86);
  const overshootTickWidth = getCssNumber(rootStyle, "--circularity-overshoot-tick-width", 1.65);
  const overshootTickOffset = getCssNumber(rootStyle, "--circularity-overshoot-tick-offset", 5.0);
  const overshootTickThreshold = getCssNumber(rootStyle, "--circularity-overshoot-tick-threshold", 1.01);

  if (!filledBins.length) {
    ctx.save();
    drawCircularitySonarRings(ctx, metrics, sonarRingColor, sonarRingWidth, sonarRingDash);
    ctx.restore();
    return;
  }

  const renderBins = createCircularityRenderBins(data.bins);

  ctx.save();

  // Fill coverage digambar sebagai envelope halus dari data bin.
  // Bentuk asli jangkauan stick tetap dipertahankan, termasuk jika kotak
  // atau melewati lingkaran ideal, tapi tanpa pecahan sektor yang kasar.
  drawCircularityEnvelopeFill(ctx, renderBins, metrics, fillColor);

  // Area overshoot di luar radius ideal tetap terlihat jika stick melewati
  // batas lingkaran.
  drawCircularityOvershootFill(ctx, renderBins, metrics, overshootColor);

  // Ring sonar halus membantu area circularity terasa lebih berlapis
  // tanpa mengubah data hitung atau menambah efek berat.
  drawCircularitySonarRings(ctx, metrics, sonarRingColor, sonarRingWidth, sonarRingDash);

  // v20m: marker overshoot di luar ring ideal.
  // Warna bertingkat menunjukkan seberapa jauh radius melewati batas.
  drawCircularityOvershootTicks(
    ctx,
    data.bins,
    metrics,
    overshootTickColors,
    overshootTickAlpha,
    overshootTickWidth,
    overshootTickOffset,
    overshootTickThreshold,
    overshootTrackColor,
    overshootTrackAlpha,
    overshootTrackWidth
  );

  // Garis ideal radius 1.000 tetap di atas fill.
  ctx.globalAlpha = 0.64;
  ctx.lineWidth = 1.1 * dpr;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(centerX, centerY, idealRadius, 0, Math.PI * 2);
  ctx.stroke();

  // CSS-like sweep beam: aktif hanya saat stick diputar di tepi,
  // dengan fade angular agar tidak terasa seperti bendera/kertas.
  const currentRadius = updateCircularitySweepBeamState(
    data,
    currentStick,
    sweepBeamMinRadius,
    sweepBeamAngleThreshold
  );
  drawCircularityCssLikeSweepBeam(
    ctx,
    metrics,
    currentRadius,
    sweepBeamColor,
    sweepBeamEdgeColor,
    sweepBeamAlpha,
    sweepBeamAngle,
    sweepBeamMinRadius,
    sweepBeamFade,
    sweepBeamSlices
  );

  // Garis radius circularity tetap ditarik dari pusat lingkaran
  // ke posisi stick saat ini agar arah putaran mudah dibaca.
  if (currentRadius.distance > 0.025) {
    const radiusEndX = centerX + currentRadius.x * idealRadius;
    const radiusEndY = centerY + currentRadius.y * idealRadius;

    // Lapis bawah menjaga garis tetap terbaca di light mode,
    // lapis atas menjaga kesan radar tetap bersih.
    ctx.lineCap = "round";
    ctx.globalAlpha = radiusLineUnderAlpha;
    ctx.lineWidth = 3.2 * dpr;
    ctx.strokeStyle = radiusLineUnderColor;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(radiusEndX, radiusEndY);
    ctx.stroke();

    ctx.globalAlpha = radiusLineAlpha;
    ctx.lineWidth = 1.35 * dpr;
    ctx.strokeStyle = radiusLineColor;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(radiusEndX, radiusEndY);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

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

function drawDriftDeadzoneGuide(canvas) {
  if (!canvas) return;

  const metrics = getStickCanvasPlotMetrics(canvas);
  const { ctx, width, height, dpr, centerX, centerY, idealRadius } = metrics;
  const rootStyle = getComputedStyle(document.documentElement);
  const deadzoneColor = rootStyle
    .getPropertyValue("--drift-deadzone-ring")
    .trim() || rootStyle.getPropertyValue("--accent").trim();

  ctx.clearRect(0, 0, width, height);

  ctx.save();
  const deadzoneDash = getCssNumber(rootStyle, "--drift-deadzone-dash", 0);

  ctx.strokeStyle = deadzoneColor;
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.2 * dpr;
  ctx.setLineDash(deadzoneDash > 0 ? [deadzoneDash * dpr, deadzoneDash * 1.35 * dpr] : []);
  ctx.beginPath();
  ctx.arc(centerX, centerY, idealRadius * 0.08, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
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
  resetDriftTest();

  getModeTabs().forEach((tab) => {
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
  resetStickTrail();
  resetDriftTest();
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
  updateStickPressState(pad);
  updateRawButtons(pad);
  updateAxes(pad);
  updateTriggers(pad);
  updateTriggerRumble(pad, timestamp);
}

async function runVibration(durationSeconds = 1, strong = 1.0, weak = 0.8) {
  const pad = getActiveGamepad();

  if (!pad) {
    alert("Gamepad belum terdeteksi.");
    return;
  }

  if (!pad.vibrationActuator) {
    alert("Browser atau gamepad ini tidak mendukung tes getar.");
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

function renderInfiniteButton(active) {
  infiniteVibrateBtn.textContent = active ? "Berhenti" : "Konstan";
  infiniteVibrateBtn.setAttribute(
    "aria-label",
    active ? "Hentikan getar konstan" : "Getar konstan"
  );
  infiniteVibrateBtn.title = active
    ? "Hentikan getar konstan"
    : "Getar konstan, tekan lagi untuk berhenti";
}

function setInfiniteVibrationActive(active) {
  infiniteVibrateBtn.classList.toggle("active", active);
  renderInfiniteButton(active);
}

function setVibrationAdvancedOpen(open) {
  vibrationAdvancedPanel.hidden = !open;
  toggleAdvancedVibrateBtn.classList.toggle("active", open);
  toggleAdvancedVibrateBtn.setAttribute("aria-expanded", String(open));

  if (!open) {
    triggerRumbleToggle.checked = false;
    stopTriggerRumble(true);
    stopSingleMotorRumble(true);
  }
}

function startInfiniteVibration(strong = 1.0, weak = 1.0) {
  stopInfiniteVibration(false);
  stopSingleMotorRumble(false);

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

function resetTriggerRumbleState() {
  triggerRumbleState.active = false;
  triggerRumbleState.lastUpdate = 0;
  triggerRumbleState.strong = 0;
  triggerRumbleState.weak = 0;
}

function stopTriggerRumble(stopMotor = true) {
  const wasActive = triggerRumbleState.active;
  resetTriggerRumbleState();

  if (stopMotor && wasActive) {
    stopVibration();
  }
}

function getButtonValue(button) {
  if (!button) return 0;
  return Math.max(0, Math.min(1, button.value || (button.pressed ? 1 : 0)));
}

function shouldUseTriggerRumble() {
  return Boolean(
    triggerRumbleToggle.checked &&
    !vibrationAdvancedPanel.hidden &&
    infiniteVibrationTimer === null &&
    singleMotorRumbleState.timer === null
  );
}

function updateTriggerRumble(pad, timestamp) {
  if (!shouldUseTriggerRumble() || !pad?.vibrationActuator) {
    stopTriggerRumble(true);
    return;
  }

  const strong = getButtonValue(pad.buttons[6]) * (getMotorSliderValue(leftMotorSlider) / 100);
  const weak = getButtonValue(pad.buttons[7]) * (getMotorSliderValue(rightMotorSlider) / 100);

  if (strong < TRIGGER_RUMBLE_STOP_EPSILON && weak < TRIGGER_RUMBLE_STOP_EPSILON) {
    stopTriggerRumble(true);
    return;
  }

  const changedEnough =
    Math.abs(strong - triggerRumbleState.strong) >= TRIGGER_RUMBLE_CHANGE_EPSILON ||
    Math.abs(weak - triggerRumbleState.weak) >= TRIGGER_RUMBLE_CHANGE_EPSILON;

  if (
    triggerRumbleState.active &&
    !changedEnough &&
    timestamp - triggerRumbleState.lastUpdate < TRIGGER_RUMBLE_INTERVAL
  ) {
    return;
  }

  triggerRumbleState.active = true;
  triggerRumbleState.lastUpdate = timestamp;
  triggerRumbleState.strong = strong;
  triggerRumbleState.weak = weak;

  pad.vibrationActuator.playEffect("dual-rumble", {
    duration: TRIGGER_RUMBLE_DURATION,
    strongMagnitude: Math.max(0, Math.min(1, strong)),
    weakMagnitude: Math.max(0, Math.min(1, weak))
  }).catch((error) => {
    console.error(error);
    triggerRumbleToggle.checked = false;
    stopTriggerRumble(false);
  });
}

function getMotorSliderValue(slider) {
  return Math.max(0, Math.min(100, Number(slider.value) || 0));
}

function updateMotorSliderLabel(slider, output) {
  output.textContent = `${getMotorSliderValue(slider)}%`;
}

function renderSingleMotorButtons() {
  const activeSide = singleMotorRumbleState.side;

  leftMotorTestBtn.textContent = activeSide === "left" ? "Berhenti" : "Tes";
  rightMotorTestBtn.textContent = activeSide === "right" ? "Berhenti" : "Tes";

  leftMotorTestBtn.classList.toggle("active", activeSide === "left");
  rightMotorTestBtn.classList.toggle("active", activeSide === "right");

  leftMotorTestBtn.setAttribute(
    "aria-label",
    activeSide === "left" ? "Hentikan tes motor kiri" : "Tes motor kiri"
  );
  rightMotorTestBtn.setAttribute(
    "aria-label",
    activeSide === "right" ? "Hentikan tes motor kanan" : "Tes motor kanan"
  );
}

function getSingleMotorStrength(side) {
  return side === "left"
    ? getMotorSliderValue(leftMotorSlider) / 100
    : getMotorSliderValue(rightMotorSlider) / 100;
}

function runSingleMotorPulse(side) {
  const strength = getSingleMotorStrength(side);

  // Gamepad API memakai strong/weak magnitude, bukan label kiri/kanan eksplisit.
  // Pada banyak gamepad, strong biasanya terasa sebagai motor kiri yang lebih berat,
  // sedangkan weak biasanya terasa sebagai motor kanan yang lebih halus.
  if (side === "left") {
    runVibration(1.0, strength, 0);
    return;
  }

  runVibration(1.0, 0, strength);
}

function startSingleMotorRumble(side) {
  stopInfiniteVibration(false);
  stopTriggerRumble(false);
  stopSingleMotorRumble(false);

  triggerRumbleToggle.checked = false;
  singleMotorRumbleState.side = side;
  renderSingleMotorButtons();

  runSingleMotorPulse(side);
  singleMotorRumbleState.timer = window.setInterval(() => {
    runSingleMotorPulse(side);
  }, SINGLE_MOTOR_INTERVAL);
}

function stopSingleMotorRumble(stopMotor = true) {
  const wasActive = Boolean(singleMotorRumbleState.side);

  if (singleMotorRumbleState.timer !== null) {
    window.clearInterval(singleMotorRumbleState.timer);
    singleMotorRumbleState.timer = null;
  }

  singleMotorRumbleState.side = null;
  renderSingleMotorButtons();

  if (stopMotor && wasActive) {
    stopVibration();
  }
}

function toggleSingleMotorRumble(side) {
  if (singleMotorRumbleState.side === side) {
    stopSingleMotorRumble(true);
    return;
  }

  startSingleMotorRumble(side);
}

gamepadSelect.addEventListener("change", () => {
  if (gamepadSelect.value === "") return;
  switchGamepad(Number(gamepadSelect.value));
});

getModeTabs().forEach((tab) => {
  tab.addEventListener("click", () => {
    setStickMode(tab.dataset.stickMode);
  });
});

resetStickTestBtn.addEventListener("click", () => {
  if (stickMode === "drift") {
    startDriftTest();
    return;
  }

  resetStickTest();
});
clearButtonHistoryBtn.addEventListener("click", clearButtonHistory);

leftMotorSlider.addEventListener("input", () => {
  updateMotorSliderLabel(leftMotorSlider, leftMotorValue);

  if (singleMotorRumbleState.side === "left") {
    runSingleMotorPulse("left");
  }
});

rightMotorSlider.addEventListener("input", () => {
  updateMotorSliderLabel(rightMotorSlider, rightMotorValue);

  if (singleMotorRumbleState.side === "right") {
    runSingleMotorPulse("right");
  }
});

leftMotorTestBtn.addEventListener("click", () => {
  toggleSingleMotorRumble("left");
});

rightMotorTestBtn.addEventListener("click", () => {
  toggleSingleMotorRumble("right");
});

triggerRumbleToggle.addEventListener("change", () => {
  stopInfiniteVibration(false);
  stopSingleMotorRumble(true);
  stopTriggerRumble(true);
});

lightVibrateBtn.addEventListener("click", () => {
  stopInfiniteVibration(false);
  stopTriggerRumble(false);
  stopSingleMotorRumble(false);
  runVibration(1.0, 0.15, 0.35);
});

heavyVibrateBtn.addEventListener("click", () => {
  stopInfiniteVibration(false);
  stopTriggerRumble(false);
  stopSingleMotorRumble(false);
  runVibration(1.0, 0.85, 0.15);
});

fullVibrateBtn.addEventListener("click", () => {
  stopInfiniteVibration(false);
  stopTriggerRumble(false);
  stopSingleMotorRumble(false);
  runVibration(1.0, 1.0, 1.0);
});

infiniteVibrateBtn.addEventListener("click", () => {
  if (infiniteVibrationTimer !== null) {
    stopInfiniteVibration(true);
    return;
  }

  triggerRumbleToggle.checked = false;
  stopTriggerRumble(false);
  stopSingleMotorRumble(false);
  startInfiniteVibration(1.0, 1.0);
});

toggleAdvancedVibrateBtn.addEventListener("click", () => {
  setVibrationAdvancedOpen(vibrationAdvancedPanel.hidden);
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
    stopTriggerRumble(true);
    stopSingleMotorRumble(true);
    activeGamepadIndex = null;
  }

  renderGamepadControls(true);
  setEmptyState("Gamepad terputus");
});

document.addEventListener("visibilitychange", () => {
  isPageVisible = !document.hidden;

  if (document.hidden) {
    stopInfiniteVibration(true);
    stopTriggerRumble(true);
    stopSingleMotorRumble(true);
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
  stopTriggerRumble(true);
  stopSingleMotorRumble(true);
});

renderInfiniteButton(false);
renderSingleMotorButtons();
setVibrationAdvancedOpen(false);
setEmptyState();
renderGamepadControls(true);
setStickMode("off");
update();
