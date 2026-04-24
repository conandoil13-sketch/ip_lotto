const IMAGE_SRC = "./80403852_2_600x600.JPG";
const COLOR_IMAGE_SRC = "./13925_13632_1213.jpg";
const LEADING_DIGITS = ["1", "1", "0"];
const TRAILING_DIGITS = ["1", "2"];
const FACE_SLOT_COUNT = 3;
const FACE_SLOT_PROBABILITIES = [1 / 3, 1 / 3, 1 / 4];
const COLOR_FACE_SLOT_PROBABILITIES = [2 / 3, 1 / 2, 1 / 3];
const GOLDEN_NUMBER_PROBABILITY = 1 / 2;
const TARGET_DIGIT_WEIGHT = 1.35;
const SCRATCH_COMPLETE_THRESHOLD = 0.52;
const SCRATCH_BRUSH_RATIO = 0.075;
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const DEBUG_WIN_PASSWORD = "Simba-110.12::ForceWin#2026!MoonRiver";
const DEBUG_SUPER_WIN_PASSWORD = "Simba-110.12::TripleColor#2026!Sunburst";
const SECRET_SPACE_COUNT = 10;
const MOBILE_SECRET_TAP_COUNT = 7;
const MOBILE_SECRET_TAP_WINDOW_MS = 2500;

const symbolGridElement = document.querySelector("#symbol-grid");
const scratchCanvas = document.querySelector("#scratch-canvas");
const scratchBoard = document.querySelector("#scratch-board");
const scratchProgressElement = document.querySelector("#scratch-progress");
const statusTextElement = document.querySelector("#status-text");
const resultSequenceElement = document.querySelector("#result-sequence");
const newTicketButton = document.querySelector("#new-ticket-button");
const revealAllButton = document.querySelector("#reveal-all-button");
const debugPanel = document.querySelector("#debug-panel");
const debugPasswordInput = document.querySelector("#debug-password");
const debugApplyButton = document.querySelector("#debug-apply-button");
const winModal = document.querySelector("#win-modal");
const winModalCloseButton = document.querySelector("#win-modal-close");
const superWinModal = document.querySelector("#super-win-modal");
const superWinModalCloseButton = document.querySelector("#super-win-modal-close");
const mobileSecretTrigger = document.querySelector("#mobile-secret-trigger");

const canvasContext = scratchCanvas.getContext("2d", { willReadFrequently: true });

let currentTicket = [];
let isScratching = false;
let lastPoint = null;
let scratchCompleted = false;
let progressRafId = 0;
let forceWinningTicket = false;
let forceSuperWinningTicket = false;
let secretSpaceProgress = 0;
let mobileSecretTapProgress = 0;
let mobileSecretTapTimeoutId = 0;
let winModalShown = false;
let superWinModalShown = false;

function pickDigit(preferredDigit = null) {
  if (!preferredDigit) {
    return DIGITS[Math.floor(Math.random() * DIGITS.length)];
  }

  const weightedDigits = DIGITS.map((digit) => ({
    digit,
    weight: digit === preferredDigit ? TARGET_DIGIT_WEIGHT : 1,
  }));
  const totalWeight = weightedDigits.reduce((sum, item) => sum + item.weight, 0);
  let randomValue = Math.random() * totalWeight;

  for (const item of weightedDigits) {
    randomValue -= item.weight;
    if (randomValue <= 0) {
      return item.digit;
    }
  }

  return preferredDigit;
}

function buildTicket() {
  if (forceSuperWinningTicket) {
    forceSuperWinningTicket = false;
    return buildWinningTicket({ forceAllColorFaces: true });
  }

  if (forceWinningTicket) {
    forceWinningTicket = false;
    return buildWinningTicket();
  }

  const leadingDigitSlots = LEADING_DIGITS.map((digit, index) => ({
    slotIndex: index,
    slotType: "digit",
    symbol: {
      id: `digit-${index}`,
      type: "number",
      label: pickDigit(digit),
    },
  }));

  const dotVisible = Math.random() < 0.5;
  const dotSlot = {
    slotIndex: leadingDigitSlots.length,
    slotType: "dot",
    symbol: {
      id: dotVisible ? "dot" : "dot-empty",
      type: "number",
      label: dotVisible ? "." : "",
    },
  };

  const trailingDigitSlots = TRAILING_DIGITS.map((digit, index) => ({
    slotIndex: leadingDigitSlots.length + 1 + index,
    slotType: "digit",
    symbol: {
      id: `digit-tail-${index}`,
      type: "number",
      label: pickDigit(digit),
    },
  }));

  const faceSlots = Array.from({ length: FACE_SLOT_COUNT }, (_, index) => {
    const hasFace = Math.random() < FACE_SLOT_PROBABILITIES[index];
    return {
      slotIndex: leadingDigitSlots.length + 1 + trailingDigitSlots.length + index,
      slotType: "face",
      symbol: hasFace
        ? { id: `face-${index}`, type: "image", label: "손심바" }
        : { id: `face-empty-${index}`, type: "blank", label: "" },
    };
  });

  const ticket = [...leadingDigitSlots, dotSlot, ...trailingDigitSlots, ...faceSlots];

  if (isWinningTicket(ticket)) {
    return applyWinningEnhancements(ticket);
  }

  return ticket;
}

