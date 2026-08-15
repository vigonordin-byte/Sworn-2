/* Sworn — onboarding flow.
   Ported from the Claude Design source "Sworn Onboarding.dc.html". */

// ---------------------------------------------------------------- content

const QUESTIONS = [
  ['What is your gender?', ['Male', 'Female']],
  ['How often do you typically view pornography?', ['Less than once a week', 'Once a day', 'A few times a week', 'More than once a day']],
  ['Where did you hear about us?', ['Instagram', 'TikTok', 'Facebook', 'Google', 'Therapist', 'X']],
  ['Have you noticed a shift towards more extreme or graphic material?', ['Yes', 'No']],
  ['At what age did you first come across explicit content?', ['12 or younger', '17 to 24', '25 or older', '13 to 16']],
  ['Do you find it difficult to achieve sexual arousal without pornography or fantasy?', ['Occasionally', 'Rarely or never', 'Frequently']],
  ['Do you use pornography as a way to cope with emotional discomfort or pain?', ['Frequently', 'Occasionally', 'Rarely or never']],
  ['Do you turn to pornography when feeling stressed?', ['Occasionally', 'Rarely or never', 'Frequently']],
  ['Do you watch pornography out of boredom?', ['Occasionally', 'Rarely or never', 'Frequently']],
  ['Have you ever spent money on accessing explicit content?', ['Yes', 'No']]
];

const AGE_OPTS = ['18–24', '25–34', '35–44', '45+'];
const CALC_NOTES = ['Understanding responses', 'Weighing your triggers', 'Shaping your oath'];

const SYMPTOM_DEFS = [
  ['MENTAL', ["Poor memory or 'brain fog'", 'Difficulty concentrating', 'General anxiety', 'Feeling unmotivated', 'Lack of ambition to pursue goals']],
  ['PHYSICAL', ['Tiredness and lethargy', 'Weak erections without porn', 'Low sex drive or desire']],
  ['SOCIAL', ['Unsuccessful or unenjoyable sex', 'Feeling isolated from others', 'Reduced desire to socialize', 'Low self-confidence', 'Feeling unattractive or unworthy of love']],
  ['FAITH', ['Feeling distant from God']]
];

const GOAL_DEFS = [
  'Improved self-control', 'Stronger relationships', 'Improved mood and happiness',
  'More energy and motivation', 'Improved focus and clarity', 'Pure and healthy mind'
];

const GOAL_TINTS = [
  'rgba(120,170,200,.16)', 'rgba(200,110,120,.16)', 'rgba(217,190,90,.16)',
  'rgba(210,140,70,.16)', 'rgba(170,120,200,.16)', 'rgba(120,190,150,.16)'
];

const EDU_SLIDES = [
  ['PORN IS A DRUG', "Using porn releases a chemical in the brain called dopamine. This chemical makes you feel good – it's why you feel pleasure when you watch porn.", '◉'],
  ['PORN DESTROYS RELATIONSHIPS', 'Porn reduces your hunger for a real relationship and replaces it with the hunger for more porn.', '♡'],
  ['PORN SHATTERS SEX DRIVE', 'More than 50% of porn addicts have reported a loss of interest in real sex, and an overall decrease in their sex drive.', '⚥'],
  ['FEELING UNHAPPY?', 'An elevated dopamine level means you need more dopamine to feel good. This is why so many heavy porn users report feeling depresed, unmotivated, and anti-social.', '◔'],
  ['PATH TO RECOVERY', 'Recovery is possible. By abstaining from porn, your brain can reset its dopamine sensitivity, leading to healthier relationships and improved well-being.', '❦']
];

const FEATURE_SLIDES = [
  ['WELCOME TO SWORN', 'With over 2,000,000 users, Sworn is class-leading and based on years of research and user-interaction', '✦', true],
  ['REWIRE YOUR BRAIN', 'Science-backed exercises help you rewire your brain, rebuild your dopamine receptors, and avoid setbacks.', '⬡'],
  ['STAY MOTIVATED', 'Quitting porn can be challenging. Your daily checkup keeps you motivated as you become your best self.', '☀'],
  ['AVOID SETBACKS', 'Sworn learns your habits and temptation triggers, providing you with 24/7 protection.', '⛨'],
  ['CONQUER YOURSELF', 'Know yourself to conquer yourself. Understand your strengths and weaknesses, earn medals, and track your progress.', '☖'],
  ['LEVEL UP YOUR LIFE', 'Rebooting has immense psychological and physical benefits. Grow stronger, healthier, and happier.', '❖']
];

