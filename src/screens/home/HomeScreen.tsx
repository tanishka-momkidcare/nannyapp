import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth, useTheme } from '../../context';
import { useTabBarVisibility } from '../../context/TabBarVisibilityContext';
import type { AppStackParamList } from '../../navigation/types';
import { FontSizes, Spacing, BorderRadius } from '../../constants';
import { MKCLogo } from '../../assets/images/MKCLogo';
import { MKCLogoIconBlue } from '../../assets/images/MKCLogoIconBlue';
import { BlurEllipse } from '../../components';
import { LoginScreenBottomIcon } from '../../assets/images/LoginScreenBottomIcon';
import HelpWoman from '../../assets/helpCardWomen.png';
import japaIcon from '../../assets/JapaIcon.png';
import nannyIcon from '../../assets/nannyIcon.png';
import babySitterIcon from '../../assets/babySitterIcon.png';
import babyMaidIcon from '../../assets/babyMaidIcon.png';

const { width: SW } = Dimensions.get('window');
const SECTION_GAP = 32;
const SECTION_CONTENT_GAP = 8;

/* ── Dummy data ── */
const USER = {
  name: 'लक्ष्मी',
  initial: 'L',
  status: 'Onboarded',
  score: 56,
  rating: 3.8,
  location: 'Karkarduma, Delhi',
};

type ActionCard = {
  id: string;
  title: string;
  description: string;
  cta: string;
  image: null; // placeholder for actual images
};

const ACTION_CARDS: ActionCard[] = [
  {
    id: '1',
    title: 'अपनी KYC अपडेट करें',
    description: 'चुने हुए विशेषज्ञों के पैनल से सही\nऔर भरोसेमंद मार्गदर्शन पाएं',
    cta: 'शुरू करें',
    image: null,
  },
  {
    id: '2',
    title: 'प्रोफाइल पूरा करें',
    description: 'अपनी प्रोफाइल पूरी करें और\nज्यादा जॉब पाएं',
    cta: 'शुरू करें',
    image: null,
  },
  {
    id: '3',
    title: 'ट्रेनिंग शुरू करें',
    description: 'फ्री ट्रेनिंग लें और अपनी\nस्किल्स बढ़ाएं',
    cta: 'शुरू करें',
    image: null,
  },
];

const JOB_CATEGORIES_LIGHT = [
  { id: '1', title: 'जापा', subtitle: 'Japa', icon: japaIcon, bgColor: '#F3F4F9' },
  { id: '2', title: 'नैनी', subtitle: 'Nanny', icon: nannyIcon, bgColor: '#FEF5F6' },
  { id: '3', title: 'बेबीसिटर', subtitle: 'Babysitter', icon: babySitterIcon, bgColor: '#FDF9F0' },
  { id: '4', title: 'बेबी मेड', subtitle: 'BabyMaid', icon: babyMaidIcon, bgColor: '#E7F0F4' },
];

const JOB_CATEGORIES_DARK = [
  { id: '1', title: 'जापा', subtitle: 'Japa', icon: japaIcon, bgColor: '#1B2838' },
  { id: '2', title: 'नैनी', subtitle: 'Nanny', icon: nannyIcon, bgColor: '#2A1B1E' },
  { id: '3', title: 'बेबीसिटर', subtitle: 'Babysitter', icon: babySitterIcon, bgColor: '#2A2418' },
  { id: '4', title: 'बेबी मेड', subtitle: 'BabyMaid', icon: babyMaidIcon, bgColor: '#1A2830' },
];

/* ── Icons ── */
function BellIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MenuIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12h18M3 6h18M3 18h18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LocationIcon({ color, strokeColor }: { color: string; strokeColor: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill={color}>
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0Z"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={3} stroke={strokeColor} strokeWidth={2} />
    </Svg>
  );
}

function StarIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
    </Svg>
  );
}

