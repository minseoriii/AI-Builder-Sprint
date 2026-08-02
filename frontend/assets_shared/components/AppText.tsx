import { Text, TextProps, TextStyle } from 'react-native';

import { useResponsive } from '../responsive';
import { TextStyles } from '../typography';

export type AppTextVariant = 'default' | 'emphasis';

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  style?: TextStyle;
}

/** A2Z 기본·강조 텍스트 — fontSize 기기별 자동 스케일 */
export function AppText({
  variant = 'default',
  style,
  children,
  ...rest
}: AppTextProps) {
  const { fontScale } = useResponsive();
  const base = TextStyles[variant];

  return (
    <Text
      style={[
        base,
        {
          fontSize: fontScale(base.fontSize ?? 14),
          lineHeight: fontScale((base.fontSize ?? 14) + 4),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
