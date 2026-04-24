import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import type { AppSettings, Profile } from '../types/db';
import { colors, screen, spacing } from '../theme';

export function AdminSettingsScreen(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: s }, { data: ps }] = await Promise.all([
      supabase.from('app_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('profiles').select('*').order('role'),
    ]);
    setSettings(s as AppSettings | null);
    setProfiles((ps ?? []) as Profile[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function update(patch: Partial<AppSettings>): Promise<void> {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    const { error } = await supabase.from('app_settings').update(patch).eq('id', 1);
    if (error) Alert.alert('Save failed', error.message);
    setSaving(false);
  }

  async function toggleProxyActive(profile: Profile): Promise<void> {
    const { error } = await supabase.from('profiles').update({ active: !profile.active }).eq('id', profile.id);
    if (error) Alert.alert('Save failed', error.message);
    else load();
  }

  if (!settings) {
    return <View style={[screen.root, screen.padded]}><Text style={screen.muted}>Loading…</Text></View>;
  }

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.padded}>
      <View style={screen.card}>
        <Text style={screen.heading}>Notification toggles</Text>
        <Toggle label="Claim submitted" value={settings.notify_on_submit} onChange={(v) => update({ notify_on_submit: v })} />
        <Toggle label="Receipt missing / reminders" value={settings.notify_on_receipt_miss} onChange={(v) => update({ notify_on_receipt_miss: v })} />
        <Toggle label="Review decisions" value={settings.notify_on_review} onChange={(v) => update({ notify_on_review: v })} />
        <Toggle label="Appeals" value={settings.notify_on_appeal} onChange={(v) => update({ notify_on_appeal: v })} />
        <Toggle label="Enforcement escalations" value={settings.notify_on_enforcement} onChange={(v) => update({ notify_on_enforcement: v })} />
        {saving && <Text style={screen.muted}>Saving…</Text>}
      </View>

      <View style={screen.card}>
        <Text style={screen.heading}>People &amp; status</Text>
        {profiles.map((p) => (
          <View key={p.id} style={[screen.row, { justifyContent: 'space-between', paddingVertical: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Text style={screen.text}>{p.display_name}</Text>
              <Text style={screen.muted}>{p.role} · {p.email ?? 'no email'} · {p.phone_e164 ?? 'no sms'}</Text>
            </View>
            {p.role !== 'provider' && (
              <Pressable onPress={() => toggleProxyActive(p)} style={screen.buttonSecondary}>
                <Text style={screen.buttonText}>{p.active ? 'Deactivate' : 'Activate'}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <View style={screen.card}>
        <Text style={screen.heading}>Extra notification recipients</Text>
        <Text style={screen.muted}>
          Selected: {settings.extra_recipients?.length ?? 0}
        </Text>
        {profiles.map((p) => {
          const isExtra = settings.extra_recipients?.includes(p.id);
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                const next = isExtra
                  ? settings.extra_recipients.filter((x) => x !== p.id)
                  : [...(settings.extra_recipients ?? []), p.id];
                update({ extra_recipients: next });
              }}
              style={[screen.row, { justifyContent: 'space-between', paddingVertical: spacing.sm }]}>
              <Text style={screen.text}>{p.display_name}</Text>
              <Text style={{ color: isExtra ? colors.accent : colors.textMuted }}>
                {isExtra ? 'on' : 'off'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <View style={[screen.row, { justifyContent: 'space-between', paddingVertical: spacing.sm }]}>
      <Text style={screen.text}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}
