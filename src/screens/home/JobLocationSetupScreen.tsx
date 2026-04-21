/**
 * JobLocationSetupScreen
 *
 * Full screen shown after login when the vendor has 0 job locations.
 * Tapping the search bar navigates to EditLocationScreen (same as home).
 * GPS option also available. User cannot access home until a location is saved.
 */

import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, {Circle, Path} from 'react-native-svg';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '../../context/ThemeContext';
import {useAuth} from '../../context/AuthContext';
import {FontSizes, BorderRadius, reverseGeocode} from '../../constants';
import {addJobLocation} from '../../services/jobLocationApi';
import {LoginScreenMomWithBaby} from '../../assets/images/LoginScreenMomWithBaby';
import {BottomRightDecoration} from '../../components/BottomRightDecoration';
import {LoginScreenBottomIcon} from '../../assets/images/LoginScreenBottomIcon';
import type {AppStackParamList} from '../../navigation/types';

const {width: SW} = Dimensions.get('window');

// ─── Pin icon ─────────────────────────────────────────────────────────────────

function PinIcon({size = 22, color = '#1B7FF6'}: {size?: number; color?: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21.7C12 21.7 20 14.16 20 8.8A8 8 0 004 8.8C4 14.16 12 21.7 12 21.7Z" fill={color} />
      <Circle cx="12" cy="8.8" r="3" fill="#fff" />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function JobLocationSetupScreen() {
  const {colors, isDark} = useTheme();
  const {vendorId, setHasJobLocation, updateVendorLocation} = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCurrentLocation = useCallback(async () => {
    if (gpsLoading || saving) return;
    setGpsLoading(true);
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (!granted) {
          setGpsLoading(false);
          return;
        }
      }
      const pos: {lat: number; lng: number} = await new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          p => resolve({lat: p.coords.latitude, lng: p.coords.longitude}),
          err => reject(err),
          {enableHighAccuracy: false, timeout: 20000, maximumAge: 60000},
        );
      });
      const addr = await reverseGeocode(pos.lat, pos.lng);
      const label = addr || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;

      setSaving(true);
      setGpsLoading(false);

      if (vendorId) {
        await addJobLocation({
          vendorId,
          latitude: pos.lat,
          longitude: pos.lng,
          address: label,
          locationType: 'HOME',
        });
      }
      await updateVendorLocation(label);
      await setHasJobLocation(true);
    } catch {
      setGpsLoading(false);
      setSaving(false);
    }
  }, [gpsLoading, saving, vendorId, setHasJobLocation, updateVendorLocation]);

  return (
    <SafeAreaView style={[st.safe, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* ── Hero ── */}
      <View style={st.heroSection}>
        <LoginScreenMomWithBaby width={SW * 0.7} height={SW * 0.5} />
      </View>

      {/* ── Heading ── */}
      <View style={st.headerRow}>
        <PinIcon size={22} color={colors.iconBlue} />
        <Text style={[st.heading, {color: colors.text}]}>जॉब लोकेशन सेट करें</Text>
      </View>
      <Text style={[st.sub, {color: colors.textMuted}]}>
        आप किस एरिया में काम करना चाहते हैं?
      </Text>

      {/* ── Search bar (touchable → opens EditLocation) ── */}
      <View style={st.searchWrap}>
        <TouchableOpacity
          style={[
            st.searchBox,
            {backgroundColor: colors.inputBackground, borderColor: colors.inputBorder},
          ]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('EditLocation')}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.inputPlaceholder}
            style={{marginRight: 8}}
          />
          <Text style={[st.searchPlaceholder, {color: colors.inputPlaceholder}]}>
            एरिया, शहर या पिनकोड खोजें
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── GPS option ── */}
      <View style={st.gpsWrap}>
        <TouchableOpacity
          style={[
            st.gpsCard,
            {
              backgroundColor: isDark ? colors.surface : colors.iconCircleBackground,
              borderColor: isDark ? colors.inputBorder : colors.primaryLight,
            },
          ]}
          activeOpacity={0.75}
          onPress={handleCurrentLocation}
          disabled={gpsLoading || saving}>
          <View
            style={[
              st.gpsIconCircle,
              {backgroundColor: isDark ? colors.iconCircleBackground : colors.primaryLight},
            ]}>
            {gpsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="navigate" size={18} color={colors.primary} />
            )}
          </View>
          <View style={{flex: 1}}>
            <Text style={[st.gpsLabel, {color: colors.iconBlue}]}>
              {gpsLoading ? 'ढूंढ रहे हैं...' : saving ? 'सेव हो रहा है...' : 'वर्तमान लोकेशन उपयोग करें'}
            </Text>
            <Text style={[st.gpsSub, {color: colors.textMuted}]}>GPS से अपना एरिया पहचानें</Text>
          </View>
        </TouchableOpacity>
      </View>

      <BottomRightDecoration icon={<LoginScreenBottomIcon width={250} height={250} />} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  safe: {flex: 1},

  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 24,
  },
  heading: {fontSize: FontSizes.h1, fontWeight: '800'},
  sub: {
    fontSize: FontSizes.caption,
    textAlign: 'left',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 24,
  },

  searchWrap: {paddingHorizontal: 24},
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: BorderRadius.input,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchPlaceholder: {flex: 1, fontSize: FontSizes.caption},

  gpsWrap: {paddingHorizontal: 24},
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsLabel: {fontSize: FontSizes.caption, fontWeight: '600'},
  gpsSub: {fontSize: FontSizes.xs, marginTop: 2},
});
