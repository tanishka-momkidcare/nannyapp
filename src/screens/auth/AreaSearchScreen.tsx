import React, {useCallback, useEffect, useRef, useState} from 'react';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  PermissionsAndroid,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {useTheme} from '../../context';
import {FontSizes, GOOGLE_MAPS_API_KEY, reverseGeocode} from '../../constants';
import type {AuthStackParamList} from '../../navigation/types';

const RECENT_STORAGE_KEY = '@nannyapp_recent_searches';
const MAX_RECENTS = 5;

type Props = NativeStackScreenProps<AuthStackParamList, 'AreaSearch'>;

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface RecentSearch {
  id: string;
  main: string;
  secondary: string;
  lat: number;
  lng: number;
  timestamp: number;
}

/* ── Google Places Autocomplete ── */
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

async function getPlaceDetails(placeId: string): Promise<{lat: number; lng: number; name: string} | null> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${placeId}` +
      `&fields=geometry,name,formatted_address` +
      `&language=hi` +
      `&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const loc = data.result?.geometry?.location;
    if (loc) {
      return {lat: loc.lat, lng: loc.lng, name: data.result?.formatted_address || data.result?.name || ''};
    }
    return null;
  } catch {
    return null;
  }
}

async function reverseGeocodeArea(lat: number, lng: number): Promise<string> {
  return reverseGeocode(lat, lng);
}

/* ── Recent searches persistence ── */
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
    const filtered = existing.filter(r => r.id !== item.id);
    const updated = [item, ...filtered].slice(0, MAX_RECENTS);
    await AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

async function clearRecents() {
  try {
    await AsyncStorage.removeItem(RECENT_STORAGE_KEY);
  } catch {}
}

/* ══════════════════════════════════════════════════
   AREA SEARCH SCREEN
   ══════════════════════════════════════════════════ */
