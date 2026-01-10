import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdBannerProps {
  onClose?: () => void;
  type?: "banner" | "interstitial";
}

export function AdBanner({ onClose, type = "banner" }: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState(type === "interstitial" ? 5 : 0);

  useEffect(() => {
    if (type === "interstitial" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, type]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  if (type === "interstitial") {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        data-testid="ad-interstitial"
      >
        <div className="bg-card border rounded-lg p-6 max-w-md w-full mx-4 text-center">
          <div className="flex justify-end mb-2">
            {countdown > 0 ? (
              <span className="text-sm text-muted-foreground" data-testid="text-ad-countdown">
                Skip in {countdown}s
              </span>
            ) : (
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={handleClose}
                data-testid="button-close-ad"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div 
            className="bg-muted rounded-lg h-64 flex items-center justify-center mb-4"
            data-testid="ad-placeholder-interstitial"
          >
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">Advertisement</p>
              <p className="text-sm mt-2">AdMob will display here</p>
              <p className="text-xs mt-1 opacity-60">Interstitial Ad Slot</p>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Remove ads for $5.99 in Settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-muted border-t p-2 flex items-center justify-center"
      data-testid="ad-banner"
    >
      <div 
        className="bg-card rounded h-16 w-full max-w-md flex items-center justify-center"
        data-testid="ad-placeholder-banner"
      >
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Advertisement</p>
          <p className="text-xs opacity-60">AdMob Banner Slot</p>
        </div>
      </div>
    </div>
  );
}
