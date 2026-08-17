/* Sworn — main app.
   Ported from the Claude Design source "Sworn Home.dc.html".

   The design lays the screens out as separate boards; here they are tabs
   behind one nav bar, so the nav actually navigates. */

// ---------------------------------------------------------------- content

const TIERS = [
  { name: 'BRONZE',  at: 0,   next: 5,    accent: '#c98a5c', a1: '#c98a5c', a2: '#8a5a38', core: 'radial-gradient(circle at 38% 30%, #2a1d14 0%, #131110 55%, #0b0b0c 100%)' },
  { name: 'SILVER',  at: 5,   next: 10,   accent: '#cfd6de', a1: '#e6ecf3', a2: '#7d8896', core: 'radial-gradient(circle at 38% 30%, #23272c 0%, #121316 55%, #0b0b0c 100%)' },
  { name: 'GOLD',    at: 10,  next: 30,   accent: '#e7bc6a', a1: '#f0cd85', a2: '#a8762a', core: 'radial-gradient(circle at 38% 30%, #2a2418 0%, #121214 55%, #0b0b0c 100%)' },
  { name: 'DIAMOND', at: 30,  next: 100,  accent: '#9fe8ff', a1: '#e8fbff', a2: '#4a9dc4', core: 'radial-gradient(circle at 38% 30%, #16262d 0%, #101418 55%, #0a0b0c 100%)', facets: true },
  { name: 'ETERNAL', at: 100, next: null, accent: '#e3b8ff', a1: '#ffd9f2', a2: '#7f6bff', core: 'radial-gradient(circle at 38% 30%, #241a33 0%, #121018 55%, #0a0a0c 100%)', facets: true }
];

const TIER_COPY = [
  'Bronze is where every commitment starts. The first days are the loudest, when urges arrive without warning and your own reasoning turns against you. Nothing is expected of you here except that you keep showing up.',
  'By five days the noise begins to settle. Sleep improves, focus returns in short stretches, and the urge stops feeling like an emergency. Silver marks the point where the habit is no longer running the day.',
  'Ten days is where most attempts have already ended. Gold is earned by the ordinary work of keeping your locks in place and answering honestly at your checkup. Confidence stops being a feeling and becomes evidence.',
  'A month changes the baseline. Diamond means the reward circuits have had real time to recalibrate. Energy, drive and attention return to something closer to their natural level, and giving in becomes a decision rather than a reflex.',
  'A hundred days is no longer a streak, it is how you live. Eternal is the last tier because there is nothing beyond it to chase: the commitment has become ordinary, and that is the whole point.'
];

/* Whatever the user actually has, and nothing else. This used to fall back
   to three sample commitments from the design import, so a brand-new user met
   "No Reddit after 20:00" and two others they never created. */
let OATHS = loadOaths() || [];
/* Derived at the moment it is needed, never cached. A stored counter went
   stale the instant anything replaced the list — a dev preset, a restore from
   the server — and the next draft then reserved an id that already existed,
   so editing one commitment opened another. */
function nextFreeId() {
  return OATHS.reduce((n, o) => Math.max(n, o.id), 0) + 1;
}

/** Every mutation goes through here so storage and the device stay in step. */
function persistOaths() {
  saveOaths(OATHS);
  syncShields();
}

/** Apps the user can put under an oath. */
const APP_LIST = ['Reddit', 'X', 'Instagram', 'TikTok', 'YouTube', 'Safari'];

/* How many days back each range reaches; ALL is clamped to the oath date. */
/* Analytics shows everything since day one. dailyKept clamps to the date the
   commitment was made, so this is simply "all of it". */
const ALL_TIME = 3650;


const NIGHT_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const PROTECTION = { until: 'Until 8:00 AM', left: '8h 42m', progress: 38 };

// ---------------------------------------------------------------- state

const S = {
  tab: 'home',
  anCard: null,        // open analytics detail page: null | 1 | 2 | 3
  daysSworn: loadProgress().daysSworn,
  interventionSeconds: 60,
  view: 'home',        // home | protected | running | lapse
  ivMode: null,        // 'voluntary' | 'bypass'
  ivOathId: null,
  ivAction: '',
  left: 60,
  draft: null,         // the oath being created/edited, or null
  sheetFrom: null,     // tab the oath sheet was opened from
  sheetError: null,    // why a commitment could not be saved
  sheetSection: null,  // expanded sheet row: null | 'time' | 'until' | 'apps'
  whyOpen: false,
  whyEditing: false,
  achievementsOpen: false,
  devOpen: false,
  page: null,          // 'account' | 'support' | 'terms' | 'privacy'
  screenTimeAuthorized: false
};

let timer = null;

// ---------------------------------------------------------------- icons

const NAV_ICONS = {
  home: '<path d="M3 10.4 12 3.2l9 7.2V21H3z"/><path d="M9.4 21v-6.2h5.2V21"/>',
  commitments: '<path d="M12 3.2 19 6v5.8c0 4.4-2.9 7.4-7 9-4.1-1.6-7-4.6-7-9V6z"/><path d="M9 12.1l2.3 2.3 4.2-4.5"/>',
  analytics: '<path d="M4 20.2V13"/><path d="M10 20.2V5.4"/><path d="M16 20.2v-5"/><path d="M21.2 20.2H2.8"/>',
  settings: '<circle cx="12" cy="12" r="3.1"/><path d="M12 3v2.1M12 18.9V21M3 12h2.1M18.9 12H21M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5"/>'
};

const TROPHY = '<path d="M7.5 4h9v4.6a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.4H5.2a2.4 2.4 0 0 0 2.4 3.9M16.5 5.4h2.3a2.4 2.4 0 0 1-2.4 3.9"/><path d="M12 13.2V16M9 20h6M10.2 16h3.6l.5 4h-4.6z"/>';
const CHEVRON = '<path d="M15 5l-7 7 7 7"/>';
const SHIELD_PLUS = '<path d="M12 3.2 19 6v5.8c0 4.4-2.9 7.4-7 9-4.1-1.6-7-4.6-7-9V6z"/><path d="M12 9v5M9.5 11.5h5"/>';
const HEART = '<path d="M12 20s-6.6-4-6.6-9A3.9 3.9 0 0 1 12 8.4a3.9 3.9 0 0 1 6.6 2.6c0 5-6.6 9-6.6 9z"/>';
const MOON = '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>';
const LOCK = '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7"/>';
const PENCIL = '<path d="M16.5 4.5l3 3L9 18l-4 1 1-4z"/>';
const PERSON = '<circle cx="12" cy="9" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>';
const PARTNER = '<path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H7.4A3.4 3.4 0 0 0 4 18.4V20"/><circle cx="10" cy="8" r="3.2"/><path d="M19.5 20v-1.4a3.3 3.3 0 0 0-2.5-3.2"/>';
const CROSS = '<path d="M12 3.5v17"/><path d="M7 8.5h10"/>';
const BELL = '<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5z"/><path d="M10.3 19a2 2 0 0 0 3.4 0"/>';
const EXPORT = '<path d="M12 15V4"/><path d="M8.5 7.5 12 4l3.5 3.5"/><path d="M4.5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V15"/>';
const HELP = '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.6a2.3 2.3 0 1 1 3 2.2v1.3"/><path d="M12.8 16.2h-.01"/>';
const STAR = '<path d="m12 4.2 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.5l-4.8 2.6.9-5.4L4.2 9.9l5.4-.8z"/>';
const DOC = '<path d="M6.5 3.8h7l4 4v12.4h-11z"/><path d="M13.5 3.8v4h4"/>';
const PLUS = '<path d="M12 5.5v13M5.5 12h13"/>';
const WRENCH = '<path d="M14.7 6.3a4 4 0 0 1-5.3 5.3L5 16v3h3l4.4-4.4a4 4 0 0 1 5.3-5.3l-2.3 2.3-1.4-1.4z"/>';
const CARD = '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10.5h18"/>';
const REPLAY = '<path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1"/><path d="M3.5 19v-5h5"/>';
const SHIELD_OFF = '<path d="M12 3.2 19 6v5.8c0 4.4-2.9 7.4-7 9-4.1-1.6-7-4.6-7-9V6z"/><path d="M4 4l16 16"/>';
const SHIELD_CHECK = '<path d="M12 3.2 19 6v5.8c0 4.4-2.9 7.4-7 9-4.1-1.6-7-4.6-7-9V6z"/><path d="M9 12.1l2.3 2.3 4.2-4.5"/>';

const DIM = 'rgba(242,240,236,.55)';

/* Present only in DEBUG builds. The native host sets __swornDebug under
   #if DEBUG; ?debug=1 is the equivalent when previewing in a browser.
   Both are moot in Release — dev.js is stripped from that bundle, so
   window.SwornDev does not exist and this is false however it is asked. */
const DEV = typeof window !== 'undefined'
  && !!window.SwornDev
  && (window.__swornDebug === true || /[?&]debug=1\b/.test(window.location.search));

const svg = (paths, size, color, width) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color || 'currentColor'}" stroke-width="${width || 1.6}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

// ---------------------------------------------------------------- helpers

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const on = (cond) => (cond ? ' is-on' : '');

/** Highest tier the current streak has reached. */
function currentTier() {
  let idx = 0;
  TIERS.forEach((t, i) => { if (S.daysSworn >= t.at) idx = i; });
  return idx;
}

/** Per-tier visual values. v2 shows every tier fully lit, earned or not. */
function tierView(i) {
  const d = TIERS[i];
  // Earned rides the best run ever, so a lapse cannot un-earn a medal.
  const best = loadProgress().best;
  const earned = best >= d.at;
  const isCur = i === currentTier();
  return {
    ...d,
    earned,
    isCur,
    accentSoft: d.accent + '47',
    glow: `radial-gradient(circle, ${d.accent}4d 0%, rgba(0,0,0,0) 68%)`,
    ring: `conic-gradient(from 0deg, ${d.a1}, ${d.a2}22 22%, ${d.a1}cc 48%, ${d.a2}22 72%, ${d.a1})`,
    big: isCur ? S.daysSworn : earned ? (d.next || d.at) : d.at,
    caption: isCur
      ? (S.daysSworn === 1 ? B().streakLabel.replace('DAYS', 'DAY') : B().streakLabel)
      : earned ? 'DAYS CLEARED' : 'DAYS REQUIRED',
    numShadow: `0 2px 26px ${d.accent}66`
  };
}

