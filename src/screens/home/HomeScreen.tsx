import React, { useRef, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth, useTheme } from '../../context';
import { useTabBarVisibility } from '../../context/TabBarVisibilityContext';
import type { AppStackParamList } from '../../navigation/types';
import { FontSizes, Spacing } from '../../constants';
import { MKCLogo } from '../../assets/images/MKCLogo';
import { MKCLogoIconBlue } from '../../assets/images/MKCLogoIconBlue';
import { BlurEllipse } from '../../components';
import HelpWoman from '../../assets/helpCardWomen.png';

const { width: SW } = Dimensions.get('window');

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

const JOB_CATEGORIES = [
  { id: '1', title: 'जापा', subtitle: 'Japa', icon: null, bgColor: '#F3F4F9' },
  { id: '2', title: 'नैनी', subtitle: 'Nanny', icon: null, bgColor: '#FEF5F6' },
  { id: '3', title: 'बेबीसिटर', subtitle: 'Babysitter', icon: null, bgColor: '#FDF9F0' },
  { id: '4', title: 'बेबी मेड', subtitle: 'BabyMaid', icon: null, bgColor: '#E7F0F4' },
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

function LocationIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="#4D99F1">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0Z"
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={3} stroke="#ffffff" strokeWidth={2} />
    </Svg>
  );
}

function StarIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="#F5A623">
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

