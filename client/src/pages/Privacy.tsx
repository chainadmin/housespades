import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6 sm:p-8">
        <div className="mb-6">
          <Link href="/login">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 2026</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="mb-3">When you use House Spades, we collect the following information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Email Address:</strong> We collect your email address when you create an account. This is used for account authentication, password recovery, and important account-related communications.</li>
              <li><strong>Username:</strong> Your chosen display name visible to other players during matchmaking and gameplay.</li>
              <li><strong>Gameplay Statistics:</strong> We track your wins, losses, game history, and skill rating (ELO) to provide matchmaking and leaderboards.</li>
              <li><strong>Device Information:</strong> Basic device identifiers for analytics and ad personalization (with your consent on iOS).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To create and manage your account</li>
              <li>To provide matchmaking with players of similar skill levels</li>
              <li>To display your statistics and rankings</li>
              <li>To send password reset emails when requested</li>
              <li>To show relevant advertisements (unless you purchase ad removal)</li>
              <li>To improve our game and services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Multiplayer & Matchmaking</h2>
            <p>When you play multiplayer games, other players can see your username, skill rating, and gameplay actions during the match. We use your rating to match you with players of similar skill levels for fair and competitive games.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Advertising</h2>
            <p className="mb-3">House Spades displays advertisements to support free gameplay. We work with advertising partners who may collect device identifiers to show relevant ads.</p>
            <p>On iOS devices, we will request your permission before tracking your activity for personalized ads (App Tracking Transparency). You can decline and still use the app with non-personalized ads.</p>
            <p className="mt-3">You can remove all advertisements by purchasing the "Remove Ads" option for $5.99 in our shop.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. If you delete your account, we will permanently remove your personal data within 30 days, though anonymized gameplay statistics may be retained for analytical purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Delete your account and associated data (available in Settings)</li>
              <li>Opt out of personalized advertising</li>
              <li>Request a copy of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Security</h2>
            <p>We use industry-standard security measures including encrypted passwords (bcrypt hashing) and secure HTTPS connections to protect your data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
            <p>House Spades is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify you of significant changes through the app or via email.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p>If you have questions about this privacy policy or your data, please contact us at:</p>
            <p className="mt-2"><strong>Email:</strong> privacy@housespades.com</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t text-center">
          <Link href="/terms" className="text-primary hover:underline">
            View Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
