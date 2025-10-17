// server.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";   
import mongoose from "mongoose";
import { agenda, startAgenda } from "./agenda.js";
import { defineSendQuoteJob } from "./jobs/sendQuote.js";

dotenv.config();

const app = express();
app.use(cors());      
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/dailyquotes";

// 🔹 Step 1: Initialize MongoDB + Agenda properly
(async function init() {
  try {
    // 1️⃣ Connect MongoDB first
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    // 2️⃣ Define job AFTER Mongo connects
    defineSendQuoteJob(agenda);

    // 3️⃣ Start Agenda
    await startAgenda();

    // 4️⃣ Verify Agenda DB connection
    console.log(
      "🔗 Agenda DB ready:",
      agenda._mdb ? "✅ Connected" : "❌ Not connected"
    );

    console.log("🕒 Scheduler is running and ready for jobs");
  } catch (err) {
    console.error("❌ Error initializing app:", err);
    process.exit(1);
  }
})();

// 🔹 Step 2: API route — subscribe a user
app.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ error: "Email is required" });

  try {
    // Cancel old jobs for that email
    await agenda.cancel({ name: "send daily quote", "data.to": email });

    // Cron & timezone
    const cron = process.env.QUOTE_SCHEDULE_CRON || "25 0 * * *"; // 12:15 AM
    const tz = process.env.QUOTE_TIMEZONE || "Asia/Kolkata";

    // Create and save repeating job (ORDER MATTERS)
    const job = agenda.create("send daily quote", { to: email });
    job.repeatEvery(cron, { timezone: tz, skipImmediate: true });
    await job.save();

    console.log(`📅 Daily quote scheduled for ${email} at 12:15 AM (IST)`);

    res.json({
      message: `✅ Daily quote scheduled for ${email} at 12:15 AM (IST)`,
    });
  } catch (error) {
    console.error("❌ Error scheduling job:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔹 Step 3: Manual test endpoint (send now)
app.get("/send-now", async (req, res) => {
  try {
    await agenda.now("send daily quote", { to: "shahul77235@gmail.com" });
    res.send("✅ Sent quote immediately!");
  } catch (err) {
    console.error("❌ Error sending now:", err);
    res.status(500).send("Failed to send quote");
  }
});

// 🔹 Step 4: Simple health check
app.get("/", (req, res) => res.send("🌞 Daily Quote Bot is running"));

app.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`);
});
