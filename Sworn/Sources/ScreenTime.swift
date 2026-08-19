import Foundation
import FamilyControls
import DeviceActivity
import ManagedSettings

/// One oath as the web UI describes it.
struct OathSpec: Decodable {
    let id: Int
    let time: String      // "HH:MM" — lock closes
    let until: String     // "HH:MM" — lock opens again
    let days: [Int]       // 0 = Sunday
    let on: Bool
}

/// Owns Screen Time authorization and turns oaths into real device schedules.
@MainActor
final class ScreenTime: ObservableObject {
    @Published private(set) var authorized = false
    @Published var pickerOathId: Int?
    @Published var selection = FamilyActivitySelection()

    private let center = DeviceActivityCenter()

    /// Last oath list the web UI sent, so the picker can re-arm after a choice
    /// without the caller having to hand them over again.
    private var oaths: [OathSpec] = []

    func refreshAuthorizationState() {
        authorized = AuthorizationCenter.shared.authorizationStatus == .approved
    }

    /// Prompts once; iOS remembers the answer. Requires a real device — the
    /// simulator has no Screen Time backing store.
    func requestAuthorization() async -> Bool {
        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            authorized = true
        } catch {
            authorized = false
        }
        return authorized
    }

    // MARK: picking apps

    func beginPicking(oathId: Int) {
        selection = Shared.selection(for: oathId) ?? FamilyActivitySelection()
        pickerOathId = oathId
    }

    /// Persist what the user chose and re-arm that oath. Returns how many
    /// things are now covered, which is all the UI is allowed to know.
    func finishPicking() {
        guard let id = pickerOathId else { return }
        Shared.saveSelection(selection, for: id)
        pickerOathId = nil
        // Never prunes: onboarding picks apps before any commitment exists, so
        // the list held here is empty and would look like the selection had
        // been orphaned the instant it was made.
        sync(oaths: oaths, pruneOrphans: false)
        onCountsChanged?()
    }

    /// Called after a pick so the web layer can relabel the row.
    var onCountsChanged: (() -> Void)?

    /// Called after every sync so the web layer can show which commitments are
    /// genuinely armed and why any are not. Claiming protection that iOS
    /// refused to schedule is the worst thing this app could do.
    var onArmedChanged: (([String: String]) -> Void)?

    /// iOS refuses to monitor a window shorter than this, silently making the
    /// commitment do nothing at all.
    static let minimumWindowMinutes = 15

    /// oath id → counts per kind. Reads the stored selections directly:
    /// during onboarding nothing has synced yet, and a version keyed off
    /// `oaths` reported an empty dict forever — the picker row stayed at
    /// "None yet" no matter what was chosen.
    func selectionCounts() -> [String: [String: Int]] {
        Shared.allSelectionCounts()
    }

    // MARK: scheduling

    /// Rebuilds every monitored window from scratch. Cheap, and it keeps the
    /// device in step with the UI without diffing.
    /// `pruneOrphans` is true only when `oaths` is the app's complete, current
    /// list. Deleting a selection is irreversible, so it must never happen on
    /// the strength of a list that simply has not been populated yet.
    func sync(oaths: [OathSpec], pruneOrphans: Bool = true) {
        self.oaths = oaths

        // Only the oath windows — a bare stopMonitoring() would also cancel a
        // running urge shield, leaving it raised with nothing to lift it.
        let oathActivities = center.activities.filter { $0.rawValue != Shared.urgeActivity }
        if !oathActivities.isEmpty { center.stopMonitoring(oathActivities) }

        /* Any shield we know about that this list does not justify comes
           down. That covers commitments switched off and, critically, ones
           deleted entirely: a deleted oath is simply absent here, so without
           sweeping the registry its shield had nothing left to lower it. */
        let live = Set(oaths.filter { $0.on }.map { $0.id })
        let known = Set(oaths.map { $0.id })
        for id in Shared.knownOathIds where !live.contains(id) {
            Shared.store(id).clearAllSettings()
            // A selection whose commitment no longer exists is a ghost: it
            // would still be counted as protection and pulled into an urge
            // shield. Forget it outright — but only when this list is
            // authoritative, or onboarding's pick would be erased.
            if pruneOrphans && !known.contains(id) { Shared.forget(oathId: id) }
        }

        // An urge shield blocks the union of every selection. Once the last
        // one is gone there is nothing left for it to legitimately block.
        let covered = Shared.urgeSelection()
        if covered.applicationTokens.isEmpty && covered.categoryTokens.isEmpty
            && covered.webDomainTokens.isEmpty {
            lowerUrgeShield()
        }

        var status: [String: String] = [:]

        for oath in oaths where oath.on {
            Shared.registerOath(oath.id)
            Shared.saveDays(oath.days, for: oath.id)

            guard !oath.days.isEmpty else { status["\(oath.id)"] = "noDays"; continue }
            guard Shared.selectionCount(for: oath.id) > 0 else { status["\(oath.id)"] = "noApps"; continue }
            guard let start = Self.components(oath.time),
                  let end = Self.components(oath.until) else { status["\(oath.id)"] = "badTime"; continue }
            guard Self.windowMinutes(from: start, to: end) >= Self.minimumWindowMinutes else {
                status["\(oath.id)"] = "tooShort"; continue
            }

            let schedule = DeviceActivitySchedule(
                intervalStart: start,
                intervalEnd: end,
                repeats: true
            )

            do {
                try center.startMonitoring(
                    DeviceActivityName(Shared.activityName(oath.id)),
                    during: schedule
                )
                status["\(oath.id)"] = "armed"
            } catch {
                NSLog("Sworn: could not monitor oath \(oath.id): \(error.localizedDescription)")
                status["\(oath.id)"] = "failed"
            }
        }

        onArmedChanged?(status)
    }

    /// Length of a window in minutes, counting one that runs past midnight.
    private static func windowMinutes(from start: DateComponents, to end: DateComponents) -> Int {
        let a = (start.hour ?? 0) * 60 + (start.minute ?? 0)
        let b = (end.hour ?? 0) * 60 + (end.minute ?? 0)
        return b > a ? b - a : (24 * 60 - a) + b
    }

    // MARK: the urge shield

    /// "I'm tempted" — block everything under any oath, right now, for a while.
    /// The shield is applied immediately so it does not depend on the app
    /// staying open, and a one-off DeviceActivity window lifts it again.
    @discardableResult
    func raiseUrgeShield(minutes: Int) -> Date {
        let now = Date()
        let end = now.addingTimeInterval(TimeInterval(minutes * 60))

        Shared.applyUrgeShield()

        let cal = Calendar.current
        let schedule = DeviceActivitySchedule(
            intervalStart: cal.dateComponents([.hour, .minute], from: now),
            intervalEnd: cal.dateComponents([.hour, .minute], from: end),
            repeats: false
        )

        center.stopMonitoring([DeviceActivityName(Shared.urgeActivity)])
        do {
            try center.startMonitoring(DeviceActivityName(Shared.urgeActivity), during: schedule)
        } catch {
            // The shield is already up; without the window it simply needs the
            // app to lift it, so this is degraded rather than broken.
            NSLog("Sworn: urge window not scheduled: \(error.localizedDescription)")
        }

        return end
    }

    func lowerUrgeShield() {
        center.stopMonitoring([DeviceActivityName(Shared.urgeActivity)])
        Shared.clearUrgeShield()
    }

    #if DEBUG
    /// Developer reset: unschedule everything and drop every shield.
    func resetAll() {
        center.stopMonitoring()
        Shared.clearAllShields()
        oaths = []
    }
    #endif

    /// Lift everything, now. Stops every schedule this app owns and lowers
    /// every shield in the registry, so a user can never be left blocked by
    /// state the UI no longer shows.
    func liftAllBlocking() {
        let ours = center.activities.filter {
            $0.rawValue == Shared.urgeActivity || Shared.oathId(from: $0.rawValue) != nil
        }
        if !ours.isEmpty { center.stopMonitoring(ours) }
        Shared.clearAllShields()
    }

    func forget(oathId: Int) {
        center.stopMonitoring([DeviceActivityName(Shared.activityName(oathId))])
        Shared.forget(oathId: oathId)
    }

    private static func components(_ hhmm: String) -> DateComponents? {
        let parts = hhmm.split(separator: ":")
        guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]),
              (0..<24).contains(h), (0..<60).contains(m) else { return nil }
        return DateComponents(hour: h, minute: m)
    }
}
