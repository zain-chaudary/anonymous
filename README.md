# 🇵🇰 WORLD LEADER 2026

A realistic geopolitical simulator. You rule **Pakistan** starting **November 2026** — with the entire world simulated: money, trade, armies, nuclear arsenals, spy agencies, alliances, insurgencies and AI-driven rival states reacting to your every move.

## Play
Open `index.html` (served by any static server):

```bash
python3 -m http.server 8080
```

Then open the preview URL.

## How it works
- **1 turn = 1 month.** Issue orders (💵 money + 🏛 political capital), then press **End Month** and the world simulates: economy, factions, wars, intelligence, AI countries.
- **173 countries** with real-world baseline data (IMF WEO, World Bank, SIPRI 2025, IISS Military Balance — projected to Nov 2026).
- **Pakistan deep state**: provinces, TTP/BLA/PTI/sectarian factions, ISI networks, advisors (Field Marshal, DG ISI, Finance Minister...), IMF/CPEC/Saudi-pact programs.
- **Realistic consequences**: default → collapse; coup risk when approval craters; India war → escalation ladder, international pressure, ceasefire mechanics; nuclear use = MAD game over.
- **Win** by surviving, uniting the country and growing into a top-tier power. **Lose** by coup, revolution, bankruptcy, conquest or nuclear war.

## Files
```
index.html          — dashboard shell
css/style.css       — dark war-room theme
js/data.js          — world data (173 countries), Pakistan deep state
js/engine.js        — simulation: economy, stability, war, intel, AI, events
js/map.js           — canvas world map (pan/zoom/click, relation colors)
js/ui.js            — panels, orders, event modals, news ticker
js/app.js           — boot, save/load
data/world.geo.json — Natural-Earth-derived country polygons (johan/world.geo.json)
```

Hardcore mode: no undo, no mercy. Good luck, ruler.
