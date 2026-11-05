# 🇵🇰 THE GREAT CHANGE

**Directed By Zain Chaudary.** A country-management simulation set in Pakistan from November 2026, with finances, trade, security, diplomacy, projects, alliances and rival states reacting to your decisions.

## Play
Open `index.html` (served by any static server):

```bash
python3 -m http.server 8080
```

Then open the preview URL.

## How it works
- **1 turn = 1 month.** Orders are optional: describe a goal or review a scripted action, read the simulated briefing, then choose whether to issue it. Press **End Month** to advance the simulation.
- **173 countries** with simplified game baselines. Separate V13 public-reference panels show selected sourced military, resource, oil and energy figures with their own dates and definitions; they do not alter gameplay baselines or mechanics.
- **Government & Projects**: named public officeholders with clearly fictional in-game relationship scores; launched schemes with modeled support outlooks; foreign game operations are labeled simulation-only and are not claims of real coverage.
- **Realistic consequences**: default → collapse; coup risk when approval craters; India war → escalation ladder, international pressure, ceasefire mechanics; nuclear use = MAD game over.
- **Win** by surviving, uniting the country and growing into a top-tier power. **Lose** by coup, revolution, bankruptcy, conquest or nuclear war.

## Files
```
index.html          — dashboard shell
css/style.css       — responsive country dashboard theme
js/data.js          — game scenario data, public officeholder references and project estimates
js/data-v13.js      — view-only sourced reference figures; does not change simulation data
js/engine.js        — simulation: economy, stability, war, game operations, AI and events
js/map.js           — canvas world map (pan/zoom/click, relation colors)
js/ui.js            — dashboard, Projects, optional order briefings, event modals and news ticker
js/app.js           — boot, save/load
data/world.geo.json — Natural-Earth-derived country polygons (johan/world.geo.json)
```

Hardcore mode: no undo, no mercy. Good luck, ruler.
