import { Text, TextProps, TextStyle } from 'react-native';

import { TextStyles } from '../typography';

export type AppTextVariant = 'default' | 'emphasis';

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  style?: TextStyle;
}

/** A2Z 기본·강조 텍스트 — color F8EEC1 */
export function AppText({
  variant = 'default',
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text style={[TextStyles[variant], style]} {...rest}>
      {children}
    </Text>
  );
}