function buildWinningTicket(options = {}) {
  const forceAllColorFaces = options.forceAllColorFaces === true;
  const hasGoldenNumbers = Math.random() < GOLDEN_NUMBER_PROBABILITY;
  const leadingDigitSlots = LEADING_DIGITS.map((digit, index) => ({
    slotIndex: index,
    slotType: "digit",
    symbol: {
      id: `win-digit-${index}`,
      type: "number",
      label: digit,
      golden: hasGoldenNumbers,
    },
  }));

  const dotSlot = {
    slotIndex: LEADING_DIGITS.length,
    slotType: "dot",
    symbol: {
      id: "win-dot",
      type: "number",
      label: ".",
      golden: hasGoldenNumbers,
    },
  };

  const trailingDigitSlots = TRAILING_DIGITS.map((digit, index) => ({
    slotIndex: LEADING_DIGITS.length + 1 + index,
    slotType: "digit",
    symbol: {
      id: `win-tail-${index}`,
      type: "number",
      label: digit,
      golden: hasGoldenNumbers,
    },
  }));

  const faceSlots = Array.from({ length: FACE_SLOT_COUNT }, (_, index) => {
    const isColorFace =
      forceAllColorFaces ||
      Math.random() < COLOR_FACE_SLOT_PROBABILITIES[index];
    return {
      slotIndex: LEADING_DIGITS.length + 1 + TRAILING_DIGITS.length + index,
      slotType: "face",
      symbol: {
        id: `win-face-${index}`,
        type: "image",
        label: isColorFace ? "컬러 손심바" : "손심바",
        variant: isColorFace ? "color" : "mono",
      },
    };
  });

  return [...leadingDigitSlots, dotSlot, ...trailingDigitSlots, ...faceSlots];
}

function applyWinningEnhancements(ticket, options = {}) {
  const forceAllColorFaces = options.forceAllColorFaces === true;
  const hasGoldenNumbers = Math.random() < GOLDEN_NUMBER_PROBABILITY;
  const faceStartIndex = LEADING_DIGITS.length + 1 + TRAILING_DIGITS.length;

  return ticket.map((item, index) => {
    if (item.slotType === "digit" || item.slotType === "dot") {
      return {
        ...item,
        symbol: {
          ...item.symbol,
          golden: hasGoldenNumbers,
        },
      };
    }

    if (index >= faceStartIndex && item.symbol.type === "image") {
      const faceIndex = index - faceStartIndex;
      const isColorFace =
        forceAllColorFaces ||
        Math.random() < COLOR_FACE_SLOT_PROBABILITIES[faceIndex];

      return {
        ...item,
        symbol: {
          ...item.symbol,
          label: isColorFace ? "컬러 손심바" : "손심바",
          variant: isColorFace ? "color" : "mono",
        },
      };
    }

    return item;
  });
}

function renderSymbol(symbol) {
  if (symbol.type === "image") {
    const imageSrc = symbol.variant === "color" ? COLOR_IMAGE_SRC : IMAGE_SRC;
    const altText = symbol.variant === "color" ? "컬러 손심바 얼굴" : "손심바 얼굴";
    return `<img class="image-face" src="${imageSrc}" alt="${altText}" />`;
  }

  if (symbol.type === "blank") {
    return `<span class="number-face empty-face">-</span>`;
  }

  return `<span class="number-face ${symbol.golden ? "golden-face" : ""}">${symbol.label || " "}</span>`;
}

