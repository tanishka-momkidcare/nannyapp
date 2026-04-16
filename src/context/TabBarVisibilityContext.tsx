import React, {createContext, useCallback, useContext, useRef, useState} from 'react';
import {Animated, NativeScrollEvent, NativeSyntheticEvent} from 'react-native';

type TabBarVisibilityContextType = {
  /** 0 = visible, 1 = hidden */
  translateAnim: Animated.Value;
  /** Attach this to your ScrollView's onScroll */
  handleScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Enable/disable hide-on-scroll behavior */
  setAutoHideOnScroll: (enabled: boolean) => void;
  /** Current hide-on-scroll behavior */
  isAutoHideOnScrollEnabled: boolean;
  /** Instantly hide the tab bar (no animation) */
  hide: () => void;
  /** Instantly show the tab bar (no animation) */
  show: () => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextType>({
  translateAnim: new Animated.Value(0),
  handleScroll: () => {},
  setAutoHideOnScroll: () => {},
  isAutoHideOnScrollEnabled: false,
  hide: () => {},
  show: () => {},
});

const SCROLL_THRESHOLD = 10;

export function TabBarVisibilityProvider({children}: {children: React.ReactNode}) {
  const translateAnim = useRef(new Animated.Value(0)).current;
  const lastOffsetY = useRef(0);
  const isHidden = useRef(false);
  const [isAutoHideOnScrollEnabled, setIsAutoHideOnScrollEnabled] = useState(false);
  const isAutoHideOnScrollEnabledRef = useRef(false);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = e.nativeEvent.contentOffset.y;
      if (!isAutoHideOnScrollEnabledRef.current) {
        lastOffsetY.current = currentY;
        return;
      }

      const diff = currentY - lastOffsetY.current;

      if (diff > SCROLL_THRESHOLD && currentY > 50 && !isHidden.current) {
        // Scrolling down fast → hide
        isHidden.current = true;
        Animated.spring(translateAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
          mass: 0.8,
        }).start();
      } else if (diff < -SCROLL_THRESHOLD && isHidden.current) {
        // Scrolling up → show
        isHidden.current = false;
        Animated.spring(translateAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
          mass: 0.8,
        }).start();
      }

      lastOffsetY.current = currentY;
    },
    [translateAnim],
  );

  const setAutoHideOnScroll = useCallback((enabled: boolean) => {
    setIsAutoHideOnScrollEnabled(enabled);
    isAutoHideOnScrollEnabledRef.current = enabled;
    // When auto-hide is turned off, force bar visible.
    if (!enabled) {
      isHidden.current = false;
      Animated.spring(translateAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
        mass: 0.8,
      }).start();
    }
  }, [translateAnim]);

  const hide = useCallback(() => {
    isHidden.current = true;
    translateAnim.setValue(1);
  }, [translateAnim]);

  const show = useCallback(() => {
    isHidden.current = false;
    translateAnim.setValue(0);
  }, [translateAnim]);

  return (
    <TabBarVisibilityContext.Provider
      value={{
        translateAnim,
        handleScroll,
        setAutoHideOnScroll,
        isAutoHideOnScrollEnabled,
        hide,
        show,
      }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  return useContext(TabBarVisibilityContext);
}
