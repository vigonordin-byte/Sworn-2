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
  'Bronze is where every oath starts. The first days are the loudest — urges arrive without warning and your own reasoning turns against you. Nothing is expected of you here except that you keep showing up.',
  'By five days the noise begins to settle. Sleep improves, focus returns in short stretches, and the urge stops feeling like an emergency. Silver marks the point where the habit is no longer running the day.',
  'Ten days is where most attempts have already ended. Gold is earned by the ordinary work of keeping your locks in place and answering honestly at your checkup. Confidence stops being a feeling and becomes evidence.',
  'A month changes the baseline. Diamond means the reward circuits have had real time to recalibrate — energy, drive and attention return to something closer to their natural level, and relapse becomes a decision rather than a reflex.',
  'A hundred days is no longer a streak, it is how you live. Eternal is the last tier because there is nothing beyond it to chase: the oath has become ordinary, and that is the whole point.'
];

/* Day indices are 0 = Sunday, matching NIGHT_LABELS below.
   Onboarding writes the first one; after that the Commitments page owns them. */
const DEFAULT_OATHS = [
  { id: 1, name: 'No Reddit after 20:00', time: '20:00', until: '06:00', days: [0, 1, 2, 3, 4, 5, 6], apps: ['Reddit'], friction: 1, on: true },
  { id: 2, name: 'Phone out of the bedroom', time: '22:30', until: '07:00', days: [0, 1, 2, 3, 4], apps: ['Reddit', 'X', 'Instagram', 'TikTok'], friction: 1, on: false },
  { id: 3, name: 'No socials before work', time: '06:30', until: '09:00', days: [1, 2, 3, 4, 5], apps: ['Instagram', 'TikTok', 'X'], friction: 0, on: false }
];

let OATHS = loadOaths() || DEFAULT_OATHS;
let nextOathId = OATHS.reduce((n, o) => Math.max(n, o.id), 0) + 1;

/** Every mutation goes through here so storage and the device stay in step. */
function persistOaths() {
  saveOaths(OATHS);
  syncShields();
}

/** Apps the user can put under an oath. */
const APP_LIST = ['Reddit', 'X', 'Instagram', 'TikTok', 'YouTube', 'Safari'];

const FRICTION_LEVELS = [
  ['GENTLE', 'A reminder and a pause. You can still continue.'],
  ['STRICT', 'Blocked. Unlocking takes 60 seconds and a written reason.'],
  ['SEALED', 'Blocked with no override until the oath ends.']
];

const CHART_DATA = {
  '7D':  [82, 74, 96, 100, 68, 91, 100],
  '30D': [61, 74, 58, 80, 92, 71, 86, 64, 78, 95, 70, 88, 74, 100, 83, 66, 92, 79, 100, 72, 90, 84, 68, 97, 88, 76, 100, 93, 85, 100],
  '90D': [44, 52, 48, 61, 57, 66, 60, 72, 68, 63, 75, 70, 81, 77, 72, 85, 79, 88, 83, 92, 86, 95, 90, 100],
  'ALL': [22, 31, 28, 40, 37, 49, 44, 58, 52, 64, 60, 71, 67, 78, 74, 83, 79, 88, 85, 92, 89, 96, 92, 100]
};

const HOUR_DATA = [4, 2, 1, 0, 0, 1, 3, 6, 9, 12, 10, 14, 18, 15, 12, 16, 22, 28, 34, 41, 52, 68, 84, 72];

const WEEKDAYS = [['M', 3], ['T', 5], ['W', 4], ['T', 6], ['F', 9], ['S', 11], ['S', 6]];
const WEEKDAY_MAX = 11;

const NIGHT_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Fixed in the design — not yet derived from real activity.
const STATS = {
  rate: 92, rateDelta: 14,
  rateNote: 'You kept your limits on 47 of 51 protected occasions — 14 points better than the previous 30 days.',
  hardest: '22:00 – 01:00',
  hardestNote: 'That window holds 61% of your 44 interventions and lapses.',
  resisted: 38, attempts: 44,
  resistedNote: 'Five of the six lapses happened after 23:00, on nights with no lock set.'
};

