import SwiftUI

@main
struct SwornApp: App {
    init() {
        // Registers the delegate that routes a tapped notification, before
        // any notification can arrive.
        Notifications.shared.configure()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
        }
    }
}