function isSuperWinningTicket(ticket) {
  if (!isWinningTicket(ticket)) {
    return false;
  }

  return ticket
    .slice(LEADING_DIGITS.length + 1 + TRAILING_DIGITS.length)
    .every((item) => item.symbol.variant === "color");
}

function isWinningTicket(ticket) {
  const leadingMatch = LEADING_DIGITS.every(
    (digit, index) => ticket[index].symbol.label === digit
  );
  const dotMatch = ticket[LEADING_DIGITS.length].symbol.label === ".";
  const trailingMatch = TRAILING_DIGITS.every(
    (digit, index) =>
      ticket[LEADING_DIGITS.length + 1 + index].symbol.label === digit
  );
  const faceStartIndex = LEADING_DIGITS.length + 1 + TRAILING_DIGITS.length;
  const faceMatch = ticket
    .slice(faceStartIndex)
    .every((item) => item.symbol.type === "image");

  return leadingMatch && dotMatch && trailingMatch && faceMatch;
}

function updateResultSequence() {
  if (!scratchCompleted) {
    resultSequenceElement.textContent = "아직 전부 공개 전";
    return;
  }

  const digits = currentTicket
    .slice(0, LEADING_DIGITS.length)
    .map((item) => item.symbol.label)
    .join("");
  const dot = currentTicket[LEADING_DIGITS.length].symbol.label || "(점 없음)";
  const trailingDigits = currentTicket
    .slice(LEADING_DIGITS.length + 1, LEADING_DIGITS.length + 1 + TRAILING_DIGITS.length)
    .map((item) => item.symbol.label)
    .join("");
  const faces = currentTicket
    .slice(LEADING_DIGITS.length + 1 + TRAILING_DIGITS.length)
    .map((item) => {
      if (item.symbol.type !== "image") {
        return "빈칸";
      }

      return item.symbol.variant === "color" ? "컬러얼굴" : "얼굴";
    })
    .join(", ");

  resultSequenceElement.textContent = `${digits}${dot}${trailingDigits} | ${faces}`;
}

function updateStatus(progress = 0) {
  scratchProgressElement.textContent = `${Math.round(progress * 100)}% 제거됨`;
  statusTextElement.classList.remove("win", "lose");

  if (!scratchCompleted) {
    statusTextElement.textContent =
      progress > 0
        ? "계속 문질러 은박을 더 벗겨보세요."
        : "복권을 문질러 결과를 확인해보세요.";
    updateResultSequence();
    return;
  }

  if (isWinningTicket(currentTicket)) {
    if (isSuperWinningTicket(currentTicket)) {
      statusTextElement.textContent =
        "초초초 당첨입니다. 컬러 손심바 3개가 모두 등장했습니다.";
      statusTextElement.classList.add("win");
      openSuperWinModal();
      updateResultSequence();
      return;
    }

    statusTextElement.textContent =
      "당첨입니다. 숫자 11012, 점, 얼굴 3개가 모두 맞았습니다.";
    statusTextElement.classList.add("win");
    openWinModal();
  } else {
    statusTextElement.textContent =
      "미당첨입니다. 숫자 5칸, 점 1칸, 얼굴 3칸이 전부 목표와 일치해야 합니다.";
    statusTextElement.classList.add("lose");
  }

  updateResultSequence();
}

function openWinModal() {
  if (winModalShown) {
    return;
  }

  winModalShown = true;
  winModal.hidden = false;
  winModal.setAttribute("aria-hidden", "false");
}

function closeWinModal() {
  winModalShown = false;
  winModal.hidden = true;
  winModal.setAttribute("aria-hidden", "true");
}

function openSuperWinModal() {
  if (superWinModalShown) {
    return;
  }

  superWinModalShown = true;
  superWinModal.hidden = false;
  superWinModal.setAttribute("aria-hidden", "false");
}

function closeSuperWinModal() {
  superWinModalShown = false;
  superWinModal.hidden = true;
  superWinModal.setAttribute("aria-hidden", "true");
}

function renderTicket() {
  symbolGridElement.innerHTML = currentTicket
    .map(
      (item) => `
        <div class="symbol-cell" data-index="${item.slotIndex}" data-slot-type="${item.slotType}">
          ${renderSymbol(item.symbol)}
        </div>
      `
    )
    .join("");
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = scratchBoard.getBoundingClientRect();

  scratchCanvas.width = Math.round(rect.width * ratio);
  scratchCanvas.height = Math.round(rect.height * ratio);
  scratchCanvas.style.width = `${rect.width}px`;
  scratchCanvas.style.height = `${rect.height}px`;
  canvasContext.setTransform(1, 0, 0, 1, 0, 0);
  canvasContext.scale(ratio, ratio);
  drawScratchSurface(rect.width, rect.height);
}