export function HomeScreen() {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { handleScroll } = useTabBarVisibility();
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
                trackColor={{ false: '#D1D5DB', true: '#374151' }}
                thumbColor={isDark ? '#E5E7EB' : '#FFFFFF'}
                style={styles.themeSwitch}
              />
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                <BellIcon color={colors.text} />
                <View style={styles.bellBadge} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={() => navigation.navigate('ProfileSettings')}>
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
        <View style={styles.userCard}>
          <View style={styles.userCardTop}>
            <View style={styles.userLeft}>
              <View style={[styles.avatar, { backgroundColor: isDark ? '#374151' : '#C5D8F0' }]}>
                <Text style={[styles.avatarText, { color: isDark ? colors.textMuted : colors.textMuted, backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)' }]}>
                  {USER.initial}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.greeting, { color: isDark ? colors.text : colors.text }]}>
                  नमस्ते, {USER.name}!
                </Text>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusText, { color: isDark ? colors.textMuted : colors.textMuted }]}>
                    स्टेटस: {USER.status}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.userRight}>
              <Text style={[styles.scoreLabel, { color: isDark ? colors.textSecondary : '#4A6FA5' }]}>
                अंक: {USER.score}
              </Text>
              <View style={[styles.ratingBadge, { backgroundColor: isDark ? '#243447' : '#EEF2FF' }]}>
                <StarIcon />
                <Text style={[styles.ratingText, { color: isDark ? '#FFB74D' : '#1A3B70' }]}>
                  {USER.rating}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.locationRow}>
            <LocationIcon />
            <Text style={[styles.locationText, { color: isDark ? colors.textMuted : colors.textMuted }]}>
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
            <View style={[styles.actionCard, { backgroundColor: isDark ? '#1B2838' : '#FFF5E6' }]}>
              <View style={styles.actionCardContent}>
                <Text style={[styles.actionTitle, { color: isDark ? colors.text : '#1A3B70' }]}>
                  {item.title}
                </Text>
                <Text style={[styles.actionDesc, { color: isDark ? colors.textSecondary : '#5A7A9A' }]}>
                  {item.description}
                </Text>
                <TouchableOpacity style={styles.actionCta} activeOpacity={0.7}>
                  <Text style={styles.actionCtaText}>{item.cta}</Text>
                  <ChevronRight color="#1B7FF6" />
                </TouchableOpacity>
              </View>
              <View style={[styles.actionImagePlaceholder, { backgroundColor: isDark ? '#243447' : '#F0E0C8' }]}>
                <Text style={{ color: isDark ? colors.textMuted : '#A89070', fontSize: 12 }}>Image</Text>
              </View>
            </View>
          )}
        />

        {/* ── Job Categories ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>काम के प्रकार (Job categories)</Text>
        </View>
        <Text style={[styles.sectionDescription, { color: colors.textMuted, marginLeft: Spacing.md, marginBottom: Spacing.md }]}>अपनी सुविधा के अनुसार काम चुनें, अप्लाई करें</Text>

        <View style={styles.jobCategoriesContainer}>
          {JOB_CATEGORIES.map(category => (
            <TouchableOpacity key={category.id} style={[styles.jobCategoryCard, { backgroundColor: category.bgColor }]} activeOpacity={0.8}>
              <View style={[styles.jobCategoryIcon, { backgroundColor: isDark ? '#243447' : '#F3F4F6' }]}>
                <Text style={{ color: colors.textMuted }}>Icon</Text>
              </View>
              <Text style={[styles.jobCategoryTitle, { color: isDark ? colors.text : colors.textMuted }]}>{category.title}</Text>
              <Text style={[styles.jobCategorySubtitle, { color: isDark ? colors.textSecondary : colors.textMuted }]}>({category.subtitle})</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Job Type Cards ── */}
        <TouchableOpacity style={[styles.jobTypeCard, { backgroundColor: isDark ? '#1B2838' : '#EBF5FF' }]} activeOpacity={0.8}>
          <View style={styles.jobTypeLeft}>
            <View style={[styles.jobTypeBadge, { backgroundColor: isDark ? '#101D2C' : '#FFFFFF' }]}>
              <Text style={[styles.jobTypeBadgeText, { color: isDark ? colors.text : '#1A3B70' }]}>24</Text>
            </View>
            <View>
              <Text style={[styles.jobTypeTitle, { color: isDark ? colors.text : '#1A3B70' }]}>फुल-टाइम (24 घंटे) के काम</Text>
            </View>
          </View>
          <ChevronRight />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.jobTypeCard, { backgroundColor: isDark ? '#1B2838' : '#EBF5FF' }]} activeOpacity={0.8}>
          <View style={styles.jobTypeLeft}>
            <View style={[styles.jobTypeBadge, { backgroundColor: isDark ? '#101D2C' : '#FFFFFF' }]}>
              <Text style={[styles.jobTypeBadgeText, { color: isDark ? colors.text : '#1A3B70' }]}>10</Text>
              <Text style={[styles.jobTypeBadgeSubText, { color: isDark ? colors.textSecondary : '#5A7A9A' }]}>Hrs</Text>
            </View>
            <View>
              <Text style={[styles.jobTypeTitle, { color: isDark ? colors.text : '#1A3B70' }]}>पार्ट-टाइम (10 घंटे) के काम</Text>
              <Text style={[styles.jobTypeSubtitle, { color: isDark ? colors.textSecondary : '#5A7A9A' }]}>जापा / नैनी / बेबीसिटर</Text>
            </View>
          </View>
          <ChevronRight />
        </TouchableOpacity>

        {/* ── Help Card ── */}
        <LinearGradient
          colors={['#CB9785', '#C4888F', '#A983B9', '#8B7FBF']}
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
              हमारे जॉब सलाहकार आपकी मदद करने के लिए तैयार हैं।
            </Text>

            <View style={styles.helpButtonsContainer}>
              <TouchableOpacity style={[styles.helpButton, { backgroundColor: '#FBBF24' }]}>
                <Text style={[styles.helpButtonText, { color: '#000' }]}>
                  चैट करें
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.helpButton, { backgroundColor: '#374151' }]}>
                <Text style={[styles.helpButtonText, { color: '#FFF' }]}>
                  कॉल करें
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* RIGHT IMAGE */}
          <Image source={HelpWoman} style={styles.helpImage} resizeMode="contain" />

        </LinearGradient>

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
    marginBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    // zIndex: 10,
  },
  headerShadow: {
    // height: 4,
    // zIndex: 9,
  },
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
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },

  /* ── User Card ── */
  userCard: {
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'white',
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
    borderRadius: 10,
    padding: 4,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 8,
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
    marginTop: 54,
    marginBottom: 4
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
    borderRadius: 16,
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
    color: '#1B7FF6',
    fontSize: FontSizes.body,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  actionImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
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
    borderRadius: 10,
  },
  jobCategoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  jobTypeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobTypeBadge: {
    width: 60,
    height: 60,
    borderRadius: 12,
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
    borderRadius: 20,
    padding: Spacing.lg,
    flexDirection: 'row',
    marginBottom: 120,
  },
  helpCardContent: {
    flex: 1,
  },
  helpImage: {
    width: 200,
    height: 200,
  },
  helpCardTitle: {
    fontSize: FontSizes.title,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  helpCardSubtitle: {
    fontSize: FontSizes.sm,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  helpButtonsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  helpButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
  },
  helpButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  helpCardImage: {
    width: 100,
    height: 120,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
