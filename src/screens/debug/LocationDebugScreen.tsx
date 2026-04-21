/**
 * LocationDebugScreen — Dev-only screen to verify & monitor location tracking.
 *
 * Features:
 *  - Tab-based view: Dashboard / Locations / Shifts / Fraud / System
 *  - Auto-refreshes every 30 seconds
 *  - Shows all backend data for the logged-in vendor
 *  - Test actions: create shifts, send batches, GPS bursts
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  NativeModules,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth, useTheme, useLocationTrackingContext} from '../../context';
import Axios from '../../services/Axios';
import {config1} from '../../constants/config';
import {FontSizes, scaleLineHeight} from '../../constants';

const AUTO_REFRESH_MS = 30_000;

type Tab = 'dashboard' | 'locations' | 'shifts' | 'fraud' | 'system';

interface LocationItem {
  lat: number;
  lng: number;
  accuracy: number;
  activity: string;
  insideGeofence: boolean;
  isMock: boolean;
  geofenceEvent: string | null;
  battery: number | null;
  timestamp: string;
}

interface ShiftItem {
  id: string;
  status: string;
  clientLocation: {latitude: number; longitude: number; address?: string};
  start: string;
  end: string;
  arrival: string | null;
  departure: string | null;
}

interface AlertItem {
  id: string;
  type: string;
  severity: string;
  details: string;
  resolved: boolean;
  createdAt: string;
}

interface GeofenceItem {
  event: string;
  lat: number;
  lng: number;
  timestamp: string;
}

interface NannyData {
  nannyId: string;
  locations: LocationItem[];
  shifts: ShiftItem[];
  alerts: AlertItem[];
  geofenceEvents: GeofenceItem[];
}

interface GlobalCounts {
  locationUpdates: number;
  activeShifts: number;
  unresolvedFraudAlerts: number;
  geofenceEvents: number;
}

export function LocationDebugScreen() {
  const {colors, isDark} = useTheme();
  const {vendorId} = useAuth();
  const {trackingState: engineState, isInitialized: engineReady, activeShift: contextShift, lastSentAt, sendCount} = useLocationTrackingContext();
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [nannyData, setNannyData] = useState<NannyData | null>(null);
  const [globalCounts, setGlobalCounts] = useState<GlobalCounts | null>(null);
  const [trackingState, setTrackingState] = useState<string>('Not initialized');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [testShiftId, setTestShiftId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [serverOk, setServerOk] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchAllData = useCallback(async () => {
    // 1. Global counts
    try {
      const {data} = await Axios.get(`${config1.API_HOST}/api/v1/location/test/status`);
      if (data.success) {
        setGlobalCounts(data.counts);
        setServerOk(true);
      }
    } catch {
      setServerOk(false);
    }

    // 2. Nanny-specific data
    if (vendorId) {
      try {
        const {data} = await Axios.get(`${config1.API_HOST}/api/v1/location/test/nanny/${vendorId}`);
        if (data.success) {
          setNannyData(data);
        }
      } catch {
        // silent
      }
    }

    // 3. Tracking engine state (from context)
    setTrackingState(
      engineReady
        ? JSON.stringify(engineState, null, 2)
        : 'Engine not initialized yet',
    );

    setLastRefresh(new Date());
  }, [vendorId, engineState, engineReady]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(fetchAllData, AUTO_REFRESH_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, fetchAllData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }

  // ─── Test Actions ──────────────────────────────────────────────────────────

  async function createTestShift() {
    if (!vendorId) {
      Alert.alert('Error', 'Log in first.');
      return;
    }
    try {
      const {data} = await Axios.post(`${config1.API_HOST}/api/v1/location/test/seed-shift`, {
        nannyId: vendorId,
        clientLatitude: 28.6353,
        clientLongitude: 77.3029,
        durationHours: 2,
      });
      if (data.success) {
        setTestShiftId(data.shift.shiftId);
        Alert.alert('Shift Created', `ID: ${data.shift.shiftId}\n2 hours`);
        fetchAllData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function sendTestBatch() {
    if (!vendorId) {
      Alert.alert('Error', 'Log in first.');
      return;
    }
    try {
      const now = Date.now();
      const {data} = await Axios.post(`${config1.API_HOST}/api/v1/location/batch`, {
        nannyId: vendorId,
        batchTimestamp: now,
        deviceInfo: {platform: Platform.OS, batteryLevel: 80, isCharging: false},
        points: [
          {
            latitude: 28.6353 + (Math.random() - 0.5) * 0.002,
            longitude: 77.3029 + (Math.random() - 0.5) * 0.002,
            accuracy: 12 + Math.random() * 10,
            timestamp: now,
            activityType: ['WALKING', 'STILL', 'IN_VEHICLE'][Math.floor(Math.random() * 3)],
            provider: 'test',
            isInsideGeofence: Math.random() > 0.5,
            isMock: false,
          },
        ],
      });
      Alert.alert('Sent', `Saved: ${data.pointsSaved} | Fraud: ${data.fraudAlerts}`);
      fetchAllData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function sendMockBatch() {
    if (!vendorId) return;
    try {
      const now = Date.now();
      const {data} = await Axios.post(`${config1.API_HOST}/api/v1/location/batch`, {
        nannyId: vendorId,
        batchTimestamp: now,
        deviceInfo: {platform: Platform.OS, batteryLevel: 45, isCharging: false},
        points: [
          {
            latitude: 28.6353,
            longitude: 77.3029,
            accuracy: 5.0,
            timestamp: now,
            activityType: 'STILL',
            provider: 'gps',
            isInsideGeofence: true,
            isMock: true,
          },
        ],
      });
      Alert.alert(
        'Mock Sent',
        `Saved: ${data.pointsSaved} | Fraud alerts: ${data.fraudAlerts}`,
      );
      fetchAllData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function sendGeofenceBatch(event: 'ENTER' | 'EXIT') {
    if (!vendorId) return;
    try {
      const now = Date.now();
      const {data} = await Axios.post(`${config1.API_HOST}/api/v1/location/batch`, {
        nannyId: vendorId,
        batchTimestamp: now,
        deviceInfo: {platform: Platform.OS, batteryLevel: 70, isCharging: false},
        points: [
          {
            latitude: 28.6353 + (event === 'EXIT' ? 0.005 : 0),
            longitude: 77.3029,
            accuracy: 10,
            timestamp: now,
            activityType: 'WALKING',
            provider: 'gps',
            isInsideGeofence: event === 'ENTER',
            geofenceEvent: event,
            isMock: false,
          },
        ],
      });
      Alert.alert(`Geofence ${event}`, `Saved: ${data.pointsSaved}`);
      fetchAllData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function triggerGPSBurst() {
    const nm = NativeModules.NannyLocationModule;
    if (!nm?.requestGPSBurst) {
      Alert.alert('Error', 'Native module not available');
      return;
    }
    try {
      const points = await nm.requestGPSBurst(30000, 3);
      Alert.alert(
        'GPS Burst',
        `${points.length} points:\n${points
          .map((p: any) => `(${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}) acc=${p.accuracy.toFixed(1)}m`)
          .join('\n')}`,
      );
    } catch (err: any) {
      Alert.alert('Failed', err.message);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const fmt = (ts: string | null) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'})} ${d.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', second: '2-digit'})}`;
  };

  const sevColor = (s: string) =>
    s === 'CRITICAL' ? '#DC2626' : s === 'HIGH' ? '#F59E0B' : s === 'MEDIUM' ? '#3B82F6' : '#6B7280';

  const statusBg = (s: string) =>
    s === 'ACTIVE' ? '#22C55E' : s === 'SCHEDULED' ? '#3B82F6' : s === 'COMPLETED' ? '#6B7280' : '#EF4444';

  // ─── Tab Content ───────────────────────────────────────────────────────────

  function renderDashboard() {
    return (
      <>
        {/* Connection Status */}
        <View style={[s.connRow, {backgroundColor: serverOk ? '#052e16' : '#450a0a'}]}>
          <View style={[s.connDot, {backgroundColor: serverOk ? '#22C55E' : '#EF4444'}]} />
          <Text style={s.connText}>
            {serverOk ? `Connected to ${config1.API_HOST}` : `Cannot reach ${config1.API_HOST}`}
          </Text>
          {lastRefresh && (
            <Text style={s.connTime}>Updated {lastRefresh.toLocaleTimeString()}</Text>
          )}
        </View>

        {/* Auto-Send Status */}
        <View style={[s.connRow, {backgroundColor: sendCount > 0 ? '#052e16' : '#1a1a2e', marginTop: 6}]}>
          <View style={[s.connDot, {backgroundColor: sendCount > 0 ? '#22C55E' : '#F59E0B'}]} />
          <Text style={s.connText}>
            Auto-send: {sendCount} batches sent
          </Text>
          {lastSentAt && (
            <Text style={s.connTime}>Last: {lastSentAt.toLocaleTimeString()}</Text>
          )}
        </View>

        {/* Stats Grid */}
        {globalCounts && (
          <View style={[s.statsGrid, {backgroundColor: colors.card}]}>
            <StatBox label="Locations" value={globalCounts.locationUpdates} color="#3B82F6" />
            <StatBox label="Active Shifts" value={globalCounts.activeShifts} color="#22C55E" />
            <StatBox label="Fraud Alerts" value={globalCounts.unresolvedFraudAlerts} color="#EF4444" />
            <StatBox label="Geofence Events" value={globalCounts.geofenceEvents} color="#F59E0B" />
          </View>
        )}

        {/* My Data Summary */}
        {nannyData && (
          <View style={[s.myDataCard, {backgroundColor: colors.card}]}>
            <Text style={[s.myDataTitle, {color: colors.text}]}>My Data (vendorId)</Text>
            <Text style={[s.myDataId, {color: colors.textSecondary}]}>{vendorId}</Text>
            <View style={s.myDataRow}>
              <MiniStat label="My Locations" value={nannyData.locations.length} color="#3B82F6" />
              <MiniStat label="My Shifts" value={nannyData.shifts.length} color="#22C55E" />
              <MiniStat label="My Alerts" value={nannyData.alerts.length} color="#EF4444" />
              <MiniStat label="Geofences" value={nannyData.geofenceEvents.length} color="#F59E0B" />
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={[s.sectionTitle, {color: colors.text}]}>Quick Actions</Text>
        <View style={s.buttonRow}>
          <Btn label="Create Shift" color="#3B82F6" onPress={createTestShift} />
          <Btn label="Send Location" color="#10B981" onPress={sendTestBatch} />
        </View>
        <View style={s.buttonRow}>
          <Btn label="Send Mock (Fraud)" color="#EF4444" onPress={sendMockBatch} />
          <Btn label="GPS Burst" color="#F59E0B" onPress={triggerGPSBurst} />
        </View>
        <View style={s.buttonRow}>
          <Btn label="Geofence ENTER" color="#8B5CF6" onPress={() => sendGeofenceBatch('ENTER')} />
          <Btn label="Geofence EXIT" color="#EC4899" onPress={() => sendGeofenceBatch('EXIT')} />
        </View>

        {testShiftId && (
          <View style={[s.infoBox, {backgroundColor: isDark ? '#052e16' : '#f0fdf4'}]}>
            <Text style={[s.infoText, {color: '#22C55E'}]}>
              Test Shift: {testShiftId}
            </Text>
          </View>
        )}

        {/* Last 3 Locations */}
        {nannyData && nannyData.locations.length > 0 && (
          <>
            <Text style={[s.sectionTitle, {color: colors.text}]}>
              Latest Locations ({nannyData.locations.length} total)
            </Text>
            {nannyData.locations.slice(0, 3).map((loc, i) => (
              <LocationCard key={i} loc={loc} colors={colors} fmt={fmt} />
            ))}
            {nannyData.locations.length > 3 && (
              <TouchableOpacity onPress={() => setActiveTab('locations')}>
                <Text style={s.viewAll}>View all {nannyData.locations.length} locations →</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </>
    );
  }

  function renderLocations() {
    if (!nannyData || nannyData.locations.length === 0) {
      return <EmptyState text="No location data yet. Send a test batch!" />;
    }
    return (
      <>
        <Text style={[s.sectionTitle, {color: colors.text}]}>
          All Locations ({nannyData.locations.length})
        </Text>
        {nannyData.locations.map((loc, i) => (
          <LocationCard key={i} loc={loc} colors={colors} fmt={fmt} index={i + 1} />
        ))}
      </>
    );
  }

  function renderShifts() {
    if (!nannyData || nannyData.shifts.length === 0) {
      return <EmptyState text="No shifts yet. Create a test shift!" />;
    }
    return (
      <>
        <Text style={[s.sectionTitle, {color: colors.text}]}>
          Shifts ({nannyData.shifts.length})
        </Text>
        {nannyData.shifts.map((shift, i) => (
          <View key={i} style={[s.card, {backgroundColor: colors.card}]}>
            <View style={s.cardHeader}>
              <Text style={[s.cardId, {color: colors.textSecondary}]}>#{shift.id.slice(-6)}</Text>
              <View style={[s.badge, {backgroundColor: statusBg(shift.status)}]}>
                <Text style={s.badgeText}>{shift.status}</Text>
              </View>
            </View>
            <View style={s.cardBody}>
              <Row label="Client" value={`(${shift.clientLocation.latitude.toFixed(4)}, ${shift.clientLocation.longitude.toFixed(4)})`} colors={colors} />
              {shift.clientLocation.address && (
                <Row label="Address" value={shift.clientLocation.address} colors={colors} />
              )}
              <Row label="Start" value={fmt(shift.start)} colors={colors} />
              <Row label="End" value={fmt(shift.end)} colors={colors} />
              <Row
                label="Arrival"
                value={shift.arrival ? fmt(shift.arrival) : 'Not arrived'}
                colors={colors}
                valueColor={shift.arrival ? '#22C55E' : '#EF4444'}
              />
              <Row
                label="Departure"
                value={shift.departure ? fmt(shift.departure) : 'Not departed'}
                colors={colors}
                valueColor={shift.departure ? '#F59E0B' : '#6B7280'}
              />
            </View>
          </View>
        ))}

        {/* Geofence Events */}
        {nannyData.geofenceEvents.length > 0 && (
          <>
            <Text style={[s.sectionTitle, {color: colors.text}]}>
              Geofence Events ({nannyData.geofenceEvents.length})
            </Text>
            {nannyData.geofenceEvents.map((g, i) => (
              <View key={i} style={[s.geoRow, {backgroundColor: colors.card}]}>
                <View style={[s.geoBadge, {backgroundColor: g.event === 'ENTER' ? '#22C55E' : '#EF4444'}]}>
                  <Text style={s.geoBadgeText}>{g.event === 'ENTER' ? '→ IN' : '← OUT'}</Text>
                </View>
                <View style={s.geoInfo}>
                  <Text style={[s.geoCoord, {color: colors.text}]}>
                    ({g.lat.toFixed(5)}, {g.lng.toFixed(5)})
                  </Text>
                  <Text style={[s.geoTime, {color: colors.textSecondary}]}>{fmt(g.timestamp)}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </>
    );
  }

  function renderFraud() {
    if (!nannyData || nannyData.alerts.length === 0) {
      return <EmptyState text="No fraud alerts. Send a mock location to test!" />;
    }
    return (
      <>
        <Text style={[s.sectionTitle, {color: colors.text}]}>
          Fraud Alerts ({nannyData.alerts.length})
        </Text>
        {nannyData.alerts.map((a, i) => (
          <View key={i} style={[s.card, {backgroundColor: colors.card, borderLeftWidth: 4, borderLeftColor: sevColor(a.severity)}]}>
            <View style={s.cardHeader}>
              <Text style={[s.alertType, {color: sevColor(a.severity)}]}>{a.type.replace(/_/g, ' ')}</Text>
              <View style={[s.badge, {backgroundColor: sevColor(a.severity)}]}>
                <Text style={s.badgeText}>{a.severity}</Text>
              </View>
            </View>
            <Text style={[s.alertDetails, {color: colors.text}]}>{a.details}</Text>
            <View style={s.alertFooter}>
              <Text style={[s.alertTime, {color: colors.textSecondary}]}>{fmt(a.createdAt)}</Text>
              <View style={[s.resolvedBadge, {backgroundColor: a.resolved ? '#22C55E20' : '#EF444420'}]}>
                <Text style={{color: a.resolved ? '#22C55E' : '#EF4444', fontSize: FontSizes.xs2, fontWeight: '600'}}>
                  {a.resolved ? 'Resolved' : 'Open'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </>
    );
  }

  function renderSystem() {
    const nm = NativeModules.NannyLocationModule;
    const methods = [
      'startSignificantLocationChanges', 'stopSignificantLocationChanges',
      'addGeofence', 'removeGeofence', 'requestGPSBurst',
      'startActivityRecognition', 'stopActivityRecognition',
    ];
    const available = nm ? methods.filter(m => typeof nm[m] === 'function') : [];

    return (
      <>
        <Text style={[s.sectionTitle, {color: colors.text}]}>Native Module</Text>
        <View style={[s.card, {backgroundColor: colors.card}]}>
          <StatusLine label="Module" ok={!!nm} text={nm ? 'Loaded' : 'NOT FOUND'} />
          <StatusLine label="Platform" ok text={Platform.OS} />
          <StatusLine
            label="Methods"
            ok={available.length >= 5}
            text={`${available.length}/${methods.length}`}
          />
          {methods.map(m => (
            <StatusLine key={m} label={`  ${m}`} ok={available.includes(m)} text={available.includes(m) ? '✓' : '✗'} small />
          ))}
        </View>

        <Text style={[s.sectionTitle, {color: colors.text}]}>Config</Text>
        <View style={[s.card, {backgroundColor: colors.card}]}>
          <StatusLine label="API URL" ok={!!config1.API_HOST} text={config1.API_HOST || 'NOT SET'} />
          <StatusLine label="Server" ok={serverOk} text={serverOk ? 'Connected' : 'Offline'} />
          <StatusLine label="Vendor ID" ok={!!vendorId} text={vendorId || 'Not logged in'} />
          <StatusLine label="Auto Refresh" ok={autoRefresh} text={autoRefresh ? '30s' : 'Off'} />
        </View>

        <Text style={[s.sectionTitle, {color: colors.text}]}>Engine State</Text>
        <View style={[s.codeBlock, {backgroundColor: isDark ? '#1a1a2e' : '#f0f0f0'}]}>
          <Text style={[s.codeText, {color: colors.text}]}>{trackingState}</Text>
        </View>

        <Text style={[s.sectionTitle, {color: colors.text}]}>Controls</Text>
        <View style={s.buttonRow}>
          <Btn
            label={autoRefresh ? 'Pause Auto-Refresh' : 'Start Auto-Refresh'}
            color={autoRefresh ? '#EF4444' : '#22C55E'}
            onPress={() => setAutoRefresh(!autoRefresh)}
          />
        </View>
      </>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const TABS: {key: Tab; label: string}[] = [
    {key: 'dashboard', label: 'Dashboard'},
    {key: 'locations', label: `Locations${nannyData ? ` (${nannyData.locations.length})` : ''}`},
    {key: 'shifts', label: `Shifts${nannyData ? ` (${nannyData.shifts.length})` : ''}`},
    {key: 'fraud', label: `Fraud${nannyData ? ` (${nannyData.alerts.length})` : ''}`},
    {key: 'system', label: 'System'},
  ];

  return (
    <SafeAreaView style={[s.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[s.header, {borderBottomColor: colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={{color: colors.primary, fontSize: FontSizes.subtitle}}>← Back</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, {color: colors.text}]}>Location Tracking</Text>
        <TouchableOpacity onPress={onRefresh} style={s.backBtn}>
          <Text style={{color: colors.primary, fontSize: FontSizes.body, textAlign: 'right'}}>
            {refreshing ? '...' : '↻'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[s.tab, activeTab === tab.key && {borderBottomColor: colors.primary, borderBottomWidth: 2}]}>
            <Text style={[s.tabText, {color: activeTab === tab.key ? colors.primary : colors.textSecondary}]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={s.scroll}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'locations' && renderLocations()}
        {activeTab === 'shifts' && renderShifts()}
        {activeTab === 'fraud' && renderFraud()}
        {activeTab === 'system' && renderSystem()}
        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function StatBox({label, value, color}: {label: string; value: number; color: string}) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statValue, {color}]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({label, value, color}: {label: string; value: number; color: string}) {
  return (
    <View style={s.miniStat}>
      <Text style={[s.miniStatValue, {color}]}>{value}</Text>
      <Text style={s.miniStatLabel}>{label}</Text>
    </View>
  );
}

function Btn({label, color, onPress}: {label: string; color: string; onPress: () => void}) {
  return (
    <TouchableOpacity style={[s.actionBtn, {backgroundColor: color}]} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function LocationCard({loc, colors, fmt, index}: {loc: LocationItem; colors: any; fmt: (s: string) => string; index?: number}) {
  return (
    <View style={[s.locCard, {backgroundColor: colors.card}]}>
      <View style={s.locHeader}>
        {index != null && <Text style={[s.locIndex, {color: colors.textMuted}]}>#{index}</Text>}
        <Text style={[s.locCoord, {color: colors.text}]}>
          {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
        </Text>
        {loc.isMock && <View style={s.mockBadge}><Text style={s.mockText}>MOCK</Text></View>}
      </View>
      <View style={s.locMeta}>
        <Tag label={`${loc.accuracy.toFixed(0)}m`} color="#3B82F6" />
        <Tag label={loc.activity} color="#8B5CF6" />
        <Tag label={loc.insideGeofence ? 'IN fence' : 'OUT fence'} color={loc.insideGeofence ? '#22C55E' : '#F59E0B'} />
        {loc.geofenceEvent && <Tag label={loc.geofenceEvent} color="#EC4899" />}
        {loc.battery != null && <Tag label={`${loc.battery}%`} color="#6B7280" />}
      </View>
      <Text style={[s.locTime, {color: colors.textSecondary}]}>{fmt(loc.timestamp)}</Text>
    </View>
  );
}

function Tag({label, color}: {label: string; color: string}) {
  return (
    <View style={[s.tag, {backgroundColor: color + '20'}]}>
      <Text style={[s.tagText, {color}]}>{label}</Text>
    </View>
  );
}

function Row({label, value, colors, valueColor}: {label: string; value: string; colors: any; valueColor?: string}) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, {color: colors.textSecondary}]}>{label}</Text>
      <Text style={[s.rowValue, {color: valueColor || colors.text}]}>{value}</Text>
    </View>
  );
}

function StatusLine({label, ok, text, small}: {label: string; ok: boolean; text: string; small?: boolean}) {
  return (
    <View style={s.statusLine}>
      <Text style={[s.statusDot, {color: ok ? '#22C55E' : '#EF4444'}]}>{ok ? '●' : '○'}</Text>
      <Text style={[small ? s.statusLabelSm : s.statusLabel, {color: '#9CA3AF'}]}>{label}</Text>
      <Text style={[s.statusValue, {color: ok ? '#D1D5DB' : '#EF4444'}]}>{text}</Text>
    </View>
  );
}

function EmptyState({text}: {text: string}) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {width: 60},
  headerTitle: {fontSize: FontSizes.subtitle2, fontWeight: '700'},
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
    maxHeight: 44,
  },
  tab: {paddingHorizontal: 16, paddingVertical: 12},
  tabText: {fontSize: FontSizes.sm2, fontWeight: '600'},
  scroll: {padding: 16},
  sectionTitle: {fontSize: FontSizes.input2, fontWeight: '700', marginTop: 18, marginBottom: 8},

  // Connection
  connRow: {flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 12},
  connDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
  connText: {color: '#D1D5DB', fontSize: FontSizes.sm, flex: 1},
  connTime: {color: '#9CA3AF', fontSize: FontSizes.xs},

  // Stats
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', borderRadius: 12, padding: 4},
  statBox: {width: '50%', padding: 14, alignItems: 'center'},
  statValue: {fontSize: FontSizes.display3, fontWeight: '800'},
  statLabel: {fontSize: FontSizes.xs2, color: '#9CA3AF', marginTop: 2},

  // My Data
  myDataCard: {borderRadius: 12, padding: 14, marginTop: 12},
  myDataTitle: {fontSize: FontSizes.body, fontWeight: '700', marginBottom: 2},
  myDataId: {fontSize: FontSizes.xs, marginBottom: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
  myDataRow: {flexDirection: 'row', justifyContent: 'space-around'},
  miniStat: {alignItems: 'center'},
  miniStatValue: {fontSize: FontSizes.h2x, fontWeight: '800'},
  miniStatLabel: {fontSize: FontSizes.xxs, color: '#9CA3AF', marginTop: 1},

  // Buttons
  buttonRow: {flexDirection: 'row', gap: 8, marginBottom: 8},
  actionBtn: {flex: 1, padding: 13, borderRadius: 10, alignItems: 'center'},
  btnText: {color: '#fff', fontWeight: '700', fontSize: FontSizes.sm},

  // Info
  infoBox: {padding: 10, borderRadius: 8, marginTop: 4},
  infoText: {fontSize: FontSizes.sm, fontWeight: '600'},
  viewAll: {color: '#3B82F6', fontSize: FontSizes.sm2, fontWeight: '600', textAlign: 'center', paddingVertical: 8},

  // Location Card
  locCard: {padding: 10, borderRadius: 10, marginBottom: 6},
  locHeader: {flexDirection: 'row', alignItems: 'center', gap: 6},
  locIndex: {fontSize: FontSizes.xs2, fontWeight: '700', width: 28},
  locCoord: {fontSize: FontSizes.sm2, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flex: 1},
  mockBadge: {backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4},
  mockText: {color: '#fff', fontSize: FontSizes.xxs, fontWeight: '800'},
  locMeta: {flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6},
  locTime: {fontSize: FontSizes.xs, marginTop: 4},

  // Tags
  tag: {paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4},
  tagText: {fontSize: FontSizes.xs, fontWeight: '600'},

  // Cards
  card: {borderRadius: 12, padding: 14, marginBottom: 8},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  cardId: {fontSize: FontSizes.xs2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
  cardBody: {},

  // Badge
  badge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6},
  badgeText: {color: '#fff', fontSize: FontSizes.xs, fontWeight: '700'},

  // Rows
  row: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4},
  rowLabel: {fontSize: FontSizes.sm},
  rowValue: {fontSize: FontSizes.sm, fontWeight: '600'},

  // Alerts
  alertType: {fontSize: FontSizes.sm2, fontWeight: '800'},
  alertDetails: {fontSize: FontSizes.sm, marginTop: 4, lineHeight: scaleLineHeight(18)},
  alertFooter: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8},
  alertTime: {fontSize: FontSizes.xs},
  resolvedBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6},

  // Geofence
  geoRow: {flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 4},
  geoBadge: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10},
  geoBadgeText: {color: '#fff', fontSize: FontSizes.xs2, fontWeight: '700'},
  geoInfo: {flex: 1},
  geoCoord: {fontSize: FontSizes.sm, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
  geoTime: {fontSize: FontSizes.xs, marginTop: 2},

  // Status lines
  statusLine: {flexDirection: 'row', alignItems: 'center', paddingVertical: 5},
  statusDot: {fontSize: FontSizes.xs, marginRight: 8},
  statusLabel: {fontSize: FontSizes.sm, flex: 1},
  statusLabelSm: {fontSize: FontSizes.xs2, flex: 1},
  statusValue: {fontSize: FontSizes.xs2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},

  // Code
  codeBlock: {padding: 12, borderRadius: 10},
  codeText: {fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: FontSizes.xs},

  // Empty
  empty: {padding: 40, alignItems: 'center'},
  emptyText: {color: '#6B7280', fontSize: FontSizes.body, textAlign: 'center'},
});
