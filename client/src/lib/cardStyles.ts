import cardBacksFronts from "@/assets/card-backs-fronts.png";
import basicCard from "@/assets/basic-card.png";

export interface CardStyle {
  id: string;
  name: string;
  spriteSheet: string;
  backPosition: { x: number; y: number; width: number; height: number };
  frontPosition?: { x: number; y: number; width: number; height: number };
  hasCustomFront: boolean;
}

const CARD_WIDTH = 256;
const CARD_HEIGHT = 358;
const BASIC_CARD_WIDTH = 400;
const BASIC_CARD_HEIGHT = 560;

export const CARD_STYLES: CardStyle[] = [
  {
    id: "classic",
    name: "Classic Red",
    spriteSheet: basicCard,
    backPosition: { x: 0, y: 0, width: BASIC_CARD_WIDTH, height: BASIC_CARD_HEIGHT },
    frontPosition: { x: BASIC_CARD_WIDTH, y: 0, width: BASIC_CARD_WIDTH, height: BASIC_CARD_HEIGHT },
    hasCustomFront: true,
  },
  {
    id: "green_spade",
    name: "Green Spade",
    spriteSheet: cardBacksFronts,
    backPosition: { x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
    hasCustomFront: false,
  },
  {
    id: "royal_crest",
    name: "Royal Crest",
    spriteSheet: cardBacksFronts,
    backPosition: { x: CARD_WIDTH, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
    hasCustomFront: false,
  },
  {
    id: "cream_ornate",
    name: "Cream Ornate",
    spriteSheet: cardBacksFronts,
    backPosition: { x: CARD_WIDTH * 2, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
    hasCustomFront: true,
    frontPosition: { x: CARD_WIDTH * 2, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
  },
  {
    id: "blue_starry",
    name: "Blue Starry",
    spriteSheet: cardBacksFronts,
    backPosition: { x: CARD_WIDTH * 3, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
    hasCustomFront: false,
  },
  {
    id: "purple_cosmic",
    name: "Purple Cosmic",
    spriteSheet: cardBacksFronts,
    backPosition: { x: 0, y: CARD_HEIGHT, width: CARD_WIDTH, height: CARD_HEIGHT },
    hasCustomFront: false,
  },
  {
    id: "green_pentacle",
    name: "Green Pentacle",
    spriteSheet: cardBacksFronts,
    backPosition: { x: CARD_WIDTH, y: CARD_HEIGHT, width: CARD_WIDTH, height: CARD_HEIGHT },
    hasCustomFront: false,
  },
  {
    id: "green_cloudy",
    name: "Green Cloudy",
    spriteSheet: cardBacksFronts,
    backPosition: { x: CARD_WIDTH * 2, y: CARD_HEIGHT, width: CARD_WIDTH, height: CARD_HEIGHT },
    hasCustomFront: true,
    frontPosition: { x: CARD_WIDTH * 2, y: CARD_HEIGHT, width: CARD_WIDTH, height: CARD_HEIGHT },
  },
  {
    id: "blue_sky",
    name: "Blue Sky",
    spriteSheet: cardBacksFronts,
    backPosition: { x: CARD_WIDTH * 3, y: CARD_HEIGHT, width: CARD_WIDTH, height: CARD_HEIGHT },
    hasCustomFront: true,
    frontPosition: { x: CARD_WIDTH * 3, y: CARD_HEIGHT, width: CARD_WIDTH, height: CARD_HEIGHT },
  },
];

const STORAGE_KEY = "housespades_card_style";

export function getSelectedCardStyle(): CardStyle {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const style = CARD_STYLES.find(s => s.id === stored);
    if (style) return style;
  }
  return CARD_STYLES[0];
}

export function setSelectedCardStyle(styleId: string): void {
  localStorage.setItem(STORAGE_KEY, styleId);
}

export function getCardStyleById(id: string): CardStyle | undefined {
  return CARD_STYLES.find(s => s.id === id);
}
