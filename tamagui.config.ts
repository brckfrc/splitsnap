import { defaultConfig } from '@tamagui/config/v5';
import { animations } from '@tamagui/config/v5-rn';
import { createInterFont } from '@tamagui/font-inter';
import { createTamagui } from 'tamagui';

import { DarkTokens, LightTokens } from './src/theme/tokens';

const inter = createInterFont();

const appLight = Object.fromEntries(
  Object.entries(LightTokens).map(([k, v]) => [k, v]),
) as Record<string, string>;
const appDark = Object.fromEntries(
  Object.entries(DarkTokens).map(([k, v]) => [k, v]),
) as Record<string, string>;

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  animations,
  fonts: {
    ...defaultConfig.fonts,
    body: inter,
    heading: inter,
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      ...appLight,
    },
    dark: {
      ...defaultConfig.themes.dark,
      ...appDark,
    },
  },
});

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}
