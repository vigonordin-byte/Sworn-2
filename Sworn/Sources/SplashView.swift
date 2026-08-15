import SwiftUI

/// Shown while the stored sign-in is being revalidated.
///
/// This used to be a bare black rectangle, which is indistinguishable from a
/// crash if anything upstream stalls. It is branded and it says something, so a
/// slow start reads as a slow start.
struct SplashView: View {
    var body: some View {
        ZStack {
            Color(red: 0.027, green: 0.027, blue: 0.031).ignoresSafeArea()

            VStack(spacing: 16) {
                Text("SWORN")
                    .font(.system(size: 20, weight: .bold))
                    .kerning(8)
                    .foregroundStyle(Color(red: 0.949, green: 0.941, blue: 0.925))

                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(Color.white.opacity(0.35))
            }
        }
        .preferredColorScheme(.dark)
    }
}
