import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

interface UseIAPReturn {
  isLoading: boolean;
  hasRemoveAds: boolean;
  purchaseRemoveAds: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  error: string | null;
}

export function useIAP(): UseIAPReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [hasRemoveAds, setHasRemoveAds] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseRemoveAds = useCallback(async (): Promise<boolean> => {
    Alert.alert(
      'Coming Soon',
      'The option to remove ads will be available in a future update.'
    );
    return false;
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    Alert.alert(
      'Coming Soon',
      'Purchase restoration will be available in a future update.'
    );
    return false;
  }, []);

  return {
    isLoading,
    hasRemoveAds,
    purchaseRemoveAds,
    restorePurchases,
    error,
  };
}
