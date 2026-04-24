import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SubmitClaimScreen } from '../screens/SubmitClaimScreen';
import { ClaimDetailScreen } from '../screens/ClaimDetailScreen';
import { AppealScreen } from '../screens/AppealScreen';
import { AuditLogScreen } from '../screens/AuditLogScreen';
import { AdminSettingsScreen } from '../screens/AdminSettingsScreen';
import { colors } from '../theme';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  SubmitClaim: undefined;
  ClaimDetail: { claimId: string };
  Appeal: { claimId: string };
  AuditLog: undefined;
  AdminSettings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};

export function RootNavigator(): JSX.Element {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}>
        {session ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Logistical Dumpster' }} />
            <Stack.Screen name="SubmitClaim" component={SubmitClaimScreen} options={{ title: 'Submit Claim' }} />
            <Stack.Screen name="ClaimDetail" component={ClaimDetailScreen} options={{ title: 'Claim' }} />
            <Stack.Screen name="Appeal" component={AppealScreen} options={{ title: 'File Appeal' }} />
            <Stack.Screen name="AuditLog" component={AuditLogScreen} options={{ title: 'Audit Log' }} />
            <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ title: 'Admin Settings' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in' }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
