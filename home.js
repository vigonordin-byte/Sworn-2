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

const OATHS = [
  { name: 'No Reddit after 20:00', schedule: 'Every day', time: '20:00' },
  { name: 'Phone out of the bedroom', schedule: 'Weeknights', time: '22:30' },
  { name: 'No socials before work', schedule: 'Weekdays', time: '06:30' }
];

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

const VOW = 'I want to control my impulses instead of being controlled by them.';
const VOW_WRITTEN = 'Written the night you took the oath, 11 days ago.';

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
  view: 'home',        // home | running | done
  left: 60,
  range: '30D',
  picked: ['Reddit', 'X', 'Safari', 'Instagram'],
  activeDays: [0, 1, 2, 3, 4, 5, 6],
  friction: 1,
  oathOn: [0],
  sheet: null,         // null | 'new' | oath index
  card: null,          // open analytics card: null | 1 | 2 | 3
  appsOpen: false,
  whyOpen: false,
  achievementsOpen: false
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

// ---------------------------------------------------------------- backdrop

function backdrop() {
  if (S.achievementsOpen) return '<div class="bd-base"></div>';
  if (S.tab !== 'home') return '<div class="bd-flat"></div>';
  return `
    <div class="bd-base"></div>
    <div class="bd-nebula"></div>
    <div class="bd-clouds"></div>
    <div class="bd-stars-a"></div>
    <div class="bd-stars-b"></div>
    <div class="bd-fade"></div>`;
}

// ---------------------------------------------------------------- home

