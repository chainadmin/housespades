---
name: RevenueCat server-side verification
description: How server-to-server RevenueCat receipt checks work here and the key/header pitfalls
---

- Entitlements are granted only after the server queries RevenueCat GET /v1/subscribers/{appUserId} (app user id = our DB user id). Never trust client receipts.
- **Pitfall:** sending an `X-Platform` header with a secret (`sk_`) key makes RevenueCat return 403 code 7243 ("Secret API keys should not be used in your app"). Omit `X-Platform` for server calls.
- The `sk_` keys stored in workspace secrets are server-only; the mobile SDK needs public `appl_`/`goog_` keys embedded at build time (app.json extra or EXPO_PUBLIC env), which the owner must supply from the RevenueCat dashboard.
- GET /subscribers auto-creates the subscriber if missing, so an "entitlement not found" result is the normal no-purchase path (402), not an error.
