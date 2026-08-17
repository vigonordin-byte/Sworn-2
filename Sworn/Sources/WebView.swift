import SwiftUI
import UIKit
import WebKit
import StoreKit
import UserNotifications

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
    var onSignOut: (() -> Void)? = nil
    /// Fires once the page has actually painted, so the splash can be held
    /// until then instead of flashing black.
    var onReady: (() -> Void)? = nil

    func makeCoordinator() -> Bridge {
        let bridge = Bridge(screenTime: screenTime, app: app)
        bridge.onSignOut = onSignOut
        bridge.onReady = onReady
        return bridge
    }

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
        webView.navigationDelegate = context.coordinator
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

    final class Bridge: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
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
                    if let raw = body["oaths"],
                       let list = raw as? [[String: Any]] {
                        SyncEngine.shared.stageOaths(list.map { oath in
                            [
                                "oath_id": oath["id"] ?? 0,
                                "name": oath["name"] ?? "",
                                "lock_at": oath["time"] ?? "",
                                "unlock_at": oath["until"] ?? "",
                                "days": oath["days"] ?? [],
                                "enabled": oath["on"] ?? true,
                                "app_count": oath["appCount"] ?? 0
                            ]
                        })
                    }

                case "profile":
                    if let payload = body["payload"] as? [String: Any] {
                        SyncEngine.shared.stageProfile(payload)
                    }

                case "event":
                    if let type = body["type"] as? String,
                       let at = body["at"] as? Double {
                        SyncEngine.shared.recordEvent(type: type, at: at,
                                                      reason: body["reason"] as? String)
                    }

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
                    SyncEngine.shared.signOut()
                #endif

                case "haptic":
                    Self.revealHaptic()

                case "notify":
                    // The real permission prompt; iOS shows it once. There is
                    // nothing scheduled yet — this only secures the right to.
                    _ = try? await UNUserNotificationCenter.current()
                        .requestAuthorization(options: [.alert, .badge, .sound])

                case "review":
                    Self.requestReview()

                case "manageSubscription":
                    await Self.manageSubscription()

                case "export":
                    Self.share(text: body["text"] as? String ?? "")

                case "signOut":
                    self.onSignOut?()

                case "forget":
                    if let id = body["oathId"] as? Int { self.screenTime.forget(oathId: id) }

                default:
                    break
                }
            }
        }

        /// Set by ContentView so the web layer can sign the user out.
        var onSignOut: (() -> Void)?
        var onReady: (() -> Void)?
        private var didSignalReady = false

        // MARK: navigation

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            signalReady()
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            // Never leave the splash up because a load failed.
            signalReady()
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            signalReady()
        }

        private func signalReady() {
            guard !didSignalReady else { return }
            didSignalReady = true
            onReady?()

            // Push anything queued, then hand the page whatever the server
            // holds. The web layer merges conservatively: streak dates only if
            // older, events unioned, oaths only into an empty list.
            Task { @MainActor in
                await SyncEngine.shared.flush()
                if let json = await SyncEngine.shared.pullAll() {
                    self.call("window.sworn && window.sworn.onRestore && window.sworn.onRestore(\(json))")
                }
            }
        }

        // MARK: system sheets

        /// Apple's own rating prompt. iOS decides whether to actually show it,
        /// and rate-limits it — that is expected, not a failure.
        @MainActor
        private static func requestReview() {
            guard let scene = activeScene() else { return }
            AppStore.requestReview(in: scene)
        }

        @MainActor
        private static func manageSubscription() async {
            guard let scene = activeScene() else { return }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
            } catch {
                // No subscription yet, or the sheet is unavailable — fall back
                // to the account page in the App Store.
                if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
                    await UIApplication.shared.open(url)
                }
            }
        }

        @MainActor
        private static func share(text: String) {
            guard !text.isEmpty, let root = activeScene()?.keyWindow?.rootViewController else { return }
            let sheet = UIActivityViewController(activityItems: [text], applicationActivities: nil)
            // iPad needs an anchor or it throws.
            sheet.popoverPresentationController?.sourceView = root.view
            sheet.popoverPresentationController?.sourceRect = CGRect(
                x: root.view.bounds.midX, y: root.view.bounds.midY, width: 0, height: 0)
            root.present(sheet, animated: true)
        }

        /* One soft tap as a phrase lands — the phone quietly writing the
           words into the hand. The generator no-ops on devices without a
           Taptic Engine and respects the system haptic settings, so there is
           nothing to feature-gate. Rate-limited so bursts can never buzz. */
        private static let revealGenerator = UIImpactFeedbackGenerator(style: .soft)
        private static var lastReveal = Date.distantPast

        @MainActor
        private static func revealHaptic() {
            guard Date().timeIntervalSince(lastReveal) > 0.08 else { return }
            lastReveal = Date()
            revealGenerator.impactOccurred(intensity: 0.45)
        }

        @MainActor
        private static func activeScene() -> UIWindowScene? {
            UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first { $0.activationState == .foregroundActive }
                ?? UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
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
