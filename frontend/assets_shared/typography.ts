import { TextStyle } from 'react-native';

import { Palette } from './colors';

/** expo-font 로드 후 사용할 A2Z 패밀리명 */
export const FontFamily = {
  extraLight: 'A2Z-ExtraLight',
  light: 'A2Z-Light',
  regular: 'A2Z-Regular',
  medium: 'A2Z-Medium',
  bold: 'A2Z-Bold',
} as const;

export const FontSize = {
  buttonLarge: 20,
  buttonMedium: 17,
  buttonSmall: 15,
  tag: 14,
} as const;

/** 기본·강조 텍스트 스타일 */
export const TextStyles = {
  default: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Palette.cream,
  } satisfies TextStyle,
  emphasis: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Palette.cream,
  } satisfies TextStyle,
} as const;
