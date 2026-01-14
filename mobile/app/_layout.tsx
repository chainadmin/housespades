import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, Image, Text } from 'react-native';
import { useColorScheme, useColors } from '@/hooks/useColorScheme';
import { checkAuthStatus, subscribeToAuthState } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

const logoImage = require('@/assets/house-card-logo.png');
const chainLogo = require('@/assets/chain-logo.jpg');

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = useColors();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigationDone = useRef(false);

  useEffect(() => {
    performAuthCheck();
    
    // Subscribe to auth state changes (e.g., when 401 triggers clearAuth)
    const unsubscribe = subscribeToAuthState((authenticated) => {
      setIsAuthenticated(authenticated);
    });
    
    return unsubscribe;
  }, []);

  const performAuthCheck = async () => {
    try {
      // Always check auth status - handles both stored user and cookie scenarios
      const { isAuthenticated: apiAuth } = await checkAuthStatus();
      setIsAuthenticated(apiAuth);
    } catch (err) {
      console.log('Auth check error:', err);
      setIsAuthenticated(false);
    } finally {
      setIsReady(true);
    }
  };

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isReady || isAuthenticated === null) return;

    const inAuthGroup = segments[0] === 'auth';
    const currentPath = '/' + segments.join('/');

    const performNavigation = async () => {
      if (!isAuthenticated && !inAuthGroup) {
        // Not authenticated and not on auth screens - go to login
        await router.replace('/auth/login');
      } else if (isAuthenticated && inAuthGroup) {
        // Authenticated but on auth screens - go to home
        await router.replace('/');
      }
      
      // Hide splash after initial navigation is complete
      if (!navigationDone.current) {
        navigationDone.current = true;
        await SplashScreen.hideAsync();
      }
    };

    performNavigation();
  }, [isAuthenticated, segments.join('/'), isReady]);

  // Show splash while checking auth
  if (!isReady || isAuthenticated === null) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ 
            flex: 1, 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: colorScheme === 'dark' ? '#121212' : '#ffffff',
          }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Image source={logoImage} style={{ width: 128, height: 128, marginBottom: 24 }} resizeMode="contain" />
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.text }}>House Spades</Text>
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
            </View>
            <View style={{ paddingBottom: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>Powered by</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image source={chainLogo} style={{ width: 32, height: 32, borderRadius: 4 }} resizeMode="cover" />
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}>Chain Software Group</Text>
              </View>
            </View>
          </View>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: colorScheme === 'dark' ? '#121212' : '#ffffff',
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/signup" />
          <Stack.Screen name="auth/forgot-password" />
          <Stack.Screen name="game" />
          <Stack.Screen name="matchmaking" />
          <Stack.Screen name="profile" />
        </Stack>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
