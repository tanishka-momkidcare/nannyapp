import React, {useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {useAuth, useTheme} from '../../context';
import {FontSizes} from '../../constants';
import NannyImage from '../../assets/Group 13273.svg';

const {width, height} = Dimensions.get('window');

const HERO_H = height * 0.46;
const BLOB_W = width  * 0.66;
const BLOB_H = HERO_H * 0.90;

type SlideConfig = {
  id: string;
  badge: string;
  title: string;
  description: string;
};

const SLIDES: SlideConfig[] = [
  {
    id: '1',
    badge: '100% \u0935\u0947\u0930\u093f\u092b\u093e\u0908\u0921 \u091c\u0949\u092c\u094d\u0938',
    title: '\u0905\u092a\u0928\u0947 \u0915\u094d\u0937\u0947\u0924\u094d\u0930 \u092e\u0947\u0902 \u0915\u093e\u092e \u0922\u0942\u0902\u0922\u0947\u0902 !',
    description: '\u092e\u093e\u0902 \u0914\u0930 \u092c\u091a\u094d\u091a\u0947 \u0915\u0940 \u0926\u0947\u0916\u092d\u093e\u0932 \u0915\u0947 \u0915\u093e\u092e \u092e\u0947\u0902\n\u0905\u092a\u0928\u093e \u0915\u0930\u093f\u092f\u0930 \u092c\u0928\u093e\u090f\u0902\u0964',
  },
];

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
    <SafeAreaView style={[styles.container, {backgroundColor: colors.onboardingBackground}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.onboardingBackground}
      />

      {/* Logo */}
      <View style={styles.logoRow}>
        <Text style={[styles.logoMom, {color: colors.text}]}>mom</Text>
        <Text style={[styles.logoKid, {color: colors.primary}]}>kid</Text>
        <Text style={[styles.logoCare, {color: colors.primary}]}>care</Text>
        <Text style={[styles.logoTM, {color: colors.textMuted}]}>{'\u00ae'}</Text>
      </View>

      {/* Hero */}
      <View style={styles.heroSection}>
        <Svg style={styles.decorSvg} width={28} height={52}>
          <Circle cx="18" cy="9"  r="5.5" fill={colors.primary} opacity={0.55} />
          <Circle cx="8"  cy="27" r="3.5" fill={colors.primary} opacity={0.40} />
          <Circle cx="22" cy="44" r="2.5" fill={colors.primary} opacity={0.28} />
        </Svg>

        <View style={styles.heroStack}>
          <NannyImage width={BLOB_W} height={BLOB_H} />
        </View>
      </View>

      {/* Slide text */}
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
        style={styles.flatList}
        renderItem={({item}) => (
          <View style={[styles.slide, {width}]}>
            <View style={[styles.badge, {backgroundColor: colors.badgeBackground, shadowColor: colors.shadow}]}>
              <Text style={[styles.badgeText, {color: colors.primary}]}>{item.badge}</Text>
            </View>
            <Text style={[styles.title, {color: colors.text}]}>{item.title}</Text>
            <Text style={[styles.description, {color: colors.textSecondary}]}>{item.description}</Text>
          </View>
        )}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {SLIDES.length > 1 && (
          <View style={styles.pagination}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: i === currentIndex ? 20 : 7,
                    backgroundColor: i === currentIndex ? colors.primary : colors.primary + '55',
                  },
                ]}
              />
            ))}
          </View>
        )}
        <TouchableOpacity
          style={[styles.button, {backgroundColor: colors.accent, shadowColor: colors.accent}]}
          onPress={handleNext}
          activeOpacity={0.85}>
          <Text style={[styles.buttonText, {color: colors.buttonPrimaryText}]}>
            {currentIndex === SLIDES.length - 1 ? '\u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902  \u203a' : '\u0906\u0917\u0947 \u092c\u0922\u093c\u0947\u0902  \u203a'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    {flex: 1},
  logoRow:      {flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 2},
  logoMom:      {fontSize: FontSizes.h2, fontWeight: '800'},
  logoKid:      {fontSize: FontSizes.h2, fontWeight: '800'},
  logoCare:     {fontSize: 11, marginBottom: 2},
  logoTM:       {fontSize: FontSizes.xs, marginBottom: 3, marginLeft: 1},
  heroSection:  {height: HERO_H, alignItems: 'center', justifyContent: 'center'},
  decorSvg:     {position: 'absolute', right: 22, top: HERO_H * 0.12},
  heroStack:    {width: BLOB_W, height: BLOB_H, alignItems: 'center', justifyContent: 'center'},
  flatList:     {flexGrow: 0},
  slide:        {paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4},
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
    elevation: 3,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
  },
  badgeText:    {fontSize: FontSizes.caption, fontWeight: '600', marginLeft: 6},
  title:        {fontSize: FontSizes.h1, fontWeight: '800', marginBottom: 8, lineHeight: 32},
  description:  {fontSize: FontSizes.body, lineHeight: 21},
  footer:       {paddingHorizontal: 24, paddingBottom: 28, paddingTop: 12},
  pagination:   {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16},
  dot:          {height: 7, borderRadius: 4, marginHorizontal: 3},
  button: {
    borderRadius: 30,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
  },
  buttonText: {fontSize: FontSizes.button, fontWeight: '700', letterSpacing: 0.3},
});