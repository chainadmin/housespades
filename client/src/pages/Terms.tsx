import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
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

        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 2026</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>By downloading, accessing, or using House Spades ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Account Registration</h2>
            <p className="mb-3">To use certain features of the App, you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized account use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Game Rules & Fair Play</h2>
            <p className="mb-3">House Spades offers card game experiences. By playing, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Play fairly and not use cheats, hacks, or exploits</li>
              <li>Not use automation or bots to play on your behalf</li>
              <li>Accept the outcomes of games, including wins and losses</li>
              <li>Respect the ranking system and not manipulate your rating</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. User Conduct</h2>
            <p className="mb-3">When interacting with other players, you agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Harass, abuse, or threaten other players</li>
              <li>Use offensive, discriminatory, or inappropriate usernames</li>
              <li>Intentionally disconnect or abandon games to avoid losses</li>
              <li>Collude with other players to manipulate game outcomes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. In-App Purchases</h2>
            <p className="mb-3">House Spades offers optional in-app purchases:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Remove Ads ($5.99):</strong> A one-time purchase that permanently removes advertisements from your account</li>
            </ul>
            <p className="mt-3">All purchases are processed through Apple App Store or Google Play Store. Refunds are subject to the respective store's refund policies. Purchases are tied to your account and cannot be transferred.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Intellectual Property</h2>
            <p>All content in House Spades, including graphics, logos, and game mechanics, is owned by Chain Software Group or its licensors. You may not copy, modify, or distribute any content without permission.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Disclaimer of Warranties</h2>
            <p>The App is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service, error-free gameplay, or specific matchmaking outcomes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Chain Software Group shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Account Termination</h2>
            <p className="mb-3">We reserve the right to suspend or terminate accounts that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate these Terms of Service</li>
              <li>Engage in cheating or unfair play</li>
              <li>Harass other players</li>
              <li>Attempt to exploit the App or its systems</li>
            </ul>
            <p className="mt-3">You may delete your own account at any time through the Settings menu.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of the App after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Governing Law</h2>
            <p>These terms are governed by applicable laws. Any disputes shall be resolved through binding arbitration.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
            <p>For questions about these terms, please contact us at:</p>
            <p className="mt-2"><strong>Email:</strong> support@housespades.com</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t text-center">
          <Link href="/privacy" className="text-primary hover:underline">
            View Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
