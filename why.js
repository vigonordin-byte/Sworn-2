/* The user's reason for making the commitment.
   Written during onboarding, shown on the My why page, and — the point of the
   whole thing — read back to them at the moment of temptation.

   Shared by the onboarding (index.html) and the app (home.html). */

const WHY_KEY = 'sworn.why';

/** Stands in until the user writes their own. */
const WHY_FALLBACK = 'I want to control my impulses instead of being controlled by them.';

/* Reasons and realizations are behaviour-specific and live in behavior.js.
   These accessors keep every caller unaware of which behaviour is selected. */
function reasonLabels() { return B().reasons; }
function realizationsFor() { return B().realizations; }

const REALIZATION_FALLBACK = [
  'Wanting to stop is not the same as stopping.',
  "You've wanted to before. What changes it isn't more wanting. It's something standing in the way at the moment it counts."
];

/** The realization for the first reason they picked, in their behaviour. */
function realization() {
  const picked = loadWhy().reasons;
  const first = picked.length ? picked[0] : -1;
  return realizationsFor()[first] || REALIZATION_FALLBACK;
}

/* Storage can be unavailable on some file:// origins, so everything falls back
   to this in-memory copy rather than throwing. */
let whyCache = null;

function loadWhy() {
  if (whyCache) return whyCache;
  try {
    const raw = localStorage.getItem(WHY_KEY);
    if (raw) whyCache = JSON.parse(raw);
  } catch (e) {
    // storage blocked — memory only for this session
  }
  if (!whyCache || typeof whyCache !== 'object') whyCache = {};
  if (typeof whyCache.text !== 'string') whyCache.text = '';
  if (!Array.isArray(whyCache.reasons)) whyCache.reasons = [];
  // Added later; older stored records will not have them.
  if (typeof whyCache.cost !== 'string') whyCache.cost = '';
  if (typeof whyCache.future !== 'string') whyCache.future = '';
  if (typeof whyCache.committed !== 'boolean') whyCache.committed = false;
  // The moments they named as risky, as indexes into the behaviour's list.
  if (!Array.isArray(whyCache.triggers)) whyCache.triggers = [];
  if (!Array.isArray(whyCache.goals)) whyCache.goals = [];
  return whyCache;
}

/** Write one field of the commitment record. */
function setWhyField(field, value) {
  const why = loadWhy();
  why[field] = value;
  saveWhy(why);
}

/* Faith mode used to be a switch in Settings. It is now inferred: if someone
   names religious belief as their reason, or picks "Come closer to God" as a
   goal, scripture belongs in their intervention. Asking twice was clutter. */
const FAITH_GOAL = 0;     // 'Come closer to God'

function faithMode() {
  const why = loadWhy();
  const faithReason = B().faithReason;
  const byReason = faithReason !== null && why.reasons.includes(faithReason);
  return byReason || why.goals.includes(FAITH_GOAL);
}

/** The line to read back to them. Their why, else the cost, else the stand-in. */
function commitmentQuote() {
  const why = loadWhy();
  return why.text.trim() || why.cost.trim() || WHY_FALLBACK;
}

// ---------------------------------------------------------------- who they are

/* Inside the app the name comes from Sign in with Apple and is injected before
   any script runs. In a browser there is no Sign in with Apple, so the name the
   user typed during onboarding stands in and the greeting still previews. */

const SESSION_KEY = 'sworn.session';

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        return { name: s.name || '', greeted: s.greeted === true };
      }
    }
  } catch (e) {
    // storage blocked
  }
  return { name: '', greeted: false };
}

function saveSession(s) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch (e) {
    // storage blocked
  }
}

function setUserName(name) {
  const s = loadSession();
  s.name = (name || '').trim();
  saveSession(s);
}

/* Resolved once, at load. The greeting must not change while the app is open —
   only the next launch turns "Welcome" into "Welcome back". */
const USER = (() => {
  const native = typeof window !== 'undefined' ? window.__swornUser : null;
  if (native && native.name) return { name: native.name, firstRun: native.firstRun === true };

  const s = loadSession();
  if (!s.name) return { name: '', firstRun: false };

  const firstRun = !s.greeted;
  if (firstRun) { s.greeted = true; saveSession(s); }
  return { name: s.name, firstRun };
})();

/** "Welcome, Vigo" the first time in; "Welcome back, Vigo" ever after. */
function greeting() {
  if (!USER.name) return 'SWORN';
  return `${USER.firstRun ? 'Welcome' : 'Welcome back'}, ${USER.name}`;
}

