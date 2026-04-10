import React, {createContext, useCallback, useContext, useRef} from 'react';
import {Animated, NativeScrollEvent, NativeSyntheticEvent} from 'react-native';

type TabBarVisibilityContextType = {
  /** 0 = visible, 1 = hidden */
  translateAnim: Animated.Value;
  /** Attach this to your ScrollView's onScroll */
  handleScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextType>({
  translateAnim: new Animated.Value(0),
  handleScroll: () => {},
});

const SCROLL_THRESHOLD = 10;

export function TabBarVisibilityProvider({children}: {children: React.ReactNode}) {
  const translateAnim = useRef(new Animated.Value(0)).current;
  const lastOffsetY = useRef(0);
  const isHidden = useRef(false);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = e.nativeEvent.contentOffset.y;
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

  return (
    <TabBarVisibilityContext.Provider value={{translateAnim, handleScroll}}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  return useContext(TabBarVisibilityContext);
}
