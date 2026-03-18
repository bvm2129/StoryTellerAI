## Tales of Wisdom — App Brief

**Tales of Wisdom** is an AI-powered storytelling app that generates short, moral-driven fables in the tradition of Panchatantra and Chandamama, and reads them aloud — directly in the browser, with no setup required.

---

### What it does, step by step

1. **User describes a story idea** — or hits "🎲 Inspire Me" to get a random prompt like *"A clever rabbit who outsmarts a prideful lion"*

2. **User picks preferences** — audience age (Kids / Teens / Adults), story length (1–3 min), and a setting (Jungle, Kingdom, Ocean, Village, Sky, Desert)

3. **Claude generates the story** — using a carefully crafted system prompt rooted in classic Panchatantra tales and Chandamama English-edition storytelling. The story is English-only, vivid, and always ends with a clear moral lesson.

4. **The story is read aloud automatically** — using the browser's built-in Web Speech API. Users get Play / Pause / Resume / Stop controls, and the text highlights word-by-word in sync with the voice as it reads.

5. **Stories are saved to history** — users can revisit and replay any of their last 10 generated tales.

---

### Who it's for
Anyone who wants engaging, values-driven short stories — parents reading to children, educators, or anyone who loves classic Indian fable tradition in accessible English.

### Tech stack
- **React** (frontend UI)
- **Anthropic Claude API** (story generation, called directly from the browser)
- **Web Speech API** (audio narration, built into every modern browser)
- **Optional:** Murf AI via `server.js` for premium voice quality when ready
