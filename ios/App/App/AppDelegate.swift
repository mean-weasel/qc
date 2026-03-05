import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    private let tokenDefaults = UserDefaults(suiteName: "co.tryqc.app.webStorage") ?? .standard
    private let storageKey = "supabaseTokens"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        saveTokens()
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        saveTokens()
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        restoreTokens()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
        saveTokens()
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Handle Universal Links for OAuth callback.
        // The WebView loads /auth/callback?code=... which exchanges the PKCE code for a session.
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let url = userActivity.webpageURL,
           url.host == "tryqc.co" {
            DispatchQueue.main.async { [weak self] in
                self?.capacitorWebView?.load(URLRequest(url: url))
            }
            return true
        }

        return false
    }

    // MARK: - Session Persistence

    private var capacitorWebView: WKWebView? {
        guard let vc = window?.rootViewController as? CAPBridgeViewController else { return nil }
        return vc.webView
    }

    private func saveTokens() {
        guard let webView = capacitorWebView else { return }

        let js = """
        (function() {
            var result = {};
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key.startsWith('sb-') || key.startsWith('supabase')) {
                    result[key] = localStorage.getItem(key);
                }
            }
            return JSON.stringify(result);
        })();
        """

        webView.evaluateJavaScript(js) { [weak self] result, error in
            guard let self = self, let jsonString = result as? String, error == nil else { return }
            self.tokenDefaults.set(jsonString, forKey: self.storageKey)
        }
    }

    private func restoreTokens() {
        guard let webView = capacitorWebView,
              let jsonString = tokenDefaults.string(forKey: storageKey),
              !jsonString.isEmpty,
              jsonString != "{}" else { return }

        let escaped = jsonString
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")

        let js = """
        (function() {
            try {
                var tokens = JSON.parse('\(escaped)');
                for (var key in tokens) {
                    if (tokens.hasOwnProperty(key)) {
                        localStorage.setItem(key, tokens[key]);
                    }
                }
                window.dispatchEvent(new Event('storage'));
            } catch(e) {
                console.warn('QC: Failed to restore auth tokens', e);
            }
        })();
        """

        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
