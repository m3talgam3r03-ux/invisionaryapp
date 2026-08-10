import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, type ColorValue } from 'react-native';

import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { registerPushToken } from '@/lib/push';
import { BARRA_LATERALE, navigazioneDiLato, spacing, useTheme } from '@/theme';

/**
 * Navigazione principale: barra in basso con i quattro pilastri del marchio
 * (♠ Trading · ♥ Network · ♦ Formazione · ♣ Community) più la Home.
 * Sono gli stessi quattro assi dell'iride del logo.
 *
 * Le altre sezioni (Agente, Calcolatori, Scadenzario, Rank, Admin) restano
 * raggiungibili dalla Home: metterle qui renderebbe la barra illeggibile.
 * `href: null` le tiene fuori dalla barra senza toglierle dal routing.
 */
export default function AppLayout() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const userId = session?.user.id;

  // Su un monitor la barra in basso è un pulsante a mezzo metro dagli occhi:
  // si attraversa tutto lo schermo per cambiare sezione. Di lato sta dove
  // sta lo sguardo. Sotto la soglia resta in basso, dov'è giusta.
  const diLato = navigazioneDiLato(width);

  // Registra il token push quando l'utente è autenticato (no-op su web/emulatore).
  useEffect(() => {
    if (userId) {
      void registerPushToken(userId);
    }
  }, [userId]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: diLato ? 'left' : 'bottom',
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        // Stesso colore del contenuto e un filetto al posto dell'ombra: la barra
        // appartiene alla schermata invece di galleggiarci sopra.
        tabBarStyle: diLato
          ? {
              backgroundColor: colors.background,
              borderRightColor: colors.border,
              borderRightWidth: StyleSheet.hairlineWidth,
              elevation: 0,
              width: BARRA_LATERALE,
              paddingTop: spacing.xl,
            }
          : {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              borderTopWidth: StyleSheet.hairlineWidth,
              elevation: 0,
              height: 60,
              paddingTop: spacing.xs,
              paddingBottom: spacing.xs,
            },
        // Etichette piccole sotto icone grandi: si naviga guardando le icone,
        // l'etichetta serve solo a togliere il dubbio la prima volta.
        // Di lato c'è spazio: l'etichetta diventa leggibile e sta accanto.
        tabBarLabelStyle: diLato
          ? { fontSize: 14, letterSpacing: 0.2, fontWeight: '600' }
          : { fontSize: 10, letterSpacing: 0.2, fontWeight: '600' },
        tabBarItemStyle: diLato
          ? { paddingVertical: spacing.sm, justifyContent: 'flex-start' }
          : { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.nav.home,
          tabBarIcon: ({ color }) => <Icona glifo="⌂" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="trading"
        options={{
          title: t.nav.trading,
          tabBarIcon: ({ color }) => <Icona glifo="♠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: t.nav.network,
          // Cuori e quadri restano rossi anche da spenti: è la regola del marchio.
          tabBarIcon: ({ color, focused }) => (
            <Icona glifo="♥" color={focused ? colors.accent : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="formazione"
        options={{
          title: t.nav.formazione,
          tabBarIcon: ({ color, focused }) => (
            <Icona glifo="♦" color={focused ? colors.accent : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t.nav.community,
          tabBarIcon: ({ color }) => <Icona glifo="♣" color={color} />,
        }}
      />

      {/* Fuori dalla barra, ma raggiungibili dalla Home */}
      <Tabs.Screen name="agente" options={{ href: null }} />
      <Tabs.Screen name="calcolatori" options={{ href: null }} />
      <Tabs.Screen name="calendario" options={{ href: null }} />
      <Tabs.Screen name="premi" options={{ href: null }} />
      <Tabs.Screen name="mappa" options={{ href: null }} />
      <Tabs.Screen name="renewals" options={{ href: null }} />
      <Tabs.Screen name="rank" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}

/** I semi come icone: nessuna libreria in più, e sono già il marchio. */
function Icona({
  glifo,
  color,
  size = 22,
}: {
  glifo: string;
  color: ColorValue;
  size?: number;
}) {
  return <Text style={{ color, fontSize: size, lineHeight: size + 4 }}>{glifo}</Text>;
}