const SLIDE_TINTS = [
  'rgba(217,164,65,.22)', 'rgba(200,120,110,.2)', 'rgba(170,130,200,.2)',
  'rgba(110,150,200,.2)', 'rgba(120,190,150,.2)', 'rgba(217,164,65,.22)'
];

const QUOTE_DEFS = [
  ['Andrew Huberman, Ph.D.', 'Drastically improve your life', 'Resetting your dopamine balance by taking a break from highly stimulating content can dramatically improve motivation, emotional stability, and everyday pleasure.'],
  ['Steven Bartlett', "There's no good in porn", "Pornography doesn't have an educational role—it's only an open window for a market that brings more emptiness and addiction that profit to porn."],
  ['Connor', 'Quitting changed my mindset', 'Quitting has allowed me to change my mindset on the way I see myself, and the people around me.']
];

const REVIEW_DEFS = [
  ['Finch B.', 'F', 'Sworn has been a lifesaver. The interventions actually work.'],
  ['Chris S.', 'C', 'Grounded in science and nothing like the other apps I tried.'],
  ['Lucas P.', 'L', 'Love the streak tracking and the oath card.'],
  ['Marcus T.', 'M', 'Eleven days sworn and the friction settings keep me honest.']
];

const PLAN_DAY_DEFS = [
  ['Day 0 – Prepare your space', 'Shape your physical, digital, and social environment to make change easier'],
  ['Day 1 – Outsmart withdrawal', 'Use quick mental and physical tools to ride out urges and reset focus.'],
  ['Day 5 – Feel better in your body', 'Move, eat clean, and recharge — your energy and clarity return fast.'],
  ["Day 6 – You're not alone", 'Connect with others on the same path. Share wins, get support.']
];

const PLAN_DEFS = [
  ['Annual', '399,00 kr', 'per year'],
  ['Lifetime', '599,00 kr', 'pay once']
];

// Placeholder result from the design — not yet derived from the answers.
const SCORE = 64;
const AVERAGE = 40;
const RESET_DAYS = 90;

// ---------------------------------------------------------------- step map

const FINALLY = 10;
const CALCULATING = 11;
const ANALYSIS = 12;
const SYMPTOMS = 13;
const EDU = 14;
const FEAT = 19;
const GOALS = 25;
const WHY = 26;
const BENEFITS = 27;
const PATH = 28;
const RATING = 29;
const REFERRAL = 30;
const NOTIFY = 31;
const READY = 32;
const PAYWALL = 33;

// ---------------------------------------------------------------- state

