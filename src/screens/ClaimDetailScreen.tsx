import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../contexts/AuthContext';
import { getClaim, reviewClaim, uploadReceipt } from '../lib/claims';
import type { Appeal, Claim, EobStatement, Receipt } from '../types/db';
import { StatusBadge } from '../components/StatusBadge';
import { dollars } from '../lib/format';
import { formatEastern, hoursRemaining } from '../lib/time';
import { proxyCanEdit, providerCanReview, appealWindowOpen } from '../lib/claimState';
import { colors, screen, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ClaimDetail'>;

export function ClaimDetailScreen({ route, navigation }: Props): JSX.Element {
  const { claimId } = route.params;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [eob, setEob] = useState<EobStatement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getClaim(claimId);
      setClaim(res.claim); setReceipts(res.receipts); setAppeal(res.appeal); setEob(res.eob);
    } catch (e) { Alert.alert('Load failed', e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [claimId]);

  useEffect(() => { load(); }, [load]);

  async function onAttachReceipt(): Promise<void> {
    if (!claim || !profile) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    try {
      await uploadReceipt(claim.id, profile.id,
        { uri: a.uri, name: a.fileName ?? `receipt-${Date.now()}.jpg`, mimeType: a.mimeType });
      await load();
    } catch (e) { Alert.alert('Upload failed', e instanceof Error ? e.message : String(e)); }
  }

  async function onReview(action: 'approve' | 'deny' | 'request_correction' | 'escalate'): Promise<void> {
    if (!claim) return;
    try {
      await reviewClaim({ claim_id: claim.id, action });
      await load();
    } catch (e) { Alert.alert('Review failed', e instanceof Error ? e.message : String(e)); }
  }

  if (loading || !claim) {
    return <View style={[screen.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={colors.accent} /></View>;
  }

  const isProvider = profile?.role === 'provider';
  const isSubmitter = profile?.id === claim.submitter_id;
  const canUpload = isSubmitter && proxyCanEdit(claim.status) && receipts.length === 0;
  const canReviewHere = isProvider && providerCanReview(claim.status);
  const canAppeal =
    isSubmitter &&
    !appeal &&
    (claim.status === 'denied' || claim.status === 'correction_requested' || claim.status === 'escalated') &&
    (claim.reviewed_at ? appealWindowOpen(claim.reviewed_at) : true);

  const hrs = hoursRemaining(claim.receipt_deadline);

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.padded}>
      <View style={screen.card}>
        <View style={[screen.row, { justifyContent: 'space-between' }]}>
          <Text style={screen.title}>{claim.vendor}</Text>
          <Text style={screen.title}>{dollars(claim.amount_cents)}</Text>
        </View>
        <StatusBadge status={claim.status} />
        <View style={{ height: spacing.md }} />
        <Text style={screen.muted}>Purchase date: {claim.purchase_date}</Text>
        <Text style={screen.muted}>Classification: {claim.classification}</Text>
        <Text style={screen.muted}>Enforcement: {claim.enforcement_level}</Text>
        <Text style={screen.muted}>Submitted: {formatEastern(claim.submitted_at)}</Text>
        {claim.reviewed_at && <Text style={screen.muted}>Reviewed: {formatEastern(claim.reviewed_at)}</Text>}
        {claim.agreement_section && <Text style={screen.text}>Agreement: {claim.agreement_section}</Text>}
        {claim.notes && <Text style={[screen.text, { marginTop: spacing.sm }]}>{claim.notes}</Text>}
        {hrs !== null && (
          <Text style={[screen.text, { marginTop: spacing.sm, color: hrs <= 0 ? colors.danger : colors.warning }]}>
            Receipt deadline: {formatEastern(claim.receipt_deadline!)} ({hrs.toFixed(1)}h)
          </Text>
        )}
      </View>

      <View style={screen.card}>
        <Text style={screen.heading}>Receipts</Text>
        {receipts.length === 0 && <Text style={screen.muted}>No receipts uploaded.</Text>}
        {receipts.map((r) => (
          <Text key={r.id} style={screen.text}>
            {r.storage_path} · {formatEastern(r.uploaded_at)}
          </Text>
        ))}
        {canUpload && (
          <Pressable onPress={onAttachReceipt} style={[screen.buttonSecondary, { marginTop: spacing.sm }]}>
            <Text style={screen.buttonText}>Attach receipt</Text>
          </Pressable>
        )}
      </View>

      {eob && (
        <View style={screen.card}>
          <Text style={screen.heading}>EOB</Text>
          <EobRow label="Billed" value={dollars(eob.billed_cents)} />
          <EobRow label="Allowed" value={dollars(eob.allowed_cents)} />
          <EobRow label="Provider responsibility" value={dollars(eob.provider_resp_cents)} />
          <EobRow label="Proxy responsibility" value={dollars(eob.proxy_resp_cents)} />
          {eob.beneficiary_impact_note && (
            <Text style={[screen.text, { marginTop: spacing.sm }]}>
              Beneficiary impact: {eob.beneficiary_impact_note}
            </Text>
          )}
        </View>
      )}

      {canReviewHere && (
        <View style={screen.card}>
          <Text style={screen.heading}>Provider review</Text>
          <View style={{ gap: spacing.sm }}>
            <Pressable onPress={() => onReview('approve')} style={[screen.buttonPrimary, { backgroundColor: colors.success }]}>
              <Text style={screen.buttonText}>Approve</Text>
            </Pressable>
            <Pressable onPress={() => onReview('request_correction')} style={screen.buttonSecondary}>
              <Text style={screen.buttonText}>Request correction</Text>
            </Pressable>
            <Pressable onPress={() => onReview('deny')} style={[screen.buttonPrimary, { backgroundColor: colors.danger }]}>
              <Text style={screen.buttonText}>Deny</Text>
            </Pressable>
            <Pressable onPress={() => onReview('escalate')} style={[screen.buttonPrimary, { backgroundColor: colors.warning }]}>
              <Text style={[screen.buttonText, { color: '#0b1220' }]}>Escalate enforcement</Text>
            </Pressable>
          </View>
        </View>
      )}

      {appeal && (
        <View style={screen.card}>
          <Text style={screen.heading}>Appeal</Text>
          <Text style={screen.text}>Reason: {appeal.reason}</Text>
          <Text style={screen.muted}>Evidence: {appeal.evidence_path}</Text>
          <Text style={screen.muted}>Deadline: {formatEastern(appeal.deadline_at)}</Text>
          {appeal.resolved && (
            <Text style={[screen.text, { marginTop: spacing.sm }]}>
              Resolved {appeal.resolved_at && formatEastern(appeal.resolved_at)}: {appeal.resolution}
            </Text>
          )}
        </View>
      )}

      {canAppeal && (
        <Pressable onPress={() => navigation.navigate('Appeal', { claimId: claim.id })} style={screen.buttonPrimary}>
          <Text style={screen.buttonText}>File an appeal</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function EobRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View style={[screen.row, { justifyContent: 'space-between', paddingVertical: 4 }]}>
      <Text style={screen.muted}>{label}</Text>
      <Text style={screen.text}>{value}</Text>
    </View>
  );
}