export function AreaSearchScreen({route, navigation}: Props) {
  const {colors, isDark} = useTheme();
  const {latitude, longitude} = route.params;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlacePrediction[]>([]);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
    loadRecents().then(setRecents);
  }, []);

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (text.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        const predictions = await searchPlaces(text, latitude, longitude);
        setResults(predictions);
        setLoading(false);
      }, 400);
    },
    [latitude, longitude],
  );

  async function handleSelectPlace(prediction: PlacePrediction) {
    setLoading(true);
    const details = await getPlaceDetails(prediction.place_id);
    setLoading(false);
    if (details) {
      const areaName =
        prediction.structured_formatting.main_text +
        (prediction.structured_formatting.secondary_text
          ? ', ' + prediction.structured_formatting.secondary_text
          : '');
      await saveRecent({
        id: prediction.place_id,
        main: prediction.structured_formatting.main_text,
        secondary: prediction.structured_formatting.secondary_text,
        lat: details.lat,
        lng: details.lng,
        timestamp: Date.now(),
      });
      navigation.navigate('LocationSelection', {
        latitude: details.lat,
        longitude: details.lng,
        selectedArea: areaName,
      });
    }
  }

  async function handleSelectRecent(recent: RecentSearch) {
    const areaName = recent.main + (recent.secondary ? ', ' + recent.secondary : '');
    await saveRecent(recent);
    navigation.navigate('LocationSelection', {
      latitude: recent.lat,
      longitude: recent.lng,
      selectedArea: areaName,
    });
  }

  async function handleCurrentLocation() {
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
      const addr = await reverseGeocodeArea(pos.lat, pos.lng);
      setGpsLoading(false);
      navigation.navigate('LocationSelection', {
        latitude: pos.lat,
        longitude: pos.lng,
        selectedArea: addr || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`,
      });
    } catch {
      setGpsLoading(false);
    }
  }

  async function handleClearRecents() {
    await clearRecents();
    setRecents([]);
  }

  const showRecents = query.length < 2 && recents.length > 0;

  const handleClearInput = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  const renderItem = useCallback(({item}: {item: PlacePrediction}) => {
    return (
      <TouchableOpacity
        style={[st.resultItem, {backgroundColor: colors.background}]}
        activeOpacity={0.65}
        onPress={() => handleSelectPlace(item)}>
        <View style={[st.resultIconWrap, {backgroundColor: isDark ? '#1B3A5C' : '#EEF6FF'}]}>
          <Ionicons name="location-outline" size={18} color={colors.iconBlue} />
        </View>
        <View style={st.resultTextWrap}>
          <Text style={[st.resultMain, {color: colors.text}]} numberOfLines={1}>
            {item.structured_formatting.main_text}
          </Text>
          <Text style={[st.resultSub, {color: colors.textMuted}]} numberOfLines={1}>
            {item.structured_formatting.secondary_text}
          </Text>
        </View>
        <Ionicons name="arrow-forward-outline" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }, [colors, isDark]);

  const renderRecent = useCallback(({item}: {item: RecentSearch}) => {
    return (
      <TouchableOpacity
        style={[st.resultItem, {backgroundColor: colors.background}]}
        activeOpacity={0.65}
        onPress={() => handleSelectRecent(item)}>
        <View style={[st.resultIconWrap, {backgroundColor: isDark ? '#1B3A5C' : '#FFF5E6'}]}>
          <Ionicons name="time-outline" size={18} color="#F5A623" />
        </View>
        <View style={st.resultTextWrap}>
          <Text style={[st.resultMain, {color: colors.text}]} numberOfLines={1}>
            {item.main}
          </Text>
          <Text style={[st.resultSub, {color: colors.textMuted}]} numberOfLines={1}>
            {item.secondary}
          </Text>
        </View>
        <Ionicons name="arrow-forward-outline" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }, [colors, isDark]);

  return (
    <SafeAreaView style={[st.safe, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* ── Header ── */}
      <View style={st.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          style={st.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={[st.searchBox, {backgroundColor: colors.inputBackground, borderColor: colors.inputBorder}]}>
          <Ionicons name="search-outline" size={18} color={colors.inputPlaceholder} style={{marginRight: 8}} />
          <TextInput
            ref={inputRef}
            style={[st.searchInput, {color: colors.inputText}]}
            placeholder="एरिया, शहर या पिनकोड खोजें"
            placeholderTextColor={colors.inputPlaceholder}
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClearInput}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Current location card ── */}
      <TouchableOpacity
        style={[st.gpsCard, {backgroundColor: isDark ? '#1a2636' : '#EEF6FF', borderColor: isDark ? '#2a3a4f' : '#D0E3FF'}]}
        activeOpacity={0.75}
        onPress={handleCurrentLocation}
        disabled={gpsLoading}>
        <View style={[st.gpsIconCircle, {backgroundColor: isDark ? '#1B3A5C' : '#D0E3FF'}]}>
          {gpsLoading ? (
            <ActivityIndicator size="small" color="#1B7FF6" />
          ) : (
            <Ionicons name="navigate" size={18} color="#1B7FF6" />
          )}
        </View>
        <View style={{flex: 1}}>
          <Text style={[st.gpsLabel, {color: colors.iconBlue}]}>
            {gpsLoading ? 'ढूंढ रहे हैं...' : 'वर्तमान लोकेशन उपयोग करें'}
          </Text>
          <Text style={[st.gpsSub, {color: colors.textMuted}]}>GPS से अपना एरिया पहचानें</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* ── Recent searches section ── */}
      {showRecents && (
        <View style={st.recentHeader}>
          <Text style={[st.recentTitle, {color: colors.textSecondary}]}>हाल की खोज</Text>
          <TouchableOpacity onPress={handleClearRecents}>
            <Text style={[st.recentClear, {color: colors.iconBlue}]}>सभी हटाएं</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Loading ── */}
      {loading && (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="small" color={colors.iconBlue} />
        </View>
      )}

      {/* ── Results / Recents list ── */}
      {showRecents ? (
        <FlatList
          data={recents}
          keyExtractor={item => item.id}
          renderItem={renderRecent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.listContent}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.place_id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.listContent}
          ListEmptyComponent={
            query.length >= 2 && !loading ? (
              <View style={st.emptyWrap}>
                <Ionicons name="search-outline" size={40} color={colors.border} />
                <Text style={[st.emptyText, {color: colors.textMuted}]}>
                  कोई परिणाम नहीं मिला
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* ── Powered by Google ── */}
      <View style={[st.poweredRow, {borderTopColor: colors.border}]}>
        <Text style={[st.poweredText, {color: colors.textMuted}]}>powered by </Text>
        <Image
          source={{uri: 'https://developers.google.com/static/maps/documentation/images/google_on_white.png'}}
          style={st.googleLogo}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: {flex: 1},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.body,
    paddingVertical: 0,
  },

  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  gpsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gpsLabel: {fontSize: FontSizes.body, fontWeight: '700'},
  gpsSub: {fontSize: FontSizes.sm, marginTop: 2},

  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  recentTitle: {fontSize: FontSizes.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5},
  recentClear: {fontSize: FontSizes.sm, fontWeight: '600'},

  loadingWrap: {paddingVertical: 16, alignItems: 'center'},

  listContent: {paddingBottom: 20},

  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  resultIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultMain: {fontSize: FontSizes.body, fontWeight: '600'},
  resultSub: {fontSize: FontSizes.sm, marginTop: 2, lineHeight: 16},
  resultTextWrap: {flex: 1},

  emptyWrap: {alignItems: 'center', marginTop: 60, gap: 12},
  emptyText: {fontSize: FontSizes.body, textAlign: 'center'},

  poweredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  poweredText: {fontSize: FontSizes.sm},
  googleLogo: {width: 60, height: 20},
});