function toggle(list, value) {
  const i = list.indexOf(value);
  if (i === -1) list.push(value); else list.splice(i, 1);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const sameDays = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/** "Every day", "Weekdays", … or a plain list. */
function scheduleLabel(days) {
  const d = [...days].sort((a, b) => a - b);
  if (!d.length) return 'Never';
  if (d.length === 7) return 'Every day';
  if (sameDays(d, [1, 2, 3, 4, 5])) return 'Weekdays';
  if (sameDays(d, [0, 6])) return 'Weekends';
  if (sameDays(d, [0, 1, 2, 3, 4])) return 'Weeknights';
  return d.map((i) => DAY_NAMES[i]).join(', ');
}

/** Every app covered by an active oath. */
function lockedApps() {
  const set = [];
  OATHS.forEach((o) => { if (o.on) o.apps.forEach((a) => { if (!set.includes(a)) set.push(a); }); });
  return set;
}

/** The active oath that locks soonest, by clock time. */
const hhmmToMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

/* Whether a commitment is blocking at this exact moment. A window that runs
   past midnight belongs to the day it started on, so 20:00–06:00 set for
   Monday is still Monday's window at two on Tuesday morning. */
function isLockActive(o, now = new Date()) {
  if (!o.on || !o.days.length) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = hhmmToMinutes(o.time);
  const end = hhmmToMinutes(o.until);
  const today = now.getDay();
  const yesterday = (today + 6) % 7;

  if (end > start) return o.days.includes(today) && mins >= start && mins < end;
  // crosses midnight: the evening half is today's, the morning half yesterday's
  return (o.days.includes(today) && mins >= start)
      || (o.days.includes(yesterday) && mins < end);
}

/** The commitment blocking right now, if any. */
function activeLock(now = new Date()) {
  return OATHS.find((o) => isLockActive(o, now)) || null;
}

/** Minutes until a commitment next begins, ignoring one already running. */
function minutesUntilStart(o, now = new Date()) {
  if (!o.on || !o.days.length) return Infinity;
  const start = hhmmToMinutes(o.time);
  for (let ahead = 0; ahead < 8; ahead++) {
    const day = new Date(now);
    day.setDate(day.getDate() + ahead);
    if (!o.days.includes(day.getDay())) continue;
    day.setHours(0, 0, 0, 0);
    const at = day.getTime() + start * 60_000;
    if (at > now.getTime()) return Math.round((at - now.getTime()) / 60_000);
  }
  return Infinity;
}

/** The commitment that starts soonest — genuinely next, not earliest by clock. */
function nextLock(now = new Date()) {
  const live = OATHS.filter((o) => o.on && o.days.length);
  if (!live.length) return null;
  return live.slice().sort((a, b) => minutesUntilStart(a, now) - minutesUntilStart(b, now))[0];
}

/** "in 3h 20m" — how long until a window opens. */
function untilLabel(minutes) {
  if (!isFinite(minutes)) return '';
  if (minutes < 60) return `in ${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `in ${h}h ${m}m` : `in ${h}h`;
}

/** 12-hour label for a "HH:MM" string. */
function clock12(t) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ---------------------------------------------------------------- backdrop

function backdrop() {
  if (S.achievementsOpen || S.whyOpen || S.anCard) return '<div class="bd-base"></div>';
  if (S.tab !== 'home') return '<div class="bd-flat"></div>';
  return `
    <div class="bd-base"></div>
    <div class="bd-nebula"></div>
    <div class="bd-clouds"></div>
    <div class="bd-stars-a"></div>
    <div class="bd-stars-b"></div>
    <div class="bd-fade"></div>`;
}


// ---------------------------------------------------------------- native bridge

/* Inside the iOS app a native host is present and real Screen Time blocking is
   available. In a plain browser there is none, so the app picker falls back to
   a mock list purely so the design can still be previewed. */
const NATIVE = typeof window !== 'undefined' && window.__swornNative === true;
const native = (msg) => window.webkit?.messageHandlers?.sworn?.postMessage(msg);

/** oath id -> how many apps/categories Screen Time is covering. */
let shieldCounts = {};

/* What iOS actually accepted, per commitment. A window it refused is worse
   than useless: the app would claim protection that never arms and never
   lifts, which is exactly what a shorter-than-allowed window did. */
let armedStatus = {};

const MIN_WINDOW_MINUTES = 15;

/** Minutes a window covers, counting one that runs past midnight. */
function windowMinutes(from, to) {
  const [ah, am] = from.split(':').map(Number);
  const [bh, bm] = to.split(':').map(Number);
  const a = ah * 60 + am;
  const b = bh * 60 + bm;
  return b > a ? b - a : (24 * 60 - a) + b;
}

/** Plain English for anything stopping a commitment from protecting. */
function armedProblem(oath) {
  if (!oath.on) return '';
  if (windowMinutes(oath.time, oath.until) < MIN_WINDOW_MINUTES) {
    return `Too short to run. iOS needs at least ${MIN_WINDOW_MINUTES} minutes.`;
  }
  if (!oath.days.length) return 'No nights chosen, so it never runs.';
  if (!shieldCount(oath)) return 'No apps chosen, so nothing is blocked.';
  const state = armedStatus[oath.id];
  if (state === 'failed') return 'iOS refused this schedule. Try different hours.';
  return '';
}

window.sworn = {
  /* Where a tapped notification wanted to go. */
  onRoute(route) {
    if (route === 'achievements') { S.tab = 'home'; S.achievementsOpen = true; }
    else if (route === 'why') { S.tab = 'home'; S.whyOpen = true; }
    else if (route === 'commitments') { S.tab = 'commitments'; }
    else { S.tab = 'home'; }
    render();
  },

  onNotifyPermission() { render(); },

  onArmed(status) { armedStatus = status || {}; render(); },

  onNotifyList(list) { if (typeof SwornDev !== 'undefined') SwornDev.setScheduled(list); },

  onRestore(data) {
    try {
      if (!data || typeof data !== 'object') return;
      const older = (a, b) => (a && b ? Math.min(a, b) : a || b || null);
      const prof = data.profile || {};

      const p = loadProgress();
      const serverOath = prof.oath_at ? Date.parse(prof.oath_at) : null;
      const serverSince = prof.streak_since ? Date.parse(prof.streak_since) : null;
      const oathAt = older(p.oathAt, serverOath);
      const since = older(p.since, serverSince);
      if (oathAt !== p.oathAt || since !== p.since) saveProgress({ since, oathAt });

      const why = loadWhy();
      let touched = false;
      if (!why.text && prof.why_text) { why.text = prof.why_text; touched = true; }
      if (!why.cost && prof.cost) { why.cost = prof.cost; touched = true; }
      ['reasons', 'goals', 'triggers'].forEach((k) => {
        if (!why[k].length && Array.isArray(prof[k]) && prof[k].length) { why[k] = prof[k]; touched = true; }
      });
      if (touched) saveWhy(why);
      if (!behaviorChosen() && prof.behavior) saveBehavior(prof.behavior);

      const u = loadUrge();
      (data.events || []).forEach((e) => {
        const at = Date.parse(e.at);
        if (!at) return;
        if (e.type === 'protection_used' && !u.log.includes(at)) u.log.push(at);
        else if (e.type === 'temptation_resisted' && !u.resists.includes(at)) u.resists.push(at);
        else if (e.type === 'commitment_broken' && !u.lapses.some((l) => l.at === at)) u.lapses.push({ at, note: '', reason: e.reason || '' });
      });
      saveUrge(u);

      // Schedules restore; app selections cannot (Apple's tokens are
      // device-bound), so restored oaths wait for a re-pick.
      if (!(loadOaths() || []).length && (data.oaths || []).length) {
        saveOaths(data.oaths.map((o) => ({
          id: o.oath_id, name: o.name || 'Protection',
          time: o.lock_at || '20:00', until: o.unlock_at || '06:00',
          days: Array.isArray(o.days) ? o.days : [], apps: [],
          on: o.enabled !== false
        })));
        OATHS.length = 0;
        (loadOaths() || []).forEach((o) => OATHS.push(o));
        syncShields();
      }

      S.daysSworn = loadProgress().daysSworn;
      render();
    } catch (e) { /* a failed restore must never break the app */ }
  },
  onAuth(granted) {
    S.screenTimeAuthorized = granted;
    render();
  },
  onCounts(counts) {
    shieldCountsReady = true;
    shieldCounts = counts || {};
    render();
  }
};

/** How many things an oath actually blocks. */
function shieldBreakdown(oath) {
  if (!oath) return null;
  return NATIVE ? (shieldCounts[oath.id] || null) : { apps: oath.apps.length };
}

function shieldCount(oath) {
  if (!oath) return 0;
  return NATIVE ? selectionTotal(shieldCounts[oath.id]) : oath.apps.length;
}

/** Hand the device the current schedule. Every change routes through here. */
/** The payload both the shields and the scheduler are built from. */
function oathPayload() {
  return OATHS.map((o) => ({ id: o.id, name: o.name, time: o.time, until: o.until,
                             days: o.days, on: o.on, appCount: shieldCount(o) }));
}

function syncShields() {
  /* A running urge shield covers the union of every selection. Once the last
     one is gone it protects nothing, so it must not keep claiming to — the
     native side lowers it on the same condition. */
  if (!anythingShielded() && urgeRemaining() > 0) {
    endUrge();
    if (NATIVE) native({ action: 'urgeClear' });
  }
  syncNotifications(oathPayload());
  if (!NATIVE) return;
  native({ action: 'sync', oaths: oathPayload() });
}

// ---------------------------------------------------------------- home

/* Three states, in order of urgency: an urge shield running now, a scheduled
   window armed for later, or nothing set up yet. */
function protectionCard() {
  const left = anythingShielded() ? urgeRemaining() : 0;

  if (left > 0) {
    const total = URGE_MINUTES * 60_000;
    const pct = Math.max(2, Math.round((left / total) * 100));
    return `
      <button type="button" class="card prot" data-act="tab" data-tab="commitments">
        <span style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <span style="display:block">
            <span class="prot__on"><i></i>PROTECTED · URGE</span>
            <span style="display:block;margin-top:9px" class="prot__until">Until ${urgeUntilLabel()}</span>
          </span>
          <span style="display:flex;align-items:center;gap:10px;flex:0 0 auto">
            <span style="display:block;text-align:right">
              <span class="prot__left" style="display:block">${minutesLabel(left)}</span>
              <span style="display:block;margin-top:4px;font-size:13px;font-weight:400;color:rgba(235,235,245,.5)">remaining</span>
            </span>
            <span class="chev">›</span>
          </span>
        </span>
        <span class="prot__track" style="display:block"><i style="width:${pct}%"></i></span>
      </button>`;
  }

  /* Green means blocking right now, and nothing else. A commitment that has
     not opened yet is real but dormant, and colouring it like live protection
     told the user they were covered when they were not. */
  const live = activeLock();
  const lock = live || nextLock();
  if (lock) {
    const starts = live ? '' : untilLabel(minutesUntilStart(lock));
    return `
      <button type="button" class="card prot" data-act="tab" data-tab="commitments">
        <span style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <span style="display:block">
            <span class="prot__on${live ? '' : ' prot__on--idle'}"><i></i>${live ? 'PROTECTED NOW' : 'SCHEDULED'}</span>
            <span style="display:block;margin-top:9px" class="prot__until">${esc(lock.time)} – ${esc(lock.until)}</span>
          </span>
          <span style="display:flex;align-items:center;gap:10px;flex:0 0 auto">
            <span style="display:block;text-align:right">
              <span class="prot__left" style="display:block">${shieldCount(lock)}</span>
              <span style="display:block;margin-top:4px;font-size:13px;font-weight:400;color:rgba(235,235,245,.5)">${esc(selectionCaption(shieldBreakdown(lock)))}</span>
            </span>
            <span class="chev">›</span>
          </span>
        </span>
        <span style="display:block;margin-top:12px;font-size:13px;color:rgba(235,235,245,.5)">${live ? 'Blocking now' : `Starts ${esc(starts)}`} · ${esc(scheduleLabel(lock.days))}</span>
      </button>`;
  }

  return `
    <button type="button" class="card prot" data-act="tab" data-tab="commitments">
      <span style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <span style="display:block">
          <span class="prot__on prot__on--off"><i></i>NOT PROTECTED</span>
          <span style="display:block;margin-top:9px" class="prot__until">Set a window</span>
        </span>
        <span class="chev">›</span>
      </span>
      <span style="display:block;margin-top:12px;font-size:13px;color:rgba(235,235,245,.5)">Choose the hours you know are hardest.</span>
    </button>`;
}

/** Urge shields raised in the last 30 days. */
function urgeSaves() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return loadUrge().log.filter((t) => t >= cutoff).length;
}

const minutesLabel = (ms) => {
  const mins = Math.max(1, Math.round(ms / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
};

function homeTab() {
  const t = tierView(currentTier());

  return `
    <div class="scroll" style="top:var(--safe-top);bottom:var(--nav-h);padding:0">
      <div class="scroll__breathe">
      <div class="apphead">
        <div class="apphead__mark${USER.name ? ' apphead__mark--greet' : ''}">${esc(greeting())}</div>
        <button type="button" class="icon-btn" style="width:40px;height:40px" data-act="achievements-open" aria-label="Achievements">
          ${svg(TROPHY, 28, '#fff')}
        </button>
      </div>

      <div class="seal-wrap">
        <div class="seal">
          <div class="seal__ambient"></div>
          <div class="seal__ground"></div>
          <div class="seal__glow" style="background:${t.glow}"></div>
          <div class="seal__ring" style="background:${t.ring}"></div>
          <div class="seal__core" style="background:${t.core}"></div>
          <div class="seal__spec"></div>
          <div class="seal__conic"></div>
          <div class="seal__shade"></div>
          <div class="seal__rim"></div>
          <div class="seal__underglow" style="background:radial-gradient(ellipse at 50% 50%, ${t.accentSoft} 0%, rgba(0,0,0,0) 70%)"></div>
          ${t.facets ? '<div class="seal__facets"></div>' : ''}
          <div class="seal__hairline" style="border-color:${t.accentSoft}"></div>
          <div class="seal__label">
            <span class="seal__big" style="color:#f4e6c8;text-shadow:${t.numShadow}">${t.big}</span>
            <span class="seal__caption">${t.caption}</span>
          </div>
        </div>
      </div>

      <div class="vow">“${esc(whyText())}”</div>

      ${protectionCard()}

      <div class="actions">
        <button type="button" class="card action" data-act="sheet-new">
          ${svg(SHIELD_PLUS, 22, DIM)}
          <div class="action__name">Add protection</div>
          <div class="action__sub">Lock another app or hour</div>
        </button>
        <button type="button" class="card action" data-act="why-open">
          ${svg(HEART, 22, DIM)}
          <div class="action__name">My why</div>
          <div class="action__sub">Revisit your reason</div>
        </button>
      </div>

      ${(() => {
        /* Nothing to block means nothing to activate. Offering the button
           here would either lie about raising protection or waste the one
           moment the user actually reached for help. */
        const armed = anythingShielded();
        return `
      <div style="position:relative;margin:14px 20px 0">
        <button type="button" class="tempted${armed ? '' : ' tempted--off'}"
          ${armed ? 'data-act="tempted"' : 'disabled aria-disabled="true"'}>I'm tempted</button>
        ${armed ? '' : '<div class="tempted__note">Add protection first. Sworn has nothing to block yet.</div>'}
      </div>`;
      })()}
      <div style="height:12px"></div>
      </div>
    </div>`;
}

function whyPage() {
  if (!S.whyOpen) return '';
  const why = loadWhy();
  const picked = whyReasons();

  const body = S.whyEditing ? `
      <div class="why-label">Your why, in your own words</div>
      <textarea class="why-edit" id="whyedit" placeholder="${esc(WHY_FALLBACK)}">${esc(why.text)}</textarea>
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:9px">
        <button type="button" class="pill-btn pill-btn--primary" data-act="why-save">Save</button>
        <button type="button" class="pill-btn pill-btn--plain" data-act="why-cancel">Cancel</button>
      </div>` : `
      <div class="why-label">Remember why you are doing this</div>
      <div class="why-quote">“${esc(whyText())}”</div>
      ${picked.length ? `<div class="why-chips">${picked.map((i) => `<span>${esc(reasonLabels()[i])}</span>`).join('')}</div>` : ''}
      <div class="why-meta">${(() => {
        const oathAt = loadProgress().oathAt;
        const days = oathAt ? Math.max(0, Math.floor((Date.now() - oathAt) / 864e5)) : 0;
        return `Written when you made your commitment, ${days} ${days === 1 ? 'day' : 'days'} ago.`;
      })()}</div>
      <div class="why-rule"></div>
      <button type="button" class="pill-btn pill-btn--plain" data-act="why-edit">Edit my why</button>`;

  return `
    <div class="page">
      <div class="bd-ach"></div>
      <div class="bd-ach-stars"></div>

      <div class="page__head">
        <button type="button" class="icon-btn" style="width:34px;height:34px" data-act="why-close" aria-label="Back">
          ${svg(CHEVRON, 22, '#fff', 1.9)}
        </button>
        <div class="page__title">MY WHY</div>
      </div>

      <div class="page__body">${body}</div>
    </div>`;
}

// ---------------------------------------------------------------- achievements

function achievements() {
  if (!S.achievementsOpen) return '';
  const cur = currentTier();

  return `
    <div class="page">
      <div class="bd-ach"></div>
      <div class="bd-ach-stars"></div>

      <div class="page__head">
        <button type="button" class="icon-btn" style="width:34px;height:34px" data-act="achievements-close" aria-label="Back">
          ${svg(CHEVRON, 22, '#fff', 1.9)}
        </button>
        <div class="page__title">ACHIEVEMENTS</div>
      </div>

      <div class="page__body">
        ${TIERS.map((d, i) => {
          const t = tierView(i);
          return `
          <div class="tl">
            <div class="tl__rail">
              <div class="tl__seal">
                <div class="tl__glow" style="background:${t.glow}"></div>
                <div class="tl__ring" style="background:${t.ring}"></div>
                <div class="tl__core" style="background:${t.core}"></div>
                <div class="tl__spec"></div>
                <div class="tl__conic"></div>
                <div class="tl__hairline" style="border-color:${t.accentSoft}"></div>
                <div class="tl__n" style="color:#f4e6c8">${d.at}</div>
              </div>
              ${i < TIERS.length - 1 ? `<div class="tl__line" style="background:linear-gradient(180deg, ${t.accentSoft}, rgba(255,255,255,.08))"></div>` : ''}
            </div>
            <div class="tl__body">
              <div style="display:flex;align-items:center;gap:9px">
                <div class="tl__name" style="color:${d.accent}">${d.name}</div>
                ${i === cur ? '<div class="tl__now">NOW</div>' : t.earned ? '<div class="tl__now" style="color:#34c759;border-color:rgba(52,199,89,.4)">EARNED</div>' : ''}
              </div>
              <div class="tl__req">${d.at === 0 ? 'From the day you committed' : d.at + ' days kept'}</div>
              <div class="tl__copy"><b style="color:rgba(242,240,236,.86);font-weight:600">${esc(B().tierLines[i])}</b> ${esc(TIER_COPY[i])}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ---------------------------------------------------------------- intervention

/** Which of the four intervention phases the countdown is in. */
/* The 60-second intervention.
   One continuous screen. The content moves through four stages while the
   countdown runs; nothing is a separate page, and there is no way out of it
   until the clock reaches zero. */

const PHYSICAL_ACTIONS = [
  'Stand up.',
  'Get a glass of water.',
  'Put your phone down.',
  'Leave the room.'
];

const FAITH_VERSE = ['“Flee from sexual immorality.”', '1 Corinthians 6:18'];

/** Which stage the clock is in. Boundaries are seconds, not fractions. */
function stageFor(elapsed) {
  if (elapsed < 10) return 'interrupt';
  if (elapsed < 30) return 'remember';
  if (elapsed < 50) return 'act';
  return 'decide';
}

/** The stage body. Rendered only when the stage changes, so it can fade. */
/* Supporting copy is revealed as one continuous flow: every character fades
   in over ~380ms while its neighbour starts milliseconds later, so the eye
   reads a smooth wavefront writing across the line, never word-by-word
   stepping. Words sit in unbreakable wrappers so wrapping cannot split a
   word, and the whole sentence lives in aria-label; spans are presentation
   only. */
function reveal(cls, text) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const markup = words.map((w) => `<span class="rww">${[...w]
    .map((c) => `<span class="rc">${esc(c)}</span>`).join('')}</span>`).join(' ');
  return `<div class="${cls} rvl" aria-label="${esc(text)}"><span aria-hidden="true">${markup}</span></div>`;
}

function stageBody(stage) {
  switch (stage) {
    case 'interrupt':
      return `
        <div class="iv__wait">WAIT.</div>
        ${reveal('iv__line', 'You made a commitment to yourself.')}`;

    case 'remember':
      return `
        <div class="iv__lead">Remember why you started.</div>
        ${reveal('iv__quote', '“' + whyText() + '”')}
        ${faithMode() ? `
        <div class="iv__verse">
          ${reveal('iv__verse-text', FAITH_VERSE[0])}
          ${reveal('iv__verse-ref', FAITH_VERSE[1])}
        </div>` : ''}
        ${reveal('iv__line', 'That reason still matters right now.')}`;

    case 'act':
      return `
        <div class="iv__lead">Don't sit here fighting it.</div>
        ${reveal('iv__action', S.ivAction)}`;

    default:
      return `
        <div class="iv__decide">${esc(B().interventionLine)}</div>
        ${reveal('iv__decide iv__decide--soft', 'What do you want to choose?')}`;
  }
}

/* The reveal engine. Each line gets a continuous character schedule on the
   wall clock: 1.6 to 4 seconds per line depending on length, characters
   overlapping so the flow never steps. Every stage finishes with quiet time
   to spare, backgrounding fast-forwards instead of freezing, the countdown
   is never touched, and nothing can be tapped through.

   Haptics are a native session rather than per-word bridge spam: as a line
   starts revealing, one message asks the host to run a stream of very soft
   pulses for exactly that line's duration, so the phone is quietly writing
   the words into the hand. Catch-up after a resume sends nothing. */
const STAGE_BOUNDS = { interrupt: [0, 10], remember: [10, 30], act: [30, 50], decide: [50, Infinity] };
let revealTick = null;

function armReveal() {
  clearInterval(revealTick);
  const host = document.getElementById('ivstage');
  if (!host || S.view !== 'running') return;
  const lines = [...host.querySelectorAll('.rvl')]
    .map((el) => ({ el, chars: [...el.querySelectorAll('.rc')] }))
    .filter((line) => line.chars.length);
  if (!lines.length) return;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lines.forEach((line) => line.chars.forEach((c) => c.classList.add('on')));
    return;
  }

  const total = S.interventionSeconds;
  const elapsed = total - S.left;
  const [rawStart, rawEnd] = STAGE_BOUNDS[stageFor(elapsed)];
  const stageStartAt = S.ivEndsAt - (total - Math.min(rawStart, total)) * 1000;
  const stageEndAt = S.ivEndsAt - (total - Math.min(rawEnd, total)) * 1000;

  const FADE = 380;
  const LINE_GAP = 300;
  const LEAD_IN = 450;

  /* Each line at its natural pace, compressed only when the stage is too
     short to hold it with at least 1.5s of reading silence at the end. */
  let plan = lines.map((line) => Math.min(4000, Math.max(2000, line.chars.length * 55)));
  const gaps = LEAD_IN + LINE_GAP * (lines.length - 1);
  const planned = plan.reduce((a, b) => a + b, 0) + gaps;
  const available = (stageEndAt - stageStartAt) - 1500;
  if (planned > available) {
    const scale = Math.max(0.2, (available - gaps) / (planned - gaps));
    plan = plan.map((d) => d * scale);
  }

  let cursor = stageStartAt + LEAD_IN;
  lines.forEach((line, i) => {
    // Capped so even a short line keeps a continuous wavefront: with a 380ms
    // fade, 65ms apart means ~6 characters are always mid-fade together.
    const stagger = Math.min(65, Math.max(4, (plan[i] - FADE) / line.chars.length));
    line.startAt = cursor;
    line.chars.forEach((c, ci) => { c.dataset.at = String(cursor + ci * stagger); });
    line.endAt = cursor + line.chars.length * stagger + FADE;
    line.hapticSent = false;
    cursor = line.endAt + LINE_GAP;
  });

  revealTick = setInterval(() => {
    if (S.view !== 'running' || !document.getElementById('ivstage')) {
      clearInterval(revealTick);
      if (NATIVE) native({ action: 'haptic', ms: 0 });
      return;
    }
    const now = Date.now();
    let pending = 0;
    lines.forEach((line) => {
      if (!line.hapticSent && line.startAt <= now) {
        line.hapticSent = true;
        const remaining = line.endAt - now;
        // catching up after a resume reveals at once and buzzes nothing
        if (NATIVE && remaining > 300) native({ action: 'haptic', ms: remaining });
      }
      line.chars.forEach((c) => {
        if (c.classList.contains('on')) return;
        if (Number(c.dataset.at) <= now) c.classList.add('on');
        else pending += 1;
      });
    });
    if (!pending) clearInterval(revealTick);
  }, 40);
}


/** The decision, revealed only once the countdown is spent. */
function decisionBar() {
  /* Before zero there is exactly one way out, and it is the right one.
     The countdown exists to stop an impulsive decision to give in, not to
     trap someone who has already chosen to keep their word — so leaving
     early is offered, quietly, and only ever in that direction. */
  if (S.left > 0) {
    return `
      <div class="iv__decision iv__decision--early">
        <button type="button" class="iv__stay" data-act="iv-back">I'm staying on track</button>
      </div>`;
  }
  if (S.ivMode === 'bypass') {
    return `
      <div class="iv__decision">
        <button type="button" class="iv__primary" data-act="iv-back">Go Back</button>
        <button type="button" class="iv__secondary" data-act="iv-continue">Continue Anyway</button>
      </div>`;
  }
  return `
    <div class="iv__decision">
      <button type="button" class="iv__primary" data-act="iv-back">Go Back</button>
      <button type="button" class="iv__secondary iv__secondary--quiet" data-act="lapse">I gave in</button>
    </div>`;
}

/* Whether any stored selection could shield anything right now. Until the
   first counts arrive from the native side, assume yes rather than flash a
   false "nothing picked". */
let shieldCountsReady = false;

function anythingShielded() {
  /* Only a selection belonging to a commitment that exists and is switched on
     counts. Reading the stored counts alone would let a leftover selection —
     one whose commitment was deleted — keep the app claiming protection. */
  const live = OATHS.filter((o) => o.on);
  if (!live.length) return false;
  if (!NATIVE) return live.some((o) => o.apps.length > 0);
  if (!shieldCountsReady) return true;
  return live.some((o) => selectionTotal(shieldCounts[o.id]) > 0);
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 46;

function intervention() {
  if (S.view === 'home') return '';

  /* Tapping "I'm tempted" is a success, not a confession. The first thing the
     user sees is that it worked, and that the decision is already taken. */
  if (S.view === 'protected') {
    const covered = anythingShielded();
    return `
      <div class="intervene intervene--won">
        <div class="won__ring">${svg(SHIELD_CHECK, 40, '#34c759', 1.8)}</div>
        <div class="won__title">${covered ? 'PROTECTION ACTIVATED' : 'URGE CAUGHT'}</div>
        <div class="won__body">${esc(B().tempted)}</div>
        ${covered ? `
        <div class="won__card">
          <div class="won__label">YOUR PROTECTED APPS ARE BLOCKED</div>
          <div class="won__until">Until ${urgeUntilLabel()}</div>
          <div class="won__note">${minutesLabel(urgeRemaining())} of protection · you don't need to act on this feeling</div>
        </div>` : `
        <div class="won__card">
          <div class="won__label">NOTHING IS BLOCKED YET</div>
          <div class="won__until">No apps picked</div>
          <div class="won__note">Choose apps under Add protection so this moment can actually lock them</div>
        </div>`}
        <button type="button" class="cta-gold" style="margin-top:auto" data-act="pause">TAKE 60 SECONDS</button>
        <button type="button" style="margin-top:14px;background:none;border:0;color:rgba(242,240,236,.4);font-family:var(--sf);font-size:14px;cursor:pointer" data-act="cancel">I'm alright now</button>
      </div>`;
  }

  if (S.view === 'lapse') return lapseScreen();

  const total = S.interventionSeconds;
  const elapsed = total - S.left;
  const stage = stageFor(elapsed);
  const offset = RING_CIRCUMFERENCE * (elapsed / total);

  return `
    <div class="iv" data-stage="${stage}">
      <div class="iv__clock">
        <svg class="iv__ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="iv__track" cx="50" cy="50" r="46"></circle>
          <circle class="iv__fill" cx="50" cy="50" r="46"
            stroke-dasharray="${RING_CIRCUMFERENCE.toFixed(2)}"
            stroke-dashoffset="${offset.toFixed(2)}"></circle>
        </svg>
        <div class="iv__count" role="timer" aria-live="off">${S.left}</div>
      </div>

      <div class="iv__stage" id="ivstage">${stageBody(stage)}</div>

      <div class="iv__foot" id="ivfoot">${decisionBar()}</div>
    </div>`;
}


/* Not a verdict. They already know what happened; this asks one structured
   question so the pattern can be seen later, gives them their own words back,
   and offers the way to start again. */
const LAPSE_REASONS = [
  ['urge', 'I gave in to an urge'],
  ['bypass', 'I bypassed protection'],
  ['unrealistic', 'My commitment was unrealistic'],
  ['other', 'Something else']
];

function lapseScreen() {
  return `
    <div class="intervene intervene--calm">
      <div class="lapse__title">You gave in.</div>
      <div class="lapse__said">You said:</div>
      <div class="lapse__quote">“${esc(whyText())}”</div>
      <div class="lapse__ask">${esc(B().failureLine)}</div>
      <div class="lapse__reasons" role="radiogroup" aria-label="What happened">
        ${LAPSE_REASONS.map(([id, label]) => `
          <button type="button" class="reason-row${on(S.lapseReason === id)}" data-act="lapse-reason" data-reason="${id}"
            role="radio" aria-checked="${S.lapseReason === id}">
            <span class="reason-row__dot"></span>
            <span>${esc(label)}</span>
          </button>`).join('')}
      </div>
      <textarea class="why-edit" id="lapsenote" placeholder="Optional. Only you ever see this."
        style="${S.lapseReason === 'other' ? '' : 'display:none'}"></textarea>
      <button type="button" class="cta-gold${S.lapseReason ? '' : ' cta-gold--muted'}" style="margin-top:auto"
        id="lapsecta" data-act="again"${S.lapseReason ? '' : ' disabled'}>START AGAIN</button>
      <div class="lapse__foot">Your day counter starts again. Your commitment, your history and your locks all stay.</div>
    </div>`;
}

// ---------------------------------------------------------------- analytics

function analyticsTab() {
  const STATS = analyticsStats();

  if (!STATS.hasData) {
    return `
      <div class="an-head">
        <div class="an-head__title">YOUR RECORD</div>
        <div class="an-head__sub">Three measures of how you are actually behaving.</div>
      </div>
      <div class="scroll" style="top:calc(96px + var(--safe-top));bottom:var(--nav-h);padding:14px 20px 24px">
        <div class="empty">Nothing to measure yet.<br>Your record starts with your first protected night.</div>
      </div>`;
  }

  /* Each day was either kept or it was not, so it is drawn that way: one
     cell per day, filled when kept and marked when broken. Rendering binary
     data as full-height bars produced a solid white block that said nothing. */
  const bars = dailyKept(ALL_TIME);
  const gap = bars.length > 40 ? 1 : bars.length > 12 ? 2 : 4;

  const chart = bars.map((v, i) => {
    const kept = v === 100;
    const last = i === bars.length - 1;
    return `<div class="dc${kept ? '' : ' dc--broke'}${last ? ' dc--today' : ''}"></div>`;
  }).join('');

  const hours = urgeByHour().map((v) => {
    const bg = v > 45 ? '#e7bc6a' : v > 20 ? 'rgba(231,188,106,.42)' : 'rgba(255,255,255,.16)';
    return `<div style="height:${Math.max(4, v)}%;background:${bg}"></div>`;
  }).join('');

  const resistedPct = STATS.attempts ? Math.round((STATS.resisted / STATS.attempts) * 100) : 0;

  const card = (n, label, value, extra, body) => `
      <button type="button" class="card an-card" data-act="an-open" data-card="${n}">
        <span style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <span style="display:block">
            <span class="an-card__label" style="display:block">${label}</span>
            <span style="display:flex;margin-top:7px;align-items:baseline;gap:9px">
              <span class="an-card__big">${value}</span>
              ${extra || ''}
            </span>
          </span>
          <span class="an-card__arrow">›</span>
        </span>
        ${body}
      </button>`;

  return `
    <div class="an-head">
      <div class="an-head__title">YOUR RECORD</div>
      <div class="an-head__sub">Three measures of how you are actually behaving.</div>
    </div>


    <div class="scroll" style="top:calc(96px + var(--safe-top));bottom:var(--nav-h);padding:14px 20px 24px">
      <div class="scroll__breathe">

      ${card(1, 'Commitment rate', `${STATS.rate}<small>%</small>`,
        STATS.rateDelta === null ? '' : `<span style="font-size:12px;font-weight:600;color:${STATS.rateDelta >= 0 ? 'var(--green-tx)' : '#e88178'}">${STATS.rateDelta >= 0 ? '+' : ''}${STATS.rateDelta}</span>`,
        `<span class="daystrip" style="margin-top:16px;gap:${gap}px">${chart}</span>`)}

      <div style="height:16px"></div>
      ${card(2, 'Hardest times', esc(STATS.hardest), '',
        `<span class="hours" style="margin-top:16px">${hours}</span>
         <span class="axis"><span>6A</span><span>12P</span><span>6P</span><span>12A</span></span>`)}

      <div style="height:16px"></div>
      ${card(3, esc(B().resistedLabel), STATS.resisted,
        `<span style="font-size:13px;color:rgba(235,235,245,.45)">of ${STATS.attempts}</span>`,
        `<span class="split">
           <span style="width:${resistedPct}%;background:#fff"></span>
           <span style="width:${100 - resistedPct}%;background:rgba(255,255,255,.18)"></span>
         </span>`)}

      </div>
    </div>`;
}

/* Each measure gets its own screen rather than expanding in place, so the
   detail has room to explain itself. Same page furniture as My why and
   Achievements. */
function analyticsPage() {
  if (!S.anCard) return '';
  const STATS = analyticsStats();
  if (!STATS.hasData) return '';

  const bars = dailyKept(ALL_TIME);
  const gap = bars.length > 40 ? 1 : bars.length > 12 ? 2 : 4;
  const strip = bars.map((v, i) => `<div class="dc${v === 100 ? '' : ' dc--broke'}${i === bars.length - 1 ? ' dc--today' : ''}"></div>`).join('');
  const kept = bars.filter((v) => v === 100).length;

  const stat = (big, small) => `
    <div class="an-stat">
      <div class="an-stat__big">${big}</div>
      <div class="an-stat__small">${small}</div>
    </div>`;

  const pages = {
    1: ['COMMITMENT RATE', `
      ${stat(`${STATS.rate}<small>%</small>`, STATS.rateDelta === null
        ? 'Not enough history yet to compare against an earlier stretch.'
        : `${STATS.rateDelta >= 0 ? 'Up' : 'Down'} ${Math.abs(STATS.rateDelta)} points on the previous stretch.`)}
      <div class="an-block">
        <div class="an-block__label">EVERY DAY IN THIS RANGE</div>
        <div class="daystrip" style="margin-top:14px;gap:${gap}px">${strip}</div>
        <div class="axis" style="margin-top:10px"><span>Day one</span><span>Today</span></div>
        <div class="an-legend">
          <span><i style="background:rgba(242,240,236,.22)"></i>Kept</span>
          <span><i style="background:#d6544a"></i>Broken</span>
          <span><i style="background:#e7bc6a"></i>Today</span>
        </div>
      </div>
      <div class="an-note">${esc(STATS.rateNote)}</div>
      <div class="an-note an-note--dim">Kept ${kept} of ${bars.length}. A day counts as kept unless you recorded a lapse in it.</div>`],

    2: ['HARDEST TIMES', `
      ${stat(esc(STATS.hardest), 'The three hours that hold the most urges.')}
      <div class="an-block">
        <div class="an-block__label">BY HOUR</div>
        <div class="hours" style="margin-top:14px">${urgeByHour().map((v) => {
          const bg = v > 45 ? '#e7bc6a' : v > 20 ? 'rgba(231,188,106,.42)' : 'rgba(255,255,255,.16)';
          return `<div style="height:${Math.max(4, v)}%;background:${bg}"></div>`;
        }).join('')}</div>
        <div class="axis" style="margin-top:10px"><span>6A</span><span>12P</span><span>6P</span><span>12A</span></div>
      </div>
      <div class="an-block">
        <div class="an-block__label">BY DAY</div>
        <div class="wk" style="margin-top:14px">
          ${(() => {
            const counts = urgeByWeekday();
            const max = Math.max(...counts, 1);
            return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
              const n = counts[i];
              const heavy = n >= max * 0.8 && n > 0;
              const bg = heavy ? '#e7bc6a' : n > 0 ? 'rgba(231,188,106,.4)' : 'rgba(255,255,255,.16)';
              return `
              <span class="wk__col">
                <span class="wk__slot"><i style="height:${Math.max(6, Math.round((n / max) * 100))}%;background:${bg}"></i></span>
                <span class="wk__label">${label}</span>
              </span>`;
            }).join('');
          })()}
        </div>
      </div>
      <div class="an-note">${esc(STATS.hardestNote)}</div>
      <div class="an-note an-note--dim">Worth pointing a commitment at. Protection during your hardest window is the single change that does the most.</div>`],

    3: [B().resistedLabel.toUpperCase(), `
      ${stat(`${STATS.resisted}<small> of ${STATS.attempts}</small>`, 'Moments you met an urge and walked away.')}
      <div class="an-block">
        <div class="split" style="margin-top:0">
          <span style="width:${STATS.attempts ? Math.round((STATS.resisted / STATS.attempts) * 100) : 0}%;background:#fff"></span>
          <span style="width:${STATS.attempts ? 100 - Math.round((STATS.resisted / STATS.attempts) * 100) : 100}%;background:rgba(255,255,255,.18)"></span>
        </div>
        <div class="an-legend">
          <span><i style="background:#fff"></i>Resisted ${STATS.resisted}</span>
          <span><i style="background:rgba(255,255,255,.28)"></i>Gave in ${STATS.attempts - STATS.resisted}</span>
        </div>
      </div>
      <div class="an-block">
        <div class="an-block__label">PROTECTION ASKED FOR</div>
        <div class="an-stat__big" style="margin-top:10px">${urgeSaves()}</div>
        <div class="an-note an-note--dim" style="margin-top:6px">Times you noticed an urge and asked Sworn for cover. Each one is a save, not a slip.</div>
      </div>
      <div class="an-note">${esc(STATS.resistedNote)}</div>`]
  };

  const [title, body] = pages[S.anCard] || pages[1];

  return `
    <div class="page">
      <div class="bd-flat"></div>
      <div class="page__head">
        <button type="button" class="icon-btn" style="width:34px;height:34px" data-act="an-close" aria-label="Back">
          ${svg(CHEVRON, 22, '#fff', 1.9)}
        </button>
        <div class="page__title">${esc(title)}</div>
      </div>
      <div class="page__body">
        ${body}
        <div style="height:30px"></div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- commitments

function commitmentsTab() {
  const lock = nextLock();

  return `
    <div class="scroll" style="top:var(--safe-top);bottom:var(--nav-h);padding:0">
      <div style="position:relative;padding:24px 24px 0">
        <div class="page-title">COMMITMENTS</div>
      </div>

      <div class="card card--static nextlock">
        <div class="nextlock__eyebrow">NEXT LOCK</div>
        <div class="nextlock__time">${lock ? esc(lock.time) : '–'}</div>
        <div style="margin-top:8px;text-align:center;font-size:13px;color:rgba(242,240,236,.5)">${lock ? esc(scheduleLabel(lock.days)) : 'No active commitment'}</div>
        <div class="nextlock__foot">
          ${svg(MOON, 22, DIM)}
          <div>
            <div style="font-size:13.5px;font-weight:600">${lock ? `${esc(selectionLabel(shieldBreakdown(lock)) || 'Nothing')} lock${shieldCount(lock) === 1 ? 's' : ''} at this time` : 'Nothing is locked'}</div>
            <div style="margin-top:3px;font-size:12.5px;color:rgba(242,240,236,.45)">${lock ? esc(NATIVE ? `Locked until ${lock.until}` : (lock.apps.join(' · ') || 'No apps chosen')) : 'Turn a commitment on to protect your apps'}</div>
          </div>
        </div>
      </div>

      ${OATHS.map((o) => `
        <div class="oath">
          <button type="button" class="oath__head" data-act="oath-open" data-id="${o.id}">
            <span>${esc(o.name)}</span>
            ${svg(PENCIL, 18, 'rgba(242,240,236,.42)')}
          </button>
          <div class="oath__body">
            <div>
              <div style="font-size:12.5px;color:rgba(242,240,236,.45)">${esc(scheduleLabel(o.days))}</div>
              <div class="oath__time" style="color:${o.on ? '#f2f0ec' : 'rgba(242,240,236,.35)'}">${esc(o.time)} – ${esc(o.until)}</div>
              ${armedProblem(o) ? `<div class="oath__warn">${esc(armedProblem(o))}</div>` : ''}
            </div>
            <button type="button" class="switch${on(o.on)}" data-act="oath-toggle" data-id="${o.id}"
              role="switch" aria-checked="${o.on}" aria-label="${esc(o.name)}"><i></i></button>
          </div>
        </div>`).join('')}

      ${OATHS.length ? '' : '<div class="empty">No commitments yet. Tap + to create one.</div>'}
      <div style="height:96px"></div>
    </div>
    <button type="button" class="fab" data-act="sheet-new" aria-label="New commitment">
      ${svg(PLUS, 30, '#0a0a0b', 2.6)}
    </button>`;
}

/* ---- the oath sheet -------------------------------------------------------
   Edits a draft copy so Cancel can discard. Each row expands in place rather
   than pushing a sub-page, which keeps the whole oath visible while editing. */

const countLabel = (n) => n + (n === 1 ? ' app' : ' apps');

/* The id is reserved up front rather than assigned on save: Apple's picker
   writes its selection against an oath id, so without one there was no way to
   choose apps before saving — and no way to save, now that a commitment
   without apps is refused. A draft that is cancelled leaves a selection with
   no commitment behind it, which the next sync forgets. */
function blankOath() {
  return { id: nextFreeId(), isNew: true, name: '', time: '20:00', until: '06:00',
           days: [0, 1, 2, 3, 4, 5, 6], apps: [], on: true };
}

function oathSheet() {
  if (!S.draft) return '';
  const d = S.draft;
  const editing = !d.isNew;
  /* A commitment with no apps blocks nothing, so it is not a commitment.
     Requiring one here is what stops the app promising protection it has no
     way to deliver. */
  const picked = NATIVE ? shieldCount(d) : d.apps.length;
  const ready = d.name.trim().length > 0 && picked > 0;
  const sec = S.sheetSection;

  /* The time is the row. Tapping it opens the system wheel directly, so
     there is no expanding sub-row repeating the value underneath. */
  const timeRow = (label, field, value) => `
    <label class="tile tile--row" style="margin-top:11px">
      <span style="font-weight:600">${label}</span>
      <input type="time" class="tile-time" data-field="${field}" value="${esc(value)}">
    </label>`;

  const row = (label, value, section, icon) => `
    <button type="button" class="tile tile--row${on(sec === section)}" style="margin-top:11px" data-act="section" data-section="${section}" aria-expanded="${sec === section}">
      <span class="row__left">${icon ? svg(icon, 19, DIM) : ''}<span style="font-weight:600">${label}</span></span>
      <span class="tile__value"><span class="tile__val">${esc(value)}</span><span class="tile__chev">›</span></span>
    </button>`;

  return `
    <button type="button" class="scrim" data-act="sheet-cancel" aria-label="Close"></button>
    <div class="sheet-full" role="dialog" aria-modal="true" aria-label="${editing ? 'Edit commitment' : 'New commitment'}">
      <div class="sheet__bar">
        <button type="button" class="sheet__cancel" data-act="sheet-cancel">Cancel</button>
        <div class="sheet__title">${editing ? 'Edit commitment' : 'New commitment'}</div>
        <div style="width:78px"></div>
      </div>

      <input class="sheet-input" style="margin-top:22px" id="oathname" data-field="name"
        value="${esc(d.name)}" placeholder="Name your commitment" autocomplete="off">

      ${timeRow('Locks at', 'time', d.time)}
      ${timeRow('Unlocks at', 'until', d.until)}

      <div class="tile" style="margin-top:11px;padding:18px">
        <div style="font-size:13px;color:rgba(242,240,236,.55)">On these nights <span style="color:rgba(242,240,236,.35)">· ${esc(scheduleLabel(d.days))}</span></div>
        <div class="nights">
          ${NIGHT_LABELS.map((label, i) => `
            <button type="button" class="night${on(d.days.includes(i))}" data-act="day" data-i="${i}"
              aria-pressed="${d.days.includes(i)}" aria-label="${DAY_NAMES[i]}">${label}</button>`).join('')}
        </div>
      </div>

      ${NATIVE ? `
      <button type="button" class="tile tile--row" style="margin-top:11px" data-act="pick-apps" data-id="${d.id}">
        <span class="row__left">${svg(LOCK, 19, DIM)}<span style="font-weight:600">App blocking</span></span>
        <span class="tile__value">${shieldCount(d) ? esc(selectionLabel(shieldBreakdown(d))) : 'None yet'}<span class="tile__chev">›</span></span>
      </button>
      ` : `
      ${row('App blocking', countLabel(d.apps.length), 'apps', LOCK)}
      <div class="tile tile--sub" data-sub="apps"${sec === 'apps' ? '' : ' hidden'}>
        ${APP_LIST.map((name) => {
          const picked = d.apps.includes(name);
          return `
          <button type="button" class="pick${on(picked)}" data-act="app" data-app="${esc(name)}" aria-pressed="${picked}">
            <span>${esc(name)}</span>
            <span class="pick__mark">${picked ? svg('<path d="M4 12.5l5 5L20 6.5"/>', 17, '#34c759', 2.4) : ''}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="tile-note">Preview only. Real blocking uses Apple's picker inside the app.</div>
      `}


      ${editing ? '<button type="button" class="oath-break" data-act="oath-break">Break this commitment</button>' : ''}

      ${S.sheetError ? `<div class="sheet-error">${esc(S.sheetError)}</div>` : ''}
      <div class="sheet-hint" id="oathhint"${ready || S.sheetError ? ' hidden' : ''}>Choose at least one app for this to protect.</div>

      <button type="button" class="sheet-btn" data-act="sheet-save" id="oathsave"${ready ? '' : ' disabled'}>${editing ? 'SAVE CHANGES' : 'COMMIT'}</button>
      <div style="margin-top:11px;text-align:center;font-size:11.5px;color:rgba(242,240,236,.32)">Breaking a commitment early is recorded in your history.</div>
      <div style="height:24px"></div>
    </div>`;
}

// ---------------------------------------------------------------- settings

const settingsRow = (icon, name, value, act) => `
  <button type="button" class="row"${act ? ` data-act="${act}"` : ''}>
    <span class="row__left">${svg(icon, 20, DIM)}<span class="row__name">${esc(name)}</span></span>
    <span class="row__value">${value ? esc(value) : ''}<span class="chev">›</span></span>
  </button>`;

/** Everything under an active oath, for the "apps under oath" row. */
function oathAppCount() {
  if (NATIVE) return OATHS.reduce((n, o) => n + (o.on ? shieldCount(o) : 0), 0);
  return lockedApps().length;
}

function settingsTab() {

  return `
    <div class="scroll" style="top:var(--safe-top);bottom:var(--nav-h);padding:0">
      <div style="padding:24px 24px 0" class="page-title">SETTINGS</div>

      <button type="button" class="card account" data-act="account">
        <span style="flex:1">
          <span class="account__tag" style="display:block">SWORN MEMBER</span>
          <span class="account__name" style="display:block">${esc((USER.name || 'Your account').toUpperCase())}</span>
        </span>
        <span class="chev">›</span>
      </button>

      <div class="group-label">THE COMMITMENT</div>
      <div class="group">
        ${settingsRow(LOCK, 'Protected apps', oathAppCount() + ' blocked', 'apps-under-oath')}
        ${S.confirmLift
          ? `<button type="button" class="row dev-row--danger" data-act="lift-all">
              <span class="row__left">${svg(SHIELD_OFF, 20, '#e88178')}<span class="row__name" style="color:#e88178">Tap again to lift everything</span></span>
              <span class="row__value" style="color:#e88178">Unblocks all apps<span class="chev">›</span></span>
            </button>`
          : settingsRow(SHIELD_OFF, 'Lift all blocking now', '', 'lift-all')}
      </div>

      <div class="group-label" style="margin-top:24px">PREFERENCES</div>
      <div class="group">
        ${settingsRow(BELL, 'Notifications', (() => {
          const p = loadNotifPrefs();
          const n = Object.keys(NOTIF_DEFAULTS).filter((k) => p[k]).length;
          return n === 0 ? 'Off' : n + ' on';
        })(), 'notifications-open')}
        ${S.confirmReplay
          ? `<button type="button" class="row dev-row--danger" data-act="replay-onboarding">
              <span class="row__left">${svg(REPLAY, 20, '#e88178')}<span class="row__name" style="color:#e88178">Tap again to confirm</span></span>
              <span class="row__value" style="color:#e88178">Resets your answers<span class="chev">›</span></span>
            </button>`
          : settingsRow(REPLAY, 'Replay onboarding', '', 'replay-onboarding')}
      </div>

      <div class="group-label" style="margin-top:24px">SUBSCRIPTION</div>
      <div class="group">
        ${settingsRow(CARD, 'Manage subscription', '', 'subscription')}
      </div>

      <div class="group-label" style="margin-top:24px">SUPPORT &amp; LEGAL</div>
      <div class="group">
        ${settingsRow(HELP, 'Support', '', 'doc-support')}
        ${settingsRow(STAR, 'Leave a review', '', 'review')}
        ${settingsRow(DOC, 'Terms of service', '', 'doc-terms')}
        ${settingsRow(LOCK, 'Privacy policy', '', 'doc-privacy')}
      </div>

      ${DEV ? `
      <div class="group-label" style="margin-top:24px">DEVELOPMENT</div>
      <div class="group">
        <button type="button" class="row" data-act="dev-open">
          <span class="row__left">${svg(WRENCH, 20, DIM)}<span class="row__name">Developer</span></span>
          <span class="row__value">DEBUG<span class="chev">›</span></span>
        </button>
      </div>` : ''}

      <div style="height:30px"></div>
    </div>`;
}

/* ---- settings sub-pages --------------------------------------------------- */

function pageShell(title, body) {
  return `
    <div class="page">
      <div class="bd-flat"></div>
      <div class="page__head">
        <button type="button" class="icon-btn" style="width:34px;height:34px" data-act="page-close" aria-label="Back">
          ${svg(CHEVRON, 22, '#fff', 1.9)}
        </button>
        <div class="page__title">${title}</div>
      </div>
      <div class="page__body">${body}<div style="height:30px"></div></div>
    </div>`;
}

function accountPage() {
  return pageShell('ACCOUNT', `
    <div class="group" style="margin:0">
      <div class="row row--static">
        <span class="row__left"><span class="row__name">Name</span></span>
        <span class="row__value">${esc(USER.name || 'Not set')}</span>
      </div>
      <div class="row row--static">
        <span class="row__left"><span class="row__name">Signed in with</span></span>
        <span class="row__value">Apple</span>
      </div>
      <div class="row row--static">
        <span class="row__left"><span class="row__name">Days kept</span></span>
        <span class="row__value">${S.daysSworn}</span>
      </div>
    </div>
    <div class="doc-note">Sworn stores your commitment on this device. Signing out leaves it in place.</div>
    <button type="button" class="oath-break" data-act="sign-out">Sign out</button>`);
}

/* Deliberately a handful of switches, not thirty. Each one is a reason Sworn
   might speak, described in the words of what it would actually say. */
const NOTIF_ROWS = [
  ['protection', 'Protection reminders', 'Shortly before a window you set begins.'],
  ['milestones', 'Milestones', 'The days that are worth marking.'],
  ['recovery', 'Recovery', 'A way back if a commitment breaks.'],
  ['commitment', 'Commitment reminders', 'An occasional note that it still stands.'],
  ['why', 'My why', 'Your own words, rarely.'],
  ['reengagement', 'Checking back in', 'Only if you go quiet for a while.'],
  ['earlyReminder', 'Extra early reminder', 'A second nudge 30 minutes before.'],
  ['protectionEnd', 'When protection ends', 'A note when a window closes.']
];

function notificationsPage() {
  const p = loadNotifPrefs();
  return pageShell('NOTIFICATIONS', `
    <div class="doc-note" style="margin-top:0">Sworn stays quiet unless something matters. Nothing it sends names what you are working on, so a notification on your lock screen gives nothing away.</div>
    <div class="group" style="margin:18px 0 0">
      ${NOTIF_ROWS.map(([key, name, desc]) => `
        <div class="row" style="align-items:flex-start">
          <span class="row__left" style="display:block;flex:1">
            <span class="row__name" style="display:block">${esc(name)}</span>
            <span class="dev-note" style="margin-top:3px">${esc(desc)}</span>
          </span>
          <button type="button" class="switch${on(p[key])}" data-act="notif-toggle" data-key="${key}"
            role="switch" aria-checked="${p[key]}" aria-label="${esc(name)}"><i></i></button>
        </div>`).join('')}
    </div>
    <div class="doc-note">Turned off here, Sworn will not send that kind at all. Your protection, the intervention and your record work exactly the same either way.</div>`);
}

const DOCS = {
  support: ['SUPPORT', `
    <p>Sworn is made by a very small team. If something is broken, or the app is not doing what you expected, tell us through the App Store's support link and a person will read it.</p>
    <p>Include what you were doing and what happened. If it is about blocking, say which apps and which hours. That is almost always where the answer is.</p>
    <h3>Blocking is not working</h3>
    <p>Sworn blocks apps using Apple's Screen Time. Two things have to be true: you granted Screen Time access when asked, and the commitment has apps chosen and is switched on. You can check both under Commitments.</p>
    <p>If you denied Screen Time access, iOS will not ask again. Turn it back on in Settings → Screen Time.</p>
    <h3>I want my data removed</h3>
    <p>Everything Sworn knows is on your device. Deleting the app deletes it. There is nothing on a server for us to remove.</p>
  `],

  terms: ['TERMS OF SERVICE', `
    <p class="doc-meta">Last updated 15 August 2026</p>
    <p>By using Sworn you agree to these terms. They are deliberately short.</p>
    <h3>What Sworn is</h3>
    <p>Sworn helps you keep commitments you make to yourself. It can block apps during hours you choose, and it asks you to wait before those protections come off.</p>
    <h3>What Sworn is not</h3>
    <p>Sworn is not medical care, therapy, or treatment for addiction. It does not diagnose anything. The figures it shows you are indications, not clinical results. If you are struggling, please speak to a doctor or a qualified professional.</p>
    <h3>Your account</h3>
    <p>You sign in with Apple. You are responsible for keeping access to that Apple ID. You must be old enough to enter a contract where you live.</p>
    <h3>Subscriptions</h3>
    <p>Paid plans are billed through your Apple ID and renew automatically unless cancelled at least 24 hours before the period ends. Manage or cancel in Settings → Manage subscription, or in your Apple ID settings. Refunds are handled by Apple, not by us.</p>
    <h3>Blocking has limits</h3>
    <p>Sworn uses Apple's Screen Time. It can be turned off in iOS Settings, and it cannot cover every app or every route to content. Sworn adds friction; it does not make anything impossible. Do not rely on it as your only safeguard.</p>
    <h3>Ending it</h3>
    <p>You can stop using Sworn at any time by deleting the app. We may suspend accounts that abuse the service. Sworn is provided as it is, without warranties, and our liability is limited to what you paid us in the previous twelve months.</p>
  `],

  privacy: ['PRIVACY POLICY', `
    <p class="doc-meta">Last updated 15 August 2026</p>
    <p>Sworn is built so that we do not need your data. Almost nothing leaves your phone.</p>
    <h3>Stays on your device</h3>
    <p>Your reason for stopping, what it has cost you, your commitments, hours and streak are stored on this device. When you sign in with Apple, your commitment record and the timestamps of protection events sync to our server so a new phone can restore them. Notes you write after a lapse never leave this device.</p>
    <h3>Which apps you block</h3>
    <p>Apps are chosen through Apple's own picker. Apple hands Sworn an opaque token, not a name. Sworn can count how many apps you protect, and genuinely cannot tell which they are.</p>
    <h3>Sign in with Apple</h3>
    <p>We receive an identifier for your account, and your first name if you choose to share it. Apple lets you hide your email; if you do, we never see the real one. The name is stored on your device so the app can greet you.</p>
    <h3>Payments</h3>
    <p>Subscriptions are handled entirely by Apple. We never see your card.</p>
    <h3>What we do not do</h3>
    <p>No advertising. No analytics SDKs. No selling or sharing of anything. No profile built about you.</p>
    <h3>Deleting it</h3>
    <p>Delete the app and the data goes with it. To sever the Apple sign-in, use Settings → Apple ID → Sign in with Apple.</p>
  `]
};

function docPage(kind) {
  const [title, body] = DOCS[kind];
  return pageShell(title, `<div class="doc">${body}</div>`);
}

/* DEBUG only. Drives the same stores the real app reads — picking a state
   takes you into the genuine screens, not a mock of them. */
function settingsPage() {
  switch (S.page) {
    case 'notifications': return notificationsPage();
    case 'account': return accountPage();
    case 'support': return docPage('support');
    case 'terms': return docPage('terms');
    case 'privacy': return docPage('privacy');
    default: return '';
  }
}

function devPage() {
  if (!DEV || !S.devOpen) return '';
  const secs = SwornDev.duration();

  return `
    <div class="page">
      <div class="bd-flat"></div>
      <div class="page__head">
        <button type="button" class="icon-btn" style="width:34px;height:34px" data-act="dev-close" aria-label="Back">
          ${svg(CHEVRON, 22, '#fff', 1.9)}
        </button>
        <div class="page__title">DEVELOPER</div>
      </div>

      <div class="page__body">
        <div class="dev-banner">Debug build only. These presets overwrite your real local state.</div>

        <div class="group" style="margin:18px 0 0">
          ${SwornDev.STATES.map((st) => `
            <button type="button" class="row dev-row${st.destructive ? ' dev-row--danger' : ''}" data-act="dev-state" data-id="${st.id}">
              <span style="display:block">
                <span class="row__name" style="display:block">${esc(st.name)}</span>
                <span class="dev-note">${esc(st.note)}</span>
              </span>
              <span class="chev">›</span>
            </button>`).join('')}
        </div>

        <div class="group-label" style="margin:26px 0 0">NOTIFICATIONS</div>
        <div class="group" style="margin:12px 0 0;padding:14px">
          <div class="dev-note" style="margin:0 0 12px">Each fires in 3 seconds, so you can background the app and see it land.</div>
          <div class="dev-chips">
            ${SwornDev.NOTIF_KINDS.map(([kind, label]) => `
              <button type="button" class="dev-chip" data-act="dev-notif" data-kind="${kind}">${esc(label)}</button>`).join('')}
          </div>
          <div class="dev-chips" style="margin-top:14px">
            <button type="button" class="dev-chip" data-act="dev-notif-list">What's scheduled</button>
            <button type="button" class="dev-chip" data-act="dev-notif-clear">Cancel all</button>
          </div>
          ${(() => {
            const list = SwornDev.getScheduled();
            if (!list.length) return '';
            return `<div class="dev-note" style="margin-top:14px">${list.length} pending</div>` +
              list.map((n) => `<div class="dev-note" style="margin-top:6px">${esc(n.when)} · ${esc(n.title)}</div>`).join('');
          })()}
        </div>

        <div class="group-label" style="margin:26px 0 0">TEST BEHAVIOR</div>
        <div class="group" style="margin:12px 0 0;padding:14px">
          <div class="dev-note" style="margin:0 0 12px">Switches every adaptive screen without redoing onboarding.${SwornDev.chosen() ? '' : ' Not yet answered, defaulting.'}</div>
          <div class="dev-chips">
            ${SwornDev.BEHAVIOR_STATES.map((b) => `
              <button type="button" class="dev-chip${on(SwornDev.current() === b.id)}" data-act="dev-behavior" data-id="${b.id}">${esc(b.name)}</button>`).join('')}
          </div>
        </div>

        <div class="group-label" style="margin:26px 0 0">COUNTDOWN</div>
        <div class="group" style="margin:12px 0 0;padding:14px">
          <div class="dev-note" style="margin:0 0 12px">Shorten the 60 seconds while testing.</div>
          <div class="dev-chips">
            ${SwornDev.DURATIONS.map((d) => `
              <button type="button" class="dev-chip${on(secs === d)}" data-act="dev-duration" data-secs="${d}">${d}s</button>`).join('')}
          </div>
          <div class="dev-note" style="margin:16px 0 10px">Jump straight to a stage.</div>
          <div class="dev-chips">
            ${SwornDev.STAGES.map(([label, left]) => `
              <button type="button" class="dev-chip" data-act="dev-stage" data-left="${left}">${label}</button>`).join('')}
          </div>
        </div>

        <div style="height:30px"></div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- nav

const TABS = [
  ['home', 'Home'],
  ['commitments', 'Commitments'],
  ['analytics', 'Analytics'],
  ['settings', 'Settings']
];

function nav() {
  return `
    <nav class="nav" aria-label="Main">
      ${TABS.map(([id, label]) => `
        <button type="button" class="navbtn${on(S.tab === id)}" data-act="tab" data-tab="${id}"
          aria-current="${S.tab === id}">${svg(NAV_ICONS[id], 22)}${label}</button>`).join('')}
    </nav>`;
}

// ---------------------------------------------------------------- render

function screenHtml() {
  switch (S.tab) {
    case 'home': return homeTab();
    case 'analytics': return analyticsTab();
    case 'commitments': return commitmentsTab();
    case 'settings': return settingsTab();
    default: return '';
  }
}

function render() {
  // Recomputed every paint: iOS keeps the page alive for days, and a counter
  // cached at load would quietly fall behind the calendar.
  S.daysSworn = loadProgress().daysSworn;
  document.getElementById('backdrop').innerHTML = backdrop();
  document.getElementById('screen').innerHTML = screenHtml();
  document.getElementById('nav').innerHTML = nav();
  document.getElementById('layer').innerHTML =
    (S.tab === 'home' ? intervention() : '') +
    oathSheet() +
    achievements() + whyPage() + analyticsPage() + devPage() + settingsPage();
  if (S.tab === 'home' && S.view === 'running') armReveal();
}

/* The clock is patched every second; the stage body is swapped only when the
   stage actually changes, so it can cross-fade instead of flickering. */
function paintCount() {
  const root = document.querySelector('.iv');
  if (!root) return;

  const total = S.interventionSeconds;
  const elapsed = total - S.left;

  root.querySelector('.iv__count').textContent = S.left;
  root.querySelector('.iv__fill')
      .setAttribute('stroke-dashoffset', (RING_CIRCUMFERENCE * (elapsed / total)).toFixed(2));

  const stage = stageFor(elapsed);
  if (stage !== root.dataset.stage) {
    root.dataset.stage = stage;
    const holder = document.getElementById('ivstage');
    holder.innerHTML = stageBody(stage);
    // restart the fade
    holder.classList.remove('is-in');
    void holder.offsetWidth;
    holder.classList.add('is-in');
    armReveal();
  }

  if (S.left <= 0) document.getElementById('ivfoot').innerHTML = decisionBar();
}

/* The urge shield goes up first — before any countdown — so protection does
   not depend on the user sitting through anything. */
function tapTempted() {
  if (!anythingShielded()) return;
  clearInterval(timer);
  S.tab = 'home';
  beginUrge(URGE_MINUTES);
  if (NATIVE) native({ action: 'urge', minutes: URGE_MINUTES });
  S.view = 'protected';
  render();
}

/** mode: 'voluntary' from "I'm tempted", 'bypass' when disabling protection. */
function startIntervention(mode, oathId) {
  clearInterval(timer);
  S.tab = 'home';
  S.view = 'running';
  S.ivMode = mode || 'voluntary';
  S.ivOathId = oathId ?? null;
  S.ivAction = PHYSICAL_ACTIONS[Math.floor(Math.random() * PHYSICAL_ACTIONS.length)];
  S.left = S.interventionSeconds;
  // Anchored to the clock, not to interval ticks: backgrounding the app
  // suspends timers, and the count must mean real elapsed seconds.
  S.ivEndsAt = Date.now() + S.interventionSeconds * 1000;
  render();

  timer = setInterval(() => {
    S.left = Math.max(0, Math.ceil((S.ivEndsAt - Date.now()) / 1000));
    if (S.left <= 0) clearInterval(timer);
    paintCount();
  }, 1000);
}

function endIntervention() {
  clearInterval(timer);
  clearInterval(revealTick);
  if (NATIVE) native({ action: 'haptic', ms: 0 });
  S.view = 'home';
  S.ivMode = null;
  S.ivOathId = null;
  S.left = S.interventionSeconds;
  render();
}

/** They waited it out and still want the protection gone. */
function completeBypass() {
  pushEvent('protection_bypassed');
  const oath = OATHS.find((o) => o.id === S.ivOathId);
  if (oath) oath.on = false;
  clearInterval(timer);
  S.view = 'home';
  S.ivMode = null;
  S.ivOathId = null;
  S.left = S.interventionSeconds;
  persistOaths();
  render();
}

// ---------------------------------------------------------------- events

document.getElementById('phone').addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const i = Number(el.dataset.i);

  switch (el.dataset.act) {
    case 'tab':
      if (S.view !== 'home') { clearInterval(timer); S.view = 'home'; }
      S.confirmReplay = false;
      S.confirmLift = false;
      S.tab = el.dataset.tab;
      return render();
    case 'tempted': return tapTempted();
    case 'pause': return startIntervention('voluntary');
    case 'iv-back':
      // Walking away from a voluntary intervention is the resist worth
      // counting. Backing out of a bypass is just cancelling a settings change.
      if (S.ivMode === 'voluntary') recordResist();
      return endIntervention();
    case 'iv-continue': return completeBypass();
    case 'cancel': S.view = 'home'; return render();
    case 'lapse': S.view = 'lapse'; S.lapseReason = null; return render();
    case 'lapse-reason': {
      S.lapseReason = el.dataset.reason;
      document.querySelectorAll('[data-act="lapse-reason"]').forEach((row) => {
        const sel = row.dataset.reason === S.lapseReason;
        row.classList.toggle('is-on', sel);
        row.setAttribute('aria-checked', sel);
      });
      const note = document.getElementById('lapsenote');
      if (note) note.style.display = S.lapseReason === 'other' ? '' : 'none';
      const cta = document.getElementById('lapsecta');
      if (cta) { cta.disabled = false; cta.classList.remove('cta-gold--muted'); }
      return;
    }
    case 'again': {
      if (!S.lapseReason) return;
      const note = document.getElementById('lapsenote');
      recordLapse(S.lapseReason === 'other' && note ? note.value : '', S.lapseReason);
      S.lapseReason = null;
      // The lapse restarted the streak; the seal must show it right away.
      S.daysSworn = loadProgress().daysSworn;
      return endIntervention();
    }
    case 'achievements-open': S.achievementsOpen = true; return render();
    case 'achievements-close': S.achievementsOpen = false; return render();
    case 'why-open': S.whyOpen = true; return render();
    case 'why-close': S.whyOpen = false; S.whyEditing = false; return render();
    case 'why-edit': S.whyEditing = true; return render();
    case 'why-cancel': S.whyEditing = false; return render();
    case 'why-save': {
      const box = document.getElementById('whyedit');
      const why = loadWhy();
      if (box) why.text = box.value;
      saveWhy(why);
      pushProfile();
      S.whyEditing = false;
      return render();
    }
    case 'an-open': S.anCard = Number(el.dataset.card); return render();
    case 'an-close': S.anCard = null; return render();
    case 'oath-toggle': {
      const o = OATHS.find((x) => x.id === Number(el.dataset.id));
      if (!o) return;
      // Switching protection off is a bypass — it has to be waited out.
      if (o.on) return startIntervention('bypass', o.id);
      o.on = true;
      persistOaths();
      return render();
    }
    case 'oath-open': {
      const o = OATHS.find((x) => x.id === Number(el.dataset.id));
      if (!o) return;
      S.draft = { ...o, days: [...o.days], apps: [...o.apps] };
      S.sheetSection = null;
      S.tab = 'commitments';
      return render();
    }
    case 'sheet-new':
      // The sheet floats over whatever tab you were on, so opening it should
      // not move you. Cancelling then leaves you exactly where you started.
      S.sheetFrom = S.tab;
      S.draft = blankOath();
      S.sheetSection = null;
      S.sheetError = null;
      return render();
    case 'sheet-cancel':
      S.tab = S.sheetFrom || S.tab;
      S.sheetFrom = null;
      const abandoned = S.draft && S.draft.isNew;
      S.draft = null;
      S.sheetSection = null;
      S.sheetError = null;
      // An abandoned draft may have stored a selection; sync forgets it.
      if (abandoned) syncShields();
      return render();
    case 'sheet-save': {
      const d = S.draft;
      if (!d || !d.name.trim()) return;
      // Saving a window iOS will not schedule would mean promising protection
      // that never arrives, so it is refused here with the reason.
      if (windowMinutes(d.time, d.until) < MIN_WINDOW_MINUTES) {
        S.sheetError = `A window has to be at least ${MIN_WINDOW_MINUTES} minutes for iOS to run it.`;
        return render();
      }
      S.sheetError = null;
      d.name = d.name.trim();
      const wasNew = d.isNew === true;
      delete d.isNew;
      if (wasNew) {
        // Guard against the list having changed while the sheet was open.
        if (OATHS.some((o) => o.id === d.id)) d.id = nextFreeId();
        OATHS.push(d);
      } else {
        OATHS = OATHS.map((o) => (o.id === d.id ? d : o));
      }
      S.draft = null;
      S.sheetSection = null;
      S.sheetFrom = null;
      // Land on the list, where what you just made is visible.
      S.tab = 'commitments';
      const isNew = wasNew;
      persistOaths();
      if (isNew) bridge({ action: 'notifyRecommit', prefs: loadNotifPrefs() });
      return render();
    }
    case 'oath-break': {
      const gone = S.draft.id;
      OATHS = OATHS.filter((o) => o.id !== gone);
      S.draft = null;
      S.sheetSection = null;
      S.sheetFrom = null;
      S.tab = 'commitments';
      if (NATIVE) native({ action: 'forget', oathId: gone });
      persistOaths();
      return render();
    }
    case 'pick-apps': {
      const id = Number(el.dataset.id);
      if (Number.isNaN(id)) return;
      return native({ action: 'pick', oathId: id });
    }
    case 'section': {
      /* Patched in place rather than re-rendered: rebuilding the sheet made
         the whole screen flash, and the freshly built input then needed a
         second tap before iOS would open its wheel. */
      const name = el.dataset.section;
      S.sheetSection = S.sheetSection === name ? null : name;
      document.querySelectorAll('[data-sub]').forEach((sub) => {
        sub.hidden = sub.dataset.sub !== S.sheetSection;
      });
      document.querySelectorAll('[data-act="section"]').forEach((row) => {
        const open = row.dataset.section === S.sheetSection;
        row.classList.toggle('is-on', open);
        row.setAttribute('aria-expanded', open);
      });
      return;
    }
    case 'day': toggle(S.draft.days, i); return render();
    case 'app': toggle(S.draft.apps, el.dataset.app); return render();
    case 'page-close': S.page = null; return render();
    case 'account': S.page = 'account'; return render();
    case 'notifications-open': S.page = 'notifications'; return render();
    case 'notif-toggle': {
      const prefs = loadNotifPrefs();
      const key = el.dataset.key;
      prefs[key] = !prefs[key];
      saveNotifPrefs(prefs);
      // Preferences are part of the schedule, so changing one rebuilds it.
      syncNotifications(oathPayload());
      return render();
    }
    case 'doc-support': S.page = 'support'; return render();
    case 'doc-terms': S.page = 'terms'; return render();
    case 'doc-privacy': S.page = 'privacy'; return render();
    case 'review': return native({ action: 'review' });
    case 'subscription': return native({ action: 'manageSubscription' });
    case 'sign-out': S.page = null; return native({ action: 'signOut' });
    case 'apps-under-oath': {
      const target = OATHS.find((o) => o.on) || OATHS[0];
      if (!target) { S.tab = 'commitments'; return render(); }
      if (NATIVE) return native({ action: 'pick', oathId: target.id });
      S.tab = 'commitments';
      return render();
    }
    case 'dev-open': S.devOpen = true; return render();
    case 'dev-close': S.devOpen = false; return render();
    case 'dev-state': return SwornDev.apply(el.dataset.id);
    case 'dev-notif': return SwornDev.fireNotif(el.dataset.kind);
    case 'dev-notif-list': return SwornDev.listNotifs();
    case 'dev-notif-clear': return SwornDev.clearNotifs();
    case 'dev-behavior': return SwornDev.setBehavior(el.dataset.id);
    case 'dev-duration': SwornDev.setDuration(Number(el.dataset.secs)); return render();
    case 'dev-stage':
      S.devOpen = false;
      return SwornDev.jumpTo(Number(el.dataset.left));
    case 'lift-all': {
      /* The escape hatch. A shield outliving its commitment would be the
         worst way for this app to fail, so there is always a way out that
         does not depend on the rest of the UI being right. */
      if (!S.confirmLift) { S.confirmLift = true; return render(); }
      S.confirmLift = false;
      OATHS.forEach((o) => { o.on = false; });
      persistOaths();
      if (NATIVE) native({ action: 'liftAll' });
      endUrge();
      return render();
    }
    case 'replay-onboarding':
      // Replaying wipes the written why and every choice the moment the
      // onboarding page loads, so it must never fire on a stray tap.
      if (!S.confirmReplay) { S.confirmReplay = true; return render(); }
      S.confirmReplay = false;
      if (NATIVE) return native({ action: 'replayOnboarding' });
      try { localStorage.removeItem('sworn.onboarded'); } catch (e) { /* storage blocked */ }
      window.location.href = 'index.html';
      return;
  }
});

/* Text and time fields write straight to the draft. Re-rendering on every
   keystroke would drop the caret, and on iOS it would dismiss the time wheel
   mid-spin, so these patch only the affected bits. */
document.getElementById('phone').addEventListener('input', (e) => {
  const field = e.target.dataset.field;
  if (!field || !S.draft) return;

  if (field === 'name') {
    S.draft.name = e.target.value;
    // Patched rather than re-rendered so the caret never jumps mid-word.
    const has = (NATIVE ? shieldCount(S.draft) : S.draft.apps.length) > 0;
    const ok = !!S.draft.name.trim() && has;
    const save = document.getElementById('oathsave');
    if (save) save.disabled = !ok;
    const hint = document.getElementById('oathhint');
    if (hint) hint.hidden = ok;
    return;
  }

  if (field === 'time' || field === 'until') {
    // The input is the label, so there is nothing else to keep in step.
    S.draft[field] = e.target.value;
    S.sheetError = null;
  }
});

render();

/* Sign-in happens after onboarding, so the server may briefly hold the name
   typed before it. Once Apple's name is here, it wins and re-syncs. */
if (NATIVE && USER.name && loadSession().name !== USER.name) {
  setUserName(USER.name);
  pushProfile();
}

/* Coming back from the background: the calendar may have moved and a running
   countdown must show real elapsed time, not frozen ticks. */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (S.view === 'running' && S.ivEndsAt) {
    S.left = Math.max(0, Math.ceil((S.ivEndsAt - Date.now()) / 1000));
  }
  render();
});

/* Opening the app is engagement: it rebuilds the schedule, which pushes the
   re-engagement and why reminders back so they only reach someone who has
   genuinely gone quiet. */
syncNotifications(oathPayload());

if (DEV) SwornDev.runPending();

if (NATIVE) {
  native({ action: 'authorize' });
  syncShields();
}
