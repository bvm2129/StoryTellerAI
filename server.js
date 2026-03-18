/**
 * Tales of Wisdom — Optional Express Server
 *
 * The story generation is now handled DIRECTLY in the React app
 * via the Anthropic API (no server needed for that).
 *
 * This server is ONLY needed if you want to add Murf AI audio
 * as an upgrade later. To use it:
 *   1. Fill in your MURF_KEY below
 *   2. Run:  node server.js
 *   3. In tales_of_wisdom.jsx, call  POST /api/audio  after story generation
 */

const express = require("express");
const cors    = require("cors");
const fetch   = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

// ── Keys ──────────────────────────────────────────────────────────────────────
const MURF_KEY = "YOUR_MURF_KEY_HERE";

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Tales of Wisdom audio server" });
});

// ── Generate Audio via Murf AI ────────────────────────────────────────────────
// Supported English-US voices (Falcon model):
//   en-US-Alina   (Narrator, female, warm)
//   en-US-Caleb   (Child, male)
//   en-US-Amara   (Mother, female)
//   en-US-Ronnie  (Grandfather, male)
//   en-US-Ken     (Adult male)
//   en-US-Daisy   (Adult female)
//
// POST body: { text: string, voiceId: string }
// Returns:   { audioFile: string }  — a URL to the MP3
app.post("/api/audio", async (req, res) => {
  const { text, voiceId = "en-US-Alina" } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  try {
    const response = await fetch("https://api.murf.ai/v1/speech/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": MURF_KEY,
      },
      body: JSON.stringify({
        voiceId,
        text,
        format:     "MP3",
        sampleRate: 44100,
        speed:      -5,    // slightly slower = storytelling pace
        pitch:      0,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Murf error");
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () =>
  console.log("✦ Tales of Wisdom audio server → http://localhost:3001")
);
