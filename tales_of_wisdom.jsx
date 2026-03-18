import { useState, useRef, useEffect } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Story generation calls the Anthropic API directly via the built-in proxy
// Audio is handled by the browser's Web Speech API (works everywhere, no key needed)

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const SETTINGS = [
  { id: "jungle",   emoji: "🌿", label: "Jungle"    },
  { id: "kingdom",  emoji: "👑", label: "Kingdom"   },
  { id: "ocean",    emoji: "🌊", label: "Ocean"     },
  { id: "village",  emoji: "🏡", label: "Village"   },
  { id: "sky",      emoji: "☁️", label: "Sky Realm" },
  { id: "desert",   emoji: "🏜️", label: "Desert"    },
];

const AGES = [
  { id: "kids",   label: "Kids",   sub: "5–8 yrs",  words: 160 },
  { id: "teens",  label: "Teens",  sub: "9–14 yrs", words: 260 },
  { id: "adults", label: "Adults", sub: "15+",      words: 360 },
];

const LENGTHS = [
  { id: "short",  label: "Quick Tale", minutes: "~1 min", words: 120 },
  { id: "medium", label: "Full Story", minutes: "~2 min", words: 240 },
  { id: "long",   label: "Epic Tale",  minutes: "~3 min", words: 380 },
];

const INSPIRE_PROMPTS = [
  "A tiny ant who dreams of touching the sky",
  "A greedy king who loses everything he loves",
  "Two rival monkeys who must save each other",
  "A crow who discovers the power of kindness",
  "A clever rabbit who outsmarts a prideful lion",
  "A young prince who learns wisdom from a poor beggar",
  "A turtle who wins a race against a boastful deer",
  "A stork who tricks the fish but meets a cunning crab",
  "A jackal painted blue who becomes a false king",
  "A lost sparrow who teaches an elephant humility",
];

const STORY_SYSTEM_PROMPT = `You are a master storyteller in the tradition of Panchatantra and Chandamama English editions — the world's oldest collection of Indian fables, originally composed by the scholar Vishnu Sharma to teach wisdom and niti (the art of right conduct) to young princes.

Your style draws from:
- PANCHATANTRA (English): Animal fables featuring lions, jackals, monkeys, crows, rabbits, crocodiles, and wise birds. Classic tales like The Cunning Rabbit and the Witless Lion, The Monkey and the Crocodile, The Blue Jackal, The Crafty Crane and the Crab, The Turtle Who Fell Off the Stick.
- CHANDAMAMA (English edition): Warm, moonlit storytelling tradition where a wise grandparent tells tales to an eager child under the stars. Stories with gentle wonder, Indian village settings, and clear moral lessons.
- JATAKA TALES (English): Stories of wisdom, selflessness, and cleverness — often with a bodhisattva figure or a wise animal protagonist.

RULES — follow exactly:
1. Write ONLY in English. No Telugu, Hindi, or any other language.
2. Output ONLY the story text — no title card, no preamble, no markdown, no headers, no bullet points, no code.
3. Use simple, vivid, spoken-word English suitable for read-aloud.
4. Include 2–4 named characters (animals, children, elders, royalty).
5. Build a clear narrative arc: setup → rising conflict → clever resolution.
6. End with exactly one line starting with "Moral:" followed by the lesson.
7. No disclaimers, no meta-commentary. Just the story.`;

