import { View, StyleSheet } from 'react-native';
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
  if (hasRemoveAds) {
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
        onAdFailedToLoad={(error) => {
          console.error('Banner ad failed to load:', error);
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
