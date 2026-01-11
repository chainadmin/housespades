import cardBacksFronts from "@/assets/card-backs-fronts.png";
import basicCard from "@/assets/basic-card.png";

export interface CardStyle {
  id: string;
  name: string;
  spriteSheet: string;
  backPosition: { x: number; y: number; width: number; height: number };
  frontPosition?: { x: number; y: number; width: number; height: number };
  hasCustomFront: boolean;
  columns: number;
  rows: number;
}

const ORNATE_CARD_WIDTH = 384;
const ORNATE_CARD_HEIGHT = 512;
const BASIC_CARD_WIDTH = 768;
const BASIC_CARD_HEIGHT = 1024;

export const CARD_STYLES: CardStyle[] = [
  {
    id: "classic",
    name: "Classic Red",
    spriteSheet: basicCard,
    backPosition: { x: 0, y: 0, width: BASIC_CARD_WIDTH, height: BASIC_CARD_HEIGHT },
    frontPosition: { x: BASIC_CARD_WIDTH, y: 0, width: BASIC_CARD_WIDTH, height: BASIC_CARD_HEIGHT },
    hasCustomFront: true,
    columns: 2,
    rows: 1,
  },
  {
    id: "green_spade",
    name: "Green Spade",
    spriteSheet: cardBacksFronts,
    backPosition: { x: 0, y: 0, width: ORNATE_CARD_WIDTH, height: ORNATE_CARD_HEIGHT },
    hasCustomFront: false,
    columns: 4,
    rows: 2,
  },
  {
    id: "royal_crest",
    name: "Royal Crest",
    spriteSheet: cardBacksFronts,
    backPosition: { x: ORNATE_CARD_WIDTH, y: 0, width: ORNATE_CARD_WIDTH, height: ORNATE_CARD_HEIGHT },
    hasCustomFront: false,
    columns: 4,
    rows: 2,
  },
  {
    id: "cream_ornate",
    name: "Cream Ornate",
    spriteSheet: cardBacksFronts,
    backPosition: { x: ORNATE_CARD_WIDTH * 2, y: 0, width: ORNATE_CARD_WIDTH, height: ORNATE_CARD_HEIGHT },
    hasCustomFront: true,
    frontPosition: { x: ORNATE_CARD_WIDTH * 2, y: 0, width: ORNATE_CARD_WIDTH, height: ORNATE_CARD_HEIGHT },
    columns: 4,
    rows: 2,
  },
  {
    id: "blue_starry",
    name: "Blue Starry",
    spriteSheet: cardBacksFronts,
    backPosition: { x: ORNATE_CARD_WIDTH * 3, y: 0, width: ORNATE_CARD_WIDTH, height: ORNATE_CARD_HEIGHT },
    hasCustomFront: false,
    columns: 4,
    rows: 2,
  },
  {
    id: "purple_cosmic",
    name: "Purple Cosmic",
    spriteSheet: cardBacksFronts,
    backPosition: { x: 0, y: ORNATE_CARD_HEIGHT, width: ORNATE_CARD_WIDTH, height: ORNATE_CARD_HEIGHT },
    hasCustomFront: false,
    columns: 4,
    rows: 2,
  },
  {
    id: "green_pentacle",
    name: "Green Pentacle",
    spriteSheet: cardBacksFronts,
    backPosition: { x: ORNATE_CARD_WIDTH, y: ORNATE_CARD_HEIGHT, width: ORNATE_CARD_WIDTH, height: ORNATE_CARD_HEIGHT },
    hasCustomFront: false,
    columns: 4,
    rows: 2,
  },
  {
    id: "green_cloudy",
    name: "Green Cloudy",
    spriteSheet: cardBacksFronts,
    backPosition: { x: ORNATE_CARD_WIDTH * 2, y: ORNATE_CARD_HEIGHT, width: ORNATE_CARD_WIDTH, height: ORNATE_CARD_HEIGHT },
    hasCustomFront: true,
    frontPosition: { x: ORNATE_CARD_WIDTH * 2, y: ORNATE_CARD_HEIGHT, width: ORNATE_CARD_WIDTH, height: ORNATE_CARD_HEIGHT },
    columns: 4,
    rows: 2,
  },
  {
    id: "blue_sky",
    name: "Blue Sky",
    spriteSheet: cardBacksFronts,
    backPosition: { x: ORNATE_CARD_WIDTH * 3, y: ORNATE_CARD_HEIGHT, width: ORNATE_CARD_WIDTH, height: ORNATE_CARD_HEIGHT },
    hasCustomFront: true,
    frontPosition: { x: ORNATE_CARD_WIDTH * 3, y: ORNATE_CARD_HEIGHT, width: ORNATE_CARD_WIDTH, height: ORNATE_CARD_HEIGHT },
    columns: 4,
    rows: 2,
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
