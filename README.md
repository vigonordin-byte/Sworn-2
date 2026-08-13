# Sworn-2

**Sworn**, implemented from the Claude Design project *Sworn Mobile Home Screen
Design* — the onboarding flow (`Sworn Onboarding.dc.html`) and the main app
(`Sworn Home.dc.html`).

No build step and no dependencies. Serve the folder:

```bash
python3 -m http.server 8123
```

- `/index.html` — onboarding
- `/home.html` — main app

## Files

| File | Purpose |
|---|---|
| `index.html` | Onboarding shell |
| `app.js` | Onboarding content, step machine, rendering |
| `home.html` | Main app shell |
| `home.js` | Main app content, tabs, rendering |
| `styles.css` | Shared tokens, phone frame, primitives |
| `home.css` | Main app components |

## Main app

Four tabs behind one nav bar. In the design these are separate boards; here the
nav actually navigates.

| Tab | Contents |
|---|---|
| Home | Tier seal over a star field, vow, protection card, two action cards, "I'm tempted" |
| Commitments | Next lock, oath list with toggles, new/edit oath sheet |
| Analytics | Range tabs and three expandable cards — commitment rate, hardest times, temptations resisted |
| Settings | Account, the oath, preferences, support |

Three screens sit on top rather than in the nav:

- **Achievements** — full-screen, from the trophy in the home header. A timeline
  of all five tiers (Bronze → Eternal) with the current one marked `NOW`.
- **My why** — bottom sheet, from the home action card.
- **Intervention** — from "I'm tempted". A 60-second countdown through four
  phases: breathe, your commitment, your reason (or scripture when Faith mode is
  on), and choose an action. Then it asks whether you resisted.

The type is the system stack (`-apple-system` / SF Pro), not a web font — the
design dropped Archivo and Instrument Serif.

## Onboarding flow

A single `step` integer drives all 33 screens.

| Step | Screen |
|---|---|
| 0–9 | Quiz questions |
| 10 | Name and age |
| 11 | Calculating |
| 12 | Analysis complete |
| 13 | Symptoms |
| 14–18 | Education slides |
| 19–24 | Feature slides |
| 25 | Choose your goals |
| 26 | Rewiring benefits |
| 27 | Path to freedom |
| 28 | Rating |
| 29 | Referral code |
| 30 | Notifications |
| 31 | Custom plan ready |
| 32 | Paywall |

Answering a question auto-advances after 190ms. "Skip test" jumps to step 10.
The paywall's CTA restarts the flow at step 0.

## Notes on the port

- **Placeholder data.** The analysis score (`SCORE = 64`, `AVERAGE = 40` in
  `app.js`) and the main app's numbers (`STATS`, `PROTECTION`, `CHART_DATA`,
  `HOUR_DATA`, `WEEKDAYS` in `home.js`) are fixed, exactly as in the design.
  Nothing yet derives them from real activity, and the analytics headline
  figures do not change with the selected range.
- **The vow is a constant.** `VOW` in `home.js` is the same string on the home
  screen, in the My why sheet, and in the intervention's third phase. It is not
  captured anywhere in onboarding.
- **Fills the screen on a phone.** The design is a desktop preview: a 393×852
  frame with a drawn bezel. Above 520px that is preserved; at or below it the
  bezel is dropped and the app fills the viewport, otherwise the fixed 852px
  height overflows and bottom-anchored CTAs fall below the fold.
- **Quit date is computed.** The design hardcoded "Nov 9, 2026"; this is
  `today + RESET_DAYS` (90), which reproduces that date and stays correct later.
- **Real inputs.** Name and referral code were static mockups in the design and
  are now real `<input>` fields bound to state.
- **Accessibility.** Selectable rows are `<button>` elements with `role="radio"` /
  `aria-pressed`, so the flow is keyboard- and screen-reader-navigable.
- **Copy is verbatim**, including two typos carried over from the design:
  "dependance" (analysis screen) and "depresed" (education slide 4).
