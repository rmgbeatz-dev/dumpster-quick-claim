import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors, screen, spacing } from '../theme';

export function LoginScreen(): JSX.Element {
  const { signIn, previewMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(): Promise<void> {
    if (!email || !password) return Alert.alert('Missing fields', 'Email and password required.');
    setSubmitting(true);
    try { await signIn(email.trim(), password); }
    catch (e) { Alert.alert('Sign in failed', e instanceof Error ? e.message : String(e)); }
    finally { setSubmitting(false); }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[screen.root, screen.padded, { justifyContent: 'center' }]}
    >
      <View style={screen.card}>
        <Text style={screen.title}>Logistical Dumpster</Text>
        <Text style={[screen.muted, { marginBottom: 16 }]}>
          Claim, receipt, appeal, and enforcement ledger.
        </Text>
        {previewMode && (
          <View style={{ backgroundColor: colors.accentDark, padding: spacing.md, borderRadius: 8, marginBottom: spacing.md }}>
            <Text style={[screen.text, { fontWeight: '700', marginBottom: 4 }]}>Preview mode</Text>
            <Text style={screen.muted}>
              No Supabase connection - using mock data. Sign in with any password, and email keyword:
            </Text>
            <Text style={screen.text}>· ryan@example.test  → Provider</Text>
            <Text style={screen.text}>· tara@example.test  → Proxy</Text>
            <Text style={screen.text}>· patrick@example.test → Secondary Proxy</Text>
          </View>
        )}
        <Text style={screen.label}>Email</Text>
        <TextInput
          style={screen.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#64748b"
        />
        <Text style={screen.label}>Password</Text>
        <TextInput
          style={screen.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#64748b"
        />
        <Pressable onPress={onSubmit} disabled={submitting} style={screen.buttonPrimary}>
          <Text style={screen.buttonText}>{submitting ? 'Signing in…' : 'Sign in'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
