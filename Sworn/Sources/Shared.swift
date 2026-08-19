import Foundation
import FamilyControls
import ManagedSettings

/// State the app and the DeviceActivity extension both need. They are separate
/// processes, so everything travels through the shared App Group container.
enum Shared {
    static let appGroup = "group.com.vigonordin.sworn2app"

    /* The app and the monitor extension are separate processes and meet only
       here. If the App Group in the entitlements does not match this string,
       the suite comes back nil — and falling through to .standard gives each
       process its own private container that merely looks like it works. The
       app stores a selection, the extension finds nothing, and protection
       silently never blocks. That failure is invisible at runtime, so it is
       made loud here rather than discovered on a device weeks later. */
    static var defaults: UserDefaults {
        guard let shared = UserDefaults(suiteName: appGroup) else {
            assertionFailure("App Group \(appGroup) is missing from the entitlements; "
                             + "the extension cannot see anything the app saves.")
            NSLog("Sworn: App Group %@ unavailable — protection cannot work.", appGroup)
            return .standard
        }
        return shared
    }

    /// Whether onboarding has been completed. Kept here rather than in webview
    /// storage so it survives regardless of what the page can persist.
    static var onboarded: Bool {
        get { defaults.bool(forKey: "app.onboarded") }
        set { defaults.set(newValue, forKey: "app.onboarded") }
    }

    // MARK: activity names

    /// Each oath monitors under its own name, e.g. "oath.3".
    static func activityName(_ oathId: Int) -> String { "oath.\(oathId)" }

    /// The one-off window raised by "I'm tempted".
    static let urgeActivity = "urge"
    static let urgeStoreName = "urge"

    static var urgeStore: ManagedSettingsStore {
        ManagedSettingsStore(named: ManagedSettingsStore.Name(urgeStoreName))
    }

    /// Everything covered by any oath — what an urge shield blocks.
    static func urgeSelection() -> FamilyActivitySelection {
        var combined = FamilyActivitySelection()
        for key in defaults.dictionaryRepresentation().keys where key.hasPrefix("selection.") {
            guard let id = Int(key.dropFirst("selection.".count)),
                  let part = selection(for: id) else { continue }
            combined.applicationTokens.formUnion(part.applicationTokens)
            combined.categoryTokens.formUnion(part.categoryTokens)
            combined.webDomainTokens.formUnion(part.webDomainTokens)
        }
        return combined
    }

    static func applyUrgeShield() {
        let selection = urgeSelection()
        let store = urgeStore
        store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
        store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
        store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
    }

    static func clearUrgeShield() {
        urgeStore.clearAllSettings()
    }

    static func oathId(from activity: String) -> Int? {
        guard activity.hasPrefix("oath.") else { return nil }
        return Int(activity.dropFirst("oath.".count))
    }

    /// One settings store per oath, so lifting one lock never lifts another.
    static func store(_ oathId: Int) -> ManagedSettingsStore {
        ManagedSettingsStore(named: ManagedSettingsStore.Name("oath\(oathId)"))
    }

    /* Every shield store that has ever been created, kept durably.

       A ManagedSettingsStore outlives the app that made it: shields persist
       across launches, reinstalls of the schedule, and process death, and
       there is no API to enumerate them. Without this registry the only
       record of a store was its selection key — which deletion removed — so
       a shield could be left raised with nothing left that knew to lower it.
       Everything that clears shields now sweeps from here. */
    private static let registryKey = "oath.ids"

    static var knownOathIds: [Int] {
        let stored = defaults.array(forKey: registryKey) as? [Int] ?? []
        // Selection keys are a second source of truth for anything written by
        // an older build that predates the registry.
        let legacy = defaults.dictionaryRepresentation().keys
            .filter { $0.hasPrefix("selection.") }
            .compactMap { Int($0.dropFirst("selection.".count)) }
        return Array(Set(stored).union(legacy)).sorted()
    }

    static func registerOath(_ oathId: Int) {
        var ids = Set(defaults.array(forKey: registryKey) as? [Int] ?? [])
        guard ids.insert(oathId).inserted else { return }
        defaults.set(Array(ids).sorted(), forKey: registryKey)
    }

    static func deregisterOath(_ oathId: Int) {
        let ids = (defaults.array(forKey: registryKey) as? [Int] ?? []).filter { $0 != oathId }
        defaults.set(ids, forKey: registryKey)
    }

    /// Lower every shield this app can raise. The escape hatch: after this
    /// nothing Sworn controls is blocked, whatever state it was left in.
    static func clearAllShields() {
        for id in knownOathIds { store(id).clearAllSettings() }
        clearUrgeShield()
    }

    // MARK: per-oath data

    static func saveSelection(_ selection: FamilyActivitySelection, for oathId: Int) {
        guard let data = try? JSONEncoder().encode(selection) else { return }
        defaults.set(data, forKey: "selection.\(oathId)")
        registerOath(oathId)
    }

    static func selection(for oathId: Int) -> FamilyActivitySelection? {
        guard let data = defaults.data(forKey: "selection.\(oathId)") else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }

    /// Every stored selection, broken down by kind. Keyed by oath id —
    /// deliberately not limited to synced oaths, because onboarding picks apps
    /// before any sync has run, and its row must still be able to label them.
    /// The kinds stay separate so the UI can say "1 category" for a Social
    /// pick instead of the misleading "1 app".
    static func allSelectionCounts() -> [String: [String: Int]] {
        var out: [String: [String: Int]] = [:]
        for key in defaults.dictionaryRepresentation().keys where key.hasPrefix("selection.") {
            guard let id = Int(key.dropFirst("selection.".count)),
                  let s = selection(for: id) else { continue }
            out["\(id)"] = [
                "apps": s.applicationTokens.count,
                "categories": s.categoryTokens.count,
                "domains": s.webDomainTokens.count
            ]
        }
        return out
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

    #if DEBUG
    /// Developer reset: every key this app owns, plus any shield left standing.
    static func wipeAll() {
        // Clear the shields BEFORE the keys that identify them.
        clearAllShields()
        for key in defaults.dictionaryRepresentation().keys
        where key.hasPrefix("selection.") || key.hasPrefix("days.")
           || key.hasPrefix("auth.") || key.hasPrefix("app.")
           || key == "oath.ids" {
            defaults.removeObject(forKey: key)
        }
    }
    #endif

    static func forget(oathId: Int) {
        store(oathId).clearAllSettings()
        defaults.removeObject(forKey: "selection.\(oathId)")
        defaults.removeObject(forKey: "days.\(oathId)")
        deregisterOath(oathId)
    }
}
