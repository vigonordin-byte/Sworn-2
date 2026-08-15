import SwiftUI

/// The same lockup the system launch screen draws, in the same place.
///
/// Matching it matters: the launch screen is handed over to this view the
/// instant the process is alive, and if they differ you see a flicker. This
/// used to be a bare black rectangle, which is indistinguishable from a crash
/// if anything upstream stalls.
struct SplashView: View {
    var body: some View {
        ZStack {
            Color(red: 0.027, green: 0.027, blue: 0.031).ignoresSafeArea()

            Image("LaunchLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 220)
                .accessibilityLabel("Sworn")
        }
        .preferredColorScheme(.dark)
    }
}
