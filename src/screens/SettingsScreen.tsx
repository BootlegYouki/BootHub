import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme-provider';
import { TuiContainer } from '../components/tui-container';
import { TuiText } from '../components/tui-text';
import { TuiButton } from '../components/tui-button';
import * as AuthSession from 'expo-auth-session';
import {
  discovery,
  getClientId,
  saveAuthSession,
  clearAuthSession,
  fetchUserInfo,
  isUserSignedIn,
  getGoogleUserInfo,
  exchangeCodeForTokens,
  REDIRECT_SCHEME,
} from '../utils/google-drive';
import { subscribeToSyncStatus, processSyncQueue, getSyncQueue, SyncStatus } from '../utils/sync-engine';

interface SettingsScreenProps {}

export const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const { colors, isDark, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();

  // Auth states
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [userInfo, setUserInfo] = React.useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);

  // Sync engine states
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>({
    isSyncing: false,
    error: null,
    lastSynced: null,
  });
  const [pendingQueueCount, setPendingQueueCount] = React.useState(0);

  // Expo Auth Request Setup
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: getClientId(),
      scopes: ['https://www.googleapis.com/auth/drive.file'],
      redirectUri: AuthSession.makeRedirectUri({
        scheme: REDIRECT_SCHEME,
      }),
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
    discovery
  );

  // Initialize and subscribe to sync updates
  React.useEffect(() => {
    const loadSession = async () => {
      try {
        const signed = await isUserSignedIn();
        setIsSignedIn(signed);
        if (signed) {
          const info = await getGoogleUserInfo();
          setUserInfo(info);
        }
      } catch (err) {
        console.error('Failed to resolve initial Google auth status:', err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    loadSession();

    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
      getSyncQueue()
        .then((q) => setPendingQueueCount(q.length))
        .catch(() => {});
    });

    return unsubscribe;
  }, []);

  // Handle Google OAuth authorization code redirect response
  React.useEffect(() => {
    if (response?.type === 'success' && response.authentication) {
      const exchangeCode = async () => {
        setIsAuthLoading(true);
        try {
          const { code } = response.params;
          const { codeVerifier } = request || {};
          if (!code || !codeVerifier) {
            throw new Error('Authorization response parameters are invalid.');
          }

          const redirectUri = AuthSession.makeRedirectUri({ scheme: REDIRECT_SCHEME });
          const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);
          const info = await fetchUserInfo(tokens.access_token);
          
          await saveAuthSession(tokens.access_token, tokens.refresh_token, tokens.expires_in, info);
          
          setIsSignedIn(true);
          setUserInfo(info);
          
          // Trigger initial sync run to mirror existing items
          processSyncQueue();
        } catch (err: any) {
          console.error('Failed to complete Google OAuth exchange:', err);
          Alert.alert('Authentication Error', err.message || String(err));
        } finally {
          setIsAuthLoading(false);
        }
      };
      exchangeCode();
    }
  }, [response]);

  const handleSignIn = () => {
    setIsAuthLoading(true);
    promptAsync().finally(() => setIsAuthLoading(false));
  };

  const handleSignOut = () => {
    Alert.alert(
      'Disconnect Google Drive',
      'This will stop auto-syncing. Local items will remain on your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setIsAuthLoading(true);
            try {
              await clearAuthSession();
              setIsSignedIn(false);
              setUserInfo(null);
            } catch (err) {
              console.error('Error signing out from Google Account:', err);
            } finally {
              setIsAuthLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleManualSync = () => {
    processSyncQueue().catch((err) => {
      console.error('Manual sync execution failed:', err);
    });
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
        <TuiContainer label="Connect to Cloud" style={styles.containerMargin}>
          {isSignedIn ? (
            <View style={styles.syncCard}>
              {/* User Account Identity */}
              <View style={styles.userRow}>
                {userInfo?.picture ? (
                  <Image source={{ uri: userInfo.picture }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { borderColor: colors.primary }]}>
                    <TuiText size="sm" weight="bold" style={{ color: colors.primary }}>
                      {userInfo?.name?.substring(0, 1).toUpperCase() || 'U'}
                    </TuiText>
                  </View>
                )}
                <View style={styles.userDetails}>
                  <TuiText weight="bold">{userInfo?.name || 'Google User'}</TuiText>
                  <TuiText size="xs" variant="muted">
                    {userInfo?.email || 'Connected'}
                  </TuiText>
                </View>
              </View>

              {/* Live Sync Status Info */}
              <View style={[styles.statusBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                {syncStatus.isSyncing ? (
                  <View style={styles.statusRow}>
                    <ActivityIndicator size="small" color={colors.primary} style={styles.smallSpinner} />
                    <TuiText size="sm">Synchronizing data...</TuiText>
                  </View>
                ) : syncStatus.error ? (
                  <TuiText size="sm" style={{ color: colors.destructive || '#ef4444' }}>
                    {syncStatus.error}
                  </TuiText>
                ) : (
                  <View>
                    <TuiText size="sm">
                      Sync Status: <TuiText size="sm" weight="bold" style={{ color: colors.primary }}>Up to date</TuiText>
                    </TuiText>
                    {syncStatus.lastSynced && (
                      <TuiText size="xs" variant="muted" style={styles.timeLabel}>
                        Last Synced: {syncStatus.lastSynced}
                      </TuiText>
                    )}
                  </View>
                )}

                {pendingQueueCount > 0 && (
                  <TuiText size="xs" style={[styles.backlogText, { color: colors.primary }]}>
                    {pendingQueueCount} operation{pendingQueueCount > 1 ? 's' : ''} queued offline
                  </TuiText>
                )}
              </View>

              {/* Sync Action Buttons */}
              <View style={styles.actionRow}>
                <View style={styles.actionCol}>
                  <TuiButton
                    onPress={handleManualSync}
                    variant="accent"
                    style={styles.syncBtn}
                    disabled={syncStatus.isSyncing}
                  >
                    Sync Now
                  </TuiButton>
                </View>
                <View style={styles.actionCol}>
                  <TuiButton
                    onPress={handleSignOut}
                    variant="outline"
                    style={styles.syncBtn}
                    loading={isAuthLoading}
                  >
                    Disconnect
                  </TuiButton>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.disconnectedCard}>
              <TuiText size="sm" variant="muted" style={styles.infoText}>
                Link Google Drive to back up your links, texts, photos, and files automatically.
              </TuiText>
              <TuiButton
                onPress={handleSignIn}
                variant="outline"
                style={styles.linkBtn}
                loading={isAuthLoading}
              >
                Connect Google Drive
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
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  statusBox: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallSpinner: {
    marginRight: 8,
  },
  timeLabel: {
    marginTop: 4,
  },
  backlogText: {
    marginTop: 6,
    fontWeight: 'bold',
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
