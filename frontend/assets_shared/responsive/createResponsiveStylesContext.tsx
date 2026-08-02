import { createContext, ReactNode, useContext } from 'react';
import { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { useResponsiveStyles } from './useResponsiveStyles';

type StyleObject = ViewStyle | TextStyle | ImageStyle;

type ScaledStyles<T extends Record<string, StyleObject>> = {
  [K in keyof T]: T[K];
};

export function createResponsiveStylesContext<
  T extends Record<string, StyleObject>,
>() {
  const Context = createContext<ScaledStyles<T> | null>(null);

  function StylesProvider({
    styles,
    children,
  }: {
    styles: ScaledStyles<T>;
    children: ReactNode;
  }) {
    return <Context.Provider value={styles}>{children}</Context.Provider>;
  }

  function useStyles(): ScaledStyles<T> {
    const styles = useContext(Context);
    if (!styles) {
      throw new Error('useStyles must be used within StylesProvider');
    }
    return styles;
  }

  function useScreenStyles(definitions: T): ScaledStyles<T> {
    return useResponsiveStyles(definitions);
  }

  return { StylesProvider, useStyles, useScreenStyles };
}
