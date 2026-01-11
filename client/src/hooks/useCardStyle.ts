import { useState, useEffect, useCallback } from "react";
import { CARD_STYLES, getSelectedCardStyle, setSelectedCardStyle, type CardStyle } from "@/lib/cardStyles";

export function useCardStyle() {
  const [currentStyle, setCurrentStyle] = useState<CardStyle>(getSelectedCardStyle);

  useEffect(() => {
    const handleStorage = () => {
      setCurrentStyle(getSelectedCardStyle());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const selectStyle = useCallback((styleId: string) => {
    const style = CARD_STYLES.find(s => s.id === styleId);
    if (style) {
      setSelectedCardStyle(styleId);
      setCurrentStyle(style);
    }
  }, []);

  return {
    currentStyle,
    allStyles: CARD_STYLES,
    selectStyle,
  };
}
