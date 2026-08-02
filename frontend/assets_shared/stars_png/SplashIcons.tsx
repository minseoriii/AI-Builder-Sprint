import { Image } from 'expo-image';

import {
  logoImage,
  polarisImage,
  roundStar1Image,
  roundStar2Image,
  roundStar3Image,
} from './images';

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

/** ic_roundstar1.png */
export function RoundStar1({ size = 27 }: SizedIconProps) {
  return (
    <Image
      source={roundStar1Image}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}

/** ic_roundstar2.png */
export function RoundStar2({ size = 23 }: SizedIconProps) {
  return (
    <Image
      source={roundStar2Image}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}

/** ic_roundstar3.png */
export function RoundStar3({ size = 22 }: SizedIconProps) {
  return (
    <Image
      source={roundStar3Image}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
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
