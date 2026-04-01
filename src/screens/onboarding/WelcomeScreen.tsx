import React, { useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth, useTheme } from '../../context';
import { FontSizes } from '../../constants';
import NannyImage from '../../assets/Group 13273.svg';
import BlueShieldIcon from '../../assets/BlueShield.svg';
import { MKCLogoIconBlue } from '../../assets/images/MKCLogoIconBlue';
import { MKCLogo } from '../../assets/images/MKCLogo';

const { width: SW, height: SH } = Dimensions.get('window');

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
    description: ' मां और बच्चे की देखभाल के काम में\nअपना करियर बनाएं।',
  },
];

/* ── Shield icon for badge ── */

export function WelcomeScreen() {
  const { completeOnboarding } = useAuth();
  const { colors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  }

  return (
    <LinearGradient
      colors={['#FFFFFF', '#C4D9FA']}
      start={{ x: 0.4, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={st.container}>
      <SafeAreaView style={st.container}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.onboardingBackground}
        />
        <View style={st.logoRow}>
          <MKCLogo width={80} height={40} style={st.logoText} />
        </View>
        <View style={st.heroSection}>
          <View style={st.nannyWrap}>
            <NannyImage width={SW * 1.02} height={HERO_H * 1.2} />
          </View>
          <View
            style={[
              st.badge,
              {
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                shadowColor: colors.shadow,
              },
            ]}>
            <BlueShieldIcon width={18} height={18} />
            <Text style={[st.badgeText, { color: '#1A3B70' }]}>{SLIDES[0].badge}</Text>
          </View>
        </View>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          scrollEnabled={SLIDES.length > 1}
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          style={st.flatList}
          renderItem={({ item }) => (
            <View style={[st.slide, { width: SW }]}>
              <Text style={[st.title, { color: '#1A3B70' }]}>{item.title}</Text>
              <Text style={[st.description, { color: '#1A3B70' }]}>
                {item.description}
              </Text>
            </View>
          )}
        />

        {/* ── Footer ── */}
        <View style={st.footer}>
          {/* Pagination dots — only show when multiple slides */}
          {SLIDES.length > 1 && (
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
          )}

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
            <Text style={[st.buttonText, { color: '#FFFFFF' }]}>
              {currentIndex === SLIDES.length - 1
                ? 'अंदर शुरू करें  ›'
                : 'आगे बढ़ें  ›'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, },

  /* ── Logo ── */
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 40,
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
    position: 'relative',
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
  flatList: { flexGrow: 0 },
  slide: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },

  /* ── Badge ── */
  badge: {
    position: 'absolute',
    bottom: 21,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    elevation: 4,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  badgeText: {
    fontSize: FontSizes.body,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '700',
    marginLeft: 8,
  },

  /* ── Text ── */
  title: {
    fontSize: 18,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 24,
  },
  description: {
    fontSize: 16,
    fontFamily: 'NotoSansDevanagari-Medium',
    textAlign: 'center',
    lineHeight: 17,
    letterSpacing: 0,
  },

  /* ── Footer ── */
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 30,
    paddingTop: 52,
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
    borderRadius: 14,
    height: 54,
    width: SW * 0.6,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: {
    fontSize: FontSizes.button,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});