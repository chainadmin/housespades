import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { authenticatedFetch, clearAuth, getStoredUser } from '@/lib/auth';
import Constants from 'expo-constants';

const PRIVACY_POLICY_URL = 'https://housespades.com/privacy';
const TERMS_OF_SERVICE_URL = 'https://housespades.com/terms';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    getStoredUser().then(user => setIsLoggedIn(!!user));
  }, []);

  const openURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open this link. Please visit ' + url + ' in your browser.');
      }
    } catch (err) {
      if (__DEV__) console.error('Failed to open URL:', err);
      Alert.alert('Error', 'Unable to open this link. Please visit ' + url + ' in your browser.');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText.toLowerCase() !== 'delete') {
      Alert.alert('Error', 'Please type "delete" to confirm account deletion.');
      return;
    }

    setDeleting(true);
    try {
      const response = await authenticatedFetch('/api/auth/account', { method: 'DELETE' });
      if (response.ok) {
        await clearAuth();
        Alert.alert('Account Deleted', 'Your account has been permanently deleted.', [
          { text: 'OK', onPress: () => router.replace('/auth/login') }
        ]);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.message || 'Failed to delete account');
      }
    } catch (err) {
      if (__DEV__) console.error('Delete account error:', err);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!isLoggedIn && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.card }]}
              onPress={() => router.push('/auth/login')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="log-in-outline" size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemText, { color: colors.primary }]}>Sign In</Text>
                  <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>
                    Sign in to play online and track your stats
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {isLoggedIn && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            {!showDeleteConfirm ? (
              <TouchableOpacity 
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => setShowDeleteConfirm(true)}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name="trash-outline" size={22} color={colors.error} />
                  <Text style={[styles.menuItemText, { color: colors.error }]}>Delete Account</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.deleteConfirmCard, { backgroundColor: colors.card }]}>
                <Text style={styles.deleteWarningTitle}>Delete Your Account?</Text>
                <Text style={styles.deleteWarningText}>
                  This action is permanent and cannot be undone. All your data, including match history and statistics, will be deleted.
                </Text>
                <Text style={styles.deleteInstructions}>
                  Type "delete" to confirm:
                </Text>
                <TextInput
                  style={[styles.deleteInput, { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border
                  }]}
                  value={deleteText}
                  onChangeText={setDeleteText}
                  placeholder="Type delete here"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                />
                <View style={styles.deleteButtons}>
                  <TouchableOpacity 
                    style={[styles.cancelButton, { borderColor: colors.border }]}
                    onPress={() => {
                      setShowDeleteConfirm(false);
                      setDeleteText('');
                    }}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.confirmDeleteButton, { 
                      backgroundColor: deleteText.toLowerCase() === 'delete' ? colors.error : colors.textSecondary,
                      opacity: deleting ? 0.5 : 1
                    }]}
                    onPress={handleDeleteAccount}
                    disabled={deleting || deleteText.toLowerCase() !== 'delete'}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmDeleteButtonText}>Delete Account</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={() => openURL(PRIVACY_POLICY_URL)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={() => openURL(TERMS_OF_SERVICE_URL)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="reader-outline" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Terms of Service</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={[styles.menuItem, { backgroundColor: colors.card }]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Version</Text>
            </View>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>{appVersion}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    content: {
      padding: 16,
      paddingTop: 8,
      gap: 24,
    },
    section: {
      gap: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
      paddingLeft: 4,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 12,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    menuItemText: {
      fontSize: 16,
      color: colors.text,
    },
    menuItemSubtext: {
      fontSize: 13,
      marginTop: 2,
    },
    versionText: {
      fontSize: 14,
    },
    deleteConfirmCard: {
      padding: 16,
      borderRadius: 12,
      gap: 12,
    },
    deleteWarningTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.error,
    },
    deleteWarningText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    deleteInstructions: {
      fontSize: 14,
      color: colors.text,
      marginTop: 4,
    },
    deleteInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },
    deleteButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    cancelButton: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '500',
    },
    confirmDeleteButton: {
      flex: 1,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    confirmDeleteButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: '#ffffff',
    },
  });
