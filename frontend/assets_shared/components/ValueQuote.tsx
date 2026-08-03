import {
  Image,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { Palette } from '../colors';
import { roundStar1Image } from '../stars_png/images';
import { FontFamily } from '../typography';

type BracketSide = 'left' | 'right';

function StarBracket({ side }: { side: BracketSide }) {
  const isLeft = side === 'left';

  return (
    <View style={styles.bracket} accessibilityElementsHidden>
      <Image
        source={roundStar1Image}
        style={[
          styles.starLarge,
          isLeft ? styles.largeLeft : styles.largeRight,
        ]}
        resizeMode="contain"
      />
      <Image
        source={roundStar1Image}
        style={[
          styles.starSmall,
          isLeft ? styles.smallTopLeft : styles.smallTopRight,
        ]}
        resizeMode="contain"
      />
      <Image
        source={roundStar1Image}
        style={[
          styles.starSmall,
          isLeft ? styles.smallBottomLeft : styles.smallBottomRight,
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

export interface ValueQuoteProps {
  children: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  numberOfLines?: TextProps['numberOfLines'];
}

/** 가치문장 — 좌우 세 별 괄호 안에 끼운 인용 텍스트 */
export function ValueQuote({
  children,
  style,
  textStyle,
  numberOfLines,
}: ValueQuoteProps) {
  return (
    <View style={[styles.row, style]}>
      <StarBracket side="left" />
      <Text
        style={[styles.text, textStyle]}
        numberOfLines={numberOfLines}
      >
        {children}
      </Text>
      <StarBracket side="right" />
    </View>
  );
}

const BRACKET_W = 16;
const BRACKET_H = 20;
const LARGE = 8;
const SMALL = 4.5;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bracket: {
    width: BRACKET_W,
    height: BRACKET_H,
    position: 'relative',
  },
  starLarge: {
    position: 'absolute',
    width: LARGE,
    height: LARGE,
    top: (BRACKET_H - LARGE) / 2,
  },
  largeLeft: {
    left: 0,
  },
  largeRight: {
    right: 0,
  },
  starSmall: {
    position: 'absolute',
    width: SMALL,
    height: SMALL,
    opacity: 0.7,
  },
  smallTopLeft: {
    right: 0,
    top: 0,
  },
  smallBottomLeft: {
    right: 0,
    bottom: 0,
  },
  smallTopRight: {
    left: 0,
    top: 0,
  },
  smallBottomRight: {
    left: 0,
    bottom: 0,
  },
  text: {
    flexShrink: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: Palette.cream,
    textAlign: 'center',
  },
});
