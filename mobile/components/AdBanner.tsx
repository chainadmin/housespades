import { useState, useRef } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { BannerAd, BannerAdSize, useForeground } from 'react-native-google-mobile-ads';
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
  const bannerRef = useRef<BannerAd>(null);

  // iOS: Reload ad when app returns to foreground (fixes blank ad issue)
  useForeground(() => {
    if (Platform.OS === 'ios' && bannerRef.current) {
      bannerRef.current.load();
    }
  });

  if (hasRemoveAds) {
    return null;
  }

  // If banner failed, don't show anything (avoid broken UI)
  if (adError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        ref={bannerRef}
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: !isTrackingAllowed,
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded successfully');
          setAdError(false);
        }}
        onAdFailedToLoad={(error) => {
          console.error('Banner ad failed to load:', error);
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
