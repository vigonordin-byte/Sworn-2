import SwiftUI
import FamilyControls

/* The app has three stages, in this order:

     onboarding  →  sign in  →  the app

   Sign-in comes after onboarding, not before, because it belongs with the
   paywall at the end of the flow rather than in front of a stranger. */

struct ContentView: View {
    @StateObject private var screenTime = ScreenTime()
    @StateObject private var auth = AppleAuth()
    @StateObject private var app = AppState()

    private var pickerShown: Binding<Bool> {
        Binding(
            get: { screenTime.pickerOathId != nil },
            // Apple's picker writes straight into the selection binding, so
            // dismissal is the commit point.
            set: { shown in if !shown { screenTime.finishPicking() } }
        )
    }

    var body: some View {
        Group {
            if !app.onboarded {
                WebView(page: "index", screenTime: screenTime, session: nil, app: app)
                    .ignoresSafeArea()
                    .background(Color.black)

            } else if auth.checking {
                // Held only while the stored sign-in is revalidated, and that
                // check is bounded — see AppleAuth.credentialTimeout.
                SplashView()

            } else if let session = auth.session {
                WebView(page: "home", screenTime: screenTime, session: session, app: app)
                    .ignoresSafeArea()
                    .background(Color.black)
                    .task { screenTime.refreshAuthorizationState() }
                    .familyActivityPicker(isPresented: pickerShown, selection: $screenTime.selection)

            } else {
                SignInView(auth: auth)
            }
        }
        .task { await auth.restore() }
    }
}
