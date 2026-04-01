import React, {useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Circle, Path, Defs, LinearGradient, Stop, Ellipse} from 'react-native-svg';
import {useAuth, useTheme} from '../../context';
import {FontSizes} from '../../constants';
import NannyImage from '../../assets/Group 13273.svg';
import {MKCLogoIconBlue} from '../../assets/images/MKCLogoIconBlue';
import {MKCLogo} from '../../assets/images/MKCLogo';

const {width: SW, height: SH} = Dimensions.get('window');

const HERO_H = SH * 0.42;

type SlideConfig = {
  id: string;
  badge: string;
  title: string;
  description: string;
};

const SLIDES: SlideConfig[] = [
  {
    id: '1',
    badge: '100% वेरिफाइड जॉब्स',
    title: 'अपने क्षेत्र में काम ढूंढें !',
    description: 'मां और बच्चे की देखभाल के काम में\nअपना करियर बनाएं।',
  },
  {
    id: '2',
    badge: 'सुरक्षित काम',
    title: 'भरोसेमंद और सुरक्षित !',
    description: 'सभी परिवार वेरिफाइड हैं,\nआप पूरी सुरक्षा के साथ काम करें।',
  },
  {
    id: '3',
    badge: 'अच्छी कमाई',
    title: 'अपनी शर्तों पर काम करें !',
    description: 'अपने समय और एरिया के अनुसार\nकाम चुनें और अच्छी कमाई करें।',
  },
];

/* ── Shield icon for badge ── */
const ShieldIcon = React.memo(({size = 18, color = '#F5A623'}: {size?: number; color?: string}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L4 5.5V11C4 16.52 7.58 21.74 12 23C16.42 21.74 20 16.52 20 11V5.5L12 2Z"
      fill={color}
    />
    <Path
      d="M10.5 14.59L7.91 12L6.5 13.41L10.5 17.41L18.5 9.41L17.09 8L10.5 14.59Z"
      fill="#FFF"
    />
  </Svg>
));

/* ── Decorative blob behind hero ── */
const HeroBlob = React.memo(({width: w, height: h}: {width: number; height: number}) => (
  <Svg width={w} height={h} viewBox="0 0 320 340">
    <Defs>
      <LinearGradient id="blobGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#D6E9FF" stopOpacity="0.9" />
        <Stop offset="0.5" stopColor="#B8D8FC" stopOpacity="0.7" />
        <Stop offset="1" stopColor="#EEF6FF" stopOpacity="0.4" />
      </LinearGradient>
    </Defs>
    <Ellipse cx="160" cy="175" rx="155" ry="165" fill="url(#blobGrad)" />
    <Circle cx="160" cy="170" r="125" fill="none" stroke="#A8D4FF" strokeWidth="1" strokeOpacity="0.5" />
  </Svg>
));

/* ── Decorative dots ── */
const DecorDots = React.memo(({color}: {color: string}) => (
  <Svg width={30} height={54}>
    <Circle cx="19" cy="10" r="6" fill={color} opacity={0.5} />
    <Circle cx="8" cy="28" r="4" fill={color} opacity={0.35} />
    <Circle cx="22" cy="46" r="3" fill={color} opacity={0.22} />
  </Svg>
));

export function WelcomeScreen() {
  const {completeOnboarding} = useAuth();
  const {colors, isDark} = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: ViewToken[]}) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({index: currentIndex + 1});
    } else {
      completeOnboarding();
    }
  }

  return (
    <SafeAreaView style={[st.container, {backgroundColor: colors.onboardingBackground}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.onboardingBackground}
      />

      {/* ── Logo row ── */}
      <View style={st.logoRow}>
        <MKCLogoIconBlue width={42} height={42} />
        <MKCLogo width={70} height={30} style={st.logoText} />
      </View>

      {/* ── Hero ── */}
      <View style={st.heroSection}>
        {/* Blob background */}
        <View style={st.blobWrap}>
          <HeroBlob width={SW * 0.85} height={HERO_H} />
        </View>
        {/* Decorative dots */}
        <View style={st.decorDots}>
          <DecorDots color={colors.primary} />
        </View>
        {/* Nanny illustration */}
        <View style={st.nannyWrap}>
          <NannyImage width={SW * 0.62} height={HERO_H * 0.88} />
        </View>
      </View>

      {/* ── Slide content ── */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled={SLIDES.length > 1}
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{viewAreaCoveragePercentThreshold: 50}}
        style={st.flatList}
        renderItem={({item}) => (
          <View style={[st.slide, {width: SW}]}>
            {/* Badge */}
            <View
              style={[
                st.badge,
                {
                  backgroundColor: isDark ? colors.card : '#FFFFFF',
                  shadowColor: colors.shadow,
                },
              ]}>
              <ShieldIcon size={18} color={colors.accent} />
              <Text style={[st.badgeText, {color: colors.text}]}>{item.badge}</Text>
            </View>

            {/* Title */}
            <Text style={[st.title, {color: colors.text}]}>{item.title}</Text>

            {/* Description */}
            <Text style={[st.description, {color: colors.textSecondary}]}>
              {item.description}
            </Text>
          </View>
        )}
      />

      {/* ── Footer ── */}
      <View style={st.footer}>
        {/* Pagination dots */}
        <View style={st.pagination}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                st.dot,
                {
                  width: i === currentIndex ? 22 : 8,
                  backgroundColor:
                    i === currentIndex
                      ? colors.primary
                      : isDark
                        ? colors.primary + '44'
                        : '#C5D8F0',
                },
              ]}
            />
          ))}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[
            st.button,
            {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
            },
          ]}
          onPress={handleNext}
          activeOpacity={0.85}>
          <Text style={[st.buttonText, {color: '#FFFFFF'}]}>
            {currentIndex === SLIDES.length - 1
              ? 'अंदर शुरू करें  ›'
              : 'आगे बढ़ें  ›'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: {flex: 1},

  /* ── Logo ── */
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 0,
    gap: -8,
  },
  logoText: {
    marginLeft: -12,
    marginTop: 2,
  },

  /* ── Hero ── */
  heroSection: {
    height: HERO_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobWrap: {
    position: 'absolute',
  },
  decorDots: {
    position: 'absolute',
    right: SW * 0.1,
    top: HERO_H * 0.08,
    zIndex: 2,
  },
  nannyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  /* ── Slides ── */
  flatList: {flexGrow: 0},
  slide: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },

  /* ── Badge ── */
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 18,
    elevation: 4,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 3},
  },
  badgeText: {
    fontSize: FontSizes.body,
    fontWeight: '700',
    marginLeft: 8,
  },

  /* ── Text ── */
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 32,
  },
  description: {
    fontSize: FontSizes.body,
    textAlign: 'center',
    lineHeight: 22,
  },

  /* ── Footer ── */
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 30,
    paddingTop: 16,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  button: {
    borderRadius: 28,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
  },
  buttonText: {
    fontSize: FontSizes.button,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});