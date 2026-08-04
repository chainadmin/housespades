# iOS App Review submission audit

This is a repository audit, not the rejection notice. The exact rejection can only be determined from the Resolution Center message. Use the guideline number and reviewer steps from that message as the source of truth.

## Most likely cause: Guideline 4.2 (Minimum Functionality)

The existing review notes say that a previous submission received a 4.2 rejection. Native implementation details alone do not satisfy 4.2; reviewers evaluate the user-facing product. The strongest response is to make the complete game immediately reviewable:

- Solo play must launch without an account or network and complete a full match.
- Both rule variants, bidding, scoring, tutorial, saved-game resume, haptics, sounds, and result sharing must work in the submitted build.
- Online review must not depend on other live players; the documented bot-fill path must work within the stated time.
- Review notes should describe where the reviewer can find these features, rather than arguing that React Native APIs are unavailable on the web.

## Privacy risk corrected before resubmission: Guidelines 5.1.1 and 5.1.2

The app previously initialized a child-directed/under-age-of-consent AdMob configuration while also automatically requesting App Tracking Transparency permission to personalize ads. That was internally inconsistent and could make the binary, privacy answers, permission prompt, and reviewer notes disagree.

The app now uses non-personalized ad requests only and does not request ATT permission. Before submission:

1. Generate a fresh archive so the old `NSUserTrackingUsageDescription` is not present in the submitted binary.
2. In App Store Connect, make the App Privacy answers match the data actually collected by the current AdMob configuration and server.
3. Confirm that every third-party SDK privacy manifest is included by the release archive and review the Xcode privacy report.
4. Confirm the public privacy policy describes advertising, account data, diagnostics, retention, and deletion accurately.

## Account access risk: Guidelines 2.1 and 5.1.1(v)

- Put a working demo email/username and password in App Review Information. Telling a reviewer to create an account is not a substitute for review credentials when sign-in unlocks features.
- Test the credentials against the production API immediately before submitting and keep that account active throughout review.
- Include concise navigation steps for online play and mention the approximate bot-fill delay.
- Verify in-app account deletion removes the account and associated data, not merely the local session. Also verify the failure message when the production API is unavailable.

## Submission and metadata checks

- Keep the review notes synchronized with the uploaded build number (currently 39) and app version (currently 2.1.0).
- Ensure screenshots show the current native UI and do not include simulator chrome, debug overlays, placeholder content, or features absent from the build.
- Verify the support URL, privacy-policy URL, and terms URL load publicly without authentication.
- Explain any ad placements and ensure interstitials do not interrupt bidding or card play unexpectedly.
- Complete a device smoke test on the smallest supported iPhone and a current iOS release: fresh install, guest solo match, account login, online match, background/resume, result sharing, logout, and account deletion.

## Recommended Resolution Center response

Do not speculate about the rejection. Reply against the exact guideline cited by Apple, state what changed in the new build, and provide numbered reproduction steps. For a repeated 4.2 rejection, request clarification about which user-facing functionality Apple considers insufficient after listing the full offline game loop and online bot-fill test path.
