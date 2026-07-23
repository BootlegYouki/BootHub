import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, Image, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme-provider';
import { TuiContainer } from '../components/tui-container';
import { TuiText } from '../components/tui-text';
import { TuiButton } from '../components/tui-button';
import { subscribeToSyncStatus, SyncStatus, clearSyncError, initializeRealtimeSync, closeRealtimeSync, processSyncQueue, updateSyncStatus, getKnownPeers } from '../utils/sync-engine';
import { getSetting, saveSetting } from '../utils/storage';
import axios from 'axios';



interface SettingsScreenProps {}

export const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const { colors, isDark, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();

  const [isPaired, setIsPaired] = React.useState(false);
  const [pairedDeviceId, setPairedDeviceId] = React.useState<string | null>(null);
  const [isPairingMode, setIsPairingMode] = React.useState(false);
  const [pairingCodeInput, setPairingCodeInput] = React.useState('');
  const [isPairing, setIsPairing] = React.useState(false);

  // Sync engine states
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>({
    isSyncing: false,
    error: null,
    lastSynced: null,
  });

  // Initialize and subscribe to sync updates
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const paired = await getSetting('is_paired');
        setIsPaired(paired === 'true');
        const deviceId = await getSetting('paired_device_id');
        if (deviceId) setPairedDeviceId(deviceId);
      } catch (err) {
        console.error('Failed to load pairing status:', err);
      }
    };
    loadSettings();

    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  const handleStartPairing = () => {
    setIsPairingMode(true);
    setPairingCodeInput('');
  };

  const submitPairingCode = async () => {
    if (pairingCodeInput.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit code.');
      return;
    }
    setIsPairing(true);
    try {
      // Broadcast to local network or connect directly if IP is known.
      // For now, assume Desktop is found via mDNS, but we need its IP.
      // A full mDNS scan should happen, but here we can just alert until network discovery is fully hooked up.
      // To simulate, we could hit http://boothub_desktop.local:14201/pair
      
      let myDeviceId = await getSetting('device_id');
      if (!myDeviceId) {
        myDeviceId = `mobile_${Date.now()}`; // simple fallback
        await saveSetting('device_id', myDeviceId);
      }

      // Try dynamically discovered IP first, fallback to mDNS hostname
      try {
        const peers = getKnownPeers();
        let targetUrl = 'http://boothub_desktop.local:14201/pair';
        
        // Find the desktop peer if it was discovered via mDNS
        for (const [name, ipPort] of peers.entries()) {
          if (name.includes('boothub')) {
            targetUrl = `http://${ipPort}/pair`;
            break;
          }
        }

        const res = await axios.post(targetUrl, {
          code: pairingCodeInput,
          device_id: myDeviceId
        }, { timeout: 3000 });
        
        if (res.data.success) {
          setIsPaired(true);
          setPairedDeviceId(res.data.device_id);
          await saveSetting('is_paired', 'true');
          await saveSetting('paired_device_id', res.data.device_id);
          setIsPairingMode(false);
          Alert.alert('Paired!', 'Successfully paired with Desktop.');
          return;
        } else {
          Alert.alert('Failed', 'Incorrect code.');
          return;
        }
      } catch (err) {
        console.warn('mDNS hostname failed, try entering IP manually later. Error:', err);
        Alert.alert('Network Error', 'Could not reach Desktop at boothub_desktop.local:14201.');
      }
    } catch (err: any) {
      Alert.alert('Pairing Error', err.message);
    } finally {
      setIsPairing(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Disconnect Device',
      'This will stop auto-syncing. Local items will remain on your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await saveSetting('is_paired', 'false');
              setIsPaired(false);
              setPairedDeviceId(null);
              closeRealtimeSync();
            } catch (err) {
              console.error('Error disconnecting:', err);
            }
          },
        },
      ]
    );
  };

  const handleManualSync = async () => {
    updateSyncStatus({ isSyncing: true, error: null });
    try {
      await processSyncQueue();
    } catch (err: any) {
      console.error('Manual sync execution failed:', err);
      updateSyncStatus({
        isSyncing: false,
        error: 'Sync failed: ' + (err.message || String(err)),
      });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
      >
        {/* System Color Theme Preferences */}
        <TuiContainer label="System Preferences">
          <TuiText size="sm" variant="muted" style={styles.preferenceLabel}>
            Select app color theme:
          </TuiText>
          <View style={styles.segmentsRow}>
            <View style={styles.segmentCol}>
              <TuiButton
                onPress={() => setThemeMode('dark')}
                variant={isDark ? 'accent' : 'outline'}
                style={styles.preferenceBtn}
              >
                Dark Mode
              </TuiButton>
            </View>
            <View style={styles.segmentCol}>
              <TuiButton
                onPress={() => setThemeMode('light')}
                variant={!isDark ? 'accent' : 'outline'}
                style={styles.preferenceBtn}
              >
                Light Mode
              </TuiButton>
            </View>
          </View>
        </TuiContainer>

        {/* Google Drive Synchronization Settings */}
        <TuiContainer label="P2P Sync" style={styles.containerMargin}>
          {isPaired ? (
            <View style={styles.syncCard}>
              <View style={styles.userRow}>
                <View style={[styles.avatarPlaceholder, { borderColor: colors.primary }]}>
                  <TuiText size="sm" weight="bold" style={{ color: colors.primary }}>D</TuiText>
                </View>
                <View style={styles.userDetails}>
                  <TuiText weight="bold">Paired Desktop</TuiText>
                  <TuiText size="xs" variant="muted">
                    {pairedDeviceId ? pairedDeviceId.slice(0, 8) : 'Connected'}
                  </TuiText>
                </View>
              </View>

              <View style={styles.actionRow}>
                <View style={styles.actionCol}>
                  <TuiButton
                    onPress={handleManualSync}
                    variant="accent"
                    style={styles.syncBtn}
                    disabled={syncStatus.isSyncing}
                  >
                    {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
                  </TuiButton>
                </View>
                <View style={styles.actionCol}>
                  <TuiButton
                    onPress={handleSignOut}
                    variant="outline"
                    style={styles.syncBtn}
                    disabled={syncStatus.isSyncing}
                  >
                    Disconnect
                  </TuiButton>
                </View>
              </View>
            </View>
          ) : isPairingMode ? (
            <View style={styles.disconnectedCard}>
              <TuiText size="sm" variant="muted" style={styles.infoText}>
                Enter the 6-digit code shown on BootHub Desktop:
              </TuiText>
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 16, borderRadius: 8 }}>
                <TextInput
                  value={pairingCodeInput}
                  onChangeText={setPairingCodeInput}
                  placeholder="123456"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  maxLength={6}
                  style={{
                    color: colors.foreground,
                    fontSize: 24,
                    textAlign: 'center',
                    padding: 12,
                    fontFamily: 'JetBrainsMono_700Bold',
                  }}
                />
              </View>
              <TuiButton
                onPress={submitPairingCode}
                variant="accent"
                style={styles.linkBtn}
                loading={isPairing}
              >
                Pair Now
              </TuiButton>
            </View>
          ) : (
            <View style={styles.disconnectedCard}>
              <TuiText size="sm" variant="muted" style={styles.infoText}>
                Pair with BootHub Desktop on your local network to sync automatically.
              </TuiText>
              <TuiButton
                onPress={handleStartPairing}
                variant="outline"
                style={styles.linkBtn}
              >
                Pair with Desktop
              </TuiButton>
            </View>
          )}
        </TuiContainer>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  containerMargin: {
    marginTop: 18,
  },
  preferenceLabel: {
    marginBottom: 8,
  },
  segmentsRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  segmentCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  preferenceBtn: {
    marginVertical: 4,
    height: 44,
    justifyContent: 'center',
    paddingVertical: 0,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncCard: {
    paddingVertical: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  actionCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  syncBtn: {
    height: 40,
    justifyContent: 'center',
    paddingVertical: 0,
  },
  disconnectedCard: {
    paddingVertical: 8,
  },
  infoText: {
    marginBottom: 16,
    lineHeight: 18,
  },
  linkBtn: {
    height: 44,
    justifyContent: 'center',
    paddingVertical: 0,
  },
});
