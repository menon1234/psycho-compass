# Psycho Compass

> Discover your psychological archetype through color, shape, and instinct — then see where you land in a living map of minds.

A browser-based psychological profiling tool that places you on an interactive personality constellation. Answer 20 rapid-fire questions (colors, shapes, symbols, words, scenarios) and get mapped to one of several archetypes — alongside AI-simulated "minds" to show you where you cluster.

---

## Features

- **Instinct-based quiz** — 20 questions drawn from a pool of 200+, each with a 10-second timer to prevent overthinking
- **Question types**: color instinct, shape preference, symbolic association, word resonance, scenario response
- **Archetype engine** — scores your answers across multiple psychological dimensions and assigns a primary archetype
- **Constellation map** — interactive 2D scatter plot showing your node among simulated bot-minds, colored and clustered by archetype
- **Session history** — tracks past results with timestamps
- **Fully offline** — no backend, no accounts, runs entirely in the browser from a single folder

---

## Usage

No install needed. Just open `index.html` in any modern browser.

```
open index.html
```

Or serve locally for best results:

```bash
python -m http.server 8080
# → http://localhost:8080
```

---

## Project Structure

```
psycho-compass/
├── index.html      # App shell & all screens (quiz, results, map)
├── app.js          # State, navigation, quiz flow, rendering
├── engine.js       # Question generation, scoring, archetype logic, bot simulation
├── data.js         # Question data: colors, shapes, symbols, words, scenarios
├── styles.css      # Visual design
└── README.md
```

---

## How It Works

1. **Quiz** — You answer 20 questions sampled randomly from 5 categories. Each answer is scored across psychological dimensions (introversion/extraversion, intuition/sensing, structure/fluidity, etc.)
2. **Scoring** — The engine tallies dimension scores and resolves your closest archetype
3. **Constellation** — Your result is placed on a 2D map. Bot simulations populate the surrounding space so you can see how your profile clusters relative to other archetypes
4. **History** — Previous sessions are shown as faded nodes on the map

---

## License

MIT
