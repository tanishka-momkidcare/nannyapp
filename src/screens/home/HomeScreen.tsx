import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  UIManager,
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
import { fetchVendorHome } from '../../services/authApi';
import type { VendorHomeLocation } from '../../services/authApi';
import { MKCLogo } from '../../assets/images/MKCLogo';
import { MKCLogoIconBlue } from '../../assets/images/MKCLogoIconBlue';
import { BlurEllipse, SoftCircle } from '../../components';
import { LoginScreenBottomIcon } from '../../assets/images/LoginScreenBottomIcon';
import HelpWoman from '../../assets/helpCardWomen.png';
import japaIcon from '../../assets/JapaIcon.png';
import nannyIcon from '../../assets/nannyIcon.png';
import babySitterIcon from '../../assets/babySitterIcon.png';
import babyMaidIcon from '../../assets/babyMaidIcon.png';
import momWithBabyBg from '../../assets/joyful-mother-with-baby.png';
import pencilImage from '../../assets/pencilImage.png';

const { width: SW } = Dimensions.get('window');
const SECTION_GAP = 32;
const SECTION_CONTENT_GAP = 8;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_ANIM_CONFIG = {
  duration: 280,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
} as const;

function FaqItem({
  item,
  index,
  isLast,
  isExpanded,
  onToggle,
  colors,
}: {
  item: { q: string; a: string };
  index: number;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  colors: any;
}) {
  const rotation = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: isExpanded ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <>
      <TouchableOpacity style={styles.faqItem} activeOpacity={0.7} onPress={onToggle}>
        <Text style={[styles.faqQuestion, { color: colors.textMuted }]}>{item.q}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M6 9l6 6 6-6" stroke={colors.textBlue} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </TouchableOpacity>
      {isExpanded && (
        <Text style={[styles.faqAnswer, { color: colors.textMuted }]}>{item.a}</Text>
      )}
      {!isLast && <View style={[styles.faqDivider, { backgroundColor: colors.inputBorder }]} />}
    </>
  );
}

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

