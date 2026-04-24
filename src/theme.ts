import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#0b1220',
  surface: '#111a2e',
  surfaceAlt: '#1a2542',
  border: '#24304f',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  accent: '#38bdf8',
  accentDark: '#0284c7',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const screen = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  padded: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: spacing.md },
  heading: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.sm },
  text: { color: colors.text, fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: 13 },
  label: { color: colors.textMuted, fontSize: 12, marginBottom: 4, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  buttonPrimary: {
    backgroundColor: colors.accentDark,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: { color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 11,
    overflow: 'hidden',
  },
});
