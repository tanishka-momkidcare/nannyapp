/**
 * CreateShiftScreen — Create a new shift with map-based client location.
 *
 * Features:
 *  - Google Places Autocomplete search
 *  - Current location button
 *  - Interactive map with draggable marker
 *  - Geofence radius visualization
 *  - Duration picker
 *  - Creates shift via POST /api/v1/location/shifts
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import MapView, {Circle, Marker, PROVIDER_GOOGLE, Region} from 'react-native-maps';
import {GooglePlacesAutocomplete} from 'react-native-google-places-autocomplete';
import Geolocation from '@react-native-community/geolocation';
import Svg, {Path} from 'react-native-svg';
import Config from 'react-native-config';
import {useAuth, useTheme} from '../../context';
import {useLocationTrackingContext} from '../../context/LocationTrackingContext';
import {GOOGLE_MAPS_API_KEY, reverseGeocode} from '../../constants/config';

const {width: SW, height: SH} = Dimensions.get('window');
const API_BASE = Config.API_BASE_URL || 'http://localhost:3000';

const DURATION_OPTIONS = [
  {label: '2 hrs', hours: 2},
  {label: '4 hrs', hours: 4},
  {label: '6 hrs', hours: 6},
  {label: '8 hrs', hours: 8},
  {label: '10 hrs', hours: 10},
  {label: '12 hrs', hours: 12},
];

const RADIUS_OPTIONS = [100, 150, 200, 300, 500];

// Icons
function BackIcon({color}: {color: string}) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LocateIcon({color}: {color: string}) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2v2m0 16v2M2 12h2m16 0h2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 8a4 4 0 100 8 4 4 0 000-8z" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function SearchIcon({color}: {color: string}) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function CreateShiftScreen() {
  const {colors, isDark} = useTheme();
  const {vendorId} = useAuth();
  const {startShift} = useLocationTrackingContext();
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [durationHours, setDurationHours] = useState(8);
  const [geofenceRadius, setGeofenceRadius] = useState(150);
  const [submitting, setSubmitting] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [initialRegion, setInitialRegion] = useState<Region>({
    latitude: 28.6139,
    longitude: 77.209,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  // Get current location on mount
  useEffect(() => {
    Geolocation.getCurrentPosition(
      pos => {
        const region = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setInitialRegion(region);
      },
      () => {},
      {enableHighAccuracy: false, timeout: 10000, maximumAge: 60000},
    );
  }, []);

  const goToCurrentLocation = useCallback(async () => {
    Geolocation.getCurrentPosition(
      async pos => {
        const {latitude, longitude} = pos.coords;
        const address = await reverseGeocode(latitude, longitude);
        setSelectedLocation({latitude, longitude, address});
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);
      },
      err => Alert.alert('Location Error', err.message),
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 5000},
    );
  }, []);

  const onMapPress = useCallback(async (e: {nativeEvent: {coordinate: {latitude: number; longitude: number}}}) => {
    const {latitude, longitude} = e.nativeEvent.coordinate;
    const address = await reverseGeocode(latitude, longitude);
    setSelectedLocation({latitude, longitude, address});
  }, []);

  const onMarkerDragEnd = useCallback(async (e: {nativeEvent: {coordinate: {latitude: number; longitude: number}}}) => {
    const {latitude, longitude} = e.nativeEvent.coordinate;
    const address = await reverseGeocode(latitude, longitude);
    setSelectedLocation({latitude, longitude, address});
  }, []);

  async function handleCreateShift() {
    if (!vendorId) {
      Alert.alert('Error', 'Please log in first');
      return;
    }
    if (!selectedLocation) {
      Alert.alert('Error', 'Please select a client location on the map');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/location/shifts`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          nannyId: vendorId,
          clientLatitude: selectedLocation.latitude,
          clientLongitude: selectedLocation.longitude,
          clientAddress: selectedLocation.address,
          geofenceRadius,
          durationHours,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create shift');
      }

      // Start tracking for this shift
      await startShift({
        shiftId: data.shift.shiftId,
        nannyId: data.shift.nannyId,
        clientId: data.shift.clientId,
        clientLocation: {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          address: selectedLocation.address,
        },
        geofenceRadius: data.shift.geofenceRadius,
        startTime: data.shift.startTime,
        endTime: data.shift.endTime,
      });

      Alert.alert(
        'Shift Created! ✓',
        `Location: ${selectedLocation.address}\nDuration: ${durationHours} hours\nGeofence: ${geofenceRadius}m\n\nTracking started automatically.`,
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const mapStyle = isDark
    ? [
        {elementType: 'geometry', stylers: [{color: '#242f3e'}]},
        {elementType: 'labels.text.stroke', stylers: [{color: '#242f3e'}]},
        {elementType: 'labels.text.fill', stylers: [{color: '#746855'}]},
        {featureType: 'road', elementType: 'geometry', stylers: [{color: '#38414e'}]},
        {featureType: 'water', elementType: 'geometry', stylers: [{color: '#17263c'}]},
      ]
    : undefined;

  return (
    <SafeAreaView style={[st.container, {backgroundColor: colors.background}]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[st.header, {backgroundColor: colors.background, borderBottomColor: colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.headerBtn}>
          <BackIcon color={colors.text} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, {color: colors.text}]}>नई शिफ्ट बनाएं</Text>
        <View style={st.headerBtn} />
      </View>

      {/* Map */}
      <View style={st.mapContainer}>
        <MapView
          ref={mapRef}
          style={st.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          onPress={onMapPress}
          onMapReady={() => setMapReady(true)}
          showsUserLocation
          showsMyLocationButton={false}
          customMapStyle={mapStyle}>
          {selectedLocation && (
            <>
              <Marker
                coordinate={selectedLocation}
                draggable
                onDragEnd={onMarkerDragEnd}
                title="Client Location"
                description={selectedLocation.address}
              />
              <Circle
                center={selectedLocation}
                radius={geofenceRadius}
                fillColor="rgba(27,127,246,0.15)"
                strokeColor="rgba(27,127,246,0.5)"
                strokeWidth={2}
              />
            </>
          )}
        </MapView>

        {/* Search Bar Overlay */}
        <View style={st.searchOverlay}>
          <GooglePlacesAutocomplete
            placeholder="Search location..."
            onPress={(data, details) => {
              if (details?.geometry?.location) {
                const {lat, lng} = details.geometry.location;
                const address = data.description;
                setSelectedLocation({latitude: lat, longitude: lng, address});
                mapRef.current?.animateToRegion({
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }, 500);
                Keyboard.dismiss();
              }
            }}
            query={{key: GOOGLE_MAPS_API_KEY, language: 'hi', components: 'country:in'}}
            fetchDetails
            enablePoweredByContainer={false}
            debounce={300}
            minLength={2}
            nearbyPlacesAPI="GooglePlacesSearch"
            styles={{
              container: {flex: 0},
              textInputContainer: {
                backgroundColor: 'transparent',
              },
              textInput: {
                height: 44,
                borderRadius: 12,
                backgroundColor: isDark ? '#1a1a2e' : '#fff',
                color: colors.text,
                fontSize: 14,
                paddingLeft: 40,
                borderWidth: 1,
                borderColor: colors.border,
                ...Platform.select({
                  ios: {shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4},
                  android: {elevation: 4},
                }),
              },
              row: {
                backgroundColor: isDark ? '#1a1a2e' : '#fff',
                padding: 12,
              },
              description: {color: colors.text, fontSize: 13},
              separator: {backgroundColor: colors.border},
              listView: {
                backgroundColor: isDark ? '#1a1a2e' : '#fff',
                borderRadius: 12,
                marginTop: 4,
                ...Platform.select({
                  ios: {shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.15, shadowRadius: 6},
                  android: {elevation: 6},
                }),
              },
            }}
            renderLeftButton={() => (
              <View style={st.searchIconWrap}>
                <SearchIcon color={colors.textSecondary} />
              </View>
            )}
          />
        </View>

        {/* Current Location Button */}
        <TouchableOpacity
          style={[st.locateBtn, {backgroundColor: isDark ? '#1a1a2e' : '#fff'}]}
          onPress={goToCurrentLocation}
          activeOpacity={0.8}>
          <LocateIcon color="#1B7FF6" />
        </TouchableOpacity>

        {/* Selected Location Info */}
        {selectedLocation && (
          <View style={[st.locationInfo, {backgroundColor: isDark ? '#1a1a2eee' : '#ffffffee'}]}>
            <Text style={[st.locationAddr, {color: colors.text}]} numberOfLines={2}>
              {selectedLocation.address}
            </Text>
            <Text style={[st.locationCoord, {color: colors.textSecondary}]}>
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Sheet — Settings */}
      <View style={[st.sheet, {backgroundColor: colors.background}]}>
        {/* Duration */}
        <Text style={[st.label, {color: colors.text}]}>Duration</Text>
        <View style={st.chipRow}>
          {DURATION_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.hours}
              style={[
                st.chip,
                {
                  backgroundColor: durationHours === opt.hours ? '#1B7FF6' : (isDark ? '#1a1a2e' : '#f0f0f0'),
                  borderColor: durationHours === opt.hours ? '#1B7FF6' : colors.border,
                },
              ]}
              onPress={() => setDurationHours(opt.hours)}>
              <Text style={[st.chipText, {color: durationHours === opt.hours ? '#fff' : colors.text}]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Geofence Radius */}
        <Text style={[st.label, {color: colors.text}]}>Geofence Radius</Text>
        <View style={st.chipRow}>
          {RADIUS_OPTIONS.map(r => (
            <TouchableOpacity
              key={r}
              style={[
                st.chip,
                {
                  backgroundColor: geofenceRadius === r ? '#1B7FF6' : (isDark ? '#1a1a2e' : '#f0f0f0'),
                  borderColor: geofenceRadius === r ? '#1B7FF6' : colors.border,
                },
              ]}
              onPress={() => setGeofenceRadius(r)}>
              <Text style={[st.chipText, {color: geofenceRadius === r ? '#fff' : colors.text}]}>
                {r}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[
            st.createBtn,
            {backgroundColor: selectedLocation ? '#1B7FF6' : '#6B7280'},
          ]}
          onPress={handleCreateShift}
          disabled={!selectedLocation || submitting}
          activeOpacity={0.8}>
          <Text style={st.createBtnText}>
            {submitting ? 'Creating...' : 'शिफ्ट बनाएं और ट्रैकिंग शुरू करें'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  headerBtn: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {fontSize: 17, fontWeight: '700'},
  mapContainer: {flex: 1, position: 'relative'},
  map: {...StyleSheet.absoluteFillObject},
  searchOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 5,
  },
  searchIconWrap: {
    position: 'absolute',
    left: 12,
    top: 13,
    zIndex: 2,
  },
  locateBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4},
      android: {elevation: 4},
    }),
  },
  locationInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 64,
    padding: 10,
    borderRadius: 10,
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 3},
      android: {elevation: 3},
    }),
  },
  locationAddr: {fontSize: 13, fontWeight: '600', lineHeight: 18},
  locationCoord: {fontSize: 10, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
  sheet: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOffset: {width: 0, height: -3}, shadowOpacity: 0.1, shadowRadius: 6},
      android: {elevation: 8},
    }),
  },
  label: {fontSize: 13, fontWeight: '700', marginBottom: 8},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {fontSize: 13, fontWeight: '600'},
  createBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  createBtnText: {color: '#fff', fontSize: 15, fontWeight: '700'},
});
