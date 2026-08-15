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
## The iOS app

`Sworn/` is an Xcode project generated from `Sworn/project.yml`. The `.xcodeproj`
is not committed — regenerate it after cloning:

```bash
cd Sworn && xcodegen generate
```

Two targets:

| Target | Role |
|---|---|
| `Sworn` | Hosts the web UI in a `WKWebView` and owns Screen Time |
| `SwornMonitor` | `DeviceActivityMonitor` extension — raises and lowers the shield |

### Real app blocking

Blocking uses Apple's Screen Time frameworks, so apps are genuinely locked by
the system rather than by anything in the web layer.

- **FamilyControls** — authorization, and `FamilyActivityPicker` for choosing
  apps. The returned tokens are opaque by design: the app can count them but
  can never learn which apps they are.
- **DeviceActivity** — one repeating schedule per oath, `time` → `until`.
- **ManagedSettings** — one `ManagedSettingsStore` per oath, so lifting one lock
  never lifts another.

The web layer owns the oaths and posts them to native on every change; the
extension applies the shield at each window boundary, skipping days the oath
does not cover. Everything crosses through the `group.com.vigonordin.sworn2app`
App Group, since the extension is a separate process.

This needs the **Family Controls** entitlement and an explicit App ID — it
cannot go on a wildcard provisioning profile. Outside the app (plain browser)
`NATIVE` is false and the app picker falls back to a mock list so the design
still previews; nothing is blocked in that mode.

## The commitment arc

Steps 26–30 are the part that turns "I want to stop" into "I'm making a
commitment", rather than just collecting settings:

| Step | Screen | Asks |
|---|---|---|
| 26 | Why do you want to stop? | Preset reasons plus their own words |
| 27 | What has it cost you? | Free text — the CTA stays disabled until they write |
| 28 | Ninety days from now | Free text — what would be different |
| 29 | You said… | Their own sentence handed back, then "make the commitment" |
| 30 | You're making a commitment | The three terms, then "I'm ready" |

Step 30 is the real question: do they want this enough to accept the friction?
Accepting sets `committed` on the record.

## Developer states (DEBUG only)

Settings → **Developer** switches the app between six states for testing. Each
one writes the same stores the real app reads, so you land in the genuine
screens rather than a mock of them:

| State | What it sets up |
|---|---|
| New User | Nothing at all — onboarding from screen one |
| Onboarded · no commitment | Finished onboarding, nothing protected: the empty Home |
| Active commitment | Gold tier, protection armed, full analytics |
| Intervention | The 60 seconds with mock data |
| Broken commitment | The recovery screen, with a history behind it |
| Reset all data | Everything, including the Apple sign-in |

The countdown can be shortened to 15s or 5s, and jumped straight to any stage,
so the intervention can be tested without waiting a minute each time.

**None of this can reach a shipped build**, by two independent mechanisms:

- `dev.js` is stripped from the Release bundle via `EXCLUDED_SOURCE_FILE_NAMES`
- the flag that reveals the UI is only set under `#if DEBUG`

Both are verified by building each configuration and diffing the bundles.
Note that `SWIFT_ACTIVE_COMPILATION_CONDITIONS: DEBUG` must stay set in
`project.yml` — xcodegen does not add it the way Xcode's own template does, and
without it `#if DEBUG` is false everywhere.

## The three stages

The app moves through them in this order:

```
onboarding  →  sign in  →  the app
```

`ContentView` picks the stage from `Shared.onboarded`, which lives in the App
Group rather than webview storage so it does not depend on what the page can
persist. Onboarding loads `index.html`; finishing it at the paywall posts
`onboarded` to native, which flips the flag and hands over to sign-in, then to
`home.html`.

Sign-in deliberately comes *after* onboarding — it belongs with the paywall at
the end of the flow, not in front of someone who has not seen the product yet.

Settings → **Replay onboarding** clears the flag and walks the flow again.

## Signing in