function drawScratchSurface(width, height) {
  const silverGradient = canvasContext.createLinearGradient(0, 0, width, height);
  silverGradient.addColorStop(0, "#edf2f7");
  silverGradient.addColorStop(0.45, "#adb6c0");
  silverGradient.addColorStop(1, "#dbe1e8");

  canvasContext.globalCompositeOperation = "source-over";
  canvasContext.clearRect(0, 0, width, height);
  canvasContext.fillStyle = silverGradient;
  canvasContext.fillRect(0, 0, width, height);

  canvasContext.save();
  canvasContext.globalAlpha = 0.24;
  for (let y = -height; y < height * 2; y += 18) {
    canvasContext.beginPath();
    canvasContext.moveTo(0, y);
    canvasContext.lineTo(width, y + height * 0.2);
    canvasContext.lineWidth = 7;
    canvasContext.strokeStyle = "#ffffff";
    canvasContext.stroke();
  }
  canvasContext.restore();

  canvasContext.fillStyle = "rgba(34, 41, 50, 0.72)";
  canvasContext.font = `900 ${Math.max(20, width * 0.035)}px Trebuchet MS`;
  canvasContext.textAlign = "center";
  canvasContext.fillText("SCRATCH HERE", width / 2, height / 2);
}

function getLocalPoint(event) {
  const rect = scratchCanvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function eraseAt(point, fromPoint = null) {
  const rect = scratchCanvas.getBoundingClientRect();
  const brushRadius = Math.max(18, rect.width * SCRATCH_BRUSH_RATIO);

  canvasContext.save();
  canvasContext.globalCompositeOperation = "destination-out";
  canvasContext.lineCap = "round";
  canvasContext.lineJoin = "round";
  canvasContext.lineWidth = brushRadius * 2;

  canvasContext.beginPath();
  if (fromPoint) {
    canvasContext.moveTo(fromPoint.x, fromPoint.y);
    canvasContext.lineTo(point.x, point.y);
    canvasContext.stroke();
  } else {
    canvasContext.arc(point.x, point.y, brushRadius, 0, Math.PI * 2);
    canvasContext.fill();
  }
  canvasContext.restore();
}

function calculateScratchProgress() {
  const sampleWidth = Math.max(1, Math.floor(scratchCanvas.width / 4));
  const sampleHeight = Math.max(1, Math.floor(scratchCanvas.height / 4));
  const pixels = canvasContext.getImageData(0, 0, sampleWidth, sampleHeight).data;

  let transparentPixels = 0;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 140) {
      transparentPixels += 1;
    }
  }

  return transparentPixels / (sampleWidth * sampleHeight);
}

function queueProgressCheck() {
  if (progressRafId) {
    return;
  }

  progressRafId = window.requestAnimationFrame(() => {
    progressRafId = 0;
    const progress = calculateScratchProgress();

    if (progress >= SCRATCH_COMPLETE_THRESHOLD && !scratchCompleted) {
      revealAll();
      return;
    }

    updateStatus(progress);
  });
}

function revealAll() {
  scratchCompleted = true;
  scratchCanvas.style.opacity = "0";
  scratchCanvas.style.pointerEvents = "none";
  updateStatus(1);
}

function resetScratchSurface() {
  scratchCompleted = false;
  closeWinModal();
  closeSuperWinModal();
  scratchCanvas.style.opacity = "1";
  scratchCanvas.style.pointerEvents = "auto";
  resizeCanvas();
  updateStatus(0);
}

function createNewTicket() {
  currentTicket = buildTicket();
  renderTicket();
  resetScratchSurface();
}

scratchCanvas.addEventListener("pointerdown", (event) => {
  if (scratchCompleted) {
    return;
  }

  isScratching = true;
  lastPoint = getLocalPoint(event);
  scratchCanvas.setPointerCapture(event.pointerId);
  scratchCanvas.classList.add("is-scratching");
  eraseAt(lastPoint);
  queueProgressCheck();
});

