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

let activeGamepadIndex = null;
let lastGamepadSignature = "";
let stickMode = "off";
let infiniteVibrationTimer = null;
const seenButtons = new Set();

let lastFrameTime = 0;
let lastControlsRenderTime = 0;

const FRAME_INTERVAL = 1000 / 30;
const CONTROLS_RENDER_INTERVAL = 500;

const rawButtonItems = new Map();
const rawAxisItems = new Map();

const CIRCULARITY_BINS = 72;
const CIRCULARITY_MIN_RADIUS = 0.35;
const CIRCULARITY_ERROR_SAMPLE_MIN_RADIUS = 0.92;
const CIRCULARITY_ERROR_SAMPLE_MAX_RADIUS = 1.15;
const CIRCULARITY_ERROR_SCALE = 1.35;
const PATH_MIN_DISTANCE = 0.01;
const PATH_MAX_POINTS = 1400;

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
  activeGamepadIndex = Number(index);
  resetStickTest();
  syncActiveControlState();
}

function setEmptyState(message = "Menunggu gamepad...") {
  statusEl.textContent = message;
  gamepadNameEl.textContent = "Belum terdeteksi";
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

  renderStickTest();
}

function updateInfo(pad) {
  statusEl.textContent = "Gamepad terdeteksi";

  gamepadNameEl.textContent = pad.id && pad.id.trim()
    ? pad.id
    : "Gamepad terdeteksi tanpa nama";

  mappingEl.textContent = pad.mapping || "unknown";
  buttonCountEl.textContent = pad.buttons.length;
  axisCountEl.textContent = pad.axes.length;

  const hasVibration = Boolean(pad.vibrationActuator);
  const vibrationText = hasVibration ? "supported" : "not supported";

  vibrationSupportEl.textContent = vibrationText;
  vibrationPanelStatus.textContent = vibrationText;

  setVibrationControls(hasVibration);
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
    const label = standardButtonLabels[index] || `B${index}`;
    const item = ensureRawButtonItem(index, label);
    const valueEl = item.querySelector("span");

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

  updateStick(leftStickDot, lx, ly);
  updateStick(rightStickDot, rx, ry);

  leftStickValue.textContent = `X: ${lx.toFixed(2)} / Y: ${ly.toFixed(2)}`;
  rightStickValue.textContent = `X: ${rx.toFixed(2)} / Y: ${ry.toFixed(2)}`;

  updateRawAxes(pad);

  updateStickTestData("left", lx, ly);
  updateStickTestData("right", rx, ry);
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

  barEl.style.width = `${percent}%`;
  valueEl.textContent = safeValue.toFixed(2);
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

  if (radius < CIRCULARITY_MIN_RADIUS) return;

  let angle = Math.atan2(y, x);

  if (angle < 0) {
    angle += Math.PI * 2;
  }

  const bin = Math.floor((angle / (Math.PI * 2)) * CIRCULARITY_BINS);
  const safeBin = Math.min(CIRCULARITY_BINS - 1, Math.max(0, bin));

  const data = circularityData[side];

  // Bins menyimpan radius maksimum per sudut untuk visual coverage.
  data.bins[safeBin] = Math.max(data.bins[safeBin], radius);
  data.samples += 1;

  // AVG error dihitung dari sampel gerakan dekat tepi luar,
  // tapi hasil baru ditampilkan setelah coverage cukup.
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

  // Jangan tampilkan hasil final sebelum putaran cukup penuh.
  if (filledBins.length < CIRCULARITY_BINS * 0.75) {
    return null;
  }

  const average = filledBins.reduce((sum, value) => sum + value, 0) / filledBins.length;
  const min = Math.min(...filledBins);
  const max = Math.max(...filledBins);

  if (average === 0) return null;

  // Stable circularity error:
  // Hitung dari peta radius maksimum per sudut/bin, bukan dari sampel waktu.
  // Dengan begitu hasil tidak berubah banyak hanya karena stick diputar cepat/pelan.
  const binErrors = filledBins.map((value) => Math.abs(value - 1));

  const rmsError =
    Math.sqrt(
      binErrors.reduce((sum, value) => sum + value * value, 0) /
      binErrors.length
    ) * 100;

  return {
    error: rmsError * CIRCULARITY_ERROR_SCALE,
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

function drawCircularityFill(canvas, data) {
  if (!canvas) return;

  const { ctx, width, height, dpr, centerX, centerY, radius } = getCanvasMetrics(canvas);
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

  // Visual circularity tidak boleh clamp semua nilai di atas 1 menjadi lingkaran penuh.
  // Jika max radius > 1, seluruh bentuk dinormalisasi ke max radius agar area yang
  // lebih pendek tetap terlihat "kempot" dan area overshoot jadi mencapai tepi.
  const maxRadius = Math.max(1, ...filledBins);
  const idealRadius = radius / maxRadius;

  ctx.save();

  // Lingkaran ideal radius 1.000 sebagai patokan halus.
  ctx.beginPath();
  ctx.arc(centerX, centerY, idealRadius, 0, Math.PI * 2);
  ctx.fillStyle = colorMixFallback(fillColor, 0.34);
  ctx.fill();

  // Coverage aktual per sektor.
  data.bins.forEach((radiusValue, index) => {
    if (radiusValue <= 0) return;

    const startAngle = index * step - step * 0.55;
    const endAngle = index * step + step * 0.55;
    const normalizedValue = Math.max(0, radiusValue / maxRadius);
    const sectorRadius = normalizedValue * radius;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, sectorRadius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  });

  // Area overshoot di luar radius ideal diberi warna lebih pekat agar bentuk tidak
  // terlihat selalu sempurna saat ada bagian yang melewati radius 1.
  data.bins.forEach((radiusValue, index) => {
    if (radiusValue <= 1) return;

    const startAngle = index * step - step * 0.55;
    const endAngle = index * step + step * 0.55;
    const outerRadius = Math.max(0, radiusValue / maxRadius) * radius;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
    ctx.arc(centerX, centerY, idealRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.28;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Outline aktual circularity.
  ctx.beginPath();

  let started = false;

  data.bins.forEach((radiusValue, index) => {
    if (radiusValue <= 0) return;

    const angle = index * step;
    const normalizedValue = Math.max(0, radiusValue / maxRadius);
    const sectorRadius = normalizedValue * radius;
    const x = centerX + Math.cos(angle) * sectorRadius;
    const y = centerY + Math.sin(angle) * sectorRadius;

    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  });

  if (started) {
    ctx.closePath();
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 1.4 * dpr;
    ctx.strokeStyle = accentColor;
    ctx.stroke();
  }

  // Garis ideal radius 1.000.
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1 * dpr;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(centerX, centerY, idealRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Titik sampel tepi.
  ctx.globalAlpha = 0.46;
  ctx.fillStyle = accentColor;

  data.bins.forEach((radiusValue, index) => {
    if (radiusValue <= 0) return;

    const angle = index * step;
    const normalizedValue = Math.max(0, radiusValue / maxRadius);
    const sectorRadius = normalizedValue * radius;
    const x = centerX + Math.cos(angle) * sectorRadius;
    const y = centerY + Math.sin(angle) * sectorRadius;

    ctx.beginPath();
    ctx.arc(x, y, 1.8 * dpr, 0, Math.PI * 2);
    ctx.fill();
  });

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

  const { ctx, width, height, dpr, centerX, centerY, radius } = getCanvasMetrics(canvas);

  ctx.clearRect(0, 0, width, height);

  if (!data.points.length) return;

  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();

  ctx.save();

  ctx.lineWidth = 2 * dpr;
  ctx.strokeStyle = accentColor;
  ctx.globalAlpha = 0.86;
  ctx.beginPath();

  data.points.forEach((point, index) => {
    const x = centerX + point.x * radius;
    const y = centerY + point.y * radius;

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
    const x = centerX + point.x * radius;
    const y = centerY + point.y * radius;

    ctx.beginPath();
    ctx.arc(x, y, 1.8 * dpr, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
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

  renderStickTest();
}

function clearButtonHistory() {
  seenButtons.clear();

  document.querySelectorAll(".pad-button.seen, .raw-button.seen").forEach((item) => {
    item.classList.remove("seen");
  });
}

function update(timestamp = 0) {
  requestAnimationFrame(update);

  if (timestamp - lastFrameTime < FRAME_INTERVAL) {
    return;
  }

  lastFrameTime = timestamp;

  if (timestamp - lastControlsRenderTime > CONTROLS_RENDER_INTERVAL) {
    renderGamepadControls();
    lastControlsRenderTime = timestamp;
  }

  updateGamepadTabActivity();
  autoSwitchGamepadByButtonPress();

  const pad = getActiveGamepad();

  if (!pad) {
    setEmptyState();
    return;
  }

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
  activeGamepadIndex = event.gamepad.index;
  renderGamepadControls(true);
  statusEl.textContent = "Gamepad terhubung";
});

window.addEventListener("gamepaddisconnected", (event) => {
  if (activeGamepadIndex === event.gamepad.index) {
    stopInfiniteVibration(true);
    activeGamepadIndex = null;
  }

  renderGamepadControls(true);
  setEmptyState("Gamepad terputus");
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopInfiniteVibration(true);
  }
});

window.addEventListener("pagehide", () => {
  stopInfiniteVibration(true);
});

setEmptyState();
renderGamepadControls(true);
setStickMode("off");
update();
