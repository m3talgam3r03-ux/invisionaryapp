// Import dai SOTTOPERCORSI, non dalla radice del pacchetto.
// Importando da '@expo-google-fonts/manrope' finiscono nel bundle tutti e
// sette i pesi — verificato contando i .ttf nella build — perché l'indice li
// richiede tutti e Metro non sa scartare gli asset non usati. Così ne
// arrivano cinque, che sono quelli che l'app disegna davvero.
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/auth';
import { queryClient } from '@/lib/queryClient';
import { useProtectedRoute } from '@/lib/useProtectedRoute';
import { darkColors } from '@/theme';

// Tieni visibile lo splash finché non conosciamo lo stato della sessione.
SplashScreen.preventAutoHideAsync();

// Tema di navigazione DARK-FIRST costruito sui token del brand Invisionary.
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: darkColors.background,
    card: darkColors.surface,
    text: darkColors.text,
    border: darkColors.border,
    primary: darkColors.accent,
    notification: darkColors.accent,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={navTheme}>
            <StatusBar style="light" />
            <RootNavigator />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();
  useProtectedRoute(session, isLoading);

  // I cinque pesi che l'app usa davvero. Caricarli tutti e sette
  // aggiungerebbe due file al bundle per niente.
  const [fontPronti] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Lo splash resta finché la sessione è nota E i caratteri sono pronti.
  // Nasconderlo prima farebbe comparire l'app col carattere di sistema per
  // una frazione di secondo, per poi far saltare tutto quando arriva quello
  // vero: è il difetto che si nota di più fra quelli che nessuno sa nominare.
  useEffect(() => {
    if (!isLoading && fontPronti) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, fontPronti]);

  if (!fontPronti) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: darkColors.background },
      }}
    />
  );
}
