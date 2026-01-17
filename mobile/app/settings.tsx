import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { authenticatedFetch, clearAuth } from '@/lib/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleRemoveAds = () => {
    Alert.alert('Coming Soon', 'Remove ads feature will be available in a future update.');
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
      console.error('Delete account error:', err);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purchases</Text>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={handleRemoveAds}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="remove-circle-outline" size={22} color={colors.text} />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Remove Ads</Text>
                <Text style={styles.menuItemSubtext}>Coming Soon</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

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
                  <Text style={styles.confirmDeleteButtonText}>
                    {deleting ? 'Deleting...' : 'Delete Account'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={() => Alert.alert('Privacy Policy', 'View our privacy policy at housespades.com/privacy')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={() => Alert.alert('Terms of Service', 'View our terms of service at housespades.com/terms')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="reader-outline" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
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
    menuItemContent: {
      flex: 1,
    },
    menuItemText: {
      fontSize: 16,
      color: colors.text,
    },
    menuItemSubtext: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
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
