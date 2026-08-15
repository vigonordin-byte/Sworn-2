import AuthenticationServices
import Foundation

/// Sign in with Apple.
///
/// The one thing to know: Apple hands over the user's name **only on the very
/// first authorization**. Every sign-in after that returns the identifier and
/// nothing else — so the name is persisted here the moment it arrives, or it is
/// gone for good.
@MainActor
final class AppleAuth: NSObject, ObservableObject {

    struct Session: Equatable {
        let userId: String
        let name: String
        /// True only for the launch immediately after signing up.
        let firstRun: Bool
    }

    @Published private(set) var session: Session?
    @Published private(set) var failure: String?
    @Published private(set) var checking = true

    private let defaults = Shared.defaults
    private enum Key {
        static let userId = "auth.userId"
        static let name = "auth.name"
        static let greeted = "auth.greeted"
    }

    /// How long to wait for Apple before trusting what we already have.
    private static let credentialTimeout: Double = 3

    /// Reconnect a previous sign-in, unless Apple says it is no longer valid.
    func restore() async {
        defer { checking = false }

        guard let userId = defaults.string(forKey: Key.userId) else { return }

        let state = await credentialState(for: userId, timeout: Self.credentialTimeout)

        // nil means the check timed out. Signing the user out over a slow
        // network would be worse than trusting the credential we already hold;
        // a genuinely revoked one fails again at the next real use.
        if let state, state != .authorized {
            clear()
            return
        }

        session = Session(
            userId: userId,
            name: defaults.string(forKey: Key.name) ?? "",
            firstRun: false
        )
    }

    func handle(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                failure = "That sign-in could not be read."
                return
            }

            // Only present on the first authorization — keep it or lose it.
            let name = Self.firstName(from: credential.fullName)
                ?? defaults.string(forKey: Key.name)
                ?? ""

            defaults.set(credential.user, forKey: Key.userId)
            if !name.isEmpty { defaults.set(name, forKey: Key.name) }

            let alreadyGreeted = defaults.bool(forKey: Key.greeted)
            defaults.set(true, forKey: Key.greeted)

            failure = nil
            session = Session(userId: credential.user, name: name, firstRun: !alreadyGreeted)

        case .failure(let error):
            // Cancelling is not an error worth showing.
            if (error as? ASAuthorizationError)?.code == .canceled { return }
            failure = error.localizedDescription
        }
    }

    func clear() {
        defaults.removeObject(forKey: Key.userId)
        defaults.removeObject(forKey: Key.name)
        session = nil
    }

    // MARK: helpers

    /// Returns nil if Apple does not answer in time. Without this bound a hung
    /// call leaves `checking` true forever, which shows as a black screen.
    private func credentialState(for userId: String,
                                 timeout: Double) async -> ASAuthorizationAppleIDProvider.CredentialState? {
        await withTaskGroup(of: ASAuthorizationAppleIDProvider.CredentialState?.self) { group in
            group.addTask {
                await withCheckedContinuation { continuation in
                    ASAuthorizationAppleIDProvider().getCredentialState(forUserID: userId) { state, _ in
                        continuation.resume(returning: state)
                    }
                }
            }
            group.addTask {
                try? await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                return nil
            }

            let first = await group.next() ?? nil
            group.cancelAll()
            return first
        }
    }

    /// A first name greets better than a full one.
    private static func firstName(from components: PersonNameComponents?) -> String? {
        guard let components else { return nil }
        if let given = components.givenName, !given.isEmpty { return given }

        let formatter = PersonNameComponentsFormatter()
        formatter.style = .short
        let formatted = formatter.string(from: components)
        return formatted.isEmpty ? nil : formatted
    }
}
