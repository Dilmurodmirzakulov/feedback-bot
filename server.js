require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Canteen Configuration ───────────────────────────────────────────────────
// Add or remove canteens here. The `id` is used in the QR code URL.
const CANTEENS = [
  { id: "main-canteen", name: "Main Canteen (Block A)" },
  { id: "library-canteen", name: "Library Canteen (Block B)" },
  { id: "sports-canteen", name: "Sports Complex Canteen" },
  { id: "student-canteen", name: "Student Center Canteen" },
];

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ─── API: Get canteen list (used by admin QR page) ────────────────────────────
app.get("/api/canteens", (req, res) => {
  res.json(CANTEENS);
});

// ─── API: Submit feedback ─────────────────────────────────────────────────────
app.post("/api/feedback", async (req, res) => {
  const { canteenId, type, message } = req.body;

  // Validation
  if (!canteenId || !type || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const validTypes = ["feedback", "complaint", "recommendation"];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid feedback type." });
  }

  if (message.trim().length < 5) {
    return res.status(400).json({ error: "Message is too short." });
  }

  if (message.length > 2000) {
    return res
      .status(400)
      .json({ error: "Message is too long (max 2000 characters)." });
  }

  const canteen = CANTEENS.find((c) => c.id === canteenId);
  if (!canteen) {
    return res.status(400).json({ error: "Unknown canteen." });
  }

  // Build Telegram message
  const typeConfig = {
    feedback: { emoji: "💬", label: "Feedback" },
    complaint: { emoji: "⚠️", label: "Complaint" },
    recommendation: { emoji: "💡", label: "Recommendation" },
  };

  const { emoji, label } = typeConfig[type];

  const now = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const text =
    `🏫 *Canteen:* ${escapeMarkdown(canteen.name)}\n` +
    `${emoji} *Type:* ${label}\n` +
    `──────────────────\n` +
    `📝 ${escapeMarkdown(message.trim())}\n` +
    `──────────────────\n` +
    `🕐 ${now}`;

  try {
    if (!BOT_TOKEN || BOT_TOKEN === "your_bot_token_here") {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured in .env");
    }
    if (!CHAT_ID || CHAT_ID === "your_chat_id_here") {
      throw new Error("TELEGRAM_CHAT_ID is not configured in .env");
    }

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          parse_mode: "Markdown",
        }),
      },
    );

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[Feedback Error]", err.message);
    res
      .status(500)
      .json({ error: "Could not deliver your feedback. Please try again." });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeMarkdown(text) {
  // Escape Markdown special characters for Telegram MarkdownV1
  return text.replace(/([_*[\]()])/g, "\\$1");
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅  Feedback Bot running at http://localhost:${PORT}`);
  console.log(
    `📋  Admin / QR Generator:  http://localhost:${PORT}/admin.html\n`,
  );
});
