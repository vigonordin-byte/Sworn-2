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

    /// The web layer paints a frame or two after the view appears. Holding the
    /// splash over it until then is what removes the black flash at launch.
    @State private var webReady = false

    private var pickerShown: Binding<Bool> {
        Binding(
            get: { screenTime.pickerOathId != nil },
            // Apple's picker writes straight into the selection binding, so
            // dismissal is the commit point.
            set: { shown in if !shown { screenTime.finishPicking() } }
        )
    }

    var body: some View {
        ZStack {
            Group {
                if !app.onboarded {
                    web(page: "index", session: nil)

                } else if auth.checking {
                    Color.clear

                } else if let session = auth.session {
                    web(page: "home", session: session)

                } else {
                    SignInView(auth: auth)
                }
            }
            // On the Group, not the home branch: onboarding's "Choose apps"
            // asks for this picker too, and a modifier that only exists on the
            // home page leaves that row silently doing nothing.
            .familyActivityPicker(isPresented: pickerShown, selection: $screenTime.selection)
            .task { screenTime.refreshAuthorizationState() }

            // Sits on top until there is something real underneath. It is the
            // same lockup the system launch screen draws, so the handover from
            // launch image to app is invisible.
            if showSplash {
                SplashView().transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.18), value: showSplash)
        .task { await auth.restore() }
        // Each stage builds its own web view, so the readiness flag has to
        // reset with it — otherwise the splash lifts before the next page has
        // painted and a black frame shows through the handover.
        .onChange(of: app.onboarded) { _, _ in webReady = false }
        .onChange(of: auth.session) { _, _ in webReady = false }
    }

    private var showSplash: Bool {
        // Onboarding does not wait on the credential check — it has nothing to
        // do with signing in.
        if !app.onboarded { return !webReady }
        if auth.checking { return true }
        // The sign-in screen is native and draws instantly; only the web
        // stages need covering.
        if auth.session == nil { return false }
        return !webReady
    }

    private func web(page: String, session: AppleAuth.Session?) -> some View {
        WebView(page: page,
                screenTime: screenTime,
                session: session,
                app: app,
                onSignOut: { auth.clear() },
                onReady: { webReady = true })
            .ignoresSafeArea()
            .background(Color.black)
    }
}
