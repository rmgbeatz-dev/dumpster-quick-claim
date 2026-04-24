import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../contexts/AuthContext';
import { listClaims } from '../lib/claims';
import type { Claim } from '../types/db';
import { StatusBadge } from '../components/StatusBadge';
import { dollars } from '../lib/format';
import { formatEasternShort, hoursRemaining } from '../lib/time';
import { colors, screen, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props): JSX.Element {
  const { profile, signOut } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setClaims(await listClaims()); }
    catch { /* noop - rendered below */ }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isProxy = profile?.role === 'proxy' || profile?.role === 'secondary_proxy';
  const isProvider = profile?.role === 'provider';

  return (
    <View style={[screen.root]}>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.accent} />}
        ListHeaderComponent={(
          <View>
            <View style={[screen.row, { justifyContent: 'space-between' }]}>
              <Text style={screen.title}>Hello, {profile?.display_name ?? 'user'}</Text>
              <Pressable onPress={signOut}><Text style={{ color: colors.accent }}>Sign out</Text></Pressable>
            </View>
            <Text style={[screen.muted, { marginBottom: spacing.md }]}>Role: {profile?.role}</Text>
            <View style={[screen.row, { gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' }]}>
              {isProxy && (
                <Pressable onPress={() => navigation.navigate('SubmitClaim')} style={screen.buttonPrimary}>
                  <Text style={screen.buttonText}>+ New Claim</Text>
                </Pressable>
              )}
              <Pressable onPress={() => navigation.navigate('AuditLog')} style={screen.buttonSecondary}>
                <Text style={screen.buttonText}>Audit log</Text>
              </Pressable>
              {isProvider && (
                <Pressable onPress={() => navigation.navigate('AdminSettings')} style={screen.buttonSecondary}>
                  <Text style={screen.buttonText}>Admin settings</Text>
                </Pressable>
              )}
            </View>
            <Text style={screen.heading}>Claims</Text>
          </View>
        )}
        data={claims}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={<Text style={screen.muted}>No claims yet.</Text>}
        renderItem={({ item }) => <ClaimRow claim={item} onPress={() => navigation.navigate('ClaimDetail', { claimId: item.id })} />}
      />
    </View>
  );
}

function ClaimRow({ claim, onPress }: { claim: Claim; onPress: () => void }): JSX.Element {
  const hrs = hoursRemaining(claim.receipt_deadline);
  return (
    <Pressable onPress={onPress} style={screen.card}>
      <View style={[screen.row, { justifyContent: 'space-between' }]}>
        <Text style={screen.heading}>{claim.vendor}</Text>
        <Text style={screen.heading}>{dollars(claim.amount_cents)}</Text>
      </View>
      <View style={[screen.row, { justifyContent: 'space-between', marginBottom: 6 }]}>
        <Text style={screen.muted}>{claim.classification}</Text>
        <Text style={screen.muted}>{formatEasternShort(claim.submitted_at)}</Text>
      </View>
      <StatusBadge status={claim.status} />
      {hrs !== null && hrs > 0 && (
        <Text style={[screen.muted, { marginTop: 6 }]}>Receipt deadline in {hrs.toFixed(1)} hours</Text>
      )}
      {hrs !== null && hrs <= 0 && (
        <Text style={[screen.muted, { marginTop: 6, color: colors.danger }]}>Receipt deadline passed</Text>
      )}
    </Pressable>
  );
}
