# Draft Resolution Center reply (Guideline 5.6)

Copy/adjust the text below and send it in App Store Connect → Resolution Center before or alongside resubmitting.

---

Hello App Review team,

Thank you for the feedback. We want to be clear that House Spades contains no features that are hidden, gated, or conditional on the review process — the binary behaves identically for reviewers and for all users. There is no review detection, remote configuration, dynamic code loading, or hidden functionality of any kind.

After investigating what could have appeared misleading, we identified that our computer opponents ("bots") were shown with human-like names and no visible indication that they were computer-controlled. We agree this could look like undisclosed behavior, and we have fixed it in this build (v2.1.3, build 44):

1. Every computer-controlled player now displays a visible "BOT" badge next to their name, in both offline solo play and online multiplayer.
2. The matchmaking screen now discloses up front that empty seats are filled with computer players (labeled "BOT") after about 10 seconds if no human opponents are available.
3. If a human player disconnects mid-game, a bot takes over their seat: the seat keeps the original player's name and gains the "BOT" badge so all players can see exactly what happened.
4. The online turn timer is now escalated transparently: a player who misses two consecutive 60-second turns has their seat handed to a bot, which is immediately shown with the "BOT" badge.
5. We disabled the in-app purchase endpoint entirely — the app currently sells nothing and grants no entitlements. Ads use AdMob family-safe settings with an in-context App Tracking Transparency prompt.

There is no gambling, wagering, or real-money play — points are standard Spades score targets.

We would welcome any additional specifics about the behavior that was flagged so we can address it directly. We take the Developer Code of Conduct seriously and have made every automated behavior in the app explicit and visible to users.

Thank you for your time and consideration.

---

Notes for you (not part of the reply):
- If this app/account was previously locked under 5.6 and this is a resubmission under a new app record, Apple may be flagging the account/app history itself. If the rejection persists after these changes, address that history head-on in a follow-up reply or via an appeal to the App Review Board, explaining why the new submission exists and what changed.
- Bump handled: this build is v2.1.3 / iOS build 44 / Android versionCode 40.
