import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';

/** Matches `background.svg` base fill */
const BACKGROUND_BASE = '#173F72';

export interface BackgroundProps {
  width?: number;
  height?: number;
}

/**
 * Full-screen background from `assets_shared/svg/background.svg`.
 * Sized to the current window so it covers any Android aspect ratio.
 */
export function Background({ width: widthProp, height: heightProp }: BackgroundProps = {}) {
  const window = useWindowDimensions();
  const width = widthProp ?? window.width;
  const height = heightProp ?? window.height;

  return (
    <View pointerEvents="none" style={[styles.root, { width, height }]}>
      <View style={[StyleSheet.absoluteFillObject, styles.base]} />
      <Image
        source={require('../images/background.png')}
        style={{ position: 'absolute', top: 0, left: 0, width, height, opacity: 0.88 }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  base: {
    backgroundColor: BACKGROUND_BASE,
  },
});
