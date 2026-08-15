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
  return whyCache;
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
