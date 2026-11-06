# 🇵🇰 THE GREAT CHANGE

**Directed By Zain Chaudary.** A country-management simulation set in Pakistan from November 2026, with finances, trade, security, diplomacy, projects, alliances and rival states reacting to your decisions.

## Play
Open `index.html` (served by any static server):

```bash
python3 -m http.server 8080
```

Then open the preview URL.

## How it works
- **1 turn = 1 month.** The Situation page shows alerts and recent updates. Copy its briefing into Arena AI chat to discuss decisions; chat is not connected to the browser save. Political-capital, cash-balance and cooldown limits no longer block repeated actions (scenario prerequisites may still apply); treasury spending still affects the simulation.
- **173 countries** with simplified game baselines. Separate V13 public-reference panels show selected sourced military, resource, oil and energy figures with their own dates and definitions; they do not alter gameplay baselines or mechanics.
- **Government & Projects**: the Government page opens with a five-tile glance strip (public support, stability, reserves, monthly budget, inner backing), then a color-coded money board separating modeled tax income, spending categories, FX reserves, external debt and interest, trade/remittance flows, and estimated revenue-improvement levers. The simulation sets no fixed borrowing ceiling. The Projects page tracks the confidential PAK digital-services suite, its one-time funding, completion, monthly cost, projected revenue, and an audience panel. Government and force roles have fictional in-game relationship scores; project and leadership outcomes are scenario data.
- **App audience (game simulation)**: all seven apps start with **0 users**. Opening the suite to the public starts simulated sign-ups; users then grow monthly. Posts (national update, expose wrongdoing, explain a policy, call for unity) record simulated reach and a modeled agree/disagree split. These are fictional users and reactions, not real accounts, posts or polling.
- **Realistic consequences**: default → collapse; coup risk when approval craters; India war → escalation ladder, international pressure, ceasefire mechanics; nuclear use = MAD game over.
- **Win** by surviving, uniting the country and growing into a top-tier power. **Lose** by coup, revolution, bankruptcy, conquest or nuclear war.

## Files
```
index.html          — dashboard shell
css/style.css       — base dashboard styles
css/dashboard.css   — current dashboard theme: palette, type scale and layout
js/data.js          — game scenario data, public officeholder references and project estimates
js/data-v13.js      — view-only sourced reference figures; does not change simulation data
js/engine.js        — simulation: economy, platform operations, stability, war, game operations, AI and events
js/map.js           — canvas world map (pan/zoom/click, relation colors)
js/ui.js            — money dashboard, Government, Projects, event modals and news ticker
js/app.js           — boot, save/load
data/world.geo.json — Natural-Earth-derived country polygons (johan/world.geo.json)
```

Hardcore mode: no undo, no mercy. Good luck, ruler.
