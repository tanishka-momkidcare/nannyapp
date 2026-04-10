import React, {useEffect, useRef} from 'react';
import {Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Svg, {Path, Circle, Rect} from 'react-native-svg';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../context';
import {useTabBarVisibility} from '../context/TabBarVisibilityContext';

const {width: SW} = Dimensions.get('window');

/* ── Tab icons ── */
function HomeIcon({color, size}: {color: string; size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 21V12h6v9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function JobsIcon({color, size}: {color: string; size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={2}
        y={7}
        width={20}
        height={14}
        rx={2}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 12v.01"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function TrainingIcon({color, size}: {color: string; size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IDCardIcon({color, size}: {color: string; size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={2}
        y={4}
        width={20}
        height={16}
        rx={2}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={9} cy={11} r={2} stroke={color} strokeWidth={2} />
      <Path
        d="M13 9h4M13 13h4M7 17c0-1.1.9-2 2-2h0c1.1 0 2 .9 2 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProfileIcon({color, size}: {color: string; size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} />
      <Path
        d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const TAB_ICONS: Record<string, (props: {color: string; size: number}) => React.ReactNode> = {
  Home: (p) => <HomeIcon {...p} />,
  Jobs: (p) => <JobsIcon {...p} />,
  IDCard: (p) => <IDCardIcon {...p} />,
  Course: (p) => <TrainingIcon {...p} />,
  Profile: (p) => <ProfileIcon {...p} />,
};

const TAB_LABELS: Record<string, string> = {
  Home: 'होम',
  Jobs: 'नौकरियां',
  IDCard: 'आईडी कार्ड',
  Course: 'कोर्स',
  Profile: 'प्रोफाइल',
};

export function GlassPillTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom + 14;
  const tabCount = state.routes.length;
  const {translateAnim} = useTabBarVisibility();

  // Height to slide off-screen (pill + padding)
  const hideDistance = 120;

  const activeColor = colors.primary;
  const inactiveColor = isDark ? '#8899AA' : '#9CA3AF';

  // Animated pill position (0 → 1 → 2 → 3)
  const animatedIndex = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 18,
      stiffness: 200,
      mass: 0.8,
    }).start();
  }, [state.index, animatedIndex]);

  // Animated scale for each tab icon+label
  const scaleAnims = useRef(
    state.routes.map(() => new Animated.Value(1)),
  ).current;

  useEffect(() => {
    state.routes.forEach((_, i) => {
      Animated.spring(scaleAnims[i], {
        toValue: state.index === i ? 1.08 : 1,
        useNativeDriver: true,
        damping: 14,
        stiffness: 180,
      }).start();
    });
  }, [state.index, scaleAnims, state.routes]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {paddingBottom: bottomPadding},
        {
          transform: [
            {
              translateY: translateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, hideDistance],
              }),
            },
          ],
        },
      ]}>
      <View style={styles.pillContainer}>
        {/* Glass background */}
        <BlurView
          blurType={isDark ? 'dark' : 'light'}
          blurAmount={Platform.OS === 'ios' ? 35 : 16}
          reducedTransparencyFallbackColor={
            isDark ? 'rgba(13, 27, 42, 0.10)' : 'rgba(255, 255, 255, 0.10)'
          }
          style={StyleSheet.absoluteFill}
        />
        {/* Glossy sheen overlay */}
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

        {/* Glass overlay border — glossy highlights */}
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.glassOverlay,
            {
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.10)'
                : 'rgba(27, 127, 246, 0.08)',
              borderTopColor: isDark
                ? 'rgba(255, 255, 255, 0.18)'
                : 'rgba(27, 127, 246, 0.12)',
              borderBottomColor: isDark
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(27, 127, 246, 0.05)',
            },
          ]}
        />

        {/* Tab items */}
        <View style={styles.tabRow}>
          {/* Animated sliding pill indicator */}
          <Animated.View
            style={[
              styles.slidingPill,
              {
                backgroundColor: isDark
                  ? 'rgba(124, 184, 255, 0.15)'
                  : 'rgba(27, 127, 246, 0.12)',
                width: `${100 / tabCount}%` as any,
                transform: [
                  {
                    translateX: animatedIndex.interpolate({
                      inputRange: state.routes.map((_, i) => i),
                      outputRange: state.routes.map((_, i) => {
                        // approximate per-tab width; will auto-adjust
                        const tabWidth = (SW - 28 - 8) / tabCount; // wrapper padding 14*2, tabRow padding 4*2
                        return i * tabWidth;
                      }),
                    }),
                  },
                ],
              },
            ]}
          />

          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const icon = TAB_ICONS[route.name];
            const label = TAB_LABELS[route.name] || route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({type: 'tabLongPress', target: route.key});
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? {selected: true} : {}}
                accessibilityLabel={label}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.7}
                style={styles.tabItem}>
                <Animated.View
                  style={[
                    styles.tabContent,
                    {transform: [{scale: scaleAnims[index]}]},
                  ]}>
                  {icon?.({
                    color: isFocused ? activeColor : inactiveColor,
                    size: 18,
                  })}
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isFocused ? activeColor : inactiveColor,
                        fontFamily: isFocused
                          ? 'NotoSansDevanagari-SemiBold'
                          : 'NotoSansDevanagari-Regular',
                        fontWeight: isFocused ? '600' : '400',
                      },
                    ]}
                    numberOfLines={1}>
                    {label}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  pillContainer: {
    width: '100%',
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#fff',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
        shadowColor: '#fff',
      },
    }),
  },
  glassOverlay: {
    borderRadius: 36,
    borderWidth: 1.5,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: 'relative',
  },
  slidingPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 36,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 16,
  },
});
