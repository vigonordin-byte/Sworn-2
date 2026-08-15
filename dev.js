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

  /** Mock commitment data. Obviously synthetic, but shaped like the real thing. */
  const seedCommitment = () => {
    saveWhy({
      text: 'I want to become someone who controls my impulses.',
      reasons: [7, 1],
      cost: 'Years of evenings, and how I feel about myself in the morning.',
      future: "I'd trust myself again, and stop starting over.",
      committed: true
    });
    saveSession({ name: 'Vigo', greeted: true });
    saveProgress({ daysSworn: 11 });
    saveStats(STATS_SEEDED);
    saveProtect({ from: '20:00', to: '23:00', days: [0, 1, 2, 3, 4, 5, 6], apps: ['Reddit', 'X', 'Safari'] });
    saveOaths([
      { id: 1, name: 'No Reddit after 20:00', time: '20:00', until: '06:00', days: [0, 1, 2, 3, 4, 5, 6], apps: ['Reddit', 'X', 'Safari'], friction: 1, on: true },
      { id: 2, name: 'Phone out of the bedroom', time: '22:30', until: '07:00', days: [0, 1, 2, 3, 4], apps: ['Reddit', 'X', 'Instagram', 'TikTok'], friction: 1, on: false }
    ]);
  };

  const STATES = [
    {
      id: 'new',
      name: 'New User',
      note: 'Fresh install. No commitment, no data, onboarding from screen one.',
      apply() {
        clearWeb();
        saveProgress({ daysSworn: 0 });
        saveStats(STATS_EMPTY);
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
        saveProgress({ daysSworn: 0 });
        saveStats(STATS_EMPTY);
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
        saveUrge({ until: 0, log: [Date.now() - 864e5, Date.now() - 3600e3], lapses: [{ at: Date.now() - 172800e3, note: 'Late, scrolling in bed.' }] });
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
        saveProgress({ daysSworn: 0 });
        saveStats(STATS_EMPTY);
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
    paintCount();
  }

  return { STATES, apply, runPending, duration, setDuration, DURATIONS, STAGES, jumpTo };
})();
