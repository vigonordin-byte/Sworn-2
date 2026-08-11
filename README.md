# Sworn-2

Onboarding flow for **Sworn**, implemented from the Claude Design source
`Sworn Onboarding.dc.html`.

No build step and no dependencies — open `index.html`, or serve the folder:

```bash
python3 -m http.server 8123
```

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell and phone frame |
| `styles.css` | Design tokens and component styles |
| `app.js` | Content, step machine, and rendering |

## Flow

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

- **Placeholder result.** The analysis score (`SCORE = 64`, `AVERAGE = 40` in
  `app.js`) is fixed, exactly as in the design. Nothing yet derives it from the
  quiz answers.
- **Quit date is computed.** The design hardcoded "Nov 9, 2026"; this is
  `today + RESET_DAYS` (90), which reproduces that date and stays correct later.
- **Real inputs.** Name and referral code were static mockups in the design and
  are now real `<input>` fields bound to state.
- **Accessibility.** Selectable rows are `<button>` elements with `role="radio"` /
  `aria-pressed`, so the flow is keyboard- and screen-reader-navigable.
- **Copy is verbatim**, including two typos carried over from the design:
  "dependance" (analysis screen) and "depresed" (education slide 4).
