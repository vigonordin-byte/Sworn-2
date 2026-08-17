import Foundation
import UserNotifications

/* Sworn's notification system.

   The rule everything here follows: if a notification does not answer a
   question the user actually has, it is not sent. Sworn is quiet most of the
   time and shows up when something matters.

   Privacy is structural, not a setting to remember. Nothing scheduled here
   ever names the behaviour — no "porn", "gambling", "betting", or
   "masturbation" reaches a lock screen. Copy adapts to the behaviour only
   through words that are safe to read over someone's shoulder ("the
   commitment you made", "money that stayed yours", "hours that went where you
   chose"). The explicit version lives inside the app, behind Face ID if the
   phone has it.

   Scheduling is native because it must survive the app being closed, and it is
   calendar-based rather than absolute so travel, time zones and daylight
   saving are the system's problem rather than ours. The web layer owns the
   commitments and pushes a snapshot whenever they change; this file owns
   turning that snapshot into a schedule, and is the single source of truth for
   what Sworn has pending. */

// MARK: - state pushed from the web layer

struct NotifPrefs {
    var protection = true
    var protectionEnd = false      // off by default: it would be noise
    var earlyReminder = false      // the optional second, earlier nudge
    var milestones = true
    var commitment = true
    var why = true
    var recovery = true
    var reengagement = true

    init(_ raw: [String: Any]?) {
        guard let raw else { return }
        func flag(_ key: String, _ fallback: Bool) -> Bool { raw[key] as? Bool ?? fallback }
        protection = flag("protection", true)
        protectionEnd = flag("protectionEnd", false)
        earlyReminder = flag("earlyReminder", false)
        milestones = flag("milestones", true)
        commitment = flag("commitment", true)
        why = flag("why", true)
        recovery = flag("recovery", true)
        reengagement = flag("reengagement", true)
    }
}

struct NotifWindow {
    let hour: Int
    let minute: Int
    let endHour: Int
    let endMinute: Int
    let weekdays: [Int]            // 0 = Sunday, as the web layer stores them

    init?(_ raw: [String: Any]) {
        guard raw["on"] as? Bool == true,
              let time = raw["time"] as? String,
              let until = raw["until"] as? String,
              let days = raw["days"] as? [Int], !days.isEmpty,
              (raw["appCount"] as? Int ?? 0) > 0,
              let start = Self.parts(time), let end = Self.parts(until)
        else { return nil }
        hour = start.0; minute = start.1
        endHour = end.0; endMinute = end.1
        weekdays = days
    }

    private static func parts(_ hhmm: String) -> (Int, Int)? {
        let bits = hhmm.split(separator: ":")
        guard bits.count == 2, let h = Int(bits[0]), let m = Int(bits[1]) else { return nil }
        return (h, m)
    }
}

struct NotifState {
    var behavior = "porn"
    var why = ""
    var streakStart: Date?
    var windows: [NotifWindow] = []
    var prefs = NotifPrefs(nil)

    var hasCommitment: Bool { !windows.isEmpty }