scratchCanvas.addEventListener("pointermove", (event) => {
  if (!isScratching || scratchCompleted) {
    return;
  }

  const point = getLocalPoint(event);
  eraseAt(point, lastPoint);
  lastPoint = point;
  queueProgressCheck();
});

function stopScratching(event) {
  if (!isScratching) {
    return;
  }

  isScratching = false;
  lastPoint = null;
  scratchCanvas.classList.remove("is-scratching");
  if (
    typeof event.pointerId === "number" &&
    scratchCanvas.hasPointerCapture(event.pointerId)
  ) {
    scratchCanvas.releasePointerCapture(event.pointerId);
  }
  queueProgressCheck();
}

scratchCanvas.addEventListener("pointerup", stopScratching);
scratchCanvas.addEventListener("pointercancel", stopScratching);
scratchCanvas.addEventListener("pointerleave", (event) => {
  if (event.buttons === 0) {
    stopScratching(event);
  }
});

newTicketButton.addEventListener("click", () => {
  createNewTicket();
});

revealAllButton.addEventListener("click", () => {
  revealAll();
});

function showDebugPanel() {
  debugPanel.hidden = false;
  statusTextElement.classList.remove("lose");
  statusTextElement.textContent = "숨겨진 테스트 암호창이 열렸습니다.";
  window.setTimeout(() => {
    debugPasswordInput.focus();
  }, 0);
}

function resetMobileSecretTapProgress() {
  mobileSecretTapProgress = 0;
  if (mobileSecretTapTimeoutId) {
    window.clearTimeout(mobileSecretTapTimeoutId);
    mobileSecretTapTimeoutId = 0;
  }
}

function registerMobileSecretTap() {
  mobileSecretTapProgress += 1;

  if (mobileSecretTapTimeoutId) {
    window.clearTimeout(mobileSecretTapTimeoutId);
  }

  mobileSecretTapTimeoutId = window.setTimeout(() => {
    resetMobileSecretTapProgress();
  }, MOBILE_SECRET_TAP_WINDOW_MS);

  if (mobileSecretTapProgress >= MOBILE_SECRET_TAP_COUNT) {
    resetMobileSecretTapProgress();
    showDebugPanel();
  }
}

debugApplyButton.addEventListener("click", () => {
  if (
    debugPasswordInput.value !== DEBUG_WIN_PASSWORD &&
    debugPasswordInput.value !== DEBUG_SUPER_WIN_PASSWORD
  ) {
    statusTextElement.classList.remove("win");
    statusTextElement.classList.add("lose");
    statusTextElement.textContent = "암호가 일치하지 않습니다.";
    return;
  }

  statusTextElement.classList.remove("lose");
  if (debugPasswordInput.value === DEBUG_SUPER_WIN_PASSWORD) {
    statusTextElement.textContent =
      "히든 컬러 암호 확인됨. 이번 복권은 3컬러 손심바 당첨으로 생성됩니다.";
    forceSuperWinningTicket = true;
  } else {
    statusTextElement.textContent =
      "테스트 암호 확인됨. 이번 복권은 당첨 조합으로 생성됩니다.";
    forceWinningTicket = true;
  }
  debugPasswordInput.value = "";
  createNewTicket();
});

debugPasswordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    debugApplyButton.click();
  }
});

winModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeWinModal === "true") {
    closeWinModal();
  }
});

winModalCloseButton.addEventListener("click", () => {
  closeWinModal();
});

superWinModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeSuperWinModal === "true") {
    closeSuperWinModal();
  }
});

superWinModalCloseButton.addEventListener("click", () => {
  closeSuperWinModal();
});

mobileSecretTrigger.addEventListener("click", () => {
  registerMobileSecretTap();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !superWinModal.hidden) {
    closeSuperWinModal();
    return;
  }

  if (event.key === "Escape" && !winModal.hidden) {
    closeWinModal();
    return;
  }

  if (event.code !== "Space") {
    secretSpaceProgress = 0;
    return;
  }

  if (event.target === debugPasswordInput) {
    return;
  }

  event.preventDefault();
  secretSpaceProgress += 1;

  if (secretSpaceProgress >= SECRET_SPACE_COUNT) {
    secretSpaceProgress = 0;
    showDebugPanel();
  }
});

window.addEventListener("resize", () => {
  if (!currentTicket.length) {
    return;
  }

  const hadCompleted = scratchCompleted;
  resizeCanvas();
  if (hadCompleted) {
    revealAll();
  }
});

createNewTicket();
