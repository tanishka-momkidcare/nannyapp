import { Dimensions, PixelRatio, Platform, TextStyle } from 'react-native';

// ─── Scaling Engine ───────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375;
const XD_SCALE = 0.94;

/** Scale an XD font size → device (−15%, width-proportional, pixel-rounded). */
export function scaleFont(size: number): number {
  return Math.round(PixelRatio.roundToNearestPixel(size * XD_SCALE * (SCREEN_WIDTH / BASE_WIDTH)));
}

/** Scale a line-height the same way. */
export function scaleLineHeight(lh: number): number {
  return Math.round(PixelRatio.roundToNearestPixel(lh * XD_SCALE * (SCREEN_WIDTH / BASE_WIDTH)));
}

const noFontPadding = Platform.OS === 'android' ? { includeFontPadding: false } : {};

// ─── Font Size Tokens ─────────────────────────────────────────────────────────

export const FontSizes = {
  xxs: scaleFont(9),
  xs: scaleFont(10),
  xs2: scaleFont(11),
  sm: scaleFont(12),
  sm2: scaleFont(13),
  body: scaleFont(14),
  caption: scaleFont(14),
  input2: scaleFont(15),
  input: scaleFont(16),
  button: scaleFont(16),
  subtitle: scaleFont(16),
  subtitle2: scaleFont(17),
  h3: scaleFont(18),
  title: scaleFont(20),
  h2: scaleFont(20),
  h2x: scaleFont(22),
  h1: scaleFont(24),
  hero: scaleFont(24),
  display3: scaleFont(32),
  display2: scaleFont(40),
  display1: scaleFont(70),
};

// ─── Typography Presets (XD Character Styles) ─────────────────────────────────

export const Typography: Record<string, TextStyle> = {
  /* Golos Heading (Bold) */
  golosHeading1: { fontSize: FontSizes.h1, fontFamily: 'GolosText-Bold', fontWeight: '700', lineHeight: scaleLineHeight(32), ...noFontPadding },
  golosHeading2: { fontSize: FontSizes.title, fontFamily: 'GolosText-Bold', fontWeight: '700', lineHeight: scaleLineHeight(28), ...noFontPadding },
  golosHeading3: { fontSize: FontSizes.h3, fontFamily: 'GolosText-Bold', fontWeight: '700', lineHeight: scaleLineHeight(26), ...noFontPadding },
  golosHeading4: { fontSize: FontSizes.subtitle, fontFamily: 'GolosText-Bold', fontWeight: '700', lineHeight: scaleLineHeight(24), ...noFontPadding },

  /* Golos Sub-heading (SemiBold) */
  golosSubheading1: { fontSize: FontSizes.h1, fontFamily: 'GolosText-SemiBold', fontWeight: '600', lineHeight: scaleLineHeight(32), ...noFontPadding },
  golosSubheading2: { fontSize: FontSizes.title, fontFamily: 'GolosText-SemiBold', fontWeight: '600', lineHeight: scaleLineHeight(28), ...noFontPadding },
  golosSubheading3: { fontSize: FontSizes.h3, fontFamily: 'GolosText-SemiBold', fontWeight: '600', lineHeight: scaleLineHeight(26), ...noFontPadding },
  golosSubheading4: { fontSize: FontSizes.subtitle, fontFamily: 'GolosText-SemiBold', fontWeight: '600', lineHeight: scaleLineHeight(24), ...noFontPadding },

  /* Noto Heading (SemiBold) */
  notoHeading1: { fontSize: FontSizes.h1, fontFamily: 'NotoSansDevanagari-SemiBold', fontWeight: '700', lineHeight: scaleLineHeight(32), ...noFontPadding },
  notoHeading2: { fontSize: FontSizes.title, fontFamily: 'NotoSansDevanagari-SemiBold', fontWeight: '700', lineHeight: scaleLineHeight(28), ...noFontPadding },
  notoHeading3: { fontSize: FontSizes.h3, fontFamily: 'NotoSansDevanagari-SemiBold', fontWeight: '700', lineHeight: scaleLineHeight(26), ...noFontPadding },
  notoHeading4: { fontSize: FontSizes.subtitle, fontFamily: 'NotoSansDevanagari-SemiBold', fontWeight: '700', lineHeight: scaleLineHeight(24), ...noFontPadding },
  notoHeading5: { fontSize: FontSizes.body, fontFamily: 'NotoSansDevanagari-SemiBold', fontWeight: '700', lineHeight: scaleLineHeight(20), ...noFontPadding },
  notoHeading6: { fontSize: FontSizes.sm, fontFamily: 'NotoSansDevanagari-SemiBold', fontWeight: '700', lineHeight: scaleLineHeight(18), ...noFontPadding },

  /* Noto Subheading (Medium) */
  notoSubheading1: { fontSize: FontSizes.title, fontFamily: 'NotoSansDevanagari-Medium', fontWeight: '500', lineHeight: scaleLineHeight(28), ...noFontPadding },
  notoSubheading2: { fontSize: FontSizes.h3, fontFamily: 'NotoSansDevanagari-Medium', fontWeight: '500', lineHeight: scaleLineHeight(26), ...noFontPadding },
  notoSubheading3: { fontSize: FontSizes.subtitle, fontFamily: 'NotoSansDevanagari-Medium', fontWeight: '500', lineHeight: scaleLineHeight(24), ...noFontPadding },
  notoSubheading4: { fontSize: FontSizes.body, fontFamily: 'NotoSansDevanagari-Medium', fontWeight: '500', lineHeight: scaleLineHeight(20), ...noFontPadding },
  notoSubheading5: { fontSize: FontSizes.sm, fontFamily: 'NotoSansDevanagari-Medium', fontWeight: '500', lineHeight: scaleLineHeight(18), ...noFontPadding },

  /* Generic aliases */
  h1:       { fontSize: FontSizes.h1, fontWeight: '700', lineHeight: scaleLineHeight(32), ...noFontPadding },
  h2:       { fontSize: FontSizes.title, fontWeight: '700', lineHeight: scaleLineHeight(28), ...noFontPadding },
  h3:       { fontSize: FontSizes.h3, fontWeight: '600', lineHeight: scaleLineHeight(26), ...noFontPadding },
  body:     { fontSize: FontSizes.body, fontWeight: '400', lineHeight: scaleLineHeight(20), ...noFontPadding },
  bodyBold: { fontSize: FontSizes.body, fontWeight: '600', lineHeight: scaleLineHeight(20), ...noFontPadding },
  caption:  { fontSize: FontSizes.sm, fontWeight: '400', lineHeight: scaleLineHeight(18), ...noFontPadding },
  small:    { fontSize: FontSizes.sm, fontWeight: '400', lineHeight: scaleLineHeight(18), ...noFontPadding },
  button:   { fontSize: FontSizes.subtitle, fontWeight: '600', lineHeight: scaleLineHeight(24), ...noFontPadding },
};