const S = {
  step: 0,
  answers: {},
  name: '',
  age: null,
  pct: 0,
  symptoms: [],
  goals: [0],
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

// ---------------------------------------------------------------- helpers

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const on = (cond) => (cond ? ' is-on' : '');

/** Target quit date: today plus the length of the reset programme. */
function quitDate() {
  const d = new Date();
  d.setDate(d.getDate() + RESET_DAYS);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Which carousel, if any, the current step falls inside. */
function slideSet() {
  if (S.step >= EDU && S.step < FEAT) return { set: EDU_SLIDES, base: EDU, edu: true };
  if (S.step >= FEAT && S.step < GOALS) return { set: FEATURE_SLIDES, base: FEAT, edu: false };
  return null;
}

// ---------------------------------------------------------------- navigation

function go(step) {
  clearInterval(timer);
  S.step = step;
  render();
}

function next() {
  if (S.step === FINALLY) return startCalc();
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
  S.answers[from] = QUESTIONS[from][1][i];
  render();
  // Let the selected state land before advancing.
  setTimeout(() => {
    if (S.step !== from) return;
    go(from >= QUESTIONS.length - 1 ? FINALLY : from + 1);
  }, 190);
}

function toggle(list, value) {
  const i = list.indexOf(value);
  if (i === -1) list.push(value); else list.splice(i, 1);
  render();
}

// ---------------------------------------------------------------- screens

function renderChrome() {
  if (S.step > FINALLY) return '';
  const progress = Math.round(((Math.min(S.step, FINALLY) + 1) / 12) * 100);
  return `
    <div class="chrome">
      <button type="button" class="chrome__back" data-act="back" aria-label="Go back">${CHEVRON(22)}</button>
      <div class="progress" role="progressbar" aria-label="Quiz progress"
        aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress__fill" style="width:${progress}%"></div>
      </div>
      <div class="lang">EN</div>
    </div>`;
}

function question() {
  const [text, options] = QUESTIONS[S.step];
  return `
    <div class="screen q">
      <div class="eyebrow">QUESTION #${S.step + 1}</div>
      <div class="q__text" id="qtext">${esc(text)}</div>
      <div class="q__options" role="radiogroup" aria-labelledby="qtext">
        ${options.map((label, i) => `
          <button type="button" class="opt${on(S.answers[S.step] === label)}" data-act="option" data-i="${i}"
            role="radio" aria-checked="${S.answers[S.step] === label}">
            <span class="opt__n">${i + 1}</span>
            <span class="opt__label">${esc(label)}</span>
          </button>`).join('')}
      </div>
      <button type="button" class="skip" data-act="skip">Skip test</button>
    </div>`;
}

function finallyScreen() {
  const ready = Boolean(S.age);
  return `
    <div class="screen finally">
      <div class="eyebrow">FINALLY</div>
      <div class="q__text" style="margin-top:22px">A little more about you</div>
      <label class="field-label" style="margin-top:32px" for="name">Name</label>
      <input class="field" style="margin-top:9px" id="name" data-bind="name" value="${esc(S.name)}" placeholder="Enter your name" autocomplete="given-name">
      <div class="field-label" style="margin-top:22px" id="agelabel">Age</div>
      <div class="ages" role="radiogroup" aria-labelledby="agelabel">
        ${AGE_OPTS.map((label, i) => `
          <button type="button" class="age${on(S.age === label)}" data-act="age" data-i="${i}"
            role="radio" aria-checked="${S.age === label}">${esc(label)}</button>`).join('')}
      </div>
      <button class="cta${ready ? '' : ' cta--muted'}" style="margin-top:auto;font-size:15px;letter-spacing:3px"
        data-act="next"${ready ? '' : ' disabled'}>COMPLETE QUIZ</button>
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
  return `
    <div class="screen analysis anim-rise">
      ${backCircle()}
      <div style="margin-top:14px;display:flex;align-items:center;gap:12px">
        <div style="font-size:22px;font-weight:700;letter-spacing:3.2px;line-height:1.1">ANALYSIS COMPLETE</div>
        <div class="check-badge" style="width:28px;height:28px;flex:0 0 28px">${CHECK(15)}</div>
      </div>
      <div class="serif" style="margin-top:11px;font-size:21px;color:rgba(242,240,236,.55);text-wrap:pretty">We've got some news to break to you...</div>

      <div class="card" style="margin-top:18px;padding:18px 16px 14px;border-radius:22px">
        <div style="text-align:center;font-size:14px;line-height:1.45;color:rgba(242,240,236,.72);text-wrap:pretty">Your responses indicate a clear dependance on internet pornography.</div>
        <div class="bars">
          <div class="bar-col">
            <div class="bar-you">${SCORE}%</div>
            <div class="bar-label">Your Score</div>
          </div>
          <div class="bar-col">
            <div class="bar-avg"><div class="bar-avg__fill">${AVERAGE}%</div></div>
            <div class="bar-label bar-label--dim">Average</div>
          </div>
        </div>
      </div>

      <div style="margin-top:16px;text-align:center;font-size:15px;font-weight:600"><span style="color:#e7bc6a">${SCORE}%</span> higher dependence on porn</div>
      <div style="margin-top:8px;text-align:center;font-size:11.5px;color:rgba(242,240,236,.35);line-height:1.5">* This result is an indication only, not a medical diagnosis.</div>
      <button class="cta cta--glow" style="margin-top:auto;font-size:14px;letter-spacing:2.4px" data-act="next">CHECK YOUR SYMPTOMS →</button>
    </div>`;
}

function symptoms() {
  return `
    <div class="screen symptoms anim-rise">
      <div class="topbar" style="padding:0 22px">
        ${backCircle()}
        <div class="topbar__title" style="font-size:15px;letter-spacing:3.4px">SYMPTOMS</div>
      </div>
      <div class="scroll" style="top:54px;bottom:98px">
        <div class="banner">Excessive porn use can have negative impacts psychologically.</div>
        <div class="serif" style="margin-top:20px;font-size:22px">Select any symptoms below:</div>
        ${SYMPTOM_DEFS.map(([name, items], gi) => `
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
        <button class="cta cta--glow" style="font-size:14px;letter-spacing:2.6px" data-act="next">REBOOT MY BRAIN →</button>
      </div>
    </div>`;
}

function slide(ctx) {
  const { set, base, edu } = ctx;
  const idx = S.step - base;
  const [title, body, glyph, hasPress] = set[idx];
  const tint = SLIDE_TINTS[idx % SLIDE_TINTS.length];
  const cta = edu && idx === set.length - 1 ? 'CONTINUE →' : 'NEXT →';

  return `
    <div class="screen slide anim-rise-fast">
      ${edu ? `
        <div class="slide__bars">
          ${set.map((_, i) => `<div class="slide__bar" style="width:${i === idx ? 34 : 14}px;background:${i <= idx ? '#e7bc6a' : 'rgba(255,255,255,.16)'}"></div>`).join('')}
        </div>` : `<div class="wordmark">SWORN</div>`}

      <div class="orb" style="background:radial-gradient(circle at 38% 30%, ${tint} 0%, rgba(12,12,13,.9) 70%);box-shadow:0 0 60px ${tint}">
        <div class="orb__glyph">${glyph}</div>
      </div>

      <div class="slide__title">${esc(title)}</div>
      <div class="slide__body">${esc(body)}</div>

      ${hasPress ? `<div class="press"><span>FORBES</span><span>TECH TIMES</span><span>LA WEEKLY</span></div>` : ''}

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
          ${GOAL_DEFS.map((label, i) => {
            const sel = S.goals.includes(i);
            return `
            <button type="button" class="goal${on(sel)}" style="${sel ? `background:${GOAL_TINTS[i]}` : ''}" data-act="goal" data-i="${i}" aria-pressed="${sel}">
              <span class="goal__icon" style="background:${GOAL_TINTS[i].replace('.16', '.5')}"></span>
              <span class="goal__label">${esc(label)}</span>
              <span class="dot"></span>
            </button>`;
          }).join('')}
        </div>
        <div style="height:24px"></div>
      </div>
      <div class="footer-bar">
        <button class="cta cta--glow" style="font-size:14px;letter-spacing:2.6px" data-act="next">TRACK THESE GOALS →</button>
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
          ${WHY_REASONS.map((label, i) => {
            const sel = why.reasons.includes(i);
            return `
            <button type="button" class="pickrow${on(sel)}" data-act="reason" data-i="${i}" aria-pressed="${sel}">
              <span class="dot"></span>
              <span class="pickrow__label">${esc(label)}</span>
            </button>`;
          }).join('')}
        </div>
        <label class="field-label" style="display:block;margin-top:26px" for="whytext">In your own words</label>
        <textarea class="field field--area" style="margin-top:9px" id="whytext" data-bind="whyText"
          placeholder="I don't want to waste another year of my life doing this.">${esc(why.text)}</textarea>
        <div style="height:24px"></div>
      </div>
      <div class="footer-bar">
        <button class="cta cta--glow" style="font-size:14px;letter-spacing:2.6px" data-act="next">SAVE MY WHY →</button>
      </div>
    </div>`;
}

function benefits() {
  return `
    <div class="screen benefits anim-rise-fast">
      <div class="topbar" style="padding:0 22px">
        ${backCircle()}
        <div class="topbar__title" style="font-size:14px;letter-spacing:3.2px">REWIRING BENEFITS</div>
      </div>
      <div class="scroll" style="top:54px;bottom:98px">
        ${QUOTE_DEFS.map(([name, head, body]) => `
          <div class="quote-head">
            <div class="avatar"></div>
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
        <button class="cta" data-act="next">CONTINUE →</button>
      </div>
    </div>`;
}

function path() {
  return `
    <div class="screen path anim-rise-fast">
      <div class="topbar">
        ${backCircle()}
        <div class="topbar__title" style="font-size:14px;letter-spacing:3.2px">REWIRING BENEFITS</div>
      </div>
      <div style="margin-top:36px;font-size:26px;font-weight:700;letter-spacing:3.8px;line-height:1.15">YOUR PATH TO FREEDOM</div>
      <div class="serif" style="margin-top:12px;font-size:20px;color:rgba(242,240,236,.55)">With Sworn, recovery is possible</div>
      <div style="margin-top:34px">
        <svg width="100%" height="190" viewBox="0 0 340 190" fill="none">
          <path d="M6 150 C50 146 60 120 96 118 C132 116 150 96 186 88 C222 80 250 44 334 24" stroke="#e7bc6a" stroke-width="4" stroke-linecap="round"/>
          <path d="M6 150 C50 146 60 158 96 160 C132 162 150 138 186 142 C222 146 250 130 334 178" stroke="#8f8f96" stroke-width="3.4" stroke-linecap="round"/>
          <circle cx="334" cy="24" r="8" fill="#f4e6c8" stroke="#0a0a0b" stroke-width="3"/>
          <g stroke="#8f8f96" stroke-width="3" stroke-linecap="round">
            <path d="M76 152l12 12M88 152l-12 12"/>
            <path d="M156 132l12 12M168 132l-12 12"/>
            <path d="M246 130l12 12M258 130l-12 12"/>
          </g>
        </svg>
      </div>
      <div class="legend">
        <span><span class="swatch" style="background:#e7bc6a"></span>With Sworn</span>
        <span class="dim"><span class="swatch" style="background:#8f8f96"></span>Without</span>
        <span class="dim">✕ Relapses</span>
      </div>
      <button class="cta" style="margin-top:auto" data-act="next">CONTINUE →</button>
    </div>`;
}

function rating() {
  return `
    <div class="screen rating anim-rise-fast">
      ${backCircle()}
      <div style="margin-top:16px;text-align:center;font-size:25px;font-weight:700;letter-spacing:4px">GIVE US A RATING</div>
      <div class="stars" style="margin-top:18px">${STAR(26).repeat(5)}</div>
      <div class="serif" style="margin-top:20px;text-align:center;font-size:20px;color:rgba(242,240,236,.6);text-wrap:pretty">This app was designed for people like you.</div>
      <div style="margin-top:14px;display:flex;align-items:center;justify-content:center;gap:12px">
        <div class="facepile">
          <div style="background:#2a2418"></div>
          <div style="background:#332a1c"></div>
          <div style="background:#3d3222"></div>
        </div>
        <div style="font-size:14px;color:rgba(242,240,236,.5)">+ 2,000,000 people</div>
      </div>
      <div class="reviews">
        ${REVIEW_DEFS.map(([name, initial, text]) => `
          <div class="review">
            <div style="display:flex;align-items:center;gap:9px">
              <div class="review__initial">${esc(initial)}</div>
              <div style="font-size:13px;font-weight:700">${esc(name)}</div>
            </div>
            <div style="margin-top:7px;font-size:11px;letter-spacing:1px;color:#e7bc6a">★★★★★</div>
            <div style="margin-top:8px;font-size:12.5px;line-height:1.4;color:rgba(242,240,236,.55)">${esc(text)}</div>
          </div>`).join('')}
      </div>
      <button class="cta" style="margin-top:auto" data-act="next">NEXT →</button>
    </div>`;
}

function referral() {
  return `
    <div class="screen referral anim-rise-fast">
      ${backCircle()}
      <div style="margin-top:20px;font-size:25px;font-weight:700;letter-spacing:4px;line-height:1.2">DO YOU HAVE A REFERRAL CODE?</div>
      <div class="serif" style="margin-top:12px;font-size:20px;color:rgba(242,240,236,.5)">You can skip this step.</div>
      <input class="field field--pill" style="margin-top:auto;margin-bottom:auto" data-bind="referral" value="${esc(S.referral)}" placeholder="Referral Code">
      <button class="cta" data-act="next">NEXT →</button>
    </div>`;
}

function notify() {
  return `
    <div class="screen notify anim-rise-fast">
      <div style="align-self:flex-start">${backCircle()}</div>
      <div style="margin-top:120px">${BELL}</div>
      <div style="margin-top:40px;text-align:center;font-size:25px;font-weight:700;letter-spacing:3.8px;line-height:1.2">STAY ON TRACK WITH REMINDERS</div>
      <div class="serif" style="margin-top:18px;text-align:center;font-size:20px;line-height:1.4;color:rgba(242,240,236,.55);text-wrap:pretty">Get gentle reminders and motivation so you never lose sight of your goals.</div>
      <button class="cta cta--glow" style="margin-top:auto;letter-spacing:2.4px" data-act="next">ENABLE NOTIFICATIONS →</button>
      <button type="button" class="notlater" data-act="next">Not now</button>
    </div>`;
}

function planReady() {
  return `
    <div class="ready__bg"></div>
    <div class="screen ready anim-rise-fast">
      <div class="check-badge" style="width:34px;height:34px">${CHECK(18)}</div>
      <div style="margin-top:18px;text-align:center;font-size:25px;font-weight:700;letter-spacing:3.6px;line-height:1.2">WE'VE MADE YOU A CUSTOM PLAN</div>
      <div style="margin-top:26px;font-size:12px;letter-spacing:2.6px;font-weight:700;color:rgba(242,240,236,.45)">YOU WILL QUIT PORN BY</div>
      <div class="date-pill">${esc(quitDate())}</div>
      <div class="rule"></div>
      <div class="stars" style="margin-top:30px;gap:5px">${STAR(22).repeat(5)}</div>
      <div class="serif" style="margin-top:24px;text-align:center;font-size:26px;line-height:1.25">Become the best of yourself with Sworn</div>
      <button class="cta cta--cream" style="margin-top:auto;font-size:15px;letter-spacing:2.6px" data-act="next">BECOME SWORN</button>
      <div style="margin-top:14px;text-align:center;font-size:11.5px;font-weight:600;color:rgba(242,240,236,.42);line-height:1.6">Purchase appears discretely<br>Cancel anytime</div>
    </div>`;
}

function paywall() {
  return `
    <div class="screen paywall anim-rise-fast">
      <div class="scroll" style="top:0;bottom:342px">
        <div style="text-align:center;font-size:15px;font-weight:700;letter-spacing:6px">SWORN</div>
        <div style="margin-top:26px;text-align:center;font-size:23px;font-weight:700;letter-spacing:3px;line-height:1.2">IT'S NOT ABOUT WILLPOWER</div>
        <div class="serif" style="margin-top:12px;text-align:center;font-size:21px;color:rgba(242,240,236,.62)">It's about a system that actually works</div>
        <div style="margin-top:22px;font-size:14px;line-height:1.55;color:rgba(242,240,236,.6);text-wrap:pretty">Sworn guides you through a powerful 30 day reset, providing structure and tools that support your growth even beyond the break.</div>
        <div style="margin-top:16px;font-size:14px;font-weight:600">Here's what your first 7 days looks like:</div>
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:12px">
          ${PLAN_DAY_DEFS.map(([title, body]) => `
            <div class="planday">
              <div style="font-size:15px;font-weight:700">${esc(title)}</div>
              <div style="margin-top:7px;font-size:13.5px;line-height:1.45;color:rgba(242,240,236,.55);text-wrap:pretty">${esc(body)}</div>
            </div>`).join('')}
        </div>
        <div style="height:20px"></div>
      </div>

      <div class="sheet">
        <div style="text-align:center;font-size:19px;font-weight:700;letter-spacing:2.4px" id="plantitle">CHOOSE YOUR PLAN</div>
        <div class="sale"><span>60% Off Sale</span><span>9 spots remaining</span></div>
        <div role="radiogroup" aria-labelledby="plantitle">
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
        <div style="margin-top:12px;text-align:center;font-size:12.5px;color:#6d675e">No commitment, cancel anytime</div>
        <button class="cta cta--dark" style="margin-top:12px" data-act="restart">START MY JOURNEY TODAY</button>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- render

function screenHtml() {
  const step = S.step;
  if (step < QUESTIONS.length) return question();
  if (step === FINALLY) return finallyScreen();
  if (step === CALCULATING) return calculating();
  if (step === ANALYSIS) return analysis();
  if (step === SYMPTOMS) return symptoms();

  const carousel = slideSet();
  if (carousel) return slide(carousel);

  switch (step) {
    case GOALS: return goals();
    case WHY: return whyScreen();
    case BENEFITS: return benefits();
    case PATH: return path();
    case RATING: return rating();
    case REFERRAL: return referral();
    case NOTIFY: return notify();
    case READY: return planReady();
    case PAYWALL: return paywall();
    default: return '';
  }
}

function render() {
  document.getElementById('chrome').innerHTML = renderChrome();
  document.getElementById('screen').innerHTML = screenHtml();
}

// ---------------------------------------------------------------- events

document.getElementById('phone').addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const i = Number(el.dataset.i);

  switch (el.dataset.act) {
    case 'back': return go(Math.max(0, S.step - 1));
    case 'skip': return go(FINALLY);
    case 'next': return next();
    case 'restart': return go(0);
    case 'option': return pickOption(i);
    case 'age': S.age = AGE_OPTS[i]; return render();
    case 'symptom': return toggle(S.symptoms, el.dataset.key);
    case 'goal': return toggle(S.goals, i);
    case 'reason': toggleWhyReason(i); return render();
    case 'slide': return go(i);
    case 'plan': S.plan = i; return render();
  }
});

// Text fields feed state without a re-render, so typing never loses the caret.
document.getElementById('phone').addEventListener('input', (e) => {
  const key = e.target.dataset.bind;
  if (!key) return;
  if (key === 'whyText') {
    const why = loadWhy();
    why.text = e.target.value;
    return saveWhy(why);
  }
  S[key] = e.target.value;
});

render();
