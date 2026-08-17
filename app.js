/* Sworn — onboarding flow.
   Ported from the Claude Design source "Sworn Onboarding.dc.html". */

// ---------------------------------------------------------------- content



/* Behaviour-specific content lives in behavior.js. */
const quiz = () => B().quiz;

const CALC_NOTES = ['Understanding responses', 'Weighing your triggers', 'Shaping your commitment'];



const FEATURE_SLIDES = [
  ['WELCOME TO SWORN', "Sworn blocks the apps you choose, at the times you choose, with Apple's own Screen Time system. When temptation hits, it stands between you and the app.", '✦'],
  ['REWIRE YOUR BRAIN', 'Science-backed exercises help you rewire your brain, rebuild your dopamine receptors, and avoid setbacks.', '⬡'],
  ['STAY MOTIVATED', 'Breaking a habit this stubborn is hard. Your daily checkup keeps you motivated as you become your best self.', '☀'],
  ['AVOID SETBACKS', 'Sworn learns your habits and temptation triggers, providing you with 24/7 protection.', '⛨'],
  ['CONQUER YOURSELF', 'Know yourself to conquer yourself. Understand your strengths and weaknesses, earn medals, and track your progress.', '☖'],
  ['LEVEL UP YOUR LIFE', 'Rebooting has immense psychological and physical benefits. Grow stronger, healthier, and happier.', '❖']
];

/* Glyphs whose meaning is carried by their colour. */
const GLYPH_COLOR = {
  '♥': '#ff453a',   // red heart: what gets crowded out
  '⚥': '#e07ab8',   // desire
  '⬡': '#30d158',   // rewiring, growth green
  '⛨': '#ff453a',   // setbacks, warning red
  '✦': '#ffd60a',   // the welcome star
  '☀': '#ffd60a',   // motivation
  '☖': '#cfd6de',   // conquering yourself, silver
  '❖': '#e7bc6a'    // levelling up, gold
};

const SLIDE_TINTS = [
  'rgba(217,164,65,.22)', 'rgba(200,120,110,.2)', 'rgba(170,130,200,.2)',
  'rgba(110,150,200,.2)', 'rgba(120,190,150,.2)', 'rgba(217,164,65,.22)'
];

/* Two of the three hold for any of the behaviours; the middle one is theirs. */
const quoteDefs = () => [
  ['Andrew Huberman, Ph.D.', 'Drastically improve your life', 'Resetting your dopamine balance by taking a break from highly stimulating content can dramatically improve motivation, emotional stability, and everyday pleasure.'],
  B().quote,
  ['1 Corinthians 10:13', 'God gives a way out', 'God is faithful, who will not allow you to be tempted above what you are able, but will with the temptation also make the way of escape.']
];

const PLAN_DEFS = [
  ['Annual', '399,00 kr', 'per year'],
  ['Lifetime', '599,00 kr', 'pay once']
];

/* The result is real. Diagnostic questions carry a severity per option
   (0 mildest, 1 most severe, defined next to each question in behavior.js);
   the score is the mean severity mapped onto 35–90. Bounded on purpose: a
   self-report quiz can never honestly say 0 or 100.

   The "typical" bar is the same formula fed the middle answer on every
   question, so the comparison is like for like, not an invented constant. */
const SCORE_FLOOR = 35;
const SCORE_SPAN = 55;

function quizScore() {
  const points = [];
  quiz().forEach(([, options, severity], qi) => {
    if (!severity) return; // demographic
    const picked = options.indexOf(S.answers[QUIZ_START + qi]);
    if (picked !== -1) points.push(severity[picked]);
  });
  const mean = points.length
    ? points.reduce((sum, v) => sum + v, 0) / points.length
    : 0.5; // skipped test: shown as exactly typical
  return Math.round(SCORE_FLOOR + SCORE_SPAN * mean);
}

const typicalScore = () => Math.round(SCORE_FLOOR + SCORE_SPAN * 0.5);

// ---------------------------------------------------------------- step map

/* Step 0 is the behaviour question; the quiz runs from QUIZ_START. Everything
   downstream reads its copy from behavior.js rather than branching. */
const BEHAVIOR = 0;
const QUIZ_START = 1;

const CALCULATING = 11;
const ANALYSIS = 12;
const LIFE = 13;
const SYMPTOMS = 14;
const EDU = 15;
const FEAT = 20;
const GOALS = 26;

/* The commitment arc: why → what it cost → what changes → read it back →
   accept the friction. This is the part that turns "I want to stop" into
   "I'm making a commitment". */
const WHY = 27;
const WRITE = 28;
const REALIZE = 29;
const COST = 30;
const REFLECT = 31;
const COMMIT = 32;
const VULNERABLE = 33;
const PROTECT = 34;

const BENEFITS = 35;
const PATH = 36;
const REFERRAL = 37;
const NOTIFY = 38;
const READY = 39;
const PAYWALL = 40;

// ---------------------------------------------------------------- native bridge

/* Inside the app, app blocking uses Apple's own picker — the tokens it returns
   are opaque, so a hand-rolled list could never drive real blocking. In a
   browser there is no host, and the list stands in so the design previews. */
const NATIVE = typeof window !== 'undefined' && window.__swornNative === true;

/* Testing shortcuts. In the app the native host sets __swornDebug under
   #if DEBUG only, so a Release build can never show them; in a browser
   preview, add ?debug=1. */
const DEBUG_UI = typeof window !== 'undefined'
  && (window.__swornDebug === true || /[?&]debug=1\b/.test(window.location.search));
const native = (msg) => window.webkit?.messageHandlers?.sworn?.postMessage(msg);

/** Onboarding seeds oath 1, so that is what the picker writes against. */
const ONBOARDING_OATH_ID = 1;
let shieldSel = null;
let shieldCount = 0;

window.sworn = {
  onAuth() { /* nothing to redraw here */ },
  onCounts(counts) {
    shieldSel = (counts && counts[ONBOARDING_OATH_ID]) || null;
    shieldCount = selectionTotal(shieldSel);
    render();
  }
};

// ---------------------------------------------------------------- state

