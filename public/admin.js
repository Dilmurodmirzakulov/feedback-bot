const QR_SIZE = 200; // px

// ─── Generate all QR codes ────────────────────────────────────────────────────
async function generateAll() {
  const baseUrlInput = document.getElementById("base-url");
  const grid = document.getElementById("qr-grid");

  let baseUrl = baseUrlInput.value.trim().replace(/\/$/, "");

  if (!baseUrl) {
    alert("Please enter the base URL of your feedback app.");
    baseUrlInput.focus();
    return;
  }

  // Validate URL format
  try {
    new URL(baseUrl);
  } catch {
    alert("Please enter a valid URL (including http:// or https://).");
    return;
  }

  // Clear previous QR codes
  grid.innerHTML = "";

  // Fetch canteen list from the server
  let canteens;
  try {
    const res = await fetch("/api/canteens");
    canteens = await res.json();
  } catch {
    alert("Could not load cantees. Make sure the server is running.");
    return;
  }

  // Build a card + QR code for each canteen
  canteens.forEach((canteen) => {
    const url = `${baseUrl}/?canteen=${encodeURIComponent(canteen.id)}`;

    // Card container
    const card = document.createElement("div");
    card.className = "qr-card";

    // QR canvas wrapper
    const qrWrapper = document.createElement("div");
    qrWrapper.id = `qr-${canteen.id}`;

    // Canteen label
    const label = document.createElement("p");
    label.className = "qr-canteen-name";
    label.textContent = canteen.name;

    // URL hint
    const urlHint = document.createElement("p");
    urlHint.className = "qr-url";
    urlHint.textContent = url;

    // Download button
    const dlBtn = document.createElement("button");
    dlBtn.className = "btn-download";
    dlBtn.textContent = "⬇ Download PNG";
    dlBtn.addEventListener("click", () => downloadQR(canteen.id, canteen.name));

    card.appendChild(qrWrapper);
    card.appendChild(label);
    card.appendChild(urlHint);
    card.appendChild(dlBtn);
    grid.appendChild(card);

    // Render QR code into the wrapper
    // eslint-disable-next-line no-new
    new QRCode(qrWrapper, {
      text: url,
      width: QR_SIZE,
      height: QR_SIZE,
      colorDark: "#1e293b",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  });
}

// ─── Download a single QR code as PNG ────────────────────────────────────────
function downloadQR(canteenId, canteenName) {
  const wrapper = document.getElementById(`qr-${canteenId}`);
  if (!wrapper) return;

  // QRCode.js renders either a <canvas> or an <img> depending on the browser
  const canvas = wrapper.querySelector("canvas");
  const img = wrapper.querySelector("img");

  if (canvas) {
    triggerDownload(canvas.toDataURL("image/png"), canteenName);
  } else if (img) {
    triggerDownload(img.src, canteenName);
  }
}

function triggerDownload(dataUrl, name) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `QR-${name.replace(/[^a-z0-9]/gi, "-")}.png`;
  a.click();
}

// ─── Auto-populate base URL from current host ─────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("base-url");
  input.value = `${location.protocol}//${location.host}`;
});
