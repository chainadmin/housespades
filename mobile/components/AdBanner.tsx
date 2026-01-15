import { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID } from '@/hooks/useAds';

interface AdBannerProps {
  size?: BannerAdSize;
  hasRemoveAds?: boolean;
  isTrackingAllowed?: boolean;
}

export function AdBanner({ 
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
  hasRemoveAds = false,
  isTrackingAllowed = false
}: AdBannerProps) {
  useEffect(() => {
    console.log('[AdBanner] Mounting with:', {
      hasRemoveAds,
      isTrackingAllowed,
      adUnitId: BANNER_AD_UNIT_ID,
      platform: Platform.OS,
    });
  }, [hasRemoveAds, isTrackingAllowed]);

  if (hasRemoveAds) {
    console.log('[AdBanner] Not showing - user has removeAds');
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: !isTrackingAllowed,
        }}
        onAdLoaded={() => {
          console.log('[AdBanner] Ad loaded successfully');
        }}
        onAdFailedToLoad={(error: any) => {
          console.error('[AdBanner] Ad failed to load:', error?.code || 'unknown', error?.message || error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
