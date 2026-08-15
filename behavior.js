/* What the user is trying to stop, and every piece of copy that depends on it.
 *
 * One canonical selection, made early in onboarding, drives the rest. This file
 * is the only place behaviour-specific wording lives — screens read from it and
 * never branch on the behaviour themselves. Adding a fourth behaviour means
 * adding an entry here, not touching the onboarding architecture.
 *
 * Loaded before app.js / home.js by both pages.
 */

const BEHAVIOR_KEY = 'sworn.behavior';

/** The canonical set. Stored as one of these strings, never as boolean flags. */
const BEHAVIORS = ['porn', 'gambling', 'scrolling'];

/* Existing installs predate the question, and every one of them onboarded
   under the porn-only build — so that is the honest migration default. */
const BEHAVIOR_DEFAULT = 'porn';

const BEHAVIOR_CONFIG = {

  // ------------------------------------------------------------------ porn

  porn: {
    id: 'porn',
    choice: 'Porn / Masturbation',
    choiceNote: 'Blocking triggers and building real self-control.',
    noun: 'porn',

    /* A question's optional third element scores each option, 0 mildest to 1
       most severe. Questions without one are demographic and never counted. */
    quiz: [
      ['What is your gender?', ['Male', 'Female']],
      ['How often does this usually happen?', ['Less than once a week', 'A few times a week', 'Once a day', 'More than once a day'], [0, 0.33, 0.67, 1]],
      ['Where did you hear about us?', ['Instagram', 'TikTok', 'Facebook', 'Google', 'Therapist', 'X']],
      ['Have you noticed yourself needing more extreme material?', ['Yes', 'No'], [1, 0]],
      ['How old were you when it started?', ['12 or younger', '13 to 16', '17 to 24', '25 or older']],
      ['Do you find it harder to feel aroused without it?', ['Frequently', 'Occasionally', 'Rarely or never'], [1, 0.5, 0]],
      ['Do you use it to cope with discomfort or pain?', ['Frequently', 'Occasionally', 'Rarely or never'], [1, 0.5, 0]],
      ['Do you turn to it when stressed?', ['Frequently', 'Occasionally', 'Rarely or never'], [1, 0.5, 0]],
      ['Do you do it out of boredom?', ['Frequently', 'Occasionally', 'Rarely or never'], [1, 0.5, 0]],
      ['Have you ever spent money on it?', ['Yes', 'No'], [1, 0]]
    ],

    analysis: {
      verdict: 'Your answers point to a real dependence on porn.',
      verdictMild: 'Your use is milder than most, but the pattern is already forming. This is the easiest point to stop it.',
      symptomsIntro: 'Heavy use has knock-on effects most people never connect to it.'
    },

    symptoms: [
      ['FAITH', ['Feeling distant from God']],
      ['MENTAL', ["Poor memory or 'brain fog'", 'Difficulty concentrating', 'General anxiety', 'Feeling unmotivated', 'Lack of ambition to pursue goals']],
      ['PHYSICAL', ['Tiredness and lethargy', 'Weak arousal without it', 'Low sex drive or desire']],
      ['SOCIAL', ['Unsatisfying intimacy', 'Feeling isolated from others', 'Reduced desire to socialize', 'Low self-confidence', 'Feeling unworthy of love']]
    ],

    slides: [
      ['IT IS A DRUG', "Every time releases dopamine. That is why it feels good, and why the brain keeps asking for it.", '💊'],
      ['IT CROWDS OUT REAL LIFE', 'It reduces your appetite for a real relationship and replaces it with an appetite for more of itself.', '♥'],
      ['IT DULLS DESIRE', 'More than half of heavy users report losing interest in real intimacy and an overall drop in drive.', '⚥'],
      ['FEELING FLAT?', 'A raised dopamine baseline means you need more just to feel normal. That is why heavy use so often comes with low mood and low motivation.', '🪫'],
      ['IT REVERSES', 'Given time away from it, the brain resets its sensitivity. Energy, focus and interest come back.', '🌱']
    ],

    /* Index 0 must stay 'Come closer to God' in every behaviour — faith mode
       is inferred from goal 0, and stored picks are indices into this list. */
    goals: [
      'Come closer to God', 'Improved self-control', 'Stronger relationships',
      'Improved mood and happiness', 'More energy and motivation',
      'Improved focus and clarity', 'Pure and healthy mind'
    ],

    reasons: [
      'Religious beliefs',
      'I feel disgusted afterward',
      'It makes me feel depressed',
      "I feel like I'm losing control",
      'It hurts my confidence',
      'It wastes my time',
      'It affects my relationships',
      'I want more discipline'
    ],
    faithReason: 0,

    realizations: [
      // Religious beliefs
      ['You already know what you believe.',
       "The difficult part isn't knowing. It's choosing it when temptation comes."],

      // I feel disgusted afterward
      ['You already know how this ends.',
       'The urge lasts minutes. The regret lasts much longer. Don’t trade what you actually want for what you want right now.'],

      // It makes me feel depressed
      ['How many times have you promised yourself it would be the last?',
       "You don't need another promise. You need a system that helps you keep this one."],

      // I feel like I'm losing control
      ["Control isn't a feeling. It's a decision you already made.",
       'You decided once, calmly, with a clear head. The urge will argue otherwise. Sworn holds you to the version of you that decided.'],

      // It hurts my confidence
      ['Confidence is built from evidence.',
       'Not from motivation, not from a good week, but from times you said you would do something and then did it. Every one you keep is proof.'],

      // It wastes my time
      ['You are not short of time. You are short of the hours it takes.',
       'An evening is always traded for something. Decide now what yours is worth, while it is still yours to decide.'],

      // It affects my relationships
      ["It doesn't stay private.",
       'It shows up as distance, as being half-present, as attention that went somewhere else first. The people closest to you feel it before they can name it.'],

      // I want more discipline
      ['Imagine who you could become.',
       "Every time you give in, you're reinforcing the habit you're trying to escape. Every time you resist, you're practicing the person you want to become. This isn't about one night. It's about who you're becoming."]
    ],

    /* The middle card on the "Rewiring benefits" screen. The other two on that
       screen are about dopamine and mindset, which hold for all three. */
    quote: ['Steven Bartlett', "There's no good in porn",
      "Pornography doesn't have an educational role. It's only an open window for a market that brings more emptiness and addiction that profit to porn."],

    vulnerable: ['Late at night', "When I'm alone", 'After waking up', "When I'm stressed", 'After seeing something triggering', 'After getting into bed'],
    apps: ['Safari', 'Chrome', 'Reddit', 'X', 'Instagram', 'TikTok'],

    commitLine: 'Commit to protecting yourself when temptation usually hits.',
    streakLabel: 'DAYS FREE',
    tempted: 'You noticed the urge. That’s exactly what Sworn is for.',

    interventionLine: "Don't trade what you actually want for what you want right now.",
    tierLines: [
      'The first days, when the urge still arrives without warning.',
      'Five days of not letting the urge decide.',
      'Ten days of choosing your commitment over the habit.',
      'A month of wanting it less than you did.',
      'A hundred days. The habit no longer runs the day.'
    ],

    failureLine: 'Understand what happened and start again.',
    resistedLabel: 'Urges resisted',
    notifyLine: 'Your protection starts soon. Remember why you made this commitment.'
  },

  // -------------------------------------------------------------- gambling

  gambling: {
    id: 'gambling',
    choice: 'Gambling / Betting',
    choiceNote: 'Blocking betting apps and taking back financial control.',
    noun: 'gambling',

    quiz: [
      ['What is your gender?', ['Male', 'Female']],
      ['How often do you place a bet?', ['Less than once a week', 'A few times a week', 'Most days', 'Several times a day'], [0, 0.33, 0.67, 1]],
      ['Where did you hear about us?', ['Instagram', 'TikTok', 'Facebook', 'Google', 'Therapist', 'X']],
      ['Have your stakes been getting bigger?', ['Yes', 'No'], [1, 0]],
      ['How old were you when you first bet?', ['17 or younger', '18 to 21', '22 to 30', '31 or older']],
      ['Do you bet more after losing?', ['Frequently', 'Occasionally', 'Rarely or never'], [1, 0.5, 0]],
      ['Do you bet to cope with discomfort or pain?', ['Frequently', 'Occasionally', 'Rarely or never'], [1, 0.5, 0]],
      ['Do you bet when stressed?', ['Frequently', 'Occasionally', 'Rarely or never'], [1, 0.5, 0]],
      ['Do you bet out of boredom?', ['Frequently', 'Occasionally', 'Rarely or never'], [1, 0.5, 0]],
      ['Have you ever hidden a bet from someone?', ['Yes', 'No'], [1, 0]]
    ],

    analysis: {
      verdict: 'Your answers point to gambling that is no longer under your control.',
      verdictMild: 'Your betting is milder than most, but the pattern is already forming. This is the cheapest point to stop it.',
      symptomsIntro: 'Gambling costs more than money. Most of this is not obvious from the inside.'
    },

    symptoms: [
      ['FAITH', ['Feeling distant from God']],
      ['MENTAL', ['Constantly thinking about the next bet', 'Difficulty concentrating', 'General anxiety', 'Restlessness when not betting', 'Chasing losses']],
      ['MONEY', ['Betting more than I can afford', 'Borrowing to keep betting', 'Hiding what I have lost']],
      ['SOCIAL', ['Lying about it to people close to me', 'Withdrawing from friends', 'Arguments about money', 'Shame after a loss', 'Feeling I have let people down']]
    ],

    slides: [
      ['THE NEAR MISS IS THE HOOK', 'Almost winning lights up the brain almost as much as winning. That is designed, not accidental.', '🎰'],
      ['CHASING IS THE TRAP', 'The urge to win it back is the strongest pull there is, and it is exactly how a bad day becomes a bad year.', '🪤'],
      ['THE ODDS DO NOT MOVE', 'No streak, system or hunch changes the maths. The house edge is the whole business model.', '🎲'],
      ['FEELING FLAT?', 'Raised dopamine means normal life feels dull by comparison. That is why heavy betting so often comes with low mood.', '🪫'],
      ['IT REVERSES', 'Time away lets the reward system settle. Money, sleep and clarity come back together.', '🌱']
    ],

    goals: [
      'Come closer to God', 'Improved self-control', 'Stronger relationships',
      'Improved mood and happiness', 'More energy and motivation',
      'Saving money and financial control', 'Pure and healthy mind'
    ],

    reasons: [
      "I'm losing money",
      'I feel out of control',
      'I keep chasing losses',
      'It affects my relationships',
      'I hide it from people',
      'I want financial control',
      'I feel terrible afterward',
      'I want to stop before it gets worse'
    ],
    faithReason: null,

    realizations: [
      ['Think about where the money could have gone.',
       "The next bet won't fix the last one. You're not trying to win back yesterday. You're trying to take control of tomorrow."],
      ["Control isn't a feeling. It's a decision you already made.",
       'You decided once, calmly, with a clear head. The next bet will argue otherwise. Sworn holds you to the version of you that decided.'],
      ['Chasing is how a bad day becomes a bad year.',
       'The loss is already spent. Betting again does not recover it. It only decides how much more goes with it.'],
      ["It doesn't stay private.",
       'It shows up as tension about money, as conversations you avoid, as trust you have to keep rebuilding. People feel it before they can name it.'],
      ['Hiding it is the part that grows.',
       'The bets are survivable. The secrecy is what makes them heavier, and it compounds faster than the losses do.'],
      ['Control is built from evidence.',
       'Not from a good month or a lucky run, but from times you said you would stop and then did. Every one you keep is proof.'],
      ['You already know how this ends.',
       'The bet takes seconds. What follows lasts far longer. Don’t trade what you actually want for what you want right now.'],
      ['The best time to stop is before you have to.',
       'Nobody plans the bet that does the real damage. Stopping while it is still your choice is the whole point.']
    ],

    /* Attributed to Sworn rather than a public figure: putting invented words
       in a real person's mouth is not something we do for copy. */
    quote: ['Sworn', 'The margin is the product',
      'A betting app is not a game that happens to make money. The margin is the whole design, and over enough bets the outcome is arithmetic.'],

    vulnerable: ['During sports', "When I'm bored", 'After losing money', 'Late at night', "When I'm stressed", "When I'm watching a game"],
    apps: ['Safari', 'Chrome', 'Betting apps', 'X', 'Instagram', 'YouTube'],

    commitLine: "Commit to staying away when you're most likely to bet.",
    streakLabel: 'DAYS BET-FREE',
    tempted: 'You noticed the pull. That’s exactly what Sworn is for.',

    interventionLine: "One more bet doesn't undo the last one.",
    tierLines: [
      'The first days, when every result still feels like an invitation.',
      'Five days of not chasing it.',
      'Ten days of leaving the odds alone.',
      'A month of money that stayed yours.',
      'A hundred days. Betting no longer runs the day.'
    ],

    failureLine: 'Understand what triggered the bet and start again.',
    resistedLabel: 'Bets not placed',
    notifyLine: 'Your protection starts soon. Stay committed.'
  },

  // ------------------------------------------------------------- scrolling

  scrolling: {
    id: 'scrolling',
    choice: 'Doomscrolling / Social Media',
    choiceNote: 'Protecting your attention and getting your hours back.',
    noun: 'scrolling',

    quiz: [
      ['What is your gender?', ['Male', 'Female']],
      ['How much do you scroll on an average day?', ['Under an hour', '1 to 2 hours', '3 to 4 hours', 'More than 4 hours'], [0, 0.33, 0.67, 1]],
      ['Where did you hear about us?', ['Instagram', 'TikTok', 'Facebook', 'Google', 'Therapist', 'X']],
      ['Do you open an app without deciding to?', ['Yes', 'No'], [1, 0]],
      ['How old were you when you got your first phone?', ['10 or younger', '11 to 13', '14 to 17', '18 or older']],
      ['Do you find it hard to stop once you start?', ['Frequently', 'Occasionally', 'Rarely or never'], [1, 0.5, 0]],
      ['Do you scroll to cope with discomfort or pain?', ['Frequently', 'Occasionally', 'Rarely or never'], [1, 0.5, 0]],
      ['Do you scroll when stressed?', ['Frequently', 'Occasionally', 'Rarely or never'], [1, 0.5, 0]],
      ['Do you scroll out of boredom?', ['Frequently', 'Occasionally', 'Rarely or never'], [1, 0.5, 0]],
      ['Do you scroll in bed before sleeping?', ['Yes', 'No'], [1, 0]]
    ],

    analysis: {
      verdict: 'Your answers point to scrolling that is taking more than you realise.',
      verdictMild: 'You scroll less than most, but the habit is already forming. This is the easiest point to take your attention back.',
      symptomsIntro: 'The cost is spread thin, which is exactly why it is easy to miss.'
    },

    symptoms: [
      ['FAITH', ['Feeling distant from God']],
      ['MENTAL', ['Difficulty concentrating', 'Reaching for the phone without deciding to', 'General anxiety', 'Feeling unmotivated', 'Struggling to sit with boredom']],
      ['PHYSICAL', ['Going to bed later than planned', 'Waking up tired', 'Sore eyes or headaches']],
      ['SOCIAL', ['Half-present with people', 'Comparing myself to others', 'Feeling behind everyone else', 'Low self-confidence', 'Losing hours I meant to spend elsewhere']]
    ],

    slides: [
      ['THE FEED IS DESIGNED', 'Infinite scroll has no stopping cue on purpose. You are not weak-willed. You are up against a system built to hold you.', '📱'],
      ['IT COSTS YOUR FOCUS', 'Every switch has a re-entry cost. An hour broken into fragments is not an hour of attention.', '🧠'],
      ['COMPARISON IS THE PRODUCT', 'You are comparing your ordinary day to everyone else’s highlights, thousands of times a week.', '⚖️'],
      ['FEELING FLAT?', 'Constant novelty raises the bar for what feels interesting. That is why everything slower starts to feel boring.', '🪫'],
      ['IT REVERSES', 'Attention rebuilds. Give it a few uninterrupted days and reading, working and being present all get easier.', '🌱']
    ],

    goals: [
      'Come closer to God', 'Improved self-control', 'Stronger relationships',
      'Improved mood and happiness', 'More energy and motivation',
      'Improved focus and clarity', 'Being present in my own life'
    ],

    reasons: [
      'I waste too much time',
      "I can't stop scrolling",
      'It hurts my focus',
      'It affects my sleep',
      'I compare myself to others',
      'I want more discipline',
      'I feel worse afterward',
      'I want to be more present'
    ],
    faithReason: null,

    realizations: [
      ['Every scroll feels small.',
       'But small moments repeated every day become years. You don’t need more time. You need to stop giving it away.'],
      ['You are not choosing it. That is the point.',
       'The feed has no ending, so there is no moment where stopping feels natural. The decision has to be made before you open it.'],
      ['Your attention is trained by whatever you keep feeding it.',
       'Every time you choose the scroll, you make the next scroll easier. Every time you resist, you practice control.'],
      ['The hour before bed decides the next day.',
       'It is the easiest hour to lose and the most expensive one. Everything tomorrow is built on it.'],
      ["You're comparing your day to everyone's highlights.",
       'Thousands of times a week, against a version of other people that does not exist. Nobody wins that.'],
      ['Discipline is built from evidence.',
       'Not from motivation, not from a good week, but from times you said you would stop and then did. Every one you keep is proof.'],
      ['You already know how this ends.',
       'It is never the scroll you regret starting. It is the hour you find gone afterwards.'],
      ['Being present is not a feeling you wait for.',
       'It is what is left when you stop handing your attention to something else first.']
    ],

    quote: ['Sworn', 'The feed is tuned to you',
      'Infinite feeds are optimised to hold attention, not to be worth the time they take. Losing hours to one is the system working as designed, not a lack of willpower.'],

    vulnerable: ['After school or work', 'In bed', "When I'm bored", "When I'm stressed", 'When I should be working', 'When I wake up'],
    apps: ['Instagram', 'TikTok', 'YouTube', 'Reddit', 'X', 'Safari'],

    commitLine: 'Commit to protecting your attention when you usually lose it.',
    streakLabel: 'DAYS IN CONTROL',
    tempted: 'You caught yourself reaching for it. That’s exactly what Sworn is for.',

    interventionLine: 'You opened your phone for a reason. Don’t let the scroll decide what happens next.',
    tierLines: [
      'The first days, when your hand still reaches for it on its own.',
      'Five days of stopping before the feed does.',
      'Ten days of deciding what your attention is for.',
      'A month of hours that went somewhere you chose.',
      'A hundred days. The feed no longer runs the day.'
    ],

    failureLine: 'Understand what pulled you back in and start again.',
    resistedLabel: 'Scrolls resisted',
    notifyLine: 'Your protection starts soon. Protect your attention.'
  }
};