// ---------------------------------------------------------------- progress

/* The streak and the analytics figures. Stored rather than hardcoded so a new
   install can genuinely be empty and a seeded one can be full. */

const PROGRESS_KEY = 'sworn.progress';

/* The streak is computed from a start date, never stored as a number — a
   stored count can only rot. `since` restarts on every lapse; `oathAt` is the
   night they first swore and never moves, so "written N days ago" stays true
   across restarts. Old builds stored a bare count; it migrates to a date. */
function loadProgress() {
  let p = null;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) p = JSON.parse(raw);
  } catch (e) {
    // storage blocked
  }
  if (!p || typeof p !== 'object') p = {};
  if (typeof p.daysSworn === 'number' && typeof p.since !== 'number') {
    p.since = Date.now() - p.daysSworn * 864e5;
  }
  const since = typeof p.since === 'number' ? p.since : null;
  const oathAt = typeof p.oathAt === 'number' ? p.oathAt : since;
  /* Calendar days, with the day they committed counted as day one. Commit on
     Monday evening and Monday is day 1, Tuesday day 2 — nobody should have to
     survive until Wednesday evening to be told they have two days. The
     counter therefore turns over at midnight, not at the hour they swore. */
  const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const elapsed = since ? Math.round((dayStart(Date.now()) - dayStart(since)) / 864e5) : 0;
  const daysSworn = since ? Math.max(1, elapsed + 1) : 0;
  // The longest run ever, which a lapse must not erase — achievements keep it.
  const best = Math.max(typeof p.best === 'number' ? p.best : 0, daysSworn);
  return { since, oathAt, best, daysSworn };
}

function saveProgress(p) {
  const record = {
    since: p.since ?? null,
    oathAt: p.oathAt ?? p.since ?? null,
    best: typeof p.best === 'number' ? p.best : 0
  };
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(record)); } catch (e) { /* blocked */ }
}

/** The commitment moment. Starts (or restarts) the streak; keeps the oath date. */
function startStreak() {
  const p = loadProgress();
  saveProgress({ since: Date.now(), oathAt: p.oathAt || Date.now(), best: p.best });
  pushProfile();
}

// ---------------------------------------------------------------- oaths

/* The scheduled protection windows. Written by onboarding when the user sets
   their first one, then owned by the Commitments page. */

const OATHS_KEY = 'sworn.oaths';

/* Returns null only when nothing has ever been saved. An empty array is a
   real answer — the user deleted everything — and must not read as "no
   record", or their commitments come back from the dead. */
