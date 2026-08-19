import Foundation
import Security

/* The backend mirror. The device stays the source of truth for protection and
   UI; this engine's whole job is persistence, restore, and meaningful history:

     profiles  — behaviour, why record, oath/streak dates
     oaths     — schedule metadata and an app count (Apple's picker tokens are
                 device-bound and cannot sync; a new phone re-picks)
     events    — protection_used / temptation_resisted / commitment_broken /
                 protection_bypassed, timestamps only

   Lapse notes never leave the device: the note box promises "Only you ever
   see this", and that stays literally true.

   Safety model: the anon key is public by design and every request carries the
   user's own JWT; row-level security on the tables is what protects the data.
   With no key pasted the engine is inert and the app is fully local, exactly
   as before. Nothing here ever blocks protection or UI — every call is
   fire-and-forget with a persisted retry queue. */

enum SupabaseConfig {
    static let url = URL(string: "https://wvgjnabdxsaktccdfsvp.supabase.co")!

    /// The anon/publishable key from the Supabase dashboard (Settings → API).
    /// Public by design — it grants nothing without a user's JWT + RLS.
    /// Empty string = sync disabled, app runs fully local.
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Z2puYWJkeHNha3RjY2Rmc3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjU3NDYsImV4cCI6MjEwMjQ0MTc0Nn0.IQmigbpmzYkntoz2RDa-BxitGvF1re0bkNW5vodFkEM"

    static var enabled: Bool { !anonKey.isEmpty }
}

// MARK: - keychain

/// Just enough keychain to hold the session tokens, which do not belong in
/// UserDefaults.
private enum Keychain {
    static func set(_ value: String, for key: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrAccount as String: key]
        SecItemDelete(query as CFDictionary)
        var add = query
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(add as CFDictionary, nil)
    }

    static func get(_ key: String) -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrAccount as String: key,
                                    kSecReturnData as String: true,
                                    kSecMatchLimit as String: kSecMatchLimitOne]
        var out: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(_ key: String) {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrAccount as String: key]
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - engine

extension Notification.Name {
    /// A Supabase session now exists. Signing in hands the user to the app
    /// immediately while the token exchange is still in flight, so anything
    /// that needs the server has to wait for this rather than assume.
    static let swornSessionReady = Notification.Name("sworn.sessionReady")
}

final class SyncEngine {
    static let shared = SyncEngine()

    private let defaults = UserDefaults.standard
    private enum Key {
        static let access = "supa.access"
        static let refresh = "supa.refresh"
        static let userId = "supa.userId"
        static let expiresAt = "supa.expiresAt"     // UserDefaults; not a secret
        static let pendingEvents = "supa.pendingEvents"
        static let pendingProfile = "supa.pendingProfile"
        static let pendingOaths = "supa.pendingOaths"
    }

    private var userId: String? { Keychain.get(Key.userId) }
    var signedIn: Bool { SupabaseConfig.enabled && userId != nil }

    // MARK: auth

