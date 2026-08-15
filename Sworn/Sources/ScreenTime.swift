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
        sync(oaths: oaths)
        onCountsChanged?()
    }

    /// Called after a pick so the web layer can relabel the row.
    var onCountsChanged: (() -> Void)?

    /// oath id → number of apps/categories/domains covered.
    func selectionCounts() -> [String: Int] {
        var out: [String: Int] = [:]
        for oath in oaths { out["\(oath.id)"] = Shared.selectionCount(for: oath.id) }
        return out
    }

    // MARK: scheduling

    /// Rebuilds every monitored window from scratch. Cheap, and it keeps the
    /// device in step with the UI without diffing.
    func sync(oaths: [OathSpec]) {
        self.oaths = oaths

        // Only the oath windows — a bare stopMonitoring() would also cancel a
        // running urge shield, leaving it raised with nothing to lift it.
        let oathActivities = center.activities.filter { $0.rawValue != Shared.urgeActivity }
        if !oathActivities.isEmpty { center.stopMonitoring(oathActivities) }

        // An oath that is off must not leave a stale shield behind.
        for oath in oaths where !oath.on {
            Shared.store(oath.id).clearAllSettings()
        }

        for oath in oaths where oath.on {
            Shared.saveDays(oath.days, for: oath.id)

            guard
                !oath.days.isEmpty,
                Shared.selectionCount(for: oath.id) > 0,
                let start = Self.components(oath.time),
                let end = Self.components(oath.until),
                start != end                       // a zero-length window is rejected by iOS
            else { continue }

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
            } catch {
                NSLog("Sworn: could not monitor oath \(oath.id): \(error.localizedDescription)")
            }
        }
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
