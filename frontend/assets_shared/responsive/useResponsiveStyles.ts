import { useMemo } from 'react';
import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { useResponsive } from './ResponsiveContext';
import { scaleStyles } from './scaleStyle';

type StyleObject = ViewStyle | TextStyle | ImageStyle;

export function useResponsiveStyles<T extends Record<string, StyleObject>>(
  definitions: T,
): { [K in keyof T]: T[K] } {
  const metrics = useResponsive();

  return useMemo(
    () =>
      StyleSheet.create(scaleStyles(definitions, metrics)) as {
        [K in keyof T]: T[K];
      },
    [definitions, metrics.width, metrics.height],
  );
}