function loadOaths() {
  try {
    const raw = localStorage.getItem(OATHS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (e) {
    // storage blocked
  }
  return null;
}

function saveOaths(list) {
  try {
    localStorage.setItem(OATHS_KEY, JSON.stringify(list));
  } catch (e) {
    // storage blocked
  }
}

/* The first protection window, set during onboarding: "I know I'm vulnerable
   at these times". Saving it seeds the oath the app opens with. */

const PROTECT_KEY = 'sworn.protect';

function loadProtect() {
  try {
    const raw = localStorage.getItem(PROTECT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') {
        return {
          from: p.from || '20:00',
          to: p.to || '23:00',
          days: Array.isArray(p.days) ? p.days : [0, 1, 2, 3, 4, 5, 6],
          apps: Array.isArray(p.apps) ? p.apps : []
        };
      }
    }
  } catch (e) {
    // storage blocked
  }
  return { from: '20:00', to: '23:00', days: [0, 1, 2, 3, 4, 5, 6], apps: [] };
}

function saveProtect(p) {
  try {
    localStorage.setItem(PROTECT_KEY, JSON.stringify(p));
  } catch (e) {
    // storage blocked
  }
  seedFirstOath(p);
}

/** Mirror the onboarding window into the oath list the app reads. */
/* Inside the app, apps are chosen through Apple's picker and are counted
   natively, never named here — so p.apps is legitimately empty and gating on
   it meant the commitment the user just built was never created. Days and a
   window are the real signal that they set something up. */
function seedFirstOath(p) {
  if (!p.days.length) return;
  const existing = loadOaths() || [];
  const first = existing.find((o) => o.id === 1) || { id: 1, on: true };
  const oath = {
    ...first,
    name: first.name || `Protected ${p.from}–${p.to}`,
    time: p.from,
    until: p.to,
    days: p.days,
    apps: p.apps,
    on: true
  };
  const rest = existing.filter((o) => o.id !== 1);
  saveOaths([oath, ...rest]);
}

// ---------------------------------------------------------------- urge shield

/* "I'm tempted" turns protection on for an hour. This is a save, not a lapse,
   and the log is what the analytics counts. */

const URGE_KEY = 'sworn.urge';
const URGE_MINUTES = 60;

function loadUrge() {
  try {
    const raw = localStorage.getItem(URGE_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      if (u && typeof u === 'object') {
        return {
          until: u.until || 0,
          log: Array.isArray(u.log) ? u.log : [],
          resists: Array.isArray(u.resists) ? u.resists : [],
          lapses: Array.isArray(u.lapses) ? u.lapses : []
        };
      }
    }
  } catch (e) {
    // storage blocked
  }
  return { until: 0, log: [], resists: [], lapses: [] };
}

/* A lapse is recorded, never scored. It exists so the user can say what
   happened and start again — not so the app can hold it against them. The one
   consequence is honest arithmetic: DAYS FREE restarts, because it must be
   true. The oath, the history and the locks are untouched. */
function recordLapse(note, reason) {
  const at = Date.now();
  const urge = loadUrge();
  // The note stays on this device, full stop. Only the moment and the
  // structured reason category sync.
  urge.lapses.push({ at, note: (note || '').trim(), reason: reason || '' });
  saveUrge(urge);
  // loadProgress folds the streak that just ended into `best` before the
  // reset, so the earned tiers survive the restart.
  const p = loadProgress();
  saveProgress({ since: at, oathAt: p.oathAt, best: p.best });
  pushEvent('commitment_broken', at, reason);
  pushProfile();
  bridge({ action: 'notifyBreak', prefs: loadNotifPrefs() });
}

/** They reached zero and chose to go back. */
function recordResist() {
  const at = Date.now();
  const urge = loadUrge();
  urge.resists.push(at);
  saveUrge(urge);
  pushEvent('temptation_resisted', at);
}

function saveUrge(urge) {
  try {
    localStorage.setItem(URGE_KEY, JSON.stringify(urge));
  } catch (e) {
    // storage blocked
  }
}

/** Milliseconds left on the current urge shield, or 0 if none is running. */
function urgeRemaining() {
  const left = loadUrge().until - Date.now();
  return left > 0 ? left : 0;
}

/** Start the shield and record the save. Returns when it lifts. */
function beginUrge(minutes) {
  const at = Date.now();
  const urge = loadUrge();
  const until = at + (minutes || URGE_MINUTES) * 60_000;
  urge.until = until;
  // Re-tapping during the same episode extends the shield but is one urge,
  // not two — otherwise the analytics inflate themselves.
  const last = urge.log.length ? urge.log[urge.log.length - 1] : 0;
  const fresh = at - last > 600_000;
  if (fresh) urge.log.push(at);
  saveUrge(urge);
  if (fresh) pushEvent('protection_used', at);
  return until;
}

function endUrge() {
  const urge = loadUrge();
  urge.until = 0;
  saveUrge(urge);
}

/* The native host mirrors meaningful moments to the backend. In a browser
   there is no host and these quietly do nothing — the app is local-first
   either way, and nothing ever waits on them. */
function bridge(msg) {
  try { window.webkit?.messageHandlers?.sworn?.postMessage(msg); } catch (e) { /* no host */ }
}

/* Which categories of notification the user allows. Everything defaults on
   except the two that would create noise, and this is the single source the
   native scheduler is handed. */
const NOTIF_KEY = 'sworn.notif';

const NOTIF_DEFAULTS = {
  protection: true,
  protectionEnd: false,
  earlyReminder: false,
  milestones: true,
  commitment: true,
  why: true,
  recovery: true,
  reengagement: true
};

function loadNotifPrefs() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') return { ...NOTIF_DEFAULTS, ...p };
    }
  } catch (e) { /* storage blocked */ }
  return { ...NOTIF_DEFAULTS };
}

function saveNotifPrefs(p) {
  try { localStorage.setItem(NOTIF_KEY, JSON.stringify(p)); } catch (e) { /* blocked */ }
}

/* Hand the native scheduler everything it needs to rebuild from scratch. Sent
   whenever commitments, streak, behaviour or preferences change, and at
   launch — so a stale reminder for a commitment that moved cannot exist. */