    /// Exchange the Apple identity token for a Supabase session. Called once,
    /// at the moment of the real Sign in with Apple — afterwards the refresh
    /// token carries the session across launches.
    func signIn(appleIdToken: String) async {
        guard SupabaseConfig.enabled else { return }
        var request = URLRequest(url: SupabaseConfig.url.appendingPathComponent("auth/v1/token"))
        request.url?.append(queryItems: [URLQueryItem(name: "grant_type", value: "id_token")])
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "provider": "apple", "id_token": appleIdToken
        ])
        await storeSession(from: request)
        await flush()
        // The page has already loaded and asked for a restore by now, and got
        // nothing because this had not finished. Tell it to ask again.
        if signedIn { NotificationCenter.default.post(name: .swornSessionReady, object: nil) }
        }

    private func refreshIfNeeded() async {
        guard SupabaseConfig.enabled, Keychain.get(Key.refresh) != nil else { return }
        let expiresAt = defaults.double(forKey: Key.expiresAt)
        guard Date().timeIntervalSince1970 > expiresAt - 60 else { return }

        var request = URLRequest(url: SupabaseConfig.url.appendingPathComponent("auth/v1/token"))
        request.url?.append(queryItems: [URLQueryItem(name: "grant_type", value: "refresh_token")])
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "refresh_token": Keychain.get(Key.refresh) ?? ""
        ])
        await storeSession(from: request)
    }

    private func storeSession(from request: URLRequest) async {
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let access = json["access_token"] as? String,
              let refresh = json["refresh_token"] as? String else { return }
        Keychain.set(access, for: Key.access)
        Keychain.set(refresh, for: Key.refresh)
        if let user = json["user"] as? [String: Any], let id = user["id"] as? String {
            Keychain.set(id, for: Key.userId)
        }
        let expiresIn = json["expires_in"] as? Double ?? 3600
        defaults.set(Date().timeIntervalSince1970 + expiresIn, forKey: Key.expiresAt)
    }

    func signOut() {
        [Key.access, Key.refresh, Key.userId].forEach(Keychain.delete)
        [Key.expiresAt, Key.pendingEvents, Key.pendingProfile, Key.pendingOaths]
            .forEach(defaults.removeObject(forKey:))
    }

    // MARK: intake (called from the bridge; never blocks, never throws)

    /// Latest profile snapshot from the web layer. Stored, then pushed.
    func stageProfile(_ payload: [String: Any]) {
        stash(payload, at: Key.pendingProfile)
        Task { await flush() }
    }

    func stageOaths(_ payload: [[String: Any]]) {
        stash(payload, at: Key.pendingOaths)
        Task { await flush() }
    }

    /* Everything staged is held as JSON, never as a raw dictionary.

       A JS null arrives across the WKWebView bridge as NSNull, which is not a
       property-list type: handing one to UserDefaults.set raises an uncaught
       NSInvalidArgumentException and kills the app. Profiles legitimately
       contain nulls — no name until sign-in, no cost until it is written — so
       "Start my journey" terminated the app on the spot. JSON round-trips
       null correctly and Data is always plist-safe. */
    private func stash(_ value: Any, at key: String) {
        guard JSONSerialization.isValidJSONObject(value),
              let data = try? JSONSerialization.data(withJSONObject: value) else { return }
        defaults.set(data, forKey: key)
    }

    private func staged(_ key: String) -> Any? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONSerialization.jsonObject(with: data)
    }

    /// A meaningful behavioural event. Queued durably, pushed with retry.
    func recordEvent(type: String, at ms: Double, reason: String? = nil) {
        var queue = pendingEvents()
        var event: [String: Any] = ["type": type, "at": ms]
        if let reason, !reason.isEmpty { event["reason"] = reason }
        queue.append(event)
        stash(queue, at: Key.pendingEvents)
        Task { await flush() }
    }

    // MARK: push

    /// Push everything staged. Safe to call any time; each part clears only
    /// after the server accepts it.
    func flush() async {
        guard signedIn else { return }
        await refreshIfNeeded()

        if let profile = staged(Key.pendingProfile) as? [String: Any] {
            var row = profile
            row["id"] = userId
            row["updated_at"] = isoNow()
            if await upsert(table: "profiles", rows: [row], conflict: "id") {
                defaults.removeObject(forKey: Key.pendingProfile)
            }
        }

        if let oaths = staged(Key.pendingOaths) as? [[String: Any]] {
            let rows = oaths.map { oath -> [String: Any] in
                var row = oath
                row["user_id"] = userId
                row["updated_at"] = isoNow()
                return row
            }
            let accepted = rows.isEmpty
                ? true
                : await upsert(table: "oaths", rows: rows, conflict: "user_id,oath_id")
            if accepted { defaults.removeObject(forKey: Key.pendingOaths) }
        }

        let queue = pendingEvents()
        if !queue.isEmpty {
            let rows = queue.compactMap { event -> [String: Any]? in
                guard let type = event["type"] as? String, let ms = event["at"] as? Double else { return nil }
                var row: [String: Any] = ["user_id": userId ?? "", "type": type, "at": iso(ms: ms)]
                if let reason = event["reason"] as? String { row["reason"] = reason }
                return row
            }
            // ignore-duplicates + the unique constraint make retries idempotent
            if await upsert(table: "events", rows: rows, conflict: "user_id,type,at", merge: false) {
                defaults.removeObject(forKey: Key.pendingEvents)
            }
        }
    }

    // MARK: pull

    /// Everything the server holds for this user, shaped for the web layer's
    /// onRestore. Nil when signed out, offline, or there is nothing there.
    func pullAll() async -> String? {
        guard signedIn else { return nil }
        await refreshIfNeeded()
        guard let uid = userId else { return nil }

        async let profileData = get(path: "rest/v1/profiles", query: "id=eq.\(uid)&select=*")
        async let eventData = get(path: "rest/v1/events", query: "user_id=eq.\(uid)&select=type,at,reason&order=at.asc&limit=2000")
        async let oathData = get(path: "rest/v1/oaths", query: "user_id=eq.\(uid)&select=*")

        let profiles = (try? JSONSerialization.jsonObject(with: await profileData ?? Data())) as? [[String: Any]] ?? []
        let events = (try? JSONSerialization.jsonObject(with: await eventData ?? Data())) as? [[String: Any]] ?? []
        let oaths = (try? JSONSerialization.jsonObject(with: await oathData ?? Data())) as? [[String: Any]] ?? []
        guard profiles.first != nil || !events.isEmpty else { return nil }

        let payload: [String: Any] = [
            "profile": profiles.first ?? [:],
            "events": events,
            "oaths": oaths
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: payload) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    // MARK: plumbing

    private func upsert(table: String, rows: [[String: Any]], conflict: String, merge: Bool = true) async -> Bool {
        guard var url = URLComponents(url: SupabaseConfig.url.appendingPathComponent("rest/v1/\(table)"),
                                      resolvingAgainstBaseURL: false) else { return false }
        url.queryItems = [URLQueryItem(name: "on_conflict", value: conflict)]
        guard let endpoint = url.url else { return false }

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(Keychain.get(Key.access) ?? "")", forHTTPHeaderField: "Authorization")
        request.setValue(merge ? "resolution=merge-duplicates,return=minimal"
                               : "resolution=ignore-duplicates,return=minimal",
                         forHTTPHeaderField: "Prefer")
        request.httpBody = try? JSONSerialization.data(withJSONObject: rows)

        guard let (_, response) = try? await URLSession.shared.data(for: request),
              let status = (response as? HTTPURLResponse)?.statusCode else { return false }
        return (200...299).contains(status)
    }

    private func get(path: String, query: String) async -> Data? {
        guard let url = URL(string: "\(SupabaseConfig.url)/\(path)?\(query)") else { return nil }
        var request = URLRequest(url: url)
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(Keychain.get(Key.access) ?? "")", forHTTPHeaderField: "Authorization")
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        return data
    }

    private func pendingEvents() -> [[String: Any]] {
        staged(Key.pendingEvents) as? [[String: Any]] ?? []
    }

    private func isoNow() -> String { iso(ms: Date().timeIntervalSince1970 * 1000) }

    private func iso(ms: Double) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: Date(timeIntervalSince1970: ms / 1000))
    }
}
