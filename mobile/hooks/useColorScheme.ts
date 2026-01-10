import { useColorScheme as useRNColorScheme } from 'react-native';
import { Colors, ColorScheme } from '@/constants/colors';

export function useColorScheme(): ColorScheme {
  const colorScheme = useRNColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
}

export function useColors() {
  const colorScheme = useColorScheme();
  return Colors[colorScheme];
}