// ── STARS BACKGROUND ──────────────────────────────────────────────────────────
function Stars() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 4,
    dur: Math.random() * 3 + 2,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {stars.map((s) => (
        <div key={s.id} style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: "50%",
          background: "#fff", opacity: 0,
          animation: `starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

function Lantern({ side }) {
  return (
    <div style={{
      position: "fixed", top: 40, [side]: -10, fontSize: 52,
      opacity: 0.18, animation: "sway 6s ease-in-out infinite",
      pointerEvents: "none", zIndex: 0, transformOrigin: "top center",
      filter: "drop-shadow(0 0 20px rgba(255,160,40,0.6))",
    }}>🏮</div>
  );
}

// ── ANIMATED STORY TEXT ───────────────────────────────────────────────────────
function AnimatedStory({ text, currentWordIndex, isPlaying }) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  let wordCount = 0;
  return (
    <div style={{ lineHeight: 1.95, fontSize: 15.5 }}>
      {sentences.map((sentence, si) => {
        const words = sentence.split(" ");
        const isMoral = sentence.startsWith("Moral:");
        return (
          <p key={si} style={{
            marginBottom: isMoral ? 0 : 14, marginTop: isMoral ? 20 : 0,
            paddingTop: isMoral ? 18 : 0,
            borderTop: isMoral ? "1px solid rgba(196,160,96,0.25)" : "none",
          }}>
            {words.map((word, wi) => {
              const idx = wordCount++;
              const revealed = idx <= currentWordIndex;
              const active = isPlaying && Math.abs(idx - currentWordIndex) <= 2;
              return (
                <span key={wi} style={{
                  opacity: revealed ? 1 : 0.12,
                  color: isMoral ? "#e8c870" : active ? "#ffe8a0" : "#ddd5c5",
                  fontWeight: isMoral ? 600 : active ? 500 : 400,
                  fontStyle: isMoral ? "italic" : "normal",
                  transition: "opacity 0.3s, color 0.2s", display: "inline",
                }}>{word}{" "}</span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

// ── HISTORY CARD ──────────────────────────────────────────────────────────────
function HistoryCard({ item, onReload }) {
  return (
    <div onClick={() => onReload(item)} style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "14px 16px", cursor: "pointer",
      transition: "all 0.2s", marginBottom: 10,
    }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(196,160,96,0.1)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
    >
      <div style={{ fontSize: 12, color: "#c4a060", marginBottom: 4 }}>
        {item.setting} · {item.age} · {item.date}
      </div>
      <div style={{ fontSize: 13, color: "#d0c8b8", lineHeight: 1.5,
        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical" }}>
        {item.story.slice(0, 120)}...
      </div>
    </div>
  );
}

// ── SPIN INDICATOR ────────────────────────────────────────────────────────────
function Spin() {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14,
      border: "2px solid rgba(26,20,8,0.3)", borderTop: "2px solid #1a1408",
      borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 8,
    }} />
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [prompt, setPrompt]     = useState("");
  const [age, setAge]           = useState("kids");
  const [length, setLength]     = useState("medium");
  const [setting, setSetting]   = useState("jungle");
  const [charName, setCharName] = useState("");

  const [story, setStory]       = useState("");
  const [phase, setPhase]       = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // TTS state
  const [isPlaying, setIsPlaying]       = useState(false);
  const [isPaused, setIsPaused]         = useState(false);
  const [currentWord, setCurrentWord]   = useState(-1);
  const [totalWords, setTotalWords]     = useState(0);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const utteranceRef = useRef(null);
  const wordTimerRef = useRef(null);

  const [tab, setTab]       = useState("create");
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("storyHistory") || "[]"); }
    catch { return []; }
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isLoading = phase === "generating";

  // Check TTS availability on mount
  useEffect(() => {
    setTtsAvailable("speechSynthesis" in window);
  }, []);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      if (utteranceRef.current) window.speechSynthesis.cancel();
      clearInterval(wordTimerRef.current);
    };
  }, []);

  // ── Generate story via Anthropic API ────────────────────────────────────────
  async function generate() {
    if (!prompt.trim()) return;
    // Cancel any playing TTS
    stopAudio();
    setPhase("generating");
    setStory("");
    setErrorMsg("");
    setCurrentWord(-1);

    const ageObj    = AGES.find(a => a.id === age);
    const lenObj    = LENGTHS.find(l => l.id === length);
    const setObj    = SETTINGS.find(s => s.id === setting);
    const wordCount = Math.round((ageObj.words + lenObj.words) / 2);
    const charLine  = charName.trim() ? `The main character's name is "${charName}".` : "";

    const userPrompt = `Setting: ${setObj.label} world.
Audience: ${ageObj.label} (${ageObj.sub}) — adjust vocabulary and complexity accordingly.
Target length: approximately ${wordCount} words.
${charLine}
Story idea: ${prompt}

Write the complete story now.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: STORY_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Story generation failed");
      const text = data.content?.find(b => b.type === "text")?.text || "";
      if (!text) throw new Error("No story returned");
      setStory(text);
      setTotalWords(text.split(" ").length);

      const entry = {
        id: Date.now(),
        prompt,
        story: text,
        setting: setObj.emoji + " " + setObj.label,
        age: ageObj.label,
        date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      };
      const newHistory = [entry, ...history].slice(0, 10);
      setHistory(newHistory);
      try { localStorage.setItem("storyHistory", JSON.stringify(newHistory)); } catch {}

      setPhase("done");
    } catch (e) {
      setErrorMsg(e.message);
      setPhase("error");
    }
  }

  // ── Web Speech TTS controls ──────────────────────────────────────────────────
  function playAudio() {
    if (!ttsAvailable || !story) return;
    window.speechSynthesis.cancel();
    clearInterval(wordTimerRef.current);

    const utter = new SpeechSynthesisUtterance(story);
    utter.lang    = "en-US";
    utter.rate    = 0.92;   // slightly slower = storytelling pace
    utter.pitch   = 1.0;
    utter.volume  = 1.0;

    // Prefer a warm English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith("en") && /samantha|karen|moira|daniel|alex|google us/i.test(v.name)
    ) || voices.find(v => v.lang === "en-US") || voices[0];
    if (preferred) utter.voice = preferred;

    // Word-by-word highlight via boundary events (supported in most browsers)
    let wordIdx = 0;
    utter.onboundary = (e) => {
      if (e.name === "word") {
        setCurrentWord(wordIdx++);
      }
    };

    // Fallback timer-based word reveal for browsers without boundary support
    utter.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentWord(0);
      const words = story.split(" ").length;
      const estimatedDuration = words / 2.5 * 1000; // ~2.5 words/sec at 0.92 rate
      const msPerWord = estimatedDuration / words;
      let idx = 0;
      wordTimerRef.current = setInterval(() => {
        setCurrentWord(idx++);
        if (idx >= words) clearInterval(wordTimerRef.current);
      }, msPerWord);
    };
    utter.onend  = () => { setIsPlaying(false); setIsPaused(false); clearInterval(wordTimerRef.current); setCurrentWord(totalWords + 1); };
    utter.onerror = () => { setIsPlaying(false); setIsPaused(false); clearInterval(wordTimerRef.current); };
    utter.onpause = () => { setIsPaused(true); clearInterval(wordTimerRef.current); };
    utter.onresume = () => {
      setIsPaused(false);
      // Resume timer from current position
      const remaining = story.split(" ").length - currentWord;
      const msPerWord = (remaining / 2.5) * 1000 / remaining;
      let idx = currentWord;
      wordTimerRef.current = setInterval(() => {
        setCurrentWord(idx++);
        if (idx >= story.split(" ").length) clearInterval(wordTimerRef.current);
      }, msPerWord);
    };

    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }

  function pauseAudio() {
    if (!ttsAvailable) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
    clearInterval(wordTimerRef.current);
  }

  function resumeAudio() {
    if (!ttsAvailable) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }

  function stopAudio() {
    if (!ttsAvailable) return;
    window.speechSynthesis.cancel();
    clearInterval(wordTimerRef.current);
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWord(-1);
  }

  function inspireMe() {
    setPrompt(INSPIRE_PROMPTS[Math.floor(Math.random() * INSPIRE_PROMPTS.length)]);
  }

  function reloadHistory(item) {
    stopAudio();
    setStory(item.story);
    setTotalWords(item.story.split(" ").length);
    setCurrentWord(-1);
    setPhase("done");
    setTab("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <Stars />
      <Lantern side="left" />
      <Lantern side="right" />

      <div style={S.wrap}>
        {/* HEADER */}
        <header style={S.header}>
          <div style={S.headerBadge}>✦ PANCHATANTRA AI ✦</div>
          <h1 style={S.title}>Tales of <em style={S.titleAccent}>Wisdom</em></h1>
          <p style={S.tagline}>Ancient stories. Modern voices. Timeless lessons.</p>
        </header>

        {/* TABS */}
        <div style={S.tabs}>
          {["create", "history"].map(t => (
            <button key={t}
              style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }}
              onClick={() => setTab(t)}>
              {t === "create" ? "✦ Create Story" : `📚 History (${history.length})`}
            </button>
          ))}
        </div>

        {/* ══ CREATE TAB ══ */}
        {tab === "create" && (
          <>
            {/* Prompt */}
            <div style={S.card}>
              <label style={S.label}>Your Story Idea</label>
              <div style={S.promptWrap}>
                <textarea
                  style={S.textarea}
                  placeholder="e.g. A clever mongoose who teaches a proud eagle a lesson…"
                  value={prompt}
                  rows={3}
                  onChange={e => setPrompt(e.target.value)}
                />
                <button style={S.inspireBtn} onClick={inspireMe}>
                  🎲 Inspire Me
                </button>
              </div>
            </div>

            {/* Age + Length */}
            <div style={S.row2}>
              <div style={S.card}>
                <label style={S.label}>Audience Age</label>
                <div style={S.chipRow}>
                  {AGES.map(a => (
                    <button key={a.id}
                      style={{ ...S.chip, ...(age === a.id ? S.chipActive : {}) }}
                      onClick={() => setAge(a.id)}>
                      <span style={{ fontWeight: 600 }}>{a.label}</span>
                      <span style={{ fontSize: 10, opacity: 0.6 }}>{a.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={S.card}>
                <label style={S.label}>Story Length</label>
                <div style={S.chipRow}>
                  {LENGTHS.map(l => (
                    <button key={l.id}
                      style={{ ...S.chip, ...(length === l.id ? S.chipActive : {}) }}
                      onClick={() => setLength(l.id)}>
                      <span style={{ fontWeight: 600 }}>{l.label}</span>
                      <span style={{ fontSize: 10, opacity: 0.6 }}>{l.minutes}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Setting */}
            <div style={S.card}>
              <label style={S.label}>Story Setting</label>
              <div style={S.settingGrid}>
                {SETTINGS.map(s => (
                  <button key={s.id}
                    style={{ ...S.settingBtn, ...(setting === s.id ? S.settingActive : {}) }}
                    onClick={() => setSetting(s.id)}>
                    <span style={{ fontSize: 22 }}>{s.emoji}</span>
                    <span style={{ fontSize: 12 }}>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced */}
            <button style={S.advToggle} onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? "▲" : "▼"} Advanced Options
            </button>

            {showAdvanced && (
              <div style={S.card}>
                <label style={S.label}>Main Character Name <span style={{ opacity: 0.4 }}>(optional)</span></label>
                <input
                  style={S.input}
                  placeholder="e.g. Arjun, Meera, Leo…"
                  value={charName}
                  onChange={e => setCharName(e.target.value)}
                />
              </div>
            )}

            {/* Generate button */}
            <button
              style={{ ...S.genBtn, ...(isLoading || !prompt.trim() ? S.genBtnOff : {}) }}
              onClick={generate}
              disabled={isLoading || !prompt.trim()}
            >
              {phase === "generating" ? <><Spin /> Weaving the tale…</> : "✦ Generate Story"}
            </button>

            {/* Error */}
            {(phase === "error" || errorMsg) && (
              <div style={S.errBox}>⚠️ {errorMsg}</div>
            )}

            {/* ── OUTPUT ── */}
            {story && (phase === "done" || errorMsg) && (
              <div style={S.outputCard}>

                {/* Audio Controls */}
                <div style={S.audioBox}>
                  <div style={S.audioTop}>
                    <span style={S.audioLabel}>🎙 Story Narrator</span>
                    {ttsAvailable ? (
                      <span style={{ fontSize: 11, color: "#7a9" }}>● Browser Voice Ready</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#a77" }}>Voice not available in this browser</span>
                    )}
                  </div>

                  {ttsAvailable && (
                    <div style={S.ttsControls}>
                      {!isPlaying && !isPaused && (
                        <button style={S.ttsBtn} onClick={playAudio}>
                          ▶ Play Story
                        </button>
                      )}
                      {isPlaying && !isPaused && (
                        <button style={S.ttsBtn} onClick={pauseAudio}>
                          ⏸ Pause
                        </button>
                      )}
                      {isPaused && (
                        <button style={S.ttsBtn} onClick={resumeAudio}>
                          ▶ Resume
                        </button>
                      )}
                      {(isPlaying || isPaused) && (
                        <button style={{ ...S.ttsBtn, ...S.ttsBtnSecondary }} onClick={stopAudio}>
                          ■ Stop
                        </button>
                      )}
                      {!isPlaying && !isPaused && currentWord > 0 && (
                        <button style={{ ...S.ttsBtn, ...S.ttsBtnSecondary }} onClick={() => { setCurrentWord(-1); }}>
                          ↺ Reset
                        </button>
                      )}
                    </div>
                  )}

                  {/* Now-playing bars */}
                  {isPlaying && (
                    <div style={S.nowPlayingBar}>
                      {[...Array(14)].map((_, i) => (
                        <div key={i} style={{
                          ...S.bar,
                          height: Math.random() * 16 + 4,
                          animationDelay: `${i * 0.07}s`,
                        }} />
                      ))}
                      <span style={{ fontSize: 11, color: "#c4a060", marginLeft: 10 }}>
                        Reading along…
                      </span>
                    </div>
                  )}
                </div>

                {/* Story text */}
                <div style={S.storyBox}>
                  <AnimatedStory
                    text={story}
                    currentWordIndex={currentWord}
                    isPlaying={isPlaying}
                  />
                </div>

                <div style={S.outputFooter}>
                  <button style={S.retryBtn} onClick={generate} disabled={isLoading}>
                    ↺ New Version
                  </button>
                  <button style={S.retryBtn} onClick={() => { stopAudio(); setStory(""); setPhase("idle"); setErrorMsg(""); }}>
                    ✕ Clear
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ HISTORY TAB ══ */}
        {tab === "history" && (
          <div style={S.card}>
            <label style={S.label}>Recent Stories</label>
            {history.length === 0 ? (
              <p style={{ opacity: 0.4, fontSize: 14, textAlign: "center", padding: "30px 0" }}>
                No stories yet. Generate your first tale! 📖
              </p>
            ) : (
              <>
                {history.map(item => (
                  <HistoryCard key={item.id} item={item} onReload={reloadHistory} />
                ))}
                <button
                  style={{ ...S.retryBtn, width: "100%", marginTop: 8, textAlign: "center" }}
                  onClick={() => {
                    setHistory([]);
                    try { localStorage.removeItem("storyHistory"); } catch {}
                  }}
                >
                  🗑 Clear History
                </button>
              </>
            )}
          </div>
        )}

        <footer style={S.footer}>
          ✦ Inspired by Panchatantra & Chandamama · Powered by Claude AI ✦
        </footer>
      </div>

      {/* GLOBAL STYLES */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Crimson+Pro:ital,wght@0,400;0,500;1,400;1,500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080612; }
        @keyframes starTwinkle {
          0%,100% { opacity:0; transform:scale(0.8); }
          50%      { opacity:0.85; transform:scale(1.2); }
        }
        @keyframes sway {
          0%,100% { transform:rotate(-4deg); }
          50%      { transform:rotate(4deg); }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes barDance {
          0%,100% { transform:scaleY(0.4); }
          50%      { transform:scaleY(1); }
        }
        textarea:focus, input:focus { outline:none; border-color:rgba(196,160,96,0.5)!important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(196,160,96,0.3); border-radius:2px; }
      `}</style>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const S = {
  root: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at 20% 0%, #1a0f2e 0%, #080612 50%, #0a0d1a 100%)",
    color: "#e8e2d5", fontFamily: "'Crimson Pro', Georgia, serif",
    position: "relative", overflowX: "hidden", paddingBottom: 60,
  },
  wrap: {
    maxWidth: 700, margin: "0 auto", padding: "44px 18px 40px",
    position: "relative", zIndex: 1,
  },
  header: { textAlign: "center", marginBottom: 32 },
  headerBadge: {
    display: "inline-block", fontSize: 10, letterSpacing: "0.25em",
    color: "#c4a060", border: "1px solid rgba(196,160,96,0.3)",
    borderRadius: 20, padding: "4px 16px", marginBottom: 14,
  },
  title: {
    fontFamily: "'Cinzel', serif",
    fontSize: "clamp(32px, 7vw, 52px)", fontWeight: 700,
    color: "#f2e8d4", lineHeight: 1.15, marginBottom: 10,
    textShadow: "0 0 40px rgba(196,160,96,0.3)",
  },
  titleAccent: { color: "#e8b84b", fontStyle: "italic" },
  tagline: { fontSize: 15, opacity: 0.45, fontStyle: "italic", letterSpacing: "0.03em" },

  tabs: {
    display: "flex", gap: 8, marginBottom: 20,
    background: "rgba(255,255,255,0.03)", borderRadius: 14,
    padding: 4, border: "1px solid rgba(255,255,255,0.06)",
  },
  tab: {
    flex: 1, padding: "10px", background: "none", border: "none",
    borderRadius: 10, color: "#9a9080", fontSize: 13, cursor: "pointer",
    fontFamily: "'Crimson Pro', serif", letterSpacing: "0.04em", transition: "all 0.2s",
  },
  tabActive: {
    background: "rgba(196,160,96,0.15)", color: "#e8c870",
    border: "1px solid rgba(196,160,96,0.25)",
  },

  card: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 18, padding: "20px 22px", marginBottom: 14, backdropFilter: "blur(12px)",
  },
  label: {
    display: "block", fontSize: 11, letterSpacing: "0.15em",
    textTransform: "uppercase", color: "#8a8070", marginBottom: 12,
  },
  promptWrap: { display: "flex", flexDirection: "column", gap: 10 },
  textarea: {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12,
    padding: "13px 15px", color: "#e8e2d5", fontSize: 15,
    fontFamily: "'Crimson Pro', serif", resize: "vertical",
    lineHeight: 1.65, transition: "border-color 0.2s",
  },
  inspireBtn: {
    alignSelf: "flex-end", background: "rgba(196,160,96,0.1)",
    border: "1px solid rgba(196,160,96,0.25)", borderRadius: 20,
    padding: "7px 16px", color: "#c4a060", fontSize: 13, cursor: "pointer",
    fontFamily: "'Crimson Pro', serif", transition: "all 0.2s",
  },

  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 0 },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 7 },
  chip: {
    display: "flex", flexDirection: "column", alignItems: "center",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, padding: "7px 13px", color: "#b0a898", fontSize: 13,
    cursor: "pointer", transition: "all 0.18s", fontFamily: "'Crimson Pro', serif", gap: 1,
  },
  chipActive: {
    background: "rgba(196,160,96,0.16)", border: "1px solid rgba(196,160,96,0.45)",
    color: "#e8c870",
  },

  settingGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  settingBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12, padding: "12px 8px", color: "#a09880", cursor: "pointer",
    transition: "all 0.18s", fontFamily: "'Crimson Pro', serif",
  },
  settingActive: {
    background: "rgba(196,160,96,0.14)", border: "1px solid rgba(196,160,96,0.4)",
    color: "#e8c870", boxShadow: "0 0 16px rgba(196,160,96,0.1)",
  },

  advToggle: {
    background: "none", border: "none", color: "#706860", fontSize: 12,
    letterSpacing: "0.1em", cursor: "pointer", display: "block",
    margin: "0 auto 14px", fontFamily: "'Crimson Pro', serif",
  },
  input: {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10,
    padding: "10px 14px", color: "#e8e2d5", fontSize: 14,
    fontFamily: "'Crimson Pro', serif", transition: "border-color 0.2s",
  },

  genBtn: {
    width: "100%", padding: "16px",
    background: "linear-gradient(135deg, #c8a84a 0%, #a07830 50%, #c8a84a 100%)",
    backgroundSize: "200% auto", border: "none", borderRadius: 14,
    color: "#1a1206", fontSize: 16, fontWeight: 700, cursor: "pointer",
    fontFamily: "'Cinzel', serif", letterSpacing: "0.08em", marginBottom: 14,
    transition: "background-position 0.4s, opacity 0.2s",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    boxShadow: "0 4px 24px rgba(196,160,60,0.2)",
  },
  genBtnOff: { opacity: 0.4, cursor: "not-allowed" },

  errBox: {
    background: "rgba(255,80,60,0.08)", border: "1px solid rgba(255,80,60,0.2)",
    borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#ff9080", marginBottom: 14,
  },

  outputCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,160,96,0.18)",
    borderRadius: 20, padding: "26px", animation: "fadeUp 0.5s ease forwards", marginBottom: 14,
  },

  audioBox: {
    background: "rgba(196,160,96,0.07)", border: "1px solid rgba(196,160,96,0.18)",
    borderRadius: 14, padding: "16px", marginBottom: 22,
  },
  audioTop: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
  },
  audioLabel: { fontSize: 12, color: "#c4a060", letterSpacing: "0.08em", textTransform: "uppercase" },

  ttsControls: { display: "flex", gap: 8, flexWrap: "wrap" },
  ttsBtn: {
    background: "linear-gradient(135deg, #c8a84a, #a07830)",
    border: "none", borderRadius: 22, padding: "9px 22px",
    color: "#1a1206", fontWeight: 700, fontSize: 13, cursor: "pointer",
    fontFamily: "'Crimson Pro', serif", letterSpacing: "0.04em",
    transition: "opacity 0.2s", boxShadow: "0 2px 12px rgba(196,160,60,0.25)",
  },
  ttsBtnSecondary: {
    background: "rgba(255,255,255,0.08)", color: "#c4a060",
    border: "1px solid rgba(196,160,96,0.25)", boxShadow: "none",
  },

  nowPlayingBar: {
    display: "flex", alignItems: "center", gap: 3, marginTop: 12, height: 22,
  },
  bar: {
    width: 3, borderRadius: 2, background: "#c4a060",
    animation: "barDance 0.6s ease-in-out infinite",
  },

  storyBox: { padding: "4px 0" },

  outputFooter: {
    display: "flex", gap: 10, marginTop: 20, paddingTop: 16,
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  retryBtn: {
    background: "none", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20, padding: "7px 18px", color: "#807868",
    fontSize: 13, cursor: "pointer", fontFamily: "'Crimson Pro', serif",
    transition: "all 0.2s",
  },

  footer: {
    textAlign: "center", marginTop: 40, fontSize: 11,
    opacity: 0.2, letterSpacing: "0.12em", textTransform: "uppercase",
  },
};
