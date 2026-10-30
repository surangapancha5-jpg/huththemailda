require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const BOT_API_KEY = process.env.BOT_API_KEY;

const botSchema = new mongoose.Schema({
  botId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  status: { type: String, enum: ["online", "offline"], default: "offline" },
  lastSeen: { type: Date, default: null },
  messages: { type: Number, default: 0 },
  users: { type: Number, default: 0 },
  platform: { type: String, default: "WhatsApp" }
}, { timestamps: true });

const Bot = mongoose.model("Bot", botSchema);

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !JWT_SECRET) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

function requireBotKey(req, res, next) {
  if (!BOT_API_KEY || req.headers["x-api-key"] !== BOT_API_KEY) {
    return res.status(401).json({ error: "Invalid bot API key" });
  }
  next();
}

async function emitStats() {
  const bots = await Bot.find().lean();
  const online = bots.filter(b => b.status === "online").length;
  io.emit("dashboard:update", {
    totalBots: bots.length,
    onlineBots: online,
    offlineBots: bots.length - online,
    totalMessages: bots.reduce((sum, b) => sum + (b.messages || 0), 0),
    totalUsers: bots.reduce((sum, b) => sum + (b.users || 0), 0),
    bots
  });
}

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !JWT_SECRET) {
      return res.status(500).json({ error: "Set ADMIN_USERNAME, ADMIN_PASSWORD and JWT_SECRET in .env" });
    }
    const validUser = username === process.env.ADMIN_USERNAME;
    const stored = process.env.ADMIN_PASSWORD;
    const validPassword = stored.startsWith("$2") ?
      await bcrypt.compare(String(password || ""), stored) :
      String(password || "") === stored;

    if (!validUser || !validPassword) return res.status(401).json({ error: "Incorrect username or password" });
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "12h" });
    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/dashboard", requireAdmin, async (req, res) => {
  try {
    const bots = await Bot.find().sort({ updatedAt: -1 }).lean();
    const onlineBots = bots.filter(b => b.status === "online").length;
    res.json({
      totalBots: bots.length,
      onlineBots,
      offlineBots: bots.length - onlineBots,
      totalMessages: bots.reduce((sum, b) => sum + (b.messages || 0), 0),
      totalUsers: bots.reduce((sum, b) => sum + (b.users || 0), 0),
      bots
    });
  } catch {
    res.status(500).json({ error: "Could not load dashboard" });
  }
});

app.post("/api/bots/heartbeat", requireBotKey, async (req, res) => {
  try {
    const { botId, name, messages, users, platform } = req.body || {};
    if (!botId || !name) return res.status(400).json({ error: "botId and name are required" });

    const bot = await Bot.findOneAndUpdate(
      { botId: String(botId) },
      {
        $set: {
          name: String(name).slice(0, 80),
          status: "online",
          lastSeen: new Date(),
          messages: Math.max(0, Number(messages) || 0),
          users: Math.max(0, Number(users) || 0),
          platform: String(platform || "WhatsApp").slice(0, 40)
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await emitStats();
    res.json({ success: true, bot });
  } catch (err) {
    console.error("Heartbeat error:", err.message);
    res.status(500).json({ error: "Heartbeat failed" });
  }
});

app.delete("/api/bots/:botId", requireAdmin, async (req, res) => {
  try {
    await Bot.deleteOne({ botId: req.params.botId });
    await emitStats();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Could not delete bot" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

io.on("connection", socket => {
  socket.emit("connected", { ok: true });
});

async function markStaleBotsOffline() {
  const cutoff = new Date(Date.now() - 90 * 1000);
  const result = await Bot.updateMany(
    { status: "online", lastSeen: { $lt: cutoff } },
    { $set: { status: "offline" } }
  );
  if (result.modifiedCount) await emitStats();
}

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI. Copy .env.example to .env and configure it.");
    process.exit(1);
  }
  if (!JWT_SECRET || !BOT_API_KEY) {
    console.error("Missing JWT_SECRET or BOT_API_KEY in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");
  setInterval(() => markStaleBotsOffline().catch(console.error), 15000);

  server.listen(PORT, () => console.log(`ZANTA-XMD dashboard running on port ${PORT}`));
}

start().catch(err => {
  console.error("Startup error:", err.message);
  process.exit(1);
});
