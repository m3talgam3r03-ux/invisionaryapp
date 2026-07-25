import { StyleSheet, View } from 'react-native';

import { radius } from '@/theme';

/** Player YouTube (web): iframe reso da react-dom, 16:9. */
export function YouTubePlayer({ youtubeId }: { youtubeId: string }) {
  const src = `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`;
  return (
    <View style={styles.container}>
      <iframe
        src={src}
        title="YouTube"
        style={{ border: 0, width: '100%', height: '100%' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
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
});
