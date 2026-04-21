/**
 * LocationPermissionScreen (AppStack)
 *
 * Gate screen shown after login when location permission is not yet "Always".
 * Strict flow: only proceeds when ACCESS_BACKGROUND_LOCATION is granted.
 * On Android 11+ the user MUST enable it from Settings — we show clear instructions.
 * AppState listener auto-detects when user returns and re-checks permissions.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Dimensions,
  Easing,
  Linking,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Circle, Defs, ClipPath, G, Path} from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useAuth, useTheme} from '../../context';
import {FontSizes, BorderRadius} from '../../constants';
import {MKCLogoIconBlue} from '../../assets/images/MKCLogoIconBlue';
import {LoginScreenMomWithBaby} from '../../assets/images/LoginScreenMomWithBaby';
import {BottomRightDecoration} from '../../components/BottomRightDecoration';
import {LoginScreenBottomIcon} from '../../assets/images/LoginScreenBottomIcon';

const {width: SW} = Dimensions.get('window');

type PermState = 'initial' | 'fineOnly' | 'denied';

/* ── Animated map-radar with MKC logo ── */
const RadarGraphic = React.memo(function RadarGraphic({size}: {size: number}) {
  const {colors, isDark} = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ).start();
  }, [pulse]);

  const bg = isDark ? colors.surface : colors.onboardingBackground;
  const road = isDark ? colors.decorativeLine : colors.decorativeLine;

  return (
    <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 0.65,
          height: size * 0.65,
          borderRadius: size * 0.325,
          borderWidth: 2,
          borderColor: colors.primary,
          opacity: pulse.interpolate({inputRange: [0, 1], outputRange: [0.7, 0]}),
          transform: [{scale: pulse.interpolate({inputRange: [0, 1], outputRange: [0.6, 1.4]})}],
        }}
      />
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id="clip">
            <Circle cx="50" cy="50" r="50" />
          </ClipPath>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={bg} />
        <G clipPath="url(#clip)" stroke={road} strokeWidth="1.2" fill="none">
          <Path d="M10 20Q30 40 50 10" />
          <Path d="M-10 50Q40 40 70-10" />
          <Path d="M20 110Q50 60 110 50" />
          <Path d="M80 110Q70 60 110 20" />
          <Path d="M10 80Q40 90 60 110" />
          <Path d="M-10 30Q30 70 80 90" />
        </G>
      </Svg>
      <View style={{position: 'absolute'}}>
        <MKCLogoIconBlue width={44} height={44} />
      </View>
    </View>
  );
});

/* ══════════════════════════════════════════════════════════════
   Helper: check if both fine + background are granted
   ══════════════════════════════════════════════════════════════ */
async function checkAllPermissions(): Promise<{fine: boolean; background: boolean}> {
  if (Platform.OS !== 'android') return {fine: true, background: true};
  const fine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  if (!fine) return {fine: false, background: false};
  const apiLevel = Number(Platform.Version);
  if (apiLevel < 29) return {fine: true, background: true}; // pre-Q: fine = always
  const background = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
  return {fine, background};
}

/* ══════════════════════════════════════════════════════════════
   SCREEN
   ══════════════════════════════════════════════════════════════ */
