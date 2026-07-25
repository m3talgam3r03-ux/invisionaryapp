import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { radius } from '@/theme';

/** Player YouTube (native): incorpora il video in una WebView 16:9. */
export function YouTubePlayer({ youtubeId }: { youtubeId: string }) {
  const uri = `https://www.youtube.com/embed/${youtubeId}?rel=0&playsinline=1&modestbranding=1`;
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri }}
        style={styles.web}
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  web: {
    flex: 1,
    backgroundColor: '#000',
  },
});
