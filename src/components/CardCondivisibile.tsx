import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Crest } from '@/components/Crest';
import { ThemedText } from '@/components/ui';
import { STORIES, type Card } from '@/lib/condivisione';
import { darkColors, spacing } from '@/theme';

/**
 * La card 1080×1920 che finisce nelle Storie.
 *
 * Si disegna a dimensione reale e si rimpicciolisce con `transform: scale`
 * invece di disegnarla piccola: `react-native-view-shot` cattura la vista come
 * viene misurata, quindi catturare una card da 300 px e poi ingrandirla darebbe
 * un'immagine sgranata. Così il file esce già a 1080×1920.
 *
 * I colori sono presi da `darkColors` e non da `useTheme`: l'immagine esce
 * dall'app e non deve cambiare aspetto perché chi la genera ha il tema chiaro.
 *
 * Il disclaimer è parte della card, non un'aggiunta opzionale: chi condivide
 * non ha modo di toglierlo.
 */
type Props = {
  card: Card;
  /** Fattore di riduzione per l'anteprima. 1 = dimensione reale. */
  scala?: number;
};

export const CardCondivisibile = forwardRef<View, Props>(function CardCondivisibile(
  { card, scala = 1 },
  ref,
) {
  return (
    <View
      style={{
        width: STORIES.larghezza * scala,
        height: STORIES.altezza * scala,
        overflow: 'hidden',
      }}
    >
      <View
        ref={ref}
        collapsable={false}
        style={[
          styles.tela,
          {
            transform: [{ scale: scala }],
            // `scale` parte dal centro: senza questo la card si sposterebbe.
            marginLeft: (-STORIES.larghezza * (1 - scala)) / 2,
            marginTop: (-STORIES.altezza * (1 - scala)) / 2,
          },
        ]}
      >
        <View style={styles.contenuto}>
          <Crest size={220} variant="mark" />

          <View style={{ gap: spacing.md, alignItems: 'center' }}>
            <ThemedText style={styles.valore}>{card.valore}</ThemedText>
            <ThemedText style={styles.titolo}>{card.titolo}</ThemedText>
            <ThemedText style={styles.sottotitolo}>{card.sottotitolo}</ThemedText>
          </View>

          <View style={styles.marchio}>
            <View style={styles.filetto} />
            <ThemedText style={styles.nome}>INVISIONARY</ThemedText>
          </View>
        </View>

        {/* Sopra il margine basso: nelle Storie l'ultima fascia la copre l'app */}
        <ThemedText style={styles.disclaimer}>{card.disclaimer}</ThemedText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  tela: {
    width: STORIES.larghezza,
    height: STORIES.altezza,
    backgroundColor: darkColors.background,
  },
  contenuto: {
    position: 'absolute',
    left: 80,
    right: 80,
    // Il contenuto vive fra i due margini: fuori di lì lo copre Instagram.
    top: STORIES.margineAlto,
    bottom: STORIES.margineBasso,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  valore: {
    color: darkColors.gold,
    fontSize: 128,
    lineHeight: 148,
    fontWeight: '800',
    textAlign: 'center',
  },
  titolo: {
    color: darkColors.text,
    fontSize: 64,
    lineHeight: 76,
    fontWeight: '700',
    textAlign: 'center',
  },
  sottotitolo: {
    color: darkColors.textMuted,
    fontSize: 40,
    lineHeight: 52,
    textAlign: 'center',
  },
  marchio: { alignItems: 'center', gap: 28 },
  filetto: { width: 120, height: 3, backgroundColor: darkColors.accent },
  nome: {
    color: darkColors.text,
    fontSize: 36,
    letterSpacing: 10,
    fontWeight: '700',
  },
  disclaimer: {
    position: 'absolute',
    left: 80,
    right: 80,
    bottom: STORIES.margineBasso - 90,
    color: darkColors.textMuted,
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
  },
});
