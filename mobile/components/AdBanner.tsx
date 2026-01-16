import { useState } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID } from '@/hooks/useAds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AdBannerProps {
  hasRemoveAds?: boolean;
  isTrackingAllowed?: boolean;
}

export function AdBanner({ 
  hasRemoveAds = false,
  isTrackingAllowed = false
}: AdBannerProps) {
  const [adError, setAdError] = useState(false);

  if (hasRemoveAds) {
    return null;
  }

  // If adaptive banner failed, don't show anything (avoid broken UI)
  if (adError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: !isTrackingAllowed,
        }}
        onAdLoaded={() => {
          setAdError(false);
        }}
        onAdFailedToLoad={() => {
          setAdError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