const S = {
  step: 0,
  protSection: null,
  answers: {},
  pct: 0,
  symptoms: [],
  goals: [],
  referral: '',
  plan: 0
};

let timer = null;

// ---------------------------------------------------------------- icons

const CHEVRON = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="rgba(242,240,236,.75)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`;
const CHECK = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#1a1408" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`;
const STAR = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#e7bc6a"><path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>`;
const SPARKLE = `<svg width="17" height="17" viewBox="0 0 24 24" fill="#e7bc6a"><path d="M12 2.5l2.2 1.6 2.7-.2.9 2.6 2.2 1.6-1 2.6 1 2.6-2.2 1.6-.9 2.6-2.7-.2L12 21.5l-2.2-1.6-2.7.2-.9-2.6L4 15.9l1-2.6-1-2.6 2.2-1.6.9-2.6 2.7.2z"/></svg>`;
const BELL = `<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#e7bc6a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5z"/><path d="M10.3 19a2 2 0 0 0 3.4 0"/><circle cx="17.5" cy="6.5" r="2.8" fill="#e7bc6a" stroke="none"/></svg>`;

const backCircle = () => `<button type="button" class="back-circle" data-act="back" aria-label="Go back">${CHEVRON(20)}</button>`;

const termIcon = (paths) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e7bc6a" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const LOCK_ICON = termIcon('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7"/>');
const CLOCK_ICON = termIcon('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.4V12l3 1.8"/>');
const SHIELD_ICON = termIcon('<path d="M12 3.2 19 6v5.8c0 4.4-2.9 7.4-7 9-4.1-1.6-7-4.6-7-9V6z"/>');

// ---------------------------------------------------------------- helpers

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const on = (cond) => (cond ? ' is-on' : '');

/** Which carousel, if any, the current step falls inside. */
function slideSet() {
  if (S.step >= EDU && S.step < FEAT) return { set: B().slides, base: EDU, edu: true };
  if (S.step >= FEAT && S.step < GOALS) return { set: FEATURE_SLIDES, base: FEAT, edu: false };
  return null;
}

// ---------------------------------------------------------------- navigation

function go(step) {
  clearInterval(timer);
  S.step = step;
  render();
  if (step === PATH) armPath();
  if (step === LIFE) armLife();
}

/* End of the flow. In the app this hands over to sign-in and then home; in a
   browser there is no native host, so just walk to the main page. */
function finishOnboarding() {
  setWhyField('committed', true);
  // Day zero of DAYS FREE. Replaying onboarding recommits, so it restarts too.
  // startStreak also stages the profile for the backend; it is pushed the
  // moment sign-in creates a session.
  startStreak();
  if (NATIVE) {
    const p = loadProtect();
    native({ action: 'sync', oaths: [{ id: ONBOARDING_OATH_ID, time: p.from, until: p.to, days: p.days, on: true }] });
  }
  if (window.webkit?.messageHandlers?.sworn) {
    window.webkit.messageHandlers.sworn.postMessage({ action: 'onboarded' });
    return;
  }
  try { localStorage.setItem('sworn.onboarded', '1'); } catch (e) { /* storage blocked */ }
  window.location.href = 'home.html';
}

function next() {
  if (S.step === ANALYSIS && !B().lifeCost) return go(SYMPTOMS);
  if (S.step === SYMPTOMS) return go(EDU);
  go(S.step + 1);
}

function startCalc() {
  clearInterval(timer);
  S.step = CALCULATING;
  S.pct = 0;
  render();
  timer = setInterval(() => {
    S.pct = Math.min(100, S.pct + 2);
    if (S.pct >= 100) return go(ANALYSIS);
    paintRing();
  }, 55);
}

/** The ring ticks 18 times a second — patch it in place instead of re-rendering. */
function paintRing() {
  const ring = document.querySelector('.ring');
  if (!ring) return;
  ring.style.background = `conic-gradient(#e7bc6a ${S.pct}%, rgba(255,255,255,.07) ${S.pct}%)`;
  ring.querySelector('.ring__pct').textContent = S.pct + '%';
  const note = document.querySelector('.calc__note');
  if (note) note.textContent = CALC_NOTES[Math.min(CALC_NOTES.length - 1, Math.floor(S.pct / 34))];
}

function pickOption(i) {
  const from = S.step;
  S.answers[from] = quiz()[from - QUIZ_START][1][i];
  render();
  // Let the selected state land before advancing.
  setTimeout(() => {
    if (S.step !== from) return;
    if (from >= QUIZ_START + quiz().length - 1) return startCalc();
    go(from + 1);
  }, 190);
}

function toggle(list, value) {
  const i = list.indexOf(value);
  if (i === -1) list.push(value); else list.splice(i, 1);
  render();
}

// ---------------------------------------------------------------- screens

function renderChrome() {
  if (S.step >= CALCULATING) return '';
  const total = QUIZ_START + quiz().length;
  const progress = Math.round((Math.min(S.step, total) / total) * 100);
  return `
    <div class="chrome">
      ${S.step > 0
        ? `<button type="button" class="chrome__back" data-act="back" aria-label="Go back">${CHEVRON(22)}</button>`
        : '<span class="chrome__back" style="visibility:hidden" aria-hidden="true"></span>'}
      <div class="progress" role="progressbar" aria-label="Quiz progress"
        aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress__fill" style="width:${progress}%"></div>
      </div>
    </div>`;
}

/* The first thing we ask, because everything after it is phrased in terms of
   the answer. Selecting does not auto-advance — this one is worth re-reading
   before committing to it. */
function behaviorScreen() {
  const current = behaviorChosen() ? loadBehavior() : null;
  return `
    <div class="screen q anim-rise-fast">
      <div class="eyebrow">FIRST</div>
      <div class="q__text" id="qtext">What do you want Sworn to help you stop?</div>
      <div class="q__options" role="radiogroup" aria-labelledby="qtext" style="margin-top:26px">
        ${BEHAVIORS.map((id, i) => {
          const cfg = BEHAVIOR_CONFIG[id];
          const sel = current === id;
          return `
          <button type="button" class="opt opt--tall${on(sel)}" data-act="behavior" data-i="${i}"
            role="radio" aria-checked="${sel}">
            <span class="opt__n">${i + 1}</span>
            <span class="opt__stack">
              <span class="opt__label">${esc(cfg.choice)}</span>
              <span class="opt__note">${esc(cfg.choiceNote)}</span>
            </span>
          </button>`;
        }).join('')}
      </div>
      <button class="cta${current ? '' : ' cta--muted'}" style="margin-top:auto"
        data-act="next"${current ? '' : ' disabled'}>Continue</button>
    </div>`;
}

