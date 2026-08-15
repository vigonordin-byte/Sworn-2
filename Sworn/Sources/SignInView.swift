import SwiftUI
import AuthenticationServices

/// The gate. Rendered natively rather than in the webview so it uses Apple's
/// own button, which their guidelines require.
struct SignInView: View {
    @ObservedObject var auth: AppleAuth

    var body: some View {
        ZStack {
            Color(red: 0.027, green: 0.027, blue: 0.031).ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                Text("SWORN")
                    .font(.system(size: 22, weight: .bold))
                    .kerning(9)
                    .foregroundStyle(Color(red: 0.949, green: 0.941, blue: 0.925))

                Text("Keep your word.")
                    .font(.system(size: 17, weight: .regular))
                    .foregroundStyle(Color.white.opacity(0.45))
                    .padding(.top, 16)

                Spacer()

                if let failure = auth.failure {
                    Text(failure)
                        .font(.system(size: 13))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Color(red: 0.91, green: 0.51, blue: 0.47))
                        .padding(.bottom, 14)
                        .padding(.horizontal, 8)
                }

                SignInWithAppleButton(.signUp) { request in
                    // Apple returns the name once, on this first request only.
                    request.requestedScopes = [.fullName]
                } onCompletion: { result in
                    auth.handle(result)
                }
                .signInWithAppleButtonStyle(.white)
                .frame(height: 52)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                Text("Your commitment stays on your device.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(Color.white.opacity(0.3))
                    .padding(.top, 18)
            }
            .padding(.horizontal, 30)
            .padding(.bottom, 40)
        }
        .preferredColorScheme(.dark)
    }
}
