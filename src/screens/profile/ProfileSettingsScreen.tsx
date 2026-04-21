import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Circle} from 'react-native-svg';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth, useTheme} from '../../context';
import {FontSizes, BorderRadius, scaleLineHeight} from '../../constants';
import type {AppStackParamList} from '../../navigation/types';

/* ── Icons ── */
function BackArrowIcon({color}: {color: string}) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserIcon({color}: {color: string}) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function FileIcon({color}: {color: string}) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BellIcon({color}: {color: string}) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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

function HelpIcon({color}: {color: string}) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <Path
        d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 17h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function LogoutIcon({color}: {color: string}) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusCircleIcon({color}: {color: string}) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <Path
        d="M12 8v8M8 12h8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({color}: {color: string}) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type MenuItem = {
  key: string;
  label: string;
  icon: (color: string) => React.ReactNode;
  danger?: boolean;
  onPress?: () => void;
};

export function ProfileSettingsScreen() {
  const {colors, isDark} = useTheme();
  const {signOut, vendorName, vendorMobile, vendorLocation} = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const menuItems: MenuItem[] = [
    {
      key: 'profile',
      label: 'मेरी प्रोफाइल',
      icon: c => <UserIcon color={c} />,
    },
    {
      key: 'documents',
      label: 'KYC / डॉक्यूमेंट्स',
      icon: c => <FileIcon color={c} />,
    },
    {
      key: 'notifications',
      label: 'नोटिफिकेशन सेटिंग्स',
      icon: c => <BellIcon color={c} />,
    },
    {
      key: 'createShift',
      label: 'नई शिफ्ट बनाएं (Create Shift)',
      icon: c => <PlusCircleIcon color={c} />,
      onPress: () => navigation.navigate('CreateShift'),
    },
    {
      key: 'help',
      label: 'हेल्प और सपोर्ट',
      icon: c => <HelpIcon color={c} />,
    },
    ...(__DEV__
      ? [
          {
            key: 'locationDebug',
            label: 'Location Debug',
            icon: (c: string) => <HelpIcon color={c} />,
            onPress: () => navigation.navigate('LocationDebug'),
          } as MenuItem,
        ]
      : []),
    {
      key: 'logout',
      label: 'लॉग आउट',
      icon: c => <LogoutIcon color={c} />,
      danger: true,
      onPress: signOut,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* ── Header ── */}
      <View style={[styles.header, {borderBottomColor: colors.border}]}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}>
          <BackArrowIcon color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>
          प्रोफाइल और सेटिंग्स
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* ── User Info Card ── */}
        <View
          style={[
            styles.userCard,
            {backgroundColor: colors.cardTinted},
          ]}>
          <View
            style={[
              styles.avatar,
              {backgroundColor: colors.avatarBackground},
            ]}>
            <Text
              style={[
                styles.avatarText,
                {color: colors.textDark},
              ]}>
              {(vendorName || vendorMobile || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, {color: colors.textDark}]}>
              {vendorName || 'User'}
            </Text>
            <Text style={[styles.userPhone, {color: colors.textSecondary}]}>
              {vendorMobile ? `+91 ${vendorMobile}` : ''}
            </Text>
            <Text style={[styles.userLocation, {color: colors.textSecondary}]}>
              {vendorLocation || ''}
            </Text>
          </View>
        </View>

        {/* ── Menu Items ── */}
        <View
          style={[
            styles.menuCard,
            {backgroundColor: colors.card},
          ]}>
          {menuItems.map((item, index) => {
            const textColor = item.danger
              ? colors.danger
              : colors.text;
            const iconColor = item.danger
              ? colors.danger
              : colors.primary;

            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={item.onPress}>
                <View style={styles.menuItemLeft}>
                  {item.icon(iconColor)}
                  <Text style={[styles.menuLabel, {color: textColor}]}>
                    {item.label}
                  </Text>
                </View>
                <ChevronRightIcon color={colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.h3,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    padding: 18,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xxl + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.h1,
    fontFamily: 'GolosText-Bold',
    fontWeight: '700',
  },
  userInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.title,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '700',
    lineHeight: scaleLineHeight(28),
  },
  userPhone: {
    fontSize: FontSizes.body,
    fontFamily: 'GolosText-Medium',
    marginTop: 2,
  },
  userLocation: {
    fontSize: FontSizes.caption,
    fontFamily: 'GolosText-Regular',
    marginTop: 2,
  },
  menuCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuLabel: {
    fontSize: FontSizes.subtitle,
    fontFamily: 'NotoSansDevanagari-Medium',
    fontWeight: '500',
  },
});
