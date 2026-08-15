import SwiftUI
import FamilyControls

/// Which bundled page the app opens on.
/// "home" is the main app; switch to "index" for the onboarding flow.
private let startPage = "home"

struct ContentView: View {
    @StateObject private var screenTime = ScreenTime()
    @StateObject private var auth = AppleAuth()

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
            if auth.checking {
                // A blank hold rather than a flash of the sign-in screen.
                Color.black.ignoresSafeArea()
            } else if let session = auth.session {
                WebView(page: startPage, screenTime: screenTime, session: session)
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