function homeTab() {
  const t = tierView(currentTier());

  return `
    <div class="scroll" style="top:44px;bottom:78px;padding:0">
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

      <div class="vow">“${esc(VOW)}”</div>

      <button type="button" class="card prot" data-act="apps-toggle" aria-expanded="${S.appsOpen}">
        <span style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px">
          <span style="display:block">
            <span class="prot__on"><i></i>PROTECTED</span>
            <span style="display:block;margin-top:9px" class="prot__until">${esc(PROTECTION.until)}</span>
          </span>
          <span style="display:block;text-align:right;flex:0 0 auto">
            <span class="prot__left" style="display:block">${esc(PROTECTION.left)}</span>
            <span style="display:block;margin-top:4px;font-size:13px;font-weight:400;color:${'rgba(235,235,245,.5)'}">remaining</span>
          </span>
        </span>
        <span class="prot__track" style="display:block"><i style="width:${PROTECTION.progress}%"></i></span>
        ${S.appsOpen ? `
        <span style="display:flex;margin-top:13px;padding-top:12px;border-top:.5px solid rgba(255,255,255,.09);align-items:center;justify-content:space-between;gap:10px">
          <span style="display:block">
            <span style="display:block;font-size:13px;font-weight:400;color:rgba(235,235,245,.5)">Protected apps</span>
            <span class="applist">${S.picked.map((a) => `<span>${esc(a)}</span>`).join('')}</span>
          </span>
          <span style="font-size:19px;color:rgba(242,240,236,.32)">›</span>
        </span>` : ''}
      </button>

      <div class="actions">
        <button type="button" class="card action" data-act="sheet-new">
          ${svg(SHIELD_PLUS, 22, DIM)}
          <div class="action__name">Add protection</div>
          <div class="action__sub">Lock another app or hour</div>
        </button>
        <button type="button" class="card action" data-act="why-toggle">
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

function whySheet() {
  if (!S.whyOpen) return '';
  return `
    <button type="button" class="why-scrim" data-act="why-toggle" aria-label="Close"></button>
    <div class="why" role="dialog" aria-modal="true" aria-label="Why I'm doing this">
      <div class="grabber"></div>
      <div style="margin-top:20px;font-size:13px;color:rgba(235,235,245,.6)">Why I'm doing this</div>
      <div style="margin-top:12px;font-size:20px;font-weight:400;line-height:1.4;text-wrap:pretty">“${esc(VOW)}”</div>
      <div style="margin-top:16px;font-size:13px;line-height:1.5;color:rgba(235,235,245,.6);text-wrap:pretty">${esc(VOW_WRITTEN)}</div>
      <div style="margin-top:22px;display:flex;flex-direction:column;gap:9px">
        <button type="button" class="pill-btn pill-btn--primary" data-act="why-toggle">Done</button>
        <button type="button" class="pill-btn pill-btn--plain">Edit</button>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- achievements

function achievements() {
  if (!S.achievementsOpen) return '';
  const cur = currentTier();

  return `
    <div class="ach">
      <div class="bd-ach"></div>
      <div class="bd-ach-stars"></div>

      <div class="statusbar"><span>23:41</span><span class="statusbar__right">5G ▮▮▮ 62%</span></div>
      <div class="ach__head">
        <button type="button" class="icon-btn" style="width:34px;height:34px" data-act="achievements-close" aria-label="Back">
          ${svg(CHEVRON, 22, '#fff', 1.9)}
        </button>
        <div class="ach__title">ACHIEVEMENTS</div>
      </div>

      <div class="ach__list">
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
      : ['YOUR REASON', '“I don’t want to waste another year of my life doing this.”'];
  }
  return ['CHOOSE AN ACTION', 'Stand up. Leave the room. Get a glass of water.'];
}

function intervention() {
  if (S.view === 'home') return '';
  const t = S.interventionSeconds;

  if (S.view === 'running') {
    const pct = ((t - S.left) / t) * 100;
    const [label, body] = phase();
    return `
      <div class="intervene">
        <div class="intervene__eyebrow">You made a commitment</div>
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

  return `
    <div class="intervene">
      <div style="margin-top:120px;font-size:23px;font-weight:700;letter-spacing:4px;text-align:center;line-height:1.3">DID YOU RESIST?</div>
      <div style="margin-top:14px;font-size:13.5px;color:rgba(242,240,236,.5);text-align:center;max-width:270px;text-wrap:pretty">Whatever you answer, your commitment stands. You can renew it right now.</div>
      <div style="margin-top:auto;width:100%;display:flex;flex-direction:column;gap:11px">
        <button type="button" class="verdict verdict--gold" data-act="resisted">I KEPT MY WORD</button>
        <button type="button" class="verdict verdict--dark" data-act="tempted">RENEW MY COMMITMENT</button>
      </div>
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

    <div class="scroll" style="top:150px;bottom:78px;padding:22px 20px 24px">

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
        <span class="an-card__more" style="display:block;border-top:0;padding-top:0;margin-top:14px">${esc(STATS.resistedNote)}</span>` : ''}
      </button>

    </div>`;
}

// ---------------------------------------------------------------- commitments

function commitmentsTab() {
  return `
    <div class="scroll" style="top:44px;bottom:78px;padding:0">
      <div style="position:relative;padding:24px 24px 0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div class="page-title">COMMITMENTS</div>
          <button type="button" class="round-btn" data-act="sheet-new" aria-label="New oath">${svg(PLUS, 19, DIM, 2.1)}</button>
        </div>
      </div>

      <div class="card card--static nextlock">
        <div class="nextlock__eyebrow">NEXT LOCK</div>
        <div class="nextlock__time">20:00</div>
        <div style="margin-top:8px;text-align:center;font-size:13px;color:rgba(242,240,236,.5)">Tonight</div>
        <div class="nextlock__foot">
          ${svg(MOON, 22, DIM)}
          <div>
            <div style="font-size:13.5px;font-weight:600">${S.picked.length} apps lock at this time</div>
            <div style="margin-top:3px;font-size:12.5px;color:rgba(242,240,236,.45)">Locked until 06:00, sealed for 19 days</div>
          </div>
        </div>
      </div>

      ${OATHS.map((o, i) => {
        const active = S.oathOn.includes(i);
        return `
        <div class="oath">
          <button type="button" class="oath__head" data-act="oath-open" data-i="${i}">
            <span>${esc(o.name)}</span>
            ${svg(PENCIL, 18, 'rgba(242,240,236,.42)')}
          </button>
          <div class="oath__body">
            <div>
              <div style="font-size:12.5px;color:rgba(242,240,236,.45)">${esc(o.schedule)}</div>
              <div class="oath__time" style="color:${active ? '#f2f0ec' : 'rgba(242,240,236,.35)'}">${esc(o.time)}</div>
            </div>
            <button type="button" class="switch${on(active)}" data-act="oath-toggle" data-i="${i}"
              role="switch" aria-checked="${active}" aria-label="${esc(o.name)}"><i></i></button>
          </div>
        </div>`;
      }).join('')}

      <div style="height:34px"></div>
    </div>`;
}

function oathSheet() {
  if (S.sheet === null) return '';
  const editing = typeof S.sheet === 'number' ? OATHS[S.sheet] : null;

  return `
    <button type="button" class="scrim" data-act="sheet-close" aria-label="Close"></button>
    <div class="sheet-full" role="dialog" aria-modal="true" aria-label="${editing ? 'Edit oath' : 'New oath'}">
      <div class="sheet__bar">
        <button type="button" class="sheet__cancel" data-act="sheet-close">Cancel</button>
        <div class="sheet__title">${editing ? 'Edit oath' : 'New oath'}</div>
        <div style="width:78px"></div>
      </div>

      <div class="tile" style="margin-top:22px">${esc(editing ? editing.name : 'Name this oath')}</div>

      <div class="tile tile--row" style="margin-top:11px">
        <div style="font-weight:600">Locks at</div>
        <div class="tile__value">${esc(editing ? editing.time : '20:00')}<span>›</span></div>
      </div>

      <div class="tile" style="margin-top:11px;padding:18px">
        <div style="font-size:13px;color:rgba(242,240,236,.55)">On these nights</div>
        <div class="nights">
          ${NIGHT_LABELS.map((label, i) => `
            <button type="button" class="night${on(S.activeDays.includes(i))}" data-act="night" data-i="${i}"
              aria-pressed="${S.activeDays.includes(i)}">${label}</button>`).join('')}
        </div>
      </div>

      <div class="tile tile--row" style="margin-top:11px">
        <div class="row__left">
          ${svg(LOCK, 19, DIM)}
          <div style="font-weight:600">App blocking</div>
        </div>
        <div class="tile__value">${S.picked.length} apps<span>›</span></div>
      </div>

      <div class="tile tile--row" style="margin-top:11px">
        <div style="font-weight:600">Strictness</div>
        <div class="tile__value" style="color:rgba(242,240,236,.6);font-weight:600">${FRICTION_LEVELS[S.friction][0]}<span>›</span></div>
      </div>

      ${editing ? '<button type="button" class="oath-break">Break this oath</button>' : ''}

      <button type="button" class="sheet-btn" data-act="sheet-close">${editing ? 'SAVE CHANGES' : 'SWEAR IT'}</button>
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
    <div class="scroll" style="top:44px;bottom:78px;padding:0">
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
        ${settingsRow(LOCK, 'Apps under oath', S.picked.length + ' apps')}
        ${settingsRow(MOON, 'Default locked window', '20:00 – 06:00')}
        <div class="row row--static">
          <span class="row__left">${svg(CROSS, 20, DIM)}<span class="row__name">Faith mode</span></span>
          <button type="button" class="switch switch--light${on(S.faith)}" data-act="faith"
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
    (S.tab === 'home' ? intervention() + whySheet() : '') +
    (S.tab === 'commitments' ? oathSheet() : '') +
    achievements();
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
    case 'tempted': return startIntervention();
    case 'cancel':
    case 'resisted': return endIntervention();
    case 'achievements-open': S.achievementsOpen = true; return render();
    case 'achievements-close': S.achievementsOpen = false; return render();
    case 'apps-toggle': S.appsOpen = !S.appsOpen; return render();
    case 'why-toggle': S.whyOpen = !S.whyOpen; return render();
    case 'range': S.range = el.dataset.range; return render();
    case 'card': {
      const n = Number(el.dataset.card);
      S.card = S.card === n ? null : n;
      return render();
    }
    case 'oath-toggle': toggle(S.oathOn, i); return render();
    case 'oath-open': S.sheet = i; return render();
    case 'sheet-new': S.tab = 'commitments'; S.sheet = 'new'; return render();
    case 'sheet-close': S.sheet = null; return render();
    case 'night': toggle(S.activeDays, i); return render();
    case 'faith': S.faith = !S.faith; return render();
  }
});

render();
