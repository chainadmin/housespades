import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { PurchasesPackage, PURCHASES_ERROR_CODE } from 'react-native-purchases';
import { authenticatedFetch, getStoredUser, refreshUserFromServer } from '@/lib/auth';

// Product identifiers for the one-time "Remove Ads" purchase. These must
// match the products configured in RevenueCat (and the linked
// App Store Connect / Google Play Console products).
export const REMOVE_ADS_PRODUCT_IDS = ['remove_ads', 'com.housespades.remove_ads'];

function getRevenueCatPublicKey(): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;
  const fromExtra = Platform.OS === 'ios'
    ? extra.revenueCatAppleApiKey
    : extra.revenueCatGoogleApiKey;
  const fromEnv = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY;
  return fromEnv || fromExtra || undefined;
}

let configuredForUserId: string | null = null;

/**
 * Configure the RevenueCat SDK for the currently logged-in user.
 * The RevenueCat app user ID is our server-side user id, which lets the
 * server verify entitlements server-to-server without trusting the client.
 */
async function ensurePurchasesConfigured(): Promise<void> {
  const user = await getStoredUser();
  if (!user) {
    throw new Error('You must be signed in to make purchases.');
  }
  const appUserId = String(user.id);
  if (configuredForUserId === appUserId) return;

  const apiKey = getRevenueCatPublicKey();
  if (!apiKey) {
    throw new Error('Purchases are not available in this build.');
  }

  if (configuredForUserId === null) {
    Purchases.configure({ apiKey, appUserID: appUserId });
  } else {
    await Purchases.logIn(appUserId);
  }
  configuredForUserId = appUserId;
}

function findRemoveAdsPackage(packages: PurchasesPackage[]): PurchasesPackage | undefined {
  return packages.find(pkg => REMOVE_ADS_PRODUCT_IDS.includes(pkg.product.identifier))
    ?? packages.find(pkg => pkg.packageType === 'LIFETIME');
}

/**
 * After a purchase or restore, ask our server to verify the receipt with
 * RevenueCat and grant the remove_ads entitlement on the account.
 */
async function verifyWithServer(productId: string): Promise<boolean> {
  const response = await authenticatedFetch('/api/purchase/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      productId,
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Purchase verification failed.');
  }
  // Refresh the stored user so hasRemoveAds propagates everywhere
  await refreshUserFromServer();
  return true;
}

interface UsePurchasesReturn {
  purchaseRemoveAds: () => Promise<{ success: boolean; message: string; cancelled?: boolean }>;
  restorePurchases: () => Promise<{ success: boolean; message: string }>;
  isPurchasing: boolean;
  isRestoring: boolean;
}

export function usePurchases(): UsePurchasesReturn {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const purchaseRemoveAds = useCallback(async () => {
    if (isPurchasing) return { success: false, message: 'Purchase already in progress.' };
    setIsPurchasing(true);
    try {
      await ensurePurchasesConfigured();

      const offerings = await Purchases.getOfferings();
      const packages = offerings.current?.availablePackages ?? [];
      const pkg = findRemoveAdsPackage(packages);
      if (!pkg) {
        return { success: false, message: 'Remove Ads is not available right now. Please try again later.' };
      }

      await Purchases.purchasePackage(pkg);
      await verifyWithServer(pkg.product.identifier);
      return { success: true, message: 'Ads removed! Thanks for your support.' };
    } catch (err: any) {
      if (err?.userCancelled || err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return { success: false, cancelled: true, message: 'Purchase cancelled.' };
      }
      if (__DEV__) console.error('[Purchases] Purchase failed:', err);
      return { success: false, message: err?.message || 'Purchase failed. Please try again.' };
    } finally {
      setIsPurchasing(false);
    }
  }, [isPurchasing]);

  const restorePurchases = useCallback(async () => {
    if (isRestoring) return { success: false, message: 'Restore already in progress.' };
    setIsRestoring(true);
    try {
      await ensurePurchasesConfigured();
      await Purchases.restorePurchases();
      await verifyWithServer(REMOVE_ADS_PRODUCT_IDS[0]);
      return { success: true, message: 'Purchases restored. Ads are now removed.' };
    } catch (err: any) {
      if (__DEV__) console.error('[Purchases] Restore failed:', err);
      return { success: false, message: err?.message || 'No previous purchase found for this account.' };
    } finally {
      setIsRestoring(false);
    }
  }, [isRestoring]);

  return { purchaseRemoveAds, restorePurchases, isPurchasing, isRestoring };
}
