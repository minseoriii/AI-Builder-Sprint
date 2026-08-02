import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';

const polarisImage = require('./ic_polaris.png');
const logoImage = require('./Logo.png');

interface SizedIconProps {
  size?: number;
}

interface LogoProps {
  width?: number;
}

/** ic_polaris.png */
export function PolarisIcon({ size = 97 }: SizedIconProps) {
  return (
    <Image
      source={polarisImage}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}

/** Logo.png */
export function LogoIcon({ width = 241 }: LogoProps) {
  const height = (width * 83) / 241;

  return (
    <Image
      source={logoImage}
      style={{ width, height }}
      contentFit="contain"
    />
  );
}

/** ic_roundstar1.svg */
export function RoundStar1({ size = 27 }: SizedIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 27 27" fill="none">
      <Circle cx="13.1" cy="13.1" r="2" fill="#FFF9DD" />
    </Svg>
  );
}

/** ic_roundstar2.svg */
export function RoundStar2({ size = 23 }: SizedIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 23 23" fill="none">
      <Circle cx="11.1" cy="11.1" r="1" fill="#FFF9DD" />
    </Svg>
  );
}

/** ic_roundstar3.svg */
export function RoundStar3({ size = 22 }: SizedIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Circle cx="10.6" cy="10.6" r="0.5" fill="#FFF9DD" />
    </Svg>
  );
}

export type RoundStarVariant = 1 | 2 | 3;

export function RoundStarIcon({
  variant,
  size,
}: {
  variant: RoundStarVariant;
  size?: number;
}) {
  switch (variant) {
    case 1:
      return <RoundStar1 size={size} />;
    case 2:
      return <RoundStar2 size={size} />;
    case 3:
      return <RoundStar3 size={size} />;
  }
}
