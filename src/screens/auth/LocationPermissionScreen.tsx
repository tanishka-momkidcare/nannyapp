import React, {useCallback, useEffect, useRef, useState} from 'react';
import Geolocation from '@react-native-community/geolocation';
import {
  ActivityIndicator,
  Animated,
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
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Svg, {Circle, Defs, ClipPath, G, Path} from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../context';
import {FontSizes, GOOGLE_MAPS_API_KEY, reverseGeocode} from '../../constants';
import type {AuthStackParamList} from '../../navigation/types';
import {MKCLogoIconBlue} from '../../assets/images/MKCLogoIconBlue';
import {LoginScreenMomWithBaby} from '../../assets/images/LoginScreenMomWithBaby';
import {BottomRightDecoration} from '../../components/BottomRightDecoration';
import {LoginScreenBottomIcon} from '../../assets/images/LoginScreenBottomIcon';

const {width: SW} = Dimensions.get('window');
type Props = NativeStackScreenProps<AuthStackParamList, 'LocationPermission'>;

type PermState = 'initial' | 'notGranted' | 'denied';

/* ── Animated map-radar with MKC logo ── */
function RadarGraphic({size}: {size: number}) {
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

  const bg = isDark ? '#2C2C2E' : '#F5F8FF';
  const road = isDark ? '#3C3C3E' : '#DEE8F5';

  return (
    <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>

      <Animated.View
        style={{
          position: 'absolute',
          width: size * 0.65,
          height: size * 0.65,
          borderRadius: size * 0.325,
          borderWidth: 2,
          borderColor: '#1B7FF6',
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
}

const MemoRadarGraphic = React.memo(RadarGraphic);

async function reverseGeocodeLocal(lat: number, lng: number): Promise<string> {
  const result = await reverseGeocode(lat, lng);
  return result || '';
}

/* ════════════════════════  SCREEN  ════════════════════════ */
export function LocationPermissionScreen({navigation}: Props) {
  const {colors, isDark} = useTheme();
  const [loading, setLoading] = useState(false);
  const [permState, setPermState] = useState<PermState>('initial');
  const [detectedAddress, setDetectedAddress] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const fetchLocationAndNavigate = useCallback(async () => {
    setLoading(true);
    setDetectedAddress('');
    try {
      const pos: {lat: number; lng: number} = await new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          p => resolve({lat: p.coords.latitude, lng: p.coords.longitude}),
          err => reject(err),
          {enableHighAccuracy: false, timeout: 20000, maximumAge: 60000},
        );
      });
      const addr = await reverseGeocodeLocal(pos.lat, pos.lng);
      setDetectedAddress(addr || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
      setLoading(false);
      setTimeout(() => {
        navigation.navigate('LocationSelection', {latitude: pos.lat, longitude: pos.lng});
      }, 1200);
    } catch {
      setLoading(false);
      setDetectedAddress('लोकेशन नहीं मिल सकी');
    }
  }, [navigation]);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted) {
          fetchLocationAndNavigate();
        }
      }
    })();
  }, [fetchLocationAndNavigate]);

  const handlePress = useCallback(async () => {
    if (permState === 'denied') {
      Linking.openSettings();
      return;
    }
    if (Platform.OS === 'android') {
      setLoading(true);
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'लोकेशन की अनुमति',
          message: 'आपके आस-पास उपलब्ध सेवाएं दिखाने के लिए लोकेशन आवश्यक है।',
          buttonPositive: 'अनुमति दें',
          buttonNegative: 'रद्द करें',
        },
      );
      setLoading(false);
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        fetchLocationAndNavigate();
      } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        setPermState('denied');
      } else {
        setPermState('notGranted');
      }
    } else {
      fetchLocationAndNavigate();
    }
  }, [permState, navigation, fetchLocationAndNavigate]);

  let heading = '';
  let subtitle = '';
  let buttonLabel = '';
  let buttonIcon = '';

  switch (permState) {
    case 'initial':
      heading = 'अपने आस-पास के काम देखने\nके लिए आगे बढ़ें';
      subtitle = '';
      buttonLabel = 'Allow Kare';
      buttonIcon = 'location-outline';
      break;
    case 'notGranted':
      heading = 'अपनी Location शेयर करें';
      subtitle = 'नज़दीकी जॉब्स दिखाने के लिए आपकी लोकेशन जरूरी है';
      buttonLabel = 'लोकेशन चालू करें';
      buttonIcon = 'navigate-outline';
      break;
    case 'denied':
      heading = 'अपनी Location शेयर करें';
      subtitle = 'लोकेशन की अनुमति बंद है, कृपया सेटिंग्स में जाकर इसे चालू करें';
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
          <View style={st.heroImageWrap}>
            <LoginScreenMomWithBaby width={SW * 0.8} height={SW * 0.62} />
          </View>
        </View>

        {/* ── Heading ── */}
        <Text style={[st.heading, {color: colors.text}]}>{heading}</Text>

        {subtitle ? (
          <Text style={[st.sub, {color: colors.textMuted}]}>{subtitle}</Text>
        ) : null}

        {/* ── Radar card ── */}
        <View style={[st.radarCard, {backgroundColor: isDark ? colors.surface : '#F5F8FF'}]}>
          <MemoRadarGraphic size={110} />
          <Text style={[st.fetchingText, {color: colors.textMuted}]} numberOfLines={2}>
            {detectedAddress || 'Fetching your location.....'}
          </Text>
          {detectedAddress ? (
            <View style={st.detectedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
              <Text style={st.detectedBadgeText}>आगे बढ़ रहे हैं...</Text>
            </View>
          ) : null}
        </View>

        <View style={{flex: 1}} />

        {/* ── CTA ── */}
        <TouchableOpacity
          style={[st.ctaBtn, {backgroundColor: colors.iconBlue}]}
          activeOpacity={0.85}
          onPress={handlePress}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={st.ctaBtnInner}>
              <Ionicons name={buttonIcon} size={18} color="#FFF" style={{marginRight: 8}} />
              <Text style={st.ctaText}>{buttonLabel}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <BottomRightDecoration
        icon={<LoginScreenBottomIcon width={280} height={280} />}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: {flex: 1},
  body: {flex: 1, alignItems: 'center', paddingHorizontal: 24},

  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: SW * 0.72,
    marginTop: 8,
  },
  heroImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  heading: {
    fontSize: FontSizes.h2,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  sub: {
    fontSize: FontSizes.caption,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
    paddingHorizontal: 16,
  },

  radarCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 16,
    width: '100%',
  },
  fetchingText: {
    fontSize: FontSizes.caption,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
    lineHeight: 20,
  },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  detectedBadgeText: {
    fontSize: FontSizes.sm,
    color: '#22C55E',
    fontWeight: '600',
  },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 54,
    borderRadius: 14,
    marginBottom: 32,
    elevation: 3,
    shadowColor: '#1B7FF6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  ctaBtnInner: {flexDirection: 'row', alignItems: 'center'},
  ctaText: {fontSize: FontSizes.button, fontWeight: '700', color: '#FFF'},
});
