import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, {Circle, Path} from 'react-native-svg';

import {useAuth, useTheme} from '../../context';
import {FontSizes, BorderRadius} from '../../constants';
import type {AuthStackParamList} from '../../navigation/types';
import {LoginScreenMomWithBaby} from '../../assets/images/LoginScreenMomWithBaby';
import {BottomRightDecoration} from '../../components/BottomRightDecoration';
import {LoginScreenBottomIcon} from '../../assets/images/LoginScreenBottomIcon';
import {verifyOtp} from '../../services/authApi';

const {width: SW} = Dimensions.get('window');
type Props = NativeStackScreenProps<AuthStackParamList, 'LocationSelection'>;

const PinIcon = ({size = 24, color = '#1B7FF6'}: {size?: number; color?: string}) => {
  const {colors: themeColors} = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21.7C12 21.7 20 14.16 20 8.8A8 8 0 004 8.8C4 14.16 12 21.7 12 21.7Z"
        fill={color}
      />
      <Circle cx="12" cy="8.8" r="3" fill={themeColors.textInverse} />
    </Svg>
  );
};

const MemoPinIcon = React.memo(PinIcon);

export function LocationSelectionScreen({route, navigation}: Props) {
  const {signIn} = useAuth();
  const {colors, isDark} = useTheme();
  const {phone, otp, latitude, longitude, selectedArea: areaFromParams} = route.params;
  const [selectedArea, setSelectedArea] = useState(areaFromParams || '');
  const [submitting, setSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleNavigateSearch = useCallback(() => {
    navigation.navigate('AreaSearch', {phone, otp, latitude, longitude});
  }, [navigation, phone, otp, latitude, longitude]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (areaFromParams) {
      setSelectedArea(areaFromParams);
    }
  }, [areaFromParams]);

  async function handleProceed() {
    if (!selectedArea || submitting) return;
    setSubmitting(true);
    try {
      const result = await verifyOtp(phone, otp, {
        latitude,
        longitude,
        area: selectedArea,
      });
      const vendorName = [result.vendor.firstName, result.vendor.lastName].filter(Boolean).join(' ');
      await signIn(result.token, result.vendor.id, result.vendor.mobile, vendorName, selectedArea);
    } catch (err: any) {
      Alert.alert('त्रुटि', err.message || 'लॉगिन में समस्या हुई। कृपया पुनः प्रयास करें।');
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <Animated.View style={[s.body, {opacity: fadeAnim}]}>
        {/* ── Hero ── */}
        <View style={s.heroSection}>
          <View style={s.heroImageWrap}>
            <LoginScreenMomWithBaby width={SW * 0.8} height={SW * 0.62} />
          </View>
        </View>

        {/* ── Heading ── */}
        <View style={s.headingRow}>
          <MemoPinIcon size={22} color={colors.iconBlue} />
          <Text style={[s.heading, {color: colors.text}]}>अपना एरिया चुनें</Text>
        </View>
        <Text style={[s.sub, {color: colors.textMuted}]}>
          आप किस एरिया में रहते हैं?
        </Text>

        {/* ── Search bar ── */}
        <TouchableOpacity
          style={[
            s.searchBar,
            {
              backgroundColor: colors.inputBackground,
              borderColor: selectedArea ? colors.iconBlue : colors.inputBorder,
            },
          ]}
          activeOpacity={0.8}
          onPress={handleNavigateSearch}>
          <Ionicons
            name="search-outline"
            size={20}
            color={selectedArea ? colors.iconBlue : colors.inputPlaceholder}
            style={{marginRight: 10}}
          />
          <Text
            style={[
              s.searchPlaceholder,
              {color: selectedArea ? colors.text : colors.inputPlaceholder},
              selectedArea ? s.searchPlaceholderSelected : null,
            ]}
            numberOfLines={1}>
            {selectedArea || 'जैसे मालवीय नगर, दिल्ली'}
          </Text>
          {selectedArea ? (
            <View style={[s.selectedCheck, {backgroundColor: colors.iconBlue}]}>
              <Ionicons name="checkmark" size={12} color={colors.textInverse} />
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        <View style={{flex: 1}} />

        {/* ── CTA ── */}
        <TouchableOpacity
          style={[
            s.ctaBtn,
            {
              backgroundColor: selectedArea && !submitting ? colors.iconBlue : colors.buttonDisabled,
            },
            selectedArea && !submitting
              ? [s.ctaShadow, {shadowColor: colors.primary}]
              : null,
          ]}
          activeOpacity={0.85}
          onPress={handleProceed}
          disabled={!selectedArea || submitting}>
          <Text
            style={[
              s.ctaText,
              {color: selectedArea && !submitting ? colors.buttonPrimaryText : colors.buttonDisabledText},
            ]}>
            {submitting ? 'कृपया प्रतीक्षा करें...' : 'आगे बढ़ें'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <BottomRightDecoration
        icon={<LoginScreenBottomIcon width={280} height={280} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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

  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  heading: {fontSize: FontSizes.h1, fontWeight: '800'},
  sub: {fontSize: FontSizes.caption, textAlign: 'center', marginBottom: 28, lineHeight: 20},

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 54,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  searchPlaceholder: {fontSize: FontSizes.body, flex: 1},
  searchPlaceholderSelected: {fontWeight: '600'},
  selectedCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ctaBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 54,
    borderRadius: BorderRadius.button,
    marginBottom: 32,
  },
  ctaShadow: {
    elevation: 3,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  ctaText: {fontSize: FontSizes.button, fontWeight: '700'},
});
