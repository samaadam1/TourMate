import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { COLORS } from '../../constants/colors';
import { api } from '../../api';

export default function Confirmation() {
  const { username, email, userId, token } = useLocalSearchParams<{
    username: string;
    email: string;
    userId: string;
    token: string;
  }>();

  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [editableUsername, setEditableUsername] = useState(username);
  const [editableEmail, setEditableEmail] = useState(email);
  const [loading, setLoading] = useState(false);

  // ── "Change" button — toggles password fields ──────────────────────
  const handleChangePress = () => {
    setShowPasswordFields((prev) => !prev);
  };

  // ── Password change → PUT /api/auth/user/:id/password ──────────────
  const handlePasswordSave = async () => {
    if (!currentPassword || !newPassword) {
      return Alert.alert('Error', 'Please fill in both password fields');
    }
    if (newPassword.length < 6) {
      return Alert.alert('Error', 'New password must be at least 6 characters');
    }
    try {
      setLoading(true);
      await api.put(`/auth/user/${userId}/password`, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert('Success', 'Password updated successfully');
      setShowPasswordFields(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // ── Save Settings → PUT /api/auth/user/:id ─────────────────────────
  const handleSaveSettings = async () => {
    if (!editableUsername || !editableEmail) {
      return Alert.alert('Error', 'Username and email are required');
    }
    try {
      setLoading(true);
      await api.put(`/auth/user/${userId}`, {
        username: editableUsername,
        email: editableEmail,
      });
      Alert.alert('Success', 'Settings saved!', [
        { text: 'OK', onPress: () => router.replace('/(main)/home') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Username heading */}
      <Text style={styles.title}>{editableUsername}</Text>

      {/* Email */}
      <Text style={styles.label}>E-mail address</Text>
      <TextInput
        value={editableEmail}
        onChangeText={setEditableEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Username */}
      <Text style={styles.label}>Username</Text>
      <TextInput
        value={editableUsername}
        onChangeText={setEditableUsername}
        style={styles.input}
      />

      {/* Password row */}
      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordRow}>
        <TextInput
          value="************"
          editable={false}
          secureTextEntry
          style={[styles.input, { flex: 1 }]}
        />
        <TouchableOpacity
          onPress={handleChangePress}
          style={styles.changeButton}
        >
          <Text style={styles.changeButtonText}>
            {showPasswordFields ? 'Cancel' : 'Change'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Password change fields — shown only when Change is pressed */}
      {showPasswordFields && (
        <View style={styles.passwordFields}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Enter current password"
            placeholderTextColor="#999"
            style={styles.input}
          />
          <Text style={styles.label}>New Password</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Enter new password"
            placeholderTextColor="#999"
            style={styles.input}
          />
          <TouchableOpacity
            onPress={handlePasswordSave}
            disabled={loading}
            style={[styles.savePasswordButton, loading && styles.disabled]}
          >
            <Text style={styles.buttonText}>Save Password</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Save Settings */}
      <TouchableOpacity
        onPress={handleSaveSettings}
        disabled={loading}
        style={[styles.saveButton, loading && styles.disabled]}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  label: {
    marginTop: 20,
    color: '#777',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 8,
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    color: '#000',
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  changeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  changeButtonText: {
    fontWeight: 'bold',
  },
  passwordFields: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  savePasswordButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 30,
    marginTop: 40,
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.6,
  },
});