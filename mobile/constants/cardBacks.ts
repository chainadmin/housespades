import type { ImageSourcePropType } from 'react-native';

export type CardBackAssetId =
  | 'house-spades'
  | 'ruby-red'
  | 'midnight-black'
  | 'galaxy'
  | 'vintage-ivory'
  | 'smoke-steel'
  | 'purple-royal'
  | 'emerald-green'
  | 'royal-blue'
  | 'sunset-gold'
  | 'ocean-wave';

export interface CardBackAsset {
  id: CardBackAssetId;
  name: string;
  source: ImageSourcePropType;
}

/**
 * Bundled card-back artwork reserved for future use.
 *
 * This catalog intentionally is not connected to gameplay or settings yet.
 * The static require calls ensure every design is included in native bundles.
 */
export const CARD_BACK_ASSETS: readonly CardBackAsset[] = [
  {
    id: 'house-spades',
    name: 'House Spades',
    source: require('../assets/card-backs/house-spades.svg'),
  },
  {
    id: 'ruby-red',
    name: 'Ruby Red',
    source: require('../assets/card-backs/ruby-red.svg'),
  },
  {
    id: 'midnight-black',
    name: 'Midnight Black',
    source: require('../assets/card-backs/midnight-black.svg'),
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    source: require('../assets/card-backs/galaxy.svg'),
  },
  {
    id: 'vintage-ivory',
    name: 'Vintage Ivory',
    source: require('../assets/card-backs/vintage-ivory.svg'),
  },
  {
    id: 'smoke-steel',
    name: 'Smoke Steel',
    source: require('../assets/card-backs/smoke-steel.svg'),
  },
  {
    id: 'purple-royal',
    name: 'Purple Royal',
    source: require('../assets/card-backs/purple-royal.svg'),
  },
  {
    id: 'emerald-green',
    name: 'Emerald Green',
    source: require('../assets/card-backs/emerald-green.svg'),
  },
  {
    id: 'royal-blue',
    name: 'Royal Blue',
    source: require('../assets/card-backs/royal-blue.svg'),
  },
  {
    id: 'sunset-gold',
    name: 'Sunset Gold',
    source: require('../assets/card-backs/sunset-gold.svg'),
  },
  {
    id: 'ocean-wave',
    name: 'Ocean Wave',
    source: require('../assets/card-backs/ocean-wave.svg'),
  },
];