    init(_ body: [String: Any]) {
        behavior = body["behavior"] as? String ?? "porn"
        why = (body["why"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if let ms = body["streakSince"] as? Double, ms > 0 {
            streakStart = Date(timeIntervalSince1970: ms / 1000)
        }
        windows = (body["oaths"] as? [[String: Any]] ?? []).compactMap(NotifWindow.init)
        prefs = NotifPrefs(body["prefs"] as? [String: Any])
    }
}

// MARK: - content

/* Every string Sworn can send, in one place. Titles are always neutral; the
   behaviour only ever colours the supporting line, and only with words that
   are safe on a lock screen. Pools exist so the same reminder twice in a week
   does not read as a machine. */
enum NotifContent {

    static func protectionSoon(minutes: Int, behavior: String, seed: Int) -> (String, String) {
        let title = "Your protection starts in \(minutes) minutes."
        let bodies: [String]
        switch behavior {
        case "gambling":
            bodies = ["Your commitment begins soon. Stay committed.",
                      "A window you chose is about to start.",
                      "You decided this with a clear head. It still counts."]
        case "scrolling":
            bodies = ["Your protection begins soon. Protect your attention.",
                      "A window you chose is about to start.",
                      "The next few hours are yours if you let them be."]
        default:
            bodies = ["Your commitment begins soon. Remember why you started.",
                      "A window you chose is about to start.",
                      "You decided this with a clear head. It still counts."]
        }
        return (title, bodies[abs(seed) % bodies.count])
    }

    static func protectionEnded() -> (String, String) {
        ("Your protection window is over.", "You kept your commitment.")
    }

    static func milestone(days: Int, behavior: String) -> (String, String) {
        let line: String
        switch (days, behavior) {
        case (3, _):   line = "You're keeping your word."
        case (5, _):   line = "Five days of deciding it for yourself."
        case (7, _):   line = "One week of keeping your commitment."
        case (10, _):  line = "Ten days. This is starting to hold."
        case (14, _):  line = "You're proving this isn't just another promise."
        case (21, _):  line = "Three weeks. The hard part is behind you."
        case (30, "gambling"):  line = "A month of money that stayed yours."
        case (30, "scrolling"): line = "A month of hours that went where you chose."
        case (30, _):           line = "Thirty days of choosing the commitment you made."
        case (60, _):  line = "Two months. This is who you are now."
        case (90, _):  line = "Ninety days of keeping your word to yourself."
        case (100, "gambling"):  line = "A hundred days. It no longer runs the day."
        case (100, "scrolling"): line = "A hundred days. The feed no longer runs the day."
        case (100, _):           line = "A hundred days. This is part of who you are."
        default:       line = "You're keeping your word."
        }
        return ("\(days) days.", line)
    }

    static func recoveryFirst() -> (String, String) {
        ("Your commitment was broken.", "Take a moment. You can start again.")
    }

    static func recoveryFollowUp() -> (String, String) {
        ("One lapse doesn't decide what happens next.",
         "What happened matters more than the streak. Open Sworn when you're ready.")
    }

    static func recommitted() -> (String, String) {
        ("New commitment made.", "Now keep your word.")
    }

    /* Their own words carry more than anything we could write — but they wrote
       them for themselves, not for a lock screen, and a why like "I want to
       stop watching porn" would be read by whoever glances at the phone. So
       the words are quoted only when they give nothing away; otherwise the
       reminder points at them inside the app, where they are private. */
    private static let sensitive = ["porn", "masturbat", "gambl", "bet", "wank",
                                    "nsfw", "sex", "addict", "nofap", "scroll"]

    static func safeToQuote(_ why: String) -> Bool {
        let lower = why.lowercased()
        return !why.isEmpty && why.count <= 120 && !sensitive.contains { lower.contains($0) }
    }

    static func whyReminder(_ why: String) -> (String, String) {
        safeToQuote(why)
            ? ("You said:", "“\(why)” — keep your word.")
            : ("Remember why you started.", "Your reason is in Sworn. Keep your word.")
    }

    static func commitmentReminder() -> (String, String) {
        ("You made this commitment for a reason.", "It still stands.")
    }

    static func reengagement(hasCommitment: Bool) -> (String, String) {
        hasCommitment
            ? ("You haven't checked in for a while.", "Your commitment is still yours.")
            : ("Nothing is protected right now.", "Ready to make your next commitment?")
    }
}

// MARK: - manager

/* One owner for everything Sworn has pending. Every reschedule cancels the
   identifiers it is about to replace, so a changed or deleted commitment can
   never leave an old reminder behind. */
@MainActor
final class Notifications: NSObject, UNUserNotificationCenterDelegate {
    static let shared = Notifications()

    private let center = UNUserNotificationCenter.current()

    /// Where a tapped notification should land. ContentView hands this to the
    /// web layer once it is ready.
    @Published private(set) var pendingRoute: String?

    private enum Prefix {
        static let protection = "sworn.protect."
        static let protectionEnd = "sworn.protectEnd."
        static let milestone = "sworn.milestone."
        static let recovery = "sworn.recovery."
        static let why = "sworn.why."
        static let commitment = "sworn.commitment."
        static let reengage = "sworn.reengage."
    }

    private let milestoneDays = [3, 5, 7, 10, 14, 21, 30, 60, 90, 100]

    func configure() { center.delegate = self }

    // MARK: permission

    /// Asked once, after onboarding has explained why. Denial is final and
    /// silent — nothing in the app depends on the answer.
    func requestAuthorization() async -> Bool {
        (try? await center.requestAuthorization(options: [.alert, .badge, .sound])) ?? false
    }

    private func authorized() async -> Bool {
        let settings = await center.notificationSettings()
        return settings.authorizationStatus == .authorized
            || settings.authorizationStatus == .provisional
    }

    // MARK: the one entry point

    /// Rebuild the entire schedule from the current state. Called whenever
    /// commitments, streak, behaviour or preferences change, and at launch —
    /// so there is never a stale reminder for a commitment that moved.
    func sync(_ state: NotifState) async {
        guard await authorized() else { return }

        cancel(prefixes: [Prefix.protection, Prefix.protectionEnd, Prefix.milestone,
                          Prefix.why, Prefix.commitment, Prefix.reengage])

        guard state.hasCommitment || state.streakStart != nil else {
            // Nothing to protect and nothing running: only the gentle way back.
            if state.prefs.reengagement { scheduleReengagement(state) }
            return
        }

        if state.prefs.protection { scheduleProtection(state) }
        if state.prefs.protectionEnd { scheduleProtectionEnd(state) }
        if state.prefs.milestones { scheduleMilestones(state) }
        if state.prefs.why { scheduleWhy(state) }
        if state.prefs.commitment { scheduleCommitmentReminder(state) }
        if state.prefs.reengagement { scheduleReengagement(state) }
    }

    // MARK: protection

    /* One reminder shortly before each window, per weekday, repeating on the
       local calendar. Calendar triggers rather than absolute dates is what
       makes travel and daylight saving a non-event. */
    private func scheduleProtection(_ state: NotifState) {
        for (i, window) in state.windows.enumerated() {
            for weekday in window.weekdays {
                schedule(lead: 10, window: window, weekday: weekday, index: i, state: state)
                if state.prefs.earlyReminder {
                    schedule(lead: 30, window: window, weekday: weekday, index: i, state: state)
                }
            }
        }
    }

    private func schedule(lead: Int, window: NotifWindow, weekday: Int, index: Int, state: NotifState) {
        var minutes = window.hour * 60 + window.minute - lead
        var day = weekday
        if minutes < 0 { minutes += 24 * 60; day = (day + 6) % 7 }   // slipped to yesterday

        let (title, body) = NotifContent.protectionSoon(
            minutes: lead, behavior: state.behavior, seed: weekday + index + lead)

        var components = DateComponents()
        components.weekday = day + 1                                  // Calendar is 1-based
        components.hour = minutes / 60
        components.minute = minutes % 60

        add(id: "\(Prefix.protection)\(index).\(weekday).\(lead)",
            title: title, body: body, route: "home",
            trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: true))
    }

    private func scheduleProtectionEnd(_ state: NotifState) {
        for (i, window) in state.windows.enumerated() {
            for weekday in window.weekdays {
                // The window may run past midnight, so the end can be tomorrow.
                let crosses = (window.endHour * 60 + window.endMinute) <= (window.hour * 60 + window.minute)
                var components = DateComponents()
                components.weekday = (crosses ? (weekday + 1) % 7 : weekday) + 1
                components.hour = window.endHour
                components.minute = window.endMinute

                let (title, body) = NotifContent.protectionEnded()
                add(id: "\(Prefix.protectionEnd)\(i).\(weekday)",
                    title: title, body: body, route: "home",
                    trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: true))
            }
        }
    }