function ChevronRight({ color = '#1B7FF6' }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WaveLine() {
  return (
    <Svg width={32} height={18} viewBox="0 0 31.244 18.434" fill="none">
      <Path
        d="M-2893.9,22918.082s9.628,3.348,11.063-4.338,11.063-4.342,11.063-4.342,9.219.986,8.4-8.482"
        transform="translate(2894.061 -22900.877)"
        fill="none"
        stroke="#98C4F7"
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function JobTypeCard({
  badgeText,
  badgeSubText,
  title,
  subtitle,
  isDark,
  colors,
}: {
  badgeText: string;
  badgeSubText?: string;
  title: string;
  subtitle?: string;
  isDark: boolean;
  colors: any;
}) {
  return (
    <TouchableOpacity style={[styles.jobTypeCard, { backgroundColor: colors.card, borderColor: colors.textBlue }]} activeOpacity={0.8}>
      <View style={[styles.jobTypeInner, { backgroundColor: colors.cardInner }]}>
        <View style={styles.jobTypeLeft}>
          <View style={[styles.jobTypeBadge, { backgroundColor: colors.card }]}>
            <Text style={[styles.jobTypeBadgeText, { color: colors.textDark }]}>{badgeText}</Text>
            {badgeSubText && (
              <Text style={[styles.jobTypeBadgeSubText, { color: colors.textSecondary }]}>{badgeSubText}</Text>
            )}
          </View>
          <View>
            <Text style={[styles.jobTypeTitle, { color: colors.textDark }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.jobTypeSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            )}
          </View>
        </View>
        <View style={styles.jobTypeWaveContainer}>
          <WaveLine />
          <View style={{ marginTop: -8 }}>
            <WaveLine />
          </View>
        </View>
        <ChevronRight color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

export function HomeScreen() {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { handleScroll, hide, show } = useTabBarVisibility();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  function toggleTheme() {
    setThemeMode(themeMode === 'light' ? 'system' : 'light');
  }

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      show();
    });
    return unsubscribe;
  }, [navigation, show]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}>

        {/* ── Header wrapper ── */}
        <View style={styles.headerWrapper}>
          <View style={[styles.header, { backgroundColor: colors.background }]}>
            <MKCLogo width={90} height={40} />
            <View style={styles.headerRight}>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
                thumbColor={colors.switchThumb}
                style={styles.themeSwitch}
              />
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                <BellIcon color={colors.text} />
                <View style={[styles.bellBadge, { backgroundColor: colors.danger }]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={() => { hide(); navigation.navigate('ProfileSettings'); }}>
                <MenuIcon color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          {/* Bottom-only shadow */}
          <LinearGradient
            colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.02)', 'transparent']}
            style={styles.headerShadow}
          />
          {/* MKC Logo Icon — decorative, spans from avatar to header */}
          <MKCLogoIconBlue
            width={120}
            height={120}
            style={styles.logoIconOverlap}
          />
        </View>

        {/* ── User Card ── */}
        <View style={[styles.userCard, { backgroundColor: colors.background }]}>
          <View style={styles.userCardTop}>
            <View style={styles.userLeft}>
              <View style={[styles.avatar, { backgroundColor: colors.avatarBackground }]}>
                <Text style={[styles.avatarText, { color: colors.textMuted, backgroundColor: colors.avatarOverlay }]}>
                  {USER.initial}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.greeting, { color: colors.text }]}>
                  नमस्ते, {USER.name}!
                </Text>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusText, { color: colors.textMuted }]}>
                    स्टेटस: {USER.status}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.userRight}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                अंक: {USER.score}
              </Text>
              <View style={[styles.ratingBadge, { backgroundColor: colors.badgeSurface }]}>
                <StarIcon color={colors.accent} />
                <Text style={[styles.ratingText, { color: colors.textDark }]}>
                  {USER.rating}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.locationRow}>
            <LocationIcon color={colors.textBlue} strokeColor={colors.card} />
            <Text style={[styles.locationText, { color: colors.textMuted }]}>
              {USER.location}
            </Text>
          </View>
        </View>
        <View style={{ position: 'relative', }}>
          <BlurEllipse style={{ position: 'absolute', left: -92, top: -40 }} />
        </View>
        {/* <BlurEllipse style={{position: 'absolute',}}/> */}
        {/* ── Action Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            आपके लिए जरूरी कार्य
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            (Action for you)
          </Text>
        </View>

        {/* ── Action Cards Carousel ── */}
        <FlatList
          ref={flatListRef}
          data={ACTION_CARDS}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          contentContainerStyle={styles.carouselContainer}
          renderItem={({ item }) => (
            <View style={[styles.actionCard, { backgroundColor: colors.cardWarm }]}>
              <View style={styles.actionCardContent}>
                <Text style={[styles.actionTitle, { color: colors.textDark }]}>
                  {item.title}
                </Text>
                <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                  {item.description}
                </Text>
                <TouchableOpacity style={styles.actionCta} activeOpacity={0.7}>
                  <Text style={[styles.actionCtaText, { color: colors.primary }]}>{item.cta}</Text>
                  <ChevronRight color={colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.actionImagePlaceholder, { backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Image</Text>
              </View>
            </View>
          )}
        />

        {/* ── Job Categories ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>काम के प्रकार (Job categories)</Text>
        </View>
        <Text style={[styles.sectionDescription, { color: colors.textMuted, marginLeft: Spacing.md, marginBottom: Spacing.sm }]}>अपनी सुविधा के अनुसार काम चुनें, अप्लाई करें</Text>

        <View style={styles.jobCategoriesContainer}>
          {(isDark ? JOB_CATEGORIES_DARK : JOB_CATEGORIES_LIGHT).map(category => (
            <TouchableOpacity key={category.id} style={[styles.jobCategoryCard, { backgroundColor: category.bgColor }]} activeOpacity={0.8}>
              <View style={[styles.jobCategoryIcon,]}>
                <Image
                  source={category.icon}
                  style={{
                    width: 40,
                    height: 40,
                    // resizeMode: 'contain',
                  }}
                />
              </View>
              <Text style={[styles.jobCategoryTitle, { color: colors.textMuted }]}>{category.title}</Text>
              <Text style={[styles.jobCategorySubtitle, { color: colors.textMuted }]}>({category.subtitle})</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Job Type Cards ── */}
        <JobTypeCard
          badgeText="24"
          badgeSubText="Hrs"
          title="फुल-टाइम (24 घंटे) के काम"
          subtitle="जापा / नैनी / बेबीसिटर"
          isDark={isDark}
          colors={colors}
        />
        <JobTypeCard
          badgeText="10"
          badgeSubText="Hrs"
          title="पार्ट-टाइम (10 घंटे) के काम"
          subtitle="जापा / नैनी / बेबीसिटर"
          isDark={isDark}
          colors={colors}
        />

        {/* ── Decorative Icon ── */}
        <View style={styles.bottomIconContainer}>
          <LoginScreenBottomIcon width={250} height={320} />
        </View>

        {/* ── Help Card ── */}
        <LinearGradient
          colors={isDark ? ['#2A1F3D', '#1F2A3D', '#1B2838', '#243447'] : ['#CB9785', '#C4888F', '#A983B9', '#8B7FBF']}
          start={{ x: 0, y: 0.8 }}
          end={{ x: 1, y: 0.2 }}
          style={styles.helpCard}
        >
          {/* LEFT CONTENT */}
          <View style={styles.helpCardContent}>
            <Text style={styles.helpCardTitle}>
              क्या आपको मदद चाहिए?
            </Text>

            <Text style={styles.helpCardSubtitle}>
              हमारे जॉब सलाहकार आपकी मदद करने के{`\n`}लिए तैयार हैं।
            </Text>

            <View style={styles.helpButtonsContainer}>
              <TouchableOpacity style={[styles.helpButton, { backgroundColor: colors.accent }]}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={colors.textInverse} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={[styles.helpButtonText, { color: colors.textInverse }]}>
                  चैट करें
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.helpButton, { backgroundColor: colors.surface }]}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={[styles.helpButtonText, { color: colors.text }]}>
                  कॉल करें
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* RIGHT IMAGE */}
          <Image source={HelpWoman} style={styles.helpImage} resizeMode="contain" />

        </LinearGradient>
        {/* ── Decorative Icon Left (flipped) ── */}
        <View style={styles.bottomIconContainerLeft}>
          <LoginScreenBottomIcon width={250} height={320} />
        </View>

      </ScrollView>

      {Platform.OS === 'ios' && (
        <View style={[styles.statusBarOverlay, { height: insets.top }]}>
          <BlurView
            blurType={isDark ? 'dark' : 'light'}
            blurAmount={Platform.OS === 'ios' ? 35 : 16}
            reducedTransparencyFallbackColor={
              isDark ? 'rgba(13, 27, 42, 0.10)' : 'rgba(255, 255, 255, 0.10)'
            }
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.02)'
                  : 'rgba(255, 255, 255, 0.08)',
              },
            ]}
          />
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* ── Header ── */
  headerWrapper: {
    zIndex: 10,
    marginBottom: SECTION_GAP,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerShadow: {},
  logoIconOverlap: {
    position: 'absolute',
    left: -74,
    top: 28,
    zIndex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeSwitch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: BorderRadius.xs,
  },

  /* ── User Card ── */
  userCard: {
    paddingHorizontal: 14,
    borderRadius: BorderRadius.xl,
  },
  userCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    zIndex: 10
  },
  avatar: {
    borderRadius: BorderRadius.md,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 40,
    fontSize: 20,
    fontFamily: 'GolosText-Bold',
    fontWeight: '700',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '700',
    lineHeight: 26,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusText: {
    fontSize: FontSizes.caption,
    fontFamily: 'GolosText-Medium',
  },
  userRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  scoreLabel: {
    fontSize: FontSizes.caption,
    fontFamily: 'NotoSansDevanagari-Medium',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  ratingText: {
    fontSize: FontSizes.body,
    fontFamily: 'GolosText-SemiBold',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  locationText: {
    fontSize: FontSizes.body,
    fontFamily: 'GolosText-Medium',
  },

  /* ── Section ── */
  sectionHeader: {
    paddingHorizontal: 14,
    marginTop: SECTION_GAP,
    marginBottom: SECTION_CONTENT_GAP,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '700',
    lineHeight: 26,
  },
  sectionSubtitle: {
    fontSize: FontSizes.caption,
    fontFamily: 'GolosText-Regular',
    marginTop: 2,
  },

  /* ── Action Cards ── */
  carouselContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  actionCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    width: SW - Spacing.md * 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCardContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: FontSizes.title,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  actionDesc: {
    fontSize: FontSizes.sm,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  actionCta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCtaText: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  actionImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  sectionDescription: {
    fontSize: FontSizes.body,
    lineHeight: 20,
  },
  jobCategoriesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  jobCategoryCard: {
    width: (SW - Spacing.md * 2 - Spacing.md * 2) / 4,
    alignItems: 'center',
    padding: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  jobCategoryIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  jobCategoryTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  jobCategorySubtitle: {
    fontSize: 10,
  },
  jobTypeCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: 6,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  jobTypeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  jobTypeWaveContainer: {
    position: 'absolute',
    right: 55,
    top: '90%',
    marginTop: -18,
    opacity: 1,
  },
  jobTypeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobTypeBadge: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobTypeBadgeText: {
    fontSize: FontSizes.h1,
    fontWeight: 'bold',
  },
  jobTypeBadgeSubText: {
    fontSize: FontSizes.xs,
    marginTop: -4,
  },
  jobTypeTitle: {
    fontSize: FontSizes.body,
    fontWeight: '600',
  },
  jobTypeSubtitle: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  helpCard: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xxl,
    paddingLeft: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingRight: 0,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 2 },
    elevation: 10,
    marginTop: -80,
    zIndex: 2
  },
  helpCardContent: {
    flex: 1,
    zIndex: 1,
  },
  helpImage: {
    width: 130 * 0.85,
    height: 130,
  },
  helpCardTitle: {
    fontSize: FontSizes.subtitle,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
    color: '#FFF',
    fontFamily: 'NotoSansDevanagari-Bold',
  },
  helpCardSubtitle: {
    fontSize: FontSizes.sm,
    lineHeight: 18,
    marginBottom: Spacing.lg,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'NotoSansDevanagari-Regular',
  },
  helpButtonsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  helpButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  bottomIconContainer: {
    alignSelf: 'flex-end',
    marginRight: -45,
    marginTop: -225,
    marginBottom: 20,
  },
  bottomIconContainerLeft: {
    alignSelf: 'flex-start',
    marginLeft: -75,
    marginTop: -180,
    marginBottom: 20,
    zIndex: 1
  },
});
