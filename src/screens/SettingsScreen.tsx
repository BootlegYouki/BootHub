import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, Image, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme-provider';
import { TuiContainer } from '../components/tui-container';
import { TuiText } from '../components/tui-text';
import { TuiButton } from '../components/tui-button';
import { subscribeToSyncStatus, SyncStatus, clearSyncError, initializeRealtimeSync, closeRealtimeSync, processSyncQueue, updateSyncStatus, getKnownPeers, connectKnownPeersWS } from '../utils/sync-engine';
import { getSetting, saveSetting } from '../utils/storage';
import axios from 'axios';

interface SettingsScreenProps {}

export const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const { colors, isDark, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();

  const [isPaired, setIsPaired] = React.useState(false);
  const [pairedDeviceId, setPairedDeviceId] = React.useState<string | null>(null);
  const [pairingCodeInput, setPairingCodeInput] = React.useState('');
  const [isPairing, setIsPairing] = React.useState(false);
  const inputRef = React.useRef<TextInput>(null);

  // Sync engine states
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>({
    isSyncing: false,
    error: null,
    lastSynced: null,
  });

  const loadSettings = React.useCallback(async () => {
    try {
      const paired = await getSetting('is_paired');
      setIsPaired(paired === 'true');
      const deviceId = await getSetting('paired_device_id');
      setPairedDeviceId(deviceId || null);
    } catch (err) {
      console.error('Failed to load pairing status:', err);
    }
  }, []);

  // Initialize and subscribe to sync updates
  React.useEffect(() => {
    loadSettings();

    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
      loadSettings();
    });

    return unsubscribe;
  }, [loadSettings]);

  const submitPairingCode = async () => {
    if (pairingCodeInput.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit code.');
      return;
    }
    setIsPairing(true);
    try {
      let myDeviceId = await getSetting('device_id');
      if (!myDeviceId) {
        myDeviceId = `mobile_${Date.now()}`;
        await saveSetting('device_id', myDeviceId);
      }

      // Ensure mDNS discovery is running
      let peers = getKnownPeers();
      if (peers.size === 0) {
        initializeRealtimeSync().catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 1200));
        peers = getKnownPeers();
      }

      const targetUrls: string[] = [];
      for (const [name, ipPort] of peers.entries()) {
        if (name.includes('boothub')) {
          targetUrls.push(`http://${ipPort}/pair`);
        }
      }
      targetUrls.push('http://boothub_desktop.local:14201/pair');
      targetUrls.push('http://10.0.2.2:14201/pair'); // Android emulator fallback

      let pairedSuccess = false;

      for (const url of targetUrls) {
        try {
          const res = await axios.post(url, {
            code: pairingCodeInput,
            device_id: myDeviceId,
          }, { timeout: 2500 });

          if (res.data && res.data.success) {
            setIsPaired(true);
            setPairedDeviceId(res.data.device_id);
            await saveSetting('is_paired', 'true');
            await saveSetting('paired_device_id', res.data.device_id);
            updateSyncStatus({ isPaired: true });
            connectKnownPeersWS();
            processSyncQueue().catch(console.error);
            Alert.alert('Paired!', 'Successfully paired with Desktop.');
            pairedSuccess = true;
            break;
          }
        } catch (e) {
          // Continue trying next candidate URL
        }
      }

      if (!pairedSuccess) {
        Alert.alert(
          'Pairing Failed',
          'Could not pair with Desktop. Please make sure:\n\n1. BootHub Desktop is running on your computer.\n2. You clicked "Pair Device" on Desktop to show a fresh 6-digit code.\n3. Both devices are connected to the same Wi-Fi network.'
        );
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
              // Notify desktop backend of disconnection
              const peers = getKnownPeers();
              const targetUrls: string[] = [];
              for (const [name, ipPort] of peers.entries()) {
                if (name.includes('boothub')) {
                  targetUrls.push(`http://${ipPort}/unpair`);
                }
              }
              targetUrls.push('http://boothub_desktop.local:14201/unpair');
              targetUrls.push('http://10.0.2.2:14201/unpair');

              const myDeviceId = await getSetting('device_id');

              for (const url of targetUrls) {
                try {
                  await axios.post(url, { device_id: myDeviceId }, { timeout: 1500 });
                  break;
                } catch (e) {}
              }

              await saveSetting('is_paired', 'false');
              setIsPaired(false);
              setPairedDeviceId(null);
              updateSyncStatus({ isPaired: false });
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

  const effectiveIsPaired = syncStatus.isPaired !== undefined ? syncStatus.isPaired : isPaired;

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

        {/* Synchronization Settings */}
        <TuiContainer label="Sync" style={styles.containerMargin}>
          {effectiveIsPaired ? (
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
          ) : (
            <View style={styles.disconnectedCard}>
              <TuiText size="sm" variant="muted" style={styles.infoText}>
                Enter the 6-digit code shown on BootHub Desktop:
              </TuiText>

              <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpRow}>
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = pairingCodeInput[index] || '';
                  const isFocused = pairingCodeInput.length === index || (pairingCodeInput.length === 6 && index === 5);
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        {
                          borderColor: isFocused ? colors.primary : colors.border,
                          backgroundColor: colors.card,
                        },
                      ]}
                    >
                      <TuiText size="lg" weight="bold" style={{ color: colors.foreground }}>
                        {digit}
                      </TuiText>
                    </View>
                  );
                })}
              </Pressable>

              <TextInput
                ref={inputRef}
                value={pairingCodeInput}
                onChangeText={(text) => setPairingCodeInput(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                style={styles.hiddenInput}
              />

              <TuiButton
                onPress={submitPairingCode}
                variant="accent"
                style={styles.linkBtn}
                loading={isPairing}
              >
                Pair Now
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
