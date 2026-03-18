// ─── State ────────────────────────────────────────────────────────────────────
let canteenId = null;
let selectedType = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const loading = document.getElementById("loading");
const errorScreen = document.getElementById("error-screen");
const formScreen = document.getElementById("form-screen");
const successScreen = document.getElementById("success-screen");
const canteenName = document.getElementById("canteen-name");
const form = document.getElementById("feedback-form");
const messageEl = document.getElementById("message");
const charCount = document.getElementById("char-count");
const typeError = document.getElementById("type-error");
const messageError = document.getElementById("message-error");
const submitBtn = document.getElementById("submit-btn");
const btnLabel = document.getElementById("btn-label");
const btnSpinner = document.getElementById("btn-spinner");
const typeCards = document.querySelectorAll(".type-card");

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  // Read canteen ID from URL: ?canteen=main-canteen
  const params = new URLSearchParams(window.location.search);
  canteenId = params.get("canteen");

  if (!canteenId) {
    showScreen("error");
    return;
  }

  try {
    const res = await fetch("/api/canteens");
    const canteens = await res.json();
    const canteen = canteens.find((c) => c.id === canteenId);

    if (!canteen) {
      showScreen("error");
      return;
    }

    canteenName.textContent = canteen.name;
    showScreen("form");
  } catch {
    showScreen("error");
  }
}

// ─── Show/hide screens ────────────────────────────────────────────────────────
function showScreen(name) {
  loading.classList.add("hidden");
  errorScreen.classList.add("hidden");
  formScreen.classList.add("hidden");
  successScreen.classList.add("hidden");

  if (name === "error") errorScreen.classList.remove("hidden");
  if (name === "form") formScreen.classList.remove("hidden");
  if (name === "success") successScreen.classList.remove("hidden");
}

// ─── Type card selection ──────────────────────────────────────────────────────
typeCards.forEach((card) => {
  card.addEventListener("click", () => {
    typeCards.forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    card.querySelector('input[type="radio"]').checked = true;
    selectedType = card.dataset.type;
    typeError.classList.add("hidden");
  });
});

// ─── Character counter ────────────────────────────────────────────────────────
messageEl.addEventListener("input", () => {
  const len = messageEl.value.length;
  charCount.textContent = `${len} / 2000`;
  if (len > 0) messageError.classList.add("hidden");
  messageEl.classList.toggle("error", len > 0 && len < 5);
});

// ─── Form submit ──────────────────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  let valid = true;

  // Validate type
  if (!selectedType) {
    typeError.classList.remove("hidden");
    valid = false;
  }

  // Validate message
  const message = messageEl.value.trim();
  if (message.length < 5) {
    messageError.classList.remove("hidden");
    messageEl.classList.add("error");
    valid = false;
  }

  if (!valid) return;

  // Set loading state
  setSubmitting(true);

  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canteenId, type: selectedType, message }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Submission failed.");
    }

    showScreen("success");
  } catch (err) {
    alert(`Error: ${err.message}`);
    setSubmitting(false);
  }
});

// ─── Reset form (after success → "Submit Another") ───────────────────────────
function resetForm() {
  form.reset();
  selectedType = null;
  typeCards.forEach((c) => c.classList.remove("selected"));
  charCount.textContent = "0 / 2000";
  messageEl.classList.remove("error");
  setSubmitting(false);
  showScreen("form");
}

// ─── Toggle submit button loading state ──────────────────────────────────────
function setSubmitting(isSubmitting) {
  submitBtn.disabled = isSubmitting;
  btnLabel.textContent = isSubmitting ? "Sending…" : "Send Feedback";
  btnSpinner.classList.toggle("hidden", !isSubmitting);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
