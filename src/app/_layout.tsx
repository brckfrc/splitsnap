import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider, Theme } from 'tamagui';

import { AppToast } from '@/components/app-toast';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { storeHydrated } from '@/stores/split-data-store';
import { tamaguiConfig } from '../../tamagui.config';

SplashScreen.preventAutoHideAsync().catch(() => {});

function SplashGate() {
  const { initializing } = useAuth();

  useEffect(() => {
    if (!initializing) {
      // Wait for MMKV store rehydration before hiding splash
      storeHydrated.then(() => {
        SplashScreen.hideAsync().catch(() => {});
      });
    }
  }, [initializing]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  });

  const scheme = useColorScheme();
  const themeName = (scheme === 'dark' || scheme === 'light') ? scheme : 'light';

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={themeName}>
      <Theme name={themeName}>
        <SafeAreaProvider>
          <AuthProvider>
            <SplashGate />
            <NavigationThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack screenOptions={{ headerShown: false }} />
              <AppToast />
            </NavigationThemeProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </Theme>
    </TamaguiProvider>
  );
}
