import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { LocationProvider } from '../context/LocationContext';
import { COLORS } from '../constants';

export default function RootLayout() {
  return (
    <AuthProvider>
      <LocationProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.white },
            headerTintColor: COLORS.primary,
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/register" options={{ title: 'Sign Up', headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="provider/[id]"
            options={{ title: 'Provider Details', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="review/[providerId]"
            options={{ title: 'Write Review', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="chat/[providerId]"
            options={{ title: 'Chat', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="emergency"
            options={{ title: 'Emergency Mode', headerBackTitle: 'Back', headerTintColor: COLORS.emergency }}
          />
          <Stack.Screen
            name="notifications"
            options={{ title: 'Notifications', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="admin/index"
            options={{ title: 'Admin Panel', headerShown: false }}
          />
          <Stack.Screen
            name="provider-dashboard/index"
            options={{ title: 'Provider Dashboard', headerShown: false }}
          />
          <Stack.Screen name="maintenance/new" options={{ title: 'Report an Issue' }} />
          <Stack.Screen name="maintenance/[requestId]" options={{ title: 'Maintenance Request' }} />
          <Stack.Screen
            name="payment/[bookingId]"
            options={{ title: 'Payment', headerBackTitle: 'Back' }}
          />
        </Stack>
      </LocationProvider>
    </AuthProvider>
  );
}
