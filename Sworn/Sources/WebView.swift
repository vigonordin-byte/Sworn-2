import SwiftUI
import UIKit
import WebKit
import StoreKit
import UserNotifications
import CoreHaptics

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
                    RevealHaptics.shared.run(ms: body["ms"] as? Double ?? 0)

                case "notify":
                    // Asked once, after onboarding has explained why.
                    let granted = await Notifications.shared.requestAuthorization()
                    self.call("window.sworn.onNotifyPermission(\(granted))")

                case "notifySync":
                    // The whole schedule is rebuilt from this snapshot, so a
                    // changed or deleted commitment leaves nothing behind.
                    await Notifications.shared.sync(NotifState(body))

                case "notifyBreak":
                    Notifications.shared.recordBreak(prefs: NotifPrefs(body["prefs"] as? [String: Any]))

                case "notifyRecommit":
                    Notifications.shared.recommitted(prefs: NotifPrefs(body["prefs"] as? [String: Any]))

                #if DEBUG
                case "notifyTest":
                    Notifications.shared.debugFire(kind: body["kind"] as? String ?? "", state: NotifState(body))

                case "notifyList":
                    let list = await Notifications.shared.debugList()
                    if let data = try? JSONSerialization.data(withJSONObject: list),
                       let json = String(data: data, encoding: .utf8) {
                        self.call("window.sworn.onNotifyList(\(json))")
                    }

                case "notifyClear":
                    Notifications.shared.cancelAll()
                #endif

                case "review":
                    Self.requestReview()

                case "manageSubscription":
                    await Self.manageSubscription()

                case "signOut":
                    self.onSignOut?()

                case "forget":
                    if let id = body["oathId"] as? Int { self.screenTime.forget(oathId: id) }

                case "liftAll":
                    self.screenTime.liftAllBlocking()

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
            RevealHaptics.shared.prepare()

            // A notification the user tapped to get here decides where to land.
            if let route = Notifications.shared.consumeRoute() {
                self.call("window.sworn.onRoute && window.sworn.onRoute('\(route)')")
            }

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

/* The text-reveal haptic session: the phone writing the words into the hand.

   Core Haptics does the real work, because a run of discrete taps can only
   ever feel like taps. One continuous event carries the whole line with an
   intensity curve that swells in and fades out, and a train of sharp
   transients rides on top of it so the writing has texture rather than a flat
   buzz. Devices without a Taptic Engine, or with haptics switched off, fall
   back to soft impacts, and both paths simply do nothing when unavailable —
   there is nothing to feature-gate. */
@MainActor
final class RevealHaptics {
    static let shared = RevealHaptics()

    private var engine: CHHapticEngine?
    private var player: CHHapticPatternPlayer?
    private var fallbackTimer: Timer?
    private var fallbackEndsAt = Date.distantPast
    private let fallbackGenerator = UIImpactFeedbackGenerator(style: .medium)

    private var supported: Bool { CHHapticEngine.capabilitiesForHardware().supportsHaptics }

    /// Warmed at launch so the first line does not pay the start-up cost.
    func prepare() {
        guard supported, engine == nil else { return }
        engine = try? CHHapticEngine()
        // The system stops the engine when the app backgrounds; restart lazily
        // rather than holding it running.
        engine?.stoppedHandler = { [weak self] _ in Task { @MainActor in self?.engine = nil } }
        engine?.resetHandler = { [weak self] in Task { @MainActor in try? self?.engine?.start() } }
        try? engine?.start()
    }

    func run(ms: Double) {
        stop()
        guard ms > 120 else { return }
        let duration = min(ms / 1000, 8)

        guard supported else { return runFallback(duration: duration) }
        prepare()
        guard let engine else { return runFallback(duration: duration) }

        // The bed: a continuous vibration that swells in and eases out.
        let bed = CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.65),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.35)
            ],
            relativeTime: 0,
            duration: duration
        )
        let curve = CHHapticParameterCurve(
            parameterID: .hapticIntensityControl,
            controlPoints: [
                .init(relativeTime: 0, value: 0.15),
                .init(relativeTime: 0.12, value: 1.0),
                .init(relativeTime: max(0.2, duration - 0.25), value: 1.0),
                .init(relativeTime: duration, value: 0)
            ],
            relativeTime: 0
        )

        // The texture: fine transients across the bed, like nib on paper.
        var events: [CHHapticEvent] = [bed]
        var t = 0.04
        while t < duration - 0.05 {
            events.append(CHHapticEvent(
                eventType: .hapticTransient,
                parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.5),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.6)
                ],
                relativeTime: t
            ))
            t += 0.055
        }

        guard let pattern = try? CHHapticPattern(events: events, parameterCurves: [curve]),
              let player = try? engine.makePlayer(with: pattern) else {
            return runFallback(duration: duration)
        }
        self.player = player
        try? player.start(atTime: CHHapticTimeImmediate)
    }

    func stop() {
        try? player?.stop(atTime: CHHapticTimeImmediate)
        player = nil
        fallbackTimer?.invalidate()
        fallbackTimer = nil
    }

    /// No Taptic Engine: the best available approximation.
    private func runFallback(duration: Double) {
        fallbackEndsAt = Date().addingTimeInterval(duration)
        fallbackGenerator.prepare()
        let timer = Timer(timeInterval: 0.06, repeats: true) { [weak self] t in
            Task { @MainActor in
                guard let self else { t.invalidate(); return }
                guard Date() < self.fallbackEndsAt else { self.stop(); return }
                self.fallbackGenerator.impactOccurred(intensity: 0.85)
                self.fallbackGenerator.prepare()
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        fallbackTimer = timer
    }
}