// ---------------------------------------------------------------- accessors

let behaviorCache = null;

/** Forget the choice entirely, e.g. when onboarding starts over. */
function resetBehavior() {
  behaviorCache = null;
  try { localStorage.removeItem(BEHAVIOR_KEY); } catch (e) { /* storage blocked */ }
}

/** The stored selection, migrating anyone who predates the question. */
function loadBehavior() {
  if (behaviorCache) return behaviorCache;
  try {
    const raw = localStorage.getItem(BEHAVIOR_KEY);
    if (raw && BEHAVIORS.includes(raw)) behaviorCache = raw;
  } catch (e) {
    // storage blocked
  }
  return behaviorCache || BEHAVIOR_DEFAULT;
}

function saveBehavior(id) {
  if (!BEHAVIORS.includes(id)) return;
  behaviorCache = id;
  try { localStorage.setItem(BEHAVIOR_KEY, id); } catch (e) { /* blocked */ }
}

/** Whether the user has actually answered, as opposed to being defaulted. */
function behaviorChosen() {
  try { return BEHAVIORS.includes(localStorage.getItem(BEHAVIOR_KEY)); } catch (e) { return false; }
}

/** The whole config for the current selection. Screens read from this. */
function B() {
  return BEHAVIOR_CONFIG[loadBehavior()] || BEHAVIOR_CONFIG[BEHAVIOR_DEFAULT];
}
