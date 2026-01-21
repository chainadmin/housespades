import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { 
  InterstitialAd, 
  AdEventType,
  TestIds
} from 'react-native-google-mobile-ads';
import { useIAP } from './useIAP';
import { useATT } from './useATT';

const INTERSTITIAL_AD_UNIT_ID = __DEV__ 
  ? TestIds.INTERSTITIAL 
  : Platform.select({
      ios: 'ca-app-pub-1580761947831808/8594757928',
      android: 'ca-app-pub-1580761947831808/3258670768',
    }) || TestIds.INTERSTITIAL;

export const BANNER_AD_UNIT_ID = __DEV__ 
  ? TestIds.BANNER 
  : Platform.select({
      ios: 'ca-app-pub-1580761947831808/4571752434',
      android: 'ca-app-pub-1580761947831808/2983516207',
    }) || TestIds.BANNER;

const GAMES_BEFORE_AD = 1;

interface UseAdsReturn {
  showInterstitialAd: () => Promise<boolean>;
  isAdLoaded: boolean;
  isAdLoading: boolean;
  shouldShowAd: boolean;
  recordGameCompleted: () => void;
  recordGameAbandoned: () => void;
  gamesPlayed: number;
  bannerAdUnitId: string;
  hasRemoveAds: boolean;
  isTrackingAllowed: boolean;
}

export function useAds(): UseAdsReturn {
  const { hasRemoveAds } = useIAP();
  const { isTrackingAllowed, requestTracking, canRequestTracking } = useATT();
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const pendingShowRef = useRef(false);
  const pendingResolveRef = useRef<((value: boolean) => void) | null>(null);

  useEffect(() => {
    if (hasRemoveAds) return;
    loadAd();
    return () => {
      if (interstitialRef.current) {
        interstitialRef.current.removeAllListeners();
      }
      pendingShowRef.current = false;
      pendingResolveRef.current = null;
    };
  }, [hasRemoveAds]);

  const loadAd = useCallback(async () => {
    if (hasRemoveAds || isAdLoading || isAdLoaded) {
      console.log('[Ads] Skip load - hasRemoveAds:', hasRemoveAds, 'isAdLoading:', isAdLoading, 'isAdLoaded:', isAdLoaded);
      return;
    }

    if (canRequestTracking) {
      console.log('[Ads] Requesting tracking permission...');
      await requestTracking();
    }

    setIsAdLoading(true);
    console.log('[Ads] Loading interstitial ad with unit ID:', INTERSTITIAL_AD_UNIT_ID);
    console.log('[Ads] Platform:', Platform.OS, '| Tracking allowed:', isTrackingAllowed);

    try {
      const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: !isTrackingAllowed,
        keywords: ['game', 'cards', 'family', 'puzzle'],
      });

      interstitialRef.current = interstitial;

      interstitial.addAdEventListener(AdEventType.LOADED, async () => {
        console.log('[Ads] Interstitial ad loaded successfully');
        setIsAdLoaded(true);
        setIsAdLoading(false);
        
        if (pendingShowRef.current && interstitialRef.current) {
          console.log('[Ads] Pending show detected, showing ad now');
          pendingShowRef.current = false;
          try {
            await interstitialRef.current.show();
            if (pendingResolveRef.current) {
              pendingResolveRef.current(true);
              pendingResolveRef.current = null;
            }
          } catch (err) {
            console.error('[Ads] Failed to show pending ad:', err);
            if (pendingResolveRef.current) {
              pendingResolveRef.current(false);
              pendingResolveRef.current = null;
            }
          }
        }
      });

      interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('[Ads] Interstitial ad failed to load:', error);
        setIsAdLoading(false);
        if (pendingShowRef.current) {
          pendingShowRef.current = false;
          if (pendingResolveRef.current) {
            pendingResolveRef.current(false);
            pendingResolveRef.current = null;
          }
        }
        setTimeout(() => loadAd(), 60000);
      });

      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[Ads] Interstitial ad closed');
        setIsAdLoaded(false);
        loadAd();
      });

      await interstitial.load();
    } catch (err) {
      console.error('[Ads] Failed to create interstitial ad:', err);
      setIsAdLoading(false);
    }
  }, [hasRemoveAds, isAdLoading, isAdLoaded, isTrackingAllowed, canRequestTracking, requestTracking]);

  const showInterstitialAd = useCallback(async (): Promise<boolean> => {
    if (hasRemoveAds) return false;
    
    if (!isAdLoaded || !interstitialRef.current) {
      console.log('[Ads] Ad not loaded, setting pending show flag');
      pendingShowRef.current = true;
      loadAd();
      return new Promise((resolve) => {
        pendingResolveRef.current = resolve;
        setTimeout(() => {
          if (pendingShowRef.current) {
            console.log('[Ads] Pending show timed out after 5s');
            pendingShowRef.current = false;
            pendingResolveRef.current = null;
            resolve(false);
          }
        }, 5000);
      });
    }

    try {
      await interstitialRef.current.show();
      return true;
    } catch (err) {
      console.error('Failed to show ad:', err);
      loadAd();
      return false;
    }
  }, [hasRemoveAds, isAdLoaded, loadAd]);

  const recordGameCompleted = useCallback(() => {
    setGamesPlayed((prev) => prev + 1);
  }, []);

  const recordGameAbandoned = useCallback(async () => {
    if (hasRemoveAds) return;
    await showInterstitialAd();
  }, [hasRemoveAds, showInterstitialAd]);

  // Show ad after every GAMES_BEFORE_AD games (including first game completion)
  // gamesPlayed is incremented BEFORE this is checked in the game screen
  const shouldShowAd = !hasRemoveAds && gamesPlayed >= GAMES_BEFORE_AD;

  return {
    showInterstitialAd,
    isAdLoaded,
    isAdLoading,
    shouldShowAd,
    recordGameCompleted,
    recordGameAbandoned,
    gamesPlayed,
    bannerAdUnitId: BANNER_AD_UNIT_ID,
    hasRemoveAds,
    isTrackingAllowed,
  };
}
