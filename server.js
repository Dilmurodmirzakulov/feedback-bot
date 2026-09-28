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
  { id: "tobb-canteen", name: "TOBB Building Canteen" },
];

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

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const text = [
    `🏫 Canteen: ${canteen.name}`,
    `${emoji} Type: ${label}`,
    "------------------",
    `📝 ${message.trim()}`,
    "------------------",
    `🕐 ${now}`,
  ].join("\n");

  try {
    if (!botToken || botToken === "your_bot_token_here") {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured in .env");
    }
    if (!chatId || chatId === "your_chat_id_here") {
      throw new Error("TELEGRAM_CHAT_ID is not configured in .env");
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      },
    );

    const rawResponse = await response.text();
    const data = rawResponse ? JSON.parse(rawResponse) : {};

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

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n✅  Feedback Bot running at http://localhost:${PORT}`);
    console.log(
      `📋  Admin / QR Generator:  http://localhost:${PORT}/admin.html\n`,
    );
  });
}

module.exports = app;
