import React, {useCallback, useEffect, useRef, useState} from 'react';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  FlatList,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {useAuth, useTheme} from '../../context';
import {BorderRadius, FontSizes, GOOGLE_MAPS_API_KEY, reverseGeocode} from '../../constants';
import type {AppStackParamList} from '../../navigation/types';
import {addJobLocation} from '../../services/jobLocationApi';

type Props = NativeStackScreenProps<AppStackParamList, 'EditLocation'>;

type PlacePrediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

type RecentSearch = {
  id: string;
  main: string;
  secondary: string;
  lat: number;
  lng: number;
  timestamp: number;
};

const RECENT_STORAGE_KEY = '@nannyapp_recent_location_edits';
const MAX_RECENTS = 5;

async function searchPlaces(query: string, lat: number, lng: number): Promise<PlacePrediction[]> {
  if (query.trim().length < 2) return [];

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(query)}` +
      `&location=${lat},${lng}` +
      `&radius=50000` +
      `&language=hi` +
      `&components=country:in` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();
    return data.predictions || [];
  } catch {
    return [];
  }
}

async function getPlaceDetails(placeId: string): Promise<{lat: number; lng: number} | null> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${placeId}` +
      `&fields=geometry` +
      `&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    const loc = data.result?.geometry?.location;
    if (!loc) return null;

    return {lat: loc.lat, lng: loc.lng};
  } catch {
    return null;
  }
}

async function loadRecents(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveRecent(item: RecentSearch) {
  try {
    const existing = await loadRecents();
    const deduped = existing.filter(r => r.id !== item.id);
    const updated = [item, ...deduped].slice(0, MAX_RECENTS);
    await AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

async function clearRecents() {
  try {
    await AsyncStorage.removeItem(RECENT_STORAGE_KEY);
  } catch {}
}

export function EditLocationScreen({navigation}: Props) {
  const {colors, isDark} = useTheme();
  const {updateVendorLocation, vendorId} = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlacePrediction[]>([]);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [anchor, setAnchor] = useState<{lat: number; lng: number}>({lat: 28.6139, lng: 77.2090});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 250);
    void loadRecents().then(setRecents);
    void hydrateAnchorFromGPS();
  }, []);

  const hydrateAnchorFromGPS = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (!granted) return;
      }

      const current = await new Promise<{lat: number; lng: number}>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          p => resolve({lat: p.coords.latitude, lng: p.coords.longitude}),
          reject,
          {enableHighAccuracy: false, timeout: 15000, maximumAge: 60000},
        );
      });

      setAnchor(current);
    } catch {}
  }, []);

  const applySelectedLocation = useCallback(async (label: string, lat: number, lng: number) => {
    // Persist location label locally
    await updateVendorLocation(label);

    // Sync with backend job-location API
    try {
      if (vendorId) {
        await addJobLocation({
          vendorId,
          latitude: lat,
          longitude: lng,
          address: label,
        });
      }
    } catch (err) {
      if (__DEV__) console.warn('[EditLocation] job-location API error:', err);
    }

    navigation.goBack();
  }, [navigation, updateVendorLocation, vendorId]);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const predictions = await searchPlaces(text, anchor.lat, anchor.lng);
      setResults(predictions);
      setLoading(false);
    }, 350);
  }, [anchor.lat, anchor.lng]);

  const handleSelectPlace = useCallback(async (prediction: PlacePrediction) => {
    setLoading(true);
    const details = await getPlaceDetails(prediction.place_id);
    setLoading(false);

    const areaName = prediction.structured_formatting.main_text +
      (prediction.structured_formatting.secondary_text
        ? `, ${prediction.structured_formatting.secondary_text}`
        : '');

    if (details) {
      await saveRecent({
        id: prediction.place_id,
        main: prediction.structured_formatting.main_text,
        secondary: prediction.structured_formatting.secondary_text,
        lat: details.lat,
        lng: details.lng,
        timestamp: Date.now(),
      });
      await applySelectedLocation(areaName, details.lat, details.lng);
    } else {
      await applySelectedLocation(areaName, anchor.lat, anchor.lng);
    }
  }, [applySelectedLocation]);

  const handleSelectRecent = useCallback(async (recent: RecentSearch) => {
    const areaName = recent.main + (recent.secondary ? `, ${recent.secondary}` : '');
    await saveRecent(recent);
    await applySelectedLocation(areaName, recent.lat, recent.lng);
  }, [applySelectedLocation]);

  const handleUseCurrentLocation = useCallback(async () => {
    setGpsLoading(true);
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (!granted) {
          setGpsLoading(false);
          return;
        }
      }

      const current = await new Promise<{lat: number; lng: number}>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          p => resolve({lat: p.coords.latitude, lng: p.coords.longitude}),
          reject,
          {enableHighAccuracy: false, timeout: 20000, maximumAge: 60000},
        );
      });

      const label = await reverseGeocode(current.lat, current.lng);
      await applySelectedLocation(label, current.lat, current.lng);
    } finally {
      setGpsLoading(false);
    }
  }, [applySelectedLocation]);

  const handleClearRecents = useCallback(async () => {
    await clearRecents();
    setRecents([]);
  }, []);

  const showRecents = query.trim().length < 2 && recents.length > 0;

  return (
    <SafeAreaView style={[s.safe, {backgroundColor: colors.background}]}> 
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={[s.searchBox, {backgroundColor: colors.inputBackground, borderColor: colors.inputBorder}]}> 
          <Ionicons name="search-outline" size={18} color={colors.inputPlaceholder} style={{marginRight: 8}} />
          <TextInput
            ref={inputRef}
            style={[s.searchInput, {color: colors.inputText}]}
            placeholder="नई लोकेशन खोजें"
            placeholderTextColor={colors.inputPlaceholder}
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        style={[
          s.gpsCard,
          {
            backgroundColor: isDark ? colors.surface : colors.iconCircleBackground,
            borderColor: isDark ? colors.inputBorder : colors.primaryLight,
          },
        ]}
        onPress={handleUseCurrentLocation}
        activeOpacity={0.75}>
        <View style={[s.gpsIconWrap, {backgroundColor: colors.primaryLight}]}> 
          {gpsLoading
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="locate" size={17} color={colors.primary} />}
        </View>
        <View style={{flex: 1}}>
          <Text style={[s.gpsTitle, {color: colors.text}]}>वर्तमान लोकेशन उपयोग करें</Text>
          <Text style={[s.gpsSub, {color: colors.textMuted}]}>GPS से ऑटो लोकेशन चुनें</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {showRecents ? (
        <View style={s.listWrap}>
          <View style={s.recentHeader}>
            <Text style={[s.sectionTitle, {color: colors.text}]}>हाल की खोज</Text>
            <TouchableOpacity onPress={handleClearRecents}>
              <Text style={[s.clearText, {color: colors.primary}]}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recents}
            keyExtractor={item => item.id}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[s.resultItem, {backgroundColor: colors.background}]}
                activeOpacity={0.65}
                onPress={() => { void handleSelectRecent(item); }}>
                <View style={[s.resultIconWrap, {backgroundColor: isDark ? colors.accentSurface : colors.cardWarm}]}>
                  <Ionicons name="time-outline" size={18} color={colors.accent} />
                </View>
                <View style={s.resultTextWrap}>
                  <Text style={[s.resultMain, {color: colors.text}]} numberOfLines={1}>{item.main}</Text>
                  <Text style={[s.resultSub, {color: colors.textMuted}]} numberOfLines={1}>{item.secondary}</Text>
                </View>
                <Ionicons name="arrow-forward-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={[s.sep, {backgroundColor: colors.separator}]} />}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={s.listWrap}>
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[s.loadingText, {color: colors.textMuted}]}>Searching...</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={item => item.place_id}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[s.resultItem, {backgroundColor: colors.background}]}
                  activeOpacity={0.65}
                  onPress={() => { void handleSelectPlace(item); }}>
                  <View style={[s.resultIconWrap, {backgroundColor: colors.iconCircleBackground}]}>
                    <Ionicons name="location-outline" size={18} color={colors.iconBlue} />
                  </View>
                  <View style={s.resultTextWrap}>
                    <Text style={[s.resultMain, {color: colors.text}]} numberOfLines={1}>
                      {item.structured_formatting.main_text}
                    </Text>
                    <Text style={[s.resultSub, {color: colors.textMuted}]} numberOfLines={1}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={s.emptyWrap}>
                  <Text style={[s.emptyText, {color: colors.textMuted}]}>लोकेशन खोजें और चुनें</Text>
                </View>
              }
              ItemSeparatorComponent={() => <View style={[s.sep, {backgroundColor: colors.separator}]} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.body,
    fontFamily: 'GolosText-Regular',
  },
  gpsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gpsIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTitle: {
    fontSize: FontSizes.body,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '600',
  },
  gpsSub: {
    fontSize: FontSizes.caption,
    marginTop: 2,
    fontFamily: 'GolosText-Regular',
  },
  listWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: FontSizes.body,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '600',
  },
  clearText: {
    fontSize: FontSizes.caption,
    fontFamily: 'GolosText-Medium',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  resultIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTextWrap: {
    flex: 1,
  },
  resultMain: {
    fontSize: FontSizes.body,
    fontFamily: 'NotoSansDevanagari-Medium',
  },
  resultSub: {
    fontSize: FontSizes.caption,
    marginTop: 2,
    fontFamily: 'GolosText-Regular',
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
  emptyWrap: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSizes.body,
    fontFamily: 'GolosText-Regular',
  },
  loadingWrap: {
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: FontSizes.caption,
    fontFamily: 'GolosText-Regular',
  },
});
