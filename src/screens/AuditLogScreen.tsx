import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Share, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import type { AuditEntry } from '../types/db';
import { formatEastern } from '../lib/time';
import { csvEscape } from '../lib/format';
import { screen, spacing } from '../theme';

export function AuditLogScreen(): JSX.Element {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(500);
    if (error) Alert.alert('Load failed', error.message);
    setEntries((data ?? []) as AuditEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function exportCsv(): Promise<void> {
    const header = ['id', 'occurred_at_et', 'actor_id', 'action', 'entity', 'entity_id', 'old_value', 'new_value'];
    const rows = entries.map((e) => [
      e.id,
      formatEastern(e.occurred_at),
      e.actor_id ?? '',
      e.action,
      e.entity,
      e.entity_id ?? '',
      JSON.stringify(e.old_value ?? null),
      JSON.stringify(e.new_value ?? null),
    ].map(csvEscape).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    try { await Share.share({ message: csv, title: 'audit-log.csv' }); }
    catch (e) { Alert.alert('Export failed', e instanceof Error ? e.message : String(e)); }
  }

  return (
    <View style={screen.root}>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg }}
        ListHeaderComponent={(
          <View>
            <Text style={screen.title}>Audit log</Text>
            <Pressable onPress={exportCsv} style={[screen.buttonSecondary, { marginBottom: spacing.md }]}>
              <Text style={screen.buttonText}>Export CSV</Text>
            </Pressable>
            {loading && <Text style={screen.muted}>Loading…</Text>}
          </View>
        )}
        data={entries}
        keyExtractor={(e) => String(e.id)}
        renderItem={({ item }) => (
          <View style={screen.card}>
            <Text style={screen.text}>{item.action.toUpperCase()} · {item.entity}</Text>
            <Text style={screen.muted}>{formatEastern(item.occurred_at)}</Text>
            <Text style={screen.muted}>actor {item.actor_id ?? 'system'}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={screen.muted}>No entries.</Text> : null}
      />
    </View>
  );
}
