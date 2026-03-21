import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider, Theme } from 'tamagui';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { tamaguiConfig } from '../../tamagui.config';

SplashScreen.preventAutoHideAsync().catch(() => {});

function SplashGate() {
  const { initializing } = useAuth();

  useEffect(() => {
    if (!initializing) {
      SplashScreen.hideAsync().catch(() => {});
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
  const themeName = scheme === 'dark' ? 'dark' : 'light';

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
            </NavigationThemeProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </Theme>
    </TamaguiProvider>
  );
}
