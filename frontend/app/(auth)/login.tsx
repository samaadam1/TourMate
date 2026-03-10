// app/(auth)/login.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = `http://${process.env.EXPO_PUBLIC_API_URL}:3000/api`;

export default function Login() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Login Failed', data.error ?? 'Invalid credentials.');
        return;
      }

      // Save token and user to storage
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      // Route based on role
      if (data.user.role === 'admin') {
        router.replace('/(admin)/dashboard' as any);
      } else {
        router.replace('/(main)/home' as any);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not connect to server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoEmoji}>🧳</Text>
        <Text style={styles.logoText}>TourMate</Text>
        <Text style={styles.logoSubtitle}>Your Egyptian adventure awaits</Text>
      </View>

      <Text style={styles.title}>Sign in</Text>

      {/* Email */}
      <Text style={styles.inputLabel}>Email</Text>
      <TextInput
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Password */}
      <Text style={styles.inputLabel}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Enter your password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          style={styles.passwordInput}
          placeholderTextColor="#999"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
          <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={24} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Login Button */}
      <TouchableOpacity onPress={handleLogin} style={styles.loginButton} disabled={loading} activeOpacity={0.85}>
        {loading
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.loginButtonText}>Continue</Text>
        }
      </TouchableOpacity>

      {/* Signup */}
      <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)}>
        <Text style={styles.signupText}>
          Don't have an account? <Text style={styles.signupLink}>Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFF', justifyContent: 'center' },

  logoContainer: { alignItems: 'center', marginBottom: 36 },
  logoEmoji:     { fontSize: 48, marginBottom: 8 },
  logoText:      { fontSize: 28, fontWeight: '900', color: '#1A1A1A' },
  logoSubtitle:  { fontSize: 14, color: '#999', marginTop: 4 },

  title:      { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  inputLabel: { fontSize: 15, fontWeight: '600', marginTop: 16, color: '#333', marginBottom: 6 },
  input:      { borderWidth: 1, borderColor: '#E0E0E0', padding: 14, borderRadius: 14, fontSize: 16, color: '#000', backgroundColor: '#FAFAFA' },

  passwordContainer: { flexDirection: 'row', alignItems: 'center' },
  passwordInput:     { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', padding: 14, borderRadius: 14, fontSize: 16, color: '#000', backgroundColor: '#FAFAFA' },
  eyeIcon:           { position: 'absolute', right: 16 },

  loginButton:     { backgroundColor: '#E67E22', padding: 16, borderRadius: 30, marginTop: 28, alignItems: 'center' },
  loginButtonText: { fontWeight: '800', color: '#FFF', fontSize: 16 },

  signupText: { marginTop: 16, textAlign: 'center', fontSize: 14, color: '#444' },
  signupLink: { textDecorationLine: 'underline', color: '#E67E22', fontWeight: '600' },
});