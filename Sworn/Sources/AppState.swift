import Foundation

/// Which of the three stages the app is in: onboarding, signing in, or running.
@MainActor
final class AppState: ObservableObject {
    @Published private(set) var onboarded: Bool = Shared.onboarded

    func completeOnboarding() {
        Shared.onboarded = true
        onboarded = true
    }

    /// Lets the flow be walked again from the start.
    func replayOnboarding() {
        Shared.onboarded = false
        onboarded = false
    }
}
