// Server-side purchase verification via the RevenueCat REST API.
//
// The mobile app performs purchases through the RevenueCat SDK
// (react-native-purchases) with the app user ID set to the House Spades
// user id. To verify a purchase we never trust the client: we ask
// RevenueCat's servers (which validate receipts with Apple / Google)
// whether the "remove_ads" entitlement is active for that user.

const REVENUECAT_API_BASE = "https://api.revenuecat.com/v1";

export const REMOVE_ADS_ENTITLEMENT = "remove_ads";
export const REMOVE_ADS_PRODUCT_IDS = ["remove_ads", "com.housespades.remove_ads"];

function getRevenueCatApiKey(platform: string): string | undefined {
  // Prefer a dedicated secret key if configured; otherwise fall back to the
  // per-platform keys. RevenueCat's GET /subscribers endpoint accepts both
  // secret and platform SDK keys.
  if (process.env.REVENUECAT_SECRET_API_KEY) {
    return process.env.REVENUECAT_SECRET_API_KEY;
  }
  if (platform === "ios") {
    return process.env.IOS_RevenueCat_API_KEY || process.env.Test_SDK_revcat;
  }
  if (platform === "android") {
    return process.env.Google_RevenueCat_API_KEY || process.env.Test_SDK_revcat;
  }
  return process.env.Test_SDK_revcat;
}

interface VerificationResult {
  ok: boolean;
  entitled: boolean;
  error?: string;
  status?: number;
}

/**
 * Ask RevenueCat whether the given app user currently owns the
 * remove_ads entitlement (or one of the remove-ads products).
 */
export async function verifyRemoveAdsWithRevenueCat(
  appUserId: string,
  platform: string,
): Promise<VerificationResult> {
  const apiKey = getRevenueCatApiKey(platform);
  if (!apiKey) {
    return { ok: false, entitled: false, error: "Receipt validation is not configured", status: 503 };
  }

  let response: Response;
  try {
    response = await fetch(
      `${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    console.error("[Purchases] RevenueCat request failed:", err);
    return { ok: false, entitled: false, error: "Could not reach receipt validation service", status: 502 };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`[Purchases] RevenueCat responded ${response.status}: ${body.slice(0, 500)}`);
    return { ok: false, entitled: false, error: "Receipt validation failed", status: 502 };
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { ok: false, entitled: false, error: "Invalid response from validation service", status: 502 };
  }

  const subscriber = data?.subscriber;
  if (!subscriber) {
    return { ok: true, entitled: false };
  }

  // 1) Entitlement check (preferred): active if no expiry (lifetime) or
  //    expiry in the future.
  const entitlement = subscriber.entitlements?.[REMOVE_ADS_ENTITLEMENT];
  if (entitlement) {
    const expires = entitlement.expires_date;
    if (!expires || new Date(expires).getTime() > Date.now()) {
      return { ok: true, entitled: true };
    }
  }

  // 2) Fallback: non-subscription (one-time) purchase of a remove-ads product.
  const nonSubs = subscriber.non_subscriptions ?? {};
  for (const productId of Object.keys(nonSubs)) {
    if (REMOVE_ADS_PRODUCT_IDS.includes(productId)) {
      const purchases = nonSubs[productId];
      if (Array.isArray(purchases) && purchases.length > 0) {
        return { ok: true, entitled: true };
      }
    }
  }

  return { ok: true, entitled: false };
}