export function LocationPermissionScreen() {
  const {colors, isDark} = useTheme();
  const {setHasLocationPermission} = useAuth();
  const [loading, setLoading] = useState(false);
  const [permState, setPermState] = useState<PermState>('initial');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const appStateRef = useRef(AppState.currentState);
  const checkingRef = useRef(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {toValue: 1, duration: 500, useNativeDriver: true}).start();
  }, [fadeAnim]);

  /* Centralised permission check — called on mount + on app-resume */
  const verifyPermissions = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const {fine, background} = await checkAllPermissions();
      if (fine && background) {
        await setHasLocationPermission(true); // gate opens → AppStack renders next screen
      } else if (fine && !background) {
        setPermState('fineOnly');
      }
      // if !fine stay on current state (initial or denied)
    } finally {
      checkingRef.current = false;
    }
  }, [setHasLocationPermission]);

  /* Check on mount */
  useEffect(() => {
    verifyPermissions();
  }, [verifyPermissions]);

  /* Auto re-check when returning from Settings */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        verifyPermissions();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [verifyPermissions]);

  /* ── CTA handler ── */
  const handlePress = useCallback(async () => {
    // If we already need to go to Settings
    if (permState === 'fineOnly' || permState === 'denied') {
      Linking.openSettings();
      return;
    }

    if (Platform.OS !== 'android') {
      await setHasLocationPermission(true);
      return;
    }

    setLoading(true);
    const apiLevel = Number(Platform.Version);

    try {
      /* ── Step 1: Request fine location ── */
      const fineResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'लोकेशन की अनुमति',
          message: 'आपके आस-पास उपलब्ध जॉब्स दिखाने के लिए लोकेशन आवश्यक है।',
          buttonPositive: 'अनुमति दें',
          buttonNegative: 'रद्द करें',
        },
      );

      if (fineResult !== PermissionsAndroid.RESULTS.GRANTED) {
        setLoading(false);
        setPermState(
          fineResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'denied' : 'initial',
        );
        return;
      }

      /* ── Step 2: Background / "Always" permission ── */
      if (apiLevel === 29) {
        // Android 10: can request background in same flow
        const bgResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        );
        setLoading(false);
        if (bgResult === PermissionsAndroid.RESULTS.GRANTED) {
          await setHasLocationPermission(true);
        } else {
          setPermState('fineOnly');
        }
        return;
      }

      // Android 11+: cannot request background programmatically
      // Must check if already granted, else send to Settings
      setLoading(false);
      const bgGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      );
      if (bgGranted) {
        await setHasLocationPermission(true);
      } else {
        setPermState('fineOnly');
      }
    } catch {
      setLoading(false);
    }
  }, [permState, setHasLocationPermission]);

  /* ── UI text ── */
  let heading = '';
  let subtitle = '';
  let buttonLabel = '';
  let buttonIcon = '';

  switch (permState) {
    case 'initial':
      heading = 'अपने आस-पास के काम देखने\nके लिए लोकेशन Allow करें';
      subtitle = 'नज़दीकी जॉब्स दिखाने के लिए आपकी लोकेशन जरूरी है';
      buttonLabel = 'Allow करें';
      buttonIcon = 'location-outline';
      break;
    case 'fineOnly':
      heading = '"हमेशा अनुमति दें" चालू करें';
      subtitle = '';
      buttonLabel = 'सेटिंग्स खोलें';
      buttonIcon = 'settings-outline';
      break;
    case 'denied':
      heading = 'लोकेशन की अनुमति चालू करें';
      subtitle = '';
      buttonLabel = 'सेटिंग्स में जाएं';
      buttonIcon = 'settings-outline';
      break;
  }

  return (
    <SafeAreaView style={[st.safe, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <Animated.View style={[st.body, {opacity: fadeAnim}]}>
        {/* ── Hero ── */}
        <View style={st.heroSection}>
          <LoginScreenMomWithBaby width={SW * 0.8} height={SW * 0.62} />
        </View>

        {/* ── Heading ── */}
        <Text style={[st.heading, {color: colors.text}]}>{heading}</Text>
        {subtitle ? <Text style={[st.sub, {color: colors.textMuted}]}>{subtitle}</Text> : null}

        {/* ── Instructions / Radar ── */}
        {permState === 'fineOnly' || permState === 'denied' ? (
          <View style={[st.instructionCard, {backgroundColor: isDark ? colors.surface : colors.onboardingBackground}]}>
            <Text style={[st.instructionTitle, {color: colors.text}]}>
              {permState === 'fineOnly' ? 'सेटिंग्स में ये करें:' : 'लोकेशन चालू करने के लिए:'}
            </Text>
            {[
              {step: '1', text: '"Permissions" (अनुमतियां) पर टैप करें'},
              {step: '2', text: '"Location" (लोकेशन) पर टैप करें'},
              {step: '3', text: '"Allow all the time"\n(हमेशा अनुमति दें) चुनें'},
            ].map(item => (
              <View key={item.step} style={st.instructionRow}>
                <View style={[st.stepCircle, {backgroundColor: colors.iconBlue}]}>
                  <Text style={st.stepNumber}>{item.step}</Text>
                </View>
                <Text style={[st.instructionText, {color: colors.textMuted}]}>{item.text}</Text>
              </View>
            ))}
            <View style={st.autoRefreshBadge}>
              <Ionicons name="refresh-circle-outline" size={16} color={colors.success} />
              <Text style={[st.autoRefreshText, {color: colors.success}]}>
                अनुमति देने के बाद ऑटो-रिफ्रेश होगा
              </Text>
            </View>
          </View>
        ) : (
          <View style={[st.radarCard, {backgroundColor: isDark ? colors.surface : colors.onboardingBackground}]}>
            <RadarGraphic size={110} />
          </View>
        )}

        <View style={{flex: 1}} />

        {/* ── CTA ── */}
        <TouchableOpacity
          style={[st.ctaBtn, {backgroundColor: colors.iconBlue, shadowColor: colors.primary}]}
          activeOpacity={0.85}
          onPress={handlePress}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.buttonPrimaryText} />
          ) : (
            <View style={st.ctaBtnInner}>
              <Ionicons name={buttonIcon} size={18} color={colors.buttonPrimaryText} style={{marginRight: 8}} />
              <Text style={[st.ctaText, {color: colors.buttonPrimaryText}]}>{buttonLabel}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <BottomRightDecoration icon={<LoginScreenBottomIcon width={280} height={280} />} />
    </SafeAreaView>
  );
}

/* ── Styles ── */
const st = StyleSheet.create({
  safe: {flex: 1},
  body: {flex: 1, alignItems: 'center', paddingHorizontal: 24},

  heroSection: {alignItems: 'center', justifyContent: 'center', height: SW * 0.72, marginTop: 8},

  heading: {fontSize: FontSizes.h2, fontWeight: '800', textAlign: 'center', marginBottom: 8, lineHeight: 32},
  sub: {fontSize: FontSizes.caption, textAlign: 'center', lineHeight: 22, marginBottom: 4, paddingHorizontal: 16},

  radarCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.xxl,
    marginTop: 16,
    width: '100%',
  },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 54,
    borderRadius: BorderRadius.button,
    marginBottom: 32,
    elevation: 3,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  ctaBtnInner: {flexDirection: 'row', alignItems: 'center'},
  ctaText: {fontSize: FontSizes.button, fontWeight: '700'},

  instructionCard: {width: '100%', padding: 20, borderRadius: BorderRadius.xxl, marginTop: 16},
  instructionTitle: {fontSize: FontSizes.subtitle, fontWeight: '700', marginBottom: 16},
  instructionRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12},
  stepCircle: {width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  stepNumber: {color: '#fff', fontSize: FontSizes.sm, fontWeight: '700'},
  instructionText: {fontSize: FontSizes.caption, flex: 1, lineHeight: 22},
  autoRefreshBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  autoRefreshText: {fontSize: FontSizes.sm, fontWeight: '600'},
});
