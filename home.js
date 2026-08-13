/* Sworn — main app.
   Ported from the Claude Design source "Sworn Home.dc.html".

   The design lays the four screens out as separate boards; here they are tabs
   behind one nav bar, so the nav actually navigates. */

// ---------------------------------------------------------------- content

const TIERS = [
  { name: 'BRONZE',  at: 0,   next: 5,    accent: '#c98a5c', a1: '#c98a5c', a2: '#8a5a38', core: 'radial-gradient(circle at 38% 30%, #2a1d14 0%, #131110 55%, #0b0b0c 100%)', spinSec: 0 },
  { name: 'SILVER',  at: 5,   next: 10,   accent: '#cfd6de', a1: '#e6ecf3', a2: '#7d8896', core: 'radial-gradient(circle at 38% 30%, #23272c 0%, #121316 55%, #0b0b0c 100%)', spinSec: 34 },
  { name: 'GOLD',    at: 10,  next: 30,   accent: '#e7bc6a', a1: '#f0cd85', a2: '#a8762a', core: 'radial-gradient(circle at 38% 30%, #2a2418 0%, #121214 55%, #0b0b0c 100%)', spinSec: 26, orbit: true },
  { name: 'DIAMOND', at: 30,  next: 100,  accent: '#9fe8ff', a1: '#e8fbff', a2: '#4a9dc4', core: 'radial-gradient(circle at 38% 30%, #16262d 0%, #101418 55%, #0a0b0c 100%)', spinSec: 18, orbit: true, facets: true },
  { name: 'ETERNAL', at: 100, next: null, accent: '#e3b8ff', a1: '#ffd9f2', a2: '#7f6bff', core: 'radial-gradient(circle at 38% 30%, #241a33 0%, #121018 55%, #0a0a0c 100%)', spinSec: 12, orbit: true, facets: true, rainbow: true }
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

const TRIGGERS = [
  { name: 'Reddit', count: 21, w: '86%' },
  { name: 'Late night, in bed', count: 17, w: '68%' },
  { name: 'After an argument', count: 6, w: '26%' }
];

const NIGHT_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const VOW = 'I want to control my impulses instead of being controlled by them.';

// Fixed in the design — not yet derived from real activity.
const PROMISES_KEPT = { pct: 92, delta: 14, days: '28 of 30 days', best: 'Best run · 11 days' };
const HOME_METRICS = { kept: 47, kepOf: 51, resisted: 38, friction: 'Lv 3' };

// ---------------------------------------------------------------- state

const S = {
  tab: 'home',
  daysSworn: 11,
  interventionSeconds: 60,
  faith: false,
  view: 'home',        // home | running | done
  left: 60,
  range: '30D',
  picked: ['Reddit', 'X', 'Instagram', 'Safari'],
  activeDays: [0, 1, 2, 3, 4, 5, 6],
  friction: 1,
  oathOn: [0],
  sheet: null          // null | 'new' | oath index
};

let timer = null;

// ---------------------------------------------------------------- icons

const ICONS = {
  home: '<path d="M3 10.4 12 3.2l9 7.2V21H3z"/><path d="M9.4 21v-6.2h5.2V21"/>',
  commitments: '<path d="M12 3.2 19 6v5.8c0 4.4-2.9 7.4-7 9-4.1-1.6-7-4.6-7-9V6z"/><path d="M9 12.1l2.3 2.3 4.2-4.5"/>',
  analytics: '<path d="M4 20.2V13"/><path d="M10 20.2V5.4"/><path d="M16 20.2v-5"/><path d="M21.2 20.2H2.8"/>',
  settings: '<circle cx="12" cy="12" r="3.1"/><path d="M12 3v2.1M12 18.9V21M3 12h2.1M18.9 12H21M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5"/>'
};

const stroke = (paths, size, color) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color || 'currentColor'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

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
const PLUS = '<path d="M12 5v14M5 12h14"/>';

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

function toggle(list, value) {
  const i = list.indexOf(value);
  if (i === -1) list.push(value); else list.splice(i, 1);
}

// ---------------------------------------------------------------- home

function seals() {
  const cur = currentTier();

  return TIERS.map((d, i) => {
    const earned = S.daysSworn >= d.at;
    const isCur = i === cur;
    const remaining = Math.max(0, d.at - S.daysSworn);

    const accent = earned ? d.accent : 'rgba(242,240,236,.32)';
    const accentSoft = earned ? d.accent + '47' : 'rgba(255,255,255,.10)';
    const glow = earned
      ? `radial-gradient(circle, ${d.accent}4d 0%, rgba(0,0,0,0) 68%)`
      : 'radial-gradient(circle, rgba(255,255,255,.05) 0%, rgba(0,0,0,0) 68%)';
    const ring = earned
      ? `conic-gradient(from 0deg, ${d.a1}, ${d.a2}22 22%, ${d.a1}cc 48%, ${d.a2}22 72%, ${d.a1})`
      : 'conic-gradient(from 0deg, rgba(255,255,255,.16), rgba(255,255,255,.03) 40%, rgba(255,255,255,.16))';
    const spin = d.spinSec && earned ? `sealspin ${d.spinSec}s linear infinite` : 'none';

    const big = isCur ? S.daysSworn : earned ? (d.next || d.at) : d.at;
    const caption = isCur ? 'DAYS SWORN' : earned ? 'DAYS CLEARED' : 'DAYS REQUIRED';
    const sub = isCur
      ? (d.next ? `${d.next - S.daysSworn} days to ${TIERS[i + 1].name.toLowerCase()}` : 'The highest oath')
      : earned ? (d.at === 0 ? 'Earned · the oath' : `Earned · day ${d.at}`)
      : `Locked · ${remaining} days away`;

    return `
      <button type="button" class="seal-card" data-act="seal" data-i="${i}"
        aria-label="${esc(d.name)} — ${esc(sub)}">
        <span class="seal" style="opacity:${earned ? 1 : 0.42}">
          <span class="seal__glow" style="background:${glow}"></span>
          <span class="seal__ring" style="background:${ring};animation:${spin}"></span>
          ${d.orbit && earned ? `<span class="seal__orbit" style="border-color:${accentSoft};animation:sealspin ${(d.spinSec || 20) * 2.4}s linear infinite reverse"></span>` : ''}
          <span class="seal__core" style="background:${d.core}"></span>
          ${d.facets && earned ? '<span class="seal__facets"></span>' : ''}
          <span class="seal__hairline" style="border-color:${accentSoft}"></span>
          ${d.rainbow && earned ? '<span class="seal__rainbow"></span>' : ''}
          <span class="seal__label">
            <span class="seal__big" style="color:${earned ? '#f4e6c8' : 'rgba(242,240,236,.42)'};text-shadow:${earned ? `0 2px 26px ${d.accent}66` : 'none'}">${big}</span>
            <span class="seal__caption" style="display:block">${caption}</span>
          </span>
        </span>
        <span class="seal__name" style="color:${accent}">${esc(d.name)}</span>
        <span class="seal__sub">${esc(sub)}</span>
      </button>`;
  }).join('');
}

function homeTab() {
  // The design assumes a fixed 852px frame; on a shorter viewport this has to
  // scroll or the content runs under the nav.
  return `
    <div class="scroll" style="top:44px;bottom:78px;padding:0">
    <div class="apphead">
      <div class="apphead__mark">SWORN</div>
      <div style="display:flex;gap:10px;align-items:center">
        <div class="streak"><i></i>${S.daysSworn}d</div>
        <div class="avatar-sm"></div>
      </div>
    </div>

    <div class="rail-wrap">
      <div class="rail" id="rail">${seals()}</div>
      <div class="vow">“${esc(VOW)}”</div>
      <div class="vow__label">YOUR COMMITMENT</div>
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric__label">PROMISES KEPT</div>
        <div class="metric__value">${HOME_METRICS.kept}<small>/${HOME_METRICS.kepOf}</small></div>
      </div>
      <div class="metric">
        <div class="metric__label">RESISTED</div>
        <div class="metric__value">${HOME_METRICS.resisted}</div>
      </div>
      <div class="metric">
        <div class="metric__label">FRICTION</div>
        <div class="metric__value">${HOME_METRICS.friction}</div>
      </div>
    </div>

    <div class="shield">
      <div>
        <div class="shield__on"><i></i>Protected until 02:00</div>
        <div class="shield__apps">${S.picked.map(esc).join(' · ')}</div>
      </div>
      <button type="button" class="ghost" data-act="tab" data-tab="commitments">Edit</button>
    </div>

    <div style="position:relative;margin:12px 20px 0">
      <button type="button" class="tempted" data-act="tempted">I'M TEMPTED</button>
    </div>
    <div style="height:20px"></div>
    </div>`;
}

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
        <div class="intervene__eyebrow">YOU MADE A COMMITMENT</div>
        <div style="margin-top:36px">
          <div class="count" role="timer" aria-live="off"
            style="background:conic-gradient(#d9a441 ${pct}%, rgba(255,255,255,.07) ${pct}%)">
            <div class="count__hole"></div>
            <div class="count__n">${S.left}</div>
          </div>
        </div>
        <div class="phase">${esc(label)}</div>
        <div class="phase__body">${esc(body)}</div>
        <div style="margin-top:auto;font-size:12.5px;color:rgba(242,240,236,.4);text-align:center">Don't decide now. Only get through the next ${t} seconds.</div>
        <button type="button" style="margin-top:16px;background:none;border:0;color:rgba(242,240,236,.35);font-family:Archivo,sans-serif;font-size:12px;cursor:pointer" data-act="cancel">Close</button>
      </div>`;
  }

  return `
    <div class="intervene">
      <div style="margin-top:120px;font-family:var(--serif);font-size:38px;text-align:center">Did you resist?</div>
      <div style="margin-top:14px;font-size:13.5px;color:rgba(242,240,236,.5);text-align:center;max-width:270px;text-wrap:pretty">Whatever you answer, your commitment stands. You can renew it right now.</div>
      <div style="margin-top:auto;width:100%;display:flex;flex-direction:column;gap:11px">
        <button type="button" class="tempted" style="border-radius:18px;padding:18px;font-size:14px;letter-spacing:2.4px;box-shadow:none" data-act="resisted">I KEPT MY WORD</button>
        <button type="button" style="width:100%;cursor:pointer;padding:18px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:rgba(242,240,236,.75);font-family:Archivo,sans-serif;font-size:14px;font-weight:600;letter-spacing:2.4px" data-act="tempted">RENEW MY COMMITMENT</button>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- analytics

function analyticsTab() {
  const bars = CHART_DATA[S.range];
  const gap = bars.length > 40 ? 1 : bars.length > 12 ? 2 : 6;

  const chart = bars.map((v) => {
    const bg = v >= 95 ? 'linear-gradient(180deg,#e7bc6a,#c8933a)'
      : v >= 70 ? 'rgba(217,164,65,.55)' : 'rgba(255,255,255,.14)';
    return `<div style="height:${Math.max(6, v)}%;background:${bg}"></div>`;
  }).join('');

  const hours = HOUR_DATA.map((v) => {
    const bg = v > 45 ? '#d9a441' : v > 20 ? 'rgba(217,164,65,.42)' : 'rgba(255,255,255,.12)';
    return `<div style="height:${Math.max(4, v)}%;background:${bg}"></div>`;
  }).join('');

  return `
    <div class="page-head">
      <div>
        <div class="eyebrow-sm">THE RECORD</div>
        <div class="page-title">Your last 30 days</div>
      </div>
      <div class="avatar-sm"></div>
    </div>

    <div class="ranges" role="tablist" aria-label="Date range">
      ${['7D', '30D', '90D', 'ALL'].map((label) => `
        <button type="button" class="rangetab${on(S.range === label)}" role="tab"
          aria-selected="${S.range === label}" data-act="range" data-range="${label}">${label}</button>`).join('')}
    </div>

    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:9.5px;letter-spacing:1.8px;color:rgba(242,240,236,.42);font-weight:600">PROMISES KEPT</div>
          <div style="margin-top:8px;display:flex;align-items:baseline;gap:8px">
            <span class="hero-pct">${PROMISES_KEPT.pct}<small>%</small></span>
            <span class="delta">▲ ${PROMISES_KEPT.delta} pts</span>
          </div>
        </div>
        <div style="text-align:right;font-size:11.5px;color:rgba(242,240,236,.45);line-height:1.7">${esc(PROMISES_KEPT.days)}<br>${esc(PROMISES_KEPT.best)}</div>
      </div>
      <div class="chart" style="margin-top:18px;gap:${gap}px">${chart}</div>
    </div>

    <div class="card-flat">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:9.5px;letter-spacing:1.8px;color:rgba(242,240,236,.42);font-weight:600">WHEN IT'S HARDEST</div>
        <div style="font-size:11.5px;color:var(--gold);font-weight:600">22:00 – 01:00</div>
      </div>
      <div class="hours" style="margin-top:14px">${hours}</div>
      <div class="hour-axis"><span>6A</span><span>12P</span><span>6P</span><span>12A</span></div>
    </div>

    <div class="card-flat" style="padding:4px 18px 6px">
      ${TRIGGERS.map((t) => `
        <div class="trigger">
          <div class="trigger__icon"></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${esc(t.name)}</div>
            <div class="trigger__bar"><i style="width:${t.w}"></i></div>
          </div>
          <div style="font-size:12.5px;font-weight:600;color:rgba(242,240,236,.6)">${t.count}</div>
        </div>`).join('')}
    </div>`;
}

// ---------------------------------------------------------------- commitments

function commitmentsTab() {
  return `
    <div class="scroll" style="top:44px;bottom:78px;padding:0">
      <div style="position:relative;padding:24px 24px 0">
        <div class="big-title">Commitments</div>
      </div>

      <div class="nextlock">
        <div style="text-align:center;font-size:9.5px;letter-spacing:3.2px;color:rgba(242,240,236,.45);font-weight:600">NEXT LOCK</div>
        <div class="nextlock__time">20:00</div>
        <div style="margin-top:8px;text-align:center;font-size:13px;color:rgba(242,240,236,.5)">Tonight</div>
        <div class="nextlock__foot">
          ${stroke(MOON, 22, '#e7bc6a')}
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
            ${stroke(PENCIL, 18, 'rgba(242,240,236,.42)')}
          </button>
          <div class="oath__body">
            <div>
              <div style="font-size:12.5px;color:rgba(242,240,236,.45)">${esc(o.schedule)}</div>
              <div class="oath__time" style="color:${active ? '#f4e6c8' : 'rgba(242,240,236,.35)'}">${esc(o.time)}</div>
            </div>
            <button type="button" class="switch${on(active)}" data-act="oath-toggle" data-i="${i}"
              role="switch" aria-checked="${active}" aria-label="${esc(o.name)}"><i></i></button>
          </div>
        </div>`;
      }).join('')}

      <div style="height:34px"></div>
    </div>

    <button type="button" class="fab" data-act="sheet-new" aria-label="New oath">${stroke(PLUS, 26, '#1a1408')}</button>`;
}

function oathSheet() {
  if (S.sheet === null) return '';
  const editing = typeof S.sheet === 'number' ? OATHS[S.sheet] : null;

  return `
    <div class="scrim" data-act="sheet-close"></div>
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
          ${stroke(LOCK, 19, '#e7bc6a')}
          <div style="font-weight:600">App blocking</div>
        </div>
        <div class="tile__value">${S.picked.length} apps<span>›</span></div>
      </div>

      <div class="tile tile--row" style="margin-top:11px">
        <div style="font-weight:600">Strictness</div>
        <div class="tile__value" style="color:#e7bc6a;font-weight:600">${FRICTION_LEVELS[S.friction][0]}<span>›</span></div>
      </div>

      ${editing ? '<button type="button" class="oath-break">Break this oath</button>' : ''}

      <button type="button" class="tempted" style="margin-top:11px;font-size:14.5px;letter-spacing:2.4px;box-shadow:none"
        data-act="sheet-close">${editing ? 'SAVE CHANGES' : 'SWEAR IT'}</button>
      <div style="margin-top:11px;text-align:center;font-size:11.5px;color:rgba(242,240,236,.32)">Breaking an oath early is recorded in your history.</div>
      <div style="height:24px"></div>
    </div>`;
}

// ---------------------------------------------------------------- settings

const settingsRow = (icon, name, value, act) => `
  <button type="button" class="row"${act ? ` data-act="${act}"` : ''}>
    <span class="row__left">${stroke(icon, 20, '#e7bc6a')}<span class="row__name">${esc(name)}</span></span>
    <span class="row__value">${value ? esc(value) : ''}<span class="chev">›</span></span>
  </button>`;

function settingsTab() {
  return `
    <div class="scroll" style="top:44px;bottom:78px;padding:0">
      <div style="padding:24px 24px 0" class="big-title">Settings</div>

      <button type="button" class="account">
        <span class="account__ring">${stroke(PERSON, 24, '#e7bc6a')}</span>
        <span style="flex:1">
          <span style="display:block;font-size:11.5px;letter-spacing:2.2px;font-weight:700;color:#e7bc6a">SWORN MEMBER</span>
          <span style="display:block;margin-top:5px;font-family:var(--serif);font-size:23px;line-height:1">Your account</span>
        </span>
        <span class="chev">›</span>
      </button>

      <div class="group-label">THE OATH</div>
      <div class="group">
        ${settingsRow(PARTNER, 'Accountability partner', 'Marcus')}
        ${settingsRow(LOCK, 'Apps under oath', S.picked.length + ' apps')}
        ${settingsRow(MOON, 'Default locked window', '20:00 – 06:00')}
        <div class="row" style="cursor:default">
          <span class="row__left">${stroke(CROSS, 20, '#e7bc6a')}<span class="row__name">Faith mode</span></span>
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
          aria-current="${S.tab === id}">${stroke(ICONS[id], 22)}${label}</button>`).join('')}
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
  document.getElementById('glow').dataset.tab = S.tab;
  document.getElementById('screen').innerHTML = screenHtml();
  document.getElementById('nav').innerHTML = nav();
  document.getElementById('layer').innerHTML = (S.tab === 'home' ? intervention() : '') + (S.tab === 'commitments' ? oathSheet() : '');
  if (S.tab === 'home' && S.view === 'home') centerSeal(currentTier(), 'auto');
}

/** Centre a seal in the snap rail, matching the design's scrollTo(). */
function centerSeal(i, behavior) {
  const rail = document.getElementById('rail');
  if (!rail) return;
  const child = rail.children[i];
  if (!child) return;
  rail.scrollTo({
    left: child.offsetLeft - (rail.clientWidth - child.clientWidth) / 2,
    behavior: behavior || 'smooth'
  });
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
      if (S.tab === 'home' && S.view !== 'home') clearInterval(timer), S.view = 'home';
      S.tab = el.dataset.tab;
      return render();
    case 'seal': return centerSeal(i);
    case 'tempted': return startIntervention();
    case 'cancel':
    case 'resisted': return endIntervention();
    case 'range': S.range = el.dataset.range; return render();
    case 'oath-toggle': toggle(S.oathOn, i); return render();
    case 'oath-open': S.sheet = i; return render();
    case 'sheet-new': S.sheet = 'new'; return render();
    case 'sheet-close': S.sheet = null; return render();
    case 'night': toggle(S.activeDays, i); return render();
    case 'faith': S.faith = !S.faith; return render();
  }
});

render();
