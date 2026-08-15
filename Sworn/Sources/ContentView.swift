import SwiftUI
import FamilyControls

/// Which bundled page the app opens on.
/// "home" is the main app; switch to "index" for the onboarding flow.
private let startPage = "home"

struct ContentView: View {
    @StateObject private var screenTime = ScreenTime()

    private var pickerShown: Binding<Bool> {
        Binding(
            get: { screenTime.pickerOathId != nil },
            // Apple's picker writes straight into the selection binding, so
            // dismissal is the commit point.
            set: { shown in if !shown { screenTime.finishPicking() } }
        )
    }

    var body: some View {
        WebView(page: startPage, screenTime: screenTime)
            .ignoresSafeArea()
            .background(Color.black)
            .task { screenTime.refreshAuthorizationState() }
            .familyActivityPicker(isPresented: pickerShown, selection: $screenTime.selection)
    }
}