function question() {
  const [text, options, , note] = quiz()[S.step - QUIZ_START];
  return `
    <div class="screen q">
      <div class="eyebrow">QUESTION #${S.step - QUIZ_START + 1}</div>
      <div class="q__text" id="qtext">${esc(text)}</div>
      ${note ? `<div class="serif" style="margin-top:12px;text-align:center;font-size:17px;color:rgba(242,240,236,.5)">${esc(note)}</div>` : ''}
      <div class="q__options" role="radiogroup" aria-labelledby="qtext">
        ${options.map((label, i) => `
          <button type="button" class="opt${on(S.answers[S.step] === label)}" data-act="option" data-i="${i}"
            role="radio" aria-checked="${S.answers[S.step] === label}">
            <span class="opt__n">${i + 1}</span>
            <span class="opt__label">${esc(label)}</span>
          </button>`).join('')}
      </div>
      ${DEBUG_UI ? '<button type="button" class="skip" data-act="skip">Skip test</button>' : ''}
    </div>`;
}

function calculating() {
  return `
    <div class="screen calc anim-rise">
      <div class="ring" role="progressbar" aria-label="Calculating your result"
        aria-valuenow="${S.pct}" aria-valuemin="0" aria-valuemax="100"
        style="background:conic-gradient(#e7bc6a ${S.pct}%, rgba(255,255,255,.07) ${S.pct}%)">
        <div class="ring__hole"></div>
        <div class="ring__pct">${S.pct}%</div>
      </div>
      <div style="margin-top:58px;font-size:26px;font-weight:700;letter-spacing:4.6px">CALCULATING</div>
      <div class="calc__note serif" aria-live="polite" style="margin-top:14px;font-size:21px;color:rgba(242,240,236,.5)">${esc(CALC_NOTES[0])}</div>
    </div>`;
}

function analysis() {
  const score = quizScore();
  const typical = typicalScore();
  const diff = score - typical;
  const verdict = diff >= 0 ? B().analysis.verdict : B().analysis.verdictMild;
  const compare = diff === 0
    ? 'Right at the typical result'
    : `<span>${Math.abs(diff)} points</span> ${diff > 0 ? 'above' : 'below'} the typical result`;

  return `
    <div class="screen analysis anim-rise">
      ${backCircle()}
      <div style="margin-top:14px;display:flex;align-items:center;gap:12px">
        <div style="font-size:22px;font-weight:700;letter-spacing:3.2px;line-height:1.1">ANALYSIS COMPLETE</div>
        <div class="check-badge check-badge--plain" style="width:28px;height:28px;flex:0 0 28px">${CHECK(15)}</div>
      </div>
      <div class="serif" style="margin-top:11px;font-size:21px;color:rgba(242,240,236,.55);text-wrap:pretty">We've got some news to break to you...</div>

      <div class="card" style="margin-top:18px;padding:18px 16px 14px;border-radius:22px">
        <div style="text-align:center;font-size:14px;line-height:1.45;color:rgba(242,240,236,.72);text-wrap:pretty">${esc(verdict)}</div>
        <div class="bars">
          <div class="bar-col">
            <div class="bar-track"><div class="bar-you" style="height:${Math.round(152 * score / 100)}px">${score}%</div></div>
            <div class="bar-label">Your score</div>
          </div>
          <div class="bar-col">
            <div class="bar-track"><div class="bar-avg__fill" style="height:${Math.round(152 * typical / 100)}px">${typical}%</div></div>
            <div class="bar-label bar-label--dim">Typical</div>
          </div>
        </div>
      </div>

      <div style="margin-top:16px;text-align:center;font-size:15px;font-weight:600">${compare}</div>
      <div style="margin-top:8px;text-align:center;font-size:11.5px;color:rgba(242,240,236,.35);line-height:1.5">* This result is an indication only, not a medical diagnosis.</div>
      <button class="cta cta--glow" style="margin-top:auto;" data-act="next">Check your symptoms</button>
    </div>`;
}

/* How much life the habit takes, in years. The number is computed instantly
   (the calculating screen already covered the "thinking"); the drama is in the
   count-up, which starts low, runs fast and eases out onto the real figure. */
function lifeCostYears() {
  const lc = B().lifeCost || { question: 1, hours: {} };
  const answer = S.answers[QUIZ_START + lc.question];
  const hours = lc.hours[answer] || 3;
  // A fixed sixty-year horizon: roughly a young adult carried to the average
  // life expectancy. Deliberately round — the screen says it is approximate.
  const remaining = 60;
  return { hours, years: Math.max(0.1, (hours / 24) * remaining) };
}

function lifeScreen() {
  const { hours, years } = lifeCostYears();
  return `
    <div class="screen realize anim-rise-fast">
      ${backCircle()}
      <div style="margin-top:44px;font-size:12px;letter-spacing:3.2px;font-weight:600;color:rgba(242,240,236,.45)">AT YOUR PACE</div>
      <div style="margin-top:18px;display:flex;align-items:baseline;gap:12px">
        <span id="lifeyears" style="font-size:74px;font-weight:700;letter-spacing:-1px;color:#e7bc6a">${years < 1 ? '0.1' : '1.0'}</span>
        <span style="font-size:22px;font-weight:700;letter-spacing:3px">YEARS</span>
      </div>
      <div class="serif" style="margin-top:20px;font-size:24px;line-height:1.3;color:#f4e6c8;text-wrap:pretty">of your life will go to the feed if nothing changes.</div>
      <div style="margin-top:16px;font-size:13px;line-height:1.55;color:rgba(242,240,236,.45);text-wrap:pretty">About ${hours} ${hours === 1 ? 'hour' : 'hours'} a day, carried across the next sixty years. An approximation, and a conservative one.</div>
      <button class="cta cta--glow cta--muted" style="margin-top:auto;" id="lifecta" data-act="next" disabled>Continue</button>
    </div>`;
}

