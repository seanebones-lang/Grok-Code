// MARK: - Support Views for App Store Compliance
import SwiftUI

struct OnboardingTroubleshootingView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Onboarding Troubleshooting")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                Text("1. Ensure iOS 18+. 2. Add widget via long-press home/add widget. 3. Grant CoreData permissions if prompted. 4. Enable auto-refresh in settings. 5. Check diagnostics.")
                    .font(.body)
                Text("Common fixes: Delete/re-add widget, restart SpringBoard, check App Groups in diagnostics.")
                Button("Restart Widgets") {
                    WidgetCenter.shared.reloadAllTimelines()
                }
            }
            .padding()
            .accessibilityLabel("Troubleshooting: Widget not showing? Check permissions, re-add.")
        }
        .navigationTitle("Troubleshooting")
    }
}

struct FAQView: View {
    var body: some View {
        List {
            Section("General") {
                Text("Q: Does it work offline? A: Yes, cached words + local CoreData.")
                Text("Q: Sources? A: Oxford/FreeDictionary public APIs.")
            }
            Section("Widget") {
                Text("Q: Widget blank? A: Run diagnostics in settings.")
            }
        }
        .navigationTitle("FAQ")
        .accessibilityLabel("FAQ: Offline yes, Oxford sources, diagnostics for widget issues.")
    }
}

struct SubscriptionDetailsView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Subscription Details")
                    .font(.largeTitle)
                Text("LexiGlow is completely free. No subscriptions, IAP, or paywalls. Unlimited words, categories, exports.")
                Text("Support development: mothership-ai.com/donate")
            }
            .padding()
        }
        .navigationTitle("Subscriptions")
        .accessibilityLabel("Free forever, no subscriptions required.")
    }
}

struct EnhancedSupportView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading) {
                Text("Enhanced Support")
                    .font(.largeTitle)
                Text("Priority email: support@mothership-ai.com. Include diagnostics + device/iOS version.")
                Button("Copy Diagnostics") {
                    // Impl pasteboard
                }
            }
            .padding()
        }
        .navigationTitle("Support")
    }
}

struct ContactView: View {
    var body: some View {
        Form {
            Button("Email info@mothership-ai.com") {
                if let url = URL(string: "mailto:info@mothership-ai.com") {
                    UIApplication.shared.open(url)
                }
            }
            Button("Website mothership-ai.com") {
                if let url = URL(string: "https://mothership-ai.com") {
                    UIApplication.shared.open(url)
                }
            }
        }
        .navigationTitle("Contact")
    }
}

#Preview {
    NavigationStack {
        FAQView()
    }
}
