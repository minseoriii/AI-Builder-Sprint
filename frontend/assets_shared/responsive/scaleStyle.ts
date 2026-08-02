import { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import type { ResponsiveMetrics } from './metrics';

type StyleObject = ViewStyle | TextStyle | ImageStyle;

const FONT_PROPS = new Set(['fontSize', 'lineHeight']);
const VERTICAL_PROPS = new Set([
  'height',
  'minHeight',
  'maxHeight',
  'marginTop',
  'marginBottom',
  'marginVertical',
  'paddingTop',
  'paddingBottom',
  'paddingVertical',
  'top',
  'bottom',
]);
const SKIP_PROPS = new Set([
  'flex',
  'flexGrow',
  'flexShrink',
  'opacity',
  'zIndex',
  'elevation',
  'shadowOpacity',
]);

function scaleValue(
  key: string,
  value: number,
  metrics: ResponsiveMetrics,
): number {
  if (FONT_PROPS.has(key)) return metrics.fontScale(value);
  if (VERTICAL_PROPS.has(key)) return metrics.verticalScale(value);
  return metrics.scale(value);
}

function scaleStyleObject(
  style: StyleObject,
  metrics: ResponsiveMetrics,
): StyleObject {
  const scaled: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(style)) {
    if (value == null || SKIP_PROPS.has(key)) {
      scaled[key] = value;
      continue;
    }

    if (typeof value === 'number') {
      scaled[key] = scaleValue(key, value, metrics);
      continue;
    }

    if (key === 'transform' && Array.isArray(value)) {
      scaled[key] = value.map((entry) => {
        if (!entry || typeof entry !== 'object') return entry;
        const next = { ...entry } as Record<string, number>;
        for (const [transformKey, transformValue] of Object.entries(entry)) {
          if (typeof transformValue === 'number') {
            next[transformKey] = metrics.scale(transformValue);
          }
        }
        return next;
      });
      continue;
    }

    scaled[key] = value;
  }

  return scaled as StyleObject;
}

export function scaleStyles<T extends Record<string, StyleObject>>(
  definitions: T,
  metrics: ResponsiveMetrics,
): { [K in keyof T]: StyleObject } {
  const scaled = {} as { [K in keyof T]: StyleObject };

  for (const key of Object.keys(definitions) as (keyof T)[]) {
    scaled[key] = scaleStyleObject(definitions[key], metrics);
  }

  return scaled;
}