    // MARK: milestones

    /* Scheduled ahead from the streak start, so they land whether or not the
       app is ever opened, and wiped and rebuilt the moment the streak
       restarts. Fired late morning rather than at the exact hour the streak
       ticks over, which would often be the middle of the night.

       Day one is the day they committed, matching the counter: a three-day
       milestone lands on the third calendar day, two days after the start,
       not three. Getting this wrong would tell someone they had reached three
       days on their fourth. */
    private func scheduleMilestones(_ state: NotifState) {
        guard let start = state.streakStart else { return }
        let calendar = Calendar.current

        for days in milestoneDays {
            guard let day = calendar.date(byAdding: .day, value: days - 1, to: start),
                  let fireAt = calendar.date(bySettingHour: 10, minute: 0, second: 0, of: day),
                  fireAt > Date()
            else { continue }

            let (title, body) = NotifContent.milestone(days: days, behavior: state.behavior)
            let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: fireAt)
            add(id: "\(Prefix.milestone)\(days)",
                title: title, body: body, route: "achievements",
                trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false))
        }
    }

    // MARK: the quiet ones

    /// Their own words, rarely — a week out, pushed back every time they open
    /// the app. Being uncommon is what gives it force.
    private func scheduleWhy(_ state: NotifState) {
        guard !state.why.isEmpty else { return }
        let (title, body) = NotifContent.whyReminder(state.why)
        add(id: "\(Prefix.why)next", title: title, body: body, route: "why",
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 7 * 86_400, repeats: false))
    }

    /// At most one, and only for someone who has a commitment running.
    private func scheduleCommitmentReminder(_ state: NotifState) {
        guard state.hasCommitment else { return }
        let (title, body) = NotifContent.commitmentReminder()
        add(id: "\(Prefix.commitment)next", title: title, body: body, route: "commitments",
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 4 * 86_400, repeats: false))
    }

    /// Two, ever, and both pushed back on every launch — so they only arrive
    /// for someone who has genuinely gone quiet.
    private func scheduleReengagement(_ state: NotifState) {
        let (title, body) = NotifContent.reengagement(hasCommitment: state.hasCommitment)
        add(id: "\(Prefix.reengage)1", title: title, body: body, route: "home",
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 5 * 86_400, repeats: false))
        add(id: "\(Prefix.reengage)2", title: title, body: body, route: "home",
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 14 * 86_400, repeats: false))
    }

    // MARK: events

    /* A break is recorded while the user is holding the phone, so nothing is
       sent then — they are already looking at the recovery screen. What helps
       is the follow-up a day later if they never came back, and it is
       cancelled the moment they recommit. */
    func recordBreak(prefs: NotifPrefs) {
        cancel(prefixes: [Prefix.recovery])
        guard prefs.recovery else { return }

        let first = NotifContent.recoveryFirst()
        add(id: "\(Prefix.recovery)1", title: first.0, body: first.1, route: "home",
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 4 * 3600, repeats: false))

        let follow = NotifContent.recoveryFollowUp()
        add(id: "\(Prefix.recovery)2", title: follow.0, body: follow.1, route: "home",
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 26 * 3600, repeats: false))
    }

    /// They came back and made a new commitment; the recovery thread is done.
    func recommitted(prefs: NotifPrefs) {
        cancel(prefixes: [Prefix.recovery])
        guard prefs.recovery else { return }
        let (title, body) = NotifContent.recommitted()
        add(id: "\(Prefix.recovery)done", title: title, body: body, route: "commitments",
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 2, repeats: false))
    }

    // MARK: plumbing

    private func add(id: String, title: String, body: String, route: String,
                     trigger: UNNotificationTrigger) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.userInfo = ["route": route]
        // Replacing by identifier is what prevents duplicates.
        center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
    }

    private func cancel(prefixes: [String]) {
        center.getPendingNotificationRequests { requests in
            let ids = requests.map(\.identifier).filter { id in
                prefixes.contains { id.hasPrefix($0) }
            }
            guard !ids.isEmpty else { return }
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
        }
    }

    func cancelAll() {
        center.removeAllPendingNotificationRequests()
        center.removeAllDeliveredNotifications()
    }

    // MARK: delivery

    /// Sworn is worth seeing while the app is open too — the whole point is
    /// that it speaks when something matters.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
                                            willPresent notification: UNNotification) async
    -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
                                            didReceive response: UNNotificationResponse) async {
        let route = response.notification.request.content.userInfo["route"] as? String
        await MainActor.run { Notifications.shared.pendingRoute = route ?? "home" }
    }

    func consumeRoute() -> String? {
        defer { pendingRoute = nil }
        return pendingRoute
    }

    #if DEBUG
    /// Developer tools only. Excluded from Release with the rest of the file's
    /// debug surface, and unreachable because the UI that calls it is stripped.
    func debugFire(kind: String, state: NotifState) {
        let pair: (String, String)
        var route = "home"
        switch kind {
        case "protection": pair = NotifContent.protectionSoon(minutes: 10, behavior: state.behavior, seed: 0)
        case "protectionEnd": pair = NotifContent.protectionEnded()
        case "milestone": pair = NotifContent.milestone(days: 7, behavior: state.behavior); route = "achievements"
        case "break": pair = NotifContent.recoveryFirst()
        case "recovery": pair = NotifContent.recoveryFollowUp()
        case "recommit": pair = NotifContent.recommitted(); route = "commitments"
        case "why": pair = NotifContent.whyReminder(state.why); route = "why"
        case "commitment": pair = NotifContent.commitmentReminder(); route = "commitments"
        case "reengage": pair = NotifContent.reengagement(hasCommitment: state.hasCommitment)
        default: return
        }
        add(id: "sworn.debug.\(kind).\(Date().timeIntervalSince1970)",
            title: pair.0, body: pair.1, route: route,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 3, repeats: false))
    }

    func debugList() async -> [[String: String]] {
        let requests = await center.pendingNotificationRequests()
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE d MMM HH:mm"
        return requests.prefix(60).map { request in
            var when = "—"
            if let calendar = request.trigger as? UNCalendarNotificationTrigger {
                when = calendar.nextTriggerDate().map(formatter.string(from:))
                    ?? "repeating"
            } else if let interval = request.trigger as? UNTimeIntervalNotificationTrigger {
                when = interval.nextTriggerDate().map(formatter.string(from:)) ?? "—"
            }
            return ["id": request.identifier, "title": request.content.title, "when": when]
        }
    }
    #endif
}
