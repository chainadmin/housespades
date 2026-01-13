import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, Image } from 'react-native';
import { useColorScheme, useColors } from '@/hooks/useColorScheme';
import { apiUrl } from '@/config/api';

SplashScreen.preventAutoHideAsync();

const logoImage = require('@/assets/house-card-logo.png');

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = useColors();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(apiUrl('/api/user/profile'), {
        credentials: 'include',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      setIsAuthenticated(response.ok);
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setIsReady(true);
      SplashScreen.hideAsync();
    }
  };

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'auth';

    // Only redirect if we're in the wrong place for current auth state
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [isAuthenticated, isReady]);

  if (!isReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ 
            flex: 1, 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: colorScheme === 'dark' ? '#121212' : '#ffffff',
          }}>
            <Image source={logoImage} style={{ width: 100, height: 100, opacity: 0.6 }} resizeMode="contain" />
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
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
