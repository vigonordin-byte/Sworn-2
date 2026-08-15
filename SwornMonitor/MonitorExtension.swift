import DeviceActivity
import ManagedSettings
import Foundation

/// Runs out-of-process. iOS wakes it at each window boundary, and this is the
/// only place the shield is actually raised or lowered.
final class SwornMonitor: DeviceActivityMonitor {

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)

        guard let id = Shared.oathId(from: activity.rawValue) else { return }

        // A schedule repeats daily; the oath may only cover some days.
        let weekday = Calendar.current.component(.weekday, from: Date()) - 1  // 0 = Sunday
        guard Shared.days(for: id).contains(weekday) else { return }

        guard let selection = Shared.selection(for: id) else { return }

        let store = Shared.store(id)
        store.shield.applications = selection.applicationTokens.isEmpty
            ? nil : selection.applicationTokens
        store.shield.applicationCategories = selection.categoryTokens.isEmpty
            ? nil : .specific(selection.categoryTokens)
        store.shield.webDomains = selection.webDomainTokens.isEmpty
            ? nil : selection.webDomainTokens
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        guard let id = Shared.oathId(from: activity.rawValue) else { return }
        Shared.store(id).clearAllSettings()
    }
}