/* Fast at first, easing onto the final figure, like a meter settling. */
function armLife() {
  const { years } = lifeCostYears();
  const start = years < 1 ? 0.1 : 1;
  const duration = 2400;
  const t0 = Date.now();
  timer = setInterval(() => {
    const t = Math.min(1, (Date.now() - t0) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const el = document.getElementById('lifeyears');
    if (el) el.textContent = (start + (years - start) * eased).toFixed(1);
    if (t >= 1) {
      clearInterval(timer);
      const cta = document.getElementById('lifecta');
      if (cta) { cta.disabled = false; cta.classList.remove('cta--muted'); }
    }
  }, 30);
}

function symptoms() {
  return `
    <div class="screen symptoms anim-rise">
      <div class="topbar" style="padding:0 22px">
        ${backCircle()}
        <div class="topbar__title">SYMPTOMS</div>
      </div>
      <div class="scroll" style="top:54px;bottom:98px">
        <div class="banner">${esc(B().analysis.symptomsIntro)}</div>
        <div class="serif" style="margin-top:20px;font-size:22px">Select any symptoms below:</div>
        ${B().symptoms.map(([name, items], gi) => `
          <div class="group-name" id="sym${gi}">${esc(name)}</div>
          <div class="group-items" role="group" aria-labelledby="sym${gi}">
            ${items.map((label, ii) => {
              const key = gi + ':' + ii;
              const sel = S.symptoms.includes(key);
              return `
              <button type="button" class="pickrow${on(sel)}" data-act="symptom" data-key="${key}" aria-pressed="${sel}">
                <span class="dot"></span>
                <span class="pickrow__label">${esc(label)}</span>
              </button>`;
            }).join('')}
          </div>`).join('')}
        <div style="height:26px"></div>
      </div>
      <div class="footer-bar">
        <button class="cta cta--glow" data-act="next">Reboot my brain</button>
      </div>
    </div>`;
}

function slide(ctx) {
  const { set, base, edu } = ctx;
  const idx = S.step - base;
  const [title, body, glyph] = set[idx];
  const tint = SLIDE_TINTS[idx % SLIDE_TINTS.length];
  const glyphColor = GLYPH_COLOR[glyph];
  const cta = edu && idx === set.length - 1 ? 'CONTINUE →' : 'NEXT →';

  return `
    <div class="screen slide anim-rise-fast">
      ${edu ? `
        <div class="slide__bars">
          ${set.map((_, i) => `<div class="slide__bar" style="width:${i === idx ? 34 : 14}px;background:${i <= idx ? '#e7bc6a' : 'rgba(255,255,255,.16)'}"></div>`).join('')}
        </div>` : `<div class="wordmark">SWORN</div>`}

      <div class="orb" style="background:radial-gradient(circle at 38% 30%, ${tint} 0%, rgba(12,12,13,.9) 70%);box-shadow:0 0 60px ${tint}">
        <div class="orb__glyph"${glyphColor ? ` style="color:${glyphColor}"` : ''}>${glyph}</div>
      </div>

      <div class="slide__title">${esc(title)}</div>
      <div class="slide__body">${esc(body)}</div>

      <div class="slide__dots">
        ${set.map((_, i) => `<button type="button" class="slide__dot" style="background:${i === idx ? '#f4e6c8' : 'rgba(242,240,236,.24)'}"
          data-act="slide" data-i="${base + i}" aria-label="Go to slide ${i + 1} of ${set.length}"${i === idx ? ' aria-current="true"' : ''}></button>`).join('')}
      </div>
      <button class="cta cta--glow" style="margin-top:18px" data-act="next">${cta}</button>
    </div>`;
}

function goals() {
  return `
    <div class="screen goals anim-rise-fast">
      <div style="padding:0 22px">
        ${backCircle()}
        <div style="margin-top:16px;font-size:24px;font-weight:700;letter-spacing:4px;line-height:1.15">CHOOSE YOUR GOALS</div>
        <div class="serif" style="margin-top:12px;font-size:20px;color:rgba(242,240,236,.55);text-wrap:pretty">Select the goals you wish to track during your reboot.</div>
      </div>
      <div class="scroll" style="top:172px;bottom:98px">
        <div style="display:flex;flex-direction:column;gap:11px" role="group" aria-label="Goals to track">
          ${B().goals.map((label, i) => {
            const sel = S.goals.includes(i);
            return `
            <button type="button" class="goal${on(sel)}" data-act="goal" data-i="${i}" aria-pressed="${sel}">
              <span class="goal__label">${esc(label)}</span>
              <span class="dot"></span>
            </button>`;
          }).join('')}
        </div>
        <div style="height:24px"></div>
      </div>
      <div class="footer-bar">
        <button class="cta cta--glow" data-act="next">Track these goals</button>
      </div>
    </div>`;
}

function whyScreen() {
  const why = loadWhy();
  return `
    <div class="screen why anim-rise-fast">
      <div style="padding:0 22px">
        ${backCircle()}
        <div style="margin-top:16px;font-size:24px;font-weight:700;letter-spacing:4px;line-height:1.15">WHY DO YOU WANT TO STOP?</div>
        <div class="serif" style="margin-top:12px;font-size:20px;color:rgba(242,240,236,.55);text-wrap:pretty">Sworn reads this back to you the moment you're tempted.</div>
      </div>
      <div class="scroll" style="top:186px;bottom:98px">
        <div style="display:flex;flex-direction:column;gap:10px" role="group" aria-label="Reasons">
          ${reasonLabels().map((label, i) => {
            const sel = why.reasons.includes(i);
            return `
            <button type="button" class="pickrow${on(sel)}" data-act="reason" data-i="${i}" aria-pressed="${sel}">
              <span class="dot"></span>
              <span class="pickrow__label">${esc(label)}</span>
            </button>`;
          }).join('')}
        </div>
        <div style="height:24px"></div>
      </div>
      <div class="footer-bar">
        <button class="cta cta--glow" data-act="next">Continue</button>
      </div>
    </div>`;
}

/* Their own reason, turned back on them. This is the moment onboarding stops
   collecting answers and starts making a case. */
function realizeScreen() {
  const [title, body] = realization();
  return `
    <div class="screen realize anim-rise-fast">
      ${backCircle()}
      <div class="realize__title">${esc(title)}</div>
      <div class="realize__body">${esc(body)}</div>
      <button class="cta cta--glow" style="margin-top:auto;" data-act="next">Continue</button>
    </div>`;
}

/** A screen that asks them to write something, and will not move on until they do. */
function writeScreen({ title, prompt, field, placeholder, cta }) {
  const value = loadWhy()[field];
  return `
    <div class="screen why anim-rise-fast">
      <div style="padding:0 22px">
        ${backCircle()}
        <div style="margin-top:16px;font-size:24px;font-weight:700;letter-spacing:4px;line-height:1.15">${title}</div>
        <div class="serif" style="margin-top:12px;font-size:20px;color:rgba(242,240,236,.55);text-wrap:pretty">${prompt}</div>
      </div>
      <div class="scroll" style="top:186px;bottom:98px">
        <textarea class="field field--area field--tall" data-bind="${field}"
          placeholder="${esc(placeholder)}">${esc(value)}</textarea>
        <div style="margin-top:12px;font-size:12.5px;color:rgba(242,240,236,.35);line-height:1.5">Only you ever see this. Sworn reads it back to you when you need it.</div>
        <div style="height:24px"></div>
      </div>
      <div class="footer-bar">
        <button class="cta cta--glow${value.trim() ? '' : ' cta--muted'}"
          data-act="next" id="writecta"${value.trim() ? '' : ' disabled'}>${cta}</button>
      </div>
    </div>`;
}

function costScreen() {
  return writeScreen({
    title: 'WHAT HAS IT COST YOU?',
    prompt: 'Name what it has already taken. Be honest. No one else reads this.',
    field: 'cost',
    placeholder: 'My sleep, my focus, and how I feel about myself.',
    cta: 'CONTINUE →'
  });
}

/* Reasons picked from a list are cheap. This one is theirs, and it is what
   gets read back at the moment of temptation, so it cannot be skipped. */
function writeWhyScreen() {
  return writeScreen({
    title: 'IN YOUR OWN WORDS',
    prompt: 'Why do you want to stop? One honest sentence is enough.',
    field: 'text',
    placeholder: "I don't want to waste another year of my life doing this.",
    cta: 'Save my why'
  });
}

/** Their own words, handed back before they are asked to commit. */
function reflectScreen() {
  return `
    <div class="screen reflect anim-rise-fast">
      ${backCircle()}
      <div style="margin-top:38px;font-size:12px;letter-spacing:3.2px;font-weight:600;color:rgba(242,240,236,.45)">YOU SAID</div>
      <div class="serif" style="margin-top:18px;font-size:27px;line-height:1.3;color:#f4e6c8;text-wrap:pretty">“${esc(commitmentQuote())}”</div>
      <div style="margin-top:34px;font-size:17px;font-weight:600;line-height:1.4">Don't forget why you're here.</div>
      <div style="margin-top:14px;font-size:15px;line-height:1.55;color:rgba(242,240,236,.55);text-wrap:pretty">You're not downloading another app to remind you that you should stop. You're here to actually stop.</div>
      <button class="cta cta--glow" style="margin-top:auto;" data-act="next">Make the commitment</button>
    </div>`;
}

const COMMIT_TERMS = [
  [LOCK_ICON, 'Your protected apps will be blocked during the times you choose.'],
  [CLOCK_ICON, "If you try to bypass your protection, you'll have to wait before you can disable it."],
  [SHIELD_ICON, 'Sworn will make this harder to break. That is the point of it.']
];

function commitScreen() {
  return `
    <div class="screen commit anim-rise-fast">
      ${backCircle()}
      <div style="margin-top:30px;font-size:25px;font-weight:700;letter-spacing:3.8px;line-height:1.2">YOU'RE MAKING A COMMITMENT</div>
      <div class="serif" style="margin-top:14px;font-size:20px;color:rgba(242,240,236,.55);text-wrap:pretty">Not a reminder. Not a tracker. Something you have to keep.</div>

      <div class="terms">
        ${COMMIT_TERMS.map(([icon, text]) => `
          <div class="term">
            <div class="term__icon">${icon}</div>
            <div class="term__text">${esc(text)}</div>
          </div>`).join('')}
      </div>

      <div style="margin-top:auto;text-align:center;font-size:17px;font-weight:600">Hold the button to commit.</div>
      <button class="cta cta--glow cta-hold" style="margin-top:16px;" data-hold="commit">
        <span class="cta-hold__fill"></span>
        <span class="cta-hold__label">I'm ready</span>
      </button>
      <button type="button" class="skip" style="margin-top:14px;flex:0 0 auto" data-act="back">Not yet</button>
    </div>`;
}

/* Named before the schedule, so the times they pick next are an answer to
   something they just said rather than a blank clock. */
function vulnerableScreen() {
  const picked = loadWhy().triggers;
  const opts = B().vulnerable;
  return `
    <div class="screen why anim-rise-fast">
      <div class="topbar" style="padding:0 22px">
        ${backCircle()}
        <div class="topbar__title">WHEN IS IT HARDEST?</div>
      </div>
      <div class="scroll" style="top:54px;bottom:98px">
        <div class="serif" style="font-size:20px;color:rgba(242,240,236,.55);text-wrap:pretty">Pick the moments it usually happens. Sworn protects those first.</div>
        <div style="margin-top:18px;display:flex;flex-direction:column;gap:10px">
          ${opts.map((label, i) => {
            const sel = picked.includes(i);
            return `
            <button type="button" class="pickrow${on(sel)}" data-act="trigger" data-i="${i}" aria-pressed="${sel}">
              <span class="dot"></span>
              <span class="pickrow__label">${esc(label)}</span>
            </button>`;
          }).join('')}
        </div>
        <div style="height:24px"></div>
      </div>
      <div class="footer-bar">
        <button class="cta${picked.length ? '' : ' cta--muted'}" data-act="next"${picked.length ? '' : ' disabled'}>Continue</button>
      </div>
    </div>`;
}

/* Their first scheduled protection. The framing matters: this is not a
   punishment, it is them saying "I know I'm vulnerable at these times". */
/* Laid out like editing an alarm, and like the oath sheet on the Commitments
   page: rows that expand in place. Nothing is preselected; the CTA waits for
   both nights and apps. */
function protectScreen() {
  const p = loadProtect();
  const ready = (NATIVE ? shieldCount > 0 : p.apps.length > 0) && p.days.length > 0;
  const sec = S.protSection;
  const appsLabel = NATIVE
    ? (shieldCount ? selectionLabel(shieldSel) : 'None yet')
    : (p.apps.length ? p.apps.length + (p.apps.length === 1 ? ' app' : ' apps') : 'None yet');

  const row = (label, value, section, act) => `
    <button type="button" class="tile tile--row${on(sec === section)}" style="margin-top:11px"
      data-act="${act || 'prot-section'}" data-section="${section}" aria-expanded="${sec === section}">
      <span style="font-weight:600">${label}</span>
      <span class="tile__value"><span id="protval-${section}">${esc(value)}</span><span class="tile__chev">›</span></span>
    </button>`;

  return `
    <div class="screen protect anim-rise-fast">
      <div style="padding:0 22px">
        ${backCircle()}
        <div style="margin-top:16px;font-size:24px;font-weight:700;letter-spacing:4px;line-height:1.15">SET YOUR PROTECTION</div>
        <div class="serif" style="margin-top:12px;font-size:20px;color:rgba(242,240,236,.55);text-wrap:pretty">${esc(B().commitLine)}</div>
      </div>

      <div class="scroll" style="top:186px;bottom:98px">
        ${row('Locks at', p.from, 'from')}
        ${sec === 'from' ? `
        <div class="tile tile--sub">
          <input type="time" class="time-input" data-bind="protectFrom" value="${esc(p.from)}">
        </div>` : ''}

        ${row('Unlocks at', p.to, 'until')}
        ${sec === 'until' ? `
        <div class="tile tile--sub">
          <input type="time" class="time-input" data-bind="protectTo" value="${esc(p.to)}">
        </div>` : ''}

        <div class="tile" style="margin-top:11px;padding:18px">
          <div style="font-size:13px;color:rgba(242,240,236,.55)">On these nights</div>
          <div class="nights">
            ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => `
              <button type="button" class="night${on(p.days.includes(i))}" data-act="protect-day" data-i="${i}"
                aria-pressed="${p.days.includes(i)}">${label}</button>`).join('')}
          </div>
        </div>

        ${NATIVE
          ? row('App blocking', appsLabel, 'apps', 'pick-apps')
          : row('App blocking', appsLabel, 'apps')}
        ${!NATIVE && sec === 'apps' ? `
        <div class="tile tile--sub" style="padding:8px;display:flex;flex-direction:column;gap:4px">
          ${B().apps.map((name) => {
            const selApp = p.apps.includes(name);
            return `
            <button type="button" class="pickrow${on(selApp)}" style="border-radius:12px" data-act="protect-app" data-app="${esc(name)}" aria-pressed="${selApp}">
              <span class="dot"></span>
              <span class="pickrow__label">${esc(name)}</span>
            </button>`;
          }).join('')}
        </div>` : ''}
        <div style="height:24px"></div>
      </div>

      <div class="footer-bar">
        <button class="cta${ready ? '' : ' cta--muted'}" data-act="next" id="protectcta"${ready ? '' : ' disabled'}>Protect these hours</button>
      </div>
    </div>`;
}

function benefits() {
  return `
    <div class="screen benefits anim-rise-fast">
      <div class="topbar" style="padding:0 22px">
        ${backCircle()}
        <div class="topbar__title">REWIRING BENEFITS</div>
      </div>
      <div class="scroll" style="top:54px;bottom:98px">
        ${quoteDefs().map(([name, head, body]) => `
          <div class="quote-head">
            <div style="font-size:16px;font-weight:700">${esc(name)}</div>
            ${SPARKLE}
          </div>
          <div class="card" style="margin-top:11px;padding:17px">
            <div style="font-size:15.5px;font-weight:700">${esc(head)}</div>
            <div style="margin-top:9px;font-size:14px;line-height:1.5;color:rgba(242,240,236,.55);text-wrap:pretty">${esc(body)}</div>
          </div>`).join('')}
        <div style="height:24px"></div>
      </div>
      <div class="footer-bar">
        <button class="cta" data-act="next">Continue</button>
      </div>
    </div>`;
}

function path() {
  return `
    <div class="screen path anim-rise-fast">
      <div class="topbar">
        ${backCircle()}
        <div class="topbar__title">REWIRING BENEFITS</div>
      </div>
      <div style="margin-top:36px;font-size:26px;font-weight:700;letter-spacing:3.8px;line-height:1.15">YOUR PATH TO FREEDOM</div>
      <div class="serif" style="margin-top:12px;font-size:20px;color:rgba(242,240,236,.55)">With Sworn, recovery is possible</div>
      <div style="margin-top:34px">
        <svg width="100%" height="190" viewBox="0 0 340 190" fill="none">
          <path class="path-draw" pathLength="1" d="M6 150 C50 146 60 120 96 118 C132 116 150 96 186 88 C222 80 250 44 334 24" stroke="#e7bc6a" stroke-width="4" stroke-linecap="round"/>
          <path class="path-draw" pathLength="1" d="M6 150 C50 146 60 158 96 160 C132 162 150 138 186 142 C222 146 250 130 334 178" stroke="#8f8f96" stroke-width="3.4" stroke-linecap="round"/>
          <circle class="path-pop" cx="334" cy="24" r="8" fill="#f4e6c8" stroke="#0a0a0b" stroke-width="3"/>
          <g class="path-pop" stroke="#8f8f96" stroke-width="3" stroke-linecap="round">
            <path d="M76 152l12 12M88 152l-12 12"/>
            <path d="M156 132l12 12M168 132l-12 12"/>
            <path d="M246 130l12 12M258 130l-12 12"/>
          </g>
        </svg>
      </div>
      <div class="legend">
        <span><span class="swatch" style="background:#e7bc6a"></span>With Sworn</span>
        <span class="dim"><span class="swatch" style="background:#8f8f96"></span>Without</span>
        <span class="dim">✕ Setbacks</span>
      </div>
      <button class="cta cta--muted" style="margin-top:auto" id="pathcta" data-act="next" disabled>Continue</button>
    </div>`;
}

/* The continue button unlocks once the lines have finished drawing. A patch
   rather than a re-render, so the animation is not restarted. */
function armPath() {
  timer = setTimeout(() => {
    const cta = document.getElementById('pathcta');
    if (cta) { cta.disabled = false; cta.classList.remove('cta--muted'); }
  }, 2000);
}

function referral() {
  return `
    <div class="screen referral anim-rise-fast">
      ${backCircle()}
      <div style="margin-top:20px;font-size:25px;font-weight:700;letter-spacing:4px;line-height:1.2">DO YOU HAVE A REFERRAL CODE?</div>
      <div class="serif" style="margin-top:12px;font-size:20px;color:rgba(242,240,236,.5)">You can skip this step.</div>
      <input class="field field--pill" style="margin-top:auto;margin-bottom:auto" data-bind="referral" value="${esc(S.referral)}" placeholder="Referral Code">
      <button class="cta" data-act="next">Next</button>
    </div>`;
}

function notify() {
  return `
    <div class="screen notify anim-rise-fast">
      <div style="align-self:flex-start">${backCircle()}</div>
      <div style="margin-top:120px">${BELL}</div>
      <div style="margin-top:40px;text-align:center;font-size:25px;font-weight:700;letter-spacing:3.8px;line-height:1.2">STAY ON TRACK WITH REMINDERS</div>
      <div class="serif" style="margin-top:18px;text-align:center;font-size:20px;line-height:1.4;color:rgba(242,240,236,.55);text-wrap:pretty">${esc(B().notifyLine)}</div>
      <button class="cta cta--glow" style="margin-top:auto;letter-spacing:2.4px" data-act="notify-on">Enable notifications</button>
      <button type="button" class="notlater" data-act="next">Not now</button>
    </div>`;
}

function planReady() {
  return `
    <div class="ready__bg"></div>
    <div class="screen ready anim-rise-fast">
      <div class="check-badge" style="width:34px;height:34px">${CHECK(18)}</div>
      <div style="margin-top:18px;text-align:center;font-size:25px;font-weight:700;letter-spacing:3.6px;line-height:1.2">WE'VE MADE YOU A CUSTOM PLAN</div>
      <div class="rule"></div>
      <div class="stars" style="margin-top:30px;gap:5px">${STAR(22).repeat(5)}</div>
      <div class="serif" style="margin-top:24px;text-align:center;font-size:26px;line-height:1.25">Become the best of yourself with Sworn</div>
      <button class="cta cta--cream" style="margin-top:auto;" data-act="next">Become Sworn</button>
      <div style="margin-top:14px;text-align:center;font-size:11.5px;font-weight:600;color:rgba(242,240,236,.42);line-height:1.6">Purchase appears discretely<br>Cancel anytime</div>
    </div>`;
}

const PAYWALL_POINTS = [
  'Real app blocking during your riskiest hours',
  'A 60 second intervention when you are tempted',
  'Your own commitment, read back when it matters'
];

function paywall() {
  return `
    <div class="screen paywall anim-rise-fast" style="display:flex;flex-direction:column;padding:0 24px calc(16px + var(--safe-bottom));overflow:hidden">
      <div style="text-align:center;font-size:15px;font-weight:700;letter-spacing:6px">SWORN</div>
      <div style="margin-top:30px;text-align:center;font-size:24px;font-weight:700;letter-spacing:3px;line-height:1.2">IT'S NOT ABOUT WILLPOWER</div>
      <div class="serif" style="margin-top:12px;text-align:center;font-size:21px;color:rgba(242,240,236,.62)">It's about a system that actually works</div>

      <div style="margin-top:30px;display:flex;flex-direction:column;gap:14px">
        ${PAYWALL_POINTS.map((point) => `
          <div style="display:flex;align-items:center;gap:12px">
            <span style="flex:0 0 auto;color:#e7bc6a;font-size:15px;font-weight:700">✓</span>
            <span style="font-size:14.5px;line-height:1.4;color:rgba(242,240,236,.75)">${esc(point)}</span>
          </div>`).join('')}
      </div>

      <div role="radiogroup" aria-label="Choose your plan" style="margin-top:auto">
        ${PLAN_DEFS.map(([name, price, note], i) => `
          <button type="button" class="plan${on(S.plan === i)}" data-act="plan" data-i="${i}"
            role="radio" aria-checked="${S.plan === i}">
            <span style="display:flex;align-items:center;gap:12px">
              <span class="plan__radio"><i></i></span>
              <span style="font-size:16px;font-weight:700">${esc(name)}</span>
            </span>
            <span style="display:block;text-align:right">
              <span style="display:block;font-size:16px;font-weight:700">${esc(price)}</span>
              <span style="display:block" class="plan__note">${esc(note)}</span>
            </span>
          </button>`).join('')}
      </div>

      <div style="margin-top:14px;text-align:center;font-size:12.5px;color:rgba(242,240,236,.4)">No commitment, cancel anytime</div>
      <button class="cta cta--glow" style="margin-top:12px" data-act="finish">Start my journey</button>
    </div>`;
}

function screenHtml() {
  const step = S.step;
  if (step === BEHAVIOR) return behaviorScreen();
  if (step >= QUIZ_START && step < QUIZ_START + quiz().length) return question();
  if (step === CALCULATING) return calculating();
  if (step === ANALYSIS) return analysis();
  if (step === LIFE) return lifeScreen();
  if (step === SYMPTOMS) return symptoms();

  const carousel = slideSet();
  if (carousel) return slide(carousel);

  switch (step) {
    case GOALS: return goals();
    case WHY: return whyScreen();
    case WRITE: return writeWhyScreen();
    case REALIZE: return realizeScreen();
    case COST: return costScreen();
    case REFLECT: return reflectScreen();
    case COMMIT: return commitScreen();
    case VULNERABLE: return vulnerableScreen();
    case PROTECT: return protectScreen();
    case BENEFITS: return benefits();
    case PATH: return path();
    case REFERRAL: return referral();
    case NOTIFY: return notify();
    case READY: return planReady();
    case PAYWALL: return paywall();
    default: return '';
  }
}

let renderedStep = null;

function render() {
  const same = renderedStep === S.step;
  const scroller = same ? document.querySelector('.scroll') : null;
  const keepScroll = scroller ? scroller.scrollTop : 0;

  document.getElementById('chrome').innerHTML = renderChrome();
  document.getElementById('screen').innerHTML = screenHtml();

  /* Re-rendering the same step is a selection update, not an arrival.
     Replaying the entrance animation makes every tap flash, and the rebuilt
     scroller forgets where it was; freeze both. */
  if (same) {
    document.querySelectorAll('#screen [class*="anim-"]').forEach((el) => { el.style.animation = 'none'; });
    const sc = document.querySelector('.scroll');
    if (sc) sc.scrollTop = keepScroll;
  }
  renderedStep = S.step;
}

// ---------------------------------------------------------------- events

document.getElementById('phone').addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const i = Number(el.dataset.i);

  switch (el.dataset.act) {
    case 'back': {
      // The calculating screen is a one-way transition; going back from the
      // analysis must land on the quiz's last screen, not inside it. And the
      // life-cost step only exists for behaviours that declare one.
      let target = S.step - 1;
      if (target === LIFE && !B().lifeCost) target = ANALYSIS;
      if (target === CALCULATING) target = QUIZ_START + quiz().length - 1;
      return go(Math.max(0, target));
    }
    case 'skip': return startCalc();
    case 'next': return next();
    case 'finish': return finishOnboarding();
    case 'notify-on':
      // The real system prompt. iOS shows it over the app; either answer,
      // onboarding moves on.
      if (NATIVE) native({ action: 'notify' });
      return next();
    case 'option': return pickOption(i);
    case 'symptom': return toggle(S.symptoms, el.dataset.key);
    case 'goal':
      toggle(S.goals, i);
      setWhyField('goals', S.goals.slice());
      return render();
    case 'behavior': {
      const prev = behaviorChosen() ? loadBehavior() : null;
      saveBehavior(BEHAVIORS[i]);
      if (prev && prev !== BEHAVIORS[i]) {
        // Reasons, goals and triggers are indices into the old behaviour's
        // lists, and quiz answers share labels like "Yes" across behaviours —
        // carrying any of it over silently changes its meaning.
        const why = loadWhy();
        why.reasons = []; why.goals = []; why.triggers = [];
        saveWhy(why);
        S.goals = [];
        S.answers = {};
      }
      return render();
    }
    case 'trigger': toggleWhyTrigger(i); return render();
    case 'reason': toggleWhyReason(i); return render();
    case 'prot-section': {
      const sec = el.dataset.section;
      S.protSection = S.protSection === sec ? null : sec;
      return render();
    }
    case 'protect-day': {
      const p = loadProtect();
      const at = p.days.indexOf(i);
      if (at === -1) p.days.push(i); else p.days.splice(at, 1);
      saveProtect(p);
      return render();
    }
    case 'pick-apps': return native({ action: 'pick', oathId: ONBOARDING_OATH_ID });
    case 'protect-app': {
      const p = loadProtect();
      const name = el.dataset.app;
      const at = p.apps.indexOf(name);
      if (at === -1) p.apps.push(name); else p.apps.splice(at, 1);
      saveProtect(p);
      return render();
    }
    case 'slide': return go(i);
    case 'plan': S.plan = i; return render();
  }
});

