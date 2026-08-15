/* The user's reason for making the commitment.
   Written during onboarding, shown on the My why page, and — the point of the
   whole thing — read back to them at the moment of temptation.

   Shared by the onboarding (index.html) and the app (home.html). */

const WHY_KEY = 'sworn.why';

/** Stands in until the user writes their own. */
const WHY_FALLBACK = 'I want to control my impulses instead of being controlled by them.';

const WHY_REASONS = [
  'Religious beliefs',
  'I feel disgusted afterward',
  'It makes me feel depressed',
  "I feel like I'm losing control",
  'It hurts my confidence',
  'It wastes my time',
  'It affects my relationships',
  'I want more discipline',
  'I want to become a better version of myself',
  'I want to live according to my values',
  'I want to stop being controlled by my urges'
];

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
  return whyCache;
}

/** Write one field of the commitment record. */
function setWhyField(field, value) {
  const why = loadWhy();
  why[field] = value;
  saveWhy(why);
}

/** The line to read back to them. Their why, else the cost, else the stand-in. */
function commitmentQuote() {
  const why = loadWhy();
  return why.text.trim() || why.cost.trim() || WHY_FALLBACK;
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
        return { until: u.until || 0, log: Array.isArray(u.log) ? u.log : [] };
      }
    }
  } catch (e) {
    // storage blocked
  }
  return { until: 0, log: [] };
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

/** Indices into WHY_REASONS that the user picked. */
function whyReasons() {
  return loadWhy().reasons;
}

function toggleWhyReason(i) {
  const why = loadWhy();
  const at = why.reasons.indexOf(i);
  if (at === -1) why.reasons.push(i); else why.reasons.splice(at, 1);
  saveWhy(why);
}
