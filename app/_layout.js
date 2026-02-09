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
        </Stack>
      </LocationProvider>
    </AuthProvider>
  );
}
