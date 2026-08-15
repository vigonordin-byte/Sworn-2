import Foundation
import FamilyControls
import ManagedSettings

/// State the app and the DeviceActivity extension both need. They are separate
/// processes, so everything travels through the shared App Group container.
enum Shared {
    static let appGroup = "group.com.vigonordin.sworn2app"

    static var defaults: UserDefaults {
        UserDefaults(suiteName: appGroup) ?? .standard
    }

    // MARK: activity names

    /// Each oath monitors under its own name, e.g. "oath.3".
    static func activityName(_ oathId: Int) -> String { "oath.\(oathId)" }

    static func oathId(from activity: String) -> Int? {
        guard activity.hasPrefix("oath.") else { return nil }
        return Int(activity.dropFirst("oath.".count))
    }

    /// One settings store per oath, so lifting one lock never lifts another.
    static func store(_ oathId: Int) -> ManagedSettingsStore {
        ManagedSettingsStore(named: ManagedSettingsStore.Name("oath\(oathId)"))
    }

    // MARK: per-oath data

    static func saveSelection(_ selection: FamilyActivitySelection, for oathId: Int) {
        guard let data = try? JSONEncoder().encode(selection) else { return }
        defaults.set(data, forKey: "selection.\(oathId)")
    }

    static func selection(for oathId: Int) -> FamilyActivitySelection? {
        guard let data = defaults.data(forKey: "selection.\(oathId)") else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }

    /// How many things the user picked. The tokens are opaque, so a count is
    /// the most the UI is allowed to know.
    static func selectionCount(for oathId: Int) -> Int {
        guard let s = selection(for: oathId) else { return 0 }
        return s.applicationTokens.count + s.categoryTokens.count + s.webDomainTokens.count
    }

    /// Weekday indices the oath covers, 0 = Sunday.
    static func saveDays(_ days: [Int], for oathId: Int) {
        defaults.set(days, forKey: "days.\(oathId)")
    }

    static func days(for oathId: Int) -> [Int] {
        defaults.array(forKey: "days.\(oathId)") as? [Int] ?? Array(0...6)
    }

    static func forget(oathId: Int) {
        defaults.removeObject(forKey: "selection.\(oathId)")
        defaults.removeObject(forKey: "days.\(oathId)")
        store(oathId).clearAllSettings()
    }
}
