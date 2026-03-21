import { Platform } from 'react-native';
import { Text as TText, type GetProps } from 'tamagui';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = GetProps<typeof TText> & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

const typeStyles: Record<NonNullable<ThemedTextProps['type']>, GetProps<typeof TText>> = {
  default: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  title: { fontSize: 48, fontWeight: '600', lineHeight: 52 },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  subtitle: { fontSize: 32, lineHeight: 44, fontWeight: '600' },
  link: { fontSize: 14, lineHeight: 30 },
  linkPrimary: { fontSize: 14, lineHeight: 30 },
  code: {
    fontFamily: Fonts.mono as GetProps<typeof TText>['fontFamily'],
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
};

export function ThemedText({ style, type = 'default', themeColor, color, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const resolvedColor =
    type === 'linkPrimary' ? theme.primary : (color ?? theme[(themeColor ?? 'text') as keyof typeof theme]);

  return <TText {...typeStyles[type]} color={resolvedColor as never} style={style} {...rest} />;
}
