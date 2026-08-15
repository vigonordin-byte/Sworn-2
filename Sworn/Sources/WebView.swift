import SwiftUI
import WebKit

/// Hosts the bundled web UI and bridges it to Screen Time.
///
/// The web layer owns the oaths; this side owns everything the system will only
/// hand to native code — authorization, the app picker, and the schedules.
struct WebView: UIViewRepresentable {
    let page: String
    let screenTime: ScreenTime
    /// Absent during onboarding — nobody has signed in yet.
    let session: AppleAuth.Session?
    let app: AppState

    func makeCoordinator() -> Bridge { Bridge(screenTime: screenTime, app: app) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.userContentController.add(context.coordinator, name: "sworn")

        // Tells the web layer a native host is present and who is signed in,
        // before any page script runs, so the first paint is already correct.
        var boot = "window.__swornNative = true; window.__swornUser = \(Self.userJSON(session));"
        #if DEBUG
        // The Developer section keys off this. It is never compiled into a
        // Release build, and dev.js is stripped from that bundle besides.
        boot += " window.__swornDebug = true;"
        #endif

        config.userContentController.addUserScript(WKUserScript(
            source: boot,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        // This is an app, not a document — pinching and double-tapping to zoom
        // just breaks the layout. The viewport meta asks for the same thing;
        // this is the part the page cannot override.
        webView.scrollView.minimumZoomScale = 1
        webView.scrollView.maximumZoomScale = 1
        webView.scrollView.bouncesZoom = false
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        context.coordinator.webView = webView

        guard let url = Bundle.main.url(forResource: page, withExtension: "html") else {
            assertionFailure("\(page).html is missing from the bundle")
            return webView
        }
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Loaded once in makeUIView; reloading here would restart the app on
        // every SwiftUI update.
    }

    /// `{ name, firstRun }` — safely encoded, since a name is arbitrary text.
    private static func userJSON(_ session: AppleAuth.Session?) -> String {
        guard let session else { return "null" }
        let payload: [String: Any] = ["name": session.name, "firstRun": session.firstRun]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return "null" }
        return json
    }

    // MARK: bridge

    final class Bridge: NSObject, WKScriptMessageHandler {
        weak var webView: WKWebView?
        private let screenTime: ScreenTime
        private let app: AppState

        init(screenTime: ScreenTime, app: AppState) {
            self.screenTime = screenTime
            self.app = app
            super.init()
            // Relabel the row as soon as a pick lands, without the web layer
            // having to poll for it.
            screenTime.onCountsChanged = { [weak self] in
                Task { @MainActor in self?.reportCounts() }
            }
        }

        func userContentController(_ controller: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any],
                  let action = body["action"] as? String else { return }

            Task { @MainActor in
                switch action {
                case "authorize":
                    let granted = await self.screenTime.requestAuthorization()
                    self.call("window.sworn.onAuth(\(granted))")

                case "pick":
                    guard let id = body["oathId"] as? Int else { return }
                    guard self.screenTime.authorized else {
                        // No point showing a picker we cannot act on.
                        let granted = await self.screenTime.requestAuthorization()
                        self.call("window.sworn.onAuth(\(granted))")
                        if granted { self.screenTime.beginPicking(oathId: id) }
                        return
                    }
                    self.screenTime.beginPicking(oathId: id)

                case "sync":
                    self.screenTime.sync(oaths: Self.oaths(from: body["oaths"]))
                    self.reportCounts()

                case "urge":
                    let minutes = body["minutes"] as? Int ?? 60
                    guard self.screenTime.authorized else {
                        let granted = await self.screenTime.requestAuthorization()
                        self.call("window.sworn.onAuth(\(granted))")
                        if granted { self.screenTime.raiseUrgeShield(minutes: minutes) }
                        return
                    }
                    self.screenTime.raiseUrgeShield(minutes: minutes)

                case "urgeClear":
                    self.screenTime.lowerUrgeShield()

                case "onboarded":
                    // The flow is finished; ContentView moves on to sign-in.
                    self.app.completeOnboarding()

                case "replayOnboarding":
                    self.app.replayOnboarding()

                #if DEBUG
                case "devOnboarded":
                    let value = body["value"] as? Bool ?? false
                    if value { self.app.completeOnboarding() } else { self.app.replayOnboarding() }

                case "devReset":
                    self.screenTime.resetAll()
                    self.app.replayOnboarding()
                    Shared.wipeAll()
                #endif

                case "forget":
                    if let id = body["oathId"] as? Int { self.screenTime.forget(oathId: id) }

                default:
                    break
                }
            }
        }

        /// Push the per-oath selection counts back so the UI can label the row.
        @MainActor
        func reportCounts() {
            let counts = screenTime.selectionCounts()
            guard let json = try? JSONSerialization.data(withJSONObject: counts),
                  let text = String(data: json, encoding: .utf8) else { return }
            call("window.sworn.onCounts(\(text))")
        }

        @MainActor
        private func call(_ js: String) {
            webView?.evaluateJavaScript(js, completionHandler: nil)
        }

        private static func oaths(from raw: Any?) -> [OathSpec] {
            guard let array = raw,
                  let data = try? JSONSerialization.data(withJSONObject: array),
                  let specs = try? JSONDecoder().decode([OathSpec].self, from: data)
            else { return [] }
            return specs
        }
    }
}
