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

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.daysSworn === 'number') return { daysSworn: p.daysSworn };
    }
  } catch (e) {
    // storage blocked
  }
  return { daysSworn: 11 };
}

function saveProgress(p) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) { /* blocked */ }
}

const STATS_KEY = 'sworn.stats';

/** The figures behind the design. `hasData` false means show the empty state. */
const STATS_SEEDED = {
  hasData: true,
  rate: 92, rateDelta: 14,
  rateNote: 'You kept your limits on 47 of 51 protected occasions, 14 points better than the previous 30 days.',
  hardest: '22:00 – 01:00',
  hardestNote: 'That window holds 61% of your 44 interventions and lapses.',
  resisted: 38, attempts: 44,
  resistedNote: 'Five of the six lapses happened after 23:00, on nights with no lock set.'
};

const STATS_EMPTY = {
  hasData: false,
  rate: 0, rateDelta: 0, rateNote: '',
  hardest: '–', hardestNote: '',
  resisted: 0, attempts: 0, resistedNote: ''
};

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') return { ...STATS_SEEDED, ...s };
    }
  } catch (e) {
    // storage blocked
  }
  return STATS_SEEDED;
}

function saveStats(s) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) { /* blocked */ }
}

// ---------------------------------------------------------------- oaths

/* The scheduled protection windows. Written by onboarding when the user sets
   their first one, then owned by the Commitments page. */

const OATHS_KEY = 'sworn.oaths';

function loadOaths() {
  try {
    const raw = localStorage.getItem(OATHS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length) return list;
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
function seedFirstOath(p) {
  if (!p.apps.length) return;
  const existing = loadOaths() || [];
  const first = existing.find((o) => o.id === 1) || { id: 1, friction: 1, on: true };
  const oath = {
    ...first,
    name: `Protected ${p.from}–${p.to}`,
    time: p.from,
    until: p.to,
    days: p.days,
    apps: p.apps,
    on: true
  };
  const rest = existing.filter((o) => o.id !== 1);
  saveOaths([oath, ...rest]);
}

/* The hours new oaths default to. Editable from Settings. */
const WINDOW_KEY = 'sworn.window';

function loadWindow() {
  try {
    const raw = localStorage.getItem(WINDOW_KEY);
    if (raw) {
      const w = JSON.parse(raw);
      if (w && w.from && w.to) return { from: w.from, to: w.to };
    }
  } catch (e) { /* blocked */ }
  return { from: '20:00', to: '06:00' };
}

function saveWindow(w) {
  try { localStorage.setItem(WINDOW_KEY, JSON.stringify(w)); } catch (e) { /* blocked */ }
}

/** Everything Sworn holds, as plain text, for Export my record. */
function exportRecord() {
  const why = loadWhy();
  const urge = loadUrge();
  const oaths = loadOaths() || [];
  const lines = [
    'SWORN, my record',
    'Stopping: ' + B().choice,
    new Date().toLocaleString(),
    '',
    'WHY',
    why.text || '(not written)',
    '',
    'WHAT IT COST',
    why.cost || '(not written)',
    '',
    'NINETY DAYS FROM NOW',
    why.future || '(not written)',
    '',
    'REASONS',
    ...(why.reasons.length ? why.reasons.map((i) => '- ' + reasonLabels()[i]) : ['(none picked)']),
    '',
    'DAYS SWORN',
    String(loadProgress().daysSworn),
    '',
    'OATHS',
    ...(oaths.length ? oaths.map((o) => `- ${o.name} · ${o.time}-${o.until} · ${o.on ? 'on' : 'off'}`) : ['(none)']),
    '',
    'PROTECTION ACTIVATED',
    String(urge.log.length) + ' time(s)',
    '',
    'RESTARTS',
    ...(urge.lapses.length ? urge.lapses.map((l) => `- ${new Date(l.at).toLocaleDateString()}${l.note ? ': ' + l.note : ''}`) : ['(none)'])
  ];
  return lines.join('\n');
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
          lapses: Array.isArray(u.lapses) ? u.lapses : []
        };
      }
    }
  } catch (e) {
    // storage blocked
  }
  return { until: 0, log: [], lapses: [] };
}

/* A lapse is recorded, never scored. It exists so the user can say what
   happened and start again — not so the app can hold it against them. */
function recordLapse(note) {
  const urge = loadUrge();
  urge.lapses.push({ at: Date.now(), note: (note || '').trim() });
  saveUrge(urge);
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
  const urge = loadUrge();
  const until = Date.now() + (minutes || URGE_MINUTES) * 60_000;
  urge.until = until;
  urge.log.push(Date.now());
  saveUrge(urge);
  return until;
}

function endUrge() {
  const urge = loadUrge();
  urge.until = 0;
  saveUrge(urge);
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