function syncNotifications(oaths) {
  const p = loadProgress();
  bridge({
    action: 'notifySync',
    behavior: behaviorChosen() ? loadBehavior() : 'porn',
    why: loadWhy().text || '',
    streakSince: p.since || 0,
    oaths: oaths || [],
    prefs: loadNotifPrefs()
  });
}

/** The persistent profile: behaviour, why record, oath and streak dates. */
function pushProfile() {
  const why = loadWhy();
  const p = loadProgress();
  bridge({
    action: 'profile',
    payload: {
      behavior: behaviorChosen() ? loadBehavior() : null,
      name: loadSession().name || null,
      why_text: why.text || null,
      reasons: why.reasons,
      goals: why.goals,
      triggers: why.triggers,
      cost: why.cost || null,
      oath_at: p.oathAt ? new Date(p.oathAt).toISOString() : null,
      streak_since: p.since ? new Date(p.since).toISOString() : null
    }
  });
}

function pushEvent(type, at, reason) {
  const msg = { action: 'event', type, at: at || Date.now() };
  if (reason) msg.reason = reason;
  bridge(msg);
}

/* Apple's picker returns opaque tokens, so counts are all the UI may know.
   A category like "Social" covers many apps but counts as one item — label it
   as a category rather than pretending it is a single app. */
function selectionTotal(bd) {
  return bd ? (bd.apps || 0) + (bd.categories || 0) + (bd.domains || 0) : 0;
}

/** "1 category · 2 apps" — empty string when nothing is picked. */
function selectionLabel(bd) {
  if (!bd) return '';
  const parts = [];
  if (bd.categories) parts.push(bd.categories + (bd.categories === 1 ? ' category' : ' categories'));
  if (bd.apps) parts.push(bd.apps + (bd.apps === 1 ? ' app' : ' apps'));
  if (bd.domains) parts.push(bd.domains + (bd.domains === 1 ? ' website' : ' websites'));
  return parts.join(' · ');
}

/** The unit under a big count. Mixed picks fall back to "blocked". */
function selectionCaption(bd) {
  const total = selectionTotal(bd);
  if (!bd || !total) return 'apps';
  const kinds = ['apps', 'categories', 'domains'].filter((k) => bd[k]);
  if (kinds.length > 1) return 'blocked';
  if (kinds[0] === 'categories') return total === 1 ? 'category' : 'categories';
  if (kinds[0] === 'domains') return total === 1 ? 'website' : 'websites';
  return total === 1 ? 'app' : 'apps';
}

