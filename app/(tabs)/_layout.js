import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants';

function LegacyMarketplaceTabsLayout() {
  const { userProfile } = useAuth();
  const role = userProfile?.role || 'user';

  // Provider sees Providers list + Profile
  if (role === 'provider') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.gray,
          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopColor: COLORS.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 4,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerStyle: { backgroundColor: COLORS.white },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Tabs.Screen
          name="providers"
          options={{
            title: 'All Providers',
            headerTitle: 'All Providers',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-circle" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="home" options={{ href: null }} />
        <Tabs.Screen name="map" options={{ href: null }} />
        <Tabs.Screen name="bookings" options={{ href: null }} />
      </Tabs>
    );
  }

  // Admin sees Providers + Profile only
  if (role === 'admin') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: COLORS.admin,
          tabBarInactiveTintColor: COLORS.gray,
          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopColor: COLORS.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 4,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerStyle: { backgroundColor: COLORS.white },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Tabs.Screen
          name="providers"
          options={{
            title: 'Providers',
            headerTitle: 'All Providers',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-circle" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="home" options={{ href: null }} />
        <Tabs.Screen name="map" options={{ href: null }} />
        <Tabs.Screen name="bookings" options={{ href: null }} />
      </Tabs>
    );
  }

  // Customer sees Home, Search, Bookings, Profile
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: COLORS.white },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="map" options={{ href: null }} />
      <Tabs.Screen
        name="providers"
        options={{
          title: 'Search',
          headerTitle: 'Service Providers',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          headerTitle: 'My Bookings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  const role = useAuth().userProfile?.role || 'resident';
  const requestsTitle = role === 'technician' ? 'Work orders' : role === 'manager' || role === 'admin' ? 'Building requests' : 'My requests';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: { backgroundColor: COLORS.white, borderTopColor: COLORS.border, height: 60, paddingBottom: 8, paddingTop: 4 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerStyle: { backgroundColor: COLORS.white },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="bookings" options={{ title: requestsTitle, headerTitle: requestsTitle, tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Account', headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="providers" options={{ href: null }} />
      <Tabs.Screen name="map" options={{ href: null }} />
    </Tabs>
  );
}
