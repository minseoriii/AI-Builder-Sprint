import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ImageAssets } from '../images';

/** 부팅·온보딩 게이트용 스플래시 — background.png + 깜빡이는 polaris */
export function BootSplash() {
  const { width, height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const iconSize = Math.min(width * 0.28, 120);

  return (
    <View style={styles.root}>
      <Image
        source={ImageAssets.background}
        style={{ width, height, ...StyleSheet.absoluteFillObject }}
        resizeMode="cover"
      />
      <Animated.Image
        source={ImageAssets.ic_polaris}
        style={{ width: iconSize, height: iconSize, opacity }}
        resizeMode="contain"
        accessibilityLabel="POLARIS"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06101f',
  },
});
