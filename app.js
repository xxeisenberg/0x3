const $ = (id) => document.getElementById(id);

const glitchBtn = $("btn-corrupt");
const resetBtn = $("btn-reset");
const exportBtn = $("btn-download");
const uploadBtn = $("btn-upload");
const fileInput = $("file-input");
const hexBox = $("hex-container");
const preview = $("preview-img");
const dropzone = $("dropzone");
const pumpkinIcon = $("pumpkin-icon");
const sampleBtns = document.querySelectorAll(".sample-btn[data-src]");

const glitchSounds = [new Audio("glitch1.mp3"), new Audio("glitch2.mp3")];

let fileName = "glitch.jpg";
let orig = null;
let buf = null;
let lastValid = null;
let dirty = new Set();
let activeUrl = null;

function playRandomGlitch(isTinyClick = false) {
  const sound = glitchSounds[Math.floor(Math.random() * glitchSounds.length)];
  if (!sound) return;

  sound.currentTime = 0;
  sound.playbackRate = isTinyClick
    ? 1.7 + Math.random() * 0.4
    : 0.85 + Math.random() * 0.3;
  sound.volume = isTinyClick ? 0.3 : 0.85;

  sound.play().catch(() => {});
}

function twitchPumpkin() {
  if (!pumpkinIcon) return;
  pumpkinIcon.classList.remove("twitch");
  void pumpkinIcon.offsetWidth;
  pumpkinIcon.classList.add("twitch");
  setTimeout(() => pumpkinIcon.classList.remove("twitch"), 120);
}

async function loadFromBlobOrFile(blob, name = "sample.jpg") {
  fileName = name.replace(/\.[^/.]+$/, "") + ".jpg";

  const jpegBlob = await convertToJpeg(blob);
  const raw = await jpegBlob.arrayBuffer();

  orig = new Uint8Array(raw);
  buf = new Uint8Array(orig);
  lastValid = new Uint8Array(orig);
  dirty.clear();

  if (dropzone) dropzone.classList.add("hidden");

  renderHex(0, 512);
  syncPreview();
}

async function loadSampleUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Sample missing");
    const blob = await res.blob();
    const cleanName = url.split("/").pop() || "sample.jpg";
    await loadFromBlobOrFile(blob, cleanName);
  } catch (err) {
    console.warn("Could not load sample image:", url);
  }
}

sampleBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    sampleBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    loadSampleUrl(btn.dataset.src);
  });
});

uploadBtn.onclick = () => fileInput.click();
dropzone.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  sampleBtns.forEach((b) => b.classList.remove("active"));
  loadFromBlobOrFile(file, file.name);
};

["dragenter", "dragover", "dragleave", "drop"].forEach((ev) => {
  window.addEventListener(ev, (e) => e.preventDefault());
});

window.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (!file) return;
  sampleBtns.forEach((b) => b.classList.remove("active"));
  loadFromBlobOrFile(file, file.name);
});

function convertToJpeg(file) {
  return new Promise((resolve) => {
    if (file.type === "image/jpeg") {
      resolve(file);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const cvs = document.createElement("canvas");
      cvs.width = img.width;
      cvs.height = img.height;
      const ctx = cvs.getContext("2d");
      ctx.drawImage(img, 0, 0);
      cvs.toBlob(resolve, "image/jpeg", 0.92);
    };
    img.src = URL.createObjectURL(file);
  });
}

function getSafeOffset() {
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xda) {
      const len = (buf[i + 2] << 8) | buf[i + 3];
      return i + 2 + len + 32;
    }
  }
  return 600;
}

function syncPreview() {
  if (!buf) return;

  const blob = new Blob([buf], { type: "image/jpeg" });
  const nextUrl = URL.createObjectURL(blob);
  const img = new Image();

  img.onload = () => {
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = nextUrl;
    preview.src = nextUrl;
    lastValid.set(buf);
  };

  img.onerror = () => {
    URL.revokeObjectURL(nextUrl);
    buf.set(lastValid);
    renderHex(0, 512);
  };

  img.src = nextUrl;
}

function renderHex(offset = 0, len = 512) {
  if (!buf || !hexBox) return;

  const start = offset === 0 ? getSafeOffset() : offset;
  const max = Math.min(start + len, buf.length);
  const rows = [];

  for (let i = start; i < max; i += 16) {
    const rowAddr = i.toString(16).padStart(8, "0").toUpperCase();
    let hexParts = [];
    let asciiParts = [];

    for (let j = 0; j < 16; j++) {
      const idx = i + j;
      if (idx < max) {
        const val = buf[idx];
        const hex = val.toString(16).padStart(2, "0").toUpperCase();
        const isModified = dirty.has(idx);

        hexParts.push(
          `<span class="byte${isModified ? " changed" : ""}" data-idx="${idx}">${hex}</span>`,
        );

        const ch = val >= 32 && val <= 126 ? String.fromCharCode(val) : "·";
        asciiParts.push(ch === " " ? "&nbsp;" : ch.replace(/</g, "&lt;"));
      } else {
        hexParts.push('<span class="byte empty">  </span>');
      }
    }

    rows.push(`
      <div class="row">
        <span class="offset">${rowAddr}</span>
        <span class="bytes">${hexParts.join(" ")}</span>
        <span class="ascii">${asciiParts.join("")}</span>
      </div>
    `);
  }

  hexBox.innerHTML = rows.join("");
}

function corrupt(count = 8) {
  if (!buf) return;

  playRandomGlitch(false);
  twitchPumpkin();

  const start = getSafeOffset();
  const end = buf.length - 64;
  if (end <= start) return;

  for (let n = 0; n < count; n++) {
    const rangeEnd = n < count / 2 ? Math.min(start + 512, end) : end;
    const target = start + Math.floor(Math.random() * (rangeEnd - start));

    if (
      buf[target] === 0xff ||
      buf[target - 1] === 0xff ||
      buf[target + 1] === 0xff
    ) {
      continue;
    }

    let val = buf[target] ^ (1 << Math.floor(Math.random() * 8));
    if (val === 0xff) val = 0xfe;
    if (val === 0x00) val = 0x01;

    buf[target] = val;
    dirty.add(target);
  }

  renderHex(0, 512);
  syncPreview();
}

hexBox.addEventListener("click", (e) => {
  const cell = e.target.closest(".byte");
  if (!cell || !cell.dataset.idx) return;

  playRandomGlitch(true);
  twitchPumpkin();

  const idx = Number(cell.dataset.idx);
  let next = (buf[idx] + 1) & 0xff;
  if (next === 0xff) next = 0x00;

  buf[idx] = next;
  dirty.add(idx);

  renderHex(0, 512);
  syncPreview();
});

glitchBtn.onclick = () => corrupt(8);

resetBtn.onclick = () => {
  if (!orig) return;
  buf.set(orig);
  lastValid.set(orig);
  dirty.clear();
  renderHex(0, 512);
  syncPreview();
};

exportBtn.onclick = () => {
  if (!buf) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buf], { type: "image/jpeg" }));
  a.download = `corrupted_${fileName}`;
  a.click();
  URL.revokeObjectURL(a.href);
};

window.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

  if (e.code === "Space") {
    e.preventDefault();
    corrupt(8);
  } else if (e.key === "r" || e.key === "R") {
    resetBtn.click();
  }
});

if (sampleBtns.length > 0) {
  loadSampleUrl(sampleBtns[0].dataset.src);
}