Sign in with Apple, gating the whole app. The sign-in screen is rendered
natively rather than in the webview, because Apple's guidelines require their
own button.

The thing that matters: **Apple returns the user's name only on the very first
authorization.** Every sign-in afterwards yields the identifier and nothing
else, so `AppleAuth` persists the name the moment it arrives or it is lost for
good. On launch the stored credential is revalidated with
`getCredentialState`, so revoking access in Settings signs them out properly.

The session is injected into the page before any script runs, as
`window.__swornUser = { name, firstRun }`, so the first paint is already
correct. The home header then reads **Welcome, {name}** on the launch straight
after signing up and **Welcome back, {name}** on every launch after — resolved
once at load, so it never changes mid-session.

In a browser there is no Sign in with Apple, so the name typed during
onboarding stands in and the greeting still previews. With no name at all the
header falls back to the `SWORN` wordmark.

## The 60 seconds

The core accountability moment. It appears when the user tries to disable an
active commitment (a bypass) or asks for it themselves from "I'm tempted".

One continuous screen. The countdown is a thin depleting ring; only the body
under it changes, on a slow cross-fade:

| Elapsed | Stage | Content |
|---|---|---|
| 0–10s | Interrupt | **WAIT.** · "You made a commitment to yourself." |
| 10–30s | Remember | "Remember why you started" · their own words. Faith mode adds a verse *underneath*, never in place of it |
| 30–50s | Act | "Don't sit here fighting the urge" · one physical instruction |
| 50–60s | Decide | "The urge will pass." · "What do you want to choose?" |

There is **no button on screen at all** until the clock reaches zero — no close,
no back, no navigation. At zero the decision appears: **Go Back** (primary) and
**Continue Anyway** (secondary). Only then can the protection actually come off.

Turning an oath *on* is instant. Turning one *off* goes through the full sixty
seconds, and the oath stays armed the entire time — nothing changes unless
Continue Anyway is pressed at the end.

## Where the answers get used

Onboarding answers are deliberately *not* used everywhere. They appear at four
moments where they carry weight, and nowhere else:

1. **The realization** (onboarding step 27) — their chosen reason turned back
   on them. `REALIZATIONS` in `why.js` holds one per reason; the first reason
   they tapped decides which. "I want more discipline" gets *"Imagine who you
   could become"*; "I feel disgusted afterward" gets *"You already know how this
   ends"*.
2. **The intervention** — their own sentence, mid-countdown, at the moment a
   protected app is opened. This is the functional use, not decoration.
3. **My why** — somewhere to go and reconnect with it deliberately.
4. **After a lapse** — their reason becomes a way to recommit, never a rebuke.
   "You gave in. You said … What happened? Start again." Nothing is scored and
   nothing is taken away; the note is optional and only stored.

## Protection

Two ways apps get blocked, both through the same Screen Time machinery.

**Scheduled** — "I know I'm vulnerable at these times." Set during onboarding
(step 31) and owned by the Commitments page afterwards. A window like
20:00–23:00 with chosen apps and days; Sworn blocks them automatically.

**On demand** — "I'm tempted" raises a shield over everything under any oath,
immediately, for an hour. The shield goes up *before* any countdown, so
protection never depends on the user sitting through something.

That tap is deliberately framed as a success, not a confession: *"You noticed
the urge. That's exactly what Sworn is for."* It is logged as a save and the
analytics counts it as **temptation → protection activated**, never as a lapse.
The loop is urge → notice it → ask for cover → create distance → survive it.

## The why

The user's reason lives in `why.js`, shared by both pages and persisted to
`localStorage` under `sworn.why` (`{ text, reasons[] }`).

It is written at onboarding step 26 — preset reasons plus a free-text field —
and then read back in three places: the vow on the home screen, the My why page,
and the intervention's third phase, which is the point of it. Faith mode still
overrides that phase with scripture. Until the user writes their own,
`WHY_FALLBACK` stands in.

If storage is unavailable, `why.js` falls back to an in-memory copy that lasts
the session rather than throwing.
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
