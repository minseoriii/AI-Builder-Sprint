import { ViewStyle } from 'react-native';

import { Palette, withOpacity } from '@/assets_shared';

/** 공통 패널 — #F8EEC1 15% 채우기 / 60% 외곽선 */
export const panelSurface: ViewStyle = {
  backgroundColor: withOpacity(Palette.cream, 0.15),
  borderColor: withOpacity(Palette.cream, 0.6),
  borderWidth: 1,
};
