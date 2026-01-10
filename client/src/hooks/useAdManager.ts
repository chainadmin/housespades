import { useState, useEffect, useCallback } from "react";

const GAMES_BEFORE_AD = 2;
const STORAGE_KEY = "housespades_games_since_ad";

export function useAdManager(removeAds: boolean = false) {
  const [gamesSinceAd, setGamesSinceAd] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });
  const [showInterstitial, setShowInterstitial] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, gamesSinceAd.toString());
  }, [gamesSinceAd]);

  const onGameComplete = useCallback(() => {
    if (removeAds) return;

    const newCount = gamesSinceAd + 1;
    setGamesSinceAd(newCount);

    if (newCount >= GAMES_BEFORE_AD) {
      setShowInterstitial(true);
      setGamesSinceAd(0);
    }
  }, [gamesSinceAd, removeAds]);

  const closeInterstitial = useCallback(() => {
    setShowInterstitial(false);
  }, []);

  return {
    showInterstitial: !removeAds && showInterstitial,
    showBanner: !removeAds,
    onGameComplete,
    closeInterstitial,
    gamesUntilAd: GAMES_BEFORE_AD - gamesSinceAd,
  };
}
