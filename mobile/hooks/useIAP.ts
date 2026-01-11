import { useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { 
  PurchasesPackage, 
  CustomerInfo,
  LOG_LEVEL 
} from 'react-native-purchases';
import Constants from 'expo-constants';

const REMOVE_ADS_PRODUCT_ID = 'remove_ads';
const ENTITLEMENT_ID = 'remove_ads';

interface UseIAPReturn {
  isLoading: boolean;
  hasRemoveAds: boolean;
  packages: PurchasesPackage[];
  purchaseRemoveAds: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  error: string | null;
}

export function useIAP(): UseIAPReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [hasRemoveAds, setHasRemoveAds] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializePurchases();
  }, []);

  const initializePurchases = async () => {
    try {
      const apiKey = Platform.select({
        ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
        android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
      });

      if (!apiKey) {
        console.log('RevenueCat API key not configured - set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY or EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY');
        setIsLoading(false);
        return;
      }

      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      await Purchases.configure({ apiKey });

      await checkEntitlements();
      await fetchPackages();
    } catch (err) {
      console.error('Failed to initialize purchases:', err);
      setError('Failed to initialize in-app purchases');
    } finally {
      setIsLoading(false);
    }
  };

  const checkEntitlements = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setHasRemoveAds(hasEntitlement);
    } catch (err) {
      console.error('Failed to check entitlements:', err);
    }
  };

  const fetchPackages = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    }
  };

  const purchaseRemoveAds = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const removeAdsPackage = packages.find(
        (pkg) => pkg.product.identifier === REMOVE_ADS_PRODUCT_ID
      );

      if (!removeAdsPackage) {
        const offerings = await Purchases.getOfferings();
        const pkg = offerings.current?.availablePackages.find(
          (p) => p.product.identifier === REMOVE_ADS_PRODUCT_ID
        );
        
        if (!pkg) {
          throw new Error('Remove ads package not found');
        }

        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
        setHasRemoveAds(hasEntitlement);
        return hasEntitlement;
      }

      const { customerInfo } = await Purchases.purchasePackage(removeAdsPackage);
      const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setHasRemoveAds(hasEntitlement);
      return hasEntitlement;
    } catch (err: any) {
      if (err.userCancelled) {
        return false;
      }
      console.error('Purchase failed:', err);
      setError(err.message || 'Purchase failed');
      Alert.alert('Purchase Failed', err.message || 'Unable to complete purchase. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [packages]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setHasRemoveAds(hasEntitlement);
      
      if (hasEntitlement) {
        Alert.alert('Success', 'Your purchases have been restored.');
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
      
      return hasEntitlement;
    } catch (err: any) {
      console.error('Restore failed:', err);
      setError(err.message || 'Restore failed');
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    hasRemoveAds,
    packages,
    purchaseRemoveAds,
    restorePurchases,
    error,
  };
}
