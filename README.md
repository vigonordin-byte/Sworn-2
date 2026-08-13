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

Four tabs behind one nav bar. In the design these are four separate boards; here
the nav actually navigates.

| Tab | Contents |
|---|---|
| Home | Seal carousel (Bronze → Eternal), vow, metrics, protection card, "I'm tempted" |
| Commitments | Next lock, oath list with toggles, new/edit oath sheet |
| Analytics | Range tabs, promises-kept chart, hour histogram, triggers |
| Settings | Account, the oath, preferences, support |

"I'm tempted" starts a 60-second intervention that moves through four phases —
breathe, your commitment, your reason (or scripture when Faith mode is on), and
choose an action — then asks whether you resisted.

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
  `app.js`) and the main app's metrics (`PROMISES_KEPT`, `HOME_METRICS`,
  `CHART_DATA`, `HOUR_DATA`, `TRIGGERS` in `home.js`) are fixed, exactly as in
  the design. Nothing yet derives them from real activity, and the analytics
  hero figures do not change with the selected range.
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