/* Committing is a hold, not a tap. The white fill sweeping left to right is
   the affordance; letting go before it lands cancels cleanly. */
const HOLD_MS = 900;
let holdTimer = null;

document.getElementById('phone').addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-hold]');
  if (!el) return;
  e.preventDefault();
  el.classList.add('is-holding');
  holdTimer = setTimeout(() => {
    el.classList.remove('is-holding');
    setWhyField('committed', true);
    next();
  }, HOLD_MS);
});

const releaseHold = () => {
  clearTimeout(holdTimer);
  document.querySelectorAll('[data-hold].is-holding').forEach((el) => el.classList.remove('is-holding'));
};
document.addEventListener('pointerup', releaseHold);
document.addEventListener('pointercancel', releaseHold);

// Text fields feed state without a re-render, so typing never loses the caret.
document.getElementById('phone').addEventListener('input', (e) => {
  const key = e.target.dataset.bind;
  if (!key) return;
  if (key === 'protectFrom' || key === 'protectTo') {
    const p = loadProtect();
    const field = key === 'protectFrom' ? 'from' : 'to';
    p[field] = e.target.value;
    saveProtect(p);
    const label = document.getElementById(field === 'from' ? 'protval-from' : 'protval-until');
    if (label) label.textContent = e.target.value;
    return;
  }
  if (key === 'text' || key === 'cost') {
    setWhyField(key, e.target.value);
    // Gate the CTA without re-rendering, or the caret jumps to the end.
    const cta = document.getElementById('writecta');
    if (cta) {
      const ready = e.target.value.trim().length > 0;
      cta.disabled = !ready;
      cta.classList.toggle('cta--muted', !ready);
    }
    return;
  }
  S[key] = e.target.value;
});

/* Onboarding always starts blank. The native app only shows this page for a
   brand-new user or an explicit replay, so anything left in the stores by an
   earlier or abandoned run would surface as pre-filled answers: reasons
   already ticked, the cost box already written. Nothing is chosen until the
   user chooses it. */
function resetOnboardingState() {
  saveWhy({ text: '', reasons: [], cost: '', future: '', committed: false, goals: [], triggers: [] });
  saveProtect({ from: '20:00', to: '23:00', days: [], apps: [] });
  resetBehavior();
  whyCache = null;
}

resetOnboardingState();
render();
