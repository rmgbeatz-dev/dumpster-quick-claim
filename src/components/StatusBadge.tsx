import React from 'react';
import { Text, View } from 'react-native';
import { colors, screen } from '../theme';
import type { ClaimStatus } from '../types/db';

const STATUS_COLORS: Record<ClaimStatus, string> = {
  submitted: colors.accent,
  receipt_pending_grace: colors.warning,
  receipt_overdue: colors.danger,
  under_review: colors.accent,
  approved: colors.success,
  denied: colors.danger,
  correction_requested: colors.warning,
  appealed: colors.accent,
  appeal_resolved: colors.success,
  escalated: colors.danger,
};

export function StatusBadge({ status }: { status: ClaimStatus }): JSX.Element {
  const bg = STATUS_COLORS[status];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={[screen.badge, { color: '#0b1220', fontWeight: '700' }]}>{status}</Text>
    </View>
  );
}
