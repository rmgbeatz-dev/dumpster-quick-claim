import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../contexts/AuthContext';
import { submitClaim, uploadReceipt } from '../lib/claims';
import { centsFromDollars } from '../lib/format';
import { colors, screen, spacing } from '../theme';
import type { Classification } from '../types/db';

type Props = NativeStackScreenProps<RootStackParamList, 'SubmitClaim'>;

const CLASSIFICATIONS: Classification[] = ['essential', 'extra', 'discretionary'];

export function SubmitClaimScreen({ navigation }: Props): JSX.Element {
  const { profile } = useAuth();
  const [vendor, setVendor] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [classification, setClassification] = useState<Classification>('essential');
  const [agreementSection, setAgreementSection] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickReceipt(): Promise<void> {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setReceipt({ uri: a.uri, name: a.fileName ?? `receipt-${Date.now()}.jpg`, mimeType: a.mimeType });
  }

  async function onSubmit(): Promise<void> {
    if (!profile) return;
    if (!vendor || !amount) { Alert.alert('Missing fields', 'Vendor and amount required.'); return; }
    setSaving(true);
    try {
      const claim = await submitClaim({
        vendor: vendor.trim(),
        purchase_date: purchaseDate,
        amount_cents: centsFromDollars(amount),
        classification,
        agreement_section: agreementSection || undefined,
        notes: notes || undefined,
        has_receipt: Boolean(receipt),
      });
      if (receipt) await uploadReceipt(claim.id, profile.id, receipt);
      navigation.replace('ClaimDetail', { claimId: claim.id });
    } catch (e) {
      Alert.alert('Submit failed', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.padded} keyboardShouldPersistTaps="handled">
      <View style={screen.card}>
        <Text style={screen.heading}>Claim details</Text>

        <Text style={screen.label}>Vendor</Text>
        <TextInput style={screen.input} value={vendor} onChangeText={setVendor}
          placeholder="e.g. CVS Pharmacy" placeholderTextColor="#64748b" />

        <Text style={screen.label}>Purchase date (YYYY-MM-DD)</Text>
        <TextInput style={screen.input} value={purchaseDate} onChangeText={setPurchaseDate}
          placeholder="2026-04-15" placeholderTextColor="#64748b" />

        <Text style={screen.label}>Amount (USD)</Text>
        <TextInput style={screen.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad"
          placeholder="45.23" placeholderTextColor="#64748b" />

        <Text style={screen.label}>Classification</Text>
        <View style={[screen.row, { gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' }]}>
          {CLASSIFICATIONS.map((c) => (
            <Pressable key={c} onPress={() => setClassification(c)}
              style={[
                screen.buttonSecondary,
                classification === c ? { borderColor: colors.accent, backgroundColor: colors.accentDark } : null,
              ]}>
              <Text style={screen.buttonText}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={screen.label}>Agreement section</Text>
        <TextInput style={screen.input} value={agreementSection} onChangeText={setAgreementSection}
          placeholder="Section 3.a" placeholderTextColor="#64748b" />

        <Text style={screen.label}>Notes</Text>
        <TextInput style={[screen.input, { minHeight: 80 }]} value={notes} onChangeText={setNotes}
          multiline placeholder="Context for the provider" placeholderTextColor="#64748b" />

        <Text style={screen.label}>Receipt</Text>
        <Pressable onPress={pickReceipt} style={screen.buttonSecondary}>
          <Text style={screen.buttonText}>{receipt ? `Attached: ${receipt.name}` : 'Attach photo'}</Text>
        </Pressable>
        {!receipt && (
          <Text style={[screen.muted, { marginTop: spacing.sm }]}>
            No receipt: claim starts in Receipt Pending – 72-hour grace period.
          </Text>
        )}
      </View>

      <Pressable onPress={onSubmit} disabled={saving} style={screen.buttonPrimary}>
        <Text style={screen.buttonText}>{saving ? 'Submitting…' : 'Submit Claim'}</Text>
      </Pressable>
    </ScrollView>
  );
}