/** "22:41" — when the shield lifts. */
function urgeUntilLabel() {
  const until = loadUrge().until;
  if (!until) return '';
  const d = new Date(until);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function saveWhy(why) {
  // Callers pass partial records (dev seeds, older flows). The cache must be
  // as normalized as what loadWhy builds, or later field access explodes.
  why.text = typeof why.text === 'string' ? why.text : '';
  why.cost = typeof why.cost === 'string' ? why.cost : '';
  why.future = typeof why.future === 'string' ? why.future : '';
  why.committed = why.committed === true;
  why.reasons = Array.isArray(why.reasons) ? why.reasons : [];
  why.goals = Array.isArray(why.goals) ? why.goals : [];
  why.triggers = Array.isArray(why.triggers) ? why.triggers : [];
  whyCache = why;
  try {
    localStorage.setItem(WHY_KEY, JSON.stringify(why));
  } catch (e) {
    // storage blocked — memory only for this session
  }
}

/** What the user actually wrote, or the placeholder until they have. */
function whyText() {
  return loadWhy().text.trim() || WHY_FALLBACK;
}

/** Indices into the behaviour's reason list that the user picked. */
function whyReasons() {
  return loadWhy().reasons;
}

function toggleWhyTrigger(i) {
  const why = loadWhy();
  const at = why.triggers.indexOf(i);
  if (at === -1) why.triggers.push(i); else why.triggers.splice(at, 1);
  saveWhy(why);
}

function toggleWhyReason(i) {
  const why = loadWhy();
  const at = why.reasons.indexOf(i);
  if (at === -1) why.reasons.push(i); else why.reasons.splice(at, 1);
  saveWhy(why);
}

// ---------------------------------------------------------------- analytics

/* Everything the analytics page shows is computed here from the raw record:
   the streak dates and the urge log. Nothing is stored twice, so the numbers
   cannot drift from the events behind them. */

/** One value per day, oldest first: 100 if no lapse that day, 0 otherwise.
    Clamped to the days since the oath was first sworn. */
function dailyKept(nDays) {
  const p = loadProgress();
  if (!p.oathAt) return [];
  const u = loadUrge();
  const dayMs = 864e5;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Calendar days, matching the counter: the day the commitment was made is
  // day one, so the strip and the seal can never disagree.
  const daysSinceOath = Math.round((today.getTime() - new Date(p.oathAt).setHours(0, 0, 0, 0)) / dayMs) + 1;
  const total = Math.max(1, Math.min(nDays, daysSinceOath));
  const out = [];
  for (let i = total - 1; i >= 0; i--) {
    const d0 = today.getTime() - i * dayMs;
    const lapsed = u.lapses.some((l) => l.at >= d0 && l.at < d0 + dayMs);
    out.push(lapsed ? 0 : 100);
  }
  return out;
}

/** Every recorded urge moment: shields raised, resists, lapses. */
function urgeEvents() {
  const u = loadUrge();
  return [...u.log, ...u.resists, ...u.lapses.map((l) => l.at)];
}

/** 24 values, midnight first, scaled so the busiest hour is 100. */
function urgeByHour() {
  const counts = new Array(24).fill(0);
  urgeEvents().forEach((t) => { counts[new Date(t).getHours()] += 1; });
  const max = Math.max(...counts, 1);
  return counts.map((c) => Math.round((c / max) * 100));
}

/** Events per weekday, Monday first. */
function urgeByWeekday() {
  const counts = new Array(7).fill(0);
  urgeEvents().forEach((t) => { counts[(new Date(t).getDay() + 6) % 7] += 1; });
  return counts;
}

/** The 3-hour window holding the most urges. Needs a handful to mean anything. */
function hardestWindow() {
  const counts = new Array(24).fill(0);
  const events = urgeEvents();
  events.forEach((t) => { counts[new Date(t).getHours()] += 1; });
  if (events.length < 5) return { label: '–', share: 0, count: events.length };
  let bestStart = 0;
  let bestSum = -1;
  for (let h = 0; h < 24; h++) {
    const sum = counts[h] + counts[(h + 1) % 24] + counts[(h + 2) % 24];
    if (sum > bestSum) { bestSum = sum; bestStart = h; }
  }
  const pad = (h) => String(h).padStart(2, '0') + ':00';
  return {
    label: pad(bestStart) + ' – ' + pad((bestStart + 3) % 24),
    share: Math.round((bestSum / events.length) * 100),
    count: events.length
  };
}

function analyticsStats() {
  const p = loadProgress();
  if (!p.since) return { hasData: false };
  const u = loadUrge();

  /* Every day since the commitment was made. */
  const days = dailyKept(3650);
  const keptDays = days.filter((v) => v === 100).length;
  const rate = days.length ? Math.round((keptDays / days.length) * 100) : 100;

  /* Momentum: the last thirty days against everything before them. Only
     shown once both stretches are long enough to mean anything. */
  const recent = days.slice(-30);
  const earlier = days.slice(0, Math.max(0, days.length - 30));
  const rateDelta = earlier.length >= 7 && recent.length >= 7
    ? Math.round((recent.filter((v) => v === 100).length / recent.length) * 100)
      - Math.round((earlier.filter((v) => v === 100).length / earlier.length) * 100)
    : null;
  const rateNote = 'You kept your commitment on ' + keptDays + ' of ' +
    days.length + (days.length === 1 ? ' day.' : ' days.');

  const hw = hardestWindow();
  const hardestNote = hw.label === '–'
    ? 'Not enough recorded urges yet to show a pattern.'
    : 'That window holds ' + hw.share + '% of your ' + hw.count + ' recorded urges.';

  const resisted = u.resists.length;
  const attempts = u.resists.length + u.lapses.length;
  const resistedNote = u.lapses.length === 0
    ? (attempts
        ? 'Every recorded urge so far ended with you walking away.'
        : 'No urges recorded yet. The button is there when you need it.')
    : u.lapses.length + (u.lapses.length === 1 ? ' lapse' : ' lapses') +
      ' recorded. Each one restarted the day counter, nothing else.';

  return {
    hasData: true,
    rate, rateDelta, rateNote,
    hardest: hw.label, hardestNote,
    resisted, attempts, resistedNote
  };
}
