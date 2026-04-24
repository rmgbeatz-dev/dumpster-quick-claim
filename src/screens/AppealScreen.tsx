import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../contexts/AuthContext';
import { submitAppeal } from '../lib/claims';
import { supabase } from '../lib/supabase';
import { APPEAL_WINDOW_DAYS } from '../lib/claimState';
import { screen, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Appeal'>;

export function AppealScreen({ route, navigation }: Props): JSX.Element {
  const { claimId } = route.params;
  const { profile } = useAuth();
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function pickEvidence(): Promise<void> {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setEvidence({ uri: a.uri, name: a.name, mimeType: a.mimeType });
  }

  async function onSubmit(): Promise<void> {
    if (!profile) return;
    if (!reason.trim()) { Alert.alert('Reason required'); return; }
    if (!evidence) { Alert.alert('Evidence required', 'You must attach evidence to file an appeal.'); return; }
    setSubmitting(true);
    try {
      const path = `appeals/${claimId}/${Date.now()}-${evidence.name}`;
      const resp = await fetch(evidence.uri);
      const blob = await resp.blob();
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, blob, {
        contentType: evidence.mimeType ?? 'application/octet-stream',
      });
      if (upErr) throw upErr;
      await submitAppeal({ claim_id: claimId, reason: reason.trim(), evidence_path: path });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Appeal failed', e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.padded}>
      <View style={screen.card}>
        <Text style={screen.heading}>File appeal</Text>
        <Text style={screen.muted}>
          One appeal per claim. Must be filed within {APPEAL_WINDOW_DAYS} days of the provider&apos;s decision.
          Evidence is required.
        </Text>
        <View style={{ height: spacing.md }} />
        <Text style={screen.label}>Reason</Text>
        <TextInput
          style={[screen.input, { minHeight: 120 }]}
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="Explain why you are appealing the decision"
          placeholderTextColor="#64748b"
        />
        <Text style={screen.label}>Evidence</Text>
        <Pressable onPress={pickEvidence} style={screen.buttonSecondary}>
          <Text style={screen.buttonText}>{evidence ? `Attached: ${evidence.name}` : 'Attach file'}</Text>
        </Pressable>
      </View>
      <Pressable onPress={onSubmit} disabled={submitting} style={screen.buttonPrimary}>
        <Text style={screen.buttonText}>{submitting ? 'Submitting…' : 'Submit appeal'}</Text>
      </Pressable>
    </ScrollView>
  );
}
