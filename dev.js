/* Developer state switcher — DEBUG BUILDS ONLY.
 *
 * This file is excluded from the Release bundle by EXCLUDED_SOURCE_FILE_NAMES
 * in Sworn/project.yml, and the native host only sets window.__swornDebug
 * under #if DEBUG. Neither the UI nor these presets can reach a shipped build.
 *
 * Every preset writes the same stores the real app reads — there are no
 * parallel screens here. Selecting one and reloading gives you the genuine
 * Home, onboarding, analytics, commitment and intervention UI.
 */

window.SwornDev = (() => {

  const clearWeb = () => {
    ['sworn.why', 'sworn.oaths', 'sworn.protect', 'sworn.urge',
     'sworn.session', 'sworn.progress', 'sworn.stats', 'sworn.onboarded']
      .forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* blocked */ } });
    // why.js keeps an in-memory copy; without this it survives the wipe.
    whyCache = null;
  };

  const native = (msg) => window.webkit?.messageHandlers?.sworn?.postMessage(msg);

  /** Mock commitment data. Obviously synthetic, but shaped like the real thing.
      Seeds the RAW record (streak dates, urge log) — analytics derives its
      numbers from these, exactly as it does for a real user. */
  const seedCommitment = () => {
    saveWhy({
      text: 'I want to become someone who controls my impulses.',
      reasons: [7, 1],
      cost: 'Years of evenings, and how I feel about myself in the morning.',
      future: "I'd trust myself again, and stop starting over.",
      committed: true
    });
    saveSession({ name: 'Vigo', greeted: true });
    const day = 864e5;
    const now = Date.now();
    saveProgress({ since: now - 11 * day, oathAt: now - 11 * day });
    // Eleven days of evening-weighted urges: most resisted, two shields raised
    // without a countdown, one old lapse note left in place by 'broken'.
    const evening = (daysAgo, hour) => now - daysAgo * day - (24 - hour) * 3600e3;
    saveUrge({
      until: 0,
      log: [evening(10, 22), evening(8, 21), evening(6, 23), evening(4, 22), evening(2, 21), evening(1, 22)],
      resists: [evening(9, 22), evening(7, 23), evening(5, 21), evening(3, 22), evening(2, 23), evening(1, 21)],
      lapses: []
    });
    saveProtect({ from: '20:00', to: '23:00', days: [0, 1, 2, 3, 4, 5, 6], apps: ['Reddit', 'X', 'Safari'] });
    saveOaths([
      { id: 1, name: 'No Reddit after 20:00', time: '20:00', until: '06:00', days: [0, 1, 2, 3, 4, 5, 6], apps: ['Reddit', 'X', 'Safari'], on: true },
      { id: 2, name: 'Phone out of the bedroom', time: '22:30', until: '07:00', days: [0, 1, 2, 3, 4], apps: ['Reddit', 'X', 'Instagram', 'TikTok'], on: false }
    ]);
  };

  const STATES = [
    {
      id: 'new',
      name: 'New User',
      note: 'Fresh install. No commitment, no data, onboarding from screen one.',
      apply() {
        clearWeb();
        clearBehavior();
        native({ action: 'devOnboarded', value: false });
        return { go: 'index.html' };
      }
    },
    {
      id: 'onboarded',
      name: 'Onboarded · no commitment',
      note: 'Finished onboarding, nothing protected yet. Shows the empty Home.',
      apply() {
        clearWeb();
        saveWhy({
          text: 'I want to become someone who controls my impulses.',
          reasons: [7], cost: '', future: '', committed: true
        });
        saveSession({ name: 'Vigo', greeted: true });
        startStreak();
        saveOaths([]);
        native({ action: 'devOnboarded', value: true });
        return { go: 'home.html' };
      }
    },
    {
      id: 'active',
      name: 'Active commitment',
      note: 'Gold tier, protection armed, full analytics. The normal Home.',
      apply() {
        clearWeb();
        seedCommitment();
        native({ action: 'devOnboarded', value: true });
        return { go: 'home.html' };
      }
    },
    {
      id: 'intervention',
      name: 'Intervention',
      note: 'Opens the 60 seconds with mock data. Shorten it below.',
      apply() {
        clearWeb();
        seedCommitment();
        native({ action: 'devOnboarded', value: true });
        return { go: 'home.html', then: 'intervention' };
      }
    },
    {
      id: 'broken',
      name: 'Broken commitment',
      note: 'Straight to the recovery screen, with a history behind it.',
      apply() {
        clearWeb();
        seedCommitment();
        // A lapse two days ago on top of the seeded record, so recovery,
        // the restarted streak and the analytics all have history behind them.
        const u = loadUrge();
        u.lapses.push({ at: Date.now() - 2 * 864e5, note: 'Late, scrolling in bed.', reason: 'urge' });
        saveUrge(u);
        saveProgress({ since: Date.now() - 2 * 864e5, oathAt: Date.now() - 11 * 864e5, best: 9 });
        native({ action: 'devOnboarded', value: true });
        return { go: 'home.html', then: 'lapse' };
      }
    },
    {
      id: 'reset',
      name: 'Reset all data',
      note: 'Everything, including the Apple sign-in. You will sign in again.',
      destructive: true,
      apply() {
        clearWeb();
        clearBehavior();
        native({ action: 'devReset' });
        return { go: 'index.html' };
      }
    }
  ];

  /** Queued across the page load, since most presets navigate. */
  const PENDING_KEY = 'sworn.dev.pending';

  function apply(id) {
    const state = STATES.find((s) => s.id === id);
    if (!state) return;
    const result = state.apply() || {};

    if (result.then) {
      try { sessionStorage.setItem(PENDING_KEY, result.then); } catch (e) { /* blocked */ }
    }
    if (result.go) {
      window.location.href = result.go;
      return;
    }
    window.location.reload();
  }

  /** Run whatever the preset asked for once the target page is up. */
  function runPending() {
    let pending = null;
    try {
      pending = sessionStorage.getItem(PENDING_KEY);
      sessionStorage.removeItem(PENDING_KEY);
    } catch (e) { /* blocked */ }
    if (!pending) return;

    if (pending === 'intervention') {
      S.interventionSeconds = duration();
      startIntervention('voluntary');
    } else if (pending === 'lapse') {
      S.tab = 'home';
      S.view = 'lapse';
      render();
    }
  }

  // ---- behaviour -----------------------------------------------------------

  /* The one thing a preset must not silently reset: you need to be able to pick
     "Gambling" and then seed an active commitment as a gambling user. Only the
     two fresh-install presets clear it, since a real fresh install has no
     answer stored either. */
  const clearBehavior = () => resetBehavior();

  const BEHAVIOR_STATES = BEHAVIORS.map((id) => ({ id, name: BEHAVIOR_CONFIG[id].choice }));

  function setBehavior(id) {
    saveBehavior(id);
    render();
  }

  // ---- notifications -------------------------------------------------------

  /* Every kind Sworn can send, on a 3 second delay so you can background the
     app and see it land on the lock screen as a user would. */
  const NOTIF_KINDS = [
    ['protection', 'Protection soon'],
    ['protectionEnd', 'Protection ended'],
    ['milestone', 'Milestone'],
    ['break', 'Commitment broken'],
    ['recovery', 'Recovery follow-up'],
    ['recommit', 'Recommitted'],
    ['why', 'My why'],
    ['commitment', 'Commitment reminder'],
    ['reengage', 'Checking back in']
  ];

  function fireNotif(kind) {
    native({
      action: 'notifyTest',
      kind,
      behavior: behaviorChosen() ? loadBehavior() : 'porn',
      why: loadWhy().text || '',
      streakSince: loadProgress().since || 0,
      oaths: typeof oathPayload === 'function' ? oathPayload() : [],
      prefs: loadNotifPrefs()
    });
  }

  let scheduled = [];
  function listNotifs() {
    native({ action: 'notifyList' });
  }
  function setScheduled(list) {
    scheduled = Array.isArray(list) ? list : [];
    render();
  }
  const getScheduled = () => scheduled;

  function clearNotifs() {
    native({ action: 'notifyClear' });
    scheduled = [];
    render();
  }

  // ---- countdown shortcuts -------------------------------------------------

  const DURATION_KEY = 'sworn.dev.duration';
  const DURATIONS = [60, 15, 5];

  function duration() {
    try {
      const v = Number(localStorage.getItem(DURATION_KEY));
      if (DURATIONS.includes(v)) return v;
    } catch (e) { /* blocked */ }
    return 60;
  }

  function setDuration(v) {
    try { localStorage.setItem(DURATION_KEY, String(v)); } catch (e) { /* blocked */ }
    S.interventionSeconds = v;
  }

  /* App Store screenshots need a state nobody arrives at by using the app for
     an afternoon: a long streak, a name that is not the developer's, windows
     with round numbers on them, and a record with something in it. Shooting
     whatever the app happened to be showing produced a store page whose
     headline promise was answered by "1 DAY FREE". */
  const SHOT_KEY = 'sworn.dev.shot';
  const SHOT_NAMES = ['James', 'Daniel', 'Marcus', 'Elias'];
  const SHOT_DAYS = [1, 7, 21, 30, 90];
  const SHOT_FALLBACK = { name: 'James', days: 30, blocking: true };

  function shotPrefs() {
    try { return { ...SHOT_FALLBACK, ...JSON.parse(localStorage.getItem(SHOT_KEY) || '{}') }; }
    catch (e) { return { ...SHOT_FALLBACK }; }
  }

  function setShot(patch) {
    const next = { ...shotPrefs(), ...patch };
    try { localStorage.setItem(SHOT_KEY, JSON.stringify(next)); } catch (e) { /* blocked */ }
    return next;
  }

  /* A window that contains right now, on whole hours. Without this the only
     way to photograph a green "PROTECTED NOW" card was to catch a real one,
     and the times came out as 11:47 - 12:46: true, but it reads as an
     accident rather than as something a person decided. */
  function liveWindow() {
    const h = new Date().getHours();
    const pad = (n) => String(Math.max(0, Math.min(23, n))).padStart(2, '0') + ':00';
    return [pad(h - 2), pad(h + 2)];
  }

  function stageShots() {
    const { name, days, blocking } = shotPrefs();
    clearWeb();
    // Seeds the urge log and resists, so "Urges resisted" is not 0 of 1 and
    // "Hardest times" has bars. Its reasons exclude the faith one, so no
    // scripture appears in a screenshot bound for App Store metadata.
    seedCommitment();

    const day = 864e5;
    const now = Date.now();
    saveSession({ name, greeted: true });

    /* The record runs from the first commitment, the streak from the last
       restart — which is what lets this be an honest history rather than a
       flawless one. Committed a month before the current run, slipped twice
       early, clean since. A page showing 100% would tell the people this app
       is for that it was never meant for them; the analytics say "kept on 58
       of 60 days", which is both better copy and true of the seeded data. */
    saveProgress({ since: now - (days - 1) * day, oathAt: now - (days + 30) * day });

    /* Real clock hours on real past days. seedCommitment's helper is relative
       to now, so "Hardest times" came out as whatever was a few hours ago —
       a store page whose Late night commitment sat beside a chart claiming
       the danger hour was 7am. These land where the urges actually are. */
    const at = (daysAgo, hour, min) => {
      const d = new Date(now - daysAgo * day);
      d.setHours(hour, min || 0, 0, 0);
      return d.getTime();
    };
    const u = loadUrge();
    u.log = [at(2, 22, 40), at(5, 23, 10), at(9, 22, 15), at(14, 21, 50), at(21, 23, 30)];
    u.resists = [at(1, 22, 20), at(3, 21, 45), at(6, 23, 5), at(11, 22, 50), at(17, 22, 10), at(25, 21, 35)];
    u.lapses = [
      { at: at(days + 18, 23, 20), note: '', reason: 'urge' },
      { at: at(days + 5, 22, 40), note: '', reason: 'late' }
    ];
    saveUrge(u);

    const [from, to] = liveWindow();
    const apps = ['Reddit', 'X', 'Safari'];
    saveOaths([
      { id: 1, name: 'Late night', time: '21:00', until: '00:00',
        days: [0, 1, 2, 3, 4, 5, 6], apps, on: true },
      { id: 2, name: 'Home alone', time: blocking ? from : '16:00', until: blocking ? to : '17:00',
        days: [0, 1, 2, 3, 4, 5, 6], apps, on: true }
    ]);

    native({ action: 'devOnboarded', value: true });
    // Keeps ?debug=1 so the panel is still there for the next shot. On device
    // the flag comes from the host and the query string is empty anyway.
    window.location.href = 'home.html' + location.search;
  }

  const STAGES = [
    ['Interrupt', 55],
    ['Remember', 40],
    ['Act', 20],
    ['Decide', 5],
    ['Zero', 0]
  ];

  /** Jump the running countdown to a stage without waiting it out. */
  function jumpTo(left) {
    if (S.view !== 'running') {
      S.interventionSeconds = duration();
      startIntervention('voluntary');
    }
    clearInterval(timer);
    S.left = Math.min(left, S.interventionSeconds);
    S.ivEndsAt = Date.now() + S.left * 1000;
    paintCount();
  }

  return { STATES, apply, runPending, duration, setDuration, DURATIONS, STAGES, jumpTo,
           SHOT_NAMES, SHOT_DAYS, shotPrefs, setShot, stageShots,
           NOTIF_KINDS, fireNotif, listNotifs, setScheduled, getScheduled, clearNotifs,
           BEHAVIOR_STATES, setBehavior, current: loadBehavior, chosen: behaviorChosen };
})();