const PROTECTION = { until: 'Until 8:00 AM', left: '8h 42m', progress: 38 };

// ---------------------------------------------------------------- state

const S = {
  tab: 'home',
  daysSworn: 11,
  interventionSeconds: 60,
  faith: false,
  view: 'home',        // home | protected | running | done | lapse
  left: 60,
  range: '30D',
  draft: null,         // the oath being created/edited, or null
  sheetSection: null,  // expanded sheet row: null | 'time' | 'apps' | 'friction'
  card: null,          // open analytics card: null | 1 | 2 | 3
  whyOpen: false,
  whyEditing: false,
  achievementsOpen: false,
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
const SHIELD_CHECK = '<path d="M12 3.2 19 6v5.8c0 4.4-2.9 7.4-7 9-4.1-1.6-7-4.6-7-9V6z"/><path d="M9 12.1l2.3 2.3 4.2-4.5"/>';

const DIM = 'rgba(242,240,236,.55)';

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
  const earned = S.daysSworn >= d.at;
  const isCur = i === currentTier();
  return {
    ...d,
    earned,
    isCur,
    accentSoft: d.accent + '47',
    glow: `radial-gradient(circle, ${d.accent}4d 0%, rgba(0,0,0,0) 68%)`,
    ring: `conic-gradient(from 0deg, ${d.a1}, ${d.a2}22 22%, ${d.a1}cc 48%, ${d.a2}22 72%, ${d.a1})`,
    big: isCur ? S.daysSworn : earned ? (d.next || d.at) : d.at,
    caption: isCur ? 'DAYS SWORN' : earned ? 'DAYS CLEARED' : 'DAYS REQUIRED',
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
function nextLock() {
  const live = OATHS.filter((o) => o.on && o.days.length);
  if (!live.length) return null;
  return live.slice().sort((a, b) => a.time.localeCompare(b.time))[0];
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
  if (S.achievementsOpen || S.whyOpen) return '<div class="bd-base"></div>';
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

window.sworn = {
  onAuth(granted) {
    S.screenTimeAuthorized = granted;
    render();
  },
  onCounts(counts) {
    shieldCounts = counts || {};
    render();
  }
};

/** How many things an oath actually blocks. */
function shieldCount(oath) {
  if (!oath) return 0;
  return NATIVE ? (shieldCounts[oath.id] || 0) : oath.apps.length;
}

/** Hand the device the current schedule. Every change routes through here. */
function syncShields() {
  if (!NATIVE) return;
  native({
    action: 'sync',
    oaths: OATHS.map((o) => ({ id: o.id, time: o.time, until: o.until, days: o.days, on: o.on }))
  });
}

// ---------------------------------------------------------------- home

/* Three states, in order of urgency: an urge shield running now, a scheduled
   window armed for later, or nothing set up yet. */
function protectionCard() {
  const left = urgeRemaining();

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

  const lock = nextLock();
  if (lock) {
    return `
      <button type="button" class="card prot" data-act="tab" data-tab="commitments">
        <span style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <span style="display:block">
            <span class="prot__on"><i></i>PROTECTED</span>
            <span style="display:block;margin-top:9px" class="prot__until">${esc(lock.time)} – ${esc(lock.until)}</span>
          </span>
          <span style="display:flex;align-items:center;gap:10px;flex:0 0 auto">
            <span style="display:block;text-align:right">
              <span class="prot__left" style="display:block">${shieldCount(lock)}</span>
              <span style="display:block;margin-top:4px;font-size:13px;font-weight:400;color:rgba(235,235,245,.5)">${shieldCount(lock) === 1 ? 'app' : 'apps'}</span>
            </span>
            <span class="chev">›</span>
          </span>
        </span>
        <span style="display:block;margin-top:12px;font-size:13px;color:rgba(235,235,245,.5)">${esc(scheduleLabel(lock.days))} · ${esc(lock.name)}</span>
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
      <div class="apphead">
        <div class="apphead__mark">SWORN</div>
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

      <div style="position:relative;margin:20px 20px 0">
        <button type="button" class="tempted" data-act="tempted">I'm tempted</button>
      </div>
      <div style="height:20px"></div>
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
      ${picked.length ? `<div class="why-chips">${picked.map((i) => `<span>${esc(WHY_REASONS[i])}</span>`).join('')}</div>` : ''}
      <div class="why-meta">Written the night you took the oath, ${S.daysSworn} days ago.</div>
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
                ${i === cur ? '<div class="tl__now">NOW</div>' : ''}
              </div>
              <div class="tl__req">${d.at === 0 ? 'From the day you swear' : d.at + ' days sworn'}</div>
              <div class="tl__copy">${esc(TIER_COPY[i])}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ---------------------------------------------------------------- intervention

/** Which of the four intervention phases the countdown is in. */
function phase() {
  const t = S.interventionSeconds;
  const elapsed = t - S.left;
  if (elapsed < t * 0.17) return ['BREATHE', 'Put the phone down. Ten slow breaths, nothing else.'];
  if (elapsed < t * 0.5) return ['YOUR COMMITMENT', 'You said you wouldn’t open Reddit after 8 PM. That was you, deciding.'];
  if (elapsed < t * 0.83) {
    return S.faith
      ? ['YOUR FAITH', '“Flee from sexual immorality.” — 1 Corinthians 6:18']
      : ['YOUR REASON', '“' + whyText() + '”'];
  }
  return ['CHOOSE AN ACTION', 'Stand up. Leave the room. Get a glass of water.'];
}

function intervention() {
  if (S.view === 'home') return '';
  const t = S.interventionSeconds;

  /* Tapping "I'm tempted" is a success, not a confession. The first thing the
     user sees is that it worked, and that the decision is already taken. */
  if (S.view === 'protected') {
    return `
      <div class="intervene intervene--won">
        <div class="won__ring">${svg(SHIELD_CHECK, 40, '#34c759', 1.8)}</div>
        <div class="won__title">PROTECTION ACTIVATED</div>
        <div class="won__body">You noticed the urge. That's exactly what Sworn is for.</div>
        <div class="won__card">
          <div class="won__label">YOUR PROTECTED APPS ARE BLOCKED</div>
          <div class="won__until">Until ${urgeUntilLabel()}</div>
          <div class="won__note">${minutesLabel(urgeRemaining())} of protection · you don't need to act on this feeling</div>
        </div>
        <button type="button" class="cta-gold" style="margin-top:auto" data-act="pause">TAKE 60 SECONDS</button>
        <button type="button" style="margin-top:14px;background:none;border:0;color:rgba(242,240,236,.4);font-family:var(--sf);font-size:14px;cursor:pointer" data-act="cancel">I'm alright now</button>
      </div>`;
  }

  if (S.view === 'lapse') return lapseScreen();

  if (S.view === 'running') {
    const pct = ((t - S.left) / t) * 100;
    const [label, body] = phase();
    return `
      <div class="intervene">
        <div class="intervene__eyebrow">${urgeRemaining() > 0 ? `Protected until ${urgeUntilLabel()}` : 'You made a commitment'}</div>
        <div style="margin-top:36px">
          <div class="count" role="timer"
            style="background:conic-gradient(#d9a441 ${pct}%, rgba(255,255,255,.07) ${pct}%)">
            <div class="count__hole"></div>
            <div class="count__n">${S.left}</div>
          </div>
        </div>
        <div class="phase">${esc(label)}</div>
        <div class="phase__body">${esc(body)}</div>
        <div style="margin-top:auto;font-size:12.5px;color:rgba(242,240,236,.4);text-align:center">Don't decide now. Only get through the next ${t} seconds.</div>
        <button type="button" style="margin-top:16px;background:none;border:0;color:rgba(242,240,236,.35);font-family:var(--sf);font-size:12px;cursor:pointer" data-act="cancel">Close</button>
      </div>`;
  }

  const left = urgeRemaining();
  return `
    <div class="intervene">
      <div style="margin-top:120px;font-size:23px;font-weight:700;letter-spacing:4px;text-align:center;line-height:1.3">YOU GOT THROUGH IT</div>
      <div style="margin-top:14px;font-size:13.5px;color:rgba(242,240,236,.5);text-align:center;max-width:280px;text-wrap:pretty">${left > 0
        ? `Your apps stay blocked until ${urgeUntilLabel()}. Nothing is asked of you until then.`
        : 'The urge passed and your commitment stands.'}</div>
      <div style="margin-top:auto;width:100%;display:flex;flex-direction:column;gap:11px">
        <button type="button" class="verdict verdict--gold" data-act="resisted">DONE</button>
        <button type="button" class="verdict verdict--dark" data-act="pause">ANOTHER 60 SECONDS</button>
        <button type="button" class="quiet" data-act="lapse">I gave in</button>
      </div>
    </div>`;
}

/* Not a verdict. They already know what happened; this only gives them their
   own reason back and a way to start again. */
function lapseScreen() {
  return `
    <div class="intervene intervene--calm">
      <div class="lapse__title">You gave in.</div>
      <div class="lapse__said">You said:</div>
      <div class="lapse__quote">“${esc(whyText())}”</div>
      <div class="lapse__ask">What happened?</div>
      <textarea class="why-edit" id="lapsenote" placeholder="Optional. Only you ever see this."></textarea>
      <button type="button" class="cta-gold" style="margin-top:auto" data-act="again">START AGAIN</button>
      <div class="lapse__foot">Nothing is taken away. Your commitment still stands.</div>
    </div>`;
}

// ---------------------------------------------------------------- analytics

function analyticsTab() {
  const bars = CHART_DATA[S.range];
  const gap = bars.length > 40 ? 1 : bars.length > 12 ? 2 : 6;

  const chart = bars.map((v) => {
    const bg = v >= 95 ? '#fff' : v >= 70 ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.16)';
    return `<div style="height:${Math.max(6, v)}%;background:${bg}"></div>`;
  }).join('');

  const hours = HOUR_DATA.map((v) => {
    const bg = v > 45 ? '#e7bc6a' : v > 20 ? 'rgba(231,188,106,.42)' : 'rgba(255,255,255,.16)';
    return `<div style="height:${Math.max(4, v)}%;background:${bg}"></div>`;
  }).join('');

  const resistedPct = Math.round((STATS.resisted / STATS.attempts) * 100);

  return `
    <div class="an-head">
      <div class="an-head__title">YOUR LAST 30 DAYS</div>
      <div class="an-head__sub">Three measures of how you are actually behaving.</div>
    </div>

    <div class="ranges" role="tablist" aria-label="Date range">
      ${['7D', '30D', '90D', 'ALL'].map((label) => `
        <button type="button" class="rangetab${on(S.range === label)}" role="tab"
          aria-selected="${S.range === label}" data-act="range" data-range="${label}">${label}</button>`).join('')}
    </div>

    <div class="scroll" style="top:calc(106px + var(--safe-top));bottom:var(--nav-h);padding:22px 20px 24px">

      <button type="button" class="card an-card${on(S.card === 1)}" data-act="card" data-card="1" aria-expanded="${S.card === 1}">
        <span style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <span style="display:block">
            <span class="an-card__label" style="display:block">Commitment rate</span>
            <span style="display:flex;margin-top:7px;align-items:baseline;gap:9px">
              <span class="an-card__big">${STATS.rate}<small>%</small></span>
              <span style="font-size:12px;font-weight:600;color:var(--green-tx)">+${STATS.rateDelta}</span>
            </span>
          </span>
          <span class="an-card__arrow">›</span>
        </span>
        <span class="chart" style="margin-top:16px;gap:${gap}px">${chart}</span>
        ${S.card === 1 ? `
        <span class="axis" style="margin-top:8px"><span>30 days ago</span><span>Today</span></span>
        <span class="an-card__more" style="display:block">${esc(STATS.rateNote)}</span>` : ''}
      </button>

      <button type="button" class="card an-card${on(S.card === 2)}" style="margin-top:16px" data-act="card" data-card="2" aria-expanded="${S.card === 2}">
        <span style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <span style="display:block">
            <span class="an-card__label" style="display:block">Hardest times</span>
            <span class="an-card__mid" style="display:block;margin-top:7px">${esc(STATS.hardest)}</span>
          </span>
          <span class="an-card__arrow">›</span>
        </span>
        <span class="hours" style="margin-top:16px">${hours}</span>
        <span class="axis"><span>6A</span><span>12P</span><span>6P</span><span>12A</span></span>
        ${S.card === 2 ? `
        <span class="an-card__more" style="display:block">${esc(STATS.hardestNote)}</span>
        <span style="display:block;margin-top:16px;font-size:12px;color:rgba(235,235,245,.45)">By day</span>
        <span class="wk">
          ${WEEKDAYS.map(([label, n]) => {
            const bg = n >= 9 ? '#e7bc6a' : n >= 5 ? 'rgba(231,188,106,.4)' : 'rgba(255,255,255,.16)';
            const fg = n >= 9 ? 'rgba(235,235,245,.7)' : 'rgba(235,235,245,.35)';
            return `
            <span class="wk__col">
              <span class="wk__slot"><i style="height:${Math.round((n / WEEKDAY_MAX) * 100)}%;background:${bg}"></i></span>
              <span class="wk__label" style="color:${fg}">${label}</span>
            </span>`;
          }).join('')}
        </span>` : ''}
      </button>

      <button type="button" class="card an-card${on(S.card === 3)}" style="margin-top:16px" data-act="card" data-card="3" aria-expanded="${S.card === 3}">
        <span style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <span style="display:block">
            <span class="an-card__label" style="display:block">Temptations resisted</span>
            <span style="display:flex;margin-top:7px;align-items:baseline;gap:9px">
              <span class="an-card__big">${STATS.resisted}</span>
              <span style="font-size:13px;color:rgba(235,235,245,.45)">of ${STATS.attempts}</span>
            </span>
          </span>
          <span class="an-card__arrow">›</span>
        </span>
        <span class="split">
          <span style="width:${resistedPct}%;background:#fff"></span>
          <span style="width:${100 - resistedPct}%;background:rgba(255,255,255,.18)"></span>
        </span>
        ${S.card === 3 ? `
        <span class="legend-row">
          <div><i style="background:#fff"></i>Resisted ${STATS.resisted}</div>
          <div><i style="background:rgba(255,255,255,.28)"></i>Continued ${STATS.attempts - STATS.resisted}</div>
        </span>
        <span class="an-card__more" style="display:block;border-top:0;padding-top:0;margin-top:14px">${esc(STATS.resistedNote)}</span>
        <span class="saves">
          <span class="saves__n">${urgeSaves()}</span>
          <span class="saves__t">Temptation → protection activated</span>
          <span class="saves__d">Times you noticed an urge and asked Sworn for cover. Each one is a save, not a slip.</span>
        </span>` : ''}
      </button>

    </div>`;
}

// ---------------------------------------------------------------- commitments

function commitmentsTab() {
  const lock = nextLock();

  return `
    <div class="scroll" style="top:var(--safe-top);bottom:var(--nav-h);padding:0">
      <div style="position:relative;padding:24px 24px 0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div class="page-title">COMMITMENTS</div>
          <button type="button" class="round-btn" data-act="sheet-new" aria-label="New oath">${svg(PLUS, 19, DIM, 2.1)}</button>
        </div>
      </div>

      <div class="card card--static nextlock">
        <div class="nextlock__eyebrow">NEXT LOCK</div>
        <div class="nextlock__time">${lock ? esc(lock.time) : '—'}</div>
        <div style="margin-top:8px;text-align:center;font-size:13px;color:rgba(242,240,236,.5)">${lock ? esc(scheduleLabel(lock.days)) : 'No active oath'}</div>
        <div class="nextlock__foot">
          ${svg(MOON, 22, DIM)}
          <div>
            <div style="font-size:13.5px;font-weight:600">${lock ? `${shieldCount(lock)} app${shieldCount(lock) === 1 ? ' locks' : 's lock'} at this time` : 'Nothing is locked'}</div>
            <div style="margin-top:3px;font-size:12.5px;color:rgba(242,240,236,.45)">${lock ? esc(NATIVE ? `Locked until ${lock.until}` : (lock.apps.join(' · ') || 'No apps chosen')) : 'Turn an oath on to protect your apps'}</div>
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
              <div class="oath__time" style="color:${o.on ? '#f2f0ec' : 'rgba(242,240,236,.35)'}">${esc(o.time)}</div>
            </div>
            <button type="button" class="switch${on(o.on)}" data-act="oath-toggle" data-id="${o.id}"
              role="switch" aria-checked="${o.on}" aria-label="${esc(o.name)}"><i></i></button>
          </div>
        </div>`).join('')}

      ${OATHS.length ? '' : '<div class="empty">No oaths yet. Tap + to swear one.</div>'}
      <div style="height:34px"></div>
    </div>`;
}

/* ---- the oath sheet -------------------------------------------------------
   Edits a draft copy so Cancel can discard. Each row expands in place rather
   than pushing a sub-page, which keeps the whole oath visible while editing. */

const countLabel = (n) => n + (n === 1 ? ' app' : ' apps');

function blankOath() {
  return { id: null, name: '', time: '20:00', until: '06:00', days: [0, 1, 2, 3, 4, 5, 6], apps: [], friction: 1, on: true };
}

function oathSheet() {
  if (!S.draft) return '';
  const d = S.draft;
  const editing = d.id !== null;
  const ready = d.name.trim().length > 0;
  const sec = S.sheetSection;

  const row = (label, value, section, icon) => `
    <button type="button" class="tile tile--row${on(sec === section)}" style="margin-top:11px" data-act="section" data-section="${section}" aria-expanded="${sec === section}">
      <span class="row__left">${icon ? svg(icon, 19, DIM) : ''}<span style="font-weight:600">${label}</span></span>
      <span class="tile__value"><span class="tile__val">${esc(value)}</span><span class="tile__chev">›</span></span>
    </button>`;

  return `
    <button type="button" class="scrim" data-act="sheet-cancel" aria-label="Close"></button>
    <div class="sheet-full" role="dialog" aria-modal="true" aria-label="${editing ? 'Edit oath' : 'New oath'}">
      <div class="sheet__bar">
        <button type="button" class="sheet__cancel" data-act="sheet-cancel">Cancel</button>
        <div class="sheet__title">${editing ? 'Edit oath' : 'New oath'}</div>
        <div style="width:78px"></div>
      </div>

      <input class="sheet-input" style="margin-top:22px" id="oathname" data-field="name"
        value="${esc(d.name)}" placeholder="Name this oath" autocomplete="off">

      ${row('Locks at', d.time, 'time')}
      ${sec === 'time' ? `
        <div class="tile tile--sub">
          <input type="time" class="time-input" data-field="time" value="${esc(d.time)}">
        </div>` : ''}

      ${row('Unlocks at', d.until, 'until')}
      ${sec === 'until' ? `
        <div class="tile tile--sub">
          <input type="time" class="time-input" data-field="until" value="${esc(d.until)}">
        </div>` : ''}

      <div class="tile" style="margin-top:11px;padding:18px">
        <div style="font-size:13px;color:rgba(242,240,236,.55)">On these nights <span style="color:rgba(242,240,236,.35)">· ${esc(scheduleLabel(d.days))}</span></div>
        <div class="nights">
          ${NIGHT_LABELS.map((label, i) => `
            <button type="button" class="night${on(d.days.includes(i))}" data-act="day" data-i="${i}"
              aria-pressed="${d.days.includes(i)}" aria-label="${DAY_NAMES[i]}">${label}</button>`).join('')}
        </div>
      </div>

      ${NATIVE ? `
      <button type="button" class="tile tile--row" style="margin-top:11px" data-act="pick-apps" data-id="${d.id === null ? '' : d.id}">
        <span class="row__left">${svg(LOCK, 19, DIM)}<span style="font-weight:600">App blocking</span></span>
        <span class="tile__value">${countLabel(shieldCount(d))}<span class="tile__chev">›</span></span>
      </button>
      ${d.id === null ? '<div class="tile-note">Swear the oath first, then choose which apps it locks.</div>' : ''}
      ` : `
      ${row('App blocking', countLabel(d.apps.length), 'apps', LOCK)}
      ${sec === 'apps' ? `
        <div class="tile tile--sub">
          ${APP_LIST.map((name) => {
            const picked = d.apps.includes(name);
            return `
            <button type="button" class="pick${on(picked)}" data-act="app" data-app="${esc(name)}" aria-pressed="${picked}">
              <span>${esc(name)}</span>
              <span class="pick__mark">${picked ? svg('<path d="M4 12.5l5 5L20 6.5"/>', 17, '#34c759', 2.4) : ''}</span>
            </button>`;
          }).join('')}
        </div>` : ''}
      <div class="tile-note">Preview only — real blocking uses Apple's picker inside the app.</div>
      `}

      ${row('Strictness', FRICTION_LEVELS[d.friction][0], 'friction')}
      ${sec === 'friction' ? `
        <div class="tile tile--sub">
          ${FRICTION_LEVELS.map(([name, desc], i) => `
            <button type="button" class="pick pick--stacked${on(d.friction === i)}" data-act="friction" data-i="${i}"
              role="radio" aria-checked="${d.friction === i}">
              <span>
                <span class="pick__name">${name}</span>
                <span class="pick__desc">${esc(desc)}</span>
              </span>
              <span class="pick__mark">${d.friction === i ? svg('<path d="M4 12.5l5 5L20 6.5"/>', 17, '#34c759', 2.4) : ''}</span>
            </button>`).join('')}
        </div>` : ''}

      ${editing ? '<button type="button" class="oath-break" data-act="oath-break">Break this oath</button>' : ''}

      <button type="button" class="sheet-btn" data-act="sheet-save" id="oathsave"${ready ? '' : ' disabled'}>${editing ? 'SAVE CHANGES' : 'SWEAR IT'}</button>
      <div style="margin-top:11px;text-align:center;font-size:11.5px;color:rgba(242,240,236,.32)">Breaking an oath early is recorded in your history.</div>
      <div style="height:24px"></div>
    </div>`;
}

// ---------------------------------------------------------------- settings

const settingsRow = (icon, name, value) => `
  <button type="button" class="row">
    <span class="row__left">${svg(icon, 20, DIM)}<span class="row__name">${esc(name)}</span></span>
    <span class="row__value">${value ? esc(value) : ''}<span class="chev">›</span></span>
  </button>`;

function settingsTab() {
  return `
    <div class="scroll" style="top:var(--safe-top);bottom:var(--nav-h);padding:0">
      <div style="padding:24px 24px 0" class="page-title">SETTINGS</div>

      <button type="button" class="card account">
        <span class="account__ring">${svg(PERSON, 24, DIM)}</span>
        <span style="flex:1">
          <span class="account__tag" style="display:block">SWORN MEMBER</span>
          <span class="account__name" style="display:block">YOUR ACCOUNT</span>
        </span>
        <span class="chev">›</span>
      </button>

      <div class="group-label">THE OATH</div>
      <div class="group">
        ${settingsRow(PARTNER, 'Accountability partner', 'Marcus')}
        ${settingsRow(LOCK, 'Apps under oath', countLabel(NATIVE ? OATHS.reduce((n, o) => n + (o.on ? shieldCount(o) : 0), 0) : lockedApps().length))}
        ${settingsRow(MOON, 'Default locked window', '20:00 – 06:00')}
        <div class="row row--static">
          <span class="row__left">${svg(CROSS, 20, DIM)}<span class="row__name">Faith mode</span></span>
          <button type="button" class="switch${on(S.faith)}" data-act="faith"
            role="switch" aria-checked="${S.faith}" aria-label="Faith mode"><i></i></button>
        </div>
      </div>

      <div class="group-label" style="margin-top:24px">PREFERENCES</div>
      <div class="group">
        ${settingsRow(BELL, 'Notifications', 'Daily')}
        ${settingsRow(EXPORT, 'Export my record', '')}
      </div>

      <div class="group-label" style="margin-top:24px">SUPPORT &amp; LEGAL</div>
      <div class="group">
        ${settingsRow(HELP, 'Support', '')}
        ${settingsRow(STAR, 'Leave a review', '')}
        ${settingsRow(DOC, 'Terms of service', '')}
        ${settingsRow(LOCK, 'Privacy policy', '')}
      </div>

      <div style="height:30px"></div>
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
  document.getElementById('backdrop').innerHTML = backdrop();
  document.getElementById('screen').innerHTML = screenHtml();
  document.getElementById('nav').innerHTML = nav();
  document.getElementById('layer').innerHTML =
    (S.tab === 'home' ? intervention() : '') +
    oathSheet() +
    achievements() + whyPage();
}

/** The countdown ticks once a second — patch it rather than re-render. */
function paintCount() {
  const el = document.querySelector('.count');
  if (!el) return;
  const pct = ((S.interventionSeconds - S.left) / S.interventionSeconds) * 100;
  el.style.background = `conic-gradient(#d9a441 ${pct}%, rgba(255,255,255,.07) ${pct}%)`;
  el.querySelector('.count__n').textContent = S.left;
  const [label, body] = phase();
  document.querySelector('.phase').textContent = label;
  document.querySelector('.phase__body').textContent = body;
}

/* The urge shield goes up first — before any countdown — so protection does
   not depend on the user sitting through anything. */
function tapTempted() {
  clearInterval(timer);
  S.tab = 'home';
  beginUrge(URGE_MINUTES);
  if (NATIVE) native({ action: 'urge', minutes: URGE_MINUTES });
  S.view = 'protected';
  render();
}

function startIntervention() {
  clearInterval(timer);
  S.tab = 'home';
  S.view = 'running';
  S.left = S.interventionSeconds;
  render();
  timer = setInterval(() => {
    S.left -= 1;
    if (S.left <= 0) {
      clearInterval(timer);
      S.left = 0;
      S.view = 'done';
      return render();
    }
    paintCount();
  }, 1000);
}

function endIntervention() {
  clearInterval(timer);
  S.view = 'home';
  S.left = S.interventionSeconds;
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
      S.tab = el.dataset.tab;
      return render();
    case 'tempted': return tapTempted();
    case 'pause': return startIntervention();
    case 'cancel':
    case 'resisted': return endIntervention();
    case 'lapse': S.view = 'lapse'; return render();
    case 'again': {
      const note = document.getElementById('lapsenote');
      recordLapse(note ? note.value : '');
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
      S.whyEditing = false;
      return render();
    }
    case 'range': S.range = el.dataset.range; return render();
    case 'card': {
      const n = Number(el.dataset.card);
      S.card = S.card === n ? null : n;
      return render();
    }
    case 'oath-toggle': {
      const o = OATHS.find((x) => x.id === Number(el.dataset.id));
      if (o) o.on = !o.on;
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
      S.tab = 'commitments';
      S.draft = blankOath();
      S.sheetSection = null;
      return render();
    case 'sheet-cancel':
      S.draft = null;
      S.sheetSection = null;
      return render();
    case 'sheet-save': {
      const d = S.draft;
      if (!d || !d.name.trim()) return;
      d.name = d.name.trim();
      if (d.id === null) {
        d.id = nextOathId++;
        OATHS.push(d);
      } else {
        OATHS = OATHS.map((o) => (o.id === d.id ? d : o));
      }
      S.draft = null;
      S.sheetSection = null;
      persistOaths();
      return render();
    }
    case 'oath-break': {
      const gone = S.draft.id;
      OATHS = OATHS.filter((o) => o.id !== gone);
      S.draft = null;
      S.sheetSection = null;
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
      const name = el.dataset.section;
      S.sheetSection = S.sheetSection === name ? null : name;
      return render();
    }
    case 'day': toggle(S.draft.days, i); return render();
    case 'app': toggle(S.draft.apps, el.dataset.app); return render();
    case 'friction': S.draft.friction = i; return render();
    case 'faith': S.faith = !S.faith; return render();
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
    const save = document.getElementById('oathsave');
    if (save) save.disabled = !S.draft.name.trim();
    return;
  }

  if (field === 'time' || field === 'until') {
    S.draft[field] = e.target.value;
    const label = document.querySelector(`[data-section="${field}"] .tile__val`);
    if (label) label.textContent = e.target.value;
  }
});

render();

if (NATIVE) {
  native({ action: 'authorize' });
  syncShields();
}