function ReferralIcon() {
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#4A90D9" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={8.5} cy={7} r={4} stroke="#4A90D9" strokeWidth={1.5} />
      <Path d="M20 8v6M17 11h6" stroke="#4A90D9" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const BENEFIT_SLIDES = [
  {
    id: '1',
    title: 'चिकित्सा बीमा सुविधा',
    subtitle: 'आपकी सुरक्षा हमारे लिए महत्वपूर्ण है',
    desc: 'बीमा से जुड़े सभी दस्तावेज़ यहाँ देखें और डाउनलोड करें',
    cta: 'डाउनलोड करें',
    bgColor: '#E3EDFC',
    btnColor: '#E07A2F',
    image: HelpWoman,
    icon: null,
  },
  {
    id: '2',
    title: '₹1000 तक बोनस कमाएं!',
    subtitle: 'अपनी सहेली को हमारे साथ काम दिलवाएं और बोनस पाएं।',
    desc: null,
    cta: 'रेफर करें',
    bgColor: '#E3EDFC',
    btnColor: '#1B7FF6',
    image: null,
    icon: <ReferralIcon />,
  },
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
  const { signOut, vendorName, vendorMobile, vendorLocation, updateVendorLocation, signIn } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { handleScroll, hide, show } = useTabBarVisibility();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const toggleFaq = useCallback((index: number) => {
    LayoutAnimation.configureNext(FAQ_ANIM_CONFIG);
    setExpandedFaq(prev => (prev === index ? null : index));
  }, []);
  const [homeVendorName, setHomeVendorName] = useState<string | null>(null);
  const [primaryLocation, setPrimaryLocation] = useState<VendorHomeLocation | null>(null);
  const [secondaryLocations, setSecondaryLocations] = useState<VendorHomeLocation[]>([]);

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
      setExpandedFaq(0);
      void loadHomeData();
    });
    return unsubscribe;
  }, [navigation, show]);

  async function loadHomeData() {
    try {
      const home = await fetchVendorHome();
      const fullName = [home.vendor.firstName, home.vendor.lastName].filter(Boolean).join(' ');
      setHomeVendorName(fullName || null);
      setPrimaryLocation(home.primaryLocation);
      setSecondaryLocations(home.secondaryLocations);
      // Keep local auth context in sync
      if (home.primaryLocation) {
        await updateVendorLocation(home.primaryLocation.address);
      }
    } catch (err: any) {
      if (__DEV__) console.warn('[HomeScreen] fetchVendorHome error:', err?.message);
    }
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
              {/* <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
                thumbColor={colors.switchThumb}
                style={styles.themeSwitch}
              />
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                <BellIcon color={colors.text} />
                <View style={[styles.bellBadge, { backgroundColor: colors.danger }]} />
              </TouchableOpacity> */}
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
                  {(vendorName || vendorMobile || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.greeting, { color: colors.text }]}>
                  नमस्ते, {homeVendorName || vendorName || vendorMobile || 'User'}!
                </Text>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusText, { color: colors.textMuted }]}>
                    स्टेटस: Onboarded
                  </Text>
                </View>
              </View>
            </View>
            {/* <View style={styles.userRight}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                अंक: --
              </Text>
              <View style={[styles.ratingBadge, { backgroundColor: colors.badgeSurface }]}>
                <StarIcon color={colors.accent} />
                <Text style={[styles.ratingText, { color: colors.textDark }]}>
                  --
                </Text>
              </View>
            </View> */}
          </View>
          <View style={styles.locationBlock}>
            <View style={styles.locationRow}>
              <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>Job Location</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => navigation.navigate('EditLocation')}>
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                  <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
            </View>
            <View style={styles.locationAddressRow}>
              <LocationIcon color={colors.textBlue} strokeColor={colors.card} />
              <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                {primaryLocation?.address || vendorLocation || 'Location not set'}
              </Text>
            </View>
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
        <View
          // colors={isDark ? ['#2A1F3D', '#1F2A3D', '#1B2838', '#243447'] : ['#CB9785', '#C4888F', '#A983B9', '#8B7FBF']}
          // start={{ x: 0, y: 0.8 }}
          // end={{ x: 1, y: 0.2 }}
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

        </View>

        {/* ── Benefits & Services Block (as provided design) ── */}
        <LinearGradient
          colors={isDark ? ['#222', '#111'] : ['#F2F7FF', '#FCF2F0', '#FDF4F0', '#FCF4EA', '#FBEDDA']}
          locations={[0, 0.4, 0.5, 0.6, 1]}
          style={[styles.benefitsBlock]}>
          <View style={styles.sectionHeaderMini}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>आपके लिए खास फायदे और सुविधाएं</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.text }]}> (Benefits & Services, Just for You)</Text>
          </View>

          <FlatList
            data={BENEFIT_SLIDES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            snapToInterval={SW - 32 + 12}
            decelerationRate="fast"
            contentContainerStyle={styles.benefitSliderContainer}
            style={{ marginHorizontal: -16 }}
            renderItem={({ item }) => {
              const content = (
                <>
                  {item.id === '1' && <SoftCircle size={300} style={styles.benefitOfferCircle} />}
                  {item.image ? (
                    <Image source={item.image} style={styles.benefitOfferImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.benefitOfferIconWrap}>
                      {item.icon}
                    </View>
                  )}
                  <View style={styles.benefitOfferLeft}>
                    <Text style={[styles.benefitOfferTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.benefitOfferSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                    {item.desc ? (
                      <Text style={[styles.benefitOfferDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                    ) : null}
                    <TouchableOpacity style={[styles.benefitOfferBtn, item.btnColor ? { backgroundColor: item.btnColor } : {}]} activeOpacity={0.8}>
                      <Text style={styles.benefitOfferBtnText}>{item.cta}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );

              if (item.id === '2') {
                return (
                  <LinearGradient colors={['#DAE4F9', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.benefitOfferCard}>
                    {content}
                  </LinearGradient>
                );
              }

              return (
                <View style={[styles.benefitOfferCard, { backgroundColor: item.bgColor }]}>
                  {content}
                </View>
              );
            }}
          />
          <View style={[styles.noticeCard, { backgroundColor: '#FFEAEA' }]}>
            <View style={styles.noticeIconCircle}>
              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                <Path d="M12 8v4m0 4h.01M10.29 3.86l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.71-3.14l-8-14a2 2 0 0 0-3.42 0z" stroke="#FF6B6B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.noticeTitle, { color: colors.text }]}>सुरक्षित और समय पर भुगतान</Text>
              <Text style={[styles.noticeText, { color: colors.textMuted }]}>हर महीने बिना किसी देरी के सीधे आपके बैंक खाते में आपकी मेहनत की कमाई सुरक्षित रूप से प्राप्त करें।</Text>
            </View>
            <ChevronRight color={colors.textMuted} />
          </View>
          <View style={[styles.jobsGivenCard]}>
            <Text style={styles.jobsGivenPrefix}>MomKidCare क्यों चुनें?</Text>
            <Text style={styles.jobsGivenNumber}>5000+</Text>
            <Text style={styles.jobsGivenSuffix}>Jobs given</Text>
          </View>
        </LinearGradient>

        {/* ── "Why MomKidCare" card — image + stats ── */}
        <View style={styles.jobsGivenOverlay}>
          <Image source={momWithBabyBg} style={styles.jobsGivenBgImage} resizeMode="contain" />
          <View style={styles.jobsGivenStats}>
            {/* Layer 1: Blur */}
            <BlurView
              blurType="light"
              blurAmount={30}
              reducedTransparencyFallbackColor="rgba(26, 26, 26, 0.8)"
              style={StyleSheet.absoluteFill}
            />
            {/* Layer 2: Gradient overlay */}
            <LinearGradient
              colors={['rgba(91,74,58,0.5)', 'rgba(26,26,26,0.7)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Layer 3: Content */}
            <View style={styles.jobsStatRow}>
              <View style={styles.jobsStatIconCircle}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#FFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Circle cx={9} cy={7} r={4} stroke="#FFF" strokeWidth={2} />
                  <Path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#FFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#FFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <Text style={styles.jobsStatText}>महिलाओं के लिए, महिलाओं द्वारा</Text>
            </View>
            <View style={styles.jobsStatRow}>
              <View style={styles.jobsStatIconCircle}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="#FFF">
                  <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
                </Svg>
              </View>
              <Text style={styles.jobsStatText}>100% सुरक्षित व वेरीफाइड जॉब्स</Text>
            </View>
            <View style={styles.jobsStatRow}>
              <View style={styles.jobsStatIconCircle}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Circle cx={12} cy={12} r={10} stroke="#FFF" strokeWidth={2} />
                  <Circle cx={12} cy={12} r={3} fill="#FFF" />
                </Svg>
              </View>
              <Text style={styles.jobsStatText}>10000+ Client Served in NCR</Text>
            </View>
            {/* Description */}
            <Text style={styles.jobsStatDescription}>
              हमारा अत्याधुनिक प्लेटफॉर्म बेहद सुरक्षित और प्रमाणित केयरगिविंग सेवाएं प्रदान करता है। यह बेहतरीन पेशेवर मानकों के साथ काम करता है, जिससे एक ऐसा संतुलित और सुरक्षित माहौल बनता है जहाँ हर परिवार बेफिक्र रह सके।
            </Text>
          </View>
        </View>

        {/* ── FAQ Section ── */}
        <View style={styles.faqSection}>
          <View style={[styles.faqCard, { backgroundColor: '#ECF4FB' }]}>
            <Image source={pencilImage} style={styles.faqBgImage} resizeMode="contain" />
            <View style={styles.faqContent}>
              <Text style={[styles.sectionTitle, styles.faqTitle, { color: colors.textBlue }]}>अक्सर पूछे जाने वाले प्रश्न</Text>
              {[
                {
                  q: 'मुझे सैलरी कैसे और कब मिलेगी?',
                  a: 'पहले महीने की सैलरी आपको हमारे माध्यम से आपके बैंक अकाउंट में ट्रांसफर की जाएगी। इसके बाद, दूसरे महीने से आपकी सैलरी सीधे क्लाइंट द्वारा दी जाएगी, जो बैंक ट्रांसफर या कैश के रूप में हो सकती है।',
                },
                {
                  q: 'क्या मैं पार्ट-टाइम काम कर सकती हूँ?',
                  a: 'हाँ, आप पार्ट-टाइम काम कर सकती हैं। हमारे पास 8 घंटे, 10 घंटे और 24 घंटे (फुल-टाइम/लाइव-इन) काम के विकल्प उपलब्ध हैं। इसके अलावा, मदर-बेबी मसाज के लिए 2 घंटे का काम भी उपलब्ध है। आप अपनी सुविधा और अनुभव के अनुसार इनमें से कोई भी विकल्प चुन सकती हैं।',
                },
                {
                  q: 'क्या मुझे अपने आसपास काम मिलेगा?',
                  a: 'हाँ, आपको अपने आसपास काम मिल सकता है। यदि आप 24 घंटे (लाइव-इन) काम चाहती हैं, तो 1–2 दिनों में काम मिल सकता है। यदि आप 10 घंटे का काम 5–6 किमी के अंदर करना चाहती हैं, तो 2–3 दिनों में काम दिलाने की कोशिश की जाती है। बेहतर रिजल्ट के लिए लोकेशन और उपलब्धता थोड़ी फ्लेक्सिबल रखें।',
                },
                {
                  q: 'अगर मुझे जॉब पसंद न आए या कोई इमरजेंसी की स्थिति बन जाए तो मुझे क्या करना चाहिए?',
                  a: 'अगर जॉब पसंद न आए या क्लाइंट के साथ कोई समस्या हो, तो चिंता न करें। जॉब शुरू होने से पहले इंटरव्यू कराया जाता है ताकि दोनों एक-दूसरे को समझ सकें। जॉब के दौरान कोई समस्या आने पर आप तुरंत MomKidCare टीम से संपर्क कर सकती हैं। किसी भी इमरजेंसी या पारिवारिक स्थिति में हम आपकी पूरी मदद करते हैं और सुरक्षित व सही काम दिलाने की कोशिश करते हैं।',
                },
              ].map((item, index, arr) => (
                <FaqItem
                  key={index}
                  item={item}
                  index={index}
                  isLast={index === arr.length - 1}
                  isExpanded={expandedFaq === index}
                  onToggle={() => toggleFaq(index)}
                  colors={colors}
                />
              ))}
            </View>
          </View>

          {/* Decorative icon */}
          <View style={styles.faqDecorIcon}>
            <LoginScreenBottomIcon width={180} height={230} />
          </View>
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
    paddingHorizontal: Spacing.md,
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
    paddingHorizontal: Spacing.md,
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
  locationBlock: {
    marginTop: 12,
    gap: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationLabel: {
    fontSize: FontSizes.caption,
    fontFamily: 'GolosText-SemiBold',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  locationAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    fontSize: FontSizes.body,
    fontFamily: 'GolosText-Medium',
    flex: 1,
  },

  /* ── Section ── */
  sectionHeader: {
    paddingHorizontal: Spacing.md,
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
    backgroundColor: '#0F182B',
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

  benefitsBlock: {
    marginTop: SECTION_GAP,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: 260,
  },
  sectionHeaderMini: {
    marginTop: SECTION_GAP,
    marginBottom: Spacing.md,
    textAlign: 'center',
    flexDirection: 'column',
    alignItems: 'center',
  },
  benefitSliderContainer: {
    gap: 12,
    paddingHorizontal: 16,
  },
  benefitOfferCard: {
    borderRadius: BorderRadius.xl,
    padding: 16,
    minHeight: 180,
    width: SW - 32,
    overflow: 'hidden',
    position: 'relative',
  },
  benefitOfferCircle: {
    position: 'absolute',
    right: -160,
    top: -60,
  },
  benefitOfferLeft: {
    flex: 1,
    zIndex: 2,
    paddingRight: 80,
  },
  benefitOfferIconWrap: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    zIndex: 1,
  },
  benefitOfferTitle: {
    fontSize: 20,
    fontFamily: 'NotoSansDevanagari-Bold',
    fontWeight: '700',
    lineHeight: 28,
  },
  benefitOfferSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: 'NotoSansDevanagari-Regular',
    lineHeight: 18,
  },
  benefitOfferDesc: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'NotoSansDevanagari-Regular',
    lineHeight: 18,
  },
  benefitOfferBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#E07A2F',
  },
  benefitOfferBtnText: {
    fontSize: 13,
    fontFamily: 'GolosText-SemiBold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  benefitOfferImage: {
    width: 140,
    height: 160,
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  badge67Wrap: {
    alignItems: 'flex-end',
    marginTop: -8,
    marginBottom: -4,
    zIndex: 3,
  },
  badge67: {
    width: 34,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E169FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SECTION_GAP,
  },
  noticeIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTitle: {
    fontSize: FontSizes.body,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '700',
  },
  noticeText: {
    fontSize: FontSizes.sm,
    marginTop: 2,
    lineHeight: 15,
    fontFamily: 'NotoSansDevanagari-Regular',
  },
  jobsGivenCard: {
    borderRadius: BorderRadius.xl,
    padding: 12,
    zIndex: 1,
  },
  jobsGivenOverlay: {
    marginHorizontal: Spacing.md,
    marginTop: -294,
    height: 500,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    zIndex: 999
  },
  jobsGivenBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SW - 1,
    height: (SW - 1) * 0.85,
  },
  jobsGivenPrefix: {
    fontSize: FontSizes.subtitle,
    fontFamily: 'GolosText-SemiBold',
    fontWeight: '700',
    color: '#333',
  },
  jobsGivenNumber: {
    marginTop: 6,
    fontSize: 70,
    lineHeight: 60,
    fontFamily: 'GolosText-Bold',
    fontWeight: '800',
    color: '#D6D6D6',
  },
  jobsGivenSuffix: {
    fontSize: 40,
    lineHeight: 36,
    fontFamily: 'GolosText-SemiBold',
    fontWeight: '700',
    color: '#D6D6D6',
  },
  jobsGivenStats: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
    overflow: 'hidden',
  },
  jobsStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jobsStatIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobsStatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'NotoSansDevanagari-Medium',
    flex: 1,
    lineHeight: 20,
  },
  jobsStatDescription: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily: 'NotoSansDevanagari-Regular',
    lineHeight: 19,
    textAlign: 'center',
  },

  /* ── FAQ Section ── */
  faqSection: {
    paddingHorizontal: Spacing.md,
    marginTop: SECTION_GAP + 80,
    marginBottom: Spacing.md,
  },
  faqBgImage: {
    position: 'absolute',
    right: 6,
    top: '60%',
    width: SW * 0.75,
    height: SW * 0.4,
    transform: [{ translateY: -(SW * 0.4) / 2 }],
    opacity: 1,
    zIndex: 1,
  },
  faqCard: {
    marginTop: 14,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  faqContent: {
    zIndex: 2,
  },
  faqTitle: {
    marginBottom: 8,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: FontSizes.body,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '700',
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: FontSizes.sm,
    fontFamily: 'NotoSansDevanagari-Regular',
    lineHeight: 20,
    paddingBottom: 12,
  },
  faqDivider: {
    height: StyleSheet.hairlineWidth,
  },
  faqDecorIcon: {
    alignSelf: 'flex-end',
    marginRight: -Spacing.md,
    marginTop: -60,
    opacity: 0.15,
  },
});